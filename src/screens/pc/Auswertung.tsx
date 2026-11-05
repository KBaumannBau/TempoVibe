// 18: Auswertung je Baustelle · 19: Übersicht je Mitarbeiter (Stundenzettel, Konto) (Entwurf V1)

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PcSeite, Pill, Pk, Reiter, h1, herunterladen, useToast } from '../../components/Pc';
import { useDaten } from '../../domain/store';
import { baustelle, bsLang, kontoStand, nameKomma, person, rechnung, stundenIstBaustelle, voll } from '../../domain/sel';
import { kw, monatName, monatPlus, monatVon, montagDerWoche, plusTage, sollFuer, tageImMonat, tm, tmj, uhr, wtKurz } from '../../domain/zeit';
import { abwesenheitenImMonat } from '../../domain/lohn';
import { mehrStand } from './Personal';

// ------------------------------------------------------------------ je Baustelle

export function PcAuswertungBaustelle() {
  const { d, ich } = useDaten();
  const verwaltung = ['buero', 'gl', 'oberbauleitung', 'einkauf'].includes(ich?.rolle ?? '');
  const sichtbar = d.baustellen.filter((b) => !b.archiviert && b.stundenSoll > 0 && (verwaltung || b.bauleitungId === ich?.id || b.polierId === ich?.id));
  const [bid, setBid] = useState(sichtbar[0]?.id);
  const [zr, setZr] = useState<'woche' | 'monat' | 'vormonat'>('monat');
  const [toast, zeige] = useToast();
  const b = d.baustellen.find((x) => x.id === bid) ?? sichtbar[0];
  if (!b) return <PcSeite titel="Auswertung je Baustelle"><span>Keine Baustelle.</span></PcSeite>;
  const m = monatVon(d.heute);
  const [von, bis, zrName] = zr === 'woche' ? [montagDerWoche(d.heute), d.heute, `KW ${kw(d.heute)}`] : zr === 'monat' ? [`${m}-01`, d.heute, monatName(m)] : [`${monatPlus(m, -1)}-01`, `${monatPlus(m, -1)}-31`, monatName(monatPlus(m, -1))];
  const proPerson = new Map<string, number>();
  const proWoche = new Map<string, number>();
  const angestellt = new Map<string, number>();
  for (const t of d.tage) {
    if (t.status === 'offen') continue;
    const p = person(d, t.personId);
    for (const ab of rechnung(d, t.personId, t.datum).abschnitte) {
      if (ab.baustelleId !== b.id) continue;
      const h = ab.min / 60;
      if (p.gruppe === 'angestellt' || p.rolle === 'nu') { if (t.datum >= von && t.datum <= bis && p.rolle !== 'nu') angestellt.set(p.id, (angestellt.get(p.id) ?? 0) + h); continue; }
      const mo = montagDerWoche(t.datum);
      proWoche.set(mo, (proWoche.get(mo) ?? 0) + h);
      if (t.datum >= von && t.datum <= bis) proPerson.set(p.id, (proPerson.get(p.id) ?? 0) + h);
    }
  }
  const istP = [...proPerson.values()].reduce((s, h) => s + h, 0);
  const istG = stundenIstBaustelle(d, b);
  const pct = (istG / b.stundenSoll) * 100;
  const amp = pct > 100 ? { t: 'über Soll', f: 'rot' as const } : pct >= 80 ? { t: 'Achtung: ab 80 %', f: 'orange' as const } : { t: 'im Rahmen', f: 'gruen' as const };
  // disponiert: eingeteilte Personen ab morgen bis Ende nächster Woche × Tagessoll
  let disp = 0;
  for (const e of d.einteilung) if (e.baustelleId === b.id && e.datum > d.heute && e.datum <= plusTage(montagDerWoche(d.heute), 11)) { const p = person(d, e.personId); if (p.gruppe !== 'angestellt' && p.rolle !== 'nu') disp += sollFuer(p, e.datum) * (e.haelfte ? 0.5 : 1); }
  const gruppen = [{ name: 'Facharbeiter und Vorarbeiter', f: (r: string) => r === 'facharbeiter' || r === 'vorarbeiter' }, { name: 'Helfer', f: (r: string) => r === 'helfer' }];
  const wochen = [...proWoche.entries()].sort().slice(-8);
  const maxW = Math.max(1, ...wochen.map(([, h]) => h));
  const exportCsv = () => {
    const z = ['Mitarbeiter;Gruppe;Stunden', ...[...proPerson.entries()].map(([id, h]) => `${nameKomma(person(d, id))};${person(d, id).gruppe};${h.toFixed(2).replace('.', ',')}`)];
    herunterladen(`Auswertung_${b.kst}_${von}.csv`, z.join('\r\n'));
    zeige('Export als CSV (für Excel) heruntergeladen.');
  };
  return (
    <PcSeite titel="Auswertung je Baustelle" pfad="Auswertungen › je Baustelle · Verwaltung, Geschäftsleitung, Bauleiter und Polier der Baustelle" rechts={
      <div className="pk-reihe"><label className="pc-feld"><span>Baustelle</span><select value={b.id} onChange={(e) => setBid(e.target.value)}>{sichtbar.map((x) => <option key={x.id} value={x.id}>{bsLang(x)}</option>)}</select></label>
        <Reiter label="Zeitraum" wert={zr} setWert={setZr} optionen={[{ wert: 'woche', text: 'Diese Woche' }, { wert: 'monat', text: monatName(m).split(' ')[0] }, { wert: 'vormonat', text: monatName(monatPlus(m, -1)).split(' ')[0] }]} />
        <Pk onClick={exportCsv}>Export Excel</Pk></div>}>
      {toast}
      <span className="klein">{b.massnahme} · Bauleiter {voll(person(d, b.bauleitungId))}{b.polierId ? ` · Polier ${voll(person(d, b.polierId))}` : ''}</span>
      <div className="pc-raster">
        <div className="kpi"><span className="bez">Stunden {zrName}</span><span className="wert">{h1(istP)}</span><span className="klein">{proPerson.size} Mitarbeiter</span></div>
        <div className="kpi"><span className="bez">Kalkulierte Lohnstunden (Soll)</span><span className="wert">{h1(b.stundenSoll)}</span><span className="klein">aus der Auftragskalkulation plus Nachträge</span></div>
        <div className="kpi"><span className="bez">Ist seit Baubeginn</span><span className="wert">{h1(istG)}</span><span className="klein">noch {h1(Math.max(0, b.stundenSoll - istG))}</span></div>
        <div className="kpi"><span className="bez">Verbrauch</span><span className="wert">{Math.round(pct)} %</span><Pill farbe={amp.f}>{amp.t}</Pill></div>
      </div>
      <section className="pc-karte">
        <h2>Soll-Ist seit Baubeginn</h2>
        <div className="balken" style={{ height: 18 }}><span className={amp.f === 'gruen' ? '' : amp.f} style={{ width: `${Math.min(100, pct)}%` }} /></div>
        <span className="klein">0 h · 80 % bei {h1(b.stundenSoll * 0.8)} · Soll {h1(b.stundenSoll)}</span>
        <h2>Tendenz: Ist und disponierte Stunden</h2>
        <span className="text">Ist {h1(istG)} + disponiert {h1(disp)} (bis Ende nächster Woche) = <strong>{h1(istG + disp)}</strong>, das sind {Math.round(((istG + disp) / b.stundenSoll) * 100)} % vom Soll.</span>
        {istG + disp > b.stundenSoll && <div className="meldung orange">Mit der aktuellen Disposition wird das Soll überschritten. <Link className="link" to="/pc/disposition">Zur Disposition</Link></div>}
        <span className="klein">Disponiert = laut Einteilung geplant (eingeteilte Mitarbeiter × Tagessoll), noch nicht gearbeitet. Der Status „Verbrauch“ richtet sich nur nach dem Ist.</span>
      </section>
      <div className="pc-zwei">
        <section className="pc-karte">
          <h2>Stunden pro Woche</h2>
          {wochen.map(([mo, h]) => <div key={mo} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 70px', gap: 8, alignItems: 'center' }}><span className="klein">KW {kw(mo)}</span><div className="balken"><span style={{ width: `${(h / maxW) * 100}%` }} /></div><span className="klein" style={{ textAlign: 'right' }}>{h1(h)}</span></div>)}
          {!wochen.length && <span className="klein">Noch keine Stunden.</span>}
        </section>
        <section className="pc-karte">
          <h2>Aufteilung nach Gruppe · {zrName}</h2>
          {gruppen.map((g) => { const h = [...proPerson.entries()].filter(([id]) => g.f(person(d, id).rolle)).reduce((s, [, x]) => s + x, 0); return <div key={g.name} className="pk-reihe" style={{ justifyContent: 'space-between' }}><span>{g.name}</span><strong>{h1(h)}</strong></div>; })}
          <div className="pk-reihe" style={{ justifyContent: 'space-between' }}><span>Auszubildende</span><strong>{h1([...proPerson.entries()].filter(([id]) => person(d, id).gruppe === 'azubi').reduce((s, [, x]) => s + x, 0))}</strong></div>
        </section>
      </div>
      <section className="pc-karte">
        <div className="pk-reihe" style={{ justifyContent: 'space-between' }}><h2>Stunden je Mitarbeiter · {zrName}</h2><Pk klein onClick={() => zeige('Der Stundennachweis für den Bauherrn (PDF) wird in der echten Anwendung erstellt.', 'blau')}>Stundennachweis für Bauherrn (PDF)</Pk></div>
        <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Mitarbeiter</th><th>Gruppe</th><th>Anteil</th><th className="r">Stunden</th></tr></thead><tbody>
          {[...proPerson.entries()].sort((x, y) => y[1] - x[1]).map(([id, h]) => { const p = person(d, id); return <tr key={id}><td>{verwaltung ? <Link className="link" to={`/pc/auswertung/mitarbeiter?p=${id}`}>{nameKomma(p)}</Link> : nameKomma(p)}</td><td>{p.gruppe === 'azubi' ? 'Azubi' : p.rolle === 'helfer' ? 'Helfer' : 'Facharbeiter'}</td><td style={{ minWidth: 140 }}><div className="balken"><span style={{ width: `${(h / Math.max(istP, 1)) * 100}%` }} /></div></td><td className="r">{h1(h)}</td></tr>; })}
          {[...angestellt.entries()].map(([id, h]) => <tr key={id} style={{ color: 'var(--text-3)' }}><td>{nameKomma(person(d, id))}</td><td>angestellt</td><td className="klein">umgelegt, keine Buchung auf die Kostenstelle</td><td className="r">({h1(h)})</td></tr>)}
        </tbody></table></div>
        <span className="klein">Angestellte werden nicht auf Kostenstellen gebucht. Ihre Stunden zählen nicht in Ist, Verbrauch, Wochenwerte und Gruppen.</span>
      </section>
    </PcSeite>
  );
}

// ------------------------------------------------------------------ je Mitarbeiter

export function PcAuswertungMitarbeiter() {
  const { d } = useDaten();
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('p');
  const leute = d.personen.filter((p) => !['nu', 'gl', 'admin'].includes(p.rolle)).sort((a, b) => nameKomma(a).localeCompare(nameKomma(b)));
  const [pid, setPid] = useState(q && leute.some((p) => p.id === q) ? q : 'stefan');
  const aktuell = monatVon(d.heute);
  const [m, setM] = useState(monatPlus(aktuell, -1));
  const [reiter, setReiter] = useState<'zettel' | 'konto'>('zettel');
  const [toast, zeige] = useToast();
  const p = person(d, pid);
  const abw = abwesenheitenImMonat(d, p, m);
  const zeilen = tageImMonat(m).map((k) => {
    const t = d.tage.find((x) => x.personId === pid && x.datum === k);
    const a = abw.find((x) => x.datum === k);
    if (!t && !a) return null;
    const r = t ? rechnung(d, pid, k) : undefined;
    const bs = r?.abschnitte.map((x) => baustelle(d, x.baustelleId)?.kst).filter(Boolean).join(' / ');
    const zus = t?.zuschlaege.filter((z) => z.entscheidung !== 'weg').map((z) => z.art).join(', ');
    return { k, t, a, r, bs, note: a ? (a.a.art === 'krank' ? 'krank' : a.a.art === 'urlaub' ? 'Urlaub' : a.a.art) : [zus, t?.status !== 'freigegeben' ? 'vorläufig' : ''].filter(Boolean).join(' · ') };
  }).filter(Boolean) as { k: string; t?: (typeof d.tage)[number]; a?: { a: { art: string } }; r?: ReturnType<typeof rechnung>; bs?: string; note: string }[];
  const summe = zeilen.reduce((s, z) => s + (z.r ? z.r.arbeitMin / 60 : 0), 0);
  const soll = tageImMonat(m).reduce((s, k) => s + sollFuer(p, k), 0);
  const angestellt = p.gruppe === 'angestellt';
  const stand = angestellt ? mehrStand(d, p.id) : kontoStand(d, p.id);
  const kontoMonate = [monatPlus(m, -2), monatPlus(m, -1), m, ...(m < aktuell ? [aktuell] : [])];
  return (
    <PcSeite titel="Übersicht je Mitarbeiter" pfad="Auswertungen › je Mitarbeiter · nur für die Verwaltung sichtbar" rechts={<Pk onClick={() => zeige('Der Stundenzettel als PDF wird in der echten Anwendung erstellt.', 'blau')}>{reiter === 'zettel' ? 'Stundenzettel als PDF' : 'Kontoauszug als PDF'}</Pk>}>
      {toast}
      <div className="pk-reihe">
        <label className="pc-feld"><span>Mitarbeiter</span><select value={pid} onChange={(e) => setPid(e.target.value)}>{leute.map((x) => <option key={x.id} value={x.id}>{nameKomma(x)} ({x.persNr}) · {x.gruppe}</option>)}</select></label>
        <label className="pc-feld"><span>Monat</span><select value={m} onChange={(e) => setM(e.target.value)}>{[aktuell, monatPlus(aktuell, -1), monatPlus(aktuell, -2)].map((x) => <option key={x} value={x}>{monatName(x)}</option>)}</select></label>
        <Reiter label="Ansicht" wert={reiter} setWert={setReiter} optionen={[{ wert: 'zettel', text: 'Stundenzettel' }, { wert: 'konto', text: angestellt ? 'Mehrstunden' : 'Arbeitszeitkonto' }]} />
      </div>
      <h2 style={{ margin: 0 }}>{voll(p)} <span className="klein">· {p.persNr} · {p.gruppe}</span></h2>
      {reiter === 'zettel' ? (
        <>
          <div className="pc-raster">
            <div className="kpi"><span className="bez">Ist {monatName(m)}</span><span className="wert">{h1(summe + abw.reduce((s, x) => s + sollFuer(p, x.datum), 0))}</span><span className="klein">gearbeitet {h1(summe)}, Abwesenheit {abw.length} Tage</span></div>
            <div className="kpi"><span className="bez">Soll</span><span className="wert">{h1(soll)}</span><span className="klein">{tageImMonat(m).filter((k) => sollFuer(p, k) > 0).length} Arbeitstage</span></div>
            <div className="kpi"><span className="bez">{angestellt ? 'Mehrstunden' : 'Konto'} heute</span><span className="wert">{h1(stand)}</span></div>
          </div>
          <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Datum</th><th>Beginn</th><th>Ende</th><th className="r">Pause</th><th className="r">Stunden</th><th>Baustelle</th><th>Zuschläge / Hinweis</th></tr></thead><tbody>
            {zeilen.map((z) => <tr key={z.k}><td>{wtKurz(z.k)} {tm(z.k)}</td><td>{z.r?.beginn ? uhr(z.r.beginn.zeit) : '–'}</td><td>{z.r?.ende ? uhr(z.r.ende.zeit) : '–'}</td><td className="r">{z.r ? `${z.r.pauseMin} Min.` : '–'}</td><td className="r">{z.r ? h1(z.r.arbeitMin / 60) : h1(sollFuer(p, z.k))}</td><td>{z.bs || '–'}</td><td>{z.note.includes('vorläufig') ? <Pill farbe="orange">{z.note}</Pill> : z.note}</td></tr>)}
            {!zeilen.length && <tr><td colSpan={7} className="klein">Keine Einträge in diesem Monat.</td></tr>}
          </tbody></table></div>
          <span className="klein">Aufzeichnung von Beginn, Ende und Dauer der Arbeitszeit nach § 17 Mindestlohngesetz bzw. § 19 Arbeitnehmer-Entsendegesetz. Gesetzliche Mindestaufbewahrung: 2 Jahre; im Betrieb werden die Stunden 8 Jahre aufbewahrt. Nicht freigegebene Tage sind als „vorläufig“ gekennzeichnet.</span>
        </>
      ) : (
        <section className="pc-karte">
          <h2>{angestellt ? 'Mehrstunden' : 'Arbeitszeitkonto (SIKOFlex)'} · Stand heute {h1(stand)}</h2>
          {!angestellt && <span className="klein">Höchstens 150 h. Was darüber liegt, wird ausgezahlt. Im Winter darf das Konto für Ausfalltage genutzt werden.</span>}
          {angestellt && <span className="klein">Ab 100 Mehrstunden brauchen weitere Überstunden die Genehmigung der Geschäftsleitung. Ausgleich unter <Link className="link" to="/pc/mehrstunden">Mehrstunden Angestellte</Link>.</span>}
          <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Monat</th><th className="r">Aufbau</th><th className="r">Abbau</th><th className="r">Auszahlung</th></tr></thead><tbody>
            {kontoMonate.map((km) => {
              let auf = 0, ab = 0;
              for (const t of d.tage) if (t.personId === p.id && t.status !== 'offen' && monatVon(t.datum) === km) { const diff = rechnung(d, p.id, t.datum).arbeitMin / 60 - sollFuer(p, t.datum); if (diff > 0) auf += diff; else ab -= diff; }
              const aus = d.mehrBuchungen.filter((x) => x.personId === p.id && monatVon(x.datum) === km && x.art === 'auszahlung').reduce((s, x) => s + x.stunden, 0);
              const frei = d.mehrBuchungen.filter((x) => x.personId === p.id && monatVon(x.datum) === km && x.art === 'frei').reduce((s, x) => s + x.stunden, 0);
              return <tr key={km}><td>{monatName(km)}</td><td className="r">{auf ? `+${h1(auf)}` : '–'}</td><td className="r">{ab + frei ? `−${h1(ab + frei)}` : '–'}</td><td className="r">{aus ? `−${h1(aus)}` : '–'}</td></tr>;
            })}
          </tbody></table></div>
          <span className="klein">Stand vor den Demo-Tagen: {h1(p.kontoStart)} (Übertrag). Stand am {tmj(d.heute)}: {h1(stand)}.</span>
        </section>
      )}
    </PcSeite>
  );
}
