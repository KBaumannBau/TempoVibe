// P1: Anmeldung am PC (E-Mail und Passwort, Sperre nach 5 Fehlversuchen)

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { pcStart, rollenText } from '../../components/Pc';
import { useDaten } from '../../domain/store';
import { voll } from '../../domain/sel';

const PW = 'Baustelle-2026';
const MAX = 5;
const DEMO = ['weber', 'buerger', 'keller', 'sgruber', 'roth', 'gl', 'brunner'];

export function PcLogin() {
  const { d, anmelden, a } = useDaten();
  const nav = useNavigate();
  const [mail, setMail] = useState('');
  const [pw, setPw] = useState('');
  const [zeigen, setZeigen] = useState(false);
  const [fehler, setFehler] = useState(0);
  const [msg, setMsg] = useState('');
  const [vergessen, setVergessen] = useState(false);
  const leute = DEMO.map((id) => d.personen.find((p) => p.id === id)!).filter(Boolean);
  const gesperrt = fehler >= MAX;
  const login = () => {
    if (gesperrt) return;
    const m = mail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return setMsg('Bitte eine gültige E-Mail-Adresse eintragen.');
    if (!pw) return setMsg('Bitte das Passwort eintragen.');
    const p = d.personen.find((x) => x.email?.toLowerCase() === m);
    if (p && pw === PW && DEMO.includes(p.id)) {
      anmelden(p.id);
      setTimeout(() => a.techLog('Anmeldung am PC'), 0);
      nav(pcStart(p.rolle));
      return;
    }
    const n = fehler + 1;
    setFehler(n);
    setPw('');
    setMsg(MAX - n > 0 ? `E-Mail-Adresse oder Passwort stimmt nicht. Noch ${MAX - n} ${MAX - n === 1 ? 'Versuch' : 'Versuche'}, dann ist die Anmeldung 15 Minuten gesperrt.` : '');
  };
  return (
    <div className="pc-login">
      <aside>
        <Logo />
        <span className="titel" style={{ fontWeight: 800, fontSize: 28, color: '#fff', marginTop: 16 }}>Stundenerfassung</span>
        <span style={{ fontSize: 17 }}>Anmeldung am PC für Büro, Bauleiter, Polier, Oberbauleitung, Einkauf, Geschäftsleitung und Administrator</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15 }}>
          <strong style={{ color: '#fff' }}>Nach der Anmeldung öffnet sich die Seite deiner Rolle.</strong>
          {leute.map((p) => <span key={p.id} style={{ borderTop: '1px solid #2c3e4e', paddingTop: 8 }}><strong style={{ color: '#fff' }}>{rollenText(p.rolle)}</strong> · {voll(p)}</span>)}
        </div>
        <span style={{ marginTop: 'auto', fontSize: 14, color: '#a6b3be' }}>Gewerbliche Mitarbeiter melden sich nicht hier an, sondern in der App auf dem Handy (Registrierungsbrief mit Einmal-Passwort per Post, danach bleibt das Handy angemeldet).</span>
      </aside>
      <main>
        <section className="pc-karte" aria-labelledby="lg-h">
          {!vergessen ? (
            <>
              <h1 id="lg-h" className="titel" style={{ margin: 0, fontSize: 28 }}>Anmelden</h1>
              <label className="pc-feld"><span>E-Mail-Adresse</span><input type="email" autoComplete="username" value={mail} disabled={gesperrt} onChange={(e) => { setMail(e.target.value); setMsg(''); }} placeholder="name@firma.example" /></label>
              <div className="pc-feld"><label htmlFor="pw">Passwort</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input id="pw" className="pc-in" style={{ flexGrow: 1 }} type={zeigen ? 'text' : 'password'} autoComplete="current-password" value={pw} disabled={gesperrt} onChange={(e) => { setPw(e.target.value); setMsg(''); }} onKeyDown={(e) => e.key === 'Enter' && login()} />
                  <button type="button" className="pk" aria-pressed={zeigen} onClick={() => setZeigen(!zeigen)}>{zeigen ? 'verbergen' : 'anzeigen'}</button>
                </div>
              </div>
              {(msg || gesperrt) && <div role="alert" className="meldung rot">{gesperrt ? 'Zu viele falsche Versuche (5). Die Anmeldung ist für 15 Minuten gesperrt. Danach kannst du es wieder versuchen oder über „Passwort vergessen?“ ein neues Passwort festlegen.' : msg}</div>}
              <div className="pk-reihe" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="link" onClick={() => { setVergessen(true); setMsg(''); }}>Passwort vergessen?</button>
                <button type="button" className="pk blau" aria-disabled={gesperrt ? 'true' : undefined} onClick={login}>Anmelden</button>
              </div>
            </>
          ) : (
            <>
              <h1 className="titel" style={{ margin: 0, fontSize: 28 }}>Passwort vergessen</h1>
              <p className="text">Trag deine E-Mail-Adresse ein. Du bekommst einen Link per E-Mail und legst damit ein neues Passwort fest. Der Link gilt 30 Minuten und nur einmal. <span className="pill vor">Vorschlag</span></p>
              <label className="pc-feld"><span>E-Mail-Adresse</span><input type="email" value={mail} onChange={(e) => setMail(e.target.value)} /></label>
              {msg && <div role="status" className="meldung gruen">{msg}</div>}
              <div className="pk-reihe" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="pk" onClick={() => { setVergessen(false); setMsg(''); }}>‹ Zurück zur Anmeldung</button>
                <button type="button" className="pk blau" onClick={() => setMsg(`Wenn es zu ${mail.trim() || 'dieser Adresse'} einen Zugang gibt, ist jetzt eine E-Mail mit dem Link unterwegs. Bitte auch im Spam-Ordner nachsehen.`)}>Link per E-Mail senden</button>
              </div>
            </>
          )}
        </section>
        <section className="pc-karte" style={{ borderStyle: 'dashed' }} aria-label="Demo">
          <span className="text"><strong>Demo – anmelden als …</strong> Ein Klick trägt E-Mail und Passwort ein. Zum Testen der Sperre ein falsches Passwort eintippen.</span>
          <div className="pk-reihe">
            {leute.map((p) => <button key={p.id} type="button" className="pk" onClick={() => { setMail(p.email ?? ''); setPw(PW); setMsg(''); setVergessen(false); }}>{rollenText(p.rolle)}</button>)}
            <button type="button" className="pk" onClick={() => { setFehler(0); setMsg(''); setMail(''); setPw(''); }}>Zurücksetzen</button>
          </div>
        </section>
        <section className="pc-karte">
          <h2>Regeln für die Anmeldung am PC</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.45 }}>
            <li><strong>E-Mail-Adresse und Passwort.</strong> Es gibt keinen zweiten Faktor.</li>
            <li><strong>Sperre:</strong> Nach 5 falschen Versuchen ist die Anmeldung für 15 Minuten gesperrt.</li>
            <li><strong>Passwort:</strong> mindestens 12 Zeichen <span className="pill vor">Vorschlag</span></li>
            <li><strong>Automatische Abmeldung:</strong> nach 30 Minuten ohne Eingabe <span className="pill vor">Vorschlag</span></li>
          </ul>
          <span className="klein">Die Zugänge legt der Administrator an (Benutzer und Rollen).</span>
        </section>
        <Link to="/" className="link">‹ Zur Handy-App (Personenwahl)</Link>
      </main>
    </div>
  );
}
