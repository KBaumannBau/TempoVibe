// Lese-Funktionen auf den Daten. Sie ändern nichts.

import type { Baustelle, Daten, Person, Tag } from './types';
import { rechneTag, sollFuer } from './zeit';
import { geltendeStunden } from './zuschlaege';

export const person = (d: Daten, id: string): Person => d.personen.find((p) => p.id === id)!;
export const voll = (p: Person) => `${p.vorname} ${p.nachname}`.trim();
/** „Brandl, Stefan“ */
export const nameKomma = (p: Person) => (p.nachname ? `${p.nachname}, ${p.vorname}` : p.vorname);
export const baustelle = (d: Daten, id?: string): Baustelle | undefined => d.baustellen.find((b) => b.id === id);
export const bsName = (b?: Baustelle) => (b ? `${b.kst} ${b.strasse}` : 'ohne Baustelle');
export const bsLang = (b?: Baustelle) => (b ? `${b.kst} - ${b.strasse}, ${b.plzOrt}` : 'ohne Baustelle');

export const istPolier = (p: Person) => p.rolle === 'polier';
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

/** Tage, die beim Polier zur Freigabe liegen, gruppiert nach Baustelle */
export function tageBeimPolier(d: Daten, polierId: string) {
  return baustellenVonPolier(d, polierId).map((b) => ({
    baustelle: b,
    tage: d.tage.filter(
      (t) => (t.status === 'beim_polier' || t.status === 'zurueck_polier') && baustelleVonTag(d, t.personId, t.datum)?.id === b.id,
    ),
  }));
}

export function tageBeiBauleitung(d: Daten, blId: string) {
  return baustellenVonBauleitung(d, blId).map((b) => ({
    baustelle: b,
    tage: d.tage.filter((t) => t.status === 'bei_bauleitung' && baustelleVonTag(d, t.personId, t.datum)?.id === b.id),
  }));
}

/** Hinweise eines Tages für Polier und Bauleitung */
export function hinweiseTag(d: Daten, t: Tag): string[] {
  const r = rechnung(d, t.personId, t.datum);
  const h = [...r.hinweise];
  if (t.korrekturen.length) h.unshift(`Korrigiert: ${t.korrekturen.map((k) => k.was).join(', ')}`);
  if (t.zuschlaege.some((z) => z.entscheidung === 'kurz' || z.entscheidung === 'weg')) h.push('Zuschlag gekürzt oder gestrichen');
  if (t.bestaetigtMitPin) h.push('Ohne Handy, mit PIN bestätigt');
  if (t.status === 'zurueck_polier' && t.zurueckGrund) h.unshift(`Zurück von der Bauleitung: ${t.zurueckGrund}`);
  if (t.pauseBegruendung) h.push(`Pause begründet: „${t.pauseBegruendung}“`);
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
  return Math.max(0, b - a - h.pauseMin) / 60;
}
