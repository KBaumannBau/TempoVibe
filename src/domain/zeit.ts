import type { Person, Stempelung } from './types';
import { tx } from '../i18n';

const WOCHENTAG = [tx("Sonntag"), tx("Montag"), tx("Dienstag"), tx("Mittwoch"), tx("Donnerstag"), tx("Freitag"), tx("Samstag")];
const WT_KURZ = [tx("So"), tx("Mo"), tx("Di"), tx("Mi"), tx("Do"), tx("Fr"), tx("Sa")];

const zwei = (n: number) => String(n).padStart(2, '0');

/** Lokale Zeit als ISO 8601 mit Zeitzone, z. B. 2026-10-19T06:30:00+02:00 */
export function isoMitZone(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const a = Math.abs(off);
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}T${zwei(d.getHours())}:${zwei(d.getMinutes())}:${zwei(d.getSeconds())}${sign}${zwei(Math.floor(a / 60))}:${zwei(a % 60)}`;
}

export function datumKey(d: Date): string {
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

export function ausKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function plusTage(key: string, n: number): string {
  const d = ausKey(key);
  d.setDate(d.getDate() + n);
  return datumKey(d);
}

/** Ostersonntag (Gauß / Meeus) */
function ostern(j: number): Date {
  const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(j, monat - 1, tag);
}

const feiertagCache = new Map<number, Map<string, string>>();
/** Gesetzliche Feiertage in Bayern (inkl. Mariä Himmelfahrt, gilt für alle Baustellen) */
export function feiertage(jahr: number): Map<string, string> {
  const c = feiertagCache.get(jahr);
  if (c) return c;
  const o = datumKey(ostern(jahr));
  const m = new Map<string, string>([
    [`${jahr}-01-01`, tx("Neujahr")], [`${jahr}-01-06`, tx("Heilige Drei Könige")],
    [plusTage(o, -2), tx("Karfreitag")], [plusTage(o, 1), tx("Ostermontag")], [`${jahr}-05-01`, tx("Tag der Arbeit")],
    [plusTage(o, 39), tx("Christi Himmelfahrt")], [plusTage(o, 50), tx("Pfingstmontag")], [plusTage(o, 60), tx("Fronleichnam")],
    [`${jahr}-08-15`, tx("Mariä Himmelfahrt")], [`${jahr}-10-03`, tx("Tag der Deutschen Einheit")], [`${jahr}-11-01`, tx("Allerheiligen")],
    [`${jahr}-12-25`, tx("1. Weihnachtstag")], [`${jahr}-12-26`, tx("2. Weihnachtstag")],
  ]);
  feiertagCache.set(jahr, m);
  return m;
}
export const feiertag = (key: string) => feiertage(Number(key.slice(0, 4))).get(key);

export function istWerktag(key: string): boolean {
  const w = ausKey(key).getDay();
  return w >= 1 && w <= 5 && !feiertag(key);
}

/** Arbeitstage zwischen zwei Daten (beide eingeschlossen), ohne Wochenende und Feiertage */
export function arbeitstage(von: string, bis: string): number {
  let n = 0;
  for (let k = von; k <= bis; k = plusTage(k, 1)) if (istWerktag(k)) n++;
  return n;
}

/** n-ter Werktag vor (n<0) oder nach (n>0) dem Datum */
export function werktag(key: string, n: number): string {
  let k = key;
  let rest = Math.abs(n);
  const schritt = n < 0 ? -1 : 1;
  while (rest > 0) {
    k = plusTage(k, schritt);
    if (istWerktag(k)) rest--;
  }
  return k;
}

export function montagDerWoche(key: string): string {
  const w = ausKey(key).getDay();
  return plusTage(key, w === 0 ? -6 : 1 - w);
}

export function kw(key: string): number {
  const d = ausKey(key);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - tag);
  const jahrStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - jahrStart.getTime()) / 86400000 + 1) / 7);
}

export function wochentag(key: string): string {
  return WOCHENTAG[ausKey(key).getDay()];
}
export function wtKurz(key: string): string {
  return WT_KURZ[ausKey(key).getDay()];
}

/** „28.09.“ */
export function tm(key: string): string {
  const d = ausKey(key);
  return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.`;
}
/** „Montag, 28.09.“ */
export function tagLang(key: string): string {
  return `${wochentag(key)}, ${tm(key)}`;
}
/** „Montag, 28.09.2026“ */
export function tagLangJahr(key: string): string {
  return `${tagLang(key)}${ausKey(key).getFullYear()}`;
}

/** Uhrzeit HH:MM aus ISO-String */
export function uhr(iso: string): string {
  return iso.slice(11, 16);
}

/** ISO-Zeit aus Datum + HH:MM (lokale Zone) */
export function isoAus(key: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = ausKey(key);
  d.setHours(h, m, 0, 0);
  return isoMitZone(d);
}

/** „7,8 h“ – eine Nachkommastelle, deutsches Komma */
export function stunden(h: number, stellen = 1): string {
  const s = (Math.round(h * 10 ** stellen) / 10 ** stellen).toFixed(stellen).replace('.', ',');
  return `${s} h`;
}
export function vorzeichen(h: number): string {
  const s = stunden(Math.abs(h));
  return h > 0.04 ? `+${s}` : h < -0.04 ? `−${s}` : s;
}
export function euro(n: number): string {
  const s = Math.abs(Math.round(n)).toLocaleString(tx("de-DE"));
  return `${n < 0 ? '−' : ''}${s} €`;
}
export function euroAbw(n: number): string {
  return `${n > 0 ? '+' : ''}${euro(n)}`;
}
export function minText(min: number): string {
  return tx("{0} Min.", Math.round(min));
}
export function dauer(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${zwei(m)} h`;
}

export function sollFuer(p: Person, key: string): number {
  if (!istWerktag(key)) return 0;
  return ausKey(key).getDay() === 5 ? p.sollFr : p.sollMoDo;
}

export type Zustand = 'aus' | 'arbeit' | 'pause' | 'fertig';

export interface TagRechnung {
  gueltig: Stempelung[];
  beginn?: Stempelung;
  ende?: Stempelung;
  arbeitMin: number;
  pauseMin: number;
  /** alle Pausen; raucher = als Raucherpause gestempelt */
  pausen: { von: string; bis?: string; min: number; raucher?: boolean }[];
  /** Pausenblöcke ab 15 Min., die nach § 4 ArbZG als Ruhepause zählen */
  pauseGesetzlichMin: number;
  /** automatisch abgezogene Pause, weil die gesetzliche Pause fehlte (in pauseMin enthalten) */
  pauseAutoMin: number;
  zustand: Zustand;
  seit?: string; // ISO der letzten Stempelung
  hinweise: string[];
  /** Tag über 6 h ohne ausreichende Pause. Seit dem automatischen Abzug immer false, bleibt für alte Prüfungen. */
  pauseFehlt: boolean;
  /** Arbeitsminuten je Baustelle (Wechsel am selben Tag) */
  abschnitte: { baustelleId?: string; min: number }[];
  /** Nachtarbeit 20:00–05:00 in Minuten */
  nachtMin: number;
}

/** Minuten zwischen a und b, die zwischen 20:00 und 05:00 liegen */
function nachtAnteil(a: number, b: number): number {
  let n = 0;
  for (let t = a; t < b; t += 60000) {
    const h = new Date(t).getHours();
    if (h >= 20 || h < 5) n++;
  }
  return n;
}

const ms = (iso: string) => new Date(iso).getTime();

/**
 * Rechnet einen Tag aus seinen gültigen Stempelungen.
 * Pausenregel nach § 4 ArbZG: mehr als 6 h Arbeit mind. 30 Min., mehr als 9 h mind. 45 Min. Pause,
 * in Abschnitten von mindestens 15 Min. Fehlt am Ende des Tages Pause, wird sie automatisch
 * von der Arbeitszeit abgezogen, höchstens bis auf 6 h bzw. 9 h.
 */
export function rechneTag(alle: Stempelung[], jetzt: Date = new Date()): TagRechnung {
  const gueltig = alle.filter((s) => !s.ersetztDurch).sort((a, b) => ms(a.zeit) - ms(b.zeit));
  let arbeitMin = 0;
  let pauseMin = 0;
  const pausen: TagRechnung['pausen'] = [];
  let zustand: Zustand = 'aus';
  let marke: number | null = null;
  let pauseStart: Stempelung | null = null;
  let bs: string | undefined;
  let nachtMin = 0;
  const abschnitte: TagRechnung['abschnitte'] = [];
  const buche = (bis: number) => {
    if (marke === null) return;
    const m = (bis - marke) / 60000;
    arbeitMin += m;
    nachtMin += nachtAnteil(marke, bis);
    const a = abschnitte.find((x) => x.baustelleId === bs);
    if (a) a.min += m;
    else abschnitte.push({ baustelleId: bs, min: m });
  };
  for (const s of gueltig) {
    const t = ms(s.zeit);
    if (s.art === 'wechsel') {
      buche(t);
      bs = s.baustelleId;
      if (zustand === 'arbeit') marke = t;
      continue;
    }
    if (s.art === 'beginn' || s.art === 'weiter') {
      if (s.baustelleId) bs = s.baustelleId;
      if (pauseStart) {
        const m = (t - ms(pauseStart.zeit)) / 60000;
        pauseMin += m;
        pausen.push({ von: uhr(pauseStart.zeit), bis: uhr(s.zeit), min: m, raucher: pauseStart.raucher });
        pauseStart = null;
      }
      marke = t;
      zustand = 'arbeit';
    } else if (s.art === 'pause') {
      buche(t);
      marke = null;
      pauseStart = s;
      zustand = 'pause';
    } else if (s.art === 'ende') {
      buche(t);
      if (pauseStart) {
        const m = (t - ms(pauseStart.zeit)) / 60000;
        pauseMin += m;
        pausen.push({ von: uhr(pauseStart.zeit), bis: uhr(s.zeit), min: m, raucher: pauseStart.raucher });
        pauseStart = null;
      }
      marke = null;
      zustand = 'fertig';
    }
  }
  // läuft noch: bis jetzt zählen
  if (zustand === 'arbeit' && marke !== null && jetzt.getTime() > marke) buche(jetzt.getTime());
  if (zustand === 'pause' && pauseStart) {
    const m = Math.max(0, (jetzt.getTime() - ms(pauseStart.zeit)) / 60000);
    pauseMin += m;
    pausen.push({ von: uhr(pauseStart.zeit), min: m, raucher: pauseStart.raucher });
  }

  const hinweise: string[] = [];
  // Ruhepause nach § 4 ArbZG: nur Blöcke ab 15 Min. zählen
  const pauseGesetzlichMin = pausen.filter((p) => p.min >= 15).reduce((x, p) => x + p.min, 0);
  // fehlende Pause am Ende des Tages automatisch abziehen
  let pauseAutoMin = 0;
  if (zustand === 'fertig') {
    if (arbeitMin > 360 && pauseGesetzlichMin < 30) pauseAutoMin = Math.min(30 - pauseGesetzlichMin, arbeitMin - 360);
    const rest = arbeitMin - pauseAutoMin;
    const bisher = pauseGesetzlichMin + pauseAutoMin;
    if (rest > 540 && bisher < 45) pauseAutoMin += Math.min(45 - bisher, rest - 540);
    pauseAutoMin = Math.round(pauseAutoMin);
  }
  if (pauseAutoMin > 0) {
    arbeitMin -= pauseAutoMin;
    pauseMin += pauseAutoMin;
    // vom größten Abschnitt (Baustelle) abziehen
    const gr = [...abschnitte].sort((a, b) => b.min - a.min)[0];
    if (gr) gr.min -= pauseAutoMin;
    hinweise.push(tx("Gesetzliche Pause fehlte: {0} Min. automatisch abgezogen", pauseAutoMin));
  }
  const raucherMin = pausen.filter((p) => p.raucher).reduce((x, p) => x + p.min, 0);
  if (zustand === 'fertig' && raucherMin > 0) hinweise.push(tx("Raucherpausen: {0} Min.", Math.round(raucherMin)));
  const pauseFehlt = false;
  for (const s of gueltig) {
    if (s.standort === 'weicht_ab') hinweise.push(tx("{0}: Standort ca. {1} m entfernt", artName(s.art), s.entfernungM ?? '?'));
    if (s.vonHandGewaehlt) hinweise.push(tx("Baustelle von Hand gewählt"));
    if (s.art === 'wechsel') hinweise.push(tx("Baustellenwechsel am Tag"));
    if (s.herkunft === 'nachgetragen') hinweise.push(tx("Nachgetragen"));
    if (s.herkunft === 'nachgesendet') hinweise.push(tx("Nachgesendet (kein Netz)"));
    if (Math.abs(ms(s.eingang) - ms(s.zeit)) >= 5 * 60000 && s.herkunft === 'gestempelt') hinweise.push(tx("Handy-Uhr weicht ab"));
  }
  const last = gueltig[gueltig.length - 1];
  return {
    gueltig,
    beginn: gueltig.find((s) => s.art === 'beginn'),
    ende: [...gueltig].reverse().find((s) => s.art === 'ende'),
    arbeitMin,
    pauseMin,
    pausen,
    pauseGesetzlichMin,
    pauseAutoMin,
    zustand,
    seit: last?.zeit,
    hinweise: [...new Set(hinweise)],
    pauseFehlt,
    abschnitte,
    nachtMin,
  };
}

export function artName(a: Stempelung['art']): string {
  return { beginn: tx("Beginn"), pause: tx("Pause"), weiter: tx("Weiter"), wechsel: tx("Wechsel"), ende: tx("Ende") }[a];
}

export const MONATE = [tx("Januar"), tx("Februar"), tx("März"), tx("April"), tx("Mai"), tx("Juni"), tx("Juli"), tx("August"), tx("September"), tx("Oktober"), tx("November"), tx("Dezember")];
/** „November 2026“ aus YYYY-MM */
export function monatName(m: string): string {
  return `${MONATE[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
}
export const monatVon = (key: string) => key.slice(0, 7);
export function monatPlus(m: string, n: number): string {
  const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1);
  return datumKey(d).slice(0, 7);
}
/** alle Tage eines Monats */
export function tageImMonat(m: string): string[] {
  const out: string[] = [];
  for (let k = `${m}-01`; k.startsWith(m); k = plusTage(k, 1)) out.push(k);
  return out;
}
/** „28.09.2026“ */
export function tmj(key: string): string {
  return `${tm(key)}${key.slice(0, 4)}`;
}
export const istWinterzeit = (key: string) => { const m = Number(key.slice(5, 7)); return m === 12 || m <= 3; };
/** Euro mit zwei Nachkommastellen */
export function euro2(n: number): string {
  return `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString(tx("de-DE"), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
