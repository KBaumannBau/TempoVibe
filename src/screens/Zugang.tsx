// Registrierung (Einladung, Code, PIN, Datenschutz, Ausweis, Standort) und tägliches Öffnen mit PIN (Entwurf V1)

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Fueller, Seite, startVon } from '../components/Rahmen';
import { Auswahl, Knopf, PinFeld } from '../components/Teile';
import { useDaten } from '../domain/store';
import { voll } from '../domain/sel';
import { tx } from '../i18n';

const SCHRITTE = [tx("E-Mail und Code"), tx("PIN festlegen"), tx("Datenschutz"), tx("Ausweis"), tx("Standort"), tx("Fertig")];

export function Registrierung() {
  const { d, anmelden, a } = useDaten();
  const nav = useNavigate();
  const [wer, setWer] = useState<'stefan' | 'horvat'>('stefan');
  const [schritt, setSchritt] = useState(-1);
  const [mail, setMail] = useState('');
  const [mailOk, setMailOk] = useState(false);
  const [code, setCode] = useState('');
  const [codeFehler, setCodeFehler] = useState(0);
  const [pin1, setPin1] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [ds, setDs] = useState(false);
  const p = d.personen.find((x) => x.id === wer)!;
  const nu = p.rolle === 'nu';
  const weiter = () => setSchritt(schritt + 1);
  const kopf = schritt >= 0 && <span className="unter">{tx("Schritt {0} von 6: {1}", schritt + 1, SCHRITTE[schritt])}</span>;

  if (schritt === -1) return (
    <Seite titel={tx("Einladung")} ohneMenue>
      <Link to="/" className="link">{tx("‹ Zur Anmeldung")}</Link>
      <h1 className="h1">{tx("Einladung per E-Mail")}</h1>
      <span className="unter">{tx("Beispiel ansehen für:")}</span>
      <Auswahl label={tx("Für wen")} optionen={[{ wert: 'stefan' as const, text: tx("Eigener Mitarbeiter") }, { wert: 'horvat' as const, text: tx("Nachunternehmer-Person") }]} wert={wer} setWert={setWer} />
      <section className="karte pad" aria-label={tx("E-Mail")}>
        <span className="klein">{tx("E-Mail von K. Baumann · heute 06:41")}</span>
        <span className="fett">{tx("Betreff: Dein Zugang zur Stundenerfassung")}</span>
        <span className="text">{nu
          ? tx("Hallo {0}, du arbeitest für die Bau-Service Kovač GmbH auf Baustellen der K. Baumann Baugesellschaft. Hier ist dein Zugang zur Stundenerfassung. Tippe auf den Link und folge den Schritten. Der Link gilt 7 Tage.", p.vorname)
          : tx("Hallo {0}, hier ist dein Zugang zur Stundenerfassung der K. Baumann Baugesellschaft. Tippe auf den Link und folge den Schritten. Der Link gilt 7 Tage.", p.vorname)}</span>
        <Knopf onClick={() => setSchritt(0)}>{tx("Link öffnen")}</Knopf>
      </section>
      <p className="text">{tx("Ohne eigene E-Mail-Adresse zeigt dir dein Polier die Einladung auf seinem Handy. Du scannst den QR-Code mit deinem Handy. Den Code (6 Ziffern) sagt er dir danach persönlich. Eine Handynummer brauchst du nicht.")}</p>
    </Seite>
  );

  if (schritt === 1) return (
    <Seite titel={tx("PIN festlegen")} ohneMenue>
      {kopf}
      <PinFeld frage={pin1 ? tx("PIN wiederholen") : tx("Neue PIN (4 Ziffern)")} unter={pinMsg ? <div className="hinweis orange" role="alert">{pinMsg}</div> : <p className="text" style={{ textAlign: 'center' }}>{tx("Mit der PIN öffnest du die App jeden Tag.")}</p>} fertig={(x) => {
        if (!pin1) { if (['1234', '0000', '1111', '4321'].includes(x)) return setPinMsg(tx("Bitte keine einfache PIN wie 1234 oder 0000.")); setPin1(x); setPinMsg(''); return; }
        if (x !== pin1) { setPin1(''); return setPinMsg(tx("Die beiden PINs sind nicht gleich. Bitte noch einmal.")); }
        setPinMsg(''); weiter();
      }} />
    </Seite>
  );

  return (
    <Seite titel={SCHRITTE[schritt]} ohneMenue>
      {kopf}
      {schritt === 0 && <>
        <h1 className="h1">{tx("Bist du {0}?", voll(p))}</h1>
        {!mailOk ? <>
          <p className="text">{tx("Wir schicken dir einen Code per E-Mail. Trage die E-Mail-Adresse ein, die bei uns für dich hinterlegt ist.")}</p>
          <div className="feld"><label htmlFor="rm">{tx("Deine E-Mail-Adresse")}</label><input id="rm" className="eingabe" type="email" value={mail} onChange={(e) => setMail(e.target.value)} placeholder={tx("name@beispiel.de")} /></div>
          <span className="klein">{tx("Beispiel in der Demo: Hinterlegt ist")}{' '}{p.email ?? tx("keine Adresse")}. <button type="button" className="link" onClick={() => setMail(p.email ?? '')}>{tx("eintragen")}</button></span>
          {mail && mail.trim().toLowerCase() !== (p.email ?? '').toLowerCase() && <div className="hinweis orange">{tx("Diese E-Mail-Adresse ist bei uns nicht hinterlegt. Bitte im Büro melden.")}</div>}
          <Fueller />
          <Knopf gesperrt={mail.trim().toLowerCase() !== (p.email ?? '-').toLowerCase()} onClick={() => setMailOk(true)}>{tx("Code senden")}</Knopf>
        </> : <>
          <p className="text">{tx("Wir haben einen Code per E-Mail an {0} geschickt. Bitte hier eintragen.", p.email)}</p>
          <div className="feld"><label htmlFor="rc">{tx("Code aus der E-Mail (6 Ziffern)")}</label><input id="rc" className="eingabe" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></div>
          <span className="klein">{tx("Demo-Code: 482913. Der Code gilt 15 Minuten und nur einmal. Nach 5 falschen Eingaben brauchst du einen neuen Code.")}</span>
          {codeFehler > 0 && <div className="hinweis orange" role="alert">{codeFehler >= 5 ? tx("Zu viele falsche Eingaben. Bitte einen neuen Code anfordern.") : tx("Der Code stimmt nicht. Noch {0} Versuche.", 5 - codeFehler)}</div>}
          <button type="button" className="link" onClick={() => { setCode(''); setCodeFehler(0); }}>{tx("Code neu senden")}</button>
          <Fueller />
          <Knopf gesperrt={code.length !== 6 || codeFehler >= 5} onClick={() => (code === '482913' ? weiter() : setCodeFehler(codeFehler + 1))}>{tx("Weiter")}</Knopf>
        </>}
      </>}
      {schritt === 2 && <>
        <h1 className="h1">{tx("Datenschutz")}</h1>
        <ul className="text" style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>{tx("Wir speichern deine Arbeitszeiten für die Lohnabrechnung und die gesetzliche Aufzeichnung.")}</li>
          <li>{tx("Dein Standort wird nur beim Tippen mit der Baustelle verglichen. Die genaue Position wird nicht gespeichert.")}</li>
          <li>{tx("Krankmeldungen ohne Diagnose. Bescheinigungen sieht nur das Büro.")}</li>
          {nu && <li>{tx("Deine Stunden dienen der Prüfung der Rechnung deiner Firma. Lohn zahlt deine Firma.")}</li>}
        </ul>
        <Link className="link" to="/datenschutz">{tx("Datenschutzhinweise ganz lesen")}</Link>
        <label className="check" style={{ fontSize: 16 }}><input type="checkbox" checked={ds} onChange={(e) => setDs(e.target.checked)} /> {' '}{tx("Ich habe die Datenschutzhinweise gelesen.")}</label>
        <Fueller />
        <Knopf gesperrt={!ds} onClick={weiter}>{tx("Weiter")}</Knopf>
      </>}
      {schritt === 3 && <>
        <h1 className="h1">{tx("Ausweis")}</h1>
        {nu
          ? <p className="text">{tx("Zeig deinen Ausweis beim ersten Arbeitstag dem Polier oder im Büro. Er wird nur angesehen. Es wird kein Foto und keine Kopie gespeichert.")}</p>
          : <p className="text">{tx("Für eigene Mitarbeiter ist hier nichts zu tun. Dein Ausweis liegt schon im Büro vor.")}</p>}
        <Fueller />
        <Knopf onClick={weiter}>{tx("Weiter")}</Knopf>
      </>}
      {schritt === 4 && <>
        <h1 className="h1">{tx("Standort")}</h1>
        <p className="text">{tx("Die App fragt gleich nach der Freigabe für den Standort. Sie nutzt ihn nur in dem Moment, in dem du auf Start, Pause, Wechsel oder Ende tippst.")}</p>
        <p className="text">{tx("Lehnst du ab, wählst du die Baustelle von Hand, und dein Polier sieht das.")}</p>
        <Fueller />
        <Knopf onClick={weiter}>{tx("Standort erlauben")}</Knopf>
        <Knopf farbe="rahmen" onClick={weiter}>{tx("Nicht erlauben")}</Knopf>
      </>}
      {schritt === 5 && <>
        <h1 className="h1 gross">{tx("Fertig, {0}!", p.vorname)}</h1>
        <p className="text">{tx("Du bist angemeldet. Ab jetzt öffnest du die App mit deiner PIN. Fingerabdruck geht auch, wenn du möchtest.")}</p>
        <Fueller />
        <Knopf farbe="gruen" onClick={() => { anmelden(p.id); a.zugangSetzen(p.id, 'aktiv', 'Registrierung abgeschlossen'); nav('/intro'); }}>{tx("Einführung ansehen")}</Knopf>
        <Knopf farbe="rahmen" onClick={() => { anmelden(p.id); a.zugangSetzen(p.id, 'aktiv', 'Registrierung abgeschlossen'); nav(startVon(p.rolle)); }}>{tx("Gleich loslegen")}</Knopf>
      </>}
    </Seite>
  );
}

/** Tägliches Öffnen: PIN eingeben (Demo-PIN 1234) */
export function Sperre() {
  const { d, anmelden } = useDaten();
  const nav = useNavigate();
  const [wer, setWer] = useState('stefan');
  const [fehler, setFehler] = useState(0);
  const p = d.personen.find((x) => x.id === wer)!;
  return (
    <Seite titel={tx("App öffnen")} ohneMenue>
      <Auswahl label={tx("Beispiel ansehen")} klein spalten={3} optionen={[{ wert: 'stefan', text: tx("Stefan") }, { wert: 'horvat', text: tx("Marko (NU)") }, { wert: 'keller', text: tx("Martin (Polier)") }]} wert={wer} setWert={(w) => { setWer(w); setFehler(0); }} />
      <PinFeld frage={tx("Hallo {0}", p.vorname)} unter={<p className="text" style={{ textAlign: 'center' }}>{fehler ? tx("PIN falsch. Noch {0} Versuche.", 5 - fehler) : tx("Gib deine PIN ein (Demo: 1234).")}</p>} fertig={(x) => {
        if (x === p.pin || x === '1234') { anmelden(p.id); nav(startVon(p.rolle)); } else setFehler(fehler + 1);
      }} />
      <Link className="link" to="/registrierung" style={{ alignSelf: 'center' }}>{tx("PIN vergessen? Neuen Code anfordern")}</Link>
    </Seite>
  );
}
