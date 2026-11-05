# Stundenerfassung – Komplette Version (Vite + React + TypeScript)

Klickbare Demo nach **Entwurf V1** (alle Bereiche): Handy-App für Mitarbeiter, Polier, Bauleiter
und Nachunternehmer-Personen sowie die PC-Seiten für Personal / HR / Lohn, Disposition,
Einkauf, Projektkosten, Geschäftsleitung, Oberbauleitung und Administrator.
Alle Daten sind erfunden und liegen nur im Browser (localStorage). Es gibt noch keinen Server.

## Starten

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev       # Entwicklung, http://localhost:5173
npm run build     # fertige Dateien in dist/
npm run preview   # dist/ lokal ansehen
```

`dist/` läuft auf jedem einfachen Webserver, auch in einem Unterordner (relative Pfade, Hash-Routing `#/…`).

## Demo bedienen

**Handy** (Startseite `#/`): Person wählen. Stefan Brandl (Facharbeiter), Markus Kern (Vorarbeiter),
Tobias Lechner (Azubi, unter 18), Martin Keller (Polier), Willibald Bürger (Bauleiter),
Marko Horvat (Nachunternehmer mit App). Demo-PIN **1234**, Florin Popescu (ohne Handy) **2468**.

**PC** (`#/pc`): Passwort für alle **Baustelle-2026**. Die Knöpfe unter „Demo – anmelden als …“
tragen E-Mail und Passwort ein. Nach 5 falschen Versuchen ist die Anmeldung gesperrt.

| Rolle am PC | Person | Startseite |
|---|---|---|
| Personal / HR / Lohn | Anna Weber | Stunden, Export ZEITERF.DAT |
| Bauleiter | Willibald Bürger | Übersicht, Freigabe, Gegenzeichnen, Widersprüche, Anträge |
| Polier | Martin Keller | Übersicht, Freigabe, Einteilung, Helfer und NU |
| Oberbauleitung | Stefanie Gruber | Tage der Bauleiter, Disposition |
| Einkauf | Sabine Roth | Nachunternehmer (mit Stundensätzen) |
| Geschäftsleitung | Geschäftsleitung | Übersicht, 2. Stufe Urlaub, Vertretung Lohnbüro |
| Administrator | Thomas Brunner | Benutzer, Rollen, technisches Protokoll |

Ohne Anmeldung: `#/registrierung` (Einladung, Code 482913, PIN, Datenschutz, Ausweis, Standort),
`#/sperre` (tägliches Öffnen mit PIN), `#/intro`, `#/hilfe`, `#/faq`, `#/datenschutz`.

## Ketten zum Ausprobieren

1. **Stunden:** Stefan stempelt (auch „Baustelle wechseln“ während der Arbeit) und sendet → Polier
   gibt frei (Handy oder PC) → Bauleiter gibt frei → Anna Weber übernimmt und erstellt die
   **ZEITERF.DAT** (55 Zeichen je Zeile, CRLF, Windows-1252). Ein zweiter Export im selben Monat ist ein Nachtrag.
2. **Urlaub:** Antrag → Bauleiter genehmigt → Geschäftsleitung genehmigt (2. Stufe) → Abwesenheiten.
3. **Arbeitsbefreiung:** Antrag mit Anlass → Bauleiter genehmigt unter Vorbehalt → Nachweis nachreichen
   → Büro „Nachweis gesehen“. Ohne Nachweis: Ersatz wählen (Urlaubstag oder unbezahlt).
4. **Disposition:** Person oder Gerät wählen, „+ hier“, „½“ für halbe Tage, „Änderungen senden“
   → Mitteilung in der App. NU mit ungültigen Unterlagen sind rot markiert.
5. **Nachunternehmer:** Unterlagen hochladen und prüfen, Ausweis eintragen (ohne Kopie),
   Mindestlohnerklärung einmal erinnern → Horvat unterschreibt in der NU-App.
6. **Betriebsurlaub:** Büro legt fest → Mitarbeiter wählt 24./31.12. und stimmt dem Kontoabzug zu.

## Was noch fehlt bis zum Echtbetrieb

Server, Datenbank und echte Anmeldung; Versand von E-Mails und Push; Abruf der Krankschreibung;
PDF-Erzeugung (Stundenzettel, Nachweis für den Bauherrn); Übersetzungen. Format der Exportdatei
und Stunden über 9,99 mit der Lohnabrechnung abstimmen. Fristen und Texte mit „Vorschlag“ oder
„rechtlich prüfen“ sind noch nicht bestätigt.

## Aufbau

- `src/domain/` Datenmodell, Beispieldaten, Regeln (Pausen, Feiertage Bayern, Konto, Nacht 20–05 Uhr),
  `lohn.ts` (Monatsübersicht und Export), `store.tsx` (alle Aktionen, nichts wird überschrieben).
- `src/screens/ma`, `polier`, `bau`, `nu` Handy-Seiten; `src/screens/pc` PC-Seiten; `src/components/Pc.tsx` PC-Rahmen und Rechte je Rolle.
