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
begin
  if octet_length(p_save::text) > 200000 then raise exception 'save_too_big'; end if;
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
  mode        text not null default 'rps',      -- rps, ttt, c4
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
    if p_mode not in ('rps', 'ttt', 'c4') then raise exception 'bad_amount'; end if;
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
        else jsonb_build_object('b', to_jsonb(array_fill(-1, array[42])), 'lm', -1) end,
      turn = case when d.mode = 'rps' then null else f end,
      deadline = now() + interval '3.5 seconds' + case when d.mode = 'rps' then interval '20 seconds' else interval '30 seconds' end,
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

-- Ein Zug: Schere(0)/Stein(1)/Papier(2), ein Feld (0-8) oder eine Spalte (0-6)
create or replace function public.sp_duel_move(p_token uuid, p_id uuid, p_move int)
returns json language plpgsql security definer set search_path = public as $$
declare me players; d duels; s int; g jsonb; bd int[]; pa int; pb int; w int; sa int; sb int;
  lines int[][] := array[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  i int; r int; c int; dr int; dc int; k int; win int := -1; wl int[]; cells int[]; isfull boolean;
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
    'acc', least(greatest(coalesce((c->>'acc')::int, 0), 0), 15));
exception when others then
  return '{"col":0,"pat":0,"acc":0}'::jsonb;
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
