# CLAUDE.md – TempoVibe (Stundenerfassung K. Baumann Bau)

Hinweise für Claude und andere Entwickler, die in diesem Repo arbeiten.

## Worum es geht

TempoVibe ist eine Demo der Stundenerfassung für eine Baufirma. Es gibt drei Bereiche:

- **Mitarbeiter-App (Handy):** stempeln, Tag abschließen, Anträge.
- **Polier / Bauleitung (Handy):** Kolonne, Freigaben, Korrekturen.
- **PC / Büro:** Mitarbeiter, Disposition, Lohnbuchhaltung, Export (ZEITERF.DAT).

Außerdem gibt es eine NU-App für Nachunternehmer.

Die Demo hat **keinen Server**. Alle Daten liegen im Browser (localStorage `stundenerfassung-demo`, Startdaten in `src/domain/seed.ts`). Das echte Datenbankschema steht in `docs/datenbankschema.sql`.

## Technik

- Vite 7, React 19, React Router (HashRouter), TypeScript strict
- `npm run dev` startet den Entwicklungsserver
- `npm run build` führt `tsc -b` und `vite build` aus und muss fehlerfrei durchlaufen
- Es gibt keine Testsuite. Änderungen werden im Browser durchgeklickt, zum Beispiel mit Playwright gegen `npx vite preview`.

## Aufbau

- `src/App.tsx`: alle Routen
- `src/domain/`: Fachlogik ohne UI
  - `store.tsx`: Zustand und Aktionen
  - `types.ts`: Datentypen
  - `zeit.ts`, `lohn.ts`: Zeit- und Lohnberechnung
  - `zuschlaege.ts`: Zuschlagsarten nach BRTV Bau mit Ausschlüssen und Info-Texten
  - `zugang.ts`: Onboarding, Einmal-Passwort und Passwortregeln
- `src/screens/ma`: Mitarbeiter
- `src/screens/polier`: Polier
- `src/screens/bau`: Bauleitung
- `src/screens/pc`: Büro
- `src/screens/nu`: Nachunternehmer

## Sprachen

- Texte laufen über `tx('Deutscher Text')`. Der deutsche Text ist der Schlüssel.
- Übersetzungen liegen in `src/i18n/{en,fr,hr,it,pl,ro}.json`. Jeder neue `tx`-Text in den Mitarbeiter- und NU-Bildschirmen braucht einen Eintrag in allen sechs Dateien.
- Polier, Bauleitung und PC bleiben deutsch.
- Längere Hilfe- und Rechtstexte stehen in `src/domain/texte/*.json`.
- Die **Datenschutztexte** sind Rechtstexte. Sie werden nur nach Freigabe durch die Geschäftsleitung oder den Datenschutzbeauftragten geändert.

## Fachliche Regeln (vom Auftraggeber festgelegt)

**Tagesabschluss im Handy.** Nach „Arbeitsende“ kommen zwei Schritte:

1. Zuschläge wählen
2. Tag prüfen, dann an den Prüfer (Polier) senden

Fahrtkosten, Verpflegung und Wegezeit trägt der Mitarbeiter nicht ein. Die Lohnbuchhaltung ermittelt sie aus den Zeiten und der Baustelle.

**Pausen (§ 4 ArbZG).**

- Bei mehr als 6 h Arbeit sind 30 Min. Pause Pflicht, bei mehr als 9 h 45 Min.
- Als gesetzliche Pause zählen nur Blöcke ab 15 Min.
- Fehlt am Ende des Tages Pause, zieht `rechneTag` in `src/domain/zeit.ts` sie automatisch von der Arbeitszeit ab, höchstens bis auf 6 h bzw. 9 h (`pauseAutoMin`).
- Raucherpausen werden mit eigenem Knopf als Pause gestempelt (`raucher: true`). Sie sind keine Arbeitszeit.

**Freigabe nach dem Vier-Augen-Prinzip.**

- Niemand gibt seinen eigenen Tag frei:
  - Den Tag eines Poliers gibt die Bauleitung frei.
  - Den Tag eines Bauleiters gibt die Oberbauleitung frei.
- Wer Zeiten nachträgt, gibt sie nicht frei. Der Mitarbeiter muss nachgetragene Zeiten bestätigen.
- Bei einem Baustellenwechsel gibt jeder Polier die Stunden seiner eigenen Baustelle frei.

**Anträge.** Urlaub, Frei vom Konto und Arbeitsbefreiung gehen an die Oberbauleitung. Urlaub geht danach noch an die Geschäftsführung.

**Zuschläge.** Die Zuschläge richten sich nach dem BRTV Bau. Jeder Info-Text sagt eindeutig, wann der Zuschlag bezahlt wird und wann nicht.

**Onboarding.**

- Der Mitarbeiter bekommt per Post einen Brief mit Einmal-Passwort (Format XXXX-XXXX, 14 Tage gültig).
- Bei der ersten Anmeldung muss er sofort ein eigenes Passwort festlegen.
- Danach bleibt das Handy angemeldet (in der Demo per localStorage `stundenerfassung-handy`).
- Die PIN gibt es nur noch für Mitarbeiter ohne Handy.
- In der echten App gehören Passwörter nur als Hash auf den Server.

## Wortwahl und Demo-Daten

- Sag „Lohnbuchhaltung“, nicht den Namen des Dienstleisters.
- Sag „IT“ für den IT-Dienstleister.
- Verwende in Demo-Daten keine Namen echter Personen der Firma.

## Deployment und Git

- Jeder Push auf `main` geht über GitHub Actions (`.github/workflows/deploy.yml`) automatisch auf die Testadresse. Ein Push ist also sofort für die Tester sichtbar.
- Commit und Push nur, wenn der Auftraggeber es ausdrücklich möchte.
- Vor dem Push `git pull --rebase`.
- Keine Zugangsdaten ins Repo schreiben. Das Repo ist öffentlich.
