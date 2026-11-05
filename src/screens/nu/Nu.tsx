// NU-App: Person eines Nachunternehmers – Heute, Meine Stunden, Nachweise (Mindestlohnerklärung), Mehr (Entwurf V1)

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Fueller, Seite } from '../../components/Rahmen';
import { IPause, IPlay, IStop } from '../../components/Icons';
import { Knopf } from '../../components/Teile';
import { useIch } from '../../domain/store';
import { bsLang, einteilungAm, person, rechnung, tagVon, voll } from '../../domain/sel';
import { dauer, kw, monatName, monatPlus, monatVon, montagDerWoche, plusTage, stunden, tagLang, tm, uhr, wtKurz } from '../../domain/zeit';
import { MehrListe, Demo } from '../ma/Rest';

export function NuHeute() {
  const { d, ich, a, jetzt } = useIch();
  void jetzt;
  const [gemeldet, setGemeldet] = useState(false);
  const bs = einteilungAm(d, ich.id, d.heute);
  const polier = bs?.polierId ? person(d, bs.polierId) : undefined;
  const firma = d.firmen.find((f) => f.id === ich.firmaId);
  const r = rechnung(d, ich.id, d.heute);
  const tag = tagVon(d, ich.id, d.heute);
  const gesendet = tag && tag.status !== 'offen';
  const tippe = (art: 'beginn' | 'pause' | 'weiter' | 'ende') => a.stempeln(art, { baustelleId: bs?.id });
  const vm = monatPlus(monatVon(d.heute), -1);
  const mlOffen = ich.mindestlohn && ich.mindestlohn[vm] !== 'unterschrieben';
  return (
    <Seite titel="Heute" menue="heute">
      <div className="kopfzeilen"><span className="unter">{tagLang(d.heute)}</span><h1 className="h1 gross">Hallo {ich.vorname}</h1><span className="unter">{firma?.name} · Nachunternehmer</span></div>
      {mlOffen && <Link to="/nu/nachweise" className="hinweis orange" style={{ textDecoration: 'none', display: 'block' }}><strong>Mindestlohnerklärung {monatName(vm)}:</strong> bitte unterschreiben.</Link>}
      <section className="karte pad" aria-label="Deine Einteilung">
        <span className="fett" style={{ fontSize: 14, color: 'var(--gruen)' }}>Laut Einteilung{d.demoStandort === 'passt' ? ' · Standort passt' : ''}</span>
        <span className="titel fett" style={{ fontSize: 19, lineHeight: 1.3 }}>{bs ? bsLang(bs) : 'Heute nicht eingeteilt'}</span>
        {polier && <span className="unter">Melden bei Polier {voll(polier)}</span>}
      </section>
      {r.zustand === 'aus' && <>
        <p className="text">Tippe auf Start, wenn du auf der Baustelle bist.</p>
        <Knopf farbe="gruen" klasse="riesig" gesperrt={!bs} onClick={() => tippe('beginn')}><IPlay /><span>Start</span></Knopf>
      </>}
      {(r.zustand === 'arbeit' || r.zustand === 'pause') && <>
        <section className="karte pad mitte"><span className="fett" style={{ color: r.zustand === 'pause' ? 'var(--orange-text)' : 'var(--gruen)' }}>{r.zustand === 'pause' ? `Pause läuft seit ${r.pausen[r.pausen.length - 1]?.von} Uhr` : `Arbeitszeit läuft seit ${uhr(r.beginn!.zeit)} Uhr`}</span><span className="zahl" style={{ fontSize: 40 }}>{dauer(r.arbeitMin)}</span><span className="unter">Pausen heute: {Math.round(r.pauseMin)} Min.</span></section>
        {r.zustand === 'pause' ? <Knopf farbe="gruen" klasse="riesig" onClick={() => tippe('weiter')}><IPlay /><span>Weiter arbeiten</span></Knopf>
          : <div className="zwei"><Knopf farbe="rahmen" onClick={() => tippe('pause')}><IPause size={24} />Pause</Knopf><Knopf farbe="dunkel" onClick={() => tippe('ende')}><IStop size={22} />Arbeitsende</Knopf></div>}
      </>}
      {r.zustand === 'fertig' && <>
        <section className="karte pad"><span className="fett">Arbeitsende {uhr(r.ende!.zeit)} · Pausen {Math.round(r.pauseMin)} Min.</span><span className="unter">Bisher gearbeitet: {stunden(r.arbeitMin / 60)}.</span></section>
        {gesendet ? <div className="hinweis gruen"><strong>Tag gesendet.</strong> Gesendet an {polier ? `Polier ${voll(polier)}` : 'den Polier'}. Er prüft deine Stunden und gibt sie frei.</div>
          : <Knopf onClick={() => a.tagSenden(d.heute)}>Tag an Polier senden</Knopf>}
      </>}
      {r.zustand !== 'aus' && <p className="klein">Dein Standort wird nur beim Tippen auf Start, Pause und Ende mit der Baustelle verglichen. Er wird nicht gespeichert.</p>}
      <Fueller />
      <details className="faq"><summary>Falsche Baustelle? Polier anrufen oder melden</summary>
        <p className="text">Du darfst nur auf der Baustelle arbeiten, für die du eingeteilt bist. Selbst wechseln geht nicht. Stimmt die Baustelle nicht? Ruf {polier ? `Polier ${voll(polier)}` : 'deinen Polier'} an. Er klärt es mit der Verwaltung.</p>
        {gemeldet ? <p className="text"><strong>Gemeldet.</strong> Warte bitte auf die Antwort.</p> : <Knopf farbe="rahmen" klasse="mittel" onClick={() => { a.nachrichtSenden(`${voll(ich)} (NU) meldet: falsche Baustelle laut Einteilung`, bs?.id); setGemeldet(true); }}>Falsche Baustelle melden</Knopf>}
      </details>
    </Seite>
  );
}

const STATUS: Record<string, string> = { offen: 'nicht gesendet', beim_polier: 'wartet auf Polier', zurueck_polier: 'wartet auf Polier', bei_bauleitung: 'freigegeben vom Polier', freigegeben: 'freigegeben' };

export function NuStunden() {
  const { d, ich } = useIch();
  const mo = montagDerWoche(d.heute);
  const wochen = [mo, plusTage(mo, -7)];
  return (
    <Seite titel="Meine Stunden" menue="stunden">
      <h1 className="h1 gross">Meine Stunden</h1>
      {wochen.map((w, wi) => {
        const tage = [0, 1, 2, 3, 4].map((i) => plusTage(w, i));
        const summe = tage.reduce((s, k) => s + rechnung(d, ich.id, k).arbeitMin / 60, 0);
        return (
          <section key={w} aria-label={`KW ${kw(w)}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h2 className="h2">KW {kw(w)} · {wi === 0 ? 'diese Woche' : 'letzte Woche'} · {stunden(summe)}</h2>
            <ul className="liste">{tage.map((k) => {
              const t = tagVon(d, ich.id, k); const r = rechnung(d, ich.id, k);
              const offeneK = t?.korrekturen.find((x) => !x.antwort);
              return (
                <li key={k}>{offeneK
                  ? <Link to={`/ma/korrektur/${t!.id}`} className="zeile"><span className="wachs"><span className="fett">{wtKurz(k)} {tm(k)} · {stunden(r.arbeitMin / 60)}</span><span className="klein" style={{ color: 'var(--orange-text)' }}>von {voll(person(d, offeneK.von))} geändert · bitte ansehen</span></span></Link>
                  : <div className="zeile"><span className="wachs"><span className="fett">{wtKurz(k)} {tm(k)} · {r.beginn ? stunden(r.arbeitMin / 60) : '–'}</span><span className="klein">{r.beginn ? `${uhr(r.beginn.zeit)}–${r.ende ? uhr(r.ende.zeit) : 'läuft'} · ` : ''}{k > d.heute ? '' : t ? STATUS[t.status] : r.beginn ? 'läuft' : 'nicht gestartet'}{t?.korrekturen.some((x) => x.antwort === 'bestaetigt') ? ' · korrigiert, von dir bestätigt' : ''}{t?.korrekturen.some((x) => x.antwort === 'widerspruch') ? ' · Widerspruch an Polier gesendet' : ''}</span></span></div>}
                </li>
              );
            })}</ul>
          </section>
        );
      })}
      <p className="klein">Deine Stunden gehen an die K. Baumann Baugesellschaft zur Prüfung der Rechnung deiner Firma. Lohn zahlt deine Firma.</p>
    </Seite>
  );
}

function Unterschrift({ fertig }: { fertig: (leer: boolean) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [leer, setLeer] = useState(true);
  useEffect(() => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    c.width = r.width * 2; c.height = r.height * 2;
    const g = c.getContext('2d');
    if (!g) return;
    g.scale(2, 2); g.lineWidth = 2.5; g.lineCap = 'round'; g.strokeStyle = '#1b2733';
    let an = false;
    const pos = (e: PointerEvent) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    const down = (e: PointerEvent) => { an = true; const [x, y] = pos(e); g.beginPath(); g.moveTo(x, y); };
    const move = (e: PointerEvent) => { if (!an) return; const [x, y] = pos(e); g.lineTo(x, y); g.stroke(); setLeer(false); fertig(false); };
    const up = () => { an = false; };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [fertig]);
  const beispiel = () => {
    const c = ref.current!; const g = c.getContext('2d'); if (!g) return;
    const w = c.width / 2; g.beginPath(); g.moveTo(20, 90);
    for (let x = 20; x < w - 20; x += 6) g.lineTo(x, 70 + Math.sin(x / 9) * 22 * Math.cos(x / 31));
    g.stroke(); setLeer(false); fertig(false);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <canvas ref={ref} className="signatur" aria-label="Unterschriftsfeld" onDoubleClick={beispiel} />
      <div className="pk-reihe" style={{ justifyContent: 'space-between' }}><span className="klein">{leer ? 'Hier mit dem Finger unterschreiben.' : 'Unterschrift erfasst.'}</span><button type="button" className="link" onClick={beispiel}>Beispiel-Unterschrift (Demo)</button></div>
    </div>
  );
}

export function NuNachweise() {
  const { d, ich, a } = useIch();
  const vm = monatPlus(monatVon(d.heute), -1);
  const st = ich.mindestlohn?.[vm];
  const [leer, setLeer] = useState(true);
  const firma = d.firmen.find((f) => f.id === ich.firmaId);
  const [a1Foto, setA1Foto] = useState(false);
  return (
    <Seite titel="Nachweise" menue="nachweise">
      <h1 className="h1 gross">Nachweise</h1>
      <section className="karte pad" aria-label="Mindestlohn">
        <span className="fett" style={{ fontSize: 17 }}>Mindestlohn · {monatName(vm)}</span>
        <span className="unter">Eine Unterschrift im Monat, für dich persönlich.</span>
        {st === 'unterschrieben' ? <div className="hinweis gruen"><strong>Unterschrieben.</strong> Die nächste Unterschrift ist nach dem Monatsende fällig.</div> : <>
          <span className="fett">Persönliche Mindestlohnerklärung</span>
          <p className="text">Ich erkläre, dass ich für meine Arbeit im Monat {monatName(vm)} von meinem Arbeitgeber {firma?.name} mindestens den gesetzlichen Mindestlohn (13,90 € brutto je Stunde, 2026) erhalten habe.</p>
          <Unterschrift fertig={setLeer} />
          <span className="klein">Gespeichert werden: dein Name, deine Firma, Datum und Uhrzeit, die Textversion und deine Unterschrift. Als PDF geht das an die Verwaltung der K. Baumann Baugesellschaft, nicht an deine Firma.</span>
          <Knopf gesperrt={leer} onClick={() => a.mindestlohnUnterschreiben(ich.id, vm)}>Unterschreiben und senden</Knopf>
          <span className="klein">Kannst du das nicht unterschreiben? Melde dich vertraulich im Büro der K. Baumann Baugesellschaft.</span>
        </>}
      </section>
      <section className="karte pad" aria-label="Ausweis">
        <span className="fett">Ausweis</span>
        {ich.ausweis ? <span className="unter">{ich.ausweis.art}, gültig bis {tm(ich.ausweis.bis)}{ich.ausweis.bis.slice(0, 4)} · gesehen von {ich.ausweis.gesehenVon} am {tm(ich.ausweis.am)}</span> : <span className="unter">Noch nicht gesehen. Zeig deinen Ausweis dem Polier oder im Büro.</span>}
        {ich.ausweis && ich.ausweis.bis < plusTage(d.heute, 30) && <div className="hinweis orange">Dein Ausweis läuft bald ab. Zeig den neuen Ausweis dem Polier oder im Büro.</div>}
        <span className="klein">Es wird keine Kopie und keine Nummer gespeichert.</span>
      </section>
      <section className="karte pad" aria-label="A1-Bescheinigung">
        <span className="fett">A1-Bescheinigung</span>
        <span className="unter">{ich.a1Bis ? `gültig bis ${tm(ich.a1Bis)}${ich.a1Bis.slice(0, 4)}` : 'nicht nötig'}{ich.a1Bis && ich.a1Bis < d.heute ? ' · abgelaufen' : ''}</span>
        {ich.a1Bis && <Knopf farbe="rahmen" klasse="mittel" onClick={() => setA1Foto(true)}>{a1Foto ? 'Foto hochgeladen ✓ (wird geprüft)' : 'Neue A1-Bescheinigung fotografieren'}</Knopf>}
      </section>
    </Seite>
  );
}

export function NuMehr() {
  const { abmelden } = useIch();
  const nav = useNavigate();
  const gruppen = [
    { titel: 'Hilfe', punkte: [{ text: 'Hilfe', to: '/hilfe' }, { text: 'Häufige Fragen', to: '/faq' }, { text: 'Einführung ansehen', to: '/intro' }, { text: 'Datenschutz', to: '/datenschutz' }] },
    { titel: 'Für mich', punkte: [{ text: 'Mitteilungen', to: '/ma/mitteilungen' }, { text: 'PIN ändern', to: '/ma/pin' }, { text: 'Meine Geräte', to: '/ma/geraete' }] },
  ];
  return (
    <Seite titel="Mehr" menue="mehr">
      <h1 className="h1 gross">Mehr</h1>
      <MehrListe gruppen={gruppen} />
      <Demo abmelden={() => { abmelden(); nav('/'); }} />
    </Seite>
  );
}
