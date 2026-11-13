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
import { tx } from '../../i18n';

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
    <Seite titel={tx("Heute")} menue="heute">
      <div className="kopfzeilen"><span className="unter">{tagLang(d.heute)}</span><h1 className="h1 gross">{tx("Hallo {0}", ich.vorname)}</h1><span className="unter">{tx("{0} · Nachunternehmer", firma?.name)}</span></div>
      {mlOffen && <Link to="/nu/nachweise" className="hinweis orange" style={{ textDecoration: 'none', display: 'block' }}><strong>{tx("Mindestlohnerklärung {0}:", monatName(vm))}</strong> {' '}{tx("bitte unterschreiben.")}</Link>}
      <section className="karte pad" aria-label={tx("Deine Einteilung")}>
        <span className="fett" style={{ fontSize: 14, color: 'var(--gruen)' }}>{tx("Laut Einteilung")}{d.demoStandort === 'passt' ? tx(" · Standort passt") : ''}</span>
        <span className="titel fett" style={{ fontSize: 19, lineHeight: 1.3 }}>{bs ? bsLang(bs) : tx("Heute nicht eingeteilt")}</span>
        {polier && <span className="unter">{tx("Melden bei Polier {0}", voll(polier))}</span>}
      </section>
      {r.zustand === 'aus' && <>
        <p className="text">{tx("Tippe auf Start, wenn du auf der Baustelle bist.")}</p>
        <Knopf farbe="gruen" klasse="riesig" gesperrt={!bs} onClick={() => tippe('beginn')}><IPlay /><span>{tx("Start")}</span></Knopf>
      </>}
      {(r.zustand === 'arbeit' || r.zustand === 'pause') && <>
        <section className="karte pad mitte"><span className="fett" style={{ color: r.zustand === 'pause' ? 'var(--orange-text)' : 'var(--gruen)' }}>{r.zustand === 'pause' ? tx("Pause läuft seit {0} Uhr", r.pausen[r.pausen.length - 1]?.von) : tx("Arbeitszeit läuft seit {0} Uhr", uhr(r.beginn!.zeit))}</span><span className="zahl" style={{ fontSize: 40 }}>{dauer(r.arbeitMin)}</span><span className="unter">{tx("Pausen heute: {0} Min.", Math.round(r.pauseMin))}</span></section>
        {r.zustand === 'pause' ? <Knopf farbe="gruen" klasse="riesig" onClick={() => tippe('weiter')}><IPlay /><span>{tx("Weiter arbeiten")}</span></Knopf>
          : <div className="zwei"><Knopf farbe="rahmen" onClick={() => tippe('pause')}><IPause size={24} />{tx("Pause")}</Knopf><Knopf farbe="dunkel" onClick={() => tippe('ende')}><IStop size={22} />{tx("Arbeitsende")}</Knopf></div>}
      </>}
      {r.zustand === 'fertig' && <>
        <section className="karte pad"><span className="fett">{tx("Arbeitsende {0} · Pausen {1} Min.", uhr(r.ende!.zeit), Math.round(r.pauseMin))}</span><span className="unter">{tx("Bisher gearbeitet: {0}.", stunden(r.arbeitMin / 60))}</span></section>
        {gesendet ? <div className="hinweis gruen"><strong>{tx("Tag gesendet.")}</strong> {' '}{tx("Gesendet an {0}. Er prüft deine Stunden und gibt sie frei.", polier ? tx("Polier {0}", voll(polier)) : tx("den Polier"))}</div>
          : <Knopf onClick={() => a.tagSenden(d.heute)}>{tx("Tag an Polier senden")}</Knopf>}
      </>}
      {r.zustand !== 'aus' && <p className="klein">{tx("Dein Standort wird nur beim Tippen auf Start, Pause und Ende mit der Baustelle verglichen. Er wird nicht gespeichert.")}</p>}
      <Fueller />
      <details className="faq"><summary>{tx("Falsche Baustelle? Polier anrufen oder melden")}</summary>
        <p className="text">{tx("Du darfst nur auf der Baustelle arbeiten, für die du eingeteilt bist. Selbst wechseln geht nicht. Stimmt die Baustelle nicht? Ruf {0} an. Er klärt es mit der Verwaltung.", polier ? tx("Polier {0}", voll(polier)) : tx("deinen Polier"))}</p>
        {gemeldet ? <p className="text"><strong>{tx("Gemeldet.")}</strong> {' '}{tx("Warte bitte auf die Antwort.")}</p> : <Knopf farbe="rahmen" klasse="mittel" onClick={() => { a.nachrichtSenden(`${voll(ich)} (NU) meldet: falsche Baustelle laut Einteilung`, bs?.id); setGemeldet(true); }}>{tx("Falsche Baustelle melden")}</Knopf>}
      </details>
    </Seite>
  );
}

const STATUS: Record<string, string> = { offen: tx("nicht gesendet"), beim_polier: tx("wartet auf Polier"), zurueck_polier: tx("wartet auf Polier"), bei_bauleitung: tx("freigegeben vom Polier"), freigegeben: tx('freigegeben') };

export function NuStunden() {
  const { d, ich } = useIch();
  const mo = montagDerWoche(d.heute);
  const wochen = [mo, plusTage(mo, -7)];
  return (
    <Seite titel={tx("Meine Stunden")} menue="stunden">
      <h1 className="h1 gross">{tx("Meine Stunden")}</h1>
      {wochen.map((w, wi) => {
        const tage = [0, 1, 2, 3, 4].map((i) => plusTage(w, i));
        const summe = tage.reduce((s, k) => s + rechnung(d, ich.id, k).arbeitMin / 60, 0);
        return (
          <section key={w} aria-label={`KW ${kw(w)}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h2 className="h2">KW {kw(w)} · {wi === 0 ? tx("diese Woche") : tx("letzte Woche")} · {stunden(summe)}</h2>
            <ul className="liste">{tage.map((k) => {
              const t = tagVon(d, ich.id, k); const r = rechnung(d, ich.id, k);
              const offeneK = t?.korrekturen.find((x) => !x.antwort);
              return (
                <li key={k}>{offeneK
                  ? <Link to={`/ma/korrektur/${t!.id}`} className="zeile"><span className="wachs"><span className="fett">{wtKurz(k)} {tm(k)} · {stunden(r.arbeitMin / 60)}</span><span className="klein" style={{ color: 'var(--orange-text)' }}>{tx("von {0} geändert · bitte ansehen", voll(person(d, offeneK.von)))}</span></span></Link>
                  : <div className="zeile"><span className="wachs"><span className="fett">{wtKurz(k)} {tm(k)} · {r.beginn ? stunden(r.arbeitMin / 60) : '–'}</span><span className="klein">{r.beginn ? `${uhr(r.beginn.zeit)}–${r.ende ? uhr(r.ende.zeit) : tx("läuft")} · ` : ''}{k > d.heute ? '' : t ? STATUS[t.status] : r.beginn ? tx("läuft") : tx("nicht gestartet")}{t?.korrekturen.some((x) => x.antwort === 'bestaetigt') ? tx(" · korrigiert, von dir bestätigt") : ''}{t?.korrekturen.some((x) => x.antwort === 'widerspruch') ? tx(" · Widerspruch an Polier gesendet") : ''}</span></span></div>}
                </li>
              );
            })}</ul>
          </section>
        );
      })}
      <p className="klein">{tx("Deine Stunden gehen an die K. Baumann Baugesellschaft zur Prüfung der Rechnung deiner Firma. Lohn zahlt deine Firma.")}</p>
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
      <canvas ref={ref} className="signatur" aria-label={tx("Unterschriftsfeld")} onDoubleClick={beispiel} />
      <div className="pk-reihe" style={{ justifyContent: 'space-between' }}><span className="klein">{leer ? tx("Hier mit dem Finger unterschreiben.") : tx("Unterschrift erfasst.")}</span><button type="button" className="link" onClick={beispiel}>{tx("Beispiel-Unterschrift (Demo)")}</button></div>
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
    <Seite titel={tx("Nachweise")} menue="nachweise">
      <h1 className="h1 gross">{tx("Nachweise")}</h1>
      <section className="karte pad" aria-label={tx("Mindestlohn")}>
        <span className="fett" style={{ fontSize: 17 }}>{tx("Mindestlohn · {0}", monatName(vm))}</span>
        <span className="unter">{tx("Eine Unterschrift im Monat, für dich persönlich.")}</span>
        {st === 'unterschrieben' ? <div className="hinweis gruen"><strong>{tx("Unterschrieben.")}</strong> {' '}{tx("Die nächste Unterschrift ist nach dem Monatsende fällig.")}</div> : <>
          <span className="fett">{tx("Persönliche Mindestlohnerklärung")}</span>
          <p className="text">{tx("Ich erkläre, dass ich für meine Arbeit im Monat {0} von meinem Arbeitgeber {1} mindestens den gesetzlichen Mindestlohn (13,90 € brutto je Stunde, 2026) erhalten habe.", monatName(vm), firma?.name)}</p>
          <Unterschrift fertig={setLeer} />
          <span className="klein">{tx("Gespeichert werden: dein Name, deine Firma, Datum und Uhrzeit, die Textversion und deine Unterschrift. Als PDF geht das an die Verwaltung der K. Baumann Baugesellschaft, nicht an deine Firma.")}</span>
          <Knopf gesperrt={leer} onClick={() => a.mindestlohnUnterschreiben(ich.id, vm)}>{tx("Unterschreiben und senden")}</Knopf>
          <span className="klein">{tx("Kannst du das nicht unterschreiben? Melde dich vertraulich im Büro der K. Baumann Baugesellschaft.")}</span>
        </>}
      </section>
      <section className="karte pad" aria-label={tx("Ausweis")}>
        <span className="fett">{tx("Ausweis")}</span>
        {ich.ausweis ? <span className="unter">{tx("{0}, gültig bis {1}{2} · gesehen von {3} am {4}", ich.ausweis.art, tm(ich.ausweis.bis), ich.ausweis.bis.slice(0, 4), ich.ausweis.gesehenVon, tm(ich.ausweis.am))}</span> : <span className="unter">{tx("Noch nicht gesehen. Zeig deinen Ausweis dem Polier oder im Büro.")}</span>}
        {ich.ausweis && ich.ausweis.bis < plusTage(d.heute, 30) && <div className="hinweis orange">{tx("Dein Ausweis läuft bald ab. Zeig den neuen Ausweis dem Polier oder im Büro.")}</div>}
        <span className="klein">{tx("Es wird keine Kopie und keine Nummer gespeichert.")}</span>
      </section>
      <section className="karte pad" aria-label={tx("A1-Bescheinigung")}>
        <span className="fett">{tx("A1-Bescheinigung")}</span>
        <span className="unter">{ich.a1Bis ? tx("gültig bis {0}{1}", tm(ich.a1Bis), ich.a1Bis.slice(0, 4)) : tx("nicht nötig")}{ich.a1Bis && ich.a1Bis < d.heute ? tx(" · abgelaufen") : ''}</span>
        {ich.a1Bis && <Knopf farbe="rahmen" klasse="mittel" onClick={() => setA1Foto(true)}>{a1Foto ? tx("Foto hochgeladen ✓ (wird geprüft)") : tx("Neue A1-Bescheinigung fotografieren")}</Knopf>}
      </section>
    </Seite>
  );
}

export function NuMehr() {
  const { abmelden } = useIch();
  const nav = useNavigate();
  const gruppen = [
    { titel: tx("Hilfe"), punkte: [{ text: tx("Hilfe"), to: '/hilfe' }, { text: tx("Häufige Fragen"), to: '/faq' }, { text: tx("Einführung ansehen"), to: '/intro' }, { text: tx("Datenschutz"), to: '/datenschutz' }] },
    { titel: tx("Für mich"), punkte: [{ text: tx("Mitteilungen"), to: '/ma/mitteilungen' }, { text: tx("Passwort ändern"), to: '/ma/pin' }, { text: tx("Meine Geräte"), to: '/ma/geraete' }] },
  ];
  return (
    <Seite titel={tx("Mehr")} menue="mehr">
      <h1 className="h1 gross">{tx("Mehr")}</h1>
      <MehrListe gruppen={gruppen} />
      <Demo abmelden={() => { abmelden(); nav('/'); }} />
    </Seite>
  );
}
