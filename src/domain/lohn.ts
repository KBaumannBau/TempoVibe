// Personal / HR / Lohn: Monatsübersicht, Übernahme, Export ZEITERF.DAT, Nachtstunden.
// Format der Exportdatei nach Entwurf V1 (Blatt 5). Vor dem Echtbetrieb mit der
// Lohnabrechnung abstimmen (Stunden über 9,99, Nachträge).

import type { Antrag, Daten, Person, Tag } from './types';
import { abwesendBis, baustelle, kontoStand, person, rechnung } from './sel';
import { istWerktag, sollFuer, tageImMonat, monatVon } from './zeit';

export const BETRIEBSNUMMER = '123456';
export const KST_ABW_GEWERBLICH = '180';
export const KST_ABW_ANGESTELLT = '170';

/** wer in der Lohnübersicht steht: eigene Mitarbeiter, keine NU-Personen */
export const lohnPersonen = (d: Daten) => d.personen.filter((p) => p.rolle !== 'nu' && p.rolle !== 'gl' && p.rolle !== 'admin');

const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n);

/** Stundenfeld (4 Zeichen): bis 9,99 mit 2 Nachkommastellen, darüber gerundet und markiert */
export function stundenFeld(v?: number): { t: string; warn: boolean } {
  if (v === undefined || v === null || Number.isNaN(v)) return { t: '', warn: false };
  const c = Math.round(v * 100);
  if (c <= 999) return { t: `${Math.floor(c / 100)},${String(c % 100).padStart(2, '0')}`, warn: false };
  const z = Math.floor((c + 5) / 10);
  return { t: `${Math.floor(z / 10)},${z % 10}`, warn: true };
}

export interface ExportZeile { txt: string; warn: boolean; why: string; key: string }

function zeile(monat: string, pers: string, tag: number, kst: string, std?: number, sym1 = '', sym2 = '', vkz?: number) {
  const h = stundenFeld(std);
  const v = stundenFeld(vkz);
  const nr = pers.replace(/\D/g, '').padStart(5, '0').slice(-5);
  const s = monat.slice(0, 4) + monat.slice(5, 7) + BETRIEBSNUMMER + nr + String(tag).padStart(2, '0') + pad(kst, 8) + pad(h.t || sym1, 4) + pad(sym2, 2) + pad(v.t, 4);
  return { txt: pad(s, 55), warn: h.warn || v.warn };
}

/** Symbol einer Abwesenheit: [unbezahlt (SSSS), bezahlt (YY)] */
function symbol(a: Antrag): [string, string] {
  if (a.art === 'urlaub' || a.art === 'betriebsurlaub') return ['U', ''];
  if (a.art === 'krank') return a.wer === 'kind' ? ['KK', ''] : ['', 'K'];
  if (a.art === 'arbeitsbefreiung') return a.ersatz === 'unbezahlt' ? ['UU', ''] : a.ersatz === 'urlaub' ? ['U', ''] : ['', 'S'];
  return ['', ''];
}

const abwGilt = (a: Antrag) => (a.art === 'krank' ? a.status === 'gemeldet' : a.status === 'genehmigt') && a.art !== 'konto';

/** Abwesenheitstage einer Person im Monat */
export function abwesenheitenImMonat(d: Daten, p: Person, monat: string) {
  const out: { datum: string; a: Antrag }[] = [];
  for (const a of d.antraege) {
    if (a.personId !== p.id || !abwGilt(a)) continue;
    for (const t of tageImMonat(monat)) if (t >= a.von && t <= a.bis && istWerktag(t)) out.push({ datum: t, a });
  }
  return out;
}

export type LohnStand = 'offen' | 'polier' | 'bauleitung' | 'bereit' | 'uebernommen';

export interface LohnZeile {
  p: Person;
  ist: number;
  soll: number;
  konto: number;
  wegeMin: number;
  verpflegung: number;
  nachtH: number;
  tage: Tag[];
  offen: Tag[];
  stand: LohnStand;
  hinweise: string[];
  sondertage: number;
}

/** Monatsübersicht je Person */
export function lohnZeile(d: Daten, p: Person, monat: string): LohnZeile {
  const tage = d.tage.filter((t) => t.personId === p.id && monatVon(t.datum) === monat);
  let ist = 0, nachtMin = 0;
  for (const t of tage) {
    const r = rechnung(d, p.id, t.datum);
    ist += r.arbeitMin / 60;
    nachtMin += r.nachtMin;
  }
  const abw = abwesenheitenImMonat(d, p, monat);
  for (const x of abw) ist += sollFuer(p, x.datum);
  const soll = tageImMonat(monat).reduce((s, k) => s + sollFuer(p, k), 0);
  const offen = tage.filter((t) => t.status !== 'freigegeben' || !t.uebernommen);
  const nichtFrei = tage.filter((t) => t.status !== 'freigegeben');
  let stand: LohnStand = 'uebernommen';
  if (nichtFrei.some((t) => t.status === 'offen')) stand = 'offen';
  else if (nichtFrei.some((t) => t.status === 'beim_polier' || t.status === 'zurueck_polier')) stand = 'polier';
  else if (nichtFrei.length) stand = 'bauleitung';
  else if (offen.length) stand = 'bereit';
  const hinweise: string[] = [];
  for (const t of tage) {
    if (t.pauseBegruendung) hinweise.push(`${t.datum.slice(8, 10)}.: Pause zu kurz, begründet`);
    for (const k of t.korrekturen) if (k.antwort === 'widerspruch' && !k.entscheidung) hinweise.push(`${t.datum.slice(8, 10)}.: Widerspruch gegen Korrektur offen`);
    if (t.geaendertNachUebernahme) hinweise.push(`${t.datum.slice(8, 10)}.: nach der Übernahme geändert (${t.geaendertNachUebernahme.was})${t.exportId ? ', schon exportiert: bitte in der Lohnabrechnung korrigieren' : ''}`);
  }
  if (p.gruppe !== 'angestellt' && kontoStand(d, p.id) > 150) hinweise.push(`Konto über 150 h: ${(kontoStand(d, p.id) - 150).toFixed(1).replace('.', ',')} h auszahlen`);
  return {
    p, ist, soll, konto: kontoStand(d, p.id), tage, offen, stand, hinweise, sondertage: abw.length,
    wegeMin: tage.reduce((s, t) => s + t.wegezeitMin, 0), verpflegung: tage.filter((t) => t.verpflegung).length, nachtH: nachtMin / 60,
  };
}

/** Zeilen der Exportdatei für einen Monat (nur übernommene, noch nicht exportierte Tage) */
export function exportZeilen(d: Daten, monat: string): ExportZeile[] {
  const out: ExportZeile[] = [];
  const schon = new Set(d.exporte.flatMap((e) => e.tagIds));
  for (const p of lohnPersonen(d)) {
    const angestellt = p.gruppe === 'angestellt';
    // Arbeit: nur Gewerbliche und Azubis, je Baustelle
    if (!angestellt) {
      for (const t of d.tage) {
        if (t.personId !== p.id || t.status !== 'freigegeben' || !t.uebernommen || schon.has(t.id)) continue;
        if (monatVon(t.datum) > monat) continue;
        const r = rechnung(d, p.id, t.datum);
        const nachtrag = monatVon(t.datum) < monat;
        for (const ab of r.abschnitte) {
          const b = baustelle(d, ab.baustelleId);
          const h = ab.min / 60;
          const z = zeile(monatVon(t.datum), p.persNr, Number(t.datum.slice(8, 10)), b?.kst ?? KST_ABW_GEWERBLICH, h);
          out.push({ ...z, key: t.id, why: `${p.nachname} ${t.datum.slice(8, 10)}.${t.datum.slice(5, 7)}.: ${h.toFixed(2).replace('.', ',')} h auf ${b?.kst ?? '?'}${nachtrag ? ' (Nachtrag)' : ''}${z.warn ? ' – passt nicht in 4 Zeichen, gerundet' : ''}` });
        }
      }
    }
    // Abwesenheiten
    for (const x of abwesenheitenImMonat(d, p, monat)) {
      const key = `abw:${x.a.id}:${x.datum}`;
      if (schon.has(key)) continue;
      const [s1, s2] = symbol(x.a);
      const kst = angestellt ? KST_ABW_ANGESTELLT : KST_ABW_GEWERBLICH;
      const z = zeile(monat, p.persNr, Number(x.datum.slice(8, 10)), kst, undefined, s1, s2, s2 ? sollFuer(p, x.datum) : undefined);
      out.push({ ...z, key, why: `${p.nachname} ${x.datum.slice(8, 10)}.: ${s1 || s2} auf Kst. ${kst}` });
    }
  }
  return out;
}

/** Nachtstunden (20–05 Uhr) im Monat, nur Gewerbliche */
export function nachtZeilen(d: Daten, monat: string) {
  const out: { p: Person; datum: string; kst: string; von: string; bis: string; h: number; tagId: string }[] = [];
  for (const t of d.tage) {
    if (monatVon(t.datum) !== monat) continue;
    const p = person(d, t.personId);
    if (p.gruppe === 'angestellt' || p.rolle === 'nu') continue;
    const r = rechnung(d, t.personId, t.datum);
    if (r.nachtMin < 15) continue;
    out.push({ p, datum: t.datum, kst: baustelle(d, r.gueltig[0]?.baustelleId)?.kst ?? '', von: r.beginn?.zeit.slice(11, 16) ?? '', bis: r.ende?.zeit.slice(11, 16) ?? '', h: r.nachtMin / 60, tagId: t.id });
  }
  return out.sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Datei als Text: CRLF, Leerzeichen als Füllzeichen */
export const dateiText = (zeilen: string[]) => zeilen.join('\r\n') + '\r\n';

export { abwesendBis };
