-- Schaf-Imperium: Datenbank für Accounts, Spielstände und Bestenliste.
-- In Supabase: links "SQL Editor" -> "New query" -> alles hier einfügen -> "Run".

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,
  pass_hash   text not null,
  token       uuid not null default gen_random_uuid(),
  save        jsonb,
  income      double precision not null default 0,
  playtime    bigint not null default 0,
  rebirths    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists players_username_lower on public.players (lower(username));
create unique index if not exists players_token on public.players (token);

-- Niemand darf direkt an die Tabelle, nur über die Funktionen unten.
alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;

create or replace function public.sp_register(p_name text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare t uuid;
begin
  if p_name is null or p_name !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'name_invalid'; end if;
  if p_pass is null or length(p_pass) < 4 or length(p_pass) > 100 then raise exception 'pass_short'; end if;
  if exists (select 1 from players where lower(username) = lower(p_name)) then raise exception 'name_taken'; end if;
  insert into players (username, pass_hash) values (p_name, crypt(p_pass, gen_salt('bf'))) returning token into t;
  return json_build_object('token', t, 'username', p_name);
end $$;

create or replace function public.sp_login(p_name text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r players;
begin
  select * into r from players where lower(username) = lower(p_name);
  if r.id is null or r.pass_hash <> crypt(p_pass, r.pass_hash) then
    perform pg_sleep(0.5);
    raise exception 'login_failed';
  end if;
  return json_build_object('token', r.token, 'username', r.username);
end $$;

create or replace function public.sp_load(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare r players;
begin
  select * into r from players where token = p_token;
  if r.id is null then raise exception 'bad_token'; end if;
  return json_build_object('username', r.username, 'save', r.save);
end $$;

create or replace function public.sp_save(p_token uuid, p_save jsonb, p_income double precision, p_playtime bigint, p_rebirths integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare old jsonb;
begin
  if octet_length(p_save::text) > 200000 then raise exception 'save_too_big'; end if;
  select save into old from players where token = p_token for update;
  if not found then raise exception 'bad_token'; end if;
  -- Kai: Auf zwei Geräten gewinnt immer der höhere Spielstand. Ein kleinerer wird abgelehnt (false),
  -- dann lädt das andere Gerät den besseren Stand aus der Cloud.
  if old is not null and jsonb_typeof(old) = 'object' then
    if coalesce(p_rebirths, 0) < coalesce((old->>'rebirths')::integer, 0)
       or coalesce((p_save->>'total')::double precision, 0) < coalesce((old->>'total')::double precision, 0) then
      return false;
    end if;
  end if;
  update players set save = p_save,
    income = greatest(0, least(coalesce(p_income, 0), 1e30)),
    playtime = greatest(0, coalesce(p_playtime, 0)),
    rebirths = greatest(0, least(coalesce(p_rebirths, 0), 1000)),
    updated_at = now()
  where token = p_token;
  if not found then raise exception 'bad_token'; end if;
  return true;
end $$;

grant execute on function public.sp_register(text, text) to anon;
grant execute on function public.sp_login(text, text) to anon;
grant execute on function public.sp_load(uuid) to anon;
grant execute on function public.sp_save(uuid, jsonb, double precision, bigint, integer) to anon;

-- ===================== Codes und Admin (Teil 2) =====================
-- Kann auch nachträglich ausgeführt werden: einfach diese ganze Datei nochmal "Run".
alter table public.players add column if not exists is_admin boolean not null default false;
alter table public.players add column if not exists inbox jsonb not null default '[]'::jsonb;

create table if not exists public.codes (
  code        text primary key,
  kind        text not null check (kind in ('money', 'sheep', 'deko')),
  value       text not null,
  created_by  uuid references public.players(id) on delete set null,
  redeemed_by uuid references public.players(id) on delete set null,
  redeemed_at timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.codes drop constraint if exists codes_kind_check;
alter table public.codes add constraint codes_kind_check check (kind in ('money', 'sheep', 'deko'));
alter table public.codes enable row level security;
revoke all on public.codes from anon, authenticated;

-- Spielstand laden (jetzt auch mit Admin-Info)
create or replace function public.sp_load(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare r players;
begin
  select * into r from players where token = p_token;
  if r.id is null then raise exception 'bad_token'; end if;
  return json_build_object('username', r.username, 'save', r.save, 'admin', r.is_admin);
end $$;

-- Geschenke abholen (z. B. Geld vom Admin). Danach ist das Postfach leer.
create or replace function public.sp_inbox(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare box jsonb;
begin
  update players p set inbox = '[]'::jsonb
    from (select id, inbox from players where token = p_token for update) old
    where p.id = old.id returning old.inbox into box;
  if box is null then raise exception 'bad_token'; end if;
  return box;
end $$;

-- Code einlösen. Der Admin-Code ist nur als Prüfsumme gespeichert, nicht im Klartext.
create or replace function public.sp_redeem(p_token uuid, p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare me players; c codes;
begin
  select * into me from players where token = p_token;
  if me.id is null then raise exception 'bad_token'; end if;
  p_code := trim(coalesce(p_code, ''));
  if encode(digest('schaf-admin:' || p_code, 'sha256'), 'hex') = 'd22f5a05d40751a81c50694b17854a8dcdc973469d4cf72434706b695cb3072a' then
    update players set is_admin = true where id = me.id;
    return json_build_object('type', 'admin');
  end if;
  -- Nur der Erste bekommt die Belohnung
  update codes set redeemed_by = me.id, redeemed_at = now()
    where lower(code) = lower(p_code) and redeemed_by is null
    returning * into c;
  if c.code is null then
    if exists (select 1 from codes where lower(code) = lower(p_code)) then raise exception 'code_used'; end if;
    perform pg_sleep(0.3);
    raise exception 'code_invalid';
  end if;
  return json_build_object('type', c.kind, 'value', c.value);
end $$;

-- Admin: einem Spieler Geld schicken (landet in seinem Postfach)
create or replace function public.sp_admin_give(p_token uuid, p_target text, p_amount double precision)
returns boolean language plpgsql security definer set search_path = public as $$
declare me players;
begin
  select * into me from players where token = p_token;
  if me.id is null then raise exception 'bad_token'; end if;
  if not me.is_admin then raise exception 'not_admin'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1e30 then raise exception 'bad_amount'; end if;
  update players set inbox = inbox || jsonb_build_array(jsonb_build_object('type', 'money', 'amount', p_amount, 'from', me.username))
    where lower(username) = lower(trim(p_target));
  if not found then raise exception 'no_player'; end if;
  return true;
end $$;

-- Admin: neuen Code anlegen (Geld oder Schaf)
create or replace function public.sp_admin_code(p_token uuid, p_code text, p_kind text, p_value text)
returns boolean language plpgsql security definer set search_path = public as $$
declare me players;
begin
  select * into me from players where token = p_token;
  if me.id is null then raise exception 'bad_token'; end if;
  if not me.is_admin then raise exception 'not_admin'; end if;
  p_code := trim(coalesce(p_code, ''));
  if p_code !~ '^[A-Za-z0-9_-]{3,32}$' then raise exception 'code_format'; end if;
  if p_kind not in ('money', 'sheep', 'deko') or p_value is null or length(p_value) > 40 then raise exception 'bad_amount'; end if;
  if exists (select 1 from codes where lower(code) = lower(p_code)) then raise exception 'code_taken'; end if;
  insert into codes (code, kind, value, created_by) values (p_code, p_kind, p_value, me.id);
  return true;
end $$;

-- Admin: die letzten Codes ansehen
create or replace function public.sp_admin_codes(p_token uuid)
returns table (code text, kind text, value text, redeemed_by text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare me players;
begin
  select * into me from players where token = p_token;
  if me.id is null then raise exception 'bad_token'; end if;
  if not me.is_admin then raise exception 'not_admin'; end if;
  return query select c.code, c.kind, c.value, p.username, c.created_at
    from codes c left join players p on p.id = c.redeemed_by
    order by c.created_at desc limit 30;
end $$;

grant execute on function public.sp_inbox(uuid) to anon;
grant execute on function public.sp_redeem(uuid, text) to anon;
grant execute on function public.sp_admin_give(uuid, text, double precision) to anon;
grant execute on function public.sp_admin_code(uuid, text, text, text) to anon;
grant execute on function public.sp_admin_codes(uuid) to anon;

-- ===================== Duelle (Teil 3) =====================
-- Spieler fordern sich heraus, setzen Geld und Schafe und spielen
-- Schere-Stein-Papier, Tic Tac Toe oder Vier gewinnt. Der Server prüft alle Züge.
alter table public.players add column if not exists last_seen timestamptz;

create table if not exists public.duels (
  id          uuid primary key default gen_random_uuid(),
  a           uuid not null references public.players(id) on delete cascade,  -- wer einlädt
  b           uuid not null references public.players(id) on delete cascade,  -- wer eingeladen wird
  state       text not null default 'invite',   -- invite, setup, play, done, gone
  mode        text not null default 'rps',      -- rps, ttt, c4, chess
  mode_by     smallint,
  a_stake     jsonb not null default '{"money":0,"sheep":{}}'::jsonb,
  b_stake     jsonb not null default '{"money":0,"sheep":{}}'::jsonb,
  a_ready     boolean not null default false,
  b_ready     boolean not null default false,
  start_at    timestamptz,
  game        jsonb,
  turn        smallint,
  deadline    timestamptz,
  winner      smallint,                          -- 0 = a, 1 = b, 2 = unentschieden
  reason      text,
  a_ack       boolean not null default false,
  b_ack       boolean not null default false,
  a_seen      timestamptz not null default now(),
  b_seen      timestamptz not null default now(),
  ver         integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists duels_a on public.duels (a, state);
create index if not exists duels_b on public.duels (b, state);
alter table public.duels enable row level security;
revoke all on public.duels from anon, authenticated;

create or replace function public.duel_me(p_token uuid)
returns players language plpgsql security definer set search_path = public as $$
declare me players;
begin
  select * into me from players where token = p_token;
  if me.id is null then raise exception 'bad_token'; end if;
  return me;
end $$;

-- Was ein Spieler vom Duell sehen darf (die geheime Wahl bei Schere-Stein-Papier bleibt versteckt)
create or replace function public.duel_view(d duels, s int)
returns json language plpgsql security definer set search_path = public as $$
declare g jsonb := d.game; mn text; opn text; op int;
begin
  select username into mn from players where id = case when s = 0 then d.a else d.b end;
  select username into opn from players where id = case when s = 0 then d.b else d.a end;
  if d.mode = 'rps' and g is not null then
    op := (g->>(case when s = 0 then 'pb' else 'pa' end))::int;
    g := g || jsonb_build_object(case when s = 0 then 'pb' else 'pa' end, case when op >= 0 then -2 else -1 end);
  end if;
  return json_build_object('id', d.id, 'side', s, 'me', mn, 'opp', opn, 'state', d.state, 'mode', d.mode, 'mode_by', d.mode_by,
    'my_stake', case when s = 0 then d.a_stake else d.b_stake end, 'opp_stake', case when s = 0 then d.b_stake else d.a_stake end,
    'my_ready', case when s = 0 then d.a_ready else d.b_ready end, 'opp_ready', case when s = 0 then d.b_ready else d.a_ready end,
    'start_in', case when d.start_at is null then null else floor(extract(epoch from d.start_at - now()) * 1000) end,
    'left', case when d.deadline is null then null else floor(extract(epoch from d.deadline - now()) * 1000) end,
    'turn', d.turn, 'game', g, 'winner', d.winner, 'reason', d.reason, 'ver', d.ver);
end $$;

-- Zeit abgelaufen? Einladung verfallen, Gegner weg, Zug verpasst ...
create or replace function public.duel_tick(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare d duels;
begin
  select * into d from duels where id = p_id for update;
  if d.id is null then return; end if;
  if d.state = 'invite' and d.created_at < now() - interval '60 seconds' then
    update duels set state = 'gone', reason = 'expired', ver = ver + 1 where id = d.id;
  elsif d.state = 'setup' and (d.a_seen < now() - interval '30 seconds' or d.b_seen < now() - interval '30 seconds') then
    update duels set state = 'gone', reason = 'left', ver = ver + 1 where id = d.id;
  elsif d.state = 'play' and d.deadline < now() then
    if d.mode = 'rps' then
      if (d.game->>'pa')::int < 0 and (d.game->>'pb')::int < 0 then
        update duels set state = 'done', winner = 2, reason = 'timeout_both', ver = ver + 1 where id = d.id;
      else
        update duels set state = 'done', winner = case when (d.game->>'pa')::int >= 0 then 0 else 1 end, reason = 'timeout', ver = ver + 1 where id = d.id;
      end if;
    else
      update duels set state = 'done', winner = 1 - d.turn, reason = 'timeout', ver = ver + 1 where id = d.id;
    end if;
  end if;
end $$;

create or replace function public.duel_busy(p_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from duels where (a = p_id or b = p_id) and state in ('setup', 'play'));
$$;

-- Jemanden herausfordern
create or replace function public.sp_duel_invite(p_token uuid, p_target text)
returns json language plpgsql security definer set search_path = public as $$
declare me players; t players; d duels; r record;
begin
  me := duel_me(p_token);
  select * into t from players where lower(username) = lower(trim(coalesce(p_target, '')));
  if t.id is null then raise exception 'no_player'; end if;
  if t.id = me.id then raise exception 'duel_self'; end if;
  for r in select id from duels where (a = me.id or b = me.id or a = t.id or b = t.id) and state in ('invite', 'setup', 'play') loop
    perform duel_tick(r.id);
  end loop;
  if duel_busy(me.id) then raise exception 'duel_busy_me'; end if;
  if duel_busy(t.id) then raise exception 'duel_busy'; end if;
  if (select count(*) from duels where a = me.id and created_at > now() - interval '1 minute') >= 12 then raise exception 'duel_spam'; end if;
  update duels set state = 'gone', reason = 'cancelled', ver = ver + 1 where a = me.id and state = 'invite';
  insert into duels (a, b) values (me.id, t.id) returning * into d;
  return duel_view(d, 0);
end $$;

-- Alle 1-4 Sekunden: Was ist los? (Einladungen, laufendes Duell, fertige Duelle zum Abrechnen)
create or replace function public.sp_duel_poll(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me players; d duels; r record; act json := null; inv json; res json;
begin
  me := duel_me(p_token);
  update players set last_seen = now() where id = me.id;
  update duels set a_seen = now() where a = me.id and state in ('setup', 'play');
  update duels set b_seen = now() where b = me.id and state in ('setup', 'play');
  for r in select id from duels where (a = me.id or b = me.id) and state in ('invite', 'setup', 'play') loop
    perform duel_tick(r.id);
  end loop;
  select * into d from duels where ((a = me.id and state in ('invite', 'setup', 'play')) or (b = me.id and state in ('setup', 'play')))
    order by created_at desc limit 1;
  if d.id is not null then act := duel_view(d, case when d.a = me.id then 0 else 1 end); end if;
  select coalesce(json_agg(json_build_object('id', x.id, 'from', p.username) order by x.created_at desc), '[]'::json) into inv
    from duels x join players p on p.id = x.a where x.b = me.id and x.state = 'invite';
  select coalesce(json_agg(duel_view(x, case when x.a = me.id then 0 else 1 end) order by x.created_at), '[]'::json) into res
    from (select * from duels where state in ('done', 'gone') and ((a = me.id and not a_ack) or (b = me.id and not b_ack))
          order by created_at limit 5) x;
  return json_build_object('duel', act, 'invites', inv, 'results', res);
end $$;

create or replace function public.duel_mine(me players, p_id uuid)
returns duels language plpgsql security definer set search_path = public as $$
declare d duels;
begin
  perform duel_tick(p_id);
  select * into d from duels where id = p_id and (a = me.id or b = me.id) for update;
  if d.id is null then raise exception 'duel_gone'; end if;
  return d;
end $$;

-- Einladung annehmen oder ablehnen
create or replace function public.sp_duel_answer(p_token uuid, p_id uuid, p_accept boolean)
returns json language plpgsql security definer set search_path = public as $$
declare me players; d duels;
begin
  me := duel_me(p_token);
  d := duel_mine(me, p_id);
  if d.b <> me.id or d.state <> 'invite' then raise exception 'duel_gone'; end if;
  if not p_accept then
    update duels set state = 'gone', reason = 'declined', b_ack = true, ver = ver + 1 where id = d.id returning * into d;
    return duel_view(d, 1);
  end if;
  if duel_busy(me.id) then raise exception 'duel_busy_me'; end if;
  if duel_busy(d.a) then
    update duels set state = 'gone', reason = 'cancelled', ver = ver + 1 where id = d.id;
    raise exception 'duel_busy';
  end if;
  update duels set state = 'gone', reason = 'cancelled', ver = ver + 1 where a = me.id and state = 'invite';
  update duels set state = 'setup', a_seen = now(), b_seen = now(), ver = ver + 1 where id = d.id returning * into d;
  return duel_view(d, 1);
end $$;

-- Spiel wählen und/oder Einsatz ändern (dann ist keiner mehr bereit)
create or replace function public.sp_duel_set(p_token uuid, p_id uuid, p_mode text, p_stake jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare me players; d duels; s int; st jsonb; sh jsonb := '{}'::jsonb; k text; v jsonb; m double precision; ch boolean := false;
begin
  me := duel_me(p_token);
  d := duel_mine(me, p_id);
  if d.state <> 'setup' then raise exception 'duel_locked'; end if;
  s := case when d.a = me.id then 0 else 1 end;
  if p_mode is not null then
    if p_mode not in ('rps', 'ttt', 'c4', 'chess') then raise exception 'bad_amount'; end if;
    if p_mode <> d.mode then ch := true; update duels set mode = p_mode, mode_by = s where id = d.id; end if;
  end if;
  if p_stake is not null then
    m := coalesce((p_stake->>'money')::double precision, 0);
    if m is null or m < 0 or m > 1e30 or m <> m then raise exception 'bad_amount'; end if;
    if jsonb_typeof(p_stake->'sheep') = 'object' then
      for k, v in select * from jsonb_each(p_stake->'sheep') loop
        if k !~ '^[a-z0-9_]{1,20}$' or jsonb_typeof(v) <> 'number' or (v::text)::numeric <> floor((v::text)::numeric)
           or (v::text)::numeric < 1 or (v::text)::numeric > 1000000 then raise exception 'bad_amount'; end if;
        sh := sh || jsonb_build_object(k, (v::text)::int);
      end loop;
    end if;
    if (select count(*) from jsonb_object_keys(sh)) > 80 then raise exception 'bad_amount'; end if;
    st := jsonb_build_object('money', floor(m), 'sheep', sh);
    if st <> (case when s = 0 then d.a_stake else d.b_stake end) then
      ch := true;
      if s = 0 then update duels set a_stake = st where id = d.id; else update duels set b_stake = st where id = d.id; end if;
    end if;
  end if;
  -- Nur wenn sich wirklich etwas geändert hat, muss man nochmal "Bereit" drücken
  if ch then update duels set a_ready = false, b_ready = false, ver = ver + 1 where id = d.id; end if;
  select * into d from duels where id = d.id;
  return duel_view(d, s);
end $$;

-- Bereit! Wenn beide bereit sind, geht es nach 3 Sekunden los.
create or replace function public.sp_duel_ready(p_token uuid, p_id uuid, p_ready boolean)
returns json language plpgsql security definer set search_path = public as $$
declare me players; d duels; s int; f int; st jsonb; k text; v jsonb;
begin
  me := duel_me(p_token);
  d := duel_mine(me, p_id);
  if d.state <> 'setup' then raise exception 'duel_locked'; end if;
  s := case when d.a = me.id then 0 else 1 end;
  if p_ready then
    -- Hat der Spieler den Einsatz wirklich? (Das Spiel speichert vorher, kleine Zeit-Toleranz fürs Geld)
    st := case when s = 0 then d.a_stake else d.b_stake end;
    if (st->>'money')::double precision > coalesce((me.save->>'coins')::double precision, 0)
         + me.income * (extract(epoch from now() - me.updated_at) + 60) + 1 then raise exception 'duel_not_enough'; end if;
    for k, v in select * from jsonb_each(st->'sheep') loop
      if (v::text)::int > coalesce((me.save->'sheep'->>k)::int, 0) then raise exception 'duel_not_enough'; end if;
    end loop;
  end if;
  if s = 0 then update duels set a_ready = p_ready, ver = ver + 1 where id = d.id returning * into d;
  else update duels set b_ready = p_ready, ver = ver + 1 where id = d.id returning * into d; end if;
  if d.a_ready and d.b_ready then
    f := floor(random() * 2)::int;
    update duels set state = 'play', start_at = now() + interval '3.5 seconds',
      game = case d.mode
        when 'rps' then jsonb_build_object('pa', -1, 'pb', -1, 'sa', 0, 'sb', 0, 'round', 1)
        when 'ttt' then jsonb_build_object('b', to_jsonb(array_fill(-1, array[9])), 'g', 1, 'first', f, 'lm', -1)
        when 'chess' then jsonb_build_object('b', 'rnbqkbnrpppppppp' || repeat('.', 32) || 'PPPPPPPPRNBQKBNR', 'wh', f, 'cr', 'KQkq', 'ep', -1, 'hm', 0, 'n', 0, 'lm', -1, 'chk', false)
        else jsonb_build_object('b', to_jsonb(array_fill(-1, array[42])), 'lm', -1) end,
      turn = case when d.mode = 'rps' then null else f end,
      deadline = now() + interval '3.5 seconds' + case when d.mode = 'rps' then interval '20 seconds' when d.mode = 'chess' then interval '90 seconds' else interval '30 seconds' end,
      ver = ver + 1
    where id = d.id returning * into d;
  end if;
  return duel_view(d, s);
end $$;

create or replace function public.duel_line(b int[], cells int[])
returns int language plpgsql immutable as $$
declare v int := b[cells[1] + 1]; i int;
begin
  if v < 0 then return -1; end if;
  for i in 2 .. array_length(cells, 1) loop if b[cells[i] + 1] <> v then return -1; end if; end loop;
  return v;
end $$;

-- Schaf-Schach (Kai, 17.11.2026): Brett = 64 Zeichen, Feld 0 = a8, 63 = h1, große Buchstaben = Weiß, '.' = leer.
-- Ein Zug = von * 64 + nach. Genau dieselben Regeln wie in js/chess.js.
create or replace function public.chess_at(b text, r int, c int)
returns text language sql immutable as $$
  select case when r between 0 and 7 and c between 0 and 7 then substr(b, r * 8 + c + 1, 1) else '#' end;
$$;

create or replace function public.chess_attacked(b text, sq int, byw boolean)
returns boolean language plpgsql immutable as $$
declare r int := sq / 8; c int := sq % 8; d int[]; k int; p text; dr int; pp text; n text; kk text; rq text; bq text;
begin
  if byw then pp := 'P'; n := 'N'; kk := 'K'; rq := 'RQ'; bq := 'BQ'; dr := 1;
  else pp := 'p'; n := 'n'; kk := 'k'; rq := 'rq'; bq := 'bq'; dr := -1; end if;
  if chess_at(b, r + dr, c - 1) = pp or chess_at(b, r + dr, c + 1) = pp then return true; end if;
  foreach d slice 1 in array array[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] loop
    if chess_at(b, r + d[1], c + d[2]) = n then return true; end if;
  end loop;
  foreach d slice 1 in array array[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]] loop
    if chess_at(b, r + d[1], c + d[2]) = kk then return true; end if;
  end loop;
  foreach d slice 1 in array array[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]] loop
    k := 1;
    loop
      p := chess_at(b, r + d[1] * k, c + d[2] * k);
      exit when p <> '.';
      k := k + 1;
    end loop;
    if p <> '#' and strpos(case when d[1] = 0 or d[2] = 0 then rq else bq end, p) > 0 then return true; end if;
  end loop;
  return false;
end $$;

create or replace function public.chess_apply(b text, f int, t int, ep int)
returns text language plpgsql immutable as $$
declare p text := substr(b, f + 1, 1); lp text := lower(substr(b, f + 1, 1)); nb text := b;
begin
  if lp = 'p' and t = ep and substr(b, t + 1, 1) = '.' then nb := overlay(nb placing '.' from (f / 8) * 8 + t % 8 + 1 for 1); end if;
  if lp = 'p' and (t / 8 = 0 or t / 8 = 7) then p := case when p = 'P' then 'Q' else 'q' end; end if;
  nb := overlay(nb placing p from t + 1 for 1);
  nb := overlay(nb placing '.' from f + 1 for 1);
  if lp = 'k' and abs(t - f) = 2 then
    if t > f then nb := overlay(nb placing substr(nb, f + 4, 1) from f + 2 for 1); nb := overlay(nb placing '.' from f + 4 for 1);
    else nb := overlay(nb placing substr(nb, f - 3, 1) from f for 1); nb := overlay(nb placing '.' from f - 3 for 1); end if;
  end if;
  return nb;
end $$;

create or replace function public.chess_legal(b text, w boolean, ep int, cr text)
returns int[] language plpgsql immutable as $$
declare res int[] := '{}'; out int[] := '{}'; sq int; p text; lp text; r int; c int; d int[]; k int; q text; dir int; t int; m int; nb text;
begin
  for sq in 0 .. 63 loop
    p := substr(b, sq + 1, 1);
    if p = '.' or (p = upper(p)) <> w then continue; end if;
    lp := lower(p); r := sq / 8; c := sq % 8;
    if lp = 'p' then
      dir := case when w then -1 else 1 end;
      if chess_at(b, r + dir, c) = '.' then
        res := res || (sq * 64 + (r + dir) * 8 + c);
        if r = (case when w then 6 else 1 end) and chess_at(b, r + 2 * dir, c) = '.' then res := res || (sq * 64 + (r + 2 * dir) * 8 + c); end if;
      end if;
      foreach k in array array[-1, 1] loop
        q := chess_at(b, r + dir, c + k); t := (r + dir) * 8 + c + k;
        if q not in ('.', '#') and (q = upper(q)) <> w then res := res || (sq * 64 + t);
        elsif q = '.' and t = ep then res := res || (sq * 64 + t); end if;
      end loop;
    elsif lp in ('n', 'k') then
      foreach d slice 1 in array (case when lp = 'n' then array[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
                                       else array[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]] end) loop
        q := chess_at(b, r + d[1], c + d[2]);
        if q = '.' or (q <> '#' and (q = upper(q)) <> w) then res := res || (sq * 64 + (r + d[1]) * 8 + c + d[2]); end if;
      end loop;
    else
      foreach d slice 1 in array array[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]] loop
        if lp = 'r' and d[1] <> 0 and d[2] <> 0 then continue; end if;
        if lp = 'b' and (d[1] = 0 or d[2] = 0) then continue; end if;
        k := 1;
        loop
          q := chess_at(b, r + d[1] * k, c + d[2] * k);
          exit when q = '#';
          t := (r + d[1] * k) * 8 + c + d[2] * k;
          if q = '.' then res := res || (sq * 64 + t);
          else
            if (q = upper(q)) <> w then res := res || (sq * 64 + t); end if;
            exit;
          end if;
          k := k + 1;
        end loop;
      end loop;
    end if;
  end loop;
  -- Rochade
  if w and substr(b, 61, 1) = 'K' then
    if strpos(cr, 'K') > 0 and substr(b, 62, 2) = '..' and substr(b, 64, 1) = 'R'
       and not chess_attacked(b, 60, false) and not chess_attacked(b, 61, false) and not chess_attacked(b, 62, false) then res := res || (60 * 64 + 62); end if;
    if strpos(cr, 'Q') > 0 and substr(b, 58, 3) = '...' and substr(b, 57, 1) = 'R'
       and not chess_attacked(b, 60, false) and not chess_attacked(b, 59, false) and not chess_attacked(b, 58, false) then res := res || (60 * 64 + 58); end if;
  end if;
  if not w and substr(b, 5, 1) = 'k' then
    if strpos(cr, 'k') > 0 and substr(b, 6, 2) = '..' and substr(b, 8, 1) = 'r'
       and not chess_attacked(b, 4, true) and not chess_attacked(b, 5, true) and not chess_attacked(b, 6, true) then res := res || (4 * 64 + 6); end if;
    if strpos(cr, 'q') > 0 and substr(b, 2, 3) = '...' and substr(b, 1, 1) = 'r'
       and not chess_attacked(b, 4, true) and not chess_attacked(b, 3, true) and not chess_attacked(b, 2, true) then res := res || (4 * 64 + 2); end if;
  end if;
  -- nur Züge, nach denen der eigene König nicht im Schach steht
  foreach m in array res loop
    nb := chess_apply(b, m / 64, m % 64, ep);
    if not chess_attacked(nb, strpos(nb, case when w then 'K' else 'k' end) - 1, not w) then out := out || m; end if;
  end loop;
  return out;
end $$;

-- Ein Zug: Schere(0)/Stein(1)/Papier(2), ein Feld (0-8), eine Spalte (0-6) oder beim Schach von * 64 + nach
create or replace function public.sp_duel_move(p_token uuid, p_id uuid, p_move int)
returns json language plpgsql security definer set search_path = public as $$
declare me players; d duels; s int; g jsonb; bd int[]; pa int; pb int; w int; sa int; sb int;
  lines int[][] := array[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  i int; r int; c int; dr int; dc int; k int; win int := -1; wl int[]; cells int[]; isfull boolean;
  cb text; cw boolean; ow boolean; ncr text; nep int; cap boolean; lp text; rest text; cf int; ct int; hm int; chk boolean; cmv int[];
begin
  me := duel_me(p_token);
  d := duel_mine(me, p_id);
  if d.state <> 'play' then raise exception 'duel_locked'; end if;
  if now() < d.start_at then raise exception 'duel_wait'; end if;
  s := case when d.a = me.id then 0 else 1 end;
  g := d.game;
  if d.mode = 'rps' then
    if p_move is null or p_move < 0 or p_move > 2 then raise exception 'duel_bad_move'; end if;
    if (g->>(case when s = 0 then 'pa' else 'pb' end))::int >= 0 then raise exception 'duel_wait'; end if;
    g := g || jsonb_build_object(case when s = 0 then 'pa' else 'pb' end, p_move);
    pa := (g->>'pa')::int; pb := (g->>'pb')::int;
    if pa >= 0 and pb >= 0 then
      -- Schere 0 schlägt Papier 2, Stein 1 schlägt Schere 0, Papier 2 schlägt Stein 1
      w := case when pa = pb then 2 when (pa = 0 and pb = 2) or (pa = 1 and pb = 0) or (pa = 2 and pb = 1) then 0 else 1 end;
      sa := (g->>'sa')::int + case when w = 0 then 1 else 0 end;
      sb := (g->>'sb')::int + case when w = 1 then 1 else 0 end;
      g := g || jsonb_build_object('pa', -1, 'pb', -1, 'sa', sa, 'sb', sb, 'round', (g->>'round')::int + 1,
        'last', jsonb_build_object('a', pa, 'b', pb, 'w', w));
      if sa >= 3 or sb >= 3 then
        update duels set game = g, state = 'done', winner = case when sa >= 3 then 0 else 1 end, reason = 'win', ver = ver + 1 where id = d.id returning * into d;
      else
        update duels set game = g, deadline = now() + interval '23 seconds', ver = ver + 1 where id = d.id returning * into d;
      end if;
    else
      update duels set game = g, ver = ver + 1 where id = d.id returning * into d;
    end if;
    return duel_view(d, s);
  end if;

  if d.turn <> s then raise exception 'duel_not_turn'; end if;

  if d.mode = 'chess' then
    cw := (s = (g->>'wh')::int); cb := g->>'b'; nep := (g->>'ep')::int; ncr := g->>'cr';
    if p_move is null or not (p_move = any (chess_legal(cb, cw, nep, ncr))) then raise exception 'duel_bad_move'; end if;
    cf := p_move / 64; ct := p_move % 64; lp := lower(substr(cb, cf + 1, 1));
    cap := substr(cb, ct + 1, 1) <> '.' or (lp = 'p' and ct = nep);
    cb := chess_apply(cb, cf, ct, nep);
    if cf = 60 or ct = 60 then ncr := translate(ncr, 'KQ', ''); end if;
    if cf = 63 or ct = 63 then ncr := translate(ncr, 'K', ''); end if;
    if cf = 56 or ct = 56 then ncr := translate(ncr, 'Q', ''); end if;
    if cf = 4 or ct = 4 then ncr := translate(ncr, 'kq', ''); end if;
    if cf = 7 or ct = 7 then ncr := translate(ncr, 'k', ''); end if;
    if cf = 0 or ct = 0 then ncr := translate(ncr, 'q', ''); end if;
    nep := case when lp = 'p' and abs(ct - cf) = 16 then (cf + ct) / 2 else -1 end;
    hm := case when cap or lp = 'p' then 0 else coalesce((g->>'hm')::int, 0) + 1 end;
    ow := not cw;
    chk := chess_attacked(cb, strpos(cb, case when ow then 'K' else 'k' end) - 1, cw);
    cmv := chess_legal(cb, ow, nep, ncr);
    rest := translate(cb, '.Kk', '');
    g := g || jsonb_build_object('b', cb, 'cr', ncr, 'ep', nep, 'hm', hm, 'n', coalesce((g->>'n')::int, 0) + 1,
      'lm', jsonb_build_array(cf, ct), 'chk', chk, 'cap', cap);
    if coalesce(array_length(cmv, 1), 0) = 0 then
      if chk then
        update duels set game = g || '{"mate":true}'::jsonb, state = 'done', winner = s, reason = 'win', ver = ver + 1 where id = d.id returning * into d;
      else
        update duels set game = g || '{"stale":true}'::jsonb, state = 'done', winner = 2, reason = 'draw', ver = ver + 1 where id = d.id returning * into d;
      end if;
    elsif rest = '' or rest in ('N', 'B', 'n', 'b') or hm >= 100 then
      update duels set game = g || '{"nomat":true}'::jsonb, state = 'done', winner = 2, reason = 'draw', ver = ver + 1 where id = d.id returning * into d;
    else
      update duels set game = g, turn = 1 - s, deadline = now() + interval '90 seconds', ver = ver + 1 where id = d.id returning * into d;
    end if;
    return duel_view(d, s);
  end if;

  select array_agg(x::int order by o) into bd from jsonb_array_elements_text(g->'b') with ordinality t(x, o);

  if d.mode = 'ttt' then
    if p_move is null or p_move < 0 or p_move > 8 or bd[p_move + 1] >= 0 then raise exception 'duel_bad_move'; end if;
    bd[p_move + 1] := s;
    for i in 1 .. 8 loop
      if duel_line(bd, array[lines[i][1], lines[i][2], lines[i][3]]) >= 0 then win := s; wl := array[lines[i][1], lines[i][2], lines[i][3]]; end if;
    end loop;
    isfull := not (-1 = any (bd));
    if win >= 0 then
      update duels set game = g || jsonb_build_object('b', to_jsonb(bd), 'lm', p_move, 'wl', to_jsonb(wl)), state = 'done', winner = win, reason = 'win', ver = ver + 1 where id = d.id returning * into d;
    elsif isfull then
      -- Unentschieden: nochmal, der andere fängt an. Nach 3 Runden ohne Sieger behalten alle ihren Einsatz.
      if (g->>'g')::int >= 3 then
        update duels set game = g || jsonb_build_object('b', to_jsonb(bd), 'lm', p_move), state = 'done', winner = 2, reason = 'draw', ver = ver + 1 where id = d.id returning * into d;
      else
        update duels set game = g || jsonb_build_object('b', to_jsonb(array_fill(-1, array[9])), 'g', (g->>'g')::int + 1, 'first', 1 - (g->>'first')::int, 'lm', -1, 'drawn', true),
          turn = 1 - (g->>'first')::int, deadline = now() + interval '32 seconds', ver = ver + 1 where id = d.id returning * into d;
      end if;
    else
      update duels set game = g || jsonb_build_object('b', to_jsonb(bd), 'lm', p_move, 'drawn', false), turn = 1 - s, deadline = now() + interval '30 seconds', ver = ver + 1 where id = d.id returning * into d;
    end if;
    return duel_view(d, s);
  end if;

  -- Vier gewinnt: 6 Reihen x 7 Spalten, Reihe 0 ist oben
  if p_move is null or p_move < 0 or p_move > 6 or bd[p_move + 1] >= 0 then raise exception 'duel_bad_move'; end if;
  r := 5;
  while bd[r * 7 + p_move + 1] >= 0 loop r := r - 1; end loop;
  bd[r * 7 + p_move + 1] := s;
  for dr, dc in select * from (values (0, 1), (1, 0), (1, 1), (1, -1)) v(x, y) loop
    for k in -3 .. 0 loop
      cells := array[]::int[];
      for i in 0 .. 3 loop
        if r + (k + i) * dr between 0 and 5 and p_move + (k + i) * dc between 0 and 6 then
          cells := cells || ((r + (k + i) * dr) * 7 + p_move + (k + i) * dc);
        end if;
      end loop;
      if array_length(cells, 1) = 4 and duel_line(bd, cells) = s then win := s; wl := cells; end if;
    end loop;
  end loop;
  isfull := not (-1 = any (bd));
  if win >= 0 then
    update duels set game = g || jsonb_build_object('b', to_jsonb(bd), 'lm', r * 7 + p_move, 'wl', to_jsonb(wl)), state = 'done', winner = win, reason = 'win', ver = ver + 1 where id = d.id returning * into d;
  elsif isfull then
    update duels set game = g || jsonb_build_object('b', to_jsonb(bd), 'lm', r * 7 + p_move), state = 'done', winner = 2, reason = 'draw', ver = ver + 1 where id = d.id returning * into d;
  else
    update duels set game = g || jsonb_build_object('b', to_jsonb(bd), 'lm', r * 7 + p_move), turn = 1 - s, deadline = now() + interval '30 seconds', ver = ver + 1 where id = d.id returning * into d;
  end if;
  return duel_view(d, s);
end $$;

-- Absagen, abbrechen oder aufgeben (wer mitten im Spiel aufgibt, verliert)
create or replace function public.sp_duel_leave(p_token uuid, p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me players; d duels; s int;
begin
  me := duel_me(p_token);
  d := duel_mine(me, p_id);
  s := case when d.a = me.id then 0 else 1 end;
  if d.state = 'invite' then
    update duels set state = 'gone', reason = case when s = 0 then 'cancelled' else 'declined' end, ver = ver + 1 where id = d.id returning * into d;
  elsif d.state = 'setup' then
    update duels set state = 'gone', reason = 'left', ver = ver + 1 where id = d.id returning * into d;
  elsif d.state = 'play' then
    update duels set state = 'done', winner = 1 - s, reason = 'forfeit', ver = ver + 1 where id = d.id returning * into d;
  end if;
  return duel_view(d, s);
end $$;

-- Ergebnis wurde im Spiel verrechnet
create or replace function public.sp_duel_ack(p_token uuid, p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare me players;
begin
  me := duel_me(p_token);
  update duels set a_ack = true where id = p_id and a = me.id and state in ('done', 'gone');
  update duels set b_ack = true where id = p_id and b = me.id and state in ('done', 'gone');
  return true;
end $$;

-- Favoriten: Gibt es die Spieler, und sind sie gerade online?
create or replace function public.sp_duel_status(p_token uuid, p_names text[])
returns table (username text, online boolean) language plpgsql security definer set search_path = public as $$
begin
  perform duel_me(p_token);
  return query select p.username, coalesce(p.last_seen > now() - interval '45 seconds', false)
    from players p where lower(p.username) = any (select lower(x) from unnest(p_names[1:50]) x);
end $$;

revoke execute on function public.duel_me(uuid), public.duel_view(duels, int), public.duel_tick(uuid), public.duel_busy(uuid),
  public.duel_mine(players, uuid), public.duel_line(int[], int[]) from public, anon, authenticated;
grant execute on function public.sp_duel_invite(uuid, text) to anon;
grant execute on function public.sp_duel_poll(uuid) to anon;
grant execute on function public.sp_duel_answer(uuid, uuid, boolean) to anon;
grant execute on function public.sp_duel_set(uuid, uuid, text, jsonb) to anon;
grant execute on function public.sp_duel_ready(uuid, uuid, boolean) to anon;
grant execute on function public.sp_duel_move(uuid, uuid, int) to anon;
grant execute on function public.sp_duel_leave(uuid, uuid) to anon;
grant execute on function public.sp_duel_ack(uuid, uuid) to anon;
grant execute on function public.sp_duel_status(uuid, text[]) to anon;

-- ===================== Farmen besuchen und Herzen (Teil 4) =====================
-- Kann auch nachträglich ausgeführt werden: einfach diese ganze Datei nochmal "Run".
alter table public.players add column if not exists hearts integer not null default 0;

create table if not exists public.farm_hearts (
  owner  uuid not null references public.players(id) on delete cascade,
  giver  uuid not null references public.players(id) on delete cascade,
  day    date not null default current_date,
  primary key (owner, giver, day)
);
alter table public.farm_hearts enable row level security;
revoke all on public.farm_hearts from anon, authenticated;

-- Farm von einem Spieler ansehen: nur das, was man auf der Farm sieht (kein Geld, keine Duelle)
create or replace function public.sp_farm_visit(p_token uuid, p_name text)
returns json language plpgsql security definer set search_path = public as $$
declare me players; r players;
begin
  select * into me from players where token = p_token;
  if me.id is null then raise exception 'bad_token'; end if;
  select * into r from players where lower(username) = lower(trim(p_name));
  if r.id is null then raise exception 'no_player'; end if;
  return json_build_object(
    'username', r.username,
    'save', case when r.save is null then null else jsonb_build_object(
      'v', r.save->'v', 'pens', r.save->'pens', 'dekoPlaced', r.save->'dekoPlaced', 'sheep', r.save->'sheep',
      'rebirths', r.save->'rebirths', 'cards', r.save->'cards', 'found', r.save->'found') end,
    'hearts', r.hearts,
    'income', r.income,
    'liked', exists (select 1 from farm_hearts h where h.owner = r.id and h.giver = me.id and h.day = current_date),
    'me', r.id = me.id);
end $$;

-- Ein Herz pro Farm und Tag
create or replace function public.sp_farm_heart(p_token uuid, p_name text)
returns integer language plpgsql security definer set search_path = public as $$
declare me players; r players; n integer;
begin
  select * into me from players where token = p_token;
  if me.id is null then raise exception 'bad_token'; end if;
  select * into r from players where lower(username) = lower(trim(p_name));
  if r.id is null then raise exception 'no_player'; end if;
  if r.id = me.id then raise exception 'heart_self'; end if;
  insert into farm_hearts (owner, giver) values (r.id, me.id) on conflict do nothing;
  if not found then raise exception 'heart_done'; end if;
  update players set hearts = hearts + 1 where id = r.id returning hearts into n;
  return n;
end $$;

grant execute on function public.sp_farm_visit(uuid, text) to anon;
grant execute on function public.sp_farm_heart(uuid, text) to anon;

-- ===================== Clubs und neue Ranglisten (Teil 5) =====================
-- Kann auch nachträglich ausgeführt werden: einfach diese ganze Datei nochmal "Run".
create table if not exists public.clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  crest       jsonb not null default '{}'::jsonb,
  owner       uuid references public.players(id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index if not exists clubs_name_lower on public.clubs (lower(name));
alter table public.clubs add column if not exists racer jsonb not null default '{}'::jsonb;
alter table public.clubs enable row level security;
revoke all on public.clubs from anon, authenticated;
alter table public.players add column if not exists club uuid references public.clubs(id) on delete set null;
alter table public.players add column if not exists club_since timestamptz;
create index if not exists players_club on public.players (club);

-- gewonnene Duelle eines Spielers (direkt aus den Duellen gezählt, kann man nicht schummeln)
create or replace function public.duel_wins(p_id uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from duels d where d.state = 'done' and ((d.a = p_id and d.winner = 0) or (d.b = p_id and d.winner = 1));
$$;

-- Wappen prüfen: nur Zahlen in erlaubten Bereichen
create or replace function public.club_crest(c jsonb)
returns jsonb language plpgsql immutable as $$
declare sh int; bg int; fg int; sy int;
begin
  sh := least(greatest(coalesce((c->>'sh')::int, 0), 0), 5);
  bg := least(greatest(coalesce((c->>'bg')::int, 0), 0), 15);
  fg := least(greatest(coalesce((c->>'fg')::int, 0), 0), 15);
  sy := least(greatest(coalesce((c->>'sy')::int, 0), 0), 23);
  return jsonb_build_object('sh', sh, 'bg', bg, 'fg', fg, 'sy', sy);
exception when others then
  return '{"sh":0,"bg":0,"fg":1,"sy":0}'::jsonb;
end $$;

drop function if exists public.sp_leaderboard(text);
create or replace function public.sp_leaderboard(p_kind text)
returns table (username text, value double precision, club text, crest jsonb) language sql security definer set search_path = public as $$
  select x.username, x.value, c.name, c.crest from (
    select p.username, p.club, p.created_at,
      case p_kind when 'playtime' then p.playtime::double precision
                  when 'rebirths' then p.rebirths::double precision
                  when 'duels' then duel_wins(p.id)::double precision
                  else p.income end as value
    from players p) x
  left join clubs c on c.id = x.club
  order by x.value desc, x.created_at asc
  limit 500;
$$;

-- Club-Rangliste: Geld pro Sekunde von allen Mitgliedern zusammen
create or replace function public.sp_club_board()
returns table (id uuid, name text, crest jsonb, members bigint, income double precision, wins bigint) language sql security definer set search_path = public as $$
  select c.id, c.name, c.crest, count(p.id), coalesce(sum(p.income), 0), coalesce(sum(duel_wins(p.id)), 0)::bigint
  from clubs c join players p on p.club = c.id
  group by c.id
  order by 5 desc, c.created_at asc
  limit 200;
$$;

create or replace function public.club_view(p_club uuid, p_me uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object('id', c.id, 'name', c.name, 'crest', c.crest, 'racer', c.racer, 'owner', o.username, 'mine', exists (select 1 from players m where m.id = p_me and m.club = c.id),
    'members', coalesce((select json_agg(json_build_object('username', p.username, 'income', p.income, 'wins', duel_wins(p.id), 'owner', p.id = c.owner) order by p.income desc)
                         from players p where p.club = c.id), '[]'::json))
  from clubs c left join players o on o.id = c.owner where c.id = p_club;
$$;

-- Clubs suchen (oder die besten zeigen)
create or replace function public.sp_club_list(p_token uuid, p_search text)
returns table (id uuid, name text, crest jsonb, members bigint, income double precision) language plpgsql security definer set search_path = public as $$
begin
  perform duel_me(p_token);
  return query select c.id, c.name, c.crest, count(p.id), coalesce(sum(p.income), 0)
    from clubs c join players p on p.club = c.id
    where coalesce(p_search, '') = '' or c.name ilike '%' || replace(replace(p_search, '%', ''), '_', '\_') || '%'
    group by c.id order by 5 desc limit 50;
end $$;

create or replace function public.sp_club_mine(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me players;
begin
  me := duel_me(p_token);
  if me.club is null then return null; end if;
  return club_view(me.club, me.id);
end $$;

create or replace function public.sp_club_info(p_token uuid, p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me players; v json;
begin
  me := duel_me(p_token);
  v := club_view(p_id, me.id);
  if v is null then raise exception 'club_gone'; end if;
  return v;
end $$;

create or replace function public.sp_club_create(p_token uuid, p_name text, p_crest jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare me players; nm text; cid uuid;
begin
  me := duel_me(p_token);
  if me.club is not null then raise exception 'club_already'; end if;
  nm := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  if nm !~ '^[A-Za-z0-9ÄÖÜäöüß _-]{3,20}$' then raise exception 'club_name'; end if;
  if exists (select 1 from clubs where lower(name) = lower(nm)) then raise exception 'club_taken'; end if;
  insert into clubs (name, crest, owner) values (nm, club_crest(p_crest), me.id) returning id into cid;
  update players set club = cid, club_since = now() where id = me.id;
  return club_view(cid, me.id);
end $$;

create or replace function public.sp_club_join(p_token uuid, p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me players; n int;
begin
  me := duel_me(p_token);
  if me.club is not null then raise exception 'club_already'; end if;
  perform 1 from clubs where id = p_id for update;
  if not found then raise exception 'club_gone'; end if;
  select count(*) into n from players where club = p_id;
  if n >= 15 then raise exception 'club_full'; end if;
  update players set club = p_id, club_since = now() where id = me.id;
  return club_view(p_id, me.id);
end $$;

create or replace function public.sp_club_leave(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare me players; cid uuid;
begin
  me := duel_me(p_token);
  cid := me.club;
  if cid is null then return true; end if;
  perform 1 from clubs where id = cid for update;
  update players set club = null where id = me.id;
  if not exists (select 1 from players where club = cid) then
    delete from clubs where id = cid;                      -- niemand mehr drin: Club wird gelöscht
  else
    update clubs set owner = (select p.id from players p where p.club = cid order by p.income desc limit 1)
      where id = cid and (owner is null or owner = me.id); -- neuer Chef: das reichste Mitglied
  end if;
  return true;
end $$;

-- Nur der Chef darf das Wappen ändern
create or replace function public.sp_club_crest(p_token uuid, p_crest jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare me players;
begin
  me := duel_me(p_token);
  update clubs set crest = club_crest(p_crest) where id = me.club and owner = me.id;
  if not found then raise exception 'club_not_owner'; end if;
  return club_view(me.club, me.id);
end $$;

revoke execute on function public.duel_wins(uuid), public.club_view(uuid, uuid) from public, anon, authenticated;
grant execute on function public.sp_leaderboard(text) to anon;
grant execute on function public.sp_club_board() to anon;
grant execute on function public.sp_club_list(uuid, text) to anon;
grant execute on function public.sp_club_mine(uuid) to anon;
grant execute on function public.sp_club_info(uuid, uuid) to anon;
grant execute on function public.sp_club_create(uuid, text, jsonb) to anon;
grant execute on function public.sp_club_join(uuid, uuid) to anon;
grant execute on function public.sp_club_leave(uuid) to anon;
grant execute on function public.sp_club_crest(uuid, jsonb) to anon;

-- ===================== Schafrennen-Cup jeden Freitag (Teil 6) =====================
-- Kann auch nachträglich ausgeführt werden: einfach diese ganze Datei nochmal "Run".
create table if not exists public.race_pts (
  day      date not null,
  player   uuid not null references public.players(id) on delete cascade,
  club     uuid not null references public.clubs(id) on delete cascade,
  points   integer not null default 0,
  claimed  boolean not null default false,
  primary key (day, player, club)
);
create index if not exists race_pts_club on public.race_pts (day, club);
alter table public.race_pts enable row level security;
revoke all on public.race_pts from anon, authenticated;

-- Renntag nach deutscher Zeit
create or replace function public.race_today() returns date language sql stable as $$ select (now() at time zone 'Europe/Berlin')::date; $$;
-- letzter Freitag (heute zählt mit)
create or replace function public.race_friday(d date) returns date language sql immutable as $$ select d - ((extract(isodow from d)::int - 5 + 7) % 7); $$;

-- Renn-Schaf prüfen
create or replace function public.club_racer(c jsonb)
returns jsonb language plpgsql immutable as $$
begin
  return jsonb_build_object(
    'col', least(greatest(coalesce((c->>'col')::int, 0), 0), 15),
    'pat', least(greatest(coalesce((c->>'pat')::int, 0), 0), 7),
    'acc', least(greatest(coalesce((c->>'acc')::int, 0), 0), 15),
    'col2', least(greatest(coalesce((c->>'col2')::int, 4), 0), 15));  -- zweite Farbe (Teil 8)
exception when others then
  return '{"col":0,"pat":0,"acc":0,"col2":4}'::jsonb;
end $$;

create or replace function public.sp_club_racer(p_token uuid, p_racer jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare me players;
begin
  me := duel_me(p_token);
  update clubs set racer = club_racer(p_racer) where id = me.club and owner = me.id;
  if not found then raise exception 'club_not_owner'; end if;
  return club_view(me.club, me.id);
end $$;

-- Punkte für den eigenen Club (nur freitags, höchstens 500 pro Spieler und Tag)
create or replace function public.sp_race_add(p_token uuid, p_points int)
returns int language plpgsql security definer set search_path = public as $$
declare me players; d date := race_today(); have int; n int;
begin
  me := duel_me(p_token);
  if extract(isodow from d) <> 5 or me.club is null then return 0; end if;
  select coalesce(sum(points), 0) into have from race_pts where day = d and player = me.id;
  n := least(greatest(coalesce(p_points, 0), 0), 60, 500 - have);
  if n <= 0 then return 0; end if;
  insert into race_pts (day, player, club, points) values (d, me.id, me.club, n)
    on conflict (day, player, club) do update set points = race_pts.points + excluded.points;
  return n;
end $$;

create or replace function public.race_rows(d date)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(r order by r.points desc), '[]'::json) from (
    select c.id, c.name, c.crest, c.racer, sum(rp.points)::int as points,
      (select count(*) from players p where p.club = c.id) as members
    from race_pts rp join clubs c on c.id = rp.club
    where rp.day = d group by c.id order by 5 desc limit 30) r;
$$;

create or replace function public.sp_race_board(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me players; d date := race_today(); fri boolean; lastd date;
begin
  me := duel_me(p_token);
  fri := extract(isodow from d) = 5;
  lastd := case when fri then d - 7 else race_friday(d) end;
  return json_build_object(
    'friday', fri,
    'rows', case when fri then race_rows(d) else '[]'::json end,
    'last', race_rows(lastd),
    'mine', coalesce((select sum(points) from race_pts where day = d and player = me.id), 0),
    'myclub', me.club);
end $$;

-- Belohnung für den letzten Freitag abholen (einmal)
create or replace function public.sp_race_claim(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me players; d date := race_today(); lastd date; r race_pts; place int; cname text;
begin
  me := duel_me(p_token);
  lastd := case when extract(isodow from d) = 5 then d - 7 else race_friday(d) end;
  if exists (select 1 from race_pts where day = lastd and player = me.id and claimed) then return null; end if;
  select * into r from race_pts where day = lastd and player = me.id and not claimed and points > 0 order by points desc limit 1;
  if r.player is null then
    -- Kai: alle Mitglieder der Top-3-Clubs bekommen die Belohnung, auch ohne eigene Punkte
    if me.club is null or me.club_since is null or (me.club_since at time zone 'Europe/Berlin')::date > lastd then return null; end if;
    select x.pl into place from (
      select rp.club, rank() over (order by sum(rp.points) desc) as pl from race_pts rp where rp.day = lastd group by rp.club) x
      where x.club = me.club;
    if place is null or place > 3 then return null; end if;
    insert into race_pts(day, player, club, points, claimed) values (lastd, me.id, me.club, 0, true) on conflict do nothing;
    select name into cname from clubs where id = me.club;
    return json_build_object('place', place, 'club', cname, 'points', 0, 'day', lastd);
  end if;
  update race_pts set claimed = true where day = lastd and player = me.id;
  select x.pl into place from (
    select rp.club, rank() over (order by sum(rp.points) desc) as pl from race_pts rp where rp.day = lastd group by rp.club) x
    where x.club = r.club;
  select name into cname from clubs where id = r.club;
  return json_build_object('place', place, 'club', cname, 'points', r.points, 'day', lastd);
end $$;

revoke execute on function public.race_rows(date) from public, anon, authenticated;
grant execute on function public.sp_club_racer(uuid, jsonb) to anon;
grant execute on function public.sp_race_add(uuid, int) to anon;
grant execute on function public.sp_race_board(uuid) to anon;
grant execute on function public.sp_race_claim(uuid) to anon;

-- ===================== Spielernamen ändern mit dem Code ChangeNameTag (Teil 7) =====================
-- Alles andere (Clubs, Duelle, Herzen, Rennen) hängt an der Spieler-ID, deshalb reicht es, den Namen zu ändern.
-- Das Passwort bleibt gleich (bcrypt hängt nicht am Namen).
create or replace function public.sp_rename(p_token uuid, p_name text)
returns json language plpgsql security definer set search_path = public as $$
declare me players;
begin
  select * into me from players where token = p_token;
  if me.id is null then raise exception 'bad_token'; end if;
  p_name := trim(coalesce(p_name, ''));
  if p_name !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'name_invalid'; end if;
  if exists (select 1 from players where lower(username) = lower(p_name) and id <> me.id) then raise exception 'name_taken'; end if;
  update players set username = p_name where id = me.id;
  return json_build_object('username', p_name);
end $$;

grant execute on function public.sp_rename(uuid, text) to anon;

-- ===================== Club-Einladungen (Teil 8) =====================
-- Kai: Mitglieder können andere Spieler in ihren Club einladen. Der Eingeladene kann annehmen oder ablehnen.
create table if not exists public.club_invites (
  id          uuid primary key default gen_random_uuid(),
  club        uuid not null references public.clubs(id) on delete cascade,
  from_player uuid references public.players(id) on delete cascade,
  to_player   uuid not null references public.players(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (club, to_player)
);
create index if not exists club_invites_to on public.club_invites (to_player);
alter table public.club_invites enable row level security;
revoke all on public.club_invites from anon, authenticated;

create or replace function public.sp_club_invite(p_token uuid, p_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare me players; them players; n int;
begin
  me := duel_me(p_token);
  if me.club is null then raise exception 'club_none'; end if;
  select * into them from players where lower(username) = lower(trim(coalesce(p_name, '')));
  if them.id is null then raise exception 'no_player'; end if;
  if them.id = me.id then raise exception 'invite_self'; end if;
  if them.club = me.club then raise exception 'invite_member'; end if;
  select count(*) into n from players where club = me.club;
  if n >= 15 then raise exception 'club_full'; end if;
  select count(*) into n from club_invites where club = me.club and created_at > now() - interval '1 day';
  if n >= 30 then raise exception 'invite_many'; end if;
  insert into club_invites (club, from_player, to_player) values (me.club, me.id, them.id)
    on conflict (club, to_player) do update set from_player = excluded.from_player, created_at = now();
  return true;
end $$;

-- Offene Einladungen an mich (alte nach 7 Tagen weg)
create or replace function public.sp_club_invites(p_token uuid)
returns table (id uuid, club uuid, name text, crest jsonb, members bigint, income double precision, from_name text) language plpgsql security definer set search_path = public as $$
declare me players;
begin
  me := duel_me(p_token);
  delete from club_invites i where i.to_player = me.id and (i.created_at < now() - interval '7 days' or i.club = me.club);
  return query select i.id, c.id, c.name, c.crest,
      (select count(*) from players p where p.club = c.id),
      (select coalesce(sum(p.income), 0) from players p where p.club = c.id),
      f.username
    from club_invites i join clubs c on c.id = i.club left join players f on f.id = i.from_player
    where i.to_player = me.id order by i.created_at desc limit 20;
end $$;

-- Einladung annehmen (true) oder ablehnen (false)
create or replace function public.sp_club_answer(p_token uuid, p_id uuid, p_yes boolean)
returns json language plpgsql security definer set search_path = public as $$
declare me players; inv club_invites; n int;
begin
  me := duel_me(p_token);
  delete from club_invites where id = p_id and to_player = me.id returning * into inv;
  if inv.id is null then raise exception 'invite_gone'; end if;
  if not coalesce(p_yes, false) then return null; end if;
  if me.club is not null then raise exception 'club_already'; end if;
  perform 1 from clubs where id = inv.club for update;
  if not found then raise exception 'club_gone'; end if;
  select count(*) into n from players where club = inv.club;
  if n >= 15 then raise exception 'club_full'; end if;
  update players set club = inv.club, club_since = now() where id = me.id;
  delete from club_invites where to_player = me.id and club = inv.club;
  return club_view(inv.club, me.id);
end $$;

grant execute on function public.sp_club_invite(uuid, text) to anon;
grant execute on function public.sp_club_invites(uuid) to anon;
grant execute on function public.sp_club_answer(uuid, uuid, boolean) to anon;

-- ===================== Dschungel-Event (Teil 9) =====================
-- Kai: Der Admin stellt die Umgebung (Wiese oder Dschungel) für alle Farmen um.
-- Wenn jemand ein Verlorenes Artefakt findet, bekommen alle eine Nachricht.
create table if not exists public.settings (
  k text primary key,
  v text not null
);
alter table public.settings enable row level security;
revoke all on public.settings from anon, authenticated;
insert into public.settings (k, v) values ('env', 'wiese') on conflict (k) do nothing;

create or replace function public.sp_env()
returns text language sql security definer set search_path = public as $$
  select coalesce((select v from settings where k = 'env'), 'wiese');
$$;

create or replace function public.sp_admin_env(p_token uuid, p_env text)
returns text language plpgsql security definer set search_path = public as $$
declare me players;
begin
  select * into me from players where token = p_token;
  if me.id is null then raise exception 'bad_token'; end if;
  if not me.is_admin then raise exception 'not_admin'; end if;
  if p_env not in ('wiese', 'dschungel') then raise exception 'bad_env'; end if;
  insert into settings (k, v) values ('env', p_env) on conflict (k) do update set v = excluded.v;
  return p_env;
end $$;

create table if not exists public.news (
  id         bigint generated always as identity primary key,
  player     uuid references public.players(id) on delete cascade,
  username   text not null,
  kind       text not null,
  created_at timestamptz not null default now(),
  unique (player, kind)
);
alter table public.news enable row level security;
revoke all on public.news from anon, authenticated;

-- Jeder Fund nur einmal pro Spieler und nur während des Events
create or replace function public.sp_news_add(p_token uuid, p_kind text)
returns boolean language plpgsql security definer set search_path = public as $$
declare me players;
begin
  select * into me from players where token = p_token;
  if me.id is null then raise exception 'bad_token'; end if;
  if p_kind not in ('auge', 'maske', 'krone', 'amulett', 'waechter') then raise exception 'bad_kind'; end if;
  if now() >= timestamptz '2026-11-24 00:00:00+00' then return false; end if;
  insert into news (player, username, kind) values (me.id, me.username, p_kind) on conflict (player, kind) do nothing;
  return found;
end $$;

-- Neue Nachrichten seit p_after (nur die letzten 2 Tage)
create or replace function public.sp_news(p_after bigint)
returns table (id bigint, username text, kind text, created_at timestamptz) language sql security definer set search_path = public as $$
  select n.id, n.username, n.kind, n.created_at from news n
  where n.id > coalesce(p_after, 0) and n.created_at > now() - interval '2 days'
  order by n.id desc limit 10;
$$;

grant execute on function public.sp_env() to anon;
grant execute on function public.sp_admin_env(uuid, text) to anon;
grant execute on function public.sp_news_add(uuid, text) to anon;
grant execute on function public.sp_news(bigint) to anon;
