import { useId, useState, type ReactNode } from 'react';
import { zuschlagArt } from '../domain/zuschlaege';
import type { Baustelle } from '../domain/types';
import { bsName } from '../domain/sel';
import { IHaken, IInfo, IRunter, IWeiter } from './Icons';
import { tx } from '../i18n';

/** Aufklappbare Erklärung „Wann gibt es das?“ nach § 6 BRTV */
export function ZuschlagInfo({ art, mitParagraf }: { art: string; mitParagraf?: boolean }) {
  const [offen, setOffen] = useState(false);
  const id = useId();
  return (
    <>
      <button type="button" className="link" style={{ minHeight: 40, fontSize: 15 }} aria-expanded={offen} aria-controls={id} onClick={() => setOffen(!offen)}>
        <IInfo />{offen ? tx("Text schließen") : tx("Wann gibt es das?{0}", mitParagraf ? ' (§ 6 BRTV)' : '')}
      </button>
      {offen && <p id={id} className="info-text">{tx(zuschlagArt(art).text)}</p>}
    </>
  );
}

/** PIN-Eingabe mit Ziffernfeld; ruft fertig() mit der 4-stelligen PIN */
export function PinFeld({ fertig, frage, unter }: { fertig: (pin: string) => void; frage: ReactNode; unter?: ReactNode }) {
  const [pin, setPin] = useState('');
  const tippe = (z: string) => {
    const neu = (pin + z).slice(0, 4);
    setPin(neu);
    if (neu.length === 4) {
      setTimeout(() => {
        fertig(neu);
        setPin('');
      }, 120);
    }
  };
  return (
    <>
      <div className="mitte" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 className="h1" style={{ textAlign: 'center' }}>{frage}</h1>
        {unter}
        <div className="pin-punkte" role="img" aria-label={tx("{0} von 4 Ziffern", pin.length)}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? 'an' : ''} />)}
        </div>
      </div>
      <span className="fueller" />
      <div className="tasten">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((t, i) =>
          t === '' ? <span key={i} /> : (
            <button key={i} type="button" className="taste" aria-label={t === '⌫' ? tx("Löschen") : t} onClick={() => (t === '⌫' ? setPin(pin.slice(0, -1)) : tippe(t))}>{t}</button>
          ),
        )}
      </div>
    </>
  );
}

/** Auswahl der Baustelle für Poliere mit mehreren Baustellen */
export function BaustelleWahl({ liste, wert, setWert }: { liste: Baustelle[]; wert: string; setWert: (id: string) => void }) {
  const [offen, setOffen] = useState(false);
  const id = useId();
  if (liste.length < 2) return null;
  const i = Math.max(0, liste.findIndex((b) => b.id === wert));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button type="button" className="karte" aria-expanded={offen} aria-controls={id} onClick={() => setOffen(!offen)}
        style={{ minHeight: 56, padding: '6px 14px', borderColor: 'var(--feld)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{tx("Baustelle · {0} von {1}", i + 1, liste.length)}</span>
          <span className="fett" style={{ fontSize: 16 }}>{bsName(liste[i])}</span>
        </span>
        <span style={{ color: 'var(--blau)', transform: offen ? 'rotate(180deg)' : undefined, display: 'flex' }}><IRunter /></span>
      </button>
      {offen && (
        <div id={id} role="group" aria-label={tx("Baustelle wählen")} className="liste zeilen" style={{ display: 'flex', flexDirection: 'column' }}>
          {liste.map((b) => (
            <button key={b.id} type="button" className="zeile" aria-pressed={b.id === wert} onClick={() => { setWert(b.id); setOffen(false); }}
              style={{ background: b.id === wert ? 'var(--blau-hell)' : undefined, cursor: 'pointer' }}>
              <span className="wachs"><span className="fett">{bsName(b)}</span><span className="klein">{b.plzOrt}</span></span>
              {b.id === wert && <span style={{ color: 'var(--blau)' }}><IHaken /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Haken({ an }: { an: boolean }) {
  return <span aria-hidden="true" className={`haken${an ? ' an' : ''}`}>{an ? '✓' : ''}</span>;
}

export function Weiter() {
  return <span style={{ color: 'var(--blau)', display: 'flex' }}><IWeiter /></span>;
}

/** großer grüner Haken mit Überschrift für „erledigt“-Bildschirme */
export function Erledigt({ titel, children }: { titel: string; children?: ReactNode }) {
  return (
    <div className="mitte" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span className="gross-kreis" style={{ background: 'var(--gruen)', color: '#fff' }} aria-hidden="true"><IHaken size={44} /></span>
      <h1 className="h1" style={{ textAlign: 'center' }}>{titel}</h1>
      {children}
    </div>
  );
}

/** Knopf, der gesperrt sein kann, aber fokussierbar bleibt */
export function Knopf({ farbe = 'blau', gesperrt, onClick, children, klasse = '' }: { farbe?: string; gesperrt?: boolean; onClick: () => void; children: ReactNode; klasse?: string }) {
  return (
    <button type="button" className={`knopf ${farbe} ${klasse}`} aria-disabled={gesperrt ? 'true' : undefined} onClick={() => !gesperrt && onClick()}>
      {children}
    </button>
  );
}

/** Auswahlknöpfe (eine Option aktiv) */
export function Auswahl<T extends string | number>({ optionen, wert, setWert, label, spalten = 2, klein }: { optionen: { wert: T; text: string }[]; wert: T | undefined; setWert: (w: T) => void; label: string; spalten?: number; klein?: boolean }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'grid', gridTemplateColumns: `repeat(${spalten}, minmax(0, 1fr))`, gap: 8 }}>
      {optionen.map((o) => (
        <button key={String(o.wert)} type="button" className={`wahl${klein ? ' klein-w' : ''}`} aria-pressed={wert === o.wert} onClick={() => setWert(o.wert)}
          style={spalten > 1 && !klein ? { textAlign: 'center' } : undefined}>
          {o.text}
        </button>
      ))}
    </div>
  );
}
