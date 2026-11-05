-- =============================================================================
-- TempoVibe – Stundenerfassung K. Baumann Baugesellschaft
-- Datenbankschema für PostgreSQL (ab Version 15, getestet mit 16)
--
-- Stand: 05.11.2026, Entwurf 1
-- Grundlage: Datenmodell der Demo-App (src/domain/types.ts, Komplett-Version)
--            und Datenbankkonzept V2 vom 23.10.2026.
--
-- Grundsätze (aus dem Datenbankkonzept):
--   1. Nichts wird überschrieben. Korrekturen sind neue Einträge, das Original
--      bleibt und verweist auf seinen Ersatz. Kontostände sind nur Buchungen.
--   2. Jeder sieht nur, was er braucht. Die Rechte prüft die Datenbank selbst
--      (Row Level Security), nicht nur die App.
--   3. Jede Datenart bekommt beim Entstehen ein Löschdatum.
--
-- Weitere Festlegungen:
--   - Alle Zeitpunkte als timestamptz in UTC. Der Arbeitstag zusätzlich als
--     date nach deutscher Zeit (zählt für Lohn und Export).
--   - Keine Standort-Koordinate der Person. Gespeichert wird nur das Ergebnis
--     des Vergleichs mit der Baustelle.
--   - PIN, Passwort und Anmelde-Code nur als Prüfwert (Hash).
--   - NU-Stundensätze: keine Historie, kein Protokoll, nur „zuletzt geändert“.
--   - Dateien liegen in der getrennten Dateiablage; hier nur der Steckbrief.
--   - Das Änderungsprotokoll liegt im eigenen Schema und ist nur anfügbar.
--
-- Namen der Tabellen und Felder sind vorläufig (wie im Konzept vermerkt).
-- Offene Punkte stehen am Ende der Datei.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), digest()
CREATE EXTENSION IF NOT EXISTS btree_gist; -- Überschneidungsprüfungen mit Zeiträumen

CREATE SCHEMA IF NOT EXISTS se;            -- Fachdaten der Stundenerfassung
CREATE SCHEMA IF NOT EXISTS protokoll;     -- Änderungsprotokoll (nur anfügen)

SET search_path = se, public;

-- -----------------------------------------------------------------------------
-- 0. Aufzählungen
-- -----------------------------------------------------------------------------

CREATE TYPE se.beschaeftigung   AS ENUM ('gewerblich', 'angestellt', 'azubi');
CREATE TYPE se.zugang_status    AS ENUM ('ohne', 'eingeladen', 'aktiv', 'gesperrt');
CREATE TYPE se.sprache          AS ENUM ('de', 'pl', 'ro', 'hr', 'en', 'fr', 'it');
CREATE TYPE se.stempel_art      AS ENUM ('beginn', 'pause', 'weiter', 'wechsel', 'ende');
CREATE TYPE se.standort_ergebnis AS ENUM ('passt', 'weicht_ab', 'ohne');
CREATE TYPE se.herkunft         AS ENUM ('gestempelt', 'nachgesendet', 'nachgetragen', 'polier_ohne_handy', 'korrektur');
CREATE TYPE se.tag_status       AS ENUM ('offen', 'beim_polier', 'zurueck_polier', 'bei_bauleitung', 'bei_oberbauleitung', 'freigegeben', 'uebernommen', 'exportiert');
CREATE TYPE se.zuschlag_entscheidung AS ENUM ('offen', 'ok', 'kurz', 'weg');
CREATE TYPE se.korrektur_antwort AS ENUM ('bestaetigt', 'widerspruch', 'ohne_rueckmeldung');
CREATE TYPE se.widerspruch_entscheidung AS ENUM ('bleibt', 'original');
CREATE TYPE se.vergessen_art    AS ENUM ('beginn', 'ende', 'pause');
CREATE TYPE se.meldung_status   AS ENUM ('offen', 'uebernommen', 'abgelehnt');
CREATE TYPE se.antrag_art       AS ENUM ('urlaub', 'konto', 'krank', 'kind_krank', 'arbeitsbefreiung', 'betriebsurlaub');
CREATE TYPE se.antrag_status    AS ENUM ('offen', 'bauleitung_ok', 'genehmigt', 'abgelehnt', 'gemeldet', 'zurueckgezogen');
CREATE TYPE se.antrag_quelle    AS ENUM ('app', 'hand', 'polier');
CREATE TYPE se.nachweis_status  AS ENUM ('nicht_noetig', 'fehlt', 'hochgeladen', 'gesehen');
CREATE TYPE se.befreiung_ersatz AS ENUM ('urlaub', 'unbezahlt', 'konto');
CREATE TYPE se.konto_art        AS ENUM ('urlaub', 'sikoflex', 'mehrstunden');
CREATE TYPE se.tageshaelfte     AS ENUM ('ganz', 'vm', 'nm');
CREATE TYPE se.ausfall_art      AS ENUM ('schlechtwetter', 'anderer_ausfall');
CREATE TYPE se.nachtrag_status  AS ENUM ('angeboten', 'beauftragt', 'abgelehnt');
CREATE TYPE se.kostenart        AS ENUM ('lohn', 'material', 'geraete', 'nu');
CREATE TYPE se.kostenmonat_status AS ENUM ('laeuft', 'wartet', 'abgeschlossen');
CREATE TYPE se.kosten_quelle    AS ENUM ('lohnbuchhaltung', 'rechnungen', 'hand');
CREATE TYPE se.rechnung_herkunft AS ENUM ('e_rechnung', 'hand');
CREATE TYPE se.rechnung_zuordnung AS ENUM ('sicher', 'vorschlag', 'hand');
CREATE TYPE se.unterlage_status AS ENUM ('gueltig', 'pruefen', 'abgelaufen', 'fehlt', 'nicht_erforderlich');
CREATE TYPE se.erklaerung_status AS ENUM ('offen', 'erinnert', 'unterschrieben');
CREATE TYPE se.faktor_art       AS ENUM ('totp', 'passkey');
CREATE TYPE se.geraet_status    AS ENUM ('aktiv', 'abgemeldet');
CREATE TYPE se.bu_wahl          AS ENUM ('frei', 'konto', 'urlaub');

-- -----------------------------------------------------------------------------
-- 1. Rollen und Personen
-- -----------------------------------------------------------------------------

-- Die 16 Rollen aus der Rollentabelle (feste Liste, Einzelrechte siehe Rollentabelle)
CREATE TABLE se.rolle (
  schluessel     text PRIMARY KEY,
  bezeichnung    text NOT NULL,
  je_baustelle   boolean NOT NULL DEFAULT false,  -- gilt nur auf bestimmten Baustellen
  eigene_rolle   boolean NOT NULL DEFAULT true    -- false = NU-Person, NU-Firma
);

INSERT INTO se.rolle (schluessel, bezeichnung, je_baustelle, eigene_rolle) VALUES
  ('gl',               'Geschäftsleitung',        false, true),
  ('kaufm_leitung',    'Kaufmännische Leitung',   false, true),
  ('buchhaltung',      'Buchhaltung',             false, true),
  ('lohnbuero',        'Personal / HR / Lohn',    false, true),
  ('abrechnung',       'Abrechnung',              false, true),
  ('arbeitsvorbereitung','Arbeitsvorbereitung',   false, true),
  ('einkauf',          'Einkauf',                 false, true),
  ('oberbauleitung',   'Oberbauleitung',          false, true),
  ('bauleitung',       'Bauleitung',              true,  true),
  ('polier',           'Polier',                  true,  true),
  ('vorarbeiter',      'Vorarbeiter',             true,  true),
  ('facharbeiter',     'Facharbeiter',            false, true),
  ('helfer',           'Helfer (eigene)',         false, true),
  ('nu_person',        'NU-Person',               false, false),
  ('nu_firma',         'NU-Firma (Ansprechpartner)', false, false),
  ('admin',            'Administrator',           false, true);

-- Nachunternehmer-Firma (vor person, weil NU-Personen auf sie verweisen)
CREATE TABLE se.nu_firma (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  ansprechpartner text,
  email          text,
  telefon        text,
  adresse        text,
  portal_zugang  boolean NOT NULL DEFAULT false,   -- Ansprechpartner lädt Unterlagen hoch
  angelegt_am    timestamptz NOT NULL DEFAULT now(),
  angelegt_von   uuid,
  gesperrt_am    timestamptz
);

CREATE TABLE se.person (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pers_nr        text UNIQUE,                      -- Personalnummer (NU-Personen ohne)
  vorname        text NOT NULL,
  nachname       text NOT NULL,
  beschaeftigung se.beschaeftigung,                -- NULL bei NU-Personen
  nu_firma_id    uuid REFERENCES se.nu_firma(id),  -- nur NU-Personen
  taetigkeit     text,
  eintritt       date,
  austritt       date,
  unter_18       boolean NOT NULL DEFAULT false,   -- Sonderhinweise Arbeitszeit/Pausen
  alleinerziehend boolean NOT NULL DEFAULT false,
  vorgesetzter_id uuid REFERENCES se.person(id),
  nutzt_app      boolean NOT NULL DEFAULT true,    -- false = Polier erfasst, Bestätigung mit PIN
  handy_kontakt  text,                             -- freiwillige Kontaktangabe, keine SMS
  angelegt_am    timestamptz NOT NULL DEFAULT now(),
  angelegt_von   uuid REFERENCES se.person(id),
  -- Scheidet jemand aus, wird das Konto gesperrt, nicht gelöscht.
  gesperrt_am    timestamptz,
  CONSTRAINT person_nu_oder_eigen CHECK (
    (nu_firma_id IS NULL AND beschaeftigung IS NOT NULL) OR
    (nu_firma_id IS NOT NULL AND beschaeftigung IS NULL))
);
ALTER TABLE se.nu_firma ADD FOREIGN KEY (angelegt_von) REFERENCES se.person(id);

-- Stammdaten mit Gültig-ab: Soll-Zeiten und Wochenarbeitszeit
CREATE TABLE se.person_arbeitszeit (
  person_id      uuid NOT NULL REFERENCES se.person(id),
  gueltig_ab     date NOT NULL,
  soll_mo_do     numeric(4,2) NOT NULL,            -- z. B. 8,50 h (Sommer, gewerblich)
  soll_fr        numeric(4,2) NOT NULL,            -- z. B. 7,00 h
  wochenstunden  numeric(4,2),                     -- Teilzeit, Angestellte
  geaendert_von  uuid REFERENCES se.person(id),
  geaendert_am   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, gueltig_ab)
);

-- Urlaubsanspruch je Jahr mit Gültig-ab (Buchungen laufen über se.kontobuchung)
CREATE TABLE se.person_urlaubsanspruch (
  person_id      uuid NOT NULL REFERENCES se.person(id),
  gueltig_ab     date NOT NULL,
  tage_je_jahr   numeric(5,2) NOT NULL,
  geaendert_von  uuid REFERENCES se.person(id),
  geaendert_am   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, gueltig_ab)
);

-- Kinder nur mit Geburtsmonat und -jahr, kein Name (für „Kind krank“)
CREATE TABLE se.person_kind (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  geburtsmonat   date NOT NULL CHECK (extract(day FROM geburtsmonat) = 1)  -- immer der 1. des Monats
);

-- Firmenweite Rollen (mehrere je Person möglich)
CREATE TABLE se.person_rolle (
  person_id      uuid NOT NULL REFERENCES se.person(id),
  rolle          text NOT NULL REFERENCES se.rolle(schluessel),
  von            date NOT NULL DEFAULT current_date,
  bis            date,
  vergeben_von   uuid REFERENCES se.person(id),
  vergeben_am    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, rolle, von)
);

-- -----------------------------------------------------------------------------
-- 2. Baustellen
-- -----------------------------------------------------------------------------

CREATE TABLE se.baustelle (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kst            text NOT NULL UNIQUE,             -- Kostenstelle, auch im Export
  strasse        text,
  plz_ort        text,
  massnahme      text,
  -- Standort der Baustelle (nicht der Person) für den Vergleich beim Stempeln
  breite         numeric(9,6),
  laenge         numeric(9,6),
  radius_m       integer NOT NULL DEFAULT 300,
  ortung_aktiv   boolean NOT NULL DEFAULT true,
  stunden_soll   numeric(10,2),                    -- Arbeitsvorbereitung zu Projektbeginn
  angelegt_am    timestamptz NOT NULL DEFAULT now(),
  angelegt_von   uuid REFERENCES se.person(id),
  archiviert_am  timestamptz,                      -- erst ohne offene Tage
  archiviert_von uuid REFERENCES se.person(id)
);

-- Rollen je Baustelle: Bauleitung, Polier, Vorarbeiter (mit Polierrolle)
CREATE TABLE se.person_rolle_baustelle (
  person_id      uuid NOT NULL REFERENCES se.person(id),
  baustelle_id   uuid NOT NULL REFERENCES se.baustelle(id),
  rolle          text NOT NULL REFERENCES se.rolle(schluessel)
                 CHECK (rolle IN ('bauleitung', 'polier', 'vorarbeiter')),
  von            date NOT NULL DEFAULT current_date,
  bis            date,
  vergeben_von   uuid REFERENCES se.person(id),
  vergeben_am    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, baustelle_id, rolle, von)
);

-- Vertretungen mit Zeitraum (z. B. Buchhaltung vertritt Lohnbüro, von GL geschaltet)
CREATE TABLE se.vertretung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertretene_rolle  text NOT NULL REFERENCES se.rolle(schluessel),
  vertretende_rolle text NOT NULL REFERENCES se.rolle(schluessel),
  vertretende_person_id uuid REFERENCES se.person(id),  -- optional: bestimmte Person
  von            date NOT NULL,
  bis            date NOT NULL,
  geschaltet_von uuid NOT NULL REFERENCES se.person(id),
  geschaltet_am  timestamptz NOT NULL DEFAULT now(),
  beendet_am     timestamptz,
  CHECK (bis >= von)
);

-- -----------------------------------------------------------------------------
-- 3. Zugang, Geräte, Anmeldung
-- -----------------------------------------------------------------------------

CREATE TABLE se.zugang (
  person_id      uuid PRIMARY KEY REFERENCES se.person(id),
  status         se.zugang_status NOT NULL DEFAULT 'ohne',
  email          text UNIQUE,
  code_geht_an_id uuid REFERENCES se.person(id),   -- Empfänger, wenn keine eigene E-Mail
  pin_hash       text,                             -- nur Prüfwert (z. B. argon2id)
  pin_ist_start_pin boolean NOT NULL DEFAULT false,-- PIN-Brief; beim ersten Bestätigen ändern
  passwort_hash  text,                             -- nur PC-Rollen
  fehlversuche   integer NOT NULL DEFAULT 0,
  gesperrt_bis   timestamptz,
  sprache        se.sprache NOT NULL DEFAULT 'de',
  intro_gesehen  boolean NOT NULL DEFAULT false,
  registriert_am timestamptz,
  geaendert_am   timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR code_geht_an_id IS NOT NULL OR status = 'ohne')
);

-- Einladung per E-Mail-Link (7 Tage, einmalig) und QR-Code
CREATE TABLE se.einladung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  token_hash     text NOT NULL UNIQUE,
  gesendet_an    text NOT NULL,                    -- E-Mail der Person oder des Empfängers
  gesendet_von   uuid NOT NULL REFERENCES se.person(id),
  gesendet_am    timestamptz NOT NULL DEFAULT now(),
  gueltig_bis    timestamptz NOT NULL,
  genutzt_am     timestamptz,
  gedruckt       boolean NOT NULL DEFAULT false
);

-- Anmelde-Code (6 Ziffern, 15 Minuten, einmalig, max. 5 Fehlversuche)
CREATE TABLE se.anmeldecode (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  code_hash      text NOT NULL,
  erstellt_am    timestamptz NOT NULL DEFAULT now(),
  gueltig_bis    timestamptz NOT NULL,
  fehlversuche   integer NOT NULL DEFAULT 0 CHECK (fehlversuche <= 5),
  genutzt_am     timestamptz
);

-- Registrierte Handys; eine neue Registrierung meldet das alte Gerät ab
CREATE TABLE se.geraet (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  bezeichnung    text NOT NULL,                    -- z. B. „Samsung Galaxy A54“
  schluessel_hash text NOT NULL,                   -- Geräteschlüssel, nur Prüfwert
  status         se.geraet_status NOT NULL DEFAULT 'aktiv',
  registriert_am timestamptz NOT NULL DEFAULT now(),
  zuletzt_gesehen timestamptz,
  abgemeldet_am  timestamptz,
  abgemeldet_von uuid REFERENCES se.person(id)
);
CREATE UNIQUE INDEX geraet_ein_aktives_je_person ON se.geraet (person_id) WHERE status = 'aktiv';

-- Zweiter Faktor am PC (Pflicht ab Echtbetrieb)
CREATE TABLE se.zweiter_faktor (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  art            se.faktor_art NOT NULL,
  pruefwert      bytea NOT NULL,                   -- TOTP-Geheimnis (verschlüsselt) bzw. öffentlicher Schlüssel
  bezeichnung    text,
  eingerichtet_am timestamptz NOT NULL DEFAULT now(),
  entfernt_am    timestamptz
);

-- Rechtstexte je Sprache mit Version (Datenschutz, Bestätigungen, Mindestlohnerklärung)
CREATE TABLE se.rechtstext (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  art            text NOT NULL,                    -- 'datenschutz_ma', 'datenschutz_nu', 'tag_absenden', 'mindestlohn', ...
  sprache        se.sprache NOT NULL,
  version        integer NOT NULL,
  wortlaut       text NOT NULL,
  gueltig_ab     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (art, sprache, version)
);

-- Jede Bestätigung mit genau dem angezeigten Text (Tag absenden, Korrektur, Datenschutz ...)
CREATE TABLE se.bestaetigung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  rechtstext_id  uuid REFERENCES se.rechtstext(id),
  wortlaut       text NOT NULL,                    -- Kopie, falls kein fester Rechtstext
  sprache        se.sprache NOT NULL,
  bezug_tabelle  text,                             -- z. B. 'tag', 'korrektur'
  bezug_id       uuid,
  mit_pin        boolean NOT NULL DEFAULT false,   -- auf dem Handy des Poliers
  auf_geraet_von uuid REFERENCES se.person(id),    -- wessen Handy (bei „ohne Handy“)
  zeitpunkt      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. Dateiablage (nur Steckbrief, die Datei liegt verschlüsselt außerhalb)
-- -----------------------------------------------------------------------------

CREATE TABLE se.datei (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  art            text NOT NULL,                    -- 'krankschreibung', 'nachweis_befreiung', 'nu_unterlage', 'export', ...
  ablage_schluessel text NOT NULL UNIQUE,          -- Pfad/Objekt-ID in der Dateiablage
  dateiname      text NOT NULL,
  mime_typ       text NOT NULL,
  groesse_byte   bigint NOT NULL,
  sha256         bytea NOT NULL,                   -- Prüfsumme
  gesundheitsdaten boolean NOT NULL DEFAULT false, -- zusätzlich einzeln verschlüsselt, Abruf wird protokolliert
  hochgeladen_von uuid NOT NULL REFERENCES se.person(id),
  hochgeladen_am timestamptz NOT NULL DEFAULT now(),
  gueltig_bis    date,
  vorversion_id  uuid REFERENCES se.datei(id),     -- neue Version statt Ersetzen
  loeschen_am    date NOT NULL
);

-- Jeder Abruf einer Gesundheits-Unterlage
CREATE TABLE se.datei_abruf (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  datei_id       uuid NOT NULL REFERENCES se.datei(id),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  zeitpunkt      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. Arbeitszeit: Arbeitstag, Stempelungen, Zuschläge
-- -----------------------------------------------------------------------------

-- Ein Arbeitstag je Person und Datum (deutsche Zeit, Schicht über Mitternacht
-- gehört zum Tag des Beginns). Trägt den Freigabe-Status.
CREATE TABLE se.tag (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  datum          date NOT NULL,
  status         se.tag_status NOT NULL DEFAULT 'offen',
  wegezeit_min   integer NOT NULL DEFAULT 0 CHECK (wegezeit_min >= 0),
  verpflegung    boolean NOT NULL DEFAULT false,
  uebernachtung  boolean NOT NULL DEFAULT false,
  pause_begruendung text,                          -- Pflicht bei > 6 h ohne Pause (Freigabe Polier)
  erfasst_von    uuid REFERENCES se.person(id),    -- Vier-Augen-Regel
  bestaetigt_mit_pin boolean,                      -- nur „ohne Handy“
  abgesendet_am  timestamptz,
  lohn_hinweis   text,
  loeschen_am    date NOT NULL,                    -- längste Pflichtfrist (8 Jahre)
  UNIQUE (person_id, datum)
);

-- Jeder Statuswechsel eines Tages mit Person und Zeitpunkt
CREATE TABLE se.tag_statuswechsel (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tag_id         uuid NOT NULL REFERENCES se.tag(id),
  von_status     se.tag_status,
  nach_status    se.tag_status NOT NULL,
  person_id      uuid NOT NULL REFERENCES se.person(id),
  rolle          text REFERENCES se.rolle(schluessel),
  grund          text,                             -- Pflicht bei „zurück an Polier“
  ohne_rueckmeldung boolean NOT NULL DEFAULT false,
  zeitpunkt      timestamptz NOT NULL DEFAULT now()
);

-- Stempelungen: nur anfügen. Eine Korrektur ist eine neue Zeile mit
-- herkunft = 'korrektur' und ersetzt_id = alte Zeile.
CREATE TABLE se.stempelung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id         uuid NOT NULL REFERENCES se.tag(id),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  art            se.stempel_art NOT NULL,
  zeit_handy     timestamptz NOT NULL,             -- Handy-Uhrzeit beim Tippen (in UTC)
  zeit_handy_iso text,                             -- Original mit Zeitzone, z. B. 2026-10-19T06:30:00+02:00
  eingang_server timestamptz NOT NULL DEFAULT now(),
  baustelle_id   uuid REFERENCES se.baustelle(id),
  standort       se.standort_ergebnis NOT NULL DEFAULT 'ohne',
  entfernung_m   integer,                          -- ungefähr, nur bei „weicht ab“
  begruendung    text,
  von_hand_gewaehlt boolean NOT NULL DEFAULT false,-- Baustelle ohne Standortfreigabe gewählt
  herkunft       se.herkunft NOT NULL,
  geraet_id      uuid REFERENCES se.geraet(id),
  erfasst_von    uuid NOT NULL REFERENCES se.person(id),
  ersetzt_id     uuid REFERENCES se.stempelung(id),-- diese Zeile ersetzt eine ältere
  storniert      boolean NOT NULL DEFAULT false,   -- Korrektur „Eintrag entfällt“
  CHECK (standort <> 'weicht_ab' OR entfernung_m IS NOT NULL)
);
CREATE INDEX stempelung_tag ON se.stempelung (tag_id);
CREATE INDEX stempelung_person_zeit ON se.stempelung (person_id, zeit_handy);
CREATE UNIQUE INDEX stempelung_nur_ein_ersatz ON se.stempelung (ersetzt_id) WHERE ersetzt_id IS NOT NULL;

-- Gültige Stempelungen = nicht ersetzt und nicht storniert
CREATE VIEW se.v_stempelung_gueltig AS
SELECT s.*,
       abs(extract(epoch FROM (s.eingang_server - s.zeit_handy))) >= 300
         AND s.herkunft = 'gestempelt' AS handy_uhr_weicht_ab
FROM se.stempelung s
WHERE NOT s.storniert
  AND NOT EXISTS (SELECT 1 FROM se.stempelung n WHERE n.ersetzt_id = s.id);

-- Katalog der Erschwerniszuschläge (§ 6 BRTV Bau)
CREATE TABLE se.zuschlag_art (
  schluessel     text PRIMARY KEY,                 -- 'atem', 'schmutz', 'erschuett', 'schutz', ...
  bezeichnung    text NOT NULL,
  typen          text[] NOT NULL DEFAULT '{}',
  erklaerung     text,
  nicht_mit      text[] NOT NULL DEFAULT '{}',     -- schließt diese Arten für dieselbe Zeit aus
  oben           boolean NOT NULL DEFAULT false,
  gueltig_ab     date NOT NULL DEFAULT current_date,
  gueltig_bis    date
);

CREATE TABLE se.zuschlag (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id         uuid NOT NULL REFERENCES se.tag(id),
  art            text NOT NULL REFERENCES se.zuschlag_art(schluessel),
  typ            text,
  stunden        numeric(4,2) NOT NULL CHECK (stunden > 0),
  entscheidung   se.zuschlag_entscheidung NOT NULL DEFAULT 'offen',
  stunden_gekuerzt numeric(4,2),
  entschieden_von uuid REFERENCES se.person(id),
  entschieden_am timestamptz,
  erfasst_am     timestamptz NOT NULL DEFAULT now(),
  CHECK (entscheidung <> 'kurz' OR stunden_gekuerzt IS NOT NULL)
);

-- Korrekturen des Poliers/der Bauleitung mit Antwort des Mitarbeiters
CREATE TABLE se.korrektur (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id         uuid NOT NULL REFERENCES se.tag(id),
  von            uuid NOT NULL REFERENCES se.person(id),
  zeitpunkt      timestamptz NOT NULL DEFAULT now(),
  was            text NOT NULL,                    -- lesbar, z. B. „Ende 15:45 → 15:30“
  grund          text NOT NULL,
  alt_stempelung_id uuid REFERENCES se.stempelung(id),
  neu_stempelung_id uuid REFERENCES se.stempelung(id),
  antwort        se.korrektur_antwort,
  antwort_text   text,
  antwort_am     timestamptz,
  erinnert_am    timestamptz,
  entscheidung   se.widerspruch_entscheidung,      -- Bauleitung bei Widerspruch
  entschieden_von uuid REFERENCES se.person(id),
  entschieden_am timestamptz
);

-- Meldung „vergessen zu stempeln“ (Beginn war um ..., Ende war um ..., Pause von ... bis ...)
CREATE TABLE se.vergessen_meldung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  datum          date NOT NULL,
  art            se.vergessen_art NOT NULL,
  von            time NOT NULL,
  bis            time,
  gemeldet_am    timestamptz NOT NULL DEFAULT now(),
  status         se.meldung_status NOT NULL DEFAULT 'offen',
  bearbeitet_von uuid REFERENCES se.person(id),
  bearbeitet_am  timestamptz,
  stempelung_id  uuid REFERENCES se.stempelung(id),-- bei Übernahme
  CHECK ((art = 'pause') = (bis IS NOT NULL))
);

-- Ausfalltag (Schlechtwetter u. a.) durch den Polier
CREATE TABLE se.ausfall (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id   uuid NOT NULL REFERENCES se.baustelle(id),
  datum          date NOT NULL,
  art            se.ausfall_art NOT NULL,
  ab             time NOT NULL,
  erfasst_von    uuid NOT NULL REFERENCES se.person(id),
  erfasst_am     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE se.ausfall_person (
  ausfall_id     uuid NOT NULL REFERENCES se.ausfall(id),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  PRIMARY KEY (ausfall_id, person_id)
);

-- Eigene Helfer ohne App und Lohnleister, die der Polier einträgt
-- (NU-Stunden vom Polier geschrieben: Gegenzeichnung durch die Bauleitung)
CREATE TABLE se.helfer_eintrag (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id   uuid NOT NULL REFERENCES se.baustelle(id),
  datum          date NOT NULL,
  person_id      uuid REFERENCES se.person(id),    -- wenn als Person bekannt
  nu_firma_id    uuid REFERENCES se.nu_firma(id),  -- NULL = eigene Helfer (Fa. Baumann)
  name           text NOT NULL,
  von            time NOT NULL,
  bis            time NOT NULL,
  pause_min      integer NOT NULL DEFAULT 0,
  taetigkeit     text,
  warnung        text,                             -- z. B. Unterlagen der Firma abgelaufen
  erfasst_von    uuid NOT NULL REFERENCES se.person(id),
  erfasst_am     timestamptz NOT NULL DEFAULT now(),
  gegengezeichnet_von uuid REFERENCES se.person(id),
  gegengezeichnet_am  timestamptz,
  ersetzt_id     uuid REFERENCES se.helfer_eintrag(id)
);

-- -----------------------------------------------------------------------------
-- 6. Abwesenheiten und Anträge
-- -----------------------------------------------------------------------------

CREATE TABLE se.antrag (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  art            se.antrag_art NOT NULL,
  von            date NOT NULL,
  bis            date NOT NULL,
  tage           numeric(5,2) NOT NULL,
  stunden        numeric(6,2),                     -- Konto (SIKOFlex/Mehrstunden)
  kind_id        uuid REFERENCES se.person_kind(id),
  anlass         text,                             -- Arbeitsbefreiung
  nachweis       se.nachweis_status NOT NULL DEFAULT 'nicht_noetig',
  nachweis_datei_id uuid REFERENCES se.datei(id),
  nachfrist_bis  date,
  ersatz         se.befreiung_ersatz,              -- Wahl nach Ablauf der Nachfrist
  rueckmeldung   text CHECK (rueckmeldung IN ('gesund', 'weiter')),  -- Krankmeldung vor dem Ende
  quelle         se.antrag_quelle NOT NULL DEFAULT 'app',
  notiz          text,
  status         se.antrag_status NOT NULL DEFAULT 'offen',
  gestellt_am    timestamptz NOT NULL DEFAULT now(),
  gestellt_von   uuid NOT NULL REFERENCES se.person(id),
  loeschen_am    date NOT NULL,
  CHECK (bis >= von),
  CHECK (art <> 'kind_krank' OR kind_id IS NOT NULL)
);

-- Genehmigungsweg: 1. Stufe Bauleitung, 2. Stufe GL/Kaufm. Leitung, Ablehnung mit Grund
CREATE TABLE se.antrag_schritt (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  antrag_id      uuid NOT NULL REFERENCES se.antrag(id),
  nach_status    se.antrag_status NOT NULL,
  person_id      uuid NOT NULL REFERENCES se.person(id),
  rolle          text REFERENCES se.rolle(schluessel),
  grund          text,
  zeitpunkt      timestamptz NOT NULL DEFAULT now()
);

-- Krankschreibung/Attest zur Krankmeldung (nur Lohnbüro sieht die Datei)
CREATE TABLE se.antrag_datei (
  antrag_id      uuid NOT NULL REFERENCES se.antrag(id),
  datei_id       uuid NOT NULL REFERENCES se.datei(id),
  PRIMARY KEY (antrag_id, datei_id)
);

CREATE TABLE se.betriebsurlaub (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  von            date NOT NULL,
  bis            date NOT NULL,
  festgelegt_von uuid NOT NULL REFERENCES se.person(id),
  festgelegt_am  timestamptz NOT NULL DEFAULT now(),
  CHECK (bis >= von)
);

-- Wahl je Person für 24.12. und 31.12. und Zustimmung zum Kontoabzug
CREATE TABLE se.betriebsurlaub_wahl (
  betriebsurlaub_id uuid NOT NULL REFERENCES se.betriebsurlaub(id),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  wahl_24        se.bu_wahl NOT NULL DEFAULT 'frei',
  wahl_31        se.bu_wahl NOT NULL DEFAULT 'frei',
  zustimmung_konto boolean,
  bestaetigung_id uuid REFERENCES se.bestaetigung(id),
  gespeichert_am timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (betriebsurlaub_id, person_id)
);

-- -----------------------------------------------------------------------------
-- 7. Konten: Urlaub, SIKOFlex, Mehrstunden (nur Buchungen, Stand wird berechnet)
-- -----------------------------------------------------------------------------

CREATE TABLE se.kontobuchung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  konto          se.konto_art NOT NULL,
  datum          date NOT NULL,
  menge          numeric(7,2) NOT NULL,            -- Stunden (Konten) bzw. Tage (Urlaub), plus oder minus
  grund          text NOT NULL,                    -- 'anfangsbestand', 'tag', 'antrag', 'auszahlung', 'freizeit', 'verfall', ...
  monat          date,                             -- Auszahlung: Lohnmonat (1. des Monats)
  tag_id         uuid REFERENCES se.tag(id),
  antrag_id      uuid REFERENCES se.antrag(id),
  storno_von_id  uuid REFERENCES se.kontobuchung(id), -- Gegenbuchung statt Löschen
  gebucht_von    uuid NOT NULL REFERENCES se.person(id),
  gebucht_am     timestamptz NOT NULL DEFAULT now(),
  CHECK (menge <> 0)
);
CREATE INDEX kontobuchung_person ON se.kontobuchung (person_id, konto, datum);

CREATE VIEW se.v_kontostand AS
SELECT person_id, konto, sum(menge) AS stand, max(datum) AS letzte_buchung
FROM se.kontobuchung
GROUP BY person_id, konto;

-- -----------------------------------------------------------------------------
-- 8. Disposition: Personal, Helfer und Geräte je Baustelle und Tag(eshälfte)
-- -----------------------------------------------------------------------------

CREATE TABLE se.einteilung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  datum          date NOT NULL,
  haelfte        se.tageshaelfte NOT NULL DEFAULT 'ganz',
  baustelle_id   uuid NOT NULL REFERENCES se.baustelle(id),
  geaendert_von  uuid REFERENCES se.person(id),
  geaendert_am   timestamptz NOT NULL DEFAULT now(),
  gesendet_am    timestamptz,                      -- NULL = in der Disposition geändert, noch nicht gesendet
  UNIQUE (person_id, datum, haelfte),
  loeschen_am    date NOT NULL                     -- 2 Jahre
);

-- Helfer und Lohnleister ohne App laut Disposition (Vorschlag für den Polier)
CREATE TABLE se.helfer_dispo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id   uuid NOT NULL REFERENCES se.baustelle(id),
  datum          date NOT NULL,
  nu_firma_id    uuid REFERENCES se.nu_firma(id),
  person_id      uuid REFERENCES se.person(id),
  name           text NOT NULL,
  taetigkeit     text,
  loeschen_am    date NOT NULL
);

CREATE TABLE se.baugeraet (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bezeichnung    text NOT NULL,
  inventar_nr    text UNIQUE,
  aktiv          boolean NOT NULL DEFAULT true
);

CREATE TABLE se.baugeraet_einteilung (
  baugeraet_id   uuid NOT NULL REFERENCES se.baugeraet(id),
  datum          date NOT NULL,
  baustelle_id   uuid NOT NULL REFERENCES se.baustelle(id),
  geaendert_von  uuid REFERENCES se.person(id),
  geaendert_am   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (baugeraet_id, datum)
);

-- -----------------------------------------------------------------------------
-- 9. Nachunternehmer
-- -----------------------------------------------------------------------------

-- 7 Pflicht-Unterlagen je Firma mit Gültigkeit (neue Version statt Ersetzen)
CREATE TABLE se.nu_unterlage (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nu_firma_id    uuid NOT NULL REFERENCES se.nu_firma(id),
  art            text NOT NULL CHECK (art IN (
                   'gewerbe_handwerkskarte', 'betriebshaftpflicht', 'freistellung_48b',
                   'soka_bau', 'bg_bau', 'krankenkassen', 'mindestlohn_firma')),
  datei_id       uuid REFERENCES se.datei(id),
  status         se.unterlage_status NOT NULL DEFAULT 'fehlt',
  gueltig_bis    date,
  geprueft_von   uuid REFERENCES se.person(id),
  geprueft_am    timestamptz,
  erinnert_am    timestamptz,
  ersetzt_id     uuid REFERENCES se.nu_unterlage(id),
  loeschen_am    date                              -- 10 Jahre nach Ablauf
);

-- Stundensatz je NU-Person: AUSNAHME vom Protokollgrundsatz.
-- Keine Historie, kein Protokolleintrag, nur „zuletzt geändert von/am“.
-- Lesen und Ändern nur Einkauf und Geschäftsleitung (siehe RLS unten).
-- Verschlüsselung noch offen: dann satz als bytea (pgp_sym_encrypt) statt numeric.
CREATE TABLE se.nu_stundensatz (
  person_id      uuid PRIMARY KEY REFERENCES se.person(id),
  satz_euro      numeric(8,2) NOT NULL CHECK (satz_euro >= 0),
  zuletzt_geaendert_von uuid NOT NULL REFERENCES se.person(id),
  zuletzt_geaendert_am  timestamptz NOT NULL DEFAULT now()
);

-- Ausweis nur als Sichtvermerk: keine Kopie, keine Nummer
CREATE TABLE se.ausweis_sichtung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  art            text NOT NULL,                    -- Personalausweis, Reisepass, ...
  gueltig_bis    date NOT NULL,
  staatsangehoerigkeit text NOT NULL,              -- ISO 3166-1 alpha-2
  gesehen_von    uuid NOT NULL REFERENCES se.person(id),
  gesehen_am     date NOT NULL,
  loeschen_am    date NOT NULL                     -- 6 Jahre
);

-- A1-Bescheinigung (EU/EWR/Schweiz) oder Aufenthaltstitel mit Arbeitserlaubnis (Sichtvermerk)
CREATE TABLE se.entsendung_nachweis (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  art            text NOT NULL CHECK (art IN ('a1', 'aufenthaltstitel', 'nicht_erforderlich')),
  gueltig_bis    date,
  datei_id       uuid REFERENCES se.datei(id),     -- nur A1, beim Aufenthaltstitel keine Kopie
  erfasst_von    uuid NOT NULL REFERENCES se.person(id),
  erfasst_am     timestamptz NOT NULL DEFAULT now(),
  loeschen_am    date
);

-- Monatliche Mindestlohnerklärung der NU-Person (Unterschrift in der App)
CREATE TABLE se.mindestlohnerklaerung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  nu_firma_id    uuid NOT NULL REFERENCES se.nu_firma(id),
  monat          date NOT NULL CHECK (extract(day FROM monat) = 1),
  status         se.erklaerung_status NOT NULL DEFAULT 'offen',
  rechtstext_id  uuid REFERENCES se.rechtstext(id),
  unterschrift_datei_id uuid REFERENCES se.datei(id),
  pdf_datei_id   uuid REFERENCES se.datei(id),
  unterschrieben_am timestamptz,
  erinnert_am    timestamptz,                      -- höchstens eine Erinnerung
  loeschen_am    date,
  UNIQUE (person_id, monat)
);

-- Abgleich NU-Stunden mit der Rechnung (nur Stunden, Betrag prüft der Einkauf)
CREATE TABLE se.nu_rechnungsabgleich (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nu_firma_id    uuid NOT NULL REFERENCES se.nu_firma(id),
  baustelle_id   uuid NOT NULL REFERENCES se.baustelle(id),
  monat          date NOT NULL CHECK (extract(day FROM monat) = 1),
  stunden_app    numeric(8,2) NOT NULL,
  stunden_rechnung numeric(8,2) NOT NULL,
  eingangsrechnung_id uuid,                        -- FK unten
  geprueft_von   uuid NOT NULL REFERENCES se.person(id),
  geprueft_am    timestamptz NOT NULL DEFAULT now(),
  bemerkung      text
);

-- -----------------------------------------------------------------------------
-- 10. Monatsabschluss und Export an die Lohnbuchhaltung (ZEITERF.DAT)
-- -----------------------------------------------------------------------------

CREATE TABLE se.export (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monat          date NOT NULL CHECK (extract(day FROM monat) = 1),
  nachtrag       boolean NOT NULL DEFAULT false,   -- offene Tage aus dem Vormonat
  datei_id       uuid REFERENCES se.datei(id),     -- unveränderbar, mit Prüfsumme
  zeilen_anzahl  integer NOT NULL,
  sha256         bytea NOT NULL,
  erstellt_von   uuid NOT NULL REFERENCES se.person(id),
  erstellt_am    timestamptz NOT NULL DEFAULT now(),
  loeschen_am    date NOT NULL                     -- 8 Jahre
);

-- Welche Tage in welchem Export (exportierte Tage sind gesperrt)
CREATE TABLE se.export_tag (
  export_id      uuid NOT NULL REFERENCES se.export(id),
  tag_id         uuid NOT NULL REFERENCES se.tag(id) UNIQUE,
  PRIMARY KEY (export_id, tag_id)
);

-- Zeilen der Datei (55 Zeichen, CRLF), zur Nachvollziehbarkeit
CREATE TABLE se.export_zeile (
  export_id      uuid NOT NULL REFERENCES se.export(id),
  nr             integer NOT NULL,
  inhalt         char(55) NOT NULL,
  PRIMARY KEY (export_id, nr)
);

-- Offene Tage beim Export (gehen nicht mit, kommen als Nachtrag)
CREATE TABLE se.export_offen (
  export_id      uuid NOT NULL REFERENCES se.export(id),
  tag_id         uuid NOT NULL REFERENCES se.tag(id),
  PRIMARY KEY (export_id, tag_id)
);

-- Nachtstunden-Meldung (Mail an die Lohnbuchhaltung) je Monat
CREATE TABLE se.nachtstunden_meldung (
  monat          date PRIMARY KEY CHECK (extract(day FROM monat) = 1),
  datei_id       uuid REFERENCES se.datei(id),
  gesendet_von   uuid NOT NULL REFERENCES se.person(id),
  gesendet_am    timestamptz NOT NULL DEFAULT now()
);

-- Übernahme eines Tages durch das Büro in die Monatsübersicht
CREATE TABLE se.tag_uebernahme (
  tag_id         uuid PRIMARY KEY REFERENCES se.tag(id),
  uebernommen_von uuid NOT NULL REFERENCES se.person(id),
  uebernommen_am timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 11. Projektkosten
-- -----------------------------------------------------------------------------

-- Ursprungs-Soll aus der Auftragskalkulation (Arbeitsvorbereitung)
CREATE TABLE se.projekt_soll (
  baustelle_id   uuid PRIMARY KEY REFERENCES se.baustelle(id),
  lohn           numeric(12,2) NOT NULL DEFAULT 0,
  material       numeric(12,2) NOT NULL DEFAULT 0,
  geraete        numeric(12,2) NOT NULL DEFAULT 0,
  nachunternehmer numeric(12,2) NOT NULL DEFAULT 0,
  geaendert_von  uuid NOT NULL REFERENCES se.person(id),
  geaendert_am   timestamptz NOT NULL DEFAULT now()
);

-- Nachträge der Bauleitung (nur „beauftragt“ zählt zum Soll, auch Minderungen)
CREATE TABLE se.nachtrag (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id   uuid NOT NULL REFERENCES se.baustelle(id),
  nr             text NOT NULL,
  bezeichnung    text NOT NULL,
  datum          date NOT NULL,
  status         se.nachtrag_status NOT NULL DEFAULT 'angeboten',
  lohn           numeric(12,2) NOT NULL DEFAULT 0,
  material       numeric(12,2) NOT NULL DEFAULT 0,
  geraete        numeric(12,2) NOT NULL DEFAULT 0,
  nachunternehmer numeric(12,2) NOT NULL DEFAULT 0,
  stunden        numeric(10,2) NOT NULL DEFAULT 0,
  angelegt_von   uuid NOT NULL REFERENCES se.person(id),
  angelegt_am    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (baustelle_id, nr)
);

-- Mittellohn der Firma je Monat (€/h), firmenweit
CREATE TABLE se.mittellohn (
  monat          date PRIMARY KEY CHECK (extract(day FROM monat) = 1),
  satz_euro_je_stunde numeric(8,2) NOT NULL,
  geaendert_von  uuid NOT NULL REFERENCES se.person(id),
  geaendert_am   timestamptz NOT NULL DEFAULT now()
);

-- Kostenmonat je Baustelle: genau ein Monat „läuft“, beliebig viele „wartet“
CREATE TABLE se.kostenmonat (
  baustelle_id   uuid NOT NULL REFERENCES se.baustelle(id),
  monat          date NOT NULL CHECK (extract(day FROM monat) = 1),
  status         se.kostenmonat_status NOT NULL DEFAULT 'laeuft',
  abgeschlossen_von uuid REFERENCES se.person(id),
  abgeschlossen_am  timestamptz,
  wieder_geoeffnet_von uuid REFERENCES se.person(id),
  wieder_geoeffnet_am  timestamptz,
  PRIMARY KEY (baustelle_id, monat)
);
CREATE UNIQUE INDEX kostenmonat_ein_laufender ON se.kostenmonat (baustelle_id) WHERE status = 'laeuft';

-- Monatssumme je Kostenart, entsteht beim Abschluss (Lohn bei „wartet“ wird berechnet, nicht gespeichert)
CREATE TABLE se.kosten_monat_summe (
  baustelle_id   uuid NOT NULL,
  monat          date NOT NULL,
  kostenart      se.kostenart NOT NULL,
  betrag         numeric(12,2) NOT NULL,
  quelle         se.kosten_quelle NOT NULL,
  PRIMARY KEY (baustelle_id, monat, kostenart),
  FOREIGN KEY (baustelle_id, monat) REFERENCES se.kostenmonat(baustelle_id, monat)
);

CREATE TABLE se.eingangsrechnung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id   uuid NOT NULL REFERENCES se.baustelle(id),
  lieferant      text NOT NULL,
  nu_firma_id    uuid REFERENCES se.nu_firma(id),
  rechnungsnummer text NOT NULL,
  rechnungsdatum date NOT NULL,
  leistungsdatum date,
  leistung_bis   date,
  -- Monat des Leistungsdatums (bei Zeitraum dessen Ende), sonst des Rechnungsdatums
  buchungsmonat  date NOT NULL GENERATED ALWAYS AS
                 (make_date(extract(year FROM coalesce(leistung_bis, leistungsdatum, rechnungsdatum))::int,
                            extract(month FROM coalesce(leistung_bis, leistungsdatum, rechnungsdatum))::int, 1)) STORED,
  leistung       text,
  betrag_netto   numeric(12,2) NOT NULL,
  kostenart      se.kostenart NOT NULL CHECK (kostenart <> 'lohn'),
  herkunft       se.rechnung_herkunft NOT NULL DEFAULT 'hand',
  zuordnung      se.rechnung_zuordnung NOT NULL DEFAULT 'hand',
  nachbuchung    boolean NOT NULL DEFAULT false,
  originaldatei_id uuid REFERENCES se.datei(id),
  erfasst_von    uuid NOT NULL REFERENCES se.person(id),
  erfasst_am     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lieferant, rechnungsnummer)
);
ALTER TABLE se.nu_rechnungsabgleich
  ADD FOREIGN KEY (eingangsrechnung_id) REFERENCES se.eingangsrechnung(id);

-- Soll je Baustelle = Ursprungs-Soll + beauftragte Nachträge
CREATE VIEW se.v_projekt_soll AS
SELECT b.id AS baustelle_id,
       coalesce(p.lohn, 0)            + coalesce(sum(n.lohn) FILTER (WHERE n.status = 'beauftragt'), 0)     AS lohn,
       coalesce(p.material, 0)        + coalesce(sum(n.material) FILTER (WHERE n.status = 'beauftragt'), 0) AS material,
       coalesce(p.geraete, 0)         + coalesce(sum(n.geraete) FILTER (WHERE n.status = 'beauftragt'), 0)  AS geraete,
       coalesce(p.nachunternehmer, 0) + coalesce(sum(n.nachunternehmer) FILTER (WHERE n.status = 'beauftragt'), 0) AS nachunternehmer,
       coalesce(b.stunden_soll, 0)    + coalesce(sum(n.stunden) FILTER (WHERE n.status = 'beauftragt'), 0)  AS stunden
FROM se.baustelle b
LEFT JOIN se.projekt_soll p ON p.baustelle_id = b.id
LEFT JOIN se.nachtrag n ON n.baustelle_id = b.id
GROUP BY b.id, p.lohn, p.material, p.geraete, p.nachunternehmer, b.stunden_soll;

-- -----------------------------------------------------------------------------
-- 12. Mitteilungen und Nachrichten
-- -----------------------------------------------------------------------------

-- Mitteilungen an Personen (Push in der App)
CREATE TABLE se.mitteilung (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES se.person(id),
  titel          text NOT NULL,
  text           text NOT NULL,
  link           text,
  erstellt_am    timestamptz NOT NULL DEFAULT now(),
  gelesen_am     timestamptz
);

-- Nachrichten an Polier/Büro (z. B. aus der Hilfe)
CREATE TABLE se.nachricht (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  von            uuid NOT NULL REFERENCES se.person(id),
  an_rolle       text REFERENCES se.rolle(schluessel),
  baustelle_id   uuid REFERENCES se.baustelle(id),
  text           text NOT NULL,
  erstellt_am    timestamptz NOT NULL DEFAULT now(),
  erledigt_von   uuid REFERENCES se.person(id),
  erledigt_am    timestamptz
);

-- -----------------------------------------------------------------------------
-- 13. Einstellungen, Löschung
-- -----------------------------------------------------------------------------

CREATE TABLE se.einstellung (
  schluessel     text PRIMARY KEY,
  wert           jsonb NOT NULL,
  geaendert_von  uuid REFERENCES se.person(id),
  geaendert_am   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO se.einstellung (schluessel, wert) VALUES
  ('betriebsnummer',           '"123456"'),          -- Platzhalter, mit der Lohnbuchhaltung klären
  ('kst_abwesenheit_gewerblich','"180"'),
  ('kst_abwesenheit_angestellt','"170"'),
  ('erinnerung_ende_offen',    '{"nach_stunden": 2, "spaetestens": "20:00"}'),
  ('erinnerung_tag_senden',    '{"uhrzeit": "06:30"}'),
  ('handy_uhr_abweichung_min', '5'),
  ('einladung_gueltig_tage',   '7'),
  ('anmeldecode_gueltig_min',  '15');

-- Von der Löschung ausgenommene Vorgänge (Rechtsstreit, Prüfung)
CREATE TABLE se.loeschsperre (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabelle        text NOT NULL,
  eintrag_id     uuid NOT NULL,
  begruendung    text NOT NULL,
  gesetzt_von    uuid NOT NULL REFERENCES se.person(id),
  gesetzt_am     timestamptz NOT NULL DEFAULT now(),
  aufgehoben_am  timestamptz
);

-- Monatlicher Löschlauf: nur Art und Anzahl, nicht der Inhalt
CREATE TABLE se.loeschlauf (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zeitpunkt      timestamptz NOT NULL DEFAULT now(),
  tabelle        text NOT NULL,
  anzahl         integer NOT NULL
);

-- -----------------------------------------------------------------------------
-- 14. Änderungsprotokoll (eigenes Schema, nur anfügen, Prüfsummen-Kette)
-- -----------------------------------------------------------------------------

CREATE TABLE protokoll.eintrag (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zeitpunkt      timestamptz NOT NULL DEFAULT now(),   -- immer Serverzeit
  person_id      uuid,                                  -- wer
  rolle          text,                                  -- in welcher Rolle
  art            text NOT NULL CHECK (art IN ('technisch', 'fachlich')),
  aktion         text NOT NULL CHECK (aktion IN ('INSERT', 'UPDATE', 'DELETE', 'ANMELDUNG', 'ABRUF', 'EXPORT')),
  tabelle        text NOT NULL,
  eintrag_id     text,
  alt            jsonb,
  neu            jsonb,
  warum          text,                                  -- Pflicht bei Korrekturen (prüft die App)
  vorher_hash    bytea,
  hash           bytea NOT NULL
);
CREATE INDEX eintrag_tabelle ON protokoll.eintrag (tabelle, eintrag_id);

-- Prüfsumme über den vorherigen Eintrag: Manipulation fällt auf
CREATE FUNCTION protokoll.hash_setzen() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_vorher bytea;
BEGIN
  PERFORM pg_advisory_xact_lock(4711);
  SELECT hash INTO v_vorher FROM protokoll.eintrag ORDER BY id DESC LIMIT 1;
  NEW.vorher_hash := v_vorher;
  NEW.hash := digest(
    coalesce(encode(v_vorher, 'hex'), '') || NEW.zeitpunkt::text || coalesce(NEW.person_id::text, '') ||
    NEW.art || NEW.aktion || NEW.tabelle || coalesce(NEW.eintrag_id, '') ||
    coalesce(NEW.alt::text, '') || coalesce(NEW.neu::text, '') || coalesce(NEW.warum, ''),
    'sha256');
  RETURN NEW;
END $$;

CREATE TRIGGER eintrag_hash BEFORE INSERT ON protokoll.eintrag
  FOR EACH ROW EXECUTE FUNCTION protokoll.hash_setzen();

-- Nur anfügen: Ändern und Löschen sind gesperrt, auch für den Administrator
CREATE FUNCTION protokoll.nur_anfuegen() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Tabelle %.% darf nur ergänzt werden (keine Änderung, keine Löschung)',
    TG_TABLE_SCHEMA, TG_TABLE_NAME;
END $$;

CREATE TRIGGER eintrag_nur_anfuegen BEFORE UPDATE OR DELETE ON protokoll.eintrag
  FOR EACH ROW EXECUTE FUNCTION protokoll.nur_anfuegen();
CREATE TRIGGER eintrag_kein_truncate BEFORE TRUNCATE ON protokoll.eintrag
  FOR EACH STATEMENT EXECUTE FUNCTION protokoll.nur_anfuegen();

-- Allgemeiner Protokoll-Trigger für Fachtabellen.
-- Die App setzt je Transaktion: SET LOCAL app.person_id, app.rolle, app.warum
CREATE FUNCTION protokoll.aufzeichnen() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = se, protokoll, public AS $$
DECLARE v_alt jsonb; v_neu jsonb; v_id text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_alt := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_neu := to_jsonb(NEW); END IF;
  v_id := coalesce(v_neu, v_alt) ->> coalesce(TG_ARGV[1], 'id');
  INSERT INTO protokoll.eintrag (person_id, rolle, art, aktion, tabelle, eintrag_id, alt, neu, warum)
  VALUES (nullif(current_setting('app.person_id', true), '')::uuid,
          nullif(current_setting('app.rolle', true), ''),
          coalesce(TG_ARGV[0], 'fachlich'), TG_OP, TG_TABLE_NAME, v_id, v_alt, v_neu,
          nullif(current_setting('app.warum', true), ''));
  RETURN coalesce(NEW, OLD);
END $$;

-- Fachliche Tabellen
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'person', 'person_arbeitszeit', 'person_urlaubsanspruch', 'person_kind',
    'baustelle', 'tag', 'stempelung', 'zuschlag', 'korrektur', 'vergessen_meldung',
    'ausfall', 'helfer_eintrag', 'antrag', 'betriebsurlaub', 'betriebsurlaub_wahl',
    'kontobuchung', 'einteilung', 'nu_firma', 'nu_unterlage', 'ausweis_sichtung',
    'entsendung_nachweis', 'mindestlohnerklaerung', 'nu_rechnungsabgleich',
    'export', 'tag_uebernahme', 'projekt_soll', 'nachtrag', 'mittellohn',
    'kostenmonat', 'eingangsrechnung', 'datei', 'loeschsperre']
  LOOP
    EXECUTE format('CREATE TRIGGER protokoll AFTER INSERT OR UPDATE OR DELETE ON se.%I
                    FOR EACH ROW EXECUTE FUNCTION protokoll.aufzeichnen(''fachlich'')', t);
  END LOOP;
  -- Technische Tabellen (Administrator sieht nur diese Einträge)
  FOREACH t IN ARRAY ARRAY['person_rolle', 'person_rolle_baustelle', 'vertretung', 'zugang',
                           'einladung', 'geraet', 'zweiter_faktor', 'einstellung']
  LOOP
    EXECUTE format('CREATE TRIGGER protokoll AFTER INSERT OR UPDATE OR DELETE ON se.%I
                    FOR EACH ROW EXECUTE FUNCTION protokoll.aufzeichnen(''technisch'', %L)',
                   t, CASE t WHEN 'zugang' THEN 'person_id'
                             WHEN 'einstellung' THEN 'schluessel'
                             WHEN 'person_rolle' THEN 'person_id'
                             WHEN 'person_rolle_baustelle' THEN 'person_id'
                             ELSE 'id' END);
  END LOOP;
END $$;
-- Bewusst OHNE Protokoll: se.nu_stundensatz (Ausnahme laut Konzept).

-- Nur-Anfügen auch für Stempelungen, Bestätigungen, Statuswechsel, Exporte
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['stempelung', 'bestaetigung', 'tag_statuswechsel', 'antrag_schritt',
                           'export', 'export_tag', 'export_zeile', 'datei_abruf', 'loeschlauf']
  LOOP
    EXECUTE format('CREATE TRIGGER nur_anfuegen BEFORE UPDATE ON se.%I
                    FOR EACH ROW EXECUTE FUNCTION protokoll.nur_anfuegen()', t);
  END LOOP;
END $$;
-- DELETE auf diesen Tabellen darf nur der Löschlauf (Rolle se_loeschlauf, siehe unten).

-- Exportierte Tage sind gesperrt
CREATE FUNCTION se.tag_sperre() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'exportiert' THEN
    RAISE EXCEPTION 'Tag % ist exportiert und gesperrt. Korrektur nur als Nachtrag im Folgemonat.', OLD.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tag_sperre BEFORE UPDATE ON se.tag
  FOR EACH ROW EXECUTE FUNCTION se.tag_sperre();

-- Vier-Augen-Regel: Wer einen Tag erfasst hat, gibt ihn nicht selbst frei
CREATE FUNCTION se.vier_augen() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_erfasst uuid; v_person uuid;
BEGIN
  IF NEW.nach_status IN ('bei_bauleitung', 'freigegeben') THEN
    SELECT erfasst_von, person_id INTO v_erfasst, v_person FROM se.tag WHERE id = NEW.tag_id;
    IF NEW.person_id = v_person OR NEW.person_id = v_erfasst THEN
      RAISE EXCEPTION 'Vier-Augen-Regel: eigene oder selbst erfasste Tage können nicht selbst freigegeben werden';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vier_augen BEFORE INSERT ON se.tag_statuswechsel
  FOR EACH ROW EXECUTE FUNCTION se.vier_augen();

-- -----------------------------------------------------------------------------
-- 15. Zugriffsrechte in der Datenbank (Row Level Security)
--
-- Die App verbindet sich mit der Rolle se_app und setzt je Anfrage:
--   SET LOCAL app.person_id = '<uuid>';  SET LOCAL app.rolle = '<schluessel>';
-- Hier stehen die Hilfsfunktionen und die Regeln für die heikelsten Tabellen.
-- Die übrigen Regeln folgen 1:1 der Rollentabelle und werden beim Bau ergänzt.
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'se_app') THEN CREATE ROLE se_app NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'se_loeschlauf') THEN CREATE ROLE se_loeschlauf NOLOGIN; END IF;
END $$;

CREATE FUNCTION se.ich() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.person_id', true), '')::uuid $$;

-- Hat die angemeldete Person die Rolle (firmenweit oder als Vertretung)?
CREATE FUNCTION se.hat_rolle(p_rolle text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = se, public AS $$
  SELECT EXISTS (SELECT 1 FROM se.person_rolle r
                 WHERE r.person_id = se.ich() AND r.rolle = p_rolle
                   AND r.von <= current_date AND (r.bis IS NULL OR r.bis >= current_date))
      OR EXISTS (SELECT 1 FROM se.vertretung v
                 JOIN se.person_rolle r ON r.rolle = v.vertretende_rolle AND r.person_id = se.ich()
                 WHERE v.vertretene_rolle = p_rolle AND v.beendet_am IS NULL
                   AND current_date BETWEEN v.von AND v.bis
                   AND (v.vertretende_person_id IS NULL OR v.vertretende_person_id = se.ich()));
$$;

-- Ist die angemeldete Person auf der Baustelle Polier, Vorarbeiter oder Bauleitung?
CREATE FUNCTION se.auf_baustelle(p_baustelle uuid, p_rollen text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = se, public AS $$
  SELECT EXISTS (SELECT 1 FROM se.person_rolle_baustelle r
                 WHERE r.person_id = se.ich() AND r.baustelle_id = p_baustelle
                   AND r.rolle = ANY (p_rollen)
                   AND r.von <= current_date AND (r.bis IS NULL OR r.bis >= current_date));
$$;

-- Darf die angemeldete Person die Stunden dieses Tages sehen?
CREATE FUNCTION se.darf_tag_sehen(p_tag uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = se, public AS $$
  SELECT EXISTS (SELECT 1 FROM se.tag t WHERE t.id = p_tag AND t.person_id = se.ich())
      OR se.hat_rolle('lohnbuero') OR se.hat_rolle('gl') OR se.hat_rolle('kaufm_leitung')
      OR se.hat_rolle('oberbauleitung')
      OR EXISTS (SELECT 1 FROM se.stempelung s
                 WHERE s.tag_id = p_tag AND s.baustelle_id IS NOT NULL
                   AND se.auf_baustelle(s.baustelle_id, ARRAY['polier', 'vorarbeiter', 'bauleitung']));
$$;

ALTER TABLE se.tag ENABLE ROW LEVEL SECURITY;
CREATE POLICY tag_lesen ON se.tag FOR SELECT TO se_app USING (se.darf_tag_sehen(id));
CREATE POLICY tag_anlegen ON se.tag FOR INSERT TO se_app WITH CHECK (true);
CREATE POLICY tag_aendern ON se.tag FOR UPDATE TO se_app USING (se.darf_tag_sehen(id));

ALTER TABLE se.stempelung ENABLE ROW LEVEL SECURITY;
CREATE POLICY stempelung_lesen ON se.stempelung FOR SELECT TO se_app USING (se.darf_tag_sehen(tag_id));
CREATE POLICY stempelung_anlegen ON se.stempelung FOR INSERT TO se_app
  WITH CHECK (person_id = se.ich() OR se.darf_tag_sehen(tag_id));

-- NU-Stundensätze: nur Einkauf und Geschäftsleitung
ALTER TABLE se.nu_stundensatz ENABLE ROW LEVEL SECURITY;
CREATE POLICY nu_satz ON se.nu_stundensatz FOR ALL TO se_app
  USING (se.hat_rolle('einkauf') OR se.hat_rolle('gl'))
  WITH CHECK (se.hat_rolle('einkauf') OR se.hat_rolle('gl'));

-- Dateien mit Gesundheitsdaten: nur Lohnbüro (Buchhaltung nur in der Vertretung, über hat_rolle)
ALTER TABLE se.datei ENABLE ROW LEVEL SECURITY;
CREATE POLICY datei_lesen ON se.datei FOR SELECT TO se_app
  USING (CASE WHEN gesundheitsdaten OR art = 'nachweis_befreiung' THEN se.hat_rolle('lohnbuero')
              ELSE true END);   -- übrige Dateien: Prüfung über den zugehörigen Vorgang (beim Bau ergänzen)
CREATE POLICY datei_anlegen ON se.datei FOR INSERT TO se_app WITH CHECK (hochgeladen_von = se.ich());

-- Mindestlohnerklärungen: Lohnbüro bearbeitet, GL und Kaufm. Leitung lesen, Einkauf nicht; die Person selbst
ALTER TABLE se.mindestlohnerklaerung ENABLE ROW LEVEL SECURITY;
CREATE POLICY mle_lesen ON se.mindestlohnerklaerung FOR SELECT TO se_app
  USING (person_id = se.ich() OR se.hat_rolle('lohnbuero') OR se.hat_rolle('gl') OR se.hat_rolle('kaufm_leitung'));
CREATE POLICY mle_schreiben ON se.mindestlohnerklaerung FOR UPDATE TO se_app
  USING (person_id = se.ich() OR se.hat_rolle('lohnbuero'));
CREATE POLICY mle_anlegen ON se.mindestlohnerklaerung FOR INSERT TO se_app
  WITH CHECK (se.hat_rolle('lohnbuero') OR person_id = se.ich());

-- Anträge: eigene, Lohnbüro, GL/Kaufm. Leitung; Bauleitung über die App-Sicht ohne Grund (beim Bau ergänzen)
ALTER TABLE se.antrag ENABLE ROW LEVEL SECURITY;
CREATE POLICY antrag_lesen ON se.antrag FOR SELECT TO se_app
  USING (person_id = se.ich() OR se.hat_rolle('lohnbuero') OR se.hat_rolle('gl')
         OR se.hat_rolle('kaufm_leitung') OR se.hat_rolle('oberbauleitung')
         OR (art = 'urlaub' AND se.hat_rolle('bauleitung')));
CREATE POLICY antrag_anlegen ON se.antrag FOR INSERT TO se_app
  WITH CHECK (person_id = se.ich() OR se.hat_rolle('lohnbuero') OR se.hat_rolle('polier'));
CREATE POLICY antrag_aendern ON se.antrag FOR UPDATE TO se_app
  USING (person_id = se.ich() OR se.hat_rolle('lohnbuero') OR se.hat_rolle('gl')
         OR se.hat_rolle('kaufm_leitung') OR se.hat_rolle('bauleitung') OR se.hat_rolle('oberbauleitung'));

-- Protokoll: GL, Kaufm. Leitung, Lohnbüro lesen alles; Administrator nur technische Einträge
ALTER TABLE protokoll.eintrag ENABLE ROW LEVEL SECURITY;
CREATE POLICY protokoll_lesen ON protokoll.eintrag FOR SELECT TO se_app
  USING (se.hat_rolle('gl') OR se.hat_rolle('kaufm_leitung') OR se.hat_rolle('lohnbuero')
         OR (art = 'technisch' AND se.hat_rolle('admin')));

GRANT USAGE ON SCHEMA se, protokoll TO se_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA se TO se_app;
GRANT SELECT ON protokoll.eintrag TO se_app;   -- Einträge entstehen nur über Trigger
GRANT USAGE ON ALL SEQUENCES IN SCHEMA se TO se_app;
REVOKE UPDATE ON se.stempelung, se.bestaetigung, se.tag_statuswechsel, se.antrag_schritt,
                 se.export, se.export_tag, se.export_zeile FROM se_app;
-- Kein DELETE für die App. Löschen nur der monatliche Löschlauf nach Frist:
GRANT USAGE ON SCHEMA se TO se_loeschlauf;
GRANT SELECT, DELETE ON ALL TABLES IN SCHEMA se TO se_loeschlauf;

COMMIT;

-- =============================================================================
-- Offene Punkte zum Schema
--   - Verschlüsselung der NU-Stundensätze (pgcrypto oder in der Anwendung).
--   - Wer darf Ausweisdaten von NU-Personen lesen? (RLS für ausweis_sichtung fehlt noch)
--   - Welche Rolle setzt Löschsperren?
--   - Restliche RLS-Regeln aus der Rollentabelle (Projektkosten, Disposition, Kosten ohne NU-Zeile
--     für Polier/Bauleitung: am besten über eigene Sichten).
--   - Aufbewahrung Stunden/E-Rechnungen 8 oder 10 Jahre (Steuerberater); loeschen_am setzt die App.
--   - Format ZEITERF.DAT und Nachtrag mit der Lohnbuchhaltung bestätigen.
--   - Mehrsprachige Rechtstexte: Wortlaut prüft der Fachanwalt.
-- =============================================================================
