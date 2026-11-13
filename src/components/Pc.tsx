// Rahmen der PC-Ansichten: Navigation links je Rolle, Inhalt rechts (Entwurf V1)

import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDaten } from '../domain/store';
import { appRolle, tageBeiBauleitung, tageBeimPolier, voll } from '../domain/sel';
import type { Daten, Person, Rolle } from '../domain/types';
import { Logo } from './Logo';

interface NavPunkt { to: string; text: string; unter?: boolean; rollen: Rolle[]; zahl?: (d: Daten, ich: Person) => number }

const BUERO: Rolle[] = ['buero', 'gl'];
const LEITUNG: Rolle[] = ['buero', 'gl', 'oberbauleitung', 'einkauf'];

export const PC_NAV: NavPunkt[] = [
  { to: '/pc/gl', text: 'Übersicht Geschäftsleitung', rollen: ['gl'], zahl: (d) => d.antraege.filter((a) => a.status === 'bauleitung_ok').length },
  { to: '/pc/admin', text: 'Benutzer und Rollen', rollen: ['admin'] },
  { to: '/pc/polier', text: 'Übersicht', rollen: ['polier'] },
  { to: '/pc/polier/freigabe', text: 'Freigabe', rollen: ['polier'], zahl: (d, i) => tageBeimPolier(d, i.id).reduce((s, g) => s + g.tage.length, 0) },
  { to: '/pc/polier/einteilung', text: 'Einteilung', rollen: ['polier'] },
  { to: '/pc/polier/helfer', text: 'Helfer und NU', rollen: ['polier'] },
  { to: '/pc/bl', text: 'Übersicht', rollen: ['bauleitung'] },
  { to: '/pc/bl/freigabe', text: 'Freigabe', rollen: ['bauleitung'], zahl: (d, i) => tageBeiBauleitung(d, i.id).reduce((s, g) => s + g.tage.length, 0) },
  { to: '/pc/bl/gegenzeichnen', text: 'Gegenzeichnen', rollen: ['bauleitung'], zahl: (d) => d.helfer.filter((h) => !h.gegengezeichnet).length },
  { to: '/pc/bl/widersprueche', text: 'Widersprüche', rollen: ['bauleitung'], zahl: (d) => d.tage.reduce((s, t) => s + t.korrekturen.filter((k) => k.antwort === 'widerspruch' && !k.entscheidung).length, 0) },
  { to: '/pc/bl/antraege', text: 'Urlaub und Anträge', rollen: ['bauleitung'], zahl: (d) => d.antraege.filter((a) => a.status === 'offen' && a.art !== 'krank').length },
  { to: '/pc/obl', text: 'Tage der Bauleiter', rollen: ['oberbauleitung'], zahl: (d) => d.tage.filter((t) => t.anOberbauleitung && t.status === 'bei_bauleitung').length },
  { to: '/pc/stunden', text: 'Stunden', rollen: BUERO },
  { to: '/pc/nachtstunden', text: 'Nachtstunden', unter: true, rollen: BUERO },
  { to: '/pc/mitarbeiter', text: 'Mitarbeiter', rollen: BUERO },
  { to: '/pc/mehrstunden', text: 'Mehrstunden Angestellte', unter: true, rollen: BUERO },
  { to: '/pc/baustellen', text: 'Baustellen', rollen: [...LEITUNG] },
  { to: '/pc/projektkosten', text: 'Projektkosten', unter: true, rollen: [...LEITUNG, 'bauleitung'] },
  { to: '/pc/archiv', text: 'Baustellenarchiv', unter: true, rollen: [...LEITUNG] },
  { to: '/pc/disposition', text: 'Disposition', rollen: [...LEITUNG, 'bauleitung'] },
  { to: '/pc/nu', text: 'Nachunternehmer', rollen: [...LEITUNG] },
  { to: '/pc/abwesenheiten', text: 'Abwesenheiten', rollen: BUERO },
  { to: '/pc/betriebsurlaub', text: 'Betriebsurlaub', unter: true, rollen: BUERO },
  { to: '/pc/auswertung/baustelle', text: 'Auswertung je Baustelle', rollen: [...LEITUNG, 'bauleitung', 'polier'] },
  { to: '/pc/auswertung/mitarbeiter', text: 'je Mitarbeiter', unter: true, rollen: BUERO },
  { to: '/pc/auswertung/nu', text: 'Helfer / Nachunternehmer', unter: true, rollen: ['buero', 'gl', 'einkauf'] },
];

export function pcStart(rolle: Rolle): string {
  return ({ gl: '/pc/gl', admin: '/pc/admin', polier: '/pc/polier', bauleitung: '/pc/bl', oberbauleitung: '/pc/obl', einkauf: '/pc/nu', buero: '/pc/stunden' } as Partial<Record<Rolle, string>>)[rolle] ?? '/pc';
}

export const darfPc = (rolle: Rolle) => ['gl', 'admin', 'polier', 'bauleitung', 'oberbauleitung', 'einkauf', 'buero'].includes(rolle);
/** Stundensätze der NU sehen nur Einkauf und Geschäftsleitung */
export const siehtSaetze = (rolle: Rolle) => rolle === 'einkauf' || rolle === 'gl';

const ROLLEN_TEXT: Partial<Record<Rolle, string>> = {
  buero: 'Personal / HR / Lohn', gl: 'Geschäftsleitung', admin: 'Administrator', polier: 'Polier', bauleitung: 'Bauleiter', oberbauleitung: 'Oberbauleitung', einkauf: 'Einkauf',
};
export const rollenText = (r: Rolle) => ROLLEN_TEXT[r] ?? r;

export function PcSeite({ titel, pfad, rechts, children }: { titel: string; pfad?: string; rechts?: ReactNode; children: ReactNode }) {
  const { d, ich, abmelden } = useDaten();
  const nav = useNavigate();
  useEffect(() => {
    document.title = `${titel} · Stundenerfassung`;
    window.scrollTo(0, 0);
  }, [titel]);
  if (!ich) return null;
  const rolle = appRolle(d, ich);
  const punkte = PC_NAV.filter((p) => p.rollen.includes(rolle));
  return (
    <div className="pc">
      <nav className="pc-nav" aria-label="Bereiche">
        <span className="logo"><Logo /></span>
        {punkte.map((p) => {
          const n = p.zahl?.(d, ich) ?? 0;
          return (
            <NavLink key={p.to} to={p.to} end className={({ isActive }) => `${p.unter ? 'unter-punkt' : ''}${isActive ? ' aktiv' : ''}`}>
              <span>{p.text}</span>{n > 0 && <span className="zahl-badge">{n}</span>}
            </NavLink>
          );
        })}
        <div className="wer">
          <span><strong style={{ color: '#fff' }}>{voll(ich)}</strong><br />{rollenText(ich.rolle)}{rolle !== ich.rolle ? ' (als Polier)' : ''}</span>
          {(rolle === 'polier' || rolle === 'bauleitung') && <button type="button" onClick={() => nav(rolle === 'polier' ? '/p/heute' : '/b/heute')}>Auf dem Handy ansehen</button>}
          <button type="button" onClick={() => { abmelden(); nav('/pc'); }}>Abmelden</button>
        </div>
      </nav>
      <main className="pc-main">
        <header className="pc-kopf">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pfad && <span className="pc-pfad">{pfad}</span>}
            <h1>{titel}</h1>
          </div>
          {rechts}
        </header>
        {children}
      </main>
    </div>
  );
}

export function Pill({ farbe, children }: { farbe?: 'gruen' | 'orange' | 'rot' | 'blau' | 'vor'; children: ReactNode }) {
  return <span className={`pill ${farbe ?? ''}`}>{children}</span>;
}

export function Pk({ farbe = '', klein, gesperrt, onClick, children, titel }: { farbe?: string; klein?: boolean; gesperrt?: boolean; onClick: () => void; children: ReactNode; titel?: string }) {
  return (
    <button type="button" title={titel} className={`pk ${farbe}${klein ? ' klein' : ''}`} aria-disabled={gesperrt ? 'true' : undefined} onClick={() => !gesperrt && onClick()}>
      {children}
    </button>
  );
}

/** kurze Rückmeldung oben, verschwindet nach ein paar Sekunden */
export function useToast(): [ReactNode, (t: string, farbe?: 'gruen' | 'orange' | 'rot' | 'blau') => void] {
  const [t, setT] = useState<{ text: string; farbe: string } | null>(null);
  useEffect(() => {
    if (!t) return;
    const x = setTimeout(() => setT(null), 6000);
    return () => clearTimeout(x);
  }, [t]);
  const el = t ? <div role="status" className={`meldung ${t.farbe}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>{t.text}</span><button type="button" className="link" onClick={() => setT(null)} aria-label="Schließen">×</button></div> : null;
  return [el, (text, farbe = 'gruen') => setT({ text, farbe })];
}

export function Reiter<T extends string>({ wert, setWert, optionen, label }: { wert: T; setWert: (w: T) => void; optionen: { wert: T; text: ReactNode }[]; label: string }) {
  return (
    <div className="reiter" role="group" aria-label={label}>
      {optionen.map((o) => <button key={o.wert} type="button" aria-pressed={wert === o.wert} onClick={() => setWert(o.wert)}>{o.text}</button>)}
    </div>
  );
}

/** Datei herunterladen (Export, PDF-Ersatz) */
export function herunterladen(name: string, inhalt: string, typ = 'text/plain;charset=windows-1252') {
  try {
    const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

export const zahlDe = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
export const h1 = (h: number) => `${(Math.round(h * 10) / 10).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;
