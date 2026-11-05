// 11: Baustellen · 12: Baustellenarchiv · 13: Projektkosten (Entwurf V1)

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PcSeite, Pill, Pk, Reiter, h1, useToast, zahlDe } from '../../components/Pc';
import { useDaten } from '../../domain/store';
import { bsLang, nachtragSumme, person, rechnung, voll } from '../../domain/sel';
import { euro, monatName, monatVon, tmj } from '../../domain/zeit';
import type { Baustelle, Daten, Kosten4, KostenMonat } from '../../domain/types';

/** offene Tage auf einer Baustelle (nicht freigegeben oder nicht übernommen) */
export function offeneTage(d: Daten, b: Baustelle) {
  return d.tage.filter((t) => !(t.status === 'freigegeben' && t.uebernommen) && rechnung(d, t.personId, t.datum).abschnitte.some((x) => x.baustelleId === b.id)).length;
}

/** Stunden auf einer Baustelle in einem Monat (aus den Abschnitten) */
export function stundenImMonat(d: Daten, b: Baustelle, monat: string, nurFrei = false) {
  let min = 0;
  for (const t of d.tage) {
    if (monatVon(t.datum) !== monat || t.status === 'offen' || (nurFrei && t.status !== 'freigegeben')) continue;
    if (person(d, t.personId)?.rolle === 'nu') continue;
    for (const ab of rechnung(d, t.personId, t.datum).abschnitte) if (ab.baustelleId === b.id) min += ab.min;
  }
  return min / 60;
}

const mitarbeiterMit = (d: Daten, rollen: string[]) => d.personen.filter((p) => rollen.includes(p.rolle));

// ------------------------------------------------------------------ Baustellen

type Sortierung = 'kst' | 'adr' | 'bl';

export function PcBaustellen() {
  const { d, a } = useDaten();
  const [suche, setSuche] = useState('');
  const [neu, setNeu] = useState(false);
  const [sort, setSort] = useState<Sortierung>('kst');
  const [frage, setFrage] = useState<string>();
  const [toast, zeige] = useToast();
  const [letzte, setLetzte] = useState<string>();
  const liste = d.baustellen.filter((b) => !b.archiviert && `${b.kst} ${b.strasse} ${b.plzOrt} ${b.massnahme ?? ''}`.toLowerCase().includes(suche.trim().toLowerCase()))
    .sort((x, y) => sort === 'kst' ? y.kst.localeCompare(x.kst) : sort === 'adr' ? x.strasse.localeCompare(y.strasse) : voll(person(d, x.bauleitungId)).localeCompare(voll(person(d, y.bauleitungId))));
  const poliere = mitarbeiterMit(d, ['polier']);
  const vorarbeiter = mitarbeiterMit(d, ['vorarbeiter']);
  const bl = mitarbeiterMit(d, ['bauleitung']);
  const fb = frage ? d.baustellen.find((b) => b.id === frage)! : undefined;
  return (
    <PcSeite titel="Baustellen" pfad={`Baustellen › Aktuelle Kostenstellen · Stand ${tmj(d.heute)}`} rechts={<div className="pk-reihe"><Link className="pk" to="/pc/archiv">Zum Archiv</Link><Pk farbe="blau" onClick={() => setNeu(true)}>Baustelle anlegen</Pk></div>}>
      {toast}
      {letzte && <div className="meldung gruen" role="status">Baustelle archiviert. <button type="button" className="link" onClick={() => { a.archivieren(letzte, false); setLetzte(undefined); }}>Rückgängig</button></div>}
      {neu && <Anlegen onFertig={(t) => { setNeu(false); if (t) zeige(t); }} />}
      {fb && (
        <div className="meldung orange" role="alertdialog" aria-label="Archivieren">
          Baustelle {fb.kst} {fb.strasse} archivieren? Sie ist danach in der App nicht mehr wählbar. Stunden und Zuschläge bleiben erhalten.
          <div className="pk-reihe" style={{ marginTop: 8 }}><Pk onClick={() => setFrage(undefined)}>Abbrechen</Pk><Pk farbe="blau" onClick={() => { a.archivieren(fb.id, true); setLetzte(fb.id); setFrage(undefined); }}>Ja, archivieren</Pk></div>
        </div>
      )}
      <div className="pk-reihe"><input className="pc-in" style={{ minWidth: 280 }} aria-label="Suchen" placeholder="Suchen (Kostenstelle, Adresse, Maßnahme)" value={suche} onChange={(e) => setSuche(e.target.value)} />
        <Reiter label="Sortierung" wert={sort} setWert={setSort} optionen={[{ wert: 'kst', text: 'Kostenstelle' }, { wert: 'adr', text: 'Adresse' }, { wert: 'bl', text: 'Bauleiter' }]} /></div>
      <div className="tab-wrap"><table className="tabelle">
        <thead><tr><th>Kst.</th><th>Adresse</th><th>Baumaßnahme</th><th>Bauleiter</th><th>Polier</th><th>Vorarbeiter</th><th>Ortung</th><th>Archiv</th></tr></thead>
        <tbody>
          {liste.map((b) => {
            const offen = offeneTage(d, b);
            const va = d.rollenJeBaustelle.find((r) => r.baustelleId === b.id && r.rolle === 'vorarbeiter')?.personId;
            return (
              <tr key={b.id}>
                <td className="mono"><strong>{b.kst}</strong></td>
                <td>{b.strasse}<br /><span className="klein">{b.plzOrt}</span></td>
                <td>{b.massnahme ?? '–'}</td>
                <td><select className="pc-in" aria-label={`Bauleiter ${b.kst}`} value={b.bauleitungId} onChange={(e) => a.baustelleAendern(b.id, { bauleitungId: e.target.value })}>{bl.map((p) => <option key={p.id} value={p.id}>{voll(p)}</option>)}</select></td>
                <td><select className="pc-in" aria-label={`Polier ${b.kst}`} value={b.polierId ?? ''} onChange={(e) => a.baustelleAendern(b.id, { polierId: e.target.value || undefined })}><option value="">–</option>{poliere.map((p) => <option key={p.id} value={p.id}>{voll(p)}</option>)}</select></td>
                <td><select className="pc-in" aria-label={`Vorarbeiter ${b.kst}`} value={va ?? ''} onChange={(e) => { if (va) a.rolleJeBaustelle(va, b.id, 'vorarbeiter', false); if (e.target.value) a.rolleJeBaustelle(e.target.value, b.id, 'vorarbeiter', true); }}><option value="">–</option>{[...vorarbeiter, ...mitarbeiterMit(d, ['facharbeiter'])].map((p) => <option key={p.id} value={p.id}>{voll(p)}</option>)}</select></td>
                <td>{b.ortung ? '✓' : 'ohne'}</td>
                <td><Pk klein gesperrt={offen > 0} titel={offen ? `${offen} Tage noch offen` : undefined} onClick={() => setFrage(b.id)}>Archivieren</Pk>{offen > 0 && <><br /><span className="klein">{offen} Tage offen · <Link className="link" to="/pc/stunden">Stunden</Link></span></>}</td>
              </tr>
            );
          })}
          {!liste.length && <tr><td colSpan={8} className="klein">Keine Baustelle gefunden.</td></tr>}
        </tbody>
      </table></div>
      <section className="pc-karte">
        <span className="text"><strong>Ortung:</strong> „✓“ = Die App ermittelt aus der Adresse die Koordinaten und prüft den Standort bei Start, Pause, Wechsel und Ende. „ohne“ = Kostenstelle ohne festen Ort (Regie, Kleinaufträge, Gewährleistung). Gespeichert wird nur das Ergebnis des Vergleichs, nie der Ort selbst. Angestellte werden nicht geortet.</span>
        <span className="text"><strong>Archiv:</strong> Eine Baustelle lässt sich erst archivieren, wenn alle Tage freigegeben und von der Verwaltung übernommen sind.</span>
      </section>
    </PcSeite>
  );
}

function Anlegen({ onFertig }: { onFertig: (t?: string) => void }) {
  const { d, a } = useDaten();
  const [f, setF] = useState({ kst: '', str: '', plz: '', ort: '', bl: '', polier: '', ortung: true, m: '' });
  const [versucht, setVersucht] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });
  const fehler: Partial<Record<keyof typeof f, string>> = {};
  if (!f.kst) fehler.kst = 'Bitte Kostenstelle eintragen.';
  else if (!/^\d{3,5}$/.test(f.kst)) fehler.kst = 'Nur Ziffern, 3 bis 5 Stellen.';
  else { const da = d.baustellen.find((b) => b.kst === f.kst); if (da) fehler.kst = da.archiviert ? `${f.kst} liegt im Archiv.` : `${f.kst} ist schon vergeben.`; }
  if (!f.str.trim()) fehler.str = 'Bitte Straße und Hausnummer eintragen.';
  if (!/^\d{5}$/.test(f.plz)) fehler.plz = 'Bitte PLZ (5 Ziffern) eintragen.';
  if (!f.ort.trim()) fehler.ort = 'Bitte Ort eintragen.';
  if (!f.bl) fehler.bl = 'Bitte Bauleiter wählen.';
  const feld = (k: keyof typeof f, label: string, extra?: object) => (
    <label className="pc-feld"><span>{label}</span><input value={String(f[k])} onChange={(e) => set(k, e.target.value)} aria-invalid={versucht && !!fehler[k]} {...extra} />{versucht && fehler[k] && <span className="klein" style={{ color: 'var(--rot-text)' }}>{fehler[k]}</span>}</label>
  );
  return (
    <section className="pc-karte" style={{ borderColor: 'var(--blau)' }} aria-label="Baustelle anlegen">
      <h2>Baustelle anlegen</h2>
      <span className="klein">Pflichtfelder: Kostenstelle, Straße und Hausnummer, PLZ, Ort, Bauleiter. Baumaßnahme und Polier sind freiwillig.</span>
      <div className="pc-formular">
        {feld('kst', 'Kostenstelle', { inputMode: 'numeric' })}{feld('str', 'Straße und Hausnummer')}{feld('plz', 'PLZ', { inputMode: 'numeric' })}{feld('ort', 'Ort')}
        <label className="pc-feld"><span>Bauleiter</span><select value={f.bl} onChange={(e) => set('bl', e.target.value)}><option value="">– bitte wählen –</option>{mitarbeiterMit(d, ['bauleitung']).map((p) => <option key={p.id} value={p.id}>{voll(p)}</option>)}</select>{versucht && fehler.bl && <span className="klein" style={{ color: 'var(--rot-text)' }}>{fehler.bl}</span>}</label>
        <label className="pc-feld"><span>Polier (freiwillig)</span><select value={f.polier} onChange={(e) => set('polier', e.target.value)}><option value="">–</option>{mitarbeiterMit(d, ['polier']).map((p) => <option key={p.id} value={p.id}>{voll(p)}</option>)}</select></label>
        <label className="pc-feld"><span>Ortung</span><select value={f.ortung ? 'ja' : 'nein'} onChange={(e) => set('ortung', e.target.value === 'ja')}><option value="ja">ja, über die Adresse</option><option value="nein">ohne festen Ort</option></select></label>
        <label className="pc-feld" style={{ gridColumn: '1 / -1' }}><span>Baumaßnahme (freiwillig)</span><input value={f.m} onChange={(e) => set('m', e.target.value)} /></label>
      </div>
      <span className="klein">So heißt die Baustelle überall: <strong>{f.kst || '[Kostenstelle]'} - {f.str || '[Straße]'}, {f.plz || '[PLZ]'} {f.ort || '[Ort]'}</strong></span>
      <div className="pk-reihe"><Pk onClick={() => onFertig()}>Abbrechen</Pk><Pk farbe="blau" onClick={() => {
        setVersucht(true);
        if (Object.keys(fehler).length) return;
        a.baustelleAnlegen({ kst: f.kst, strasse: f.str.trim(), plzOrt: `${f.plz} ${f.ort.trim()}`, bauleitungId: f.bl, polierId: f.polier || undefined, ortung: f.ortung, massnahme: f.m.trim() || undefined });
        onFertig(`Baustelle angelegt: ${f.kst} - ${f.str.trim()}. Sie ist ab sofort in der App wählbar.`);
      }}>Baustelle anlegen</Pk></div>
    </section>
  );
}

// ------------------------------------------------------------------ Archiv

export function PcArchiv() {
  const { d, a } = useDaten();
  const [suche, setSuche] = useState('');
  const [toast, zeige] = useToast();
  const liste = d.baustellen.filter((b) => b.archiviert && `${b.kst} ${b.strasse} ${b.plzOrt}`.toLowerCase().includes(suche.toLowerCase()));
  return (
    <PcSeite titel="Baustellenarchiv" pfad="Baustellen › Archiv · abgeschlossene Kostenstellen">
      {toast}
      <div className="pk-reihe"><input className="pc-in" style={{ minWidth: 280 }} aria-label="Im Archiv suchen" placeholder="Im Archiv suchen" value={suche} onChange={(e) => setSuche(e.target.value)} /><span className="klein">{liste.length} Baustellen im Archiv</span></div>
      <div className="tab-wrap"><table className="tabelle">
        <thead><tr><th>Kst.</th><th>Adresse</th><th>Baumaßnahme</th><th>Bauleiter</th><th>Abgeschlossen</th><th /></tr></thead>
        <tbody>
          {liste.map((b) => <tr key={b.id}><td className="mono">{b.kst}</td><td>{b.strasse}, {b.plzOrt}</td><td>{b.massnahme ?? '–'}</td><td>{voll(person(d, b.bauleitungId))}</td><td>{tmj(b.archiviert!)}</td><td><Pk klein onClick={() => { a.archivieren(b.id, false); zeige(`${b.kst} ist wieder in der aktiven Liste.`); }}>Wiederherstellen</Pk></td></tr>)}
          {!liste.length && <tr><td colSpan={6} className="klein">Nichts gefunden.</td></tr>}
        </tbody>
      </table></div>
      <section className="pc-karte"><span className="text">Archivierte Baustellen erscheinen nicht mehr in der Baustellenauswahl der Mitarbeiter. Stunden und Zuschläge bleiben erhalten und sind weiter auswertbar. Mit „Wiederherstellen“ kommt eine Baustelle zurück in die aktive Liste, z. B. für Gewährleistungsarbeiten.</span></section>
    </PcSeite>
  );
}

// ------------------------------------------------------------------ Projektkosten

const ARTEN: { k: keyof Kosten4; t: string }[] = [{ k: 'lohn', t: 'Lohn' }, { k: 'material', t: 'Material' }, { k: 'geraete', t: 'Geräte' }, { k: 'nu', t: 'Nachunternehmer' }];
const summe = (k: Kosten4) => k.lohn + k.material + k.geraete + k.nu;
const ampel = (pct: number): { t: string; f: 'gruen' | 'orange' | 'rot' } => pct > 100 ? { t: 'über Soll', f: 'rot' } : pct >= 80 ? { t: 'Achtung: ab 80 %', f: 'orange' } : { t: 'im Rahmen', f: 'gruen' };

export function PcProjektkosten() {
  const { d, a, ich } = useDaten();
  const sichtbar = d.baustellen.filter((b) => b.ursprungsSoll !== undefined || !b.archiviert).filter((b) => ich?.rolle !== 'bauleitung' || b.bauleitungId === ich.id);
  const [bid, setBid] = useState(sichtbar[0]?.id);
  const b = d.baustellen.find((x) => x.id === bid) ?? sichtbar[0];
  const [toast, zeige] = useToast();
  const darfNachtrag = ich?.rolle === 'bauleitung' || ich?.rolle === 'gl';
  const darfBuchen = ['buero', 'gl', 'einkauf'].includes(ich?.rolle ?? '');
  const darfSoll = ['gl', 'oberbauleitung', 'buero'].includes(ich?.rolle ?? '');

  const nt = d.nachtraege.filter((n) => n.baustelleId === b?.id);
  const ml = (m: string) => d.mittellohn[m] ?? d.mittellohn[monatVon(d.heute)] ?? 63.5;
  const monate = useMemo(() => (b?.kostenMonate ?? []).map((m) => {
    const vorl = m.status !== 'abgeschlossen';
    const lohn = vorl ? Math.round(stundenImMonat(d, b!, m.monat) * ml(m.monat)) + (m.lohn || 0) : m.lohn;
    return { ...m, lohn, vorl };
  }), [d, b]);

  if (!b) return <PcSeite titel="Projektkosten"><span>Keine Baustelle.</span></PcSeite>;
  const urs = b.ursprungsSoll;
  const nachSoll: Kosten4 = { lohn: 0, material: 0, geraete: 0, nu: 0 };
  for (const n of nt) if (n.status === 'beauftragt') for (const x of ARTEN) nachSoll[x.k] += n[x.k];
  const ist: Kosten4 = { lohn: 0, material: 0, geraete: 0, nu: 0 };
  for (const m of monate) for (const x of ARTEN) ist[x.k] += m[x.k];
  const soll = urs ? { lohn: urs.lohn + nachSoll.lohn, material: urs.material + nachSoll.material, geraete: urs.geraete + nachSoll.geraete, nu: urs.nu + nachSoll.nu } : undefined;
  const pct = soll ? (summe(ist) / summe(soll)) * 100 : 0;
  const amp = ampel(pct);
  const wartet = monate.filter((m) => m.status === 'wartet');
  const offenNt = nt.filter((n) => n.status === 'angeboten');

  return (
    <PcSeite titel="Projektkosten: Soll und Ist" pfad="Baustellen › Projektkosten · alle Beträge netto" rechts={
      <label className="pc-feld"><span>Baustelle</span><select value={b.id} onChange={(e) => setBid(e.target.value)}>{sichtbar.map((x) => <option key={x.id} value={x.id}>{bsLang(x)}{x.archiviert ? ' (Archiv)' : ''}</option>)}</select></label>}>
      {toast}
      <span className="klein">{b.massnahme ?? ''} · Bauleiter {voll(person(d, b.bauleitungId))} · Stand {tmj(d.heute)}</span>
      {!soll ? (
        <div className="meldung orange"><strong>Noch keine Zielvorgaben.</strong> Für diese Baustelle ist noch kein Soll eingetragen. Die Arbeitsvorbereitung trägt unten das Ursprungs-Soll aus der Auftragskalkulation ein.</div>
      ) : (
        <div className="pc-raster">
          <div className="kpi"><span className="bez">Soll aktuell</span><span className="wert">{euro(summe(soll))}</span><span className="klein">Ursprung {euro(summe(urs!))} + Nachträge {euro(summe(nachSoll))}</span></div>
          <div className="kpi"><span className="bez">Ist gesamt</span><span className="wert">{euro(summe(ist))}</span><span className="klein">{monate.some((m) => m.vorl) ? 'davon vorläufig: laufende Monate' : 'alle Monate abgeschlossen'}</span></div>
          <div className="kpi"><span className="bez">{summe(soll) - summe(ist) >= 0 ? 'Rest' : 'Überschreitung'}</span><span className="wert">{euro(Math.abs(summe(soll) - summe(ist)))}</span><span className="klein">Soll minus Ist</span></div>
          <div className="kpi"><span className="bez">Verbraucht vom Soll</span><span className="wert">{Math.round(pct)} %</span><Pill farbe={amp.f}>{amp.t}</Pill></div>
        </div>
      )}
      {wartet.length > 0 && <div className="meldung orange"><strong>{wartet.map((m) => monatName(m.monat)).join(', ')}: Lohn noch vorläufig.</strong> Der Monat wartet auf den Lohnwert aus der Lohnabrechnung. Bis dahin wird mit Stunden × Mittellohn ({euro2s(ml(wartet[0].monat))} €/h) gerechnet.</div>}

      {soll && (
        <section className="pc-karte">
          <h2>Übersicht: Soll und Ist in vier Kostenarten</h2>
          <div className="tab-wrap"><table className="tabelle">
            <thead><tr><th>Kostenart</th><th className="r">Ursprungs-Soll</th><th className="r">Nachträge</th><th className="r">Soll aktuell</th><th className="r">Ist</th><th className="r">Rest</th><th>Verbraucht</th></tr></thead>
            <tbody>
              {ARTEN.map((x) => { const p = soll[x.k] ? (ist[x.k] / soll[x.k]) * 100 : 0; const am = ampel(p); return (
                <tr key={x.k}><td>{x.t}</td><td className="r">{euro(urs![x.k])}</td><td className="r">{euro(nachSoll[x.k])}</td><td className="r">{euro(soll[x.k])}</td><td className="r">{euro(ist[x.k])}</td><td className="r">{euro(soll[x.k] - ist[x.k])}</td>
                  <td style={{ minWidth: 160 }}><div className="balken"><span className={am.f === 'gruen' ? '' : am.f} style={{ width: `${Math.min(100, p)}%` }} /></div><span className="klein">{Math.round(p)} % · {am.t}</span></td></tr>
              ); })}
              <tr><td><strong>Summe</strong></td><td className="r"><strong>{euro(summe(urs!))}</strong></td><td className="r"><strong>{euro(summe(nachSoll))}</strong></td><td className="r"><strong>{euro(summe(soll))}</strong></td><td className="r"><strong>{euro(summe(ist))}</strong></td><td className="r"><strong>{euro(summe(soll) - summe(ist))}</strong></td><td><Pill farbe={amp.f}>{amp.t}</Pill></td></tr>
            </tbody>
          </table></div>
          {offenNt.length > 0 && <span className="klein">Nachträge noch offen (angeboten, noch nicht beauftragt): {offenNt.map((n) => `${n.nr} ${euro(nachtragSumme(n))}`).join(', ')}</span>}
          <span className="klein">Ampel: „im Rahmen“ = unter 80 % · „Achtung: ab 80 %“ = 80 bis 100 % · „über Soll“ = mehr als 100 %. Dieselben Wörter sieht der Polier in seiner App. Der Wert sagt nichts über den Baufortschritt.</span>
        </section>
      )}

      <UrsprungsSoll key={b.id + 'u'} b={b} darf={darfSoll} onSpeichern={(k) => { a.ursprungsSollSetzen(b.id, k); zeige('Ursprungs-Soll gespeichert.'); }} />
      <Nachtraege key={b.id + 'n'} b={b} darf={darfNachtrag} zeige={zeige} />

      <section className="pc-karte">
        <h2>Ist: Monate</h2>
        <div className="tab-wrap"><table className="tabelle">
          <thead><tr><th>Monat</th><th>Status</th><th className="r">Stunden</th><th className="r">Lohn</th><th className="r">Material</th><th className="r">Geräte</th><th className="r">NU</th><th className="r">Summe</th><th /></tr></thead>
          <tbody>{monate.slice().reverse().map((m) => (
            <tr key={m.monat}><td>{monatName(m.monat)}</td><td><Pill farbe={m.status === 'abgeschlossen' ? 'gruen' : m.status === 'wartet' ? 'orange' : 'blau'}>{m.status === 'abgeschlossen' ? 'abgeschlossen' : m.status === 'wartet' ? 'wartet auf Lohnwert' : 'läuft'}</Pill></td>
              <td className="r">{m.vorl ? h1(stundenImMonat(d, b, m.monat)) : '–'}</td><td className="r">{euro(m.lohn)}{m.vorl && <span className="klein"> vorl.</span>}</td><td className="r">{euro(m.material)}</td><td className="r">{euro(m.geraete)}</td><td className="r">{euro(m.nu)}</td><td className="r">{euro(summe(m))}</td>
              <td>{m.status === 'wartet' && darfBuchen && <MonatAbschliessen m={m} vorschlag={m.lohn} onOk={(lohn) => { a.kostenMonatSetzen(b.id, m.monat, { status: 'abgeschlossen', lohn }); zeige(`${monatName(m.monat)} abgeschlossen.`); }} />}</td></tr>
          ))}</tbody>
        </table></div>
        <Mittellohn darf={darfBuchen} />
      </section>
      <Rechnungen key={b.id + 'r'} b={b} darf={darfBuchen} zeige={zeige} />
    </PcSeite>
  );
}

const euro2s = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function UrsprungsSoll({ b, darf, onSpeichern }: { b: Baustelle; darf: boolean; onSpeichern: (k: Kosten4) => void }) {
  const leer = !b.ursprungsSoll;
  const [w, setW] = useState<Record<keyof Kosten4, string>>(() => Object.fromEntries(ARTEN.map((x) => [x.k, b.ursprungsSoll ? euro2s(b.ursprungsSoll[x.k]) : ''])) as Record<keyof Kosten4, string>);
  const zahl = (s: string) => (s.trim() === '' ? 0 : zahlDe(s));
  const ok = ARTEN.every((x) => !Number.isNaN(zahl(w[x.k])) && zahl(w[x.k]) >= 0);
  const k = Object.fromEntries(ARTEN.map((x) => [x.k, zahl(w[x.k])])) as unknown as Kosten4;
  return (
    <section className="pc-karte">
      <div className="pk-reihe" style={{ justifyContent: 'space-between' }}><h2>Ursprungs-Soll aus der Auftragskalkulation</h2><Pill farbe={leer ? 'orange' : 'gruen'}>{leer ? 'fehlt' : 'eingetragen'}</Pill></div>
      <div className="pc-formular">
        {ARTEN.map((x) => <label key={x.k} className="pc-feld"><span>{x.t} (€)</span><input inputMode="decimal" disabled={!darf} value={w[x.k]} aria-invalid={Number.isNaN(zahl(w[x.k]))} onChange={(e) => setW({ ...w, [x.k]: e.target.value })} /></label>)}
        <div className="kpi" style={{ border: 0, padding: 0 }}><span className="bez">Summe Ursprungs-Soll</span><span className="wert">{ok ? euro(summe(k)) : '–'}</span></div>
      </div>
      {!ok && <span className="klein" style={{ color: 'var(--rot-text)' }}>Bitte Beträge als Zahl eingeben, z. B. 412.000,00.</span>}
      <span className="klein">Einmal je Baustelle aus der Auftragskalkulation eintragen. Änderungen am Auftrag laufen danach über Nachträge.{!darf && ' In dieser Ansicht nur lesen.'}</span>
      {darf && <div className="pk-reihe"><Pk farbe="blau" gesperrt={!ok} onClick={() => onSpeichern(k)}>Ursprungs-Soll speichern</Pk></div>}
    </section>
  );
}

function Nachtraege({ b, darf, zeige }: { b: Baustelle; darf: boolean; zeige: (t: string, f?: 'gruen' | 'orange' | 'rot' | 'blau') => void }) {
  const { d, a } = useDaten();
  const nt = d.nachtraege.filter((n) => n.baustelleId === b.id);
  const [neu, setNeu] = useState(false);
  const nr = `NT ${String(Math.max(0, ...nt.map((n) => Number(n.nr.replace(/\D/g, '')) || 0)) + 1).padStart(2, '0')}`;
  const [f, setF] = useState({ bez: '', datum: d.heute, status: 'angeboten' as 'angeboten' | 'beauftragt' | 'abgelehnt', lohn: '', material: '', geraete: '', nu: '', stunden: '' });
  const z = (s: string) => (s.trim() ? zahlDe(s) : 0);
  const fehler = !f.bez.trim() ? 'Bitte Bezeichnung eintragen.' : ARTEN.some((x) => Number.isNaN(z(f[x.k]))) ? 'Beträge bitte als Zahl.' : '';
  return (
    <section className="pc-karte">
      <div className="pk-reihe" style={{ justifyContent: 'space-between' }}><h2>Nachträge</h2>{darf && !neu && <Pk farbe="blau" onClick={() => setNeu(true)}>+ Nachtrag anlegen</Pk>}</div>
      <span className="klein">Zusätzliche und geänderte Leistungen, auch Minderungen. Nur „beauftragt“ zählt zum Soll. {darf ? 'Nachträge legen Bauleitung und Abrechnung an.' : 'In dieser Ansicht nur lesen.'}</span>
      {neu && (
        <div className="pc-karte" style={{ background: 'var(--grund)' }}>
          <strong>Nachtrag anlegen · nächste Nummer: {nr}</strong>
          <div className="pc-formular">
            <label className="pc-feld" style={{ gridColumn: '1 / -1' }}><span>Bezeichnung</span><input value={f.bez} onChange={(e) => setF({ ...f, bez: e.target.value })} /></label>
            <label className="pc-feld"><span>Datum</span><input type="date" value={f.datum} onChange={(e) => setF({ ...f, datum: e.target.value })} /></label>
            <label className="pc-feld"><span>Status</span><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as typeof f.status })}><option value="angeboten">angeboten</option><option value="beauftragt">beauftragt</option><option value="abgelehnt">abgelehnt</option></select></label>
            {ARTEN.map((x) => <label key={x.k} className="pc-feld"><span>{x.t} (€)</span><input inputMode="decimal" value={f[x.k]} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} /></label>)}
            <label className="pc-feld"><span>Stunden</span><input inputMode="decimal" value={f.stunden} onChange={(e) => setF({ ...f, stunden: e.target.value })} /></label>
          </div>
          <span className="klein">Betrag je Kostenart, leer = 0. Minderungen mit Minus eingeben, z. B. -3.500,00.</span>
          {fehler && f.bez && <span className="klein" style={{ color: 'var(--rot-text)' }}>{fehler}</span>}
          <div className="pk-reihe"><Pk onClick={() => setNeu(false)}>Abbrechen</Pk><Pk farbe="blau" gesperrt={!!fehler} onClick={() => {
            a.nachtragAnlegen({ baustelleId: b.id, nr, bezeichnung: f.bez.trim(), datum: f.datum, status: f.status, lohn: z(f.lohn), material: z(f.material), geraete: z(f.geraete), nu: z(f.nu), stunden: z(f.stunden) });
            setNeu(false); zeige(`${nr} gespeichert.`);
          }}>Nachtrag speichern</Pk></div>
        </div>
      )}
      <div className="tab-wrap"><table className="tabelle">
        <thead><tr><th>Nr.</th><th>Bezeichnung · Datum</th><th>Status</th><th className="r">Lohn</th><th className="r">Material</th><th className="r">Geräte</th><th className="r">Nachuntern.</th><th className="r">Summe</th></tr></thead>
        <tbody>
          {nt.map((n) => <tr key={n.id}><td className="mono">{n.nr}</td><td>{n.bezeichnung}<br /><span className="klein">{tmj(n.datum)}</span></td><td><Pill farbe={n.status === 'beauftragt' ? 'gruen' : n.status === 'angeboten' ? 'orange' : 'rot'}>{n.status}</Pill></td>{ARTEN.map((x) => <td key={x.k} className="r">{euro(n[x.k])}</td>)}<td className="r"><strong>{euro(nachtragSumme(n))}</strong></td></tr>)}
          {!nt.length && <tr><td colSpan={8} className="klein">Noch keine Nachträge erfasst.</td></tr>}
        </tbody>
      </table></div>
    </section>
  );
}

function MonatAbschliessen({ m, vorschlag, onOk }: { m: KostenMonat; vorschlag: number; onOk: (lohn: number) => void }) {
  const [offen, setOffen] = useState(false);
  const [w, setW] = useState(euro2s(vorschlag));
  if (!offen) return <Pk klein onClick={() => setOffen(true)}>Lohnwert eintragen</Pk>;
  const z = zahlDe(w);
  return <div className="pk-reihe"><input className="pc-in schmal" style={{ width: 120 }} aria-label={`Lohnwert ${m.monat}`} value={w} onChange={(e) => setW(e.target.value)} /><Pk klein farbe="blau" gesperrt={Number.isNaN(z) || z < 0} onClick={() => onOk(z)}>Abschließen</Pk></div>;
}

function Mittellohn({ darf }: { darf: boolean }) {
  const { d, a } = useDaten();
  const m = monatVon(d.heute);
  const [w, setW] = useState(euro2s(d.mittellohn[m] ?? 63.5));
  return (
    <div className="pk-reihe">
      <span className="text">Mittellohn {monatName(m)}: </span>
      {darf ? <><input className="pc-in schmal" aria-label="Mittellohn" value={w} onChange={(e) => setW(e.target.value)} /><span>€/h</span><Pk klein gesperrt={Number.isNaN(zahlDe(w))} onClick={() => a.mittellohnSetzen(m, zahlDe(w))}>Speichern</Pk></> : <strong>{euro2s(d.mittellohn[m] ?? 63.5)} €/h</strong>}
      <span className="klein">Für laufende Monate gilt: Stunden × Mittellohn (vorläufig), bis der Lohnwert aus der Lohnabrechnung eingetragen ist.</span>
    </div>
  );
}

function Rechnungen({ b, darf, zeige }: { b: Baustelle; darf: boolean; zeige: (t: string, f?: 'gruen' | 'orange' | 'rot' | 'blau') => void }) {
  const { d, a } = useDaten();
  const m = monatVon(d.heute);
  const [f, setF] = useState({ firma: '', nr: '', leistung: '', art: 'material' as 'material' | 'geraete' | 'nu', betrag: '', monat: m });
  const z = zahlDe(f.betrag);
  const ok = f.firma.trim() && f.nr.trim() && f.betrag && !Number.isNaN(z);
  const r = (b.rechnungen ?? []).slice().sort((x, y) => y.gebucht.localeCompare(x.gebucht));
  return (
    <section className="pc-karte">
      <h2>Rechnungen (Material, Geräte, Nachunternehmer)</h2>
      <div className="tab-wrap"><table className="tabelle">
        <thead><tr><th>Gebucht</th><th>Monat</th><th>Firma · Nr.</th><th>Leistung</th><th>Art</th><th className="r">Betrag</th><th>von</th></tr></thead>
        <tbody>{r.map((x) => <tr key={x.id}><td>{tmj(x.gebucht)}</td><td>{monatName(x.monat)}{x.nachbuchung && <><br /><Pill farbe="orange">Nachbuchung</Pill></>}</td><td>{x.firma}<br /><span className="klein mono">{x.nr}</span></td><td>{x.leistung}</td><td>{x.art === 'nu' ? 'Nachunternehmer' : x.art === 'geraete' ? 'Geräte' : 'Material'}</td><td className="r">{euro(x.betrag)}</td><td className="klein">{x.von}</td></tr>)}</tbody>
      </table></div>
      {darf && (
        <>
          <div className="pc-formular">
            <label className="pc-feld"><span>Firma</span><input value={f.firma} onChange={(e) => setF({ ...f, firma: e.target.value })} /></label>
            <label className="pc-feld"><span>Rechnungsnummer</span><input value={f.nr} onChange={(e) => setF({ ...f, nr: e.target.value })} /></label>
            <label className="pc-feld"><span>Leistung</span><input value={f.leistung} onChange={(e) => setF({ ...f, leistung: e.target.value })} /></label>
            <label className="pc-feld"><span>Kostenart</span><select value={f.art} onChange={(e) => setF({ ...f, art: e.target.value as typeof f.art })}><option value="material">Material</option><option value="geraete">Geräte</option><option value="nu">Nachunternehmer</option></select></label>
            <label className="pc-feld"><span>Leistungsmonat</span><input type="month" value={f.monat} onChange={(e) => setF({ ...f, monat: e.target.value })} /></label>
            <label className="pc-feld"><span>Betrag netto (€)</span><input inputMode="decimal" value={f.betrag} onChange={(e) => setF({ ...f, betrag: e.target.value })} /></label>
          </div>
          <div className="pk-reihe"><Pk farbe="blau" gesperrt={!ok} onClick={() => {
            const km = b.kostenMonate?.find((x) => x.monat === f.monat);
            a.rechnungBuchen(b.id, { firma: f.firma.trim(), nr: f.nr.trim(), leistung: f.leistung.trim(), art: f.art, betrag: z, monat: f.monat, nachbuchung: km?.status === 'abgeschlossen' });
            if (km) a.kostenMonatSetzen(b.id, f.monat, { [f.art]: km[f.art] + z });
            setF({ ...f, firma: '', nr: '', leistung: '', betrag: '' });
            zeige(km?.status === 'abgeschlossen' ? 'Als Nachbuchung in einem abgeschlossenen Monat gebucht.' : 'Rechnung gebucht.');
          }}>Rechnung buchen</Pk><span className="klein">Ein abgeschlossener Monat bleibt abgeschlossen; die Rechnung erscheint dort als Nachbuchung.</span></div>
        </>
      )}
    </section>
  );
}
