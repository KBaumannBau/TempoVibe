// Registrierung mit Brief und Einmal-Passwort, Pflicht zum eigenen Passwort, Datenschutz, Ausweis, Standort.
// Danach bleibt das Handy angemeldet. Anmelden mit Passwort nur auf neuem Handy oder nach dem Abmelden.

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Fueller, Seite, startVon } from '../components/Rahmen';
import { Auswahl, Knopf } from '../components/Teile';
import { useDaten } from '../domain/store';
import { plusTage, tmj } from '../domain/zeit';
import { BRIEF_TAGE, DEMO_EINMAL, DEMO_PASSWORT, einmalPasst, passwortFehler, passwortPasst } from '../domain/zugang';
import type { Person } from '../domain/types';
import { appRolle } from '../domain/sel';
import { tx } from '../i18n';

const SCHRITTE = [tx("Erste Anmeldung"), tx("Eigenes Passwort"), tx("Datenschutz"), tx("Ausweis"), tx("Standort"), tx("Fertig")];

/** Passwortfeld mit „Anzeigen“ */
export function PasswortFeld({ id, label, wert, setWert, auto }: { id: string; label: string; wert: string; setWert: (s: string) => void; auto: string }) {
  const [zeigen, setZeigen] = useState(false);
  return (
    <div className="feld">
      <label htmlFor={id}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id={id} className="eingabe" style={{ flex: 1 }} type={zeigen ? 'text' : 'password'} autoComplete={auto} autoCapitalize="off" autoCorrect="off" spellCheck={false} value={wert} onChange={(e) => setWert(e.target.value)} />
        <button type="button" className="link" onClick={() => setZeigen(!zeigen)}>{zeigen ? tx("Verbergen") : tx("Anzeigen")}</button>
      </div>
    </div>
  );
}

/** Pflichtschritt: eigenes Passwort festlegen; ohne geht es nicht weiter */
export function NeuesPasswort({ verboten, fertig, knopf }: { verboten: string[]; fertig: (pw: string) => void; knopf: string }) {
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [fehler, setFehler] = useState('');
  const los = () => {
    const f = passwortFehler(pw1, verboten);
    if (f) return setFehler(tx(f));
    if (pw1 !== pw2) return setFehler(tx("Die beiden Passwörter sind nicht gleich."));
    fertig(pw1);
  };
  return <>
    <PasswortFeld id="pw1" label={tx("Neues Passwort")} wert={pw1} setWert={(x) => { setPw1(x); setFehler(''); }} auto="new-password" />
    <PasswortFeld id="pw2" label={tx("Neues Passwort wiederholen")} wert={pw2} setWert={(x) => { setPw2(x); setFehler(''); }} auto="new-password" />
    <span className="klein">{tx("Mindestens 8 Zeichen, mit mindestens einem Buchstaben und einer Ziffer. Gib das Passwort niemandem weiter, auch nicht dem Polier.")}</span>
    {fehler && <div className="hinweis orange" role="alert">{fehler}</div>}
    <Fueller />
    <Knopf gesperrt={!pw1 || !pw2} onClick={los}>{knopf}</Knopf>
  </>;
}

/** Musterbrief, wie ihn das Büro ausdruckt und per Post schickt */
export function BriefInhalt({ p, passwort, erstellt, gueltigBis }: { p: Person; passwort: string; erstellt: string; gueltigBis: string }) {
  const nu = p.rolle === 'nu';
  return (
    <div className="text" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="klein">{tx("K. Baumann Baugesellschaft · Lohnbuchhaltung · {0}", tmj(erstellt))}</span>
      <span className="fett">{tx("Dein Zugang zur Stundenerfassung")}</span>
      <span>{nu
        ? tx("Hallo {0}, du arbeitest über deine Firma auf unseren Baustellen. Mit diesem Brief meldest du dich einmal in der App an.", p.vorname)
        : tx("Hallo {0}, mit diesem Brief meldest du dich einmal in der App an.", p.vorname)}</span>
      <div className="karte pad" style={{ background: 'var(--flaeche, #f4f6f8)', gap: 4 }}>
        <span>{tx("Benutzername")}: <strong style={{ fontSize: 20, letterSpacing: 1 }}>{p.persNr}</strong></span>
        <span>{tx("Einmal-Passwort")}: <strong style={{ fontSize: 20, letterSpacing: 2, fontFamily: 'monospace' }}>{passwort}</strong></span>
        <span className="klein">{tx("Gilt bis {0} und nur für die erste Anmeldung.", tmj(gueltigBis))}</span>
      </div>
      <ol style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <li>{tx("App öffnen und „Erste Anmeldung mit Brief“ tippen.")}</li>
        <li>{tx("Benutzername und Einmal-Passwort eintragen.")}</li>
        <li>{tx("Sofort ein eigenes Passwort festlegen.")}</li>
      </ol>
      <span>{tx("Danach bleibt die App auf deinem Handy angemeldet. Bewahre den Brief nicht zusammen mit dem Handy auf und vernichte ihn nach der Anmeldung.")}</span>
    </div>
  );
}

export function Registrierung() {
  const { d, anmelden, a } = useDaten();
  const nav = useNavigate();
  const [wer, setWer] = useState<'stefan' | 'horvat'>('stefan');
  const [schritt, setSchritt] = useState(-1);
  const [benutzer, setBenutzer] = useState('');
  const [einmal, setEinmal] = useState('');
  const [fehler, setFehler] = useState(0);
  const [meldung, setMeldung] = useState('');
  const [ds, setDs] = useState(false);
  const [pid, setPid] = useState('');
  const demo = d.personen.find((x) => x.id === wer)!;
  const p = d.personen.find((x) => x.id === pid) ?? demo;
  const nu = p.rolle === 'nu';
  const weiter = () => setSchritt(schritt + 1);
  const kopf = schritt >= 0 && <span className="unter">{tx("Schritt {0} von 6: {1}", schritt + 1, SCHRITTE[schritt])}</span>;
  const fertig = (ziel: string) => { anmelden(p.id, true); nav(ziel); };

  if (schritt === -1) return (
    <Seite titel={tx("Registrierungsbrief")} ohneMenue>
      <Link to="/" className="link">{tx("‹ Zur Anmeldung")}</Link>
      <h1 className="h1">{tx("Brief mit Einmal-Passwort")}</h1>
      <span className="unter">{tx("Den Brief schickt dir die Lohnbuchhaltung per Post. Beispiel ansehen für:")}</span>
      <Auswahl label={tx("Für wen")} optionen={[{ wert: 'stefan' as const, text: tx("Eigener Mitarbeiter") }, { wert: 'horvat' as const, text: tx("Nachunternehmer-Person") }]} wert={wer} setWert={setWer} />
      <section className="karte pad" aria-label={tx("Brief")}>
        <BriefInhalt p={demo} passwort={demo.brief?.passwort ?? DEMO_EINMAL} erstellt={demo.brief?.erstellt ?? d.heute} gueltigBis={demo.brief?.gueltigBis ?? plusTage(d.heute, BRIEF_TAGE)} />
      </section>
      <Knopf onClick={() => setSchritt(0)}>{tx("Erste Anmeldung mit Brief")}</Knopf>
    </Seite>
  );

  if (schritt === 0) {
    const pruefen = () => {
      const x = d.personen.find((q) => q.persNr.toLowerCase() === benutzer.trim().toLowerCase() && q.nutztApp);
      const r = x ? einmalPasst(x, einmal, d.heute) : 'falsch';
      if (x && x.zugang === 'gesperrt') return setMeldung(tx("Dein Zugang ist gesperrt. Bitte melde dich in der Lohnbuchhaltung."));
      if (r === 'abgelaufen') return setMeldung(tx("Das Einmal-Passwort ist abgelaufen. Die Lohnbuchhaltung schickt dir einen neuen Brief."));
      if (r === 'falsch' || !x) { const n = fehler + 1; setFehler(n); return setMeldung(n >= 5 ? tx("Zu viele falsche Eingaben. Die Anmeldung ist für 15 Minuten gesperrt.") : tx("Benutzername oder Einmal-Passwort stimmt nicht. Noch {0} Versuche.", 5 - n)); }
      setPid(x.id); setMeldung(''); weiter();
    };
    return (
      <Seite titel={SCHRITTE[0]} ohneMenue>
        {kopf}
        <h1 className="h1">{tx("Erste Anmeldung")}</h1>
        <p className="text">{tx("Trage den Benutzernamen und das Einmal-Passwort aus deinem Brief ein.")}</p>
        <div className="feld"><label htmlFor="rb">{tx("Benutzername")}</label><input id="rb" className="eingabe" autoComplete="username" autoCapitalize="characters" value={benutzer} onChange={(e) => { setBenutzer(e.target.value); setMeldung(''); }} /></div>
        <PasswortFeld id="re" label={tx("Einmal-Passwort aus dem Brief")} wert={einmal} setWert={(x) => { setEinmal(x); setMeldung(''); }} auto="one-time-code" />
        <span className="klein">{tx("Demo: Benutzername {0}, Einmal-Passwort {1}.", demo.persNr, demo.brief?.passwort ?? DEMO_EINMAL)} <button type="button" className="link" onClick={() => { setBenutzer(demo.persNr); setEinmal(demo.brief?.passwort ?? DEMO_EINMAL); }}>{tx("eintragen")}</button></span>
        {meldung && <div className="hinweis orange" role="alert">{meldung}</div>}
        <Fueller />
        <Knopf gesperrt={!benutzer || !einmal || fehler >= 5} onClick={pruefen}>{tx("Anmelden")}</Knopf>
        <span className="klein">{tx("Brief verloren oder abgelaufen? Die Lohnbuchhaltung schickt dir einen neuen. Der alte gilt dann nicht mehr.")}</span>
      </Seite>
    );
  }

  if (schritt === 1) return (
    <Seite titel={SCHRITTE[1]} ohneMenue>
      {kopf}
      <h1 className="h1">{tx("Lege jetzt dein eigenes Passwort fest")}</h1>
      <p className="text">{tx("Das Einmal-Passwort aus dem Brief gilt ab jetzt nicht mehr. Ohne eigenes Passwort geht es nicht weiter.")}</p>
      <NeuesPasswort verboten={[p.brief?.passwort ?? DEMO_EINMAL, p.persNr]} knopf={tx("Passwort speichern")} fertig={(pw) => { a.passwortSetzen(p.id, pw, 'Registrierung mit Brief abgeschlossen, eigenes Passwort festgelegt'); weiter(); }} />
    </Seite>
  );

  return (
    <Seite titel={SCHRITTE[schritt]} ohneMenue>
      {kopf}
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
        <p className="text">{tx("Du bist angemeldet. Dieses Handy bleibt angemeldet, du musst dich beim Öffnen der App nicht neu anmelden.")}</p>
        <p className="text">{tx("Dein Passwort brauchst du nur auf einem neuen Handy oder wenn du dich abgemeldet hast.")}</p>
        <Fueller />
        <Knopf farbe="gruen" onClick={() => fertig('/intro')}>{tx("Einführung ansehen")}</Knopf>
        <Knopf farbe="rahmen" onClick={() => fertig(startVon(appRolle(d, p)))}>{tx("Gleich loslegen")}</Knopf>
      </>}
    </Seite>
  );
}

/** Anmelden mit Benutzername und eigenem Passwort: nur auf einem neuen Handy oder nach dem Abmelden */
export function Sperre() {
  const { d, ich, gemerkt, anmelden } = useDaten();
  const nav = useNavigate();
  const [benutzer, setBenutzer] = useState('');
  const [pw, setPw] = useState('');
  const [fehler, setFehler] = useState(0);
  const [meldung, setMeldung] = useState('');
  const [vergessen, setVergessen] = useState(false);
  if (ich && gemerkt) return <Navigate to={startVon(appRolle(d, ich))} replace />;
  const los = () => {
    const x = d.personen.find((q) => q.persNr.toLowerCase() === benutzer.trim().toLowerCase() && q.nutztApp);
    if (x && x.zugang === 'gesperrt') return setMeldung(tx("Dein Zugang ist gesperrt. Bitte melde dich in der Lohnbuchhaltung."));
    if (x && x.brief) return setMeldung(tx("Du hast einen Brief mit Einmal-Passwort. Bitte tippe unten auf „Erste Anmeldung mit Brief“."));
    if (!x || !passwortPasst(x, pw)) { const n = fehler + 1; setFehler(n); return setMeldung(n >= 5 ? tx("Zu viele falsche Eingaben. Die Anmeldung ist für 15 Minuten gesperrt.") : tx("Benutzername oder Passwort stimmt nicht. Noch {0} Versuche.", 5 - n)); }
    anmelden(x.id, true);
    nav(startVon(appRolle(d, x)));
  };
  return (
    <Seite titel={tx("Anmelden")} ohneMenue>
      <h1 className="h1">{tx("Anmelden")}</h1>
      <p className="text">{tx("Nur nötig auf einem neuen Handy oder nachdem du dich abgemeldet hast. Danach bleibt dieses Handy angemeldet.")}</p>
      <div className="feld"><label htmlFor="ab">{tx("Benutzername")}</label><input id="ab" className="eingabe" autoComplete="username" autoCapitalize="characters" value={benutzer} onChange={(e) => { setBenutzer(e.target.value); setMeldung(''); }} /></div>
      <PasswortFeld id="ap" label={tx("Passwort")} wert={pw} setWert={(x) => { setPw(x); setMeldung(''); }} auto="current-password" />
      <span className="klein">{tx("Demo: Benutzername 1001 (Stefan), Passwort {0}.", DEMO_PASSWORT)}</span>
      {meldung && <div className="hinweis orange" role="alert">{meldung}</div>}
      <Knopf gesperrt={!benutzer || !pw || fehler >= 5} onClick={los}>{tx("Anmelden")}</Knopf>
      <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={() => setVergessen(!vergessen)}>{tx("Passwort vergessen?")}</button>
      {vergessen && <div className="hinweis blau">{tx("Melde dich bei der Lohnbuchhaltung oder sag deinem Polier Bescheid. Du bekommst einen neuen Brief mit Einmal-Passwort per Post. Dein altes Passwort gilt dann nicht mehr.")}</div>}
      <Fueller />
      <Link className="knopf rahmen" to="/registrierung">{tx("Erste Anmeldung mit Brief")}</Link>
    </Seite>
  );
}
