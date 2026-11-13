import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useDaten } from '../domain/store';
import { appRolle, tageBeiBauleitung, tageBeimPolier } from '../domain/sel';
import type { Rolle } from '../domain/types';
import { Logo } from './Logo';
import { SPRACHEN, nurDeutsch, sprache, spracheAbgleichen, spracheWaehlen, tx, type Sprache } from '../i18n';
import { IBalken, IDokument, IFrage, IHaken, IHaus, IKalender, ILeute, IMenue, ISonne, IUhr, IWelt, IZurueck } from './Icons';

export type MenuePunkt =
  | 'stempeln' | 'einteilung' | 'konto' | 'antraege' | 'mehr'
  | 'heute' | 'freigabe' | 'kolonne' | 'baustelle' | 'urlaub' | 'stunden' | 'nachweise';

interface Punkt { key: MenuePunkt; text: string; to: string; icon: ReactNode; badge?: number }

function punkte(rolle: Rolle, offenP: number, offenB: number): Punkt[] {
  if (rolle === 'polier')
    return [
      { key: 'heute', text: 'Heute', to: '/p/heute', icon: <IHaus /> },
      { key: 'freigabe', text: 'Freigabe', to: '/p/freigabe', icon: <IHaken />, badge: offenP },
      { key: 'kolonne', text: 'Kolonne', to: '/p/kolonne', icon: <ILeute /> },
      { key: 'baustelle', text: 'Baustelle', to: '/p/auswertung', icon: <IBalken /> },
      { key: 'mehr', text: 'Mehr', to: '/p/mehr', icon: <IMenue /> },
    ];
  if (rolle === 'nu')
    return [
      { key: 'heute', text: 'Heute', to: '/nu/heute', icon: <IUhr /> },
      { key: 'stunden', text: 'Stunden', to: '/nu/stunden', icon: <IKalender /> },
      { key: 'nachweise', text: 'Nachweise', to: '/nu/nachweise', icon: <IDokument /> },
      { key: 'mehr', text: 'Mehr', to: '/nu/mehr', icon: <IMenue /> },
    ];
  if (rolle === 'bauleitung')
    return [
      { key: 'heute', text: 'Heute', to: '/b/heute', icon: <IHaus /> },
      { key: 'freigabe', text: 'Freigabe', to: '/b/freigabe', icon: <IHaken />, badge: offenB },
      { key: 'urlaub', text: 'Urlaub', to: '/b/urlaub', icon: <ISonne /> },
      { key: 'baustelle', text: 'Baustellen', to: '/b/baustellen', icon: <IBalken /> },
      { key: 'mehr', text: 'Mehr', to: '/b/mehr', icon: <IMenue /> },
    ];
  return [
    { key: 'stempeln', text: 'Stempeln', to: '/ma/heute', icon: <IUhr /> },
    { key: 'einteilung', text: 'Einteilung', to: '/ma/einteilung', icon: <IKalender /> },
    { key: 'konto', text: 'Konto', to: '/ma/konto', icon: <IBalken /> },
    { key: 'antraege', text: 'Anträge', to: '/ma/antraege', icon: <IDokument /> },
    { key: 'mehr', text: 'Mehr', to: '/ma/mehr', icon: <IMenue /> },
  ];
}

/** Startseite der Rolle */
export function startVon(rolle: Rolle) {
  return rolle === 'polier' ? '/p/heute' : rolle === 'bauleitung' ? '/b/heute' : rolle === 'nu' ? '/nu/heute' : ['buero', 'gl', 'admin', 'oberbauleitung', 'einkauf'].includes(rolle) ? '/pc' : '/ma/heute';
}
export function mehrVon(rolle: Rolle) {
  return rolle === 'polier' ? '/p/mehr' : rolle === 'bauleitung' ? '/b/mehr' : rolle === 'nu' ? '/nu/mehr' : '/ma/mehr';
}

export function Kopf() {
  const { d, ich, a } = useDaten();
  const [offen, setOffen] = useState(false);
  // Gespeicherte Sprache der Person gilt auch auf diesem Gerät
  useEffect(() => { spracheAbgleichen(ich?.sprache); }, [ich?.sprache]);
  const aktuell = SPRACHEN.find((x) => x.code === sprache)!;
  const waehlen = (s: Sprache) => {
    if (ich) a.spracheSetzen(ich.id, s);
    spracheWaehlen(s);
  };
  return (
    <header className="kopf">
      <Link to={ich ? startVon(appRolle(d, ich)) : '/'} aria-label={tx('Startseite')} style={{ color: '#fff' }}><Logo /></Link>
      <div className="kopf-rechts">
        {!nurDeutsch() && <button type="button" className="kopf-knopf" aria-label={`${tx('Sprache wählen')}: ${aktuell.name}`} aria-expanded={offen} onClick={() => setOffen(!offen)}>
          <IWelt size={20} />{sprache.toUpperCase()}
        </button>}
        <Link className="kopf-knopf" to="/hilfe" aria-label={tx('Hilfe')}><IFrage size={22} /></Link>
      </div>
      {offen && !nurDeutsch() && (
        <div className="sprach-wahl" role="dialog" aria-label={tx('Sprache wählen')}>
          <span className="fett">{tx('Sprache wählen')}</span>
          <ul>
            {SPRACHEN.map((x) => (
              <li key={x.code}>
                <button type="button" lang={x.code} aria-pressed={x.code === sprache} onClick={() => (x.code === sprache ? setOffen(false) : waehlen(x.code))}>
                  <span className="code">{x.code.toUpperCase()}</span>{x.name}{x.code === sprache ? ' ✓' : ''}
                </button>
              </li>
            ))}
          </ul>
          <span className="klein">{tx('Maßgeblich ist die deutsche Fassung. Die Seiten für Polier, Bauleitung und Büro bleiben deutsch.')}</span>
        </div>
      )}
    </header>
  );
}

function Menue({ aktiv }: { aktiv?: MenuePunkt }) {
  const { d, ich } = useDaten();
  if (!ich) return null;
  const offenP = tageBeimPolier(d, ich.id).reduce((s, g) => s + g.tage.length, 0);
  const offenB = tageBeiBauleitung(d, ich.id).reduce((s, g) => s + g.tage.length, 0);
  // Seiten der Mitarbeiter (z. B. Stempeln, PIN) zeigen für Polier und Bauleitung deren eigenes Menü
  let ziel = aktiv;
  const liste = punkte(appRolle(d, ich), offenP, offenB);
  if (ziel && !liste.some((p) => p.key === ziel)) ziel = ziel === 'stempeln' ? 'heute' : 'mehr';
  return (
    <nav className="menue" aria-label={tx("Hauptmenü")}>
      {liste.map((p) => (
        <NavLink key={p.key} to={p.to} className={p.key === ziel ? 'aktiv' : ''} aria-current={p.key === ziel ? 'page' : undefined}>
          <span className="icon">
            {p.icon}
            {p.badge ? <span className="badge" aria-label={tx('{0} offen', p.badge)}>{p.badge}</span> : null}
          </span>
          <span>{tx(p.text)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Ein Bildschirm: Kopfleiste, Inhalt, Menü unten */
export function Seite({ titel, menue, ohneMenue, children }: { titel: string; menue?: MenuePunkt; ohneMenue?: boolean; children: ReactNode }) {
  useEffect(() => {
    document.title = `${titel} · Stundenerfassung`;
    window.scrollTo(0, 0);
  }, [titel]);
  return (
    <div className={`screen${ohneMenue ? '' : ' mit-menue'}`}>
      <Kopf />
      <main className="inhalt">{children}</main>
      {!ohneMenue && <Menue aktiv={menue} />}
    </div>
  );
}

export function Zurueck({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="link" style={{ textDecoration: 'none' }}>
      <IZurueck />{children}
    </Link>
  );
}

export function Fueller() {
  return <span className="fueller" />;
}
