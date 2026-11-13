// 20: Übersicht Geschäftsleitung · 21: Administrator · 22: Polier am PC · 23: Bauleiter am PC · Oberbauleitung (Entwurf V1)

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PcSeite, Pill, Pk, h1, rollenText, useToast } from '../../components/Pc';
import { useDaten } from '../../domain/store';
import {
  antraegeFuerBauleitung, vorschlaegeFuerBauleitung, vorschlaegeFuerPolier, baustelle, baustelleVonTag, bsLang, bsName, einteilungAm, fristRueckmeldung, helferStunden, hinweiseTag, kontoStand, nameKomma, offeneKorrekturen, offeneWidersprueche, person, rechnung, stundenIstBaustelle, tageBeiBauleitung, tageBeimPolier, urlaubRest, voll,
} from '../../domain/sel';
import { artName, monatName, monatVon, plusTage, tm, tmj, uhr, wtKurz } from '../../domain/zeit';
import { lohnPersonen, lohnZeile } from '../../domain/lohn';
import type { Antrag, Daten, Person, Rolle, Tag } from '../../domain/types';
import { mehrStand } from './Personal';
import { nuWarnung } from './Disposition';

const ampel = (pct: number) => (pct > 100 ? { t: 'über Soll', f: 'rot' as const } : pct >= 80 ? { t: 'ab 80 %', f: 'orange' as const } : { t: 'im Rahmen', f: 'gruen' as const });

function disponiert(d: Daten, bid: string) {
  let h = 0;
  for (const e of d.einteilung) if (e.baustelleId === bid && e.datum > d.heute && e.datum <= plusTage(d.heute, 10)) { const p = person(d, e.personId); if (p.gruppe !== 'angestellt' && p.rolle !== 'nu') h += (p.sollMoDo) * (e.haelfte ? 0.5 : 1); }
  return h;
}

function BaustellenTabelle({ d, liste }: { d: Daten; liste: Daten['baustellen'] }) {
  return (
    <div className="tab-wrap"><table className="tabelle">
      <thead><tr><th>Baustelle</th><th>Bauleiter</th><th>Polier</th><th className="r">Ist</th><th className="r">Soll</th><th>Verbrauch</th><th className="r">disponiert</th><th>Vorschau</th></tr></thead>
      <tbody>{liste.map((b) => {
        const ist = stundenIstBaustelle(d, b); const pct = b.stundenSoll ? (ist / b.stundenSoll) * 100 : 0; const a = ampel(pct); const disp = disponiert(d, b.id); const fc = b.stundenSoll ? ((ist + disp) / b.stundenSoll) * 100 : 0;
        return <tr key={b.id}><td>{bsName(b)}</td><td>{voll(person(d, b.bauleitungId))}</td><td>{b.polierId ? voll(person(d, b.polierId)) : '–'}</td><td className="r">{h1(ist)}</td><td className="r">{b.stundenSoll ? h1(b.stundenSoll) : 'kein Soll'}</td><td>{b.stundenSoll ? <><Pill farbe={a.f}>{Math.round(pct)} % · {a.t}</Pill></> : '–'}</td><td className="r">{h1(disp)}</td><td>{b.stundenSoll ? <span className={fc >= 80 && pct < 80 ? 'pill orange' : 'klein'}>{Math.round(fc)} %</span> : '–'}</td></tr>;
      })}</tbody>
    </table></div>
  );
}

// ------------------------------------------------------------------ Geschäftsleitung

export function PcGl() {
  const { d, a } = useDaten();
  const [ablehnen, setAblehnen] = useState<string>();
  const [grund, setGrund] = useState('');
  const [toast, zeige] = useToast();
  const [vt, setVt] = useState({ von: d.vertretung.von ?? d.heute, bis: d.vertretung.bis ?? plusTage(d.heute, 14) });
  const zweite = d.antraege.filter((x) => x.status === 'bauleitung_ok');
  const erledigt = d.antraege.filter((x) => x.glVon);
  const beimBl = d.antraege.filter((x) => x.status === 'offen' && x.art !== 'krank' && x.art !== 'betriebsurlaub');
  const obl = person(d, d.oberbauleitungId);
  const oblWahl = d.personen.filter((p) => p.gruppe === 'angestellt' && (p.rolle === 'bauleitung' || p.rolle === 'oberbauleitung')).sort((x, y) => nameKomma(x).localeCompare(nameKomma(y)));
  const [oblNeu, setOblNeu] = useState(d.oberbauleitungId);
  const ueber100 = d.personen.filter((p) => p.gruppe === 'angestellt' && ['polier', 'bauleitung', 'buero', 'oberbauleitung', 'einkauf'].includes(p.rolle) && mehrStand(d, p.id) >= 100);
  const m = monatVon(d.heute);
  const vm = `${Number(m.slice(5)) === 1 ? Number(m.slice(0, 4)) - 1 : m.slice(0, 4)}-${String(Number(m.slice(5)) === 1 ? 12 : Number(m.slice(5)) - 1).padStart(2, '0')}`;
  const lz = lohnPersonen(d).map((p) => lohnZeile(d, p, vm)).filter((z) => z.tage.length);
  const krank = d.antraege.filter((x) => x.art === 'krank' && x.von <= d.heute && x.bis >= d.heute).length;
  const urlaubHeute = d.antraege.filter((x) => x.art === 'urlaub' && x.status === 'genehmigt' && x.von <= d.heute && x.bis >= d.heute).length;
  const ueber150 = d.personen.filter((p) => p.gruppe !== 'angestellt' && p.rolle !== 'nu' && kontoStand(d, p.id) > 150);
  const nuWarn = d.personen.filter((p) => nuWarnung(d, p));
  const kacheln = [
    { bez: 'Stunden Vormonat übernommen', wert: `${lz.filter((z) => z.stand === 'uebernommen').length} von ${lz.length}`, sub: monatName(vm), to: '/pc/stunden' },
    { bez: 'Heute abwesend', wert: krank + urlaubHeute, sub: `${krank} krank, ${urlaubHeute} Urlaub`, to: '/pc/abwesenheiten' },
    { bez: 'Konten über 150 h', wert: ueber150.length, sub: ueber150.map((p) => p.nachname).join(', ') || 'keiner', to: '/pc/auswertung/mitarbeiter' },
    { bez: 'Nachunternehmer mit Warnung', wert: nuWarn.length, sub: nuWarn.map((p) => p.nachname).join(', ') || 'keine', to: '/pc/nu' },
    { bez: 'Betriebsurlaub', wert: d.betriebsurlaub.festgelegt ? 'festgelegt' : 'offen', sub: `${tm(d.betriebsurlaub.von)}–${tmj(d.betriebsurlaub.bis)}`, to: '/pc/betriebsurlaub' },
  ];
  const art = (x: Antrag) => (x.art === 'konto' ? `Frei vom Konto, ${h1(x.stunden ?? 0)}` : x.art === 'arbeitsbefreiung' ? 'Arbeitsbefreiung' : 'Urlaub');
  return (
    <PcSeite titel="Übersicht Geschäftsleitung" pfad={`Stand ${wtKurz(d.heute)}, ${tmj(d.heute)} · ${monatName(m)} läuft noch`}>
      {toast}
      <section className="pc-karte">
        <h2>Zu erledigen: Urlaubsanträge zur Genehmigung</h2>
        <span className="klein">Zweite Stufe: Die Oberbauleitung hat schon genehmigt und weitergegeben. Weg: Mitarbeiter → Oberbauleitung → Geschäftsleitung. Erst mit der Entscheidung hier ist der Urlaub genehmigt. Anträge der Oberbauleitung selbst kommen direkt hierher.</span>
        <div className="pk-reihe"><Pill farbe="orange">{zweite.length} offen</Pill><Pill farbe="gruen">{erledigt.filter((x) => x.status === 'genehmigt').length} genehmigt</Pill><Pill farbe="rot">{erledigt.filter((x) => x.status === 'abgelehnt').length} abgelehnt</Pill></div>
        <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Mitarbeiter</th><th>Zeitraum</th><th className="r">Tage</th><th className="r">Rest danach</th><th>Entscheidung</th></tr></thead><tbody>
          {[...zweite, ...erledigt.filter((x) => !zweite.includes(x))].map((x) => {
            const p = person(d, x.personId); const bs = baustelleVonTag(d, p.id, x.von) ?? d.baustellen.find((b) => d.einteilung.some((e) => e.personId === p.id && e.baustelleId === b.id));
            const fehlen = bs ? d.antraege.filter((y) => y.id !== x.id && y.von <= x.bis && y.bis >= x.von && (y.status === 'genehmigt' || y.status === 'gemeldet') && d.einteilung.some((e) => e.personId === y.personId && e.baustelleId === bs.id)).length : 0;
            return (
              <tr key={x.id}>
                <td><strong>{nameKomma(p)}</strong><br /><span className="klein">{rollenText(p.rolle) === p.rolle ? p.rolle : rollenText(p.rolle)}{bs ? ` · ${bsName(bs)}` : ''}</span></td>
                <td>{tm(x.von)}–{tmj(x.bis)}<br /><span className="klein">{art(x)}{fehlen ? ` · in der Zeit fehlt dort ${fehlen} weiterer Mitarbeiter` : ''}</span></td>
                <td className="r">{x.tage}</td>
                <td className="r">{x.art === 'urlaub' ? `${urlaubRest(d, p.id).rest} Tage` : h1(kontoStand(d, p.id) - (x.stunden ?? 0))}</td>
                <td>{x.status === 'bauleitung_ok' ? (ablehnen === x.id
                  ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label className="pc-feld"><span>Grund der Ablehnung (Pflicht)</span><input value={grund} onChange={(e) => setGrund(e.target.value)} /></label><span className="klein">Der Grund geht an den Mitarbeiter und an die Oberbauleitung.</span><div className="pk-reihe"><Pk klein onClick={() => setAblehnen(undefined)}>Abbrechen</Pk><Pk klein farbe="rot" gesperrt={grund.trim().length < 3} onClick={() => { a.glAntragEntscheiden(x.id, false, grund.trim()); setAblehnen(undefined); setGrund(''); zeige('Abgelehnt. Mitarbeiter und Oberbauleitung sind informiert.', 'orange'); }}>Ablehnung senden</Pk></div></div>
                  : <div className="pk-reihe"><Pk klein farbe="rot" onClick={() => setAblehnen(x.id)}>Ablehnen</Pk><Pk klein farbe="gruen" onClick={() => { a.glAntragEntscheiden(x.id, true); zeige(`${voll(p)}: genehmigt. Geht an die Verwaltung.`); }}>Genehmigen</Pk></div>)
                  : <><Pill farbe={x.status === 'genehmigt' ? 'gruen' : 'rot'}>{x.status === 'genehmigt' ? '✓ genehmigt' : 'abgelehnt'}</Pill>{x.ablehnGrund && <><br /><span className="klein">Grund: {x.ablehnGrund}</span></>}</>}</td>
              </tr>
            );
          })}
          {!zweite.length && !erledigt.length && <tr><td colSpan={5} className="klein">Zurzeit liegt kein Antrag bei der Geschäftsleitung.</td></tr>}
        </tbody></table></div>
        {beimBl.length > 0 && <span className="klein">Noch bei der Oberbauleitung (kommen erst nach ihrer Entscheidung hierher): {beimBl.map((x) => `${voll(person(d, x.personId))} ${tm(x.von)}–${tm(x.bis)}`).join(' · ')}</span>}
        {ueber100.map((p) => <div key={p.id} className="meldung orange"><strong>Mehrstunden über 100 h:</strong> {voll(p)} ({rollenText(p.rolle)}): {h1(mehrStand(d, p.id))}. Weitere Überstunden nur mit Genehmigung der Geschäftsleitung. <Link className="link" to="/pc/mehrstunden">Mehrstunden Angestellte ›</Link></div>)}
      </section>
      <div className="pc-raster">{kacheln.map((k) => <Link key={k.bez} to={k.to} className="kpi"><span className="bez">{k.bez}</span><span className="wert">{k.wert}</span><span className="klein">{k.sub}</span></Link>)}</div>
      <section className="pc-karte">
        <div className="pk-reihe" style={{ justifyContent: 'space-between' }}><h2>Baustellen: Soll-Ist und Tendenz</h2><div className="pk-reihe"><Link className="link" to="/pc/projektkosten">Kosten je Baustelle ›</Link><Link className="link" to="/pc/auswertung/baustelle">Auswertung je Baustelle ›</Link></div></div>
        <span className="klein">Lohnstunden seit Baubeginn, ohne Angestellte (umgelegt). Disponiert = laut Einteilung der nächsten 10 Tage geplant. Die Ampel richtet sich nur nach dem Ist.</span>
        <BaustellenTabelle d={d} liste={d.baustellen.filter((b) => !b.archiviert)} />
      </section>
      <section className="pc-karte">
        <h2>Oberbauleitung festlegen</h2>
        <span className="klein">Die Oberbauleitung entscheidet alle Anträge (Urlaub, Frei vom Konto, Arbeitsbefreiung). Der eingeteilte Bauleiter sieht sie nur. Urlaub kommt danach zur Geschäftsleitung. Außerdem gibt die Oberbauleitung die eigenen Tage der Bauleiter frei.</span>
        <div className="pk-reihe">
          <label className="pc-feld"><span>Oberbauleiter</span><select value={oblNeu} onChange={(e) => setOblNeu(e.target.value)}>{oblWahl.map((p) => <option key={p.id} value={p.id}>{nameKomma(p)} ({rollenText(p.rolle)})</option>)}</select></label>
          <Pk farbe="blau" gesperrt={oblNeu === d.oberbauleitungId} onClick={() => { a.oberbauleitungSetzen(oblNeu); zeige(`Oberbauleitung: ${voll(person(d, oblNeu))}. Offene Anträge liegen jetzt dort.`); }}>Festlegen</Pk>
          <span className="klein">Jetzt: <strong>{voll(obl)}</strong></span>
        </div>
        {oblNeu !== d.oberbauleitungId && d.baustellen.some((b) => b.bauleitungId === oblNeu) && <div className="meldung orange">{voll(person(d, oblNeu))} ist Bauleiter von {d.baustellen.filter((b) => b.bauleitungId === oblNeu).map((b) => b.kst).join(', ')}. Als Oberbauleiter sieht er die Bauleiter-Seiten nicht mehr. Bitte die Baustellen danach neu zuordnen.</div>}
        {oblNeu !== d.oberbauleitungId && obl.rolle === 'oberbauleitung' && <span className="klein">{voll(obl)} wird danach als Bauleiter geführt.</span>}
      </section>
      <section className="pc-karte">
        <h2>Vertretung des Lohnbüros durch die Buchhaltung</h2>
        <span className="klein">Schaltet die Geschäftsleitung ein und aus (mit Zeitraum). In der Zeit sieht die Buchhaltung die Seiten von Personal / HR / Lohn.</span>
        {d.vertretung.aktiv
          ? <div className="meldung blau">Vertretung aktiv vom {tmj(d.vertretung.von!)} bis {tmj(d.vertretung.bis!)}. <Pk klein onClick={() => { a.vertretungSetzen({ aktiv: false }); zeige('Vertretung ausgeschaltet.'); }}>Ausschalten</Pk></div>
          : <div className="pk-reihe"><label className="pc-feld"><span>von</span><input type="date" value={vt.von} onChange={(e) => setVt({ ...vt, von: e.target.value })} /></label><label className="pc-feld"><span>bis</span><input type="date" value={vt.bis} onChange={(e) => setVt({ ...vt, bis: e.target.value })} /></label><Pk farbe="blau" gesperrt={vt.bis < vt.von} onClick={() => { a.vertretungSetzen({ aktiv: true, ...vt }); zeige('Vertretung eingeschaltet.'); }}>Vertretung einschalten</Pk></div>}
      </section>
      <section className="pc-karte">
        <h2>Änderungsprotokoll (inhaltlich)</h2>
        <span className="klein">Wer hat Stunden, Urlaub oder Stammdaten geändert. Sehen Geschäftsleitung, kaufm. Leitung und Personal / HR / Lohn. Zu den Stundensätzen der Nachunternehmer gibt es kein Protokoll.</span>
        <div className="tab-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}><table className="tabelle"><thead><tr><th>Zeit</th><th>Wer</th><th>Was</th><th>Begründung</th></tr></thead><tbody>
          {d.protokoll.slice(-40).reverse().map((l, i) => <tr key={i}><td className="klein">{tm(l.zeit.slice(0, 10))} {uhr(l.zeit)}</td><td>{l.wer}</td><td>{l.was}</td><td className="klein">{l.warum ?? ''}</td></tr>)}
        </tbody></table></div>
      </section>
    </PcSeite>
  );
}

// ------------------------------------------------------------------ Administrator

const ROLLEN_WAHL: Rolle[] = ['facharbeiter', 'helfer', 'vorarbeiter', 'polier', 'bauleitung', 'oberbauleitung', 'buero', 'einkauf', 'gl', 'admin'];
const ROLLE_KURZ: Partial<Record<Rolle, string>> = { facharbeiter: 'Mitarbeiter (gewerblich)', helfer: 'Helfer', vorarbeiter: 'Vorarbeiter' };
const rText = (r: Rolle) => ROLLE_KURZ[r] ?? rollenText(r);

export function PcAdmin() {
  const { d, a } = useDaten();
  const [filter, setFilter] = useState<'' | Rolle>('');
  const [sel, setSel] = useState('keller');
  const [neu, setNeu] = useState({ name: '', mail: '', rolle: 'facharbeiter' as Rolle });
  const [rb, setRb] = useState({ b: '', r: 'polier' as 'bauleitung' | 'polier' | 'vorarbeiter' });
  const [toast, zeige] = useToast();
  const leute = d.personen.filter((p) => p.rolle !== 'nu' && (!filter || p.rolle === filter)).sort((x, y) => nameKomma(x).localeCompare(nameKomma(y)));
  const p = d.personen.find((x) => x.id === sel)!;
  const jeBs: { r: string; b: Daten['baustellen'][number]; fest: boolean; roh?: 'bauleitung' | 'polier' | 'vorarbeiter' }[] = [
    ...d.baustellen.filter((b) => b.bauleitungId === p.id).map((b) => ({ r: 'Bauleitung', b, fest: true })),
    ...d.baustellen.filter((b) => b.polierId === p.id).map((b) => ({ r: 'Polier', b, fest: true })),
    ...d.rollenJeBaustelle.filter((x) => x.personId === p.id).map((x) => ({ r: x.rolle === 'vorarbeiter' ? 'Vorarbeiter mit Polierrolle' : x.rolle === 'polier' ? 'Polier' : 'Bauleitung', b: baustelle(d, x.baustelleId)!, fest: false, roh: x.rolle })),
  ];
  return (
    <PcSeite titel="Benutzer und Rollen" pfad="Administrator › Benutzer, Rollen und Zugänge">
      {toast}
      <div className="meldung blau">Der Administrator verwaltet nur. Stunden, Abwesenheiten, Krankschreibungen, Löhne, Kosten und Stundensätze der Nachunternehmer sieht er nicht.</div>
      <section className="pc-karte">
        <h2>Neuer Benutzer</h2>
        <div className="pc-formular">
          <label className="pc-feld"><span>Name</span><input value={neu.name} onChange={(e) => setNeu({ ...neu, name: e.target.value })} /></label>
          <label className="pc-feld"><span>E-Mail (für Einladung und PC-Anmeldung)</span><input type="email" value={neu.mail} onChange={(e) => setNeu({ ...neu, mail: e.target.value })} /></label>
          <label className="pc-feld"><span>Erste Rolle (firmenweit)</span><select value={neu.rolle} onChange={(e) => setNeu({ ...neu, rolle: e.target.value as Rolle })}>{ROLLEN_WAHL.map((r) => <option key={r} value={r}>{rText(r)}</option>)}</select></label>
          <Pk farbe="blau" gesperrt={neu.name.trim().split(/\s+/).length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(neu.mail.trim())} onClick={() => {
            const t = neu.name.trim().split(/\s+/);
            const id = a.personAnlegen({ vorname: t.slice(0, -1).join(' '), nachname: t[t.length - 1], gruppe: ['facharbeiter', 'helfer', 'vorarbeiter'].includes(neu.rolle) ? 'gewerblich' : 'angestellt', eintritt: d.heute, email: neu.mail.trim() });
            a.benutzerRolle(id, neu.rolle);
            setSel(id); setNeu({ name: '', mail: '', rolle: 'facharbeiter' });
            zeige(`Angelegt und eingeladen. Der Link gilt 7 Tage.`);
          }}>Anlegen und einladen</Pk>
        </div>
        <span className="klein">Mitarbeiter-Stammdaten wie Eintritt und Urlaubsanspruch pflegt Personal / HR / Lohn, nicht der Administrator.</span>
      </section>
      <div className="pc-liste-detail">
        <div className="pc-wahlliste">
          <div style={{ padding: 10 }}><select className="pc-in" style={{ width: '100%' }} aria-label="Rolle filtern" value={filter} onChange={(e) => setFilter(e.target.value as Rolle)}><option value="">Rolle: alle ({d.personen.filter((x) => x.rolle !== 'nu').length})</option>{ROLLEN_WAHL.map((r) => <option key={r} value={r}>{rText(r)}</option>)}</select></div>
          {leute.map((x) => <button key={x.id} type="button" aria-pressed={x.id === sel} onClick={() => setSel(x.id)}><strong>{voll(x)}</strong><span className="klein">{rText(x.rolle)} · {x.zugang === 'aktiv' ? 'aktiv' : x.zugang}</span></button>)}
        </div>
        <section className="pc-karte">
          <h2 style={{ fontSize: 22 }}>{voll(p)}</h2>
          <span className="klein">{p.email ?? 'keine E-Mail-Adresse'}</span>
          <label className="pc-feld"><span>Rolle firmenweit</span><select value={p.rolle} onChange={(e) => { a.benutzerRolle(p.id, e.target.value as Rolle); zeige('Rolle geändert.'); }}>{ROLLEN_WAHL.map((r) => <option key={r} value={r}>{rText(r)}</option>)}</select></label>
          <strong>Rollen je Baustelle</strong>
          {jeBs.length ? jeBs.map((x, i) => <div key={i} className="pk-reihe" style={{ justifyContent: 'space-between' }}><span>{x.r} · {bsName(x.b)}</span>{x.fest ? <span className="klein">aus der Baustellenliste</span> : <Pk klein onClick={() => a.rolleJeBaustelle(p.id, x.b.id, x.roh!, false)}>Entfernen</Pk>}</div>) : <span className="klein">Keine Rolle je Baustelle.</span>}
          <div className="pk-reihe">
            <select className="pc-in" aria-label="Baustelle" value={rb.b} onChange={(e) => setRb({ ...rb, b: e.target.value })}><option value="">Baustelle</option>{d.baustellen.filter((b) => !b.archiviert).map((b) => <option key={b.id} value={b.id}>{bsName(b)}</option>)}</select>
            <select className="pc-in" aria-label="Rolle" value={rb.r} onChange={(e) => setRb({ ...rb, r: e.target.value as typeof rb.r })}><option value="bauleitung">Bauleitung</option><option value="polier">Polier</option></select>
            <Pk gesperrt={!rb.b} onClick={() => { a.rolleJeBaustelle(p.id, rb.b, rb.r, true); setRb({ ...rb, b: '' }); zeige('Rolle je Baustelle hinzugefügt.'); }}>Rolle je Baustelle hinzufügen</Pk>
          </div>
          <div className="pk-reihe">
            <Pk onClick={() => { a.zugangSetzen(p.id, 'eingeladen', 'Einladung erneut gesendet'); zeige('Einladung erneut gesendet.'); }}>Einladung erneut senden</Pk>
            <Pk onClick={() => { a.techLog(`PIN / Passwort zurückgesetzt: ${voll(p)}`); zeige('PIN / Passwort zurückgesetzt.'); }}>PIN / Passwort zurücksetzen</Pk>
            {p.zugang !== 'gesperrt' ? <Pk farbe="rot" onClick={() => { a.zugangSetzen(p.id, 'gesperrt', 'Zugang gesperrt'); zeige('Zugang gesperrt. Alle Geräte sind abgemeldet.', 'orange'); }}>Zugang sperren</Pk> : <Pk onClick={() => { a.zugangSetzen(p.id, 'aktiv', 'Zugang entsperrt'); zeige('Zugang entsperrt.'); }}>Entsperren</Pk>}
          </div>
        </section>
      </div>
      <section className="pc-karte">
        <h2>Vertretung des Lohnbüros</h2>
        <span className="text">Die Vertretung von Personal / HR / Lohn durch die Buchhaltung schaltet die Geschäftsleitung ein und aus, nicht der Administrator. Stand: {d.vertretung.aktiv ? `aktiv bis ${tmj(d.vertretung.bis!)}` : 'aus'}.</span>
      </section>
      <section className="pc-karte">
        <h2>Protokoll (nur technische Einträge)</h2>
        <span className="klein">Anmeldungen und Änderungen an Rechten · keine Inhalte</span>
        <div className="tab-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}><table className="tabelle"><thead><tr><th>Zeit</th><th>Wer</th><th>Was</th></tr></thead><tbody>
          {d.techLog.slice().reverse().map((l, i) => <tr key={i}><td className="klein">{tm(l.zeit.slice(0, 10))} {uhr(l.zeit)}</td><td>{l.wer}</td><td>{l.was}</td></tr>)}
        </tbody></table></div>
      </section>
    </PcSeite>
  );
}

// ------------------------------------------------------------------ gemeinsame Tabellen für Polier und Bauleitung

function TagZeile({ d, t, kind }: { d: Daten; t: Tag; kind: 'polier' | 'bauleitung' | 'obl' }) {
  const { a } = useDaten();
  const [modus, setModus] = useState<'' | 'korr' | 'zurueck' | 'pause'>('');
  const [beginn, setBeginn] = useState('');
  const [ende, setEnde] = useState('');
  const [grund, setGrund] = useState('');
  const p = person(d, t.personId);
  const r = rechnung(d, t.personId, t.datum);
  const hw = hinweiseTag(d, t);
  const zus = t.zuschlaege;
  const wartet = offeneKorrekturen(t);
  const frist = wartet.length ? wartet.map(fristRueckmeldung).sort().pop()! : '';
  const ws = offeneWidersprueche(t);
  const gesperrt = kind === 'polier' ? wartet.length > 0 : kind === 'bauleitung' ? ws.length > 0 : false;
  const sperrGrund = kind === 'polier' && wartet.length ? `Wartet auf ${p.vorname} (Korrektur)` : ws.length ? 'Erst den Widerspruch entscheiden' : undefined;
  const freigeben = () => {
    if (kind === 'polier') { if (r.pauseFehlt && !t.pauseBegruendung) return setModus('pause'); a.polierFreigeben([t.id]); }
    else if (kind === 'obl') a.oblFreigeben([t.id]);
    else a.bauleitungFreigeben([t.id]);
  };
  return (
    <>
      <tr>
        <td><strong>{nameKomma(p)}</strong><br /><span className="klein">{p.rolle === 'nu' ? 'Nachunternehmer' : rollenText(p.rolle) === p.rolle ? p.rolle : rollenText(p.rolle)}{!p.nutztApp ? ' · ohne Handy' : ''}</span></td>
        <td>{wtKurz(t.datum)} {tm(t.datum)}<br /><span className="klein">{r.beginn ? uhr(r.beginn.zeit) : '–'}–{r.ende ? uhr(r.ende.zeit) : '–'} · Pause {r.pauseMin} Min.</span></td>
        <td className="r">{h1(r.arbeitMin / 60)}</td>
        <td>{zus.length ? zus.map((z) => <div key={z.id} className="pk-reihe" style={{ gap: 4 }}><span className="klein">{z.art} {h1(z.stunden)}</span>{kind === 'polier' && <><button type="button" className="link klein" aria-pressed={z.entscheidung === 'ok'} onClick={() => a.zuschlagEntscheiden(t.id, z.id, 'ok')}>{z.entscheidung === 'ok' ? '✓ ok' : 'ok'}</button><button type="button" className="link klein" onClick={() => a.zuschlagEntscheiden(t.id, z.id, 'weg')}>{z.entscheidung === 'weg' ? 'gestrichen' : 'streichen'}</button></>}</div>) : <span className="klein">keine</span>}</td>
        <td>{hw.length ? hw.map((h) => <div key={h}><Pill farbe="orange">{h}</Pill></div>) : <span className="klein">kein Hinweis</span>}</td>
        <td><div className="pk-reihe">
          <Pk klein farbe="gruen" gesperrt={gesperrt} titel={sperrGrund} onClick={freigeben}>Freigeben</Pk>
          {kind === 'polier' && wartet.length > 0 && d.heute >= frist && <Pk klein onClick={() => a.ohneRueckmeldungEntschieden(t.id)}>Ohne Rückmeldung entscheiden</Pk>}
          {kind === 'bauleitung' && ws.length > 0 && <Link className="link klein" to="/pc/bl/widersprueche">Widerspruch entscheiden ›</Link>}
          {kind === 'polier' && <Pk klein onClick={() => { setModus(modus === 'korr' ? '' : 'korr'); setBeginn(r.beginn ? uhr(r.beginn.zeit) : ''); setEnde(r.ende ? uhr(r.ende.zeit) : ''); }}>Korrigieren</Pk>}
          {kind === 'bauleitung' && t.polierFreigabeVon && <Pk klein farbe="rot" onClick={() => setModus(modus === 'zurueck' ? '' : 'zurueck')}>Zurück an Polier</Pk>}
        </div></td>
      </tr>
      {modus && (
        <tr><td colSpan={6} style={{ background: 'var(--grund)' }}>
          {modus === 'korr' && <div className="pk-reihe">
            <label className="pc-feld"><span>Beginn</span><input type="time" value={beginn} onChange={(e) => setBeginn(e.target.value)} /></label>
            <label className="pc-feld"><span>Ende</span><input type="time" value={ende} onChange={(e) => setEnde(e.target.value)} /></label>
            <label className="pc-feld" style={{ flexGrow: 1 }}><span>Begründung (Pflicht, sieht der Mitarbeiter)</span><input value={grund} onChange={(e) => setGrund(e.target.value)} /></label>
            <Pk klein onClick={() => setModus('')}>Abbrechen</Pk>
            <Pk klein farbe="blau" gesperrt={grund.trim().length < 3} onClick={() => {
              if (r.beginn && beginn && beginn !== uhr(r.beginn.zeit)) a.zeitKorrigieren(t.id, r.beginn.id, beginn, grund.trim());
              if (r.ende && ende && ende !== uhr(r.ende.zeit)) a.zeitKorrigieren(t.id, r.ende.id, ende, grund.trim());
              setModus(''); setGrund('');
            }}>Korrektur speichern</Pk>
            <span className="klein">Jede Korrektur wird mit altem Wert, neuem Wert und Begründung gespeichert. {p.vorname} wird informiert und kann widersprechen. Freigeben kannst du nach seiner Antwort. Stempelungen: {r.gueltig.map((s) => `${artName(s.art)} ${uhr(s.zeit)}`).join(', ')}</span>
          </div>}
          {modus === 'pause' && <div className="pk-reihe"><span className="text">Über 6 Stunden ohne ausreichende Pause ist nicht erlaubt (Arbeitszeitgesetz). Der Fall wird dem Bauleiter gemeldet.</span><label className="pc-feld" style={{ flexGrow: 1 }}><span>Warum ohne Pause freigeben? (Pflicht, sieht der Bauleiter)</span><input value={grund} onChange={(e) => setGrund(e.target.value)} /></label><Pk klein onClick={() => setModus('')}>Abbrechen</Pk><Pk klein farbe="blau" gesperrt={grund.trim().length < 3} onClick={() => { a.polierFreigeben([t.id], grund.trim()); setModus(''); }}>Ohne Pause freigeben</Pk></div>}
          {modus === 'zurueck' && <div className="pk-reihe"><label className="pc-feld" style={{ flexGrow: 1 }}><span>Grund für {voll(person(d, t.polierFreigabeVon!))} (Pflicht)</span><input value={grund} onChange={(e) => setGrund(e.target.value)} /></label><Pk klein onClick={() => setModus('')}>Abbrechen</Pk><Pk klein farbe="rot" gesperrt={grund.trim().length < 3} onClick={() => { a.zurueckAnPolier(t.id, grund.trim()); setModus(''); }}>Zurückgeben</Pk><span className="klein">Der Polier hat 2 Werktage Zeit, danach entscheidest du selbst.</span></div>}
        </td></tr>
      )}
    </>
  );
}

function TagTabelle({ d, gruppen, kind, leer }: { d: Daten; gruppen: { titel: string; tage: Tag[] }[]; kind: 'polier' | 'bauleitung' | 'obl'; leer: string }) {
  const { a } = useDaten();
  const alle = gruppen.flatMap((g) => g.tage);
  const ohne = alle.filter((t) => !hinweiseTag(d, t).length && !(kind === 'polier' && rechnung(d, t.personId, t.datum).pauseFehlt) && !(kind === 'bauleitung' && person(d, t.personId).nutztApp === false));
  return (
    <>
      <div className="pk-reihe"><Pk farbe="blau" gesperrt={!ohne.length} onClick={() => (kind === 'polier' ? a.polierFreigeben(ohne.map((t) => t.id)) : kind === 'obl' ? a.oblFreigeben(ohne.map((t) => t.id)) : a.bauleitungFreigeben(ohne.map((t) => t.id)))}>Alle ohne Hinweis freigeben ({ohne.length})</Pk><span className="klein">Tage mit Hinweis{kind === 'bauleitung' ? ' und vom Polier erfasste Tage' : ''} gibst du einzeln frei.</span></div>
      {gruppen.filter((g) => g.tage.length).map((g) => (
        <section key={g.titel} className="pc-karte">
          <h2>{g.titel} · {g.tage.length} Tage</h2>
          <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Mitarbeiter</th><th>Tag und Zeiten</th><th className="r">Stunden</th><th>Zuschläge</th><th>Status und Hinweis</th><th>Aktion</th></tr></thead>
            <tbody>{g.tage.sort((x, y) => x.datum.localeCompare(y.datum)).map((t) => <TagZeile key={t.id} d={d} t={t} kind={kind} />)}</tbody></table></div>
        </section>
      ))}
      {!alle.length && <div className="meldung gruen">{leer}</div>}
    </>
  );
}

// ------------------------------------------------------------------ Polier am PC

export function PcPolier() {
  const { d, ich } = useDaten();
  const bs = d.baustellen.filter((b) => b.polierId === ich!.id && !b.archiviert);
  const offen = tageBeimPolier(d, ich!.id).reduce((s, g) => s + g.tage.length, 0);
  const kolonne = d.einteilung.filter((e) => e.datum === d.heute && bs.some((b) => b.id === e.baustelleId));
  const rueck = d.tage.filter((t) => t.korrekturen.some((k) => k.antwort === 'widerspruch' && !k.entscheidung) && bs.some((b) => baustelleVonTag(d, t.personId, t.datum)?.id === b.id));
  const vergessen = vorschlaegeFuerPolier(d, ich!.id);
  const todo = [
    { n: offen, was: 'Tage zur Freigabe', to: '/pc/polier/freigabe' },
    { n: vergessen.length, was: 'Meldungen „Stempeln vergessen“', to: '/p/vorschlag' },
    { n: d.personen.filter((p) => !p.nutztApp && p.rolle !== 'nu' && kolonne.some((e) => e.personId === p.id)).length, was: 'Stunden ohne Handy erfassen', to: '/p/ohne-handy' },
    { n: d.helferDispo.filter((h) => bs.some((b) => b.id === h.baustelleId)).length, was: 'Helfer- und NU-Stunden schreiben', to: '/pc/polier/helfer' },
  ];
  return (
    <PcSeite titel="Übersicht" pfad={`Polier › Übersicht · ${wtKurz(d.heute)}, ${tmj(d.heute)}`}>
      <div className="pc-raster">
        <Link to="/pc/polier/freigabe" className="kpi"><span className="bez">Zu prüfen</span><span className="wert">{offen}</span><span className="klein">Tage bei dir</span></Link>
        <div className="kpi"><span className="bez">Kolonne heute</span><span className="wert">{kolonne.length}</span><span className="klein">Personen auf {bs.length} Baustellen</span></div>
        <div className="kpi"><span className="bez">Offene Rückfragen</span><span className="wert">{rueck.length}</span><span className="klein">Widersprüche gegen Korrekturen (entscheidet der Bauleiter)</span></div>
      </div>
      <section className="pc-karte">
        <h2>Heute zu tun</h2>
        <div className="tab-wrap"><table className="tabelle"><tbody>{todo.map((x) => <tr key={x.was}><td className="r" style={{ width: 50 }}><strong>{x.n}</strong></td><td>{x.was}</td><td><Pill farbe={x.n ? 'orange' : 'gruen'}>{x.n ? 'offen' : '✓ erledigt'}</Pill></td><td><Link className="link" to={x.to}>öffnen ›</Link></td></tr>)}</tbody></table></div>
      </section>
      <section className="pc-karte"><h2>Meine Baustellen</h2><BaustellenTabelle d={d} liste={bs} /></section>
      <span className="klein">Du siehst nur deine Baustellen und deine Kolonne. Keine Löhne einzelner Kollegen, keine Standortdaten. Angestellte (auch du) zählen nicht in die Baustellensumme.</span>
    </PcSeite>
  );
}

export function PcPolierFreigabe() {
  const { d, ich } = useDaten();
  const g = tageBeimPolier(d, ich!.id);
  return (
    <PcSeite titel="Freigabe" pfad="Polier › Freigabe · Mitarbeiter → Polier (du) → Bauleiter → Verwaltung">
      <TagTabelle d={d} kind="polier" gruppen={g.map((x) => ({ titel: bsLang(x.baustelle), tage: x.tage }))} leer="Alles erledigt. Zurzeit liegt kein Tag bei dir." />
      <span className="klein">Zeiten ohne Handy erfassen, Vorschläge zu vergessenem Stempeln und die PIN-Bestätigung laufen über das Handy des Poliers: <Link className="link" to="/p/ohne-handy">Stunden ohne Handy</Link> · <Link className="link" to="/p/vorschlag">Vorschläge</Link></span>
    </PcSeite>
  );
}

export function PcPolierEinteilung() {
  const { d, a, ich } = useDaten();
  const [text, setText] = useState('');
  const [bid, setBid] = useState('');
  const [toast, zeige] = useToast();
  const bs = d.baustellen.filter((b) => b.polierId === ich!.id && !b.archiviert);
  const tage = [0, 1, 2, 3, 4].map((i) => plusTage(d.heute, i)).filter((k) => !['Sa', 'So'].includes(wtKurz(k)));
  return (
    <PcSeite titel="Einteilung" pfad="Polier › Einteilung · nur lesen, die Disposition macht Bauleitung bzw. Oberbauleitung">
      {toast}
      {bs.map((b) => (
        <section key={b.id} className="pc-karte">
          <h2>{bsLang(b)}</h2>
          <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Tag</th><th>Personen</th><th>Geräte</th></tr></thead><tbody>
            {tage.map((k) => <tr key={k}><td>{wtKurz(k)} {tm(k)}</td><td>{d.einteilung.filter((e) => e.baustelleId === b.id && e.datum === k).map((e) => { const p = person(d, e.personId); const w = nuWarnung(d, p); return <span key={p.id + (e.haelfte ?? '')} className={`dispo-pill${p.rolle === 'nu' ? ' nu' : ''}${w ? ' warn' : ''}`} title={w} style={{ paddingRight: 9 }}>{w ? '! ' : ''}{voll(p)}{e.haelfte ? ` · ${e.haelfte.toUpperCase()}` : ''}</span>; })}</td><td>{d.geraeteEinteilung.filter((e) => e.baustelleId === b.id && e.datum === k).map((e) => <span key={e.geraetId} className="dispo-pill geraet" style={{ paddingRight: 9 }}>{d.geraetePool.find((g) => g.id === e.geraetId)?.name}</span>)}</td></tr>)}
          </tbody></table></div>
        </section>
      ))}
      <section className="pc-karte">
        <h2>Nachricht an die Verwaltung</h2>
        <span className="klein">Zum Beispiel: Gerät nicht mehr nötig, ein Mann mehr ab Donnerstag. Die Nachricht erscheint oben in der Disposition.</span>
        <div className="pc-formular">
          <label className="pc-feld"><span>Baustelle</span><select value={bid} onChange={(e) => setBid(e.target.value)}><option value="">– allgemein –</option>{bs.map((b) => <option key={b.id} value={b.id}>{bsName(b)}</option>)}</select></label>
          <label className="pc-feld" style={{ gridColumn: 'span 2' }}><span>Nachricht</span><input value={text} onChange={(e) => setText(e.target.value)} /></label>
          <Pk farbe="blau" gesperrt={text.trim().length < 3} onClick={() => { a.nachrichtSenden(text.trim(), bid || undefined); setText(''); zeige('Nachricht gesendet.'); }}>Senden</Pk>
        </div>
        {d.nachrichten.filter((n) => n.von === ich!.id).slice(-5).reverse().map((n) => <span key={n.id} className="klein">{tm(n.zeit.slice(0, 10))} {uhr(n.zeit)}: „{n.text}“ {n.erledigt ? <Pill farbe="gruen">erledigt</Pill> : <Pill>offen</Pill>}</span>)}
      </section>
    </PcSeite>
  );
}

export function PcPolierHelfer() {
  const { d, ich } = useDaten();
  const bs = d.baustellen.filter((b) => b.polierId === ich!.id);
  const eintraege = d.helfer.filter((h) => bs.some((b) => b.id === h.baustelleId)).sort((x, y) => y.datum.localeCompare(x.datum));
  return (
    <PcSeite titel="Helfer und Nachunternehmer" pfad="Polier › Helfer und NU · Stunden für Personen ohne App">
      <div className="meldung blau">Für Personen ohne App schreibst du die Stunden (Helfer-Stunden). Der Bauleiter zeichnet gegen. Eigene Helfer (Fa. Baumann) gehen danach an die Lohnbuchhaltung, Nachunternehmer dienen der Rechnungsprüfung. <Link className="link" to="/p/helfer">Stunden heute schreiben ›</Link></div>
      <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Datum</th><th>Baustelle</th><th>Name</th><th>Firma</th><th>von – bis</th><th className="r">Stunden</th><th>Gegengezeichnet</th></tr></thead><tbody>
        {eintraege.map((h) => <tr key={h.id}><td>{tm(h.datum)}</td><td>{baustelle(d, h.baustelleId)?.kst}</td><td>{h.name}{h.warnung && <><br /><Pill farbe="rot">! {h.warnung}</Pill></>}</td><td>{h.firma === 'eigen' ? 'Fa. Baumann (eigen)' : h.firma}</td><td>{h.von}–{h.bis}</td><td className="r">{h1(helferStunden(h))}</td><td>{h.gegengezeichnet ? <Pill farbe="gruen">✓</Pill> : <Pill farbe="orange">beim Bauleiter</Pill>}</td></tr>)}
        {!eintraege.length && <tr><td colSpan={7} className="klein">Noch keine Einträge.</td></tr>}
      </tbody></table></div>
    </PcSeite>
  );
}

// ------------------------------------------------------------------ Bauleiter am PC

export function PcBl() {
  const { d, a, ich } = useDaten();
  const bs = d.baustellen.filter((b) => b.bauleitungId === ich!.id && !b.archiviert);
  const frei = tageBeiBauleitung(d, ich!.id).reduce((s, g) => s + g.tage.length, 0);
  const gz = d.helfer.filter((h) => !h.gegengezeichnet && bs.some((b) => b.id === h.baustelleId)).length;
  const ws = d.tage.reduce((s, t) => s + t.korrekturen.filter((k) => k.antwort === 'widerspruch' && !k.entscheidung).length, 0);
  const an = antraegeFuerBauleitung(d, ich!.id).filter((x) => x.status === 'offen').length;
  const eigen = d.tage.find((t) => t.personId === ich!.id && t.datum === d.heute);
  const r = rechnung(d, ich!.id, d.heute);
  const todo = [
    { n: frei, was: 'Tage freigeben', sub: 'vom Polier geprüft', to: '/pc/bl/freigabe' },
    { n: gz, was: 'Helfer-Stunden gegenzeichnen', sub: 'Vier-Augen', to: '/pc/bl/gegenzeichnen' },
    { n: vorschlaegeFuerBauleitung(d, ich!.id).length, was: 'Meldungen „Stempeln vergessen“ der Poliere', sub: 'auf dem Handy übernehmen oder ablehnen', to: '/b/vorschlag' },
    { n: ws, was: 'Widersprüche entscheiden', sub: 'Mitarbeiter widerspricht einer Korrektur', to: '/pc/bl/widersprueche' },
    { n: an, was: 'Anträge deiner Leute (zur Info)', sub: 'entscheidet die Oberbauleitung', to: '/pc/bl/antraege' },
  ];
  return (
    <PcSeite titel="Übersicht" pfad={`Bauleiter › Übersicht · Stand ${tmj(d.heute)} · ${bs.length} Baustellen`}>
      <section className="pc-karte">
        <h2>Heute zu tun</h2>
        <div className="tab-wrap"><table className="tabelle"><tbody>{todo.map((x) => <tr key={x.was}><td className="r" style={{ width: 50 }}><strong>{x.n}</strong></td><td>{x.was}<br /><span className="klein">{x.sub}</span></td><td><Pill farbe={x.n ? 'orange' : 'gruen'}>{x.n ? 'offen' : '✓ erledigt'}</Pill></td><td><Link className="link" to={x.to}>Bereich öffnen ›</Link></td></tr>)}</tbody></table></div>
      </section>
      <section className="pc-karte"><h2>Meine Baustellen</h2><span className="klein">Stunden seit Baubeginn. Ampel nur nach dem Ist.</span><BaustellenTabelle d={d} liste={bs} /></section>
      <section className="pc-karte">
        <h2>So läuft die Freigabe</h2>
        <span className="text">1 · Mitarbeiter sendet den Tag → 2 · Polier prüft und gibt frei (bei Baustellenwechsel jeder Polier für seine Baustelle) → 3 · Bauleiter gibt frei (du) → 4 · Personal / HR / Lohn übernimmt. Wer erfasst, gibt nicht frei: Tage, die der Polier für Leute ohne Handy erfasst oder nachgetragen hat, und die eigenen Tage der Poliere gibst du frei.</span>
      </section>
      <section className="pc-karte">
        <h2>Mein eigener Tag: {wtKurz(d.heute)}, {tmj(d.heute)}</h2>
        <span className="klein">Deine eigenen Stunden sendest du an die Oberbauleitung. Du gibst sie nicht selbst frei.</span>
        <span className="text">{r.beginn ? `Beginn ${uhr(r.beginn.zeit)}` : 'Noch nicht gestempelt'}{r.ende ? ` · Ende ${uhr(r.ende.zeit)} · Pause ${r.pauseMin} Min. · ${h1(r.arbeitMin / 60)}` : ''}</span>
        {eigen?.anOberbauleitung ? <div className="meldung gruen">Gesendet an die Oberbauleitung ({voll(person(d, d.oberbauleitungId))}).</div> : <div className="pk-reihe"><Pk farbe="blau" gesperrt={!r.ende} titel={!r.ende ? 'Erst nach dem Ende' : undefined} onClick={() => a.eigenenTagSenden(d.heute)}>Tag an die Oberbauleitung senden</Pk><Link className="link" to="/b/meine-zeit">Auf dem Handy stempeln ›</Link></div>}
      </section>
    </PcSeite>
  );
}

export function PcBlFreigabe() {
  const { d, ich } = useDaten();
  const g = tageBeiBauleitung(d, ich!.id);
  return (
    <PcSeite titel="Freigabe" pfad="Bauleiter › Freigabe · Die Poliere haben diese Tage geprüft. Nach deiner Freigabe übernimmt Personal / HR / Lohn.">
      <TagTabelle d={d} kind="bauleitung" gruppen={g.map((x) => ({ titel: bsLang(x.baustelle), tage: x.tage.filter((t) => !t.anOberbauleitung) }))} leer="Zurzeit liegt kein Tag zur Freigabe bei dir." />
    </PcSeite>
  );
}

export function PcBlGegenzeichnen() {
  const { d, a, ich } = useDaten();
  const [toast, zeige] = useToast();
  const bs = d.baustellen.filter((b) => b.bauleitungId === ich!.id);
  const offen = d.helfer.filter((h) => !h.gegengezeichnet && bs.some((b) => b.id === h.baustelleId));
  return (
    <PcSeite titel="Gegenzeichnen" pfad="Bauleiter › Gegenzeichnen · Vier-Augen für Stunden ohne App">
      {toast}
      <span className="klein">Der Polier oder Vorarbeiter hat die Stunden für Personen ohne App geschrieben. Du zeichnest gegen. Wer eine App hat, sendet selbst.</span>
      <div className="pk-reihe"><Pk farbe="blau" gesperrt={!offen.length} onClick={() => { a.gegenzeichnen(offen.filter((h) => !h.warnung).map((h) => h.id)); zeige('Gegengezeichnet.'); }}>Alle ohne Warnung gegenzeichnen</Pk></div>
      <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Person</th><th>Baustelle · Tag</th><th>Firma</th><th>von – bis</th><th className="r">Stunden</th><th>Tätigkeit</th><th /></tr></thead><tbody>
        {offen.map((h) => <tr key={h.id}><td>{h.name}{h.warnung && <><br /><Pill farbe="rot">! {h.warnung}</Pill></>}</td><td>{baustelle(d, h.baustelleId)?.kst} · {wtKurz(h.datum)} {tm(h.datum)}</td><td>{h.firma === 'eigen' ? 'Fa. Baumann (eigen)' : h.firma}{h.nu && <> <Pill>NU</Pill></>}</td><td>{h.von}–{h.bis} · {h.pauseMin} Min.</td><td className="r">{h1(helferStunden(h))}</td><td>{h.taetigkeit}</td><td><Pk klein farbe="gruen" onClick={() => { a.gegenzeichnen([h.id]); zeige(`${h.name}: gegengezeichnet.`); }}>Gegenzeichnen</Pk></td></tr>)}
        {!offen.length && <tr><td colSpan={7} className="klein">Alles gegengezeichnet.</td></tr>}
      </tbody></table></div>
    </PcSeite>
  );
}

export function PcBlWidersprueche() {
  const { d, a } = useDaten();
  const [toast, zeige] = useToast();
  const liste = d.tage.flatMap((t) => t.korrekturen.filter((k) => k.antwort === 'widerspruch').map((k) => ({ t, k })));
  return (
    <PcSeite titel="Widersprüche" pfad="Bauleiter › Widersprüche · Mitarbeiter widerspricht einer Korrektur des Poliers">
      {toast}
      <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Mitarbeiter · Tag</th><th>Korrektur</th><th>Begründung Polier</th><th>Widerspruch</th><th>Entscheidung</th></tr></thead><tbody>
        {liste.map(({ t, k }) => <tr key={k.id}><td><strong>{nameKomma(person(d, t.personId))}</strong><br />{wtKurz(t.datum)} {tm(t.datum)}</td><td>{k.was}<br /><span className="klein">von {voll(person(d, k.von))}</span></td><td>„{k.grund}“</td><td>„{k.antwortText ?? ''}“</td>
          <td>{k.entscheidung ? <Pill farbe="gruen">{k.entscheidung === 'bleibt' ? 'Korrektur bleibt' : 'ursprüngliche Zeit gilt'}</Pill> : <div className="pk-reihe"><Pk klein onClick={() => { a.widerspruchEntscheiden(t.id, k.id, 'bleibt'); zeige('Entschieden: Korrektur bleibt.'); }}>Korrektur bleibt</Pk><Pk klein farbe="blau" onClick={() => { a.widerspruchEntscheiden(t.id, k.id, 'original'); zeige('Entschieden: ursprüngliche Zeit gilt. Als neue Korrektur gespeichert.'); }}>Ursprüngliche Zeit gilt</Pk></div>}</td></tr>)}
        {!liste.length && <tr><td colSpan={5} className="klein">Kein Widerspruch offen.</td></tr>}
      </tbody></table></div>
      <span className="klein">Nichts wird überschrieben: Gilt die ursprüngliche Zeit, entsteht eine neue Korrektur, die alte bleibt im Verlauf.</span>
    </PcSeite>
  );
}

const ANTRAG: Record<string, string> = { urlaub: 'Urlaub', konto: 'Frei vom Konto', arbeitsbefreiung: 'Arbeitsbefreiung', betriebsurlaub: 'Betriebsurlaub', krank: 'Krank' };

/** Anträge: Die Oberbauleitung entscheidet, der Bauleiter sieht sie nur */
function AntragTabelle({ liste, entscheiden }: { liste: Antrag[]; entscheiden: boolean }) {
  const { d, a } = useDaten();
  const [ab, setAb] = useState<string>();
  const [grund, setGrund] = useState('');
  const [toast, zeige] = useToast();
  const sortiert = [...liste].sort((x, y) => (x.status === 'offen' ? -1 : 1) - (y.status === 'offen' ? -1 : 1) || x.von.localeCompare(y.von));
  const statusText = (x: Antrag) => (x.status === 'offen' ? 'liegt bei der Oberbauleitung' : x.status === 'bauleitung_ok' ? 'Oberbauleitung ok, liegt bei der GL' : x.status);
  return (
    <>
      {toast}
      <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Mitarbeiter</th><th>Art</th><th>Zeitraum</th><th className="r">Tage</th><th>Status</th>{entscheiden && <th>Entscheidung</th>}</tr></thead><tbody>
        {sortiert.map((x) => { const p = person(d, x.personId); const bs = einteilungAm(d, p.id, d.heute); return (
          <tr key={x.id}><td><strong>{nameKomma(p)}</strong>{bs && <><br /><span className="klein">{bsName(bs)} · Bauleiter {voll(person(d, bs.bauleitungId))}</span></>}</td><td>{ANTRAG[x.art]}{x.anlass ? <><br /><span className="klein">{x.anlass}</span></> : null}{x.stunden ? <><br /><span className="klein">{h1(x.stunden)}</span></> : null}</td><td>{tm(x.von)}–{tmj(x.bis)}</td><td className="r">{x.tage}</td>
            <td><Pill farbe={x.status === 'offen' || x.status === 'bauleitung_ok' ? 'orange' : x.status === 'abgelehnt' ? 'rot' : 'gruen'}>{statusText(x)}</Pill>{x.ablehnGrund && <><br /><span className="klein">Grund: {x.ablehnGrund}</span></>}</td>
            {entscheiden && <td>{x.status === 'offen' && x.personId !== d.oberbauleitungId && (ab === x.id
              ? <div className="pk-reihe"><input className="pc-in" aria-label="Grund" placeholder="Grund (Pflicht)" value={grund} onChange={(e) => setGrund(e.target.value)} /><Pk klein onClick={() => setAb(undefined)}>Abbrechen</Pk><Pk klein farbe="rot" gesperrt={grund.trim().length < 3} onClick={() => { a.antragEntscheiden(x.id, false, grund.trim()); setAb(undefined); setGrund(''); zeige('Abgelehnt. Der Mitarbeiter ist informiert.', 'orange'); }}>Ablehnen</Pk></div>
              : <div className="pk-reihe"><Pk klein farbe="rot" onClick={() => setAb(x.id)}>Ablehnen</Pk><Pk klein farbe="gruen" onClick={() => { a.antragEntscheiden(x.id, true); zeige(x.art === 'arbeitsbefreiung' ? 'Genehmigt unter Vorbehalt. Das Büro prüft den Nachweis.' : x.art === 'urlaub' ? 'Genehmigt und an die Geschäftsleitung weitergegeben.' : 'Genehmigt.'); }}>{x.art === 'arbeitsbefreiung' ? 'Genehmigen (Vorbehalt)' : 'Genehmigen'}</Pk></div>)}</td>}
          </tr>
        ); })}
        {!sortiert.length && <tr><td colSpan={6} className="klein">Keine Anträge.</td></tr>}
      </tbody></table></div>
    </>
  );
}

export function PcBlAntraege() {
  const { d, ich } = useDaten();
  return (
    <PcSeite titel="Urlaub und Anträge" pfad={`Bauleiter › Anträge · zur Info, es entscheidet die Oberbauleitung (${voll(person(d, d.oberbauleitungId))})`}>
      <span className="klein">Du siehst die Anträge der Leute, die auf deinen Baustellen eingeteilt sind. Einwände klärst du direkt mit der Oberbauleitung.</span>
      <AntragTabelle liste={antraegeFuerBauleitung(d, ich!.id)} entscheiden={false} />
    </PcSeite>
  );
}

// ------------------------------------------------------------------ Oberbauleitung

export function PcObl() {
  const { d } = useDaten();
  const tage = d.tage.filter((t) => t.anOberbauleitung && t.status === 'bei_bauleitung');
  const gruppen = [...new Set(tage.map((t) => t.personId))].map((id) => ({ titel: `${voll(person(d, id))} (${rollenText(person(d, id).rolle as Person['rolle'])})`, tage: tage.filter((t) => t.personId === id) }));
  return (
    <PcSeite titel="Tage der Bauleiter" pfad="Oberbauleitung › Freigabe der Tage von Bauleitern und Angestellten">
      <span className="klein">Bauleiter geben ihre eigenen Stunden nicht selbst frei. Sie senden sie an die Oberbauleitung. Nach deiner Freigabe übernimmt Personal / HR / Lohn.</span>
      <TagTabelle d={d} kind="obl" gruppen={gruppen} leer="Zurzeit liegt kein Tag bei der Oberbauleitung." />
      <section className="pc-karte">
        <h2>Anträge entscheiden</h2>
        <span className="klein">Alle Anträge kommen zu dir. Der eingeteilte Bauleiter sieht sie nur. Urlaub geht nach deiner Genehmigung an die Geschäftsleitung. Frei vom Konto entscheidest du endgültig. Arbeitsbefreiung genehmigst du unter Vorbehalt, das Büro prüft den Nachweis. Deine eigenen Anträge entscheidet die Geschäftsleitung.</span>
        <AntragTabelle liste={d.antraege.filter((x) => x.art !== 'krank' && x.art !== 'betriebsurlaub' && person(d, x.personId)?.rolle !== 'nu' && (x.status === 'offen' || !!x.oblVon))} entscheiden />
      </section>
      <section className="pc-karte"><h2>Alle Baustellen</h2><BaustellenTabelle d={d} liste={d.baustellen.filter((b) => !b.archiviert)} /></section>
    </PcSeite>
  );
}
