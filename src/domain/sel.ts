// Lese-Funktionen auf den Daten. Sie ändern nichts.

import type { Baustelle, Daten, Person, Rolle, Tag } from './types';
import { plusTage, rechneTag, sollFuer, werktag } from './zeit';
import { geltendeStunden } from './zuschlaege';
import { tx } from '../i18n';

export const person = (d: Daten, id: string): Person => d.personen.find((p) => p.id === id)!;
export const voll = (p: Person) => `${p.vorname} ${p.nachname}`.trim();
/** „Brandl, Stefan“ */
export const nameKomma = (p: Person) => (p.nachname ? `${p.nachname}, ${p.vorname}` : p.vorname);
export const baustelle = (d: Daten, id?: string): Baustelle | undefined => d.baustellen.find((b) => b.id === id);
export const bsName = (b?: Baustelle) => (b ? `${b.kst} ${b.strasse}` : tx("ohne Baustelle"));
export const bsLang = (b?: Baustelle) => (b ? `${b.kst} - ${b.strasse}, ${b.plzOrt}` : tx("ohne Baustelle"));

export const istPolier = (p: Person) => p.rolle === 'polier';
/** Vorarbeiter, der auf mindestens einer aktiven Baustelle als Polier eingetragen ist (z. B. Kleinauftrag) */
export const vorarbeiterAlsPolier = (d: Daten, p: Person) => p.rolle === 'vorarbeiter' && d.baustellen.some((b) => b.polierId === p.id && !b.archiviert);
/**
 * Rolle für Oberfläche und Rechte: Ein Vorarbeiter, der eine Baustelle verantwortet, nutzt die Polier-Oberfläche.
 * Für Lohn und Zuschläge gilt weiter die echte Rolle (p.rolle).
 */
export const appRolle = (d: Daten, p: Person): Rolle => (vorarbeiterAlsPolier(d, p) ? 'polier' : p.rolle);
export const istBauleitung = (p: Person) => p.rolle === 'bauleitung';
/** Erschwerniszuschläge gibt es nur für gewerbliche Arbeitnehmer, nicht für Poliere */
export const hatZuschlaege = (p: Person) => p.gruppe === 'gewerblich' && p.rolle !== 'polier';
export const hatOrtung = (p: Person) => p.gruppe !== 'angestellt';

export function einteilungAm(d: Daten, personId: string, datum: string) {
  const e = d.einteilung.find((x) => x.personId === personId && x.datum === datum);
  return e ? baustelle(d, e.baustelleId) : undefined;
}

export const stempelungenVon = (d: Daten, personId: string, datum: string) =>
  d.stempelungen.filter((s) => s.personId === personId && s.datum === datum);

export const tagVon = (d: Daten, personId: string, datum: string): Tag | undefined =>
  d.tage.find((t) => t.personId === personId && t.datum === datum);

export function rechnung(d: Daten, personId: string, datum: string) {
  return rechneTag(stempelungenVon(d, personId, datum));
}

/** Baustelle eines Tages: aus der ersten Stempelung, sonst aus der Einteilung */
export function baustelleVonTag(d: Daten, personId: string, datum: string) {
  const s = stempelungenVon(d, personId, datum).find((x) => x.baustelleId);
  return baustelle(d, s?.baustelleId) ?? einteilungAm(d, personId, datum);
}

export const baustellenVonPolier = (d: Daten, polierId: string) => d.baustellen.filter((b) => b.polierId === polierId);
export const baustellenVonBauleitung = (d: Daten, blId: string) => d.baustellen.filter((b) => b.bauleitungId === blId && b.stundenSoll > 0);

/** Alle Baustellen eines Tages in der Reihenfolge der Arbeit (Baustellenwechsel), sonst laut Einteilung */
export function baustellenVonTagAlle(d: Daten, personId: string, datum: string): Baustelle[] {
  const r = rechnung(d, personId, datum);
  const ids = r.abschnitte.filter((x) => x.baustelleId && x.min > 0).map((x) => x.baustelleId!);
  const liste = [...new Set(ids)].map((id) => baustelle(d, id)).filter((b): b is Baustelle => !!b);
  if (liste.length) return liste;
  const b = baustelleVonTag(d, personId, datum);
  return b ? [b] : [];
}

/** Stunden je Baustelle eines Tages */
export function stundenJeBaustelle(d: Daten, personId: string, datum: string) {
  return rechnung(d, personId, datum).abschnitte.filter((x) => x.min > 0).map((x) => ({ baustelle: baustelle(d, x.baustelleId), stunden: x.min / 60 }));
}

/** Poliere, die diesen Tag freigeben müssen: je Baustelle des Tages, nie die Person selbst.
 *  Wer erfasst oder nachträgt, gibt nicht frei. */
export function noetigePoliere(d: Daten, t: Tag): string[] {
  return [...new Set(baustellenVonTagAlle(d, t.personId, t.datum).map((b) => b.polierId).filter((id): id is string => !!id && id !== t.personId))];
}
/** Bauleiter, die diesen Tag freigeben müssen (je Baustelle, nie die Person selbst) */
export function noetigeBauleitung(d: Daten, t: Tag): string[] {
  return [...new Set(baustellenVonTagAlle(d, t.personId, t.datum).map((b) => b.bauleitungId).filter((id) => !!id && id !== t.personId))];
}

/** Korrekturen, auf die der Mitarbeiter noch nicht geantwortet hat */
export const offeneKorrekturen = (t: Tag) => t.korrekturen.filter((k) => !k.antwort && !k.ohneRueckmeldung);
/** Ab wann der Polier ohne Rückmeldung entscheiden darf: einen Werktag nach der Korrektur (Erinnerung) */
export const fristRueckmeldung = (k: Tag['korrekturen'][number]) => werktag(k.zeit.slice(0, 10), 1);
/** Offene Widersprüche, die die Bauleitung noch entscheiden muss */
export const offeneWidersprueche = (t: Tag) => t.korrekturen.filter((k) => k.antwort === 'widerspruch' && !k.entscheidung);

/** Muss dieser Polier den Tag noch freigeben? */
export function wartetAufPolier(d: Daten, t: Tag, polierId: string) {
  return (t.status === 'beim_polier' || t.status === 'zurueck_polier') && !(t.polierOk ?? []).includes(polierId) && noetigePoliere(d, t).includes(polierId);
}
/** Muss dieser Bauleiter den Tag noch freigeben? */
export function wartetAufBauleitung(d: Daten, t: Tag, blId: string) {
  return t.status === 'bei_bauleitung' && !t.anOberbauleitung && !(t.bauleitungOk ?? []).includes(blId) && noetigeBauleitung(d, t).includes(blId);
}

/** Tage, die beim Polier zur Freigabe liegen, gruppiert nach seiner Baustelle */
export function tageBeimPolier(d: Daten, polierId: string) {
  const offen = d.tage.filter((t) => wartetAufPolier(d, t, polierId));
  return baustellenVonPolier(d, polierId).map((b) => ({
    baustelle: b,
    tage: offen.filter((t) => baustellenVonTagAlle(d, t.personId, t.datum).find((x) => x.polierId === polierId)?.id === b.id),
  }));
}

/** Tage bei der Bauleitung, gruppiert nach ihrer Baustelle (auch Lager und Baustellen ohne Soll) */
export function tageBeiBauleitung(d: Daten, blId: string) {
  const offen = d.tage.filter((t) => wartetAufBauleitung(d, t, blId));
  return d.baustellen.filter((b) => b.bauleitungId === blId).map((b) => ({
    baustelle: b,
    tage: offen.filter((t) => baustellenVonTagAlle(d, t.personId, t.datum).find((x) => x.bauleitungId === blId)?.id === b.id),
  }));
}

/** Hinweise eines Tages für Polier und Bauleitung */
export function hinweiseTag(d: Daten, t: Tag): string[] {
  const r = rechnung(d, t.personId, t.datum);
  const h = [...r.hinweise];
  if (t.korrekturen.length) h.unshift(tx("Korrigiert: {0}", t.korrekturen.map((k) => k.was).join(', ')));
  if (t.zuschlaege.some((z) => z.entscheidung === 'kurz' || z.entscheidung === 'weg')) h.push(tx("Zuschlag gekürzt oder gestrichen"));
  if (t.bestaetigtMitPin) h.push(tx("Ohne Handy, mit PIN bestätigt"));
  if (t.status === 'zurueck_polier' && t.zurueckGrund) h.unshift(tx("Zurück von der Bauleitung: {0}", t.zurueckGrund));
  if (t.pauseBegruendung) h.push(tx("Pause begründet: „{0}“", t.pauseBegruendung));
  const offenK = offeneKorrekturen(t);
  if (offenK.length) h.unshift(tx("Wartet auf Antwort von {0} zur Korrektur", person(d, t.personId).vorname));
  if (t.korrekturen.some((k) => k.ohneRueckmeldung)) h.push(tx("Korrektur ohne Rückmeldung des Mitarbeiters"));
  if (offeneWidersprueche(t).length) h.unshift(tx("Widerspruch gegen Korrektur offen"));
  const jeBs = stundenJeBaustelle(d, t.personId, t.datum);
  if (jeBs.length > 1) h.push(tx("Baustellenwechsel: {0}", jeBs.map((x) => `${x.baustelle?.kst ?? '–'} ${x.stunden.toFixed(1).replace('.', ',')} h`).join(' · ')));
  if (t.nachgetragenVon) h.push(tx("Nachgetragen von {0}, vom Mitarbeiter bestätigt", voll(person(d, t.nachgetragenVon))));
  return [...new Set(h)];
}

/** Gearbeitete Stunden des Tages */
export const stundenTag = (d: Daten, personId: string, datum: string) => rechnung(d, personId, datum).arbeitMin / 60;

/** Konto (SIKOFlex bzw. Mehrstunden): Start + (Ist − Soll) aller gesendeten Demo-Tage */
export function kontoStand(d: Daten, personId: string, nurFreigegeben = false): number {
  const p = person(d, personId);
  let k = p.kontoStart;
  for (const t of d.tage) {
    if (t.personId !== personId || t.status === 'offen') continue;
    if (nurFreigegeben && t.status !== 'freigegeben') continue;
    k += stundenTag(d, personId, t.datum) - sollFuer(p, t.datum);
  }
  return k;
}

export function urlaubRest(d: Daten, personId: string): { rest: number; verplant: number } {
  const p = person(d, personId);
  const verplant = d.antraege
    .filter((a) => a.personId === personId && a.art === 'urlaub' && a.status !== 'abgelehnt')
    .reduce((s, a) => s + a.tage, 0);
  return { rest: p.urlaubAnspruch - p.urlaubGenommen - verplant, verplant };
}

/** Ist-Stunden einer Baustelle: Vorlauf + alle gesendeten Tage + gegengezeichnete eigene Helfer */
export function stundenIstBaustelle(d: Daten, b: Baustelle): number {
  let h = b.stundenIstVorher;
  for (const t of d.tage) {
    if (t.status === 'offen') continue;
    if (baustelleVonTag(d, t.personId, t.datum)?.id === b.id) h += stundenTag(d, t.personId, t.datum);
  }
  return h;
}

export function nachtragSumme(n: { lohn: number; material: number; geraete: number; nu: number }) {
  return n.lohn + n.material + n.geraete + n.nu;
}

export const zuschlagStunden = (t: Tag) => t.zuschlaege.reduce((s, z) => s + geltendeStunden(z), 0);

/** Wer ist an einem Tag abwesend (Urlaub genehmigt / krank)? Gibt nur „abwesend bis“ heraus, nie den Grund */
export function abwesendBis(d: Daten, personId: string, datum: string): string | undefined {
  const a = d.antraege.find(
    (x) => x.personId === personId && x.von <= datum && x.bis >= datum &&
      (x.status === 'gemeldet' || x.status === 'genehmigt' || x.status === 'bauleitung_ok'),
  );
  return a?.bis;
}

export function helferStunden(h: { von: string; bis: string; pauseMin: number }) {
  const [a, b] = [h.von, h.bis].map((x) => {
    const [hh, mm] = x.split(':').map(Number);
    return hh * 60 + mm;
  });
  const pause = Math.max(0, h.pauseMin);
  const netto = Math.max(0, b - a - pause);
  // fehlende gesetzliche Pause (§ 4 ArbZG) automatisch abziehen, wie in rechneTag:
  // mehr als 6 h → 30 Min., mehr als 9 h → 45 Min., nie unter 6 h bzw. 9 h
  let auto = 0;
  if (netto > 360 && pause < 30) auto = Math.min(30 - pause, netto - 360);
  const rest = netto - auto;
  const bisher = pause + auto;
  if (rest > 540 && bisher < 45) auto += Math.min(45 - bisher, rest - 540);
  return (netto - auto) / 60;
}

/** Anträge der Leute auf den Baustellen eines Bauleiters (nur zur Info; entscheidet die Oberbauleitung) */
export function antraegeFuerBauleitung(d: Daten, blId: string) {
  const meine = d.baustellen.filter((b) => b.bauleitungId === blId).map((b) => b.id);
  const ab = plusTage(d.heute, -14);
  return d.antraege.filter((a) => a.art !== 'krank' && a.personId !== blId && person(d, a.personId)?.rolle !== 'nu' &&
    d.einteilung.some((e) => e.personId === a.personId && meine.includes(e.baustelleId) && e.datum >= ab && e.datum <= a.bis));
}

/** Baustellen, zu denen eine Meldung „Stempeln vergessen“ gehört (Einteilung oder Stempelungen des Tages) */
function baustellenDerMeldung(d: Daten, v: Daten['vergessen'][number]): Baustelle[] {
  const ids = new Set(d.einteilung.filter((e) => e.personId === v.personId && e.datum === v.datum).map((e) => e.baustelleId));
  for (const b of baustellenVonTagAlle(d, v.personId, v.datum)) ids.add(b.id);
  return [...ids].map((id) => baustelle(d, id)).filter((b): b is Baustelle => !!b);
}
/** Meldungen „Stempeln vergessen“ beim Polier: nie die eigene */
export function vorschlaegeFuerPolier(d: Daten, polierId: string) {
  return d.vergessen.filter((v) => v.status === 'offen' && v.personId !== polierId && baustellenDerMeldung(d, v).some((b) => b.polierId === polierId));
}
/** Meldungen bei der Bauleitung: die der Poliere selbst und die von Baustellen ohne Polier (z. B. Lager) */
export function vorschlaegeFuerBauleitung(d: Daten, blId: string) {
  return d.vergessen.filter((v) => {
    if (v.status !== 'offen' || v.personId === blId) return false;
    const bs = baustellenDerMeldung(d, v).filter((b) => b.bauleitungId === blId);
    return bs.some((b) => !b.polierId || b.polierId === v.personId);
  });
}
