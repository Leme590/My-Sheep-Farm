# Schaf-Imperium

Ein Idle-Aufbauspiel im Browser: Sammle Schafe aus Mystery-Boxen, baue für jede Sorte ein eigenes Gehege, stelle Deko auf und werde mit Rebirths immer stärker. Läuft am Handy und am Computer.

- `index.html`: die Seite
- `js/data.js`: alle Schafe, Gehege, Boxen, Deko und Erfolge
- `js/art.js`: alle Grafiken (werden mit Canvas gezeichnet)
- `js/farm.js`: die Farm-Ansicht (schräg von oben, wischen, zoomen, Tag und Nacht)
- `js/game.js`: Spielregeln und Geld
- `js/ui.js`: Menüs, Login, Speichern
- `js/net.js`: Accounts und Bestenliste (Supabase oder Test-Modus)
- `config.js`: Supabase-Adresse und Key
- `supabase.sql`: Datenbank einrichten
- `ANLEITUNG.md`: Schritt für Schritt online stellen

Spielen: <https://leme590.github.io/My-Sheep-Farm/>

Zum Testen am Computer: `python3 -m http.server` im Ordner starten und <http://localhost:8000> öffnen.
