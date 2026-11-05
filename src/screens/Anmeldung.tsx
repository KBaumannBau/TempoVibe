import { Link, useNavigate } from 'react-router-dom';
import { Kopf, startVon } from '../components/Rahmen';
import { Weiter } from '../components/Teile';
import { useDaten } from '../domain/store';
import { voll } from '../domain/sel';
import { tagLangJahr } from '../domain/zeit';

const ROLLEN: Record<string, string> = {
  facharbeiter: 'Facharbeiter', vorarbeiter: 'Vorarbeiter', polier: 'Polier', bauleitung: 'Bauleiter', helfer: 'Helfer', nu: 'Nachunternehmer (Bau-Service Kovač GmbH)',
};

/**
 * Demo-Anmeldung: Person wählen. In der echten App meldet man sich einmal
 * über den Einladungslink an und öffnet die App danach mit der eigenen PIN.
 */
export function Anmeldung() {
  const { d, anmelden, zuruecksetzen } = useDaten();
  const nav = useNavigate();
  const auswahl = ['stefan', 'kern', 'tobias', 'keller', 'buerger', 'horvat'].map((id) => d.personen.find((p) => p.id === id)!).filter(Boolean);
  return (
    <div className="screen">
      <Kopf />
      <main className="anmeldung">
        <div className="kopfzeilen">
          <span className="unter">Demo · {tagLangJahr(d.heute)}</span>
          <h1 className="h1 gross">Als wer möchtest du die App ansehen?</h1>
        </div>
        <ul className="liste">
          {auswahl.map((p) => (
            <li key={p.id}>
              <button type="button" className="zeile" style={{ minHeight: 64, cursor: 'pointer' }} onClick={() => { anmelden(p.id); nav(startVon(p.rolle)); }}>
                <span className="wachs"><span className="name">{voll(p)}</span><span className="klein">{p.gruppe === 'azubi' ? 'Auszubildender, unter 18' : ROLLEN[p.rolle]}{p.gruppe === 'angestellt' ? ' · angestellt, ohne Ortung' : ''}</span></span>
                <Weiter />
              </button>
            </li>
          ))}
        </ul>
        <section className="karte pad" aria-label="Weitere Bereiche">
          <span className="fett">Weitere Bereiche</span>
          <Link to="/pc" className="knopf blau mittel">Am PC anmelden (Büro, Leitung, Einkauf, Admin)</Link>
          <div className="zwei">
            <Link to="/registrierung" className="knopf rahmen mittel">Einladung und Registrierung</Link>
            <Link to="/sperre" className="knopf rahmen mittel">App öffnen mit PIN</Link>
          </div>
          <div className="pk-reihe"><Link className="link" to="/intro">Einführung</Link><Link className="link" to="/hilfe">Hilfe</Link><Link className="link" to="/faq">Häufige Fragen</Link><Link className="link" to="/datenschutz">Datenschutz</Link></div>
        </section>
        <section className="hinweis blau" aria-label="So funktioniert die Demo">
          <strong>So funktioniert die Demo:</strong> Alle Daten sind erfunden und liegen nur in diesem Browser. Stempelt Stefan einen Tag und sendet ihn, erscheint er bei Polier Martin Keller und danach bei Bauleiter Willibald Bürger. Oben rechts im Kopf kommst du über „?“ zu „Mehr“ und dort zum Personenwechsel.
        </section>
        <p className="text">Demo-PIN für alle: <strong>1234</strong>. Florin Popescu (ohne Handy) bestätigt mit <strong>2468</strong>.</p>
        <button type="button" className="link" onClick={() => { if (confirm('Alle Demo-Eingaben löschen und die Beispieldaten neu laden?')) zuruecksetzen(); }}>Demo zurücksetzen</button>
      </main>
    </div>
  );
}
