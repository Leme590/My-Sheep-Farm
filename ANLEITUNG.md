# Schaf-Imperium online stellen

Das Spiel besteht aus zwei Teilen:

1. **Die Website** (dieser Ordner). Sie läuft über GitHub Pages.
2. **Die Datenbank** für Accounts, Spielstände und Bestenliste. Sie läuft bei Supabase (kostenlos).

Ohne Datenbank läuft das Spiel im **Test-Modus**: Accounts gibt es dann nur auf dem einen Gerät.

## Teil 1: Datenbank bei Supabase anlegen (ca. 15 Minuten)

1. Geh auf <https://supabase.com> und klick auf **Start your project**. Melde dich mit deinem GitHub-Account an.
2. Klick auf **New project**.
   - Name: `schaf-imperium`
   - Database Password: Klick auf **Generate a password** (das brauchst du später nicht).
   - Region: **Central EU (Frankfurt)**
   - Klick auf **Create new project** und warte, bis es fertig ist (1 bis 2 Minuten).
3. Links im Menü auf **SQL Editor** klicken, dann **New query**.
4. Öffne die Datei `supabase.sql` aus diesem Ordner, kopiere **alles** und füge es dort ein. Klick auf **Run**. Unten sollte „Success“ stehen.
5. Links unten auf **Project Settings** (Zahnrad), dann **API Keys** bzw. **Data API**.
   - Kopiere die **Project URL** (sieht aus wie `https://abcdefgh.supabase.co`).
   - Kopiere den **anon / public**-Key oder den **Publishable key** (beginnt mit `eyJ` oder `sb_publishable_`).
   - **Nicht** den `service_role`- oder `secret`-Key nehmen, der ist geheim!
6. Schick Claude die Project URL und den anon/publishable Key. Claude trägt beides in `config.js` ein.

Der anon/publishable Key darf öffentlich sein. Die Datenbank lässt damit nur die Spiel-Funktionen zu (registrieren, anmelden, speichern, Bestenliste). Passwörter werden verschlüsselt gespeichert.

**Wenn das Spiel ein Update bekommt** (zum Beispiel Codes, Admin-Menü oder Duelle): Öffne `supabase.sql` neu, kopiere wieder alles in den SQL Editor und klick auf **Run**. Das darf man beliebig oft machen, die Spielstände bleiben erhalten.

## Teil 2: Website mit GitHub Pages

1. Im Repo **My-Sheep-Farm**: **Settings** → **Pages** → bei „Source“ **GitHub Actions** auswählen.
2. Danach baut GitHub die Website bei jeder Änderung von allein (Reiter **Actions**, „Schaf-Imperium Website“). Beim ersten Mal unter **Actions** auf „Schaf-Imperium Website“ → **Run workflow** klicken.
3. Die Adresse ist: <https://leme590.github.io/My-Sheep-Farm/>

## Aufs Handy

- **iPhone:** In Safari die Website öffnen, unten auf **Teilen** tippen, dann **Zum Home-Bildschirm**.
- **Android:** In Chrome oben rechts auf die drei Punkte, dann **App installieren**.
