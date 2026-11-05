// 16: Nachunternehmer (Firmen, Personen, Unterlagen) · 17: Auswertung Helfer/NU (Entwurf V1)

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PcSeite, Pill, Pk, h1, siehtSaetze, useToast, zahlDe } from '../../components/Pc';
import { useDaten } from '../../domain/store';
import { baustelle, helferStunden, nameKomma, rechnung, voll } from '../../domain/sel';
import { euro, monatName, monatPlus, monatVon, plusTage, tm, tmj, uhr } from '../../domain/zeit';
import type { Firma, Person } from '../../domain/types';
import { nuWarnung } from './Disposition';

const UST: Record<Firma['unterlagen'][number]['status'], { t: string; f: 'gruen' | 'orange' | 'rot' | 'blau' }> = {
  gueltig: { t: 'gültig', f: 'gruen' }, abgelaufen: { t: 'abgelaufen', f: 'rot' }, fehlt: { t: 'fehlt', f: 'rot' }, pruefen: { t: 'hochgeladen, prüfen', f: 'orange' },
};

export function PcNu() {
  const { d, a, ich } = useDaten();
  const saetze = siehtSaetze(ich?.rolle ?? 'helfer');
  const darf = ich?.rolle === 'einkauf' || ich?.rolle === 'gl';
  const [fid, setFid] = useState(d.firmen[0]?.id);
  const [neu, setNeu] = useState(false);
  const [nf, setNf] = useState({ name: '', kontakt: '', mail: '' });
  const [toast, zeige] = useToast();
  const f = d.firmen.find((x) => x.id === fid) ?? d.firmen[0];
  const leute = d.personen.filter((p) => p.rolle === 'nu' && p.firmaId === f?.id);
  const vm = monatPlus(monatVon(d.heute), -1);
  return (
    <PcSeite titel="Nachunternehmer" pfad={`Firmen, Personen und Unterlagen · pflegt der Einkauf${saetze ? '' : ' · Ansicht ohne Stundensätze'}`} rechts={darf && <Pk farbe="blau" onClick={() => setNeu(true)}>Firma anlegen</Pk>}>
      {toast}
      {neu && (
        <section className="pc-karte" style={{ borderColor: 'var(--blau)' }}>
          <h2>Neue Firma</h2>
          <div className="pc-formular">
            <label className="pc-feld"><span>Firmenname</span><input value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} /></label>
            <label className="pc-feld"><span>Ansprechpartner</span><input value={nf.kontakt} onChange={(e) => setNf({ ...nf, kontakt: e.target.value })} /></label>
            <label className="pc-feld"><span>E-Mail</span><input type="email" value={nf.mail} onChange={(e) => setNf({ ...nf, mail: e.target.value })} /></label>
          </div>
          <span className="klein">Die Firma startet mit allen Unterlagen auf „fehlt“.</span>
          <div className="pk-reihe"><Pk onClick={() => setNeu(false)}>Abbrechen</Pk><Pk farbe="blau" gesperrt={!nf.name.trim()} onClick={() => { a.firmaAnlegen(nf.name.trim(), nf.kontakt.trim(), nf.mail.trim()); setNeu(false); setNf({ name: '', kontakt: '', mail: '' }); zeige('Firma angelegt.'); }}>Firma speichern</Pk></div>
        </section>
      )}
      {saetze && <div className="meldung blau"><strong>Stundensätze der Nachunternehmer</strong> sehen und ändern nur Einkauf und Geschäftsleitung. Kein Änderungsprotokoll und kein Export der Beträge.</div>}
      <div className="pc-liste-detail">
        <div className="pc-wahlliste">
          {d.firmen.map((x) => { const schlecht = x.unterlagen.filter((u) => u.status === 'abgelaufen' || u.status === 'fehlt').length; return (
            <button key={x.id} type="button" aria-pressed={x.id === f?.id} onClick={() => setFid(x.id)}><strong>{x.name}</strong><span className="klein">{d.personen.filter((p) => p.firmaId === x.id).length} Personen · {schlecht ? <Pill farbe="rot">{schlecht} Unterlagen ungültig</Pill> : <Pill farbe="gruen">Unterlagen ok</Pill>}</span></button>
          ); })}
        </div>
        {f && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <section className="pc-karte">
              <h2 style={{ fontSize: 22 }}>{f.name}</h2>
              <dl className="dl"><dt>Ansprechpartner</dt><dd>{f.kontakt || '–'}</dd><dt>E-Mail</dt><dd>{f.mail || '–'}</dd><dt>Anschrift</dt><dd>{f.adresse || '–'}</dd><dt>Telefon</dt><dd>{f.tel || '–'}</dd></dl>
              <div className="pk-reihe"><strong>Zugang für die Firma:</strong> <span className="text">{f.zugang ? 'aktiv. Der Ansprechpartner kann nur Unterlagen hochladen, Stunden sieht er nicht.' : 'noch keiner.'}</span>{!f.zugang && darf && <Pk klein onClick={() => zeige(`Einladung an ${f.mail} gesendet.`)}>Einladung senden</Pk>}</div>
            </section>
            <section className="pc-karte">
              <h2>Unterlagen der Firma</h2>
              <span className="klein">Alle Pflicht · Stand {tmj(d.heute)}</span>
              <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Unterlage</th><th>Status</th><th>gültig bis</th><th /></tr></thead><tbody>
                {f.unterlagen.map((u) => (
                  <tr key={u.name}><td>{u.name}</td><td><Pill farbe={UST[u.status].f}>{UST[u.status].t}</Pill></td><td>{u.bis ? tmj(u.bis) : 'ohne Ablauf'}</td>
                    <td>{darf && <div className="pk-reihe">
                      {(u.status === 'fehlt' || u.status === 'abgelaufen') && <Pk klein onClick={() => { a.unterlageSetzen(f.id, u.name, { status: 'pruefen' }); zeige('Unterlage hochgeladen. Bitte prüfen und freigeben.'); }}>Hochladen</Pk>}
                      {u.status === 'pruefen' && <Pk klein farbe="blau" onClick={() => { a.unterlageSetzen(f.id, u.name, { status: 'gueltig', bis: u.bis && u.bis > d.heute ? u.bis : plusTage(d.heute, 180) }); zeige('Unterlage geprüft und freigegeben.'); }}>Prüfen und freigeben</Pk>}
                      {(u.status === 'fehlt' || u.status === 'abgelaufen') && (u.erinnert ? <span className="klein">Erinnerung gesendet {tm(u.erinnert)}</span> : <Pk klein onClick={() => { a.unterlageSetzen(f.id, u.name, { erinnert: d.heute }); zeige(`Erinnerung an ${f.name} gesendet.`); }}>Erinnerung an Firma senden</Pk>)}
                    </div>}</td></tr>
                ))}
              </tbody></table></div>
            </section>
            <Personen f={f} leute={leute} saetze={saetze} darf={darf} vm={vm} zeige={zeige} />
          </div>
        )}
      </div>
    </PcSeite>
  );
}

function Personen({ f, leute, saetze, darf, vm, zeige }: { f: Firma; leute: Person[]; saetze: boolean; darf: boolean; vm: string; zeige: (t: string, f?: 'gruen' | 'orange' | 'rot' | 'blau') => void }) {
  const { d, a } = useDaten();
  const [ausweis, setAusweis] = useState<string>();
  const [aw, setAw] = useState({ art: 'Personalausweis', bis: '', staat: '', ok: false });
  const [neu, setNeu] = useState({ vor: '', nach: '', t: 'Facharbeiter', satz: '' });
  const [satz, setSatz] = useState<Record<string, string>>({});
  const abgelaufen = aw.bis && aw.bis < d.heute;
  return (
    <section className="pc-karte">
      <h2>Personen der Firma</h2>
      <span className="klein">Personen mit App stempeln selbst, der Polier gibt frei. Für Personen ohne App schreibt der Polier die Stunden, der Bauleiter zeichnet gegen.</span>
      <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Name</th><th>Tätigkeit</th>{saetze && <th className="r">Stundensatz</th>}<th>App-Zugang</th><th>Ausweis / A1</th><th>Mindestlohnerklärung {monatName(vm)}</th></tr></thead><tbody>
        {leute.map((p) => {
          const ml = p.mindestlohn?.[vm];
          const w = nuWarnung(d, p);
          return (
            <tr key={p.id}>
              <td><strong>{nameKomma(p)}</strong>{w && <><br /><Pill farbe="rot">! {w}</Pill></>}</td>
              <td>{p.taetigkeit}</td>
              {saetze && <td className="r"><div className="pk-reihe" style={{ justifyContent: 'flex-end' }}><input className="pc-in schmal" aria-label={`Stundensatz ${voll(p)}`} value={satz[p.id] ?? String(p.stundensatz ?? '').replace('.', ',')} onChange={(e) => setSatz({ ...satz, [p.id]: e.target.value })} /> €/h
                {satz[p.id] !== undefined && <Pk klein gesperrt={Number.isNaN(zahlDe(satz[p.id]))} onClick={() => { a.stundensatzSetzen(p.id, zahlDe(satz[p.id])); const s = { ...satz }; delete s[p.id]; setSatz(s); zeige('Stundensatz gespeichert.'); }}>Speichern</Pk>}</div></td>}
              <td>{p.nutztApp ? <Pill farbe="gruen">App aktiv</Pill> : <><Pill>ohne App</Pill>{darf && <> <Pk klein onClick={() => { a.zugangSetzen(p.id, 'eingeladen', 'NU-Person eingeladen'); zeige(`${voll(p)} eingeladen. Der Code geht an den Polier der Baustelle.`); }}>Einladen</Pk></>}</>}</td>
              <td>{p.ausweis ? <span className="klein">{p.ausweis.art} bis {tmj(p.ausweis.bis)}{p.ausweis.bis < plusTage(d.heute, 30) && <> <Pill farbe="orange">läuft bald ab</Pill></>}<br />gesehen von {p.ausweis.gesehenVon} am {tm(p.ausweis.am)}</span> : <Pill farbe="rot">fehlt</Pill>}
                {p.a1Bis && <><br /><span className="klein">A1 bis {tmj(p.a1Bis)}</span> {p.a1Bis < d.heute && <Pill farbe="rot">abgelaufen</Pill>}</>}
                {darf && <><br /><button type="button" className="link klein" onClick={() => { setAusweis(p.id); setAw({ art: 'Personalausweis', bis: '', staat: p.ausweis?.staat ?? '', ok: false }); }}>Ausweis eintragen</button></>}</td>
              <td>{ml === 'unterschrieben' ? <Pill farbe="gruen">unterschrieben</Pill> : <><Pill farbe="rot">fehlt</Pill><br />{ml === 'erinnert' ? <span className="klein">Erinnerung gesendet. Keine weitere Erinnerung möglich; die Disposition warnt weiter.</span> : darf && <Pk klein onClick={() => { a.mindestlohnErinnern(p.id, vm); zeige(`Erinnerung an ${voll(p)} gesendet (einmalig).`); }}>Einmal erinnern</Pk>}</>}</td>
            </tr>
          );
        })}
      </tbody></table></div>
      {ausweis && (() => { const p = leute.find((x) => x.id === ausweis)!; return (
        <div className="pc-karte" style={{ background: 'var(--grund)' }} aria-label="Ausweis eintragen">
          <strong>Ausweis von {voll(p)} eintragen</strong>
          <span className="klein">Es wird keine Kopie gespeichert.</span>
          <div className="pc-formular">
            <label className="pc-feld"><span>Art</span><select value={aw.art} onChange={(e) => setAw({ ...aw, art: e.target.value })}><option>Personalausweis</option><option>Reisepass</option><option>Aufenthaltstitel</option></select></label>
            <label className="pc-feld"><span>Gültig bis</span><input type="date" value={aw.bis} onChange={(e) => setAw({ ...aw, bis: e.target.value })} /></label>
            <label className="pc-feld"><span>Staatsangehörigkeit</span><input value={aw.staat} onChange={(e) => setAw({ ...aw, staat: e.target.value })} /></label>
          </div>
          {aw.art === 'Aufenthaltstitel' && <span className="klein">Bitte auch prüfen, ob die Arbeit erlaubt ist (steht auf dem Titel oder dem Zusatzblatt). Im Zweifel klärt das der Einkauf vor der Einteilung.</span>}
          {abgelaufen && <div className="meldung rot">Dieser Ausweis ist abgelaufen und kann nicht gespeichert werden.</div>}
          <label className="check"><input type="checkbox" checked={aw.ok} onChange={(e) => setAw({ ...aw, ok: e.target.checked })} /> Ich habe den Ausweis im Original gesehen. Das Foto passt zur Person.</label>
          <div className="pk-reihe"><Pk onClick={() => setAusweis(undefined)}>Abbrechen</Pk><Pk farbe="blau" gesperrt={!aw.ok || !aw.bis || !aw.staat.trim() || !!abgelaufen} onClick={() => { a.ausweisEintragen(p.id, aw.art, aw.bis, aw.staat.trim()); setAusweis(undefined); zeige('Ausweis gesehen und gespeichert.'); }}>Ausweis gesehen – speichern</Pk></div>
        </div>
      ); })()}
      {darf && (
        <div className="pc-formular">
          <label className="pc-feld"><span>Vorname</span><input value={neu.vor} onChange={(e) => setNeu({ ...neu, vor: e.target.value })} /></label>
          <label className="pc-feld"><span>Nachname</span><input value={neu.nach} onChange={(e) => setNeu({ ...neu, nach: e.target.value })} /></label>
          <label className="pc-feld"><span>Tätigkeit</span><input value={neu.t} onChange={(e) => setNeu({ ...neu, t: e.target.value })} /></label>
          {saetze && <label className="pc-feld"><span>Stundensatz (€/h)</span><input inputMode="decimal" value={neu.satz} onChange={(e) => setNeu({ ...neu, satz: e.target.value })} /></label>}
          <Pk gesperrt={!neu.vor.trim() || !neu.nach.trim()} onClick={() => { a.nuPersonAnlegen(f.id, neu.vor.trim(), neu.nach.trim(), neu.t.trim(), zahlDe(neu.satz) || 0); setNeu({ vor: '', nach: '', t: 'Facharbeiter', satz: '' }); zeige('Person angelegt.'); }}>+ Person anlegen</Pk>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ Auswertung Helfer / NU

interface NuZeile { datum: string; name: string; personId?: string; kst: string; zeit: string; pauseMin: number; h: number; herkunft: string; satz?: number; nachgetragen: boolean }

export function PcAuswertungNu() {
  const { d, ich } = useDaten();
  const saetze = siehtSaetze(ich?.rolle ?? 'helfer');
  const [fid, setFid] = useState(d.firmen[0]?.id);
  const aktuell = monatVon(d.heute);
  const [m, setM] = useState(monatPlus(aktuell, -1));
  const [bid, setBid] = useState('');
  const [gelesen, setGelesen] = useState(false);
  const [rStd, setRStd] = useState('');
  const [rBetrag, setRBetrag] = useState('');
  const [geprueft, setGeprueft] = useState(false);
  const f = d.firmen.find((x) => x.id === fid)!;
  const zeilen: NuZeile[] = [];
  for (const t of d.tage) {
    const p = d.personen.find((x) => x.id === t.personId);
    if (!p || p.rolle !== 'nu' || p.firmaId !== f.id || monatVon(t.datum) !== m || t.status !== 'freigegeben') continue;
    const r = rechnung(d, p.id, t.datum);
    for (const ab of r.abschnitte) {
      if (bid && ab.baustelleId !== bid) continue;
      const einget = d.einteilung.some((e) => e.personId === p.id && e.datum === t.datum);
      zeilen.push({ datum: t.datum, name: voll(p), personId: p.id, kst: baustelle(d, ab.baustelleId)?.kst ?? '?', zeit: `${r.beginn ? uhr(r.beginn.zeit) : ''}–${r.ende ? uhr(r.ende.zeit) : ''}`, pauseMin: r.pauseMin, h: ab.min / 60, herkunft: 'mit App gestempelt, Polier hat freigegeben', satz: p.stundensatz, nachgetragen: !einget });
    }
  }
  for (const h of d.helfer) {
    if (!h.nu || h.firma !== f.name || monatVon(h.datum) !== m || (bid && h.baustelleId !== bid)) continue;
    const p = d.personen.find((x) => voll(x) === h.name);
    zeilen.push({ datum: h.datum, name: h.name, personId: p?.id, kst: baustelle(d, h.baustelleId)?.kst ?? '?', zeit: `${h.von}–${h.bis}`, pauseMin: h.pauseMin, h: helferStunden(h), herkunft: h.gegengezeichnet ? 'Helfer-Stunden, gegengezeichnet' : 'Helfer-Stunden, noch nicht gegengezeichnet', satz: p?.stundensatz, nachgetragen: false });
  }
  zeilen.sort((x, y) => x.datum.localeCompare(y.datum));
  const summeH = zeilen.reduce((s, z) => s + z.h, 0);
  const betrag = zeilen.reduce((s, z) => s + z.h * (z.satz ?? 0), 0);
  const personen = [...new Set(zeilen.map((z) => z.name))];
  const jeBs = [...new Set(zeilen.map((z) => z.kst))].map((k) => ({ k, h: zeilen.filter((z) => z.kst === k).reduce((s, z) => s + z.h, 0) }));
  const jeP = personen.map((n) => { const zs = zeilen.filter((z) => z.name === n); const h = zs.reduce((s, z) => s + z.h, 0); return { n, h, amt: zs.reduce((s, z) => s + z.h * (z.satz ?? 0), 0), tage: new Set(zs.map((z) => z.datum)).size }; });
  const schlecht = f.unterlagen.filter((u) => u.status !== 'gueltig');
  const rS = zahlDe(rStd), rB = zahlDe(rBetrag);
  const diffH = rStd ? rS - summeH : undefined;
  const diffB = rBetrag ? rB - betrag : undefined;
  return (
    <PcSeite titel="Auswertung Helfer und Nachunternehmer" pfad="Auswertungen › Helfer und Nachunternehmer · zur Prüfung der Rechnungen" rechts={<Pill farbe={geprueft ? 'gruen' : undefined}>{geprueft ? '✓ Rechnung geprüft' : 'Rechnung noch nicht geprüft'}</Pill>}>
      <div className="pk-reihe">
        <label className="pc-feld"><span>Firma</span><select value={fid} onChange={(e) => { setFid(e.target.value); setGeprueft(false); }}>{d.firmen.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="pc-feld"><span>Monat</span><select value={m} onChange={(e) => { setM(e.target.value); setGeprueft(false); }}>{[aktuell, monatPlus(aktuell, -1), monatPlus(aktuell, -2)].map((x) => <option key={x} value={x}>{monatName(x)}</option>)}</select></label>
        <label className="pc-feld"><span>Baustelle</span><select value={bid} onChange={(e) => setBid(e.target.value)}><option value="">Alle Baustellen</option>{d.baustellen.map((b) => <option key={b.id} value={b.id}>{b.kst} {b.strasse}</option>)}</select></label>
      </div>
      {schlecht.length > 0 && (
        <section className="pc-karte" style={{ borderColor: 'var(--rot)' }}>
          <h2>Achtung vor der Zahlung: Pflicht-Unterlagen der Firma <Pill farbe="vor">mit Steuerberater bestätigen</Pill></h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>{schlecht.map((u) => <li key={u.name}>{u.name}: <strong>{UST[u.status].t}</strong></li>)}</ul>
          <span className="klein">Stand der Unterlagen: {tmj(d.heute)}, gepflegt unter <Link className="link" to="/pc/nu">Nachunternehmer</Link>. Ob und wie viel einbehalten wird, entscheidet die Buchhaltung mit dem Steuerberater; diese Seite rechnet das nicht.</span>
          <label className="check"><input type="checkbox" checked={gelesen} onChange={(e) => setGelesen(e.target.checked)} /> Ich habe den Hinweis gelesen. Vor der Zahlung wird das mit Buchhaltung / Steuerberater geklärt.</label>
        </section>
      )}
      <div className="pc-raster">
        <div className="kpi"><span className="bez">Freigegebene Stunden</span><span className="wert">{h1(summeH)}</span><span className="klein">{monatName(m)}</span></div>
        <div className="kpi"><span className="bez">Personen</span><span className="wert">{personen.length}</span><span className="klein">{personen.join(', ') || '–'}</span></div>
        {saetze && <div className="kpi"><span className="bez">Betrag netto (Stunden × Stundensatz)</span><span className="wert">{euro(betrag)}</span><span className="klein">{new Set(zeilen.map((z) => z.datum)).size} Einsatztage · {zeilen.length} Einträge</span></div>}
        <div className="kpi"><span className="bez">Nachgetragen (nicht eingeteilt)</span><span className="wert">{h1(zeilen.filter((z) => z.nachgetragen).reduce((s, z) => s + z.h, 0))}</span><span className="klein">{zeilen.filter((z) => z.nachgetragen).length} Einträge</span></div>
      </div>
      <section className="pc-karte">
        <h2>Abgleich mit der Rechnung</h2>
        <div className="pc-formular">
          <label className="pc-feld"><span>Stunden laut Rechnung</span><input inputMode="decimal" value={rStd} onChange={(e) => setRStd(e.target.value)} /></label>
          {saetze && <label className="pc-feld"><span>Betrag netto laut Rechnung (€)</span><input inputMode="decimal" value={rBetrag} onChange={(e) => setRBetrag(e.target.value)} /></label>}
          <label className="pc-feld"><span>Rechnungsnummer (optional)</span><input /></label>
        </div>
        {diffH !== undefined && !Number.isNaN(diffH) && <div className={`meldung ${Math.abs(diffH) < 0.05 ? 'gruen' : 'orange'}`}>{Math.abs(diffH) < 0.05 ? 'Stunden stimmen überein.' : `Rechnung ${diffH > 0 ? 'über' : 'unter'} den freigegebenen Stunden: ${h1(Math.abs(diffH))}.`}{diffB !== undefined && !Number.isNaN(diffB) && ` Betrag: ${Math.abs(diffB) < 1 ? 'stimmt' : `${diffB > 0 ? '+' : '−'}${euro(Math.abs(diffB))}`}.`}</div>}
        <div className="pk-reihe"><Pk farbe="blau" gesperrt={(schlecht.length > 0 && !gelesen) || !rStd} titel={schlecht.length && !gelesen ? 'Bitte zuerst den Hinweis bestätigen' : undefined} onClick={() => setGeprueft(true)}>Als geprüft markieren</Pk>{schlecht.length > 0 && !gelesen && <span className="klein">Bitte zuerst den Hinweis bestätigen (Haken setzen).</span>}</div>
      </section>
      <div className="pc-zwei">
        <section className="pc-karte"><h2>Stunden je Baustelle</h2>{jeBs.map((b) => <div key={b.k} className="pk-reihe" style={{ justifyContent: 'space-between' }}><span>{b.k}</span><strong>{h1(b.h)}</strong></div>)}{!jeBs.length && <span className="klein">–</span>}</section>
        <section className="pc-karte"><h2>Stunden je Person</h2>{jeP.map((p) => <div key={p.n} className="pk-reihe" style={{ justifyContent: 'space-between' }}><span>{p.n} <span className="klein">· {p.tage} Tage</span></span><strong>{h1(p.h)}{saetze && ` · ${euro(p.amt)}`}</strong></div>)}{!jeP.length && <span className="klein">–</span>}</section>
      </div>
      <section className="pc-karte">
        <h2>Einzelnachweis</h2>
        <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Datum</th><th>Person</th><th>Kst.</th><th>von – bis</th><th className="r">Pause</th><th className="r">Stunden</th><th>Herkunft der Stunden</th></tr></thead><tbody>
          {zeilen.map((z, i) => <tr key={i}><td>{tm(z.datum)}</td><td>{z.name}{z.nachgetragen && <> <Pill farbe="orange">nachgetragen</Pill></>}</td><td className="mono">{z.kst}</td><td>{z.zeit}</td><td className="r">{z.pauseMin} Min.</td><td className="r">{h1(z.h)}</td><td className="klein">{z.herkunft}</td></tr>)}
          {!zeilen.length && <tr><td colSpan={7} className="klein">Für diese Auswahl wurden keine Stunden erfasst.</td></tr>}
        </tbody></table></div>
        <span className="klein">In die Summen zählen nur freigegebene Tage. Die Stunden von Nachunternehmer-Personen gehen nicht an die Lohnbuchhaltung, sie dienen der Rechnungsprüfung. Stunden eigener Helfer (Fa. Baumann) ohne App gehen wie bei allen eigenen Mitarbeitern an die Lohnbuchhaltung.</span>
      </section>
    </PcSeite>
  );
}
