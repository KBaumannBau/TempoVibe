// Datenmodell der Stundenerfassung (angelehnt an das Datenbankkonzept V2).
// Grundsatz: Nichts wird überschrieben. Korrekturen sind neue Einträge,
// das Original bleibt erhalten und verweist auf seinen Ersatz.

export type Rolle =
  | 'facharbeiter' | 'helfer' | 'vorarbeiter' | 'polier' | 'bauleitung'
  // Büro und Leitung (PC)
  | 'buero' | 'oberbauleitung' | 'einkauf' | 'gl' | 'admin'
  // Person eines Nachunternehmers mit eigener App
  | 'nu';
export type Gruppe = 'gewerblich' | 'angestellt' | 'azubi';
export type Zugang = 'aktiv' | 'eingeladen' | 'gesperrt' | 'ohne';

export interface Person {
  id: string;
  vorname: string;
  nachname: string;
  rolle: Rolle;
  gruppe: Gruppe;
  /** false = erfasst ohne Handy (Polier trägt ein, Bestätigung mit PIN) */
  nutztApp: boolean;
  /** Tages-Soll in Stunden (Sommer Mo–Do 8,5 h, Fr 7 h für Gewerbliche) */
  sollMoDo: number;
  sollFr: number;
  pin: string;
  urlaubAnspruch: number;
  urlaubGenommen: number;
  /** SIKOFlex (gewerblich) bzw. Mehrstunden (angestellt), Stand vor den Demo-Tagen */
  kontoStart: number;
  persNr: string;
  eintritt: string;
  austritt?: string;
  email?: string;
  handy?: string;
  zugang: Zugang;
  /** Registrierungsbrief per Post mit Einmal-Passwort (echt: nur als Hash, gilt 14 Tage und nur einmal) */
  brief?: { passwort: string; erstellt: string; gueltigBis: string };
  /** Demo: eigenes Passwort für die App (echt: nur als Hash auf dem Server). Ohne Eintrag gilt das Demo-Passwort. */
  passwort?: string;
  /** nur Geburtsmonat/-jahr (MM/JJJJ), kein Name */
  kinder: string[];
  alleinerziehend?: boolean;
  unter18?: boolean;
  /** abweichende Wochenarbeitszeit (Teilzeit, Angestellte) */
  wochenStunden?: number;
  /** NU-Person: Firma und Stundensatz (nur Einkauf und Geschäftsleitung) */
  firmaId?: string;
  stundensatz?: number;
  taetigkeit?: string;
  ausweis?: { art: string; bis: string; staat: string; gesehenVon: string; am: string };
  a1Bis?: string;
  /** Mindestlohnerklärung je Monat (YYYY-MM) */
  mindestlohn?: Record<string, 'unterschrieben' | 'offen' | 'erinnert'>;
  /** Einführung in der App gesehen */
  introGesehen?: boolean;
  /** gewählte Sprache der App (Standard Deutsch) */
  sprache?: 'de' | 'pl' | 'ro' | 'hr' | 'en' | 'fr' | 'it';
}

export interface Baustelle {
  id: string;
  kst: string;
  strasse: string;
  plzOrt: string;
  massnahme?: string;
  archiviert?: string;
  polierId?: string;
  bauleitungId: string;
  stundenSoll: number;
  /** Stunden aus Monaten vor den Demo-Daten */
  stundenIstVorher: number;
  /** Soll bis heute (zeitanteilig), für die Ampel */
  stundenSollBisHeute: number;
  kosten: { art: 'Lohn' | 'Material' | 'Geräte'; soll: number; ist: number }[];
  /** Gesamt inkl. Nachunternehmer; NU wird nie einzeln gezeigt */
  gesamtSoll: number;
  gesamtIst: number;
  ortung: boolean;
  /** Ursprungs-Soll aus der Auftragskalkulation (Projektkosten) */
  ursprungsSoll?: Kosten4;
  kostenMonate?: KostenMonat[];
  rechnungen?: Rechnung[];
}

export interface Kosten4 { lohn: number; material: number; geraete: number; nu: number }
export interface KostenMonat extends Kosten4 {
  monat: string; // YYYY-MM
  status: 'abgeschlossen' | 'wartet' | 'laeuft';
}
export interface Rechnung {
  id: string;
  monat: string;
  gebucht: string;
  firma: string;
  nr: string;
  leistung: string;
  art: 'material' | 'geraete' | 'nu';
  betrag: number;
  von: string;
  nachbuchung?: boolean;
}

export type StempelArt = 'beginn' | 'pause' | 'weiter' | 'wechsel' | 'ende';
export type Standort = 'passt' | 'weicht_ab' | 'ohne';
export type Herkunft = 'gestempelt' | 'nachgesendet' | 'nachgetragen' | 'polier_ohne_handy' | 'korrektur';

export interface Stempelung {
  id: string;
  personId: string;
  datum: string; // YYYY-MM-DD, Tag des Beginns (auch über Mitternacht)
  art: StempelArt;
  /** Handy-Uhrzeit beim Tippen, ISO 8601 mit Zeitzone */
  zeit: string;
  /** Eingang am Server (hier: Zeitpunkt der Speicherung) */
  eingang: string;
  baustelleId?: string;
  standort: Standort;
  entfernungM?: number;
  begruendung?: string;
  vonHandGewaehlt?: boolean;
  herkunft: Herkunft;
  erfasstVon: string;
  /** gesetzt, wenn eine Korrektur diesen Eintrag ersetzt */
  ersetztDurch?: string;
}

export type TagStatus =
  | 'offen' // Mitarbeiter arbeitet noch / hat nicht gesendet
  | 'beim_polier'
  | 'zurueck_polier' // von der Bauleitung zurückgeschickt
  | 'bei_bauleitung'
  | 'freigegeben'; // an die Lohnbuchhaltung

export type ZuschlagEntscheidung = 'offen' | 'ok' | 'kurz' | 'weg';

export interface ZuschlagEintrag {
  id: string;
  art: string; // Schlüssel aus dem Zuschlagskatalog
  typ?: string;
  stunden: number;
  entscheidung: ZuschlagEntscheidung;
  stundenGekuerzt?: number;
}

export interface Korrektur {
  id: string;
  von: string;
  zeit: string;
  was: string; // lesbar, z. B. „Ende 15:45 → 15:30“
  grund: string;
  antwort?: 'bestaetigt' | 'widerspruch';
  antwortText?: string;
  /** Entscheidung der Bauleitung bei Widerspruch */
  entscheidung?: 'bleibt' | 'original';
  /** keine Antwort bis zur Frist: Polier hat „ohne Rückmeldung“ entschieden */
  ohneRueckmeldung?: string;
  /** betroffene Stempelungen: alt → neu */
  altId?: string;
  neuId?: string;
}

export interface Tag {
  id: string; // personId + datum
  personId: string;
  datum: string;
  status: TagStatus;
  zuschlaege: ZuschlagEintrag[];
  wegezeitMin: number;
  verpflegung: boolean;
  uebernachtung: boolean;
  korrekturen: Korrektur[];
  pauseBegruendung?: string;
  zurueckGrund?: string;
  bestaetigtMitPin?: boolean;
  polierFreigabeVon?: string;
  bauleitungFreigabeVon?: string;
  /** Baustellenwechsel: jeder zuständige Polier bzw. Bauleiter gibt frei (Personen-IDs) */
  polierOk?: string[];
  bauleitungOk?: string[];
  /** vom Polier nachgetragen (Handy verloren): der Mitarbeiter muss bestätigen */
  nachgetragenVon?: string;
  /** nach Übernahme oder Export geändert: Lohnbuchhaltung muss nacharbeiten */
  geaendertNachUebernahme?: { am: string; was: string };
  /** nur Bauleitung/Angestellte: an Oberbauleitung gesendet */
  anOberbauleitung?: boolean;
  /** Übernahme durch Personal / HR / Lohn (Datum) */
  uebernommen?: string;
  /** in diesem Export an die Lohnabrechnung enthalten */
  exportId?: string;
  lohnInfo?: string;
}

export interface Vergessen {
  id: string;
  personId: string;
  datum: string;
  art: 'beginn' | 'ende' | 'pause';
  von: string; // HH:MM
  bis?: string; // nur Pause
  gemeldet: string;
  status: 'offen' | 'uebernommen' | 'abgelehnt';
}

export type AntragArt = 'urlaub' | 'konto' | 'krank' | 'arbeitsbefreiung' | 'betriebsurlaub';
export interface Antrag {
  id: string;
  personId: string;
  art: AntragArt;
  von: string;
  bis: string;
  tage: number;
  stunden?: number;
  wer?: 'ich' | 'kind';
  gestellt: string;
  /** offen = liegt bei der Oberbauleitung; bauleitung_ok = Oberbauleitung ok, Urlaub liegt bei der Geschäftsleitung */
  status: 'offen' | 'bauleitung_ok' | 'abgelehnt' | 'genehmigt' | 'gemeldet';
  /** wer die erste Stufe entschieden hat (Oberbauleitung) */
  oblVon?: string;
  ablehnGrund?: string;
  /** Arbeitsbefreiung: Anlass; Nachweis */
  anlass?: string;
  nachweis?: 'fehlt' | 'hochgeladen' | 'gesehen';
  /** nach Ablauf der Nachfrist: Wahl des Mitarbeiters */
  ersatz?: 'urlaub' | 'unbezahlt' | 'konto';
  erinnert?: string;
  quelle?: 'app' | 'hand' | 'polier';
  notiz?: string;
  /** Krankmeldung: Rückmeldung vor dem Ende */
  rueckmeldung?: 'gesund' | 'weiter';
  /** Urlaub: zweite Stufe durch die Geschäftsleitung */
  glVon?: string;
}

export interface HelferEintrag {
  id: string;
  baustelleId: string;
  datum: string;
  firma: string; // 'eigen' oder Firmenname
  nu: boolean;
  name: string;
  von: string;
  bis: string;
  pauseMin: number;
  taetigkeit: string;
  warnung?: string;
  gegengezeichnet?: boolean;
}

export interface Ausfall {
  id: string;
  baustelleId: string;
  datum: string;
  art: 'Schlechtwetter' | 'Anderer Ausfall';
  ab: string;
  personIds: string[];
  von: string;
}

export interface Nachtrag {
  id: string;
  baustelleId: string;
  nr: string;
  bezeichnung: string;
  datum: string;
  status: 'angeboten' | 'beauftragt' | 'abgelehnt';
  lohn: number;
  material: number;
  geraete: number;
  nu: number;
  stunden: number;
}

/** Helfer und Lohnleister ohne App laut Disposition (Vorschlag für den Polier) */
export interface HelferDispo {
  baustelleId: string;
  firma: string;
  nu: boolean;
  name: string;
  taetigkeit: string;
  warnung?: string;
}

export interface Einteilung {
  personId: string;
  datum: string;
  baustelleId: string;
  /** nur halber Tag (Wechsel am selben Tag) */
  haelfte?: 'vm' | 'nm';
  /** in der Disposition geändert, noch nicht gesendet */
  geaendert?: boolean;
}

export interface Geraet {
  id: string;
  personId: string;
  name: string;
  seit: string;
  zuletzt: string;
  aktiv: boolean;
  diesesHandy: boolean;
}

export interface Firma {
  id: string;
  name: string;
  kontakt: string;
  mail: string;
  adresse: string;
  tel: string;
  zugang: boolean;
  unterlagen: { name: string; status: 'gueltig' | 'abgelaufen' | 'fehlt' | 'pruefen'; bis?: string; erinnert?: string }[];
}

export interface Export {
  id: string;
  monat: string;
  erstellt: string;
  von: string;
  zeilen: string[];
  tagIds: string[];
  nachtrag: boolean;
}

export interface MehrBuchung {
  id: string;
  personId: string;
  datum: string;
  art: 'auszahlung' | 'frei';
  stunden: number;
  monat?: string;
  von?: string;
  bis?: string;
  bem: string;
  erfasstVon: string;
}

export interface Betriebsurlaub {
  von: string;
  bis: string;
  festgelegt?: string;
  /** Wahl 24./31.12. und Zustimmung zum Kontoabzug je Person */
  wahl: Record<string, { d24: 'frei' | 'konto' | 'urlaub'; d31: 'frei' | 'konto' | 'urlaub'; zustimmung?: boolean; gespeichert?: string }>;
}

export interface Nachricht {
  id: string;
  von: string;
  zeit: string;
  text: string;
  baustelleId?: string;
  erledigt?: boolean;
}

export interface GeraetPool { id: string; name: string }
export interface GeraetEinteilung { geraetId: string; datum: string; baustelleId: string }

export interface RolleJeBaustelle { personId: string; baustelleId: string; rolle: 'bauleitung' | 'polier' | 'vorarbeiter' }

export interface ProtokollEintrag {
  zeit: string;
  wer: string;
  was: string;
  warum?: string;
}

export interface Daten {
  version: number;
  heute: string;
  personen: Person[];
  baustellen: Baustelle[];
  einteilung: Einteilung[];
  stempelungen: Stempelung[];
  tage: Tag[];
  vergessen: Vergessen[];
  antraege: Antrag[];
  helfer: HelferEintrag[];
  helferDispo: HelferDispo[];
  ausfaelle: Ausfall[];
  nachtraege: Nachtrag[];
  geraete: Geraet[];
  protokoll: ProtokollEintrag[];
  /** Demo: wie der nächste Standortvergleich ausgeht */
  demoStandort: Standort;

  // ---- Büro, Leitung, Nachunternehmer (Komplett-Version nach V1) ----
  firmen: Firma[];
  exporte: Export[];
  nachtMail: Record<string, string>; // Monat → versendet am
  mehrBuchungen: MehrBuchung[];
  betriebsurlaub: Betriebsurlaub;
  nachrichten: Nachricht[];
  geraetePool: GeraetPool[];
  geraeteEinteilung: GeraetEinteilung[];
  rollenJeBaustelle: RolleJeBaustelle[];
  /** Mittellohn der Firma je Monat (€/h) */
  mittellohn: Record<string, number>;
  /** Vertretung des Lohnbüros durch die Buchhaltung */
  vertretung: { aktiv: boolean; von?: string; bis?: string };
  /** von der Geschäftsleitung festgelegt: entscheidet alle Anträge und gibt die Tage der Bauleiter frei */
  oberbauleitungId: string;
  /** technisches Protokoll (Anmeldungen, Rechte) */
  techLog: ProtokollEintrag[];
  /** Mitteilungen an Personen (Push in der App) */
  mitteilungen: { id: string; personId: string; zeit: string; titel: string; text: string; link?: string; gelesen?: boolean }[];
}
