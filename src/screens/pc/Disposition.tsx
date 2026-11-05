// 15: Disposition – Personal, Nachunternehmer und Geräte auf Baustellen einteilen
// Reiter je Art, Ansichten mit tauschbaren Achsen (Baustelle / Person bzw. Gerät / Tag),
// Zeitraum Tag bis Monat, Filter, Summen, Ziehen und Ablegen, ganze Kolonne einteilen.

import { Fragment, useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PcSeite, Pk, Reiter, useToast } from '../../components/Pc';
import { useDaten } from '../../domain/store';
import { abwesendBis, baustelle, person, voll } from '../../domain/sel';
import { ausKey, feiertag, kw, monatName, monatPlus, monatVon, montagDerWoche, plusTage, tageImMonat, tm, uhr, wtKurz } from '../../domain/zeit';
import type { Daten, Person } from '../../domain/types';

/** Warnung bei NU-Personen: Unterlagen der Firma, A1, Mindestlohnerklärung */
export function nuWarnung(d: Daten, p: Person): string | undefined {
  if (p.rolle !== 'nu') return undefined;
  const f = d.firmen.find((x) => x.id === p.firmaId);
  const ug = f?.unterlagen.filter((u) => u.status === 'abgelaufen' || u.status === 'fehlt') ?? [];
  if (ug.length) return `${f!.name}: ${ug.length} Unterlage${ug.length > 1 ? 'n' : ''} ungültig`;
  if (p.a1Bis && p.a1Bis < d.heute) return 'A1-Bescheinigung abgelaufen';
  const vm = monatPlus(monatVon(d.heute), -1);
  if (p.mindestlohn && p.mindestlohn[vm] !== 'unterschrieben') return 'Mindestlohnerklärung fehlt';
  return undefined;
}

type Tab = 'p' | 'nu' | 'g';
type Dim = 'b' | 'r' | 't';
type Zr = 'tag' | 'woche' | '2w' | 'monat';
type Ansicht = 'bt' | 'rt' | 'br';
type Art = 'p' | 'g';
type Res = { art: Art; id: string; name: string; kurz: string; ini: string; gruppe: string; warn?: string };
type Zug =
  | { typ: 'res'; art: Art; id: string }
  | { typ: 'kolonne'; polierId: string }
  | { typ: 'bs'; id: string }
  | { typ: 'zelle'; art: Art; id: string; b: string; t: string; h?: 'vm' | 'nm' };
type Bel = { b: string; h?: 'vm' | 'nm' };
type Ctx = { b?: string; r?: string; t?: string };

interface Einst { tab: Tab; ansicht: Ansicht; tausch: boolean; zr: Zr; nurMeine: boolean; polier: string; gruppe: string; nurFreie: boolean; alleBs: boolean }
const SPEICHER = 'stundenerfassung-dispo-ansicht';
const MIME = 'application/x-dispo';

function laden(istBl: boolean): Einst {
  const std: Einst = { tab: 'p', ansicht: 'bt', tausch: false, zr: 'woche', nurMeine: istBl, polier: '', gruppe: '', nurFreie: false, alleBs: false };
  try {
    const s = JSON.parse(localStorage.getItem(SPEICHER) ?? 'null');
    return s && typeof s === 'object' ? { ...std, ...s } : std;
  } catch {
    return std;
  }
}

const istWT = (k: string) => { const g = ausKey(k).getDay(); return g >= 1 && g <= 5; };
const naechsterWT = (k: string, n: 1 | -1) => { let x = plusTage(k, n); while (!istWT(x)) x = plusTage(x, n); return x; };
const zahl = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const ABW: Record<string, string> = { urlaub: 'Urlaub', krank: 'krank', konto: 'frei (Konto)', arbeitsbefreiung: 'Arbeitsbefreiung', betriebsurlaub: 'Betriebsurlaub' };
const GRUPPEN_P = ['Poliere und Vorarbeiter', 'Facharbeiter', 'Helfer', 'Azubis'];
const GRUPPEN_G = ['Bagger', 'Fahrzeuge', 'Geräte'];

function abwesenheit(d: Daten, pid: string, t: string): string | undefined {
  const a = d.antraege.find((x) => x.personId === pid && x.von <= t && x.bis >= t && (x.status === 'gemeldet' || x.status === 'genehmigt' || x.status === 'bauleitung_ok'));
  return a ? ABW[a.art] ?? 'abwesend' : undefined;
}
const kurzName = (p: Person) => (p.nachname ? `${p.vorname[0]}. ${p.nachname}` : p.vorname);
const initialen = (p: Person) => (p.nachname ? `${p.vorname[0]}${p.nachname[0]}` : p.vorname.slice(0, 2));
const gruppeP = (p: Person) => (p.gruppe === 'azubi' ? 'Azubis' : p.rolle === 'polier' || p.rolle === 'vorarbeiter' ? 'Poliere und Vorarbeiter' : p.rolle === 'helfer' ? 'Helfer' : 'Facharbeiter');
const gruppeG = (name: string) => (/bagger/i.test(name) ? 'Bagger' : /transporter|lkw/i.test(name) ? 'Fahrzeuge' : 'Geräte');

/** Pille im Pool: span statt button, weil Buttons sich in Browsern nicht zuverlässig ziehen lassen */
function PoolPille({ klasse = '', an, gesperrt, titel, onClick, zieh, children }: { klasse?: string; an: boolean; gesperrt?: boolean; titel?: string; onClick: () => void; zieh: object; children: ReactNode }) {
  return (
    <span role="button" tabIndex={gesperrt ? -1 : 0} className={`pool-pill ${klasse}`} aria-pressed={an} aria-disabled={gesperrt || undefined} title={titel}
      onClick={() => !gesperrt && onClick()} onKeyDown={(ev) => { if (!gesperrt && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); onClick(); } }} {...zieh}>
      {children}
    </span>
  );
}

export function PcDisposition() {
  const { d, a, ich } = useDaten();
  const darf = ich?.rolle === 'oberbauleitung' || ich?.rolle === 'bauleitung';
  const [e, setE] = useState<Einst>(() => laden(ich?.rolle === 'bauleitung'));
  const setz = (p: Partial<Einst>) => setE((x) => ({ ...x, ...p }));
  useEffect(() => { try { localStorage.setItem(SPEICHER, JSON.stringify(e)); } catch { /* nur Komfort */ } }, [e]);
  const [anker, setAnker] = useState(d.heute);
  const [poolTag, setPoolTag] = useState(d.heute);
  const [wahl, setWahl] = useState<Zug>();
  const [ueber, setUeber] = useState<string>();
  const [toast, zeige] = useToast();

  // ---------- Zeitraum ----------
  const tageZr = useMemo(() => {
    const mo = montagDerWoche(anker);
    if (e.zr === 'tag') return [istWT(anker) ? anker : naechsterWT(anker, 1)];
    if (e.zr === 'woche') return [0, 1, 2, 3, 4].map((i) => plusTage(mo, i));
    if (e.zr === '2w') return [0, 1, 2, 3, 4, 7, 8, 9, 10, 11].map((i) => plusTage(mo, i));
    return tageImMonat(monatVon(anker)).filter(istWT);
  }, [anker, e.zr]);
  const stich = tageZr.includes(poolTag) ? poolTag : tageZr.includes(d.heute) ? d.heute : tageZr[0];
  const grund: [Dim, Dim] = e.ansicht === 'bt' ? ['b', 't'] : e.ansicht === 'rt' ? ['r', 't'] : ['b', 'r'];
  const [zDim, sDim] = e.tausch ? [grund[1], grund[0]] : grund;
  const ohne = (['b', 'r', 't'] as Dim[]).find((x) => x !== zDim && x !== sDim)!;
  const tage = ohne === 't' ? [stich] : tageZr;
  const kompakt = sDim === 't' && tage.length > 10;

  const schritt = (n: 1 | -1) => {
    if (ohne === 't' || e.zr === 'tag') { const t = naechsterWT(stich, n); setAnker(t); setPoolTag(t); return; }
    if (e.zr === 'monat') { const m = `${monatPlus(monatVon(anker), n)}-01`; setAnker(m); return; }
    setAnker(plusTage(montagDerWoche(anker), n * (e.zr === '2w' ? 14 : 7)));
  };
  const zrText = ohne === 't' || e.zr === 'tag' ? `${wtKurz(tage[0])} ${tm(tage[0])}${tage[0].slice(0, 4)}`
    : e.zr === 'monat' ? monatName(monatVon(anker))
    : `KW ${kw(tage[0])}${e.zr === '2w' ? `–${kw(tage[tage.length - 1])}` : ''} · ${tm(tage[0])}–${tm(tage[tage.length - 1])}${tage[0].slice(0, 4)}`;

  // ---------- Ressourcen ----------
  const eigene = d.personen.filter((p) => ['facharbeiter', 'helfer', 'vorarbeiter', 'polier'].includes(p.rolle) && !p.austritt);
  const nuP = d.personen.filter((p) => p.rolle === 'nu');
  const firmaName = (p: Person) => d.firmen.find((f) => f.id === p.firmaId)?.name ?? 'ohne Firma';
  const resVon = (tab: Tab): Res[] => tab === 'g'
    ? d.geraetePool.map((g) => ({ art: 'g', id: g.id, name: g.name, kurz: g.name, ini: g.name.split(' ')[0].slice(0, 6), gruppe: gruppeG(g.name) }))
    : (tab === 'p' ? eigene : nuP).map((p) => ({ art: 'p', id: p.id, name: voll(p), kurz: kurzName(p), ini: initialen(p), gruppe: tab === 'p' ? gruppeP(p) : firmaName(p), warn: nuWarnung(d, p) }));
  const alleRes = resVon(e.tab);
  const gruppenOrdnung = e.tab === 'p' ? GRUPPEN_P : e.tab === 'g' ? GRUPPEN_G : [...new Set(alleRes.map((r) => r.gruppe))].sort();
  const sortiert = (l: Res[]) => [...l].sort((x, y) => gruppenOrdnung.indexOf(x.gruppe) - gruppenOrdnung.indexOf(y.gruppe) || x.name.localeCompare(y.name, 'de'));

  const bel = (r: { art: Art; id: string }, t: string): Bel[] => r.art === 'p'
    ? d.einteilung.filter((x) => x.personId === r.id && x.datum === t).map((x) => ({ b: x.baustelleId, h: x.haelfte }))
    : d.geraeteEinteilung.filter((x) => x.geraetId === r.id && x.datum === t).map((x) => ({ b: x.baustelleId }));
  const abw = (r: { art: Art; id: string }, t: string) => (r.art === 'p' ? abwesenheit(d, r.id, t) : undefined);
  const leer = (r: Res, t: string) => !feiertag(t) && !abw(r, t) && bel(r, t).length === 0;
  const cnt = (r: Res, b: string, t: string) => bel(r, t).filter((x) => x.b === b).reduce((s, x) => s + (x.h ? 0.5 : 1), 0);

  // ---------- Baustellen und Filter ----------
  const aktive = d.baustellen.filter((b) => !b.archiviert);
  const hatEigene = aktive.some((b) => b.bauleitungId === ich?.id);
  const meine = e.nurMeine && hatEigene;
  const poliere = d.personen.filter((p) => p.rolle === 'polier' && !p.austritt);
  const bsGefiltert = aktive.filter((b) => (!meine || b.bauleitungId === ich?.id) && (!e.polier || b.polierId === e.polier));
  const polierBs = new Set(aktive.filter((b) => b.polierId === e.polier).map((b) => b.id));
  const zellRes = alleRes.filter((r) => !e.gruppe || r.gruppe === e.gruppe);
  const resListe = sortiert(zellRes.filter((r) => (!e.polier || tage.some((t) => bel(r, t).some((x) => polierBs.has(x.b)))) && (!e.nurFreie || tage.some((t) => leer(r, t)))));
  const bsZeilen = bsGefiltert.filter((b) => e.alleBs || tage.some((t) => zellRes.some((r) => bel(r, t).some((x) => x.b === b.id))));

  /** Kolonne = wer am Tag mit dem Polier auf derselben Baustelle eingeteilt ist (sonst letzter Arbeitstag davor) */
  const kolonne = (polierId: string, ab: string): string[] => {
    let t = ab;
    for (let i = 0; i < 15; i++, t = naechsterWT(t, -1)) {
      const pb = d.einteilung.find((x) => x.personId === polierId && x.datum === t);
      if (pb) return [...new Set(d.einteilung.filter((x) => x.baustelleId === pb.baustelleId && x.datum === t).map((x) => x.personId))];
    }
    return [];
  };

  // ---------- Einteilen ----------
  const zuweisen = (r: { art: Art; id: string }, t: string, bid: string): string | undefined => {
    if (feiertag(t)) return `${tm(t)} ist ein Feiertag`;
    if (r.art === 'g') { a.geraetEinteilen(r.id, t, bid); return; }
    const p = person(d, r.id);
    if (abwesendBis(d, p.id, t)) return `${voll(p)} ist am ${tm(t)} abwesend`;
    const es = d.einteilung.filter((x) => x.personId === p.id && x.datum === t);
    const halb = es.length === 1 && es[0].haelfte ? (es[0].haelfte === 'vm' ? 'nm' : 'vm') : undefined;
    if (es.length && !halb && es.every((x) => x.baustelleId === bid)) return;
    if (halb && es[0].baustelleId === bid) { a.einteilen(p.id, t, bid); return; }
    a.einteilen(p.id, t, bid, halb);
  };
  const entfernen = (art: Art, id: string, t: string, h?: 'vm' | 'nm') => (art === 'g' ? a.geraetEinteilen(id, t, null) : a.einteilen(id, t, null, h));

  const ausfuehren = (z: Zug, ctx: Ctx, kopie: boolean, zielTage: string[]) => {
    const fehler: string[] = [];
    const warn = new Set<string>();
    const merke = (f?: string) => f && fehler.push(f);
    const nuPruef = (pid: string) => { const p = d.personen.find((x) => x.id === pid); const w = p && nuWarnung(d, p); if (w) warn.add(`${voll(p!)} – ${w}`); };
    if ((z.typ === 'res' || z.typ === 'kolonne') && ctx.b) {
      const ids = z.typ === 'res' ? [z.id] : kolonne(z.polierId, stich);
      const art: Art = z.typ === 'res' ? z.art : 'p';
      for (const t of zielTage) for (const id of ids) { merke(zuweisen({ art, id }, t, ctx.b)); if (art === 'p') nuPruef(id); }
    } else if (z.typ === 'bs' && ctx.r) {
      const r = alleRes.find((x) => x.id === ctx.r)!;
      for (const t of zielTage) merke(zuweisen(r, t, z.id));
      if (r.art === 'p') nuPruef(r.id);
    } else if (z.typ === 'zelle') {
      if (ctx.r && ctx.r !== z.id) return zeige('Eine Einteilung lässt sich nur in der Zeile derselben Person oder desselben Geräts verschieben.', 'orange');
      const zielB = ctx.b ?? z.b;
      for (const t of zielTage) {
        if (t === z.t && !kopie) {
          if (zielB === z.b) continue;
          if (feiertag(t)) { merke(`${tm(t)} ist ein Feiertag`); continue; }
          if (z.art === 'g') a.geraetEinteilen(z.id, t, zielB); else a.einteilen(z.id, t, zielB, z.h);
        } else merke(zuweisen({ art: z.art, id: z.id }, t, zielB));
      }
      if (!kopie && !zielTage.includes(z.t) && !fehler.length) entfernen(z.art, z.id, z.t, z.h);
      if (z.art === 'p') nuPruef(z.id);
    } else return;
    if (fehler.length) zeige(`${fehler.length === 1 ? 'Nicht eingeteilt' : `${fehler.length}× nicht eingeteilt`}: ${[...new Set(fehler)].slice(0, 3).join(' · ')}`, 'orange');
    else if (warn.size) zeige(`Achtung: ${[...warn].join(' · ')}. Bitte mit dem Einkauf klären.`, 'rot');
  };

  const halbUmschalten = (pid: string, t: string, bid: string) => {
    const x = d.einteilung.find((y) => y.personId === pid && y.datum === t && y.baustelleId === bid)!;
    const next = !x.haelfte ? 'vm' : x.haelfte === 'vm' ? 'nm' : undefined;
    a.einteilen(pid, t, null, x.haelfte);
    a.einteilen(pid, t, bid, next);
  };
  const erstenTagUebernehmen = (bid: string) => {
    for (const r of zellRes) for (const x of bel(r, tage[0]).filter((y) => y.b === bid)) for (const t of tage.slice(1)) if (!feiertag(t) && !abw(r, t)) {
      if (r.art === 'g') a.geraetEinteilen(r.id, t, bid); else a.einteilen(r.id, t, bid, x.h);
    }
    zeige(`Besetzung vom ${wtKurz(tage[0])} ${tm(tage[0])} auf alle Tage im Zeitraum übernommen.`);
  };

  // ---------- Ziehen und Ablegen ----------
  const ziehbar = (z: Zug, text: string) => darf ? {
    draggable: true,
    onDragStart: (ev: DragEvent) => { ev.dataTransfer.setData(MIME, JSON.stringify(z)); ev.dataTransfer.setData('text/plain', text); ev.dataTransfer.effectAllowed = 'copyMove'; },
  } : {};
  const ablage = (key: string, ctx: Ctx, zielTage: string[], passt: (z: Zug) => boolean) => darf ? {
    onDragOver: (ev: DragEvent) => { if (ev.dataTransfer.types.includes(MIME)) { ev.preventDefault(); ev.dataTransfer.dropEffect = ev.ctrlKey || ev.altKey ? 'copy' : 'move'; if (ueber !== key) setUeber(key); } },
    onDragLeave: () => setUeber((u) => (u === key ? undefined : u)),
    onDrop: (ev: DragEvent) => {
      ev.preventDefault();
      setUeber(undefined);
      let z: Zug | undefined;
      try { z = JSON.parse(ev.dataTransfer.getData(MIME)); } catch { z = undefined; }
      if (z && passt(z)) ausfuehren(z, ctx, ev.ctrlKey || ev.altKey, zielTage);
    },
  } : {};
  const passtB = (z: Zug) => z.typ === 'res' || z.typ === 'kolonne' || z.typ === 'zelle';
  const passtR = (z: Zug) => z.typ === 'bs' || z.typ === 'zelle';

  // ---------- Hinweise ----------
  const tagNach = (t: string) => naechsterWT(t, 1);
  const umsetzenNach = (r: Res, t: string, b: string) => {
    if (r.art !== 'g') return undefined;
    const n = bel(r, tagNach(t))[0];
    return n && n.b !== b ? n : undefined;
  };
  const konflikte: string[] = [];
  if (e.tab !== 'g') {
    for (const r of alleRes) for (const t of tageZr) {
      const bl = bel(r, t);
      const ab = abw(r, t);
      if (bl.length && ab) konflikte.push(`${r.name} ist am ${wtKurz(t)} ${tm(t)} auf ${bl.map((x) => baustelle(d, x.b)?.kst).join(' / ')} eingeteilt, ist aber ${ab === 'krank' ? 'krank' : `im ${ab}`}.`);
    }
    for (const r of alleRes.filter((x) => x.warn)) if (tageZr.some((t) => bel(r, t).length)) konflikte.push(`${r.name} ist eingeteilt: ${r.warn}.`);
  }
  const umsetzen: string[] = [];
  if (e.tab === 'g') for (const r of alleRes) for (const t of tageZr) {
    const x = bel(r, t)[0];
    const n = x && umsetzenNach(r, t, x.b);
    if (x && n) umsetzen.push(`${r.name}: ${wtKurz(t)} ${tm(t)} ${baustelle(d, x.b)?.kst} → ${wtKurz(tagNach(t))} ${tm(tagNach(t))} ${baustelle(d, n.b)?.kst}`);
  }
  const geaendert = d.einteilung.filter((x) => x.geaendert).length;
  const offeneNachrichten = d.nachrichten.filter((n) => !n.erledigt);
  const wort = e.tab === 'g' ? 'Geräte' : e.tab === 'nu' ? 'Nachunternehmer' : 'Mitarbeiter';
  const einheit = e.tab === 'g' ? 'Gerätetage' : 'Personentage';

  // ---------- Bausteine ----------
  const leitet = (p: Person, bid: string) => ['polier', 'vorarbeiter'].includes(p.rolle) || d.rollenJeBaustelle.some((r) => r.personId === p.id && r.baustelleId === bid && r.rolle === 'vorarbeiter');
  const pillKlasse = (r: Res, t: string, extra = '') => {
    const neu = r.art === 'p' && d.einteilung.some((x) => x.personId === r.id && x.datum === t && x.geaendert);
    return `dispo-pill${e.tab === 'nu' ? ' nu' : ''}${e.tab === 'g' ? ' geraet' : ''}${r.warn ? ' warn' : ''}${abw(r, t) ? ' konflikt' : ''}${neu ? ' neu' : ''}${kompakt ? ' kompakt' : ''}${extra}`;
  };

  /** Pille einer Person / eines Geräts in einer Baustellen-Zelle */
  const resPille = (r: Res, x: Bel, t: string, b: string) => {
    const p = r.art === 'p' ? person(d, r.id) : undefined;
    const um = umsetzenNach(r, t, b);
    const titel = [r.name, r.warn, abw(r, t) ? `abwesend: ${abw(r, t)}` : '', um ? `am ${wtKurz(tagNach(t))} auf ${baustelle(d, um.b)?.kst} umsetzen` : ''].filter(Boolean).join(' · ');
    return (
      <span key={r.id + (x.h ?? '')} className={pillKlasse(r, t)} title={titel} {...ziehbar({ typ: 'zelle', art: r.art, id: r.id, b, t, h: x.h }, r.name)}>
        {r.warn ? '! ' : ''}{p && leitet(p, b) ? '★ ' : ''}{kompakt ? r.ini : r.kurz}{x.h ? ` · ${x.h.toUpperCase()}` : ''}{um ? ' ↦' : ''}
        {darf && <>
          {p && !kompakt && <button type="button" aria-label={`${r.name} halber Tag`} onClick={() => halbUmschalten(p.id, t, b)}>½</button>}
          <button type="button" aria-label={`${r.name} am ${tm(t)} entfernen`} onClick={() => entfernen(r.art, r.id, t, x.h)}>×</button>
        </>}
      </span>
    );
  };
  /** Pille einer Baustelle in einer Personen- bzw. Geräte-Zelle */
  const bsPille = (r: Res, x: Bel, t: string) => {
    const b = baustelle(d, x.b);
    const um = umsetzenNach(r, t, x.b);
    return (
      <span key={x.b + (x.h ?? '')} className={pillKlasse(r, t, ' bs')} title={`${b?.kst} ${b?.strasse}${um ? ` · am ${wtKurz(tagNach(t))} auf ${baustelle(d, um.b)?.kst} umsetzen` : ''}`} {...ziehbar({ typ: 'zelle', art: r.art, id: r.id, b: x.b, t, h: x.h }, b?.kst ?? '')}>
        {b?.kst}{x.h ? ` · ${x.h.toUpperCase()}` : ''}{um ? ' ↦' : ''}
        {darf && <>
          {r.art === 'p' && !kompakt && <button type="button" aria-label={`${r.name} halber Tag`} onClick={() => halbUmschalten(r.id, t, x.b)}>½</button>}
          <button type="button" aria-label={`${r.name} am ${tm(t)} entfernen`} onClick={() => entfernen(r.art, r.id, t, x.h)}>×</button>
        </>}
      </span>
    );
  };

  const zelle = (ctx: Ctx): ReactNode => {
    const t = ctx.t ?? stich;
    const ft = feiertag(t);
    const key = `${ctx.b ?? ''}|${ctx.r ?? ''}|${t}`;
    const heute = t === d.heute && (zDim === 't' || sDim === 't');
    const kl = (x = '') => `dz${heute ? ' heute' : ''}${ueber === key ? ' ziel' : ''}${x}`;
    if (ohne === 'r') {
      const b = ctx.b!;
      const bs = baustelle(d, b);
      return (
        <div key={key} className={kl(ft ? ' feiertag' : '')} aria-label={`${bs?.kst} ${wtKurz(t)} ${tm(t)}`} {...(ft ? {} : ablage(key, { b, t }, [t], passtB))}>
          {ft ? <span className="klein">Feiertag</span> : <>
            {zellRes.flatMap((r) => bel(r, t).filter((x) => x.b === b).map((x) => resPille(r, x, t, b)))}
            {darf && wahl && wahl.typ !== 'bs' && <button type="button" className="hier" onClick={() => ausfuehren(wahl, { b, t }, true, [t])}>+ hier</button>}
          </>}
        </div>
      );
    }
    const r = alleRes.find((x) => x.id === ctx.r)!;
    if (ohne === 'b') {
      const bl = bel(r, t);
      const ab = abw(r, t);
      return (
        <div key={key} className={kl(ft ? ' feiertag' : ab ? ' abwesend' : '')} aria-label={`${r.name} ${wtKurz(t)} ${tm(t)}`} {...(ft ? {} : ablage(key, { r: r.id, t }, [t], passtR))}>
          {ft ? <span className="klein">Feiertag</span> : <>
            {ab && <span className="klein">{kompakt ? ab.slice(0, 1).toUpperCase() : ab}</span>}
            {bl.map((x) => bsPille(r, x, t))}
            {!ab && !bl.length && !kompakt && <span className="klein frei">frei</span>}
            {darf && wahl?.typ === 'bs' && !ab && <button type="button" className="hier" onClick={() => ausfuehren(wahl, { r: r.id, t }, true, [t])}>+ hier</button>}
          </>}
        </div>
      );
    }
    // ohne Tag: Baustelle × Ressource an einem Tag
    const b = ctx.b!;
    const hier = bel(r, t).filter((x) => x.b === b);
    const sonst = bel(r, t).filter((x) => x.b !== b);
    const ab = abw(r, t);
    const klick = () => {
      if (!darf || ft) return;
      if (hier.length) hier.forEach((x) => entfernen(r.art, r.id, t, x.h));
      else ausfuehren({ typ: 'res', art: r.art, id: r.id }, { b, t }, true, [t]);
    };
    return (
      <div key={key} className={kl(` matrix${hier.length ? ' an' : ''}${ab ? ' abwesend' : ''}`)} {...(ft ? {} : ablage(key, { b, r: r.id, t }, [t], (z) => z.typ === 'zelle'))} {...(hier.length ? ziehbar({ typ: 'zelle', art: r.art, id: r.id, b, t, h: hier[0].h }, r.name) : {})}>
        <button type="button" className="matrix-knopf" disabled={!darf || !!ft || (!!ab && !hier.length)} aria-pressed={hier.length > 0} aria-label={`${r.name} auf ${baustelle(d, b)?.kst} am ${tm(t)}`} onClick={klick}>
          {hier.length ? `✓${hier[0].h ? ` ${hier[0].h.toUpperCase()}` : ''}` : ab ? ab : sonst.length ? <span className="klein">{sonst.map((x) => baustelle(d, x.b)?.kst).join('/')}</span> : ''}
        </button>
        {darf && hier.length > 0 && r.art === 'p' && <button type="button" className="matrix-halb" aria-label={`${r.name} halber Tag`} onClick={() => halbUmschalten(r.id, t, b)}>½</button>}
      </div>
    );
  };

  const andereTage = sDim === 't' || zDim === 't' ? tage : [];
  const kopf = (dim: Dim, key: string, istZeile: boolean): ReactNode => {
    if (dim === 't') {
      const ft = feiertag(key);
      return <>{kompakt ? <>{wtKurz(key).slice(0, 2)}<br />{key.slice(8, 10)}.</> : <>{wtKurz(key)} {tm(key)}</>}{ft && !kompakt ? <span className="klein"> · {ft}</span> : null}</>;
    }
    if (dim === 'b') {
      const b = baustelle(d, key)!;
      if (!istZeile) return <><strong>{b.kst}</strong><br /><span className="klein">{b.strasse}</span></>;
      const lead = d.einteilung.find((x) => x.baustelleId === b.id && x.datum === tage[0] && ['polier', 'vorarbeiter'].includes(person(d, x.personId)?.rolle));
      return <>
        <strong>{b.kst}</strong> {b.strasse}{kompakt ? null : <><br /><span className="klein">{b.massnahme ?? ''}</span></>}
        {!kompakt && <span className="klein">Bauleiter: {voll(person(d, b.bauleitungId))} · Melden bei: {lead ? voll(person(d, lead.personId)) : voll(person(d, b.bauleitungId))}</span>}
        {darf && andereTage.length > 1 && <div className="pk-reihe" style={{ marginTop: 2 }}>
          <button type="button" className="link klein" onClick={() => erstenTagUebernehmen(b.id)}>{wtKurz(tage[0])}-Besetzung auf alle Tage</button>
          {wahl && wahl.typ !== 'bs' && <button type="button" className="link klein" onClick={() => ausfuehren(wahl, { b: b.id }, true, tage)}>+ an allen Tagen</button>}
        </div>}
      </>;
    }
    const r = alleRes.find((x) => x.id === key)!;
    if (!istZeile) return <span title={[r.name, r.warn].filter(Boolean).join(' · ')}>{r.warn ? '! ' : ''}{r.kurz}<br /><span className="klein">{e.tab === 'p' ? r.gruppe.split(' ')[0] : ''}</span></span>;
    return <>
      <strong>{r.warn ? '! ' : ''}{r.name}</strong>{r.warn ? <><br /><span className="klein rot-text">{r.warn}</span></> : null}
      {darf && wahl?.typ === 'bs' && andereTage.length > 1 && <div><button type="button" className="link klein" onClick={() => ausfuehren(wahl, { r: r.id }, true, tage)}>+ an allen Tagen</button></div>}
    </>;
  };
  const kopfAblage = (dim: Dim, key: string) => {
    if (andereTage.length < 2) return {};
    if (dim === 'b') return ablage(`k-${key}`, { b: key }, tage, (z) => z.typ === 'res' || z.typ === 'kolonne');
    if (dim === 'r') return ablage(`k-${key}`, { r: key }, tage, (z) => z.typ === 'bs');
    return {};
  };

  /** Summe einer Zeile oder Spalte */
  const summe = (linie: Dim, key: string, gegen: Dim, keys: string[]): ReactNode => {
    if (linie === 'b') {
      const n = gegen === 't' ? keys.reduce((s, t) => s + zellRes.reduce((u, r) => u + cnt(r, key, t), 0), 0) : keys.reduce((s, rid) => s + cnt(alleRes.find((x) => x.id === rid)!, key, stich), 0);
      return gegen === 't' ? <><strong>{zahl(n)}</strong> <span className="klein">{einheit}</span></> : <><strong>{zahl(n)}</strong> <span className="klein">{wort}</span></>;
    }
    if (linie === 'r') {
      const r = alleRes.find((x) => x.id === key)!;
      if (gegen === 't') {
        const n = keys.reduce((s, t) => s + bel(r, t).reduce((u, x) => u + (x.h ? 0.5 : 1), 0), 0);
        const verf = keys.filter((t) => !feiertag(t) && !abw(r, t)).length;
        const proz = verf ? Math.round((n / verf) * 100) : 0;
        return <span className={proz < 100 && verf ? 'auslastung luecke' : 'auslastung'} title={`${zahl(n)} von ${verf} verfügbaren Arbeitstagen eingeteilt`}><strong>{zahl(n)}/{verf}</strong> <span className="klein">{proz} %</span></span>;
      }
      const n = keys.reduce((s, b) => s + cnt(r, b, stich), 0);
      return n ? <span className="klein">eingeteilt</span> : abw(r, stich) ? <span className="klein">{abw(r, stich)}</span> : bel(r, stich).length ? <span className="klein">woanders</span> : <span className="klein frei">frei</span>;
    }
    // Tag
    if (feiertag(key)) return <span className="klein">Feiertag</span>;
    const liste = gegen === 'r' ? resListe.filter((r) => keys.includes(r.id)) : zellRes;
    const n = gegen === 'b' ? keys.reduce((s, b) => s + zellRes.reduce((u, r) => u + cnt(r, b, key), 0), 0) : liste.reduce((s, r) => s + bel(r, key).reduce((u, x) => u + (x.h ? 0.5 : 1), 0), 0);
    const frei = liste.filter((r) => leer(r, key)).length;
    return kompakt ? <span title={`${zahl(n)} eingeteilt, ${frei} frei`}><strong>{zahl(n)}</strong><br /><span className="klein">{frei} fr.</span></span>
      : <><strong>{zahl(n)}</strong> <span className="klein">eingeteilt · {frei} frei</span></>;
  };

  // ---------- Raster ----------
  const keysVon = (dim: Dim) => (dim === 'b' ? bsZeilen.map((b) => b.id) : dim === 'r' ? resListe.map((r) => r.id) : tage);
  const zKeys = keysVon(zDim);
  const sKeys = keysVon(sDim);
  const breite = (dim: Dim, erste: boolean) => (erste ? (dim === 'b' ? 220 : dim === 'r' ? 170 : 110) : dim === 't' ? (kompakt ? 54 : 118) : dim === 'b' ? 130 : 92);
  const spalten = `${breite(zDim, true)}px repeat(${sKeys.length}, minmax(${breite(sDim, false)}px, 1fr)) 104px`;
  const minBreite = breite(zDim, true) + sKeys.length * breite(sDim, false) + 104;
  const ctxVon = (zk: string, sk: string): Ctx => ({ [zDim]: zk, [sDim]: sk }) as Ctx;
  const dimText = (dim: Dim) => (dim === 'b' ? 'Baustelle' : dim === 't' ? 'Tag' : e.tab === 'g' ? 'Gerät' : 'Person');
  const resWort = e.tab === 'g' ? 'Geräte' : 'Personen';

  const zeilenMitGruppen: ReactNode[] = [];
  let letzteGruppe = '';
  for (const zk of zKeys) {
    if (zDim === 'r') {
      const g = alleRes.find((x) => x.id === zk)!.gruppe;
      if (g !== letzteGruppe) {
        letzteGruppe = g;
        const f = e.tab === 'nu' ? d.firmen.find((x) => x.name === g) : undefined;
        const ug = f?.unterlagen.filter((u) => u.status === 'abgelaufen' || u.status === 'fehlt').length ?? 0;
        zeilenMitGruppen.push(<div key={`g-${g}`} className="gruppe-kopf" style={{ gridColumn: '1 / -1' }}>{g} <span className="klein">· {resListe.filter((r) => r.gruppe === g).length}{f ? ` · Unterlagen ${ug ? `${ug} ungültig` : 'in Ordnung'}` : ''}</span></div>);
      }
    }
    zeilenMitGruppen.push(
      <Fragment key={zk}>
        <div className={`zk${zDim === 't' && zk === d.heute ? ' heute' : ''}`} {...kopfAblage(zDim, zk)} data-ziel={ueber === `k-${zk}` ? 'ja' : undefined}>{kopf(zDim, zk, true)}</div>
        {sKeys.map((sk) => zelle(ctxVon(zk, sk)))}
        <div className="summe">{summe(zDim, zk, sDim, sKeys)}</div>
      </Fragment>,
    );
  }

  // ---------- Pool ----------
  const gruppenImPool = gruppenOrdnung.filter((g) => alleRes.some((r) => r.gruppe === g && (!e.gruppe || g === e.gruppe)));
  const poolStatus = (r: Res) => {
    if (feiertag(stich)) return 'Feiertag';
    const ab = abw(r, stich);
    if (ab) return ab;
    const bl = bel(r, stich);
    if (!bl.length) return 'frei';
    if (bl.length === 1 && bl[0].h) return `${bl[0].h === 'vm' ? 'NM' : 'VM'} frei`;
    return bl.map((x) => baustelle(d, x.b)?.kst).join(' / ');
  };
  const istGewaehlt = (z: Zug) => JSON.stringify(z) === JSON.stringify(wahl);
  const waehle = (z: Zug) => setWahl(istGewaehlt(z) ? undefined : z);
  const wahlText = !wahl ? '' : wahl.typ === 'res' ? alleRes.find((r) => r.id === wahl.id)?.name ?? '' : wahl.typ === 'kolonne' ? `Kolonne ${voll(person(d, wahl.polierId))}` : wahl.typ === 'bs' ? `Baustelle ${baustelle(d, wahl.id)?.kst}` : '';
  useEffect(() => { setWahl(undefined); }, [e.tab, e.ansicht, e.tausch]);

  const tagWahl = tageZr.length > 1 && ohne !== 't' && (
    tageZr.length <= 10
      ? <div className="reiter" role="group" aria-label="Tag für die Übersicht">{tageZr.map((t) => <button key={t} type="button" aria-pressed={t === stich} onClick={() => setPoolTag(t)}>{wtKurz(t)} {tm(t)}</button>)}</div>
      : <select className="pc-in" aria-label="Tag für die Übersicht" value={stich} onChange={(ev) => setPoolTag(ev.target.value)}>{tageZr.map((t) => <option key={t} value={t}>{wtKurz(t)} {tm(t)}</option>)}</select>
  );

  const pool = !darf ? null : ohne === 'r' ? (
    <section className="pc-karte dispo-pool" aria-label="Wer und was ist frei?">
      <div className="pk-reihe" style={{ justifyContent: 'space-between' }}>
        <h2>{e.tab === 'g' ? 'Welche Geräte sind frei?' : e.tab === 'nu' ? 'Welche Nachunternehmer sind frei?' : 'Wer ist frei?'} <span className="klein">· {wtKurz(stich)} {tm(stich)}</span></h2>
        {tagWahl}
      </div>
      <span className="klein">Ziehen und in der Tabelle ablegen, oder anklicken und dann auf „+ hier“ klicken. Auf den Namen der Baustelle ablegen = an allen Tagen im Zeitraum. Eine eingeteilte Pille lässt sich verschieben; mit gedrückter Strg-Taste wird sie kopiert.</span>
      {e.tab === 'p' && (
        <div><strong className="klein">Ganze Kolonne</strong><br />
          {poliere.map((p) => { const k = kolonne(p.id, stich); const z: Zug = { typ: 'kolonne', polierId: p.id }; return <PoolPille key={p.id} klasse="kolonne" gesperrt={!k.length} an={istGewaehlt(z)} titel={k.map((id) => voll(person(d, id))).join(', ')} onClick={() => waehle(z)} zieh={k.length ? ziehbar(z, `Kolonne ${voll(p)}`) : {}}>Kolonne {p.nachname} <span className="klein">· {k.length} Personen</span></PoolPille>; })}
        </div>
      )}
      {gruppenImPool.map((g) => {
        const f = e.tab === 'nu' ? d.firmen.find((x) => x.name === g) : undefined;
        const ug = f?.unterlagen.filter((u) => u.status === 'abgelaufen' || u.status === 'fehlt').length ?? 0;
        const liste = sortiert(alleRes.filter((r) => r.gruppe === g && (!e.nurFreie || leer(r, stich))));
        if (!liste.length) return null;
        return (
          <div key={g}><strong className="klein">{g} · {liste.length}{f ? <> · <span className={ug ? 'rot-text' : ''}>Unterlagen {ug ? `${ug} ungültig` : 'in Ordnung'}</span></> : null}</strong><br />
            {liste.map((r) => { const z: Zug = { typ: 'res', art: r.art, id: r.id }; const st = poolStatus(r); return <PoolPille key={r.id} klasse={st === 'frei' ? 'ist-frei' : ''} an={istGewaehlt(z)} titel={r.warn} onClick={() => waehle(z)} zieh={ziehbar(z, r.name)}>{r.warn ? '! ' : ''}{r.kurz} <span className="klein">· {st}</span></PoolPille>; })}
          </div>
        );
      })}
      {e.tab === 'nu' && <Link to="/pc/nu" className="link klein">Helfer oder Lohnleister anlegen ›</Link>}
      {wahl && <div className="meldung blau">Ausgewählt: <strong>{wahlText}</strong>. Jetzt in der Tabelle auf „+ hier“ klicken. <button type="button" className="link" onClick={() => setWahl(undefined)}>Auswahl aufheben</button></div>}
    </section>
  ) : ohne === 'b' ? (
    <section className="pc-karte dispo-pool" aria-label="Baustellen">
      <h2>Baustellen</h2>
      <span className="klein">Baustelle ziehen und bei {e.tab === 'g' ? 'Gerät' : 'Person'} und Tag ablegen, oder anklicken und dann auf „+ hier“ klicken. Auf den Namen ablegen = an allen Tagen im Zeitraum.</span>
      <div>{bsGefiltert.map((b) => { const z: Zug = { typ: 'bs', id: b.id }; return <PoolPille key={b.id} an={istGewaehlt(z)} onClick={() => waehle(z)} zieh={ziehbar(z, b.kst)}><strong>{b.kst}</strong> <span className="klein">{b.strasse}</span></PoolPille>; })}</div>
      {wahl && <div className="meldung blau">Ausgewählt: <strong>{wahlText}</strong>. Jetzt in der Tabelle auf „+ hier“ klicken. <button type="button" className="link" onClick={() => setWahl(undefined)}>Auswahl aufheben</button></div>}
    </section>
  ) : (
    <div className="meldung blau">Ein Klick in ein Feld teilt {e.tab === 'g' ? 'das Gerät' : 'die Person'} an diesem Tag dort ein (von einer anderen Baustelle wird umgesetzt). Ein Klick auf ✓ nimmt die Einteilung wieder heraus.</div>
  );

  const ansichtText: Record<Ansicht, string> = { bt: 'Baustellen × Tage', rt: `${resWort} × Tage`, br: `Baustellen × ${resWort} (ein Tag)` };
  const zaehl = (tab: Tab) => resVon(tab).length;

  return (
    <PcSeite titel="Disposition" pfad={`Mitarbeiter, Nachunternehmer und Geräte auf Baustellen einteilen · ${darf ? 'bedienen: Oberbauleitung und Bauleitung' : 'nur lesen'}`} rechts={
      <div className="pk-reihe">
        <Pk onClick={() => schritt(-1)} titel="zurück">‹</Pk>
        <strong>{zrText}</strong>
        <Pk onClick={() => schritt(1)} titel="vor">›</Pk>
        <Pk klein onClick={() => { setAnker(d.heute); setPoolTag(d.heute); }}>Heute</Pk>
        {darf && <Pk farbe="blau" gesperrt={!geaendert} onClick={() => { a.dispoSenden(); zeige('Änderungen gesendet. Die betroffenen Personen mit App haben eine Mitteilung bekommen, die anderen informiert der Polier.'); }}>Änderungen senden{geaendert ? ` (${geaendert})` : ''}</Pk>}
      </div>}>
      {toast}
      {offeneNachrichten.map((n) => (
        <div key={n.id} className="meldung blau" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <span><strong>Nachricht vom Polier</strong> · {kurzName(person(d, n.von))}{n.baustelleId ? ` (${baustelle(d, n.baustelleId)?.kst})` : ''}, {n.zeit.slice(0, 10) === d.heute ? 'heute' : tm(n.zeit.slice(0, 10))} {uhr(n.zeit)}: „{n.text}“</span>
          {darf && <Pk klein onClick={() => a.nachrichtErledigt(n.id)}>✓ Erledigt</Pk>}
        </div>
      ))}

      <section className="pc-karte dispo-steuerung" aria-label="Ansicht">
        <div className="pk-reihe" style={{ justifyContent: 'space-between' }}>
          <Reiter label="Was einteilen" wert={e.tab} setWert={(tab) => setz({ tab, gruppe: '' })} optionen={[
            { wert: 'p', text: <>Personal <span className="klein">{zaehl('p')}</span></> },
            { wert: 'nu', text: <>Nachunternehmer <span className="klein">{zaehl('nu')}</span></> },
            { wert: 'g', text: <>Geräte <span className="klein">{zaehl('g')}</span></> },
          ]} />
          {ohne !== 't' && <Reiter label="Zeitraum" wert={e.zr} setWert={(zr) => setz({ zr })} optionen={[
            { wert: 'tag', text: 'Tag' }, { wert: 'woche', text: 'Woche' }, { wert: '2w', text: '2 Wochen' }, { wert: 'monat', text: 'Monat' },
          ]} />}
        </div>
        <div className="pk-reihe">
          <Reiter label="Ansicht" wert={e.ansicht} setWert={(ansicht) => setz({ ansicht, tausch: false })} optionen={(['bt', 'rt', 'br'] as Ansicht[]).map((w) => ({ wert: w, text: ansichtText[w] }))} />
          <Pk klein titel="Zeilen und Spalten tauschen" onClick={() => setz({ tausch: !e.tausch })}>⇄ Achsen tauschen</Pk>
          <span className="klein">Zeilen: <strong>{dimText(zDim)}</strong> · Spalten: <strong>{dimText(sDim)}</strong>{ohne === 't' ? ` · ${wtKurz(stich)} ${tm(stich)}` : ''}</span>
        </div>
        <div className="pk-reihe dispo-filter">
          {hatEigene && <label className="klein"><input type="checkbox" checked={e.nurMeine} onChange={(ev) => setz({ nurMeine: ev.target.checked })} /> nur meine Baustellen</label>}
          <select className="pc-in" aria-label="Polier" value={e.polier} onChange={(ev) => setz({ polier: ev.target.value })}>
            <option value="">alle Poliere</option>
            {poliere.map((p) => <option key={p.id} value={p.id}>Polier {voll(p)}</option>)}
          </select>
          <select className="pc-in" aria-label={e.tab === 'nu' ? 'Firma' : e.tab === 'g' ? 'Art' : 'Qualifikation'} value={e.gruppe} onChange={(ev) => setz({ gruppe: ev.target.value })}>
            <option value="">{e.tab === 'nu' ? 'alle Firmen' : e.tab === 'g' ? 'alle Arten' : 'alle Qualifikationen'}</option>
            {gruppenOrdnung.filter((g) => alleRes.some((r) => r.gruppe === g)).map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <label className="klein"><input type="checkbox" checked={e.nurFreie} onChange={(ev) => setz({ nurFreie: ev.target.checked })} /> nur Freie</label>
          <label className="klein"><input type="checkbox" checked={e.alleBs} onChange={(ev) => setz({ alleBs: ev.target.checked })} /> auch Baustellen ohne Einteilung</label>
        </div>
      </section>

      {konflikte.length > 0 && (
        <details className="meldung rot">
          <summary><strong>{konflikte.length} Konflikt{konflikte.length > 1 ? 'e' : ''}</strong> im Zeitraum (abwesend, aber eingeteilt oder NU-Unterlagen ungültig)</summary>
          <ul>{konflikte.slice(0, 30).map((k) => <li key={k}>{k}</li>)}</ul>
        </details>
      )}
      {umsetzen.length > 0 && (
        <details className="meldung orange">
          <summary><strong>{umsetzen.length}× Umsetzen nötig</strong> · Gerät wechselt am nächsten Arbeitstag die Baustelle</summary>
          <ul>{umsetzen.map((k) => <li key={k}>{k}</li>)}</ul>
        </details>
      )}

      {ohne === 't' && pool}
      <div className={darf && ohne !== 't' ? 'dispo-arbeit' : undefined}>
      {ohne !== 't' && pool}
      {zKeys.length === 0 || sKeys.length === 0 ? (
        <div className="meldung">Keine Einträge für diese Auswahl. {zDim === 'b' || sDim === 'b' ? 'Mit „auch Baustellen ohne Einteilung“ erscheinen alle Baustellen.' : 'Filter lockern.'}</div>
      ) : (
        <div className="tab-wrap">
          <div className={`woche-raster dispo-raster${kompakt ? ' kompakt' : ''}`} style={{ gridTemplateColumns: spalten, minWidth: minBreite }}>
            <div className="kz ecke">{dimText(zDim)} ↓ · {dimText(sDim)} →</div>
            {sKeys.map((sk) => <div key={sk} className={`kz${sDim === 't' && sk === d.heute ? ' heute' : ''}`} {...kopfAblage(sDim, sk)} data-ziel={ueber === `k-${sk}` ? 'ja' : undefined}>{kopf(sDim, sk, false)}</div>)}
            <div className="kz">Summe</div>
            {zeilenMitGruppen}
            <div className="kz">Summe</div>
            {sKeys.map((sk) => <div key={sk} className="summe fuss">{summe(sDim, sk, zDim, zKeys)}</div>)}
            <div className="summe fuss" />
          </div>
        </div>
      )}
      </div>

      <section className="pc-karte">
        <span className="klein"><strong>Legende:</strong> <span className="dispo-pill">★ Name</span> Ansprechpartner · <span className="dispo-pill">Name</span> eigene Mitarbeiter · <span className="dispo-pill nu">Name</span> Nachunternehmer · <span className="dispo-pill warn">! Name</span> NU mit ungültigen Unterlagen oder fehlender Mindestlohn-Unterschrift · <span className="dispo-pill konflikt">Name</span> eingeteilt, aber abwesend · <span className="dispo-pill geraet">Gerät ↦</span> Gerät muss am nächsten Arbeitstag umgesetzt werden · <span className="dispo-pill neu">Name</span> geändert, noch nicht gesendet · <span className="dispo-pill">Name · VM</span> nur vormittags</span>
        <span className="klein">Summen: {einheit} je Baustelle, eingeteilte und freie {wort} je Tag, Auslastung je {e.tab === 'g' ? 'Gerät' : 'Person'} (eingeteilt / verfügbare Arbeitstage). Abwesenheiten (Urlaub, krank) kommen automatisch aus der App oder aus <Link className="link" to="/pc/abwesenheiten">Abwesenheiten</Link>. Mit „Änderungen senden“ bekommen die betroffenen Personen mit App eine Mitteilung; wer kein Smartphone hat, wird über den Polier informiert.</span>
      </section>
    </PcSeite>
  );
}

