// Mitarbeiter: Stempeln (M1–M6 im Entwurf V2)

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Fueller, Seite, Zurueck } from '../../components/Rahmen';
import { IOrt, IPause, IPlay, IRaucher, IStop } from '../../components/Icons';
import { Auswahl, Knopf } from '../../components/Teile';
import { useIch } from '../../domain/store';
import { baustelle, bsLang, bsName, einteilungAm, hatOrtung, person, rechnung, tagVon, voll } from '../../domain/sel';
import type { StempelArt } from '../../domain/types';
import { artName, dauer, sollFuer, stunden, tagLang, uhr, werktag } from '../../domain/zeit';
import { tx } from '../../i18n';

interface Gewaehlt { bs?: string; vonHand?: boolean; grund?: string }

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true);
    const b = () => setOn(false);
    window.addEventListener('online', a);
    window.addEventListener('offline', b);
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b); };
  }, []);
  return on;
}

/** M1/M3/M4: zeigt je nach Stand Arbeitsbeginn, laufende Zeit, Pause oder Feierabend */
export function Heute() {
  const { d, ich, a, jetzt } = useIch();
  const nav = useNavigate();
  const loc = useLocation();
  const online = useOnline();
  const gewaehlt = (loc.state ?? {}) as Gewaehlt;
  const r = rechnung(d, ich.id, d.heute);
  void jetzt; // laufende Zeit neu rechnen
  const tag = tagVon(d, ich.id, d.heute);
  const geplant = einteilungAm(d, ich.id, d.heute);
  const aktuell = baustelle(d, gewaehlt.bs) ?? baustelle(d, r.gueltig[r.gueltig.length - 1]?.baustelleId) ?? geplant;
  const ortung = hatOrtung(ich);
  const polier = aktuell?.polierId ? person(d, aktuell.polierId) : undefined;
  const offeneKorrektur = d.tage.find((t) => t.personId === ich.id && t.korrekturen.some((k) => !k.antwort));
  const gestern = werktag(d.heute, -1);
  const gesternOffen = tagVon(d, ich.id, gestern)?.status === 'offen' && rechnung(d, ich.id, gestern).zustand === 'fertig';

  const tippe = (art: StempelArt, raucher?: boolean) => {
    if (ortung && d.demoStandort === 'weicht_ab') {
      nav(`/ma/standort?art=${art}`, { state: { ...gewaehlt, bs: aktuell?.id } });
      return;
    }
    a.stempeln(art, { baustelleId: aktuell?.id, vonHand: gewaehlt.vonHand, begruendung: gewaehlt.grund, raucher });
    if (gewaehlt.bs) nav('.', { replace: true, state: null });
  };

  const status = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="unter">
        <span className="punkt" style={{ background: online ? 'var(--gruen)' : 'var(--orange)' }} aria-hidden="true" />
        {online ? tx("Online · alles gesendet") : tx("Kein Netz · wird nachgesendet")}
      </span>
      <Link to="/ma/vergessen" className="link">{tx("Stempeln vergessen?")}</Link>
    </div>
  );

  const neu = d.mitteilungen.filter((m) => m.personId === ich.id && !m.gelesen);
  const hinweise = (
    <>
      {neu.length > 0 && (
        <Link to="/ma/mitteilungen" className="hinweis blau" style={{ textDecoration: 'none', display: 'block' }}>
          <strong>{neu.length === 1 ? neu[0].titel : tx("{0} neue Mitteilungen", neu.length)}</strong>{neu.length === 1 ? `: ${neu[0].text}` : ''}
        </Link>
      )}
      {offeneKorrektur && (
        <Link to={`/ma/korrektur/${offeneKorrektur.id}`} className="hinweis orange" style={{ textDecoration: 'none', display: 'block' }}>
          <strong>{tx("Dein Polier hat einen Tag korrigiert.")}</strong> {' '}{tx("Bitte ansehen und bestätigen oder widersprechen.")}</Link>
      )}
      {gesternOffen && (
        <Link to={`/ma/tag/${gestern}`} className="hinweis orange" style={{ textDecoration: 'none', display: 'block' }}>
          <strong>{tx("{0} ist noch nicht gesendet.", tagLang(gestern))}</strong> {' '}{tx("Jetzt prüfen und senden.")}</Link>
      )}
    </>
  );

  const bsKarte = (
    <section aria-label={tx("Baustelle")} className="karte pad">
      {ortung ? (
        <span className="fett" style={{ fontSize: 14, color: gewaehlt.vonHand ? 'var(--orange-text)' : 'var(--gruen)' }}>
          {gewaehlt.vonHand ? tx("Von Hand gewählt") : aktuell?.id === geplant?.id ? tx("Laut Einteilung") : tx("Gewählt")}
          {d.demoStandort === 'passt' ? tx(" · Standort passt") : ''}
        </span>
      ) : <span className="fett klein">{tx("Angestellt · ohne Ortung")}</span>}
      <span className="titel fett" style={{ fontSize: 19, lineHeight: 1.3 }}>{bsLang(aktuell)}</span>
      {polier && <span className="unter">{tx("Polier {0}", voll(polier))}</span>}
      <Link to="/ma/baustelle" className="link">{tx("Andere Baustelle wählen")}</Link>
    </section>
  );

  if (r.zustand === 'aus') {
    return (
      <Seite titel={tx("Stempeln")} menue="stempeln">
        <div className="kopfzeilen">
          <span className="unter">{tx("{0} · Soll {1}", tagLang(d.heute), stunden(sollFuer(ich, d.heute)))}</span>
          <h1 className="h1 gross">{tx("Guten Morgen, {0}", ich.vorname)}</h1>
        </div>
        {hinweise}
        {bsKarte}
        <Knopf farbe="gruen" klasse="riesig" onClick={() => tippe('beginn')}><IPlay /><span>{tx("Arbeitsbeginn")}</span></Knopf>
        {ortung && <p className="text">{tx("Dein Standort wird nur beim Tippen mit der Baustelle verglichen und nicht gespeichert.")}</p>}
        <Fueller />
        {status}
      </Seite>
    );
  }

  if (r.zustand === 'arbeit' || r.zustand === 'pause') {
    const pause = r.zustand === 'pause';
    const lauf = r.pausen[r.pausen.length - 1];
    const raucher = pause && !!lauf?.raucher;
    // Hinweis ab 5:30 h, wenn die gesetzliche Pause noch fehlt
    const pauseNoetig = r.arbeitMin > 540 ? 45 : r.arbeitMin > 330 ? 30 : 0;
    const pauseFehltNoch = !pause && pauseNoetig > 0 && r.pauseGesetzlichMin < pauseNoetig;
    return (
      <Seite titel={raucher ? tx("Raucherpause") : pause ? tx("Pause") : tx("Arbeitszeit läuft")} menue="stempeln">
        {!online && <div className="hinweis orange"><strong>{tx("Kein Netz.")}</strong> {' '}{tx("Deine Zeiten sind auf dem Handy gespeichert und werden nachgesendet.")}</div>}
        {hinweise}
        <section aria-label={pause ? tx("Pause") : tx("Arbeitszeit")} className="karte pad mitte" style={{ padding: '20px 16px' }}>
          <span className="fett" style={{ fontSize: 15, color: pause ? 'var(--orange-text)' : 'var(--gruen)' }}>
            {raucher ? tx("Raucherpause seit {0}", lauf?.von) : pause ? tx("Pause seit {0}", lauf?.von) : tx("Arbeitszeit läuft seit {0}", uhr(r.beginn!.zeit))}
          </span>
          <span className="zahl" style={{ fontSize: 44 }}>{dauer(pause ? lauf?.min ?? 0 : r.arbeitMin)}</span>
          <span className="unter">{pause ? `gearbeitet ${dauer(r.arbeitMin)}` : tx("Pausen bisher {0} Min.", Math.round(r.pauseMin))}</span>
        </section>
        {raucher && <p className="text">{tx("Die Raucherpause ist keine Arbeitszeit. Unter 15 Minuten zählt sie nicht als gesetzliche Pause.")}</p>}
        {pauseFehltNoch && (
          <div className="hinweis orange"><strong>{tx("Denk an deine Pause.")}</strong> {' '}{tx("Ab 6 Stunden Arbeit sind 30 Minuten Pause Pflicht, ab 9 Stunden 45 Minuten. Fehlende Pause wird am Ende des Tages automatisch abgezogen.")}</div>
        )}
        <section aria-label={tx("Baustelle")} className="karte pad">
          <span className="titel fett" style={{ fontSize: 17 }}>{bsName(aktuell)}</span>
          <Link to="/ma/baustelle" className="link">{tx("Baustelle wechseln")}</Link>
        </section>
        <Fueller />
        {pause ? (
          <Knopf farbe="gruen" klasse="riesig" onClick={() => tippe('weiter')}><IPlay /><span>{tx("Weiter arbeiten")}</span></Knopf>
        ) : (
          <>
            <Knopf farbe="raucher" klasse="mittel" onClick={() => tippe('pause', true)}><IRaucher />{tx("Raucherpause")}</Knopf>
            <div className="zwei">
              <Knopf farbe="rahmen" onClick={() => tippe('pause')}><IPause size={24} />{tx("Pause")}</Knopf>
              <Knopf farbe="dunkel" onClick={() => tippe('ende')}><IStop size={22} />{tx("Arbeitsende")}</Knopf>
            </div>
          </>
        )}
        {status}
      </Seite>
    );
  }

  // fertig
  const gesendet = tag && tag.status !== 'offen';
  return (
    <Seite titel={tx("Feierabend")} menue="stempeln">
      {hinweise}
      <div className="kopfzeilen">
        <span className="unter">{tagLang(d.heute)}</span>
        <h1 className="h1 gross">{tx("Feierabend, {0}", ich.vorname)}</h1>
      </div>
      <section aria-label={tx("Heute")} className="karte pad">
        <span className="fett" style={{ fontSize: 17 }}>{tx("{0} bis {1} · Pause {2} Min.", uhr(r.beginn!.zeit), uhr(r.ende!.zeit), Math.round(r.pauseMin))}</span>
        {r.pauseAutoMin > 0 && <span className="unter" style={{ color: 'var(--orange-text)' }}>{tx("Davon {0} Min. automatisch abgezogen (gesetzliche Pause)", r.pauseAutoMin)}</span>}
        <span className="unter">{tx("{0} gearbeitet · Soll {1}", stunden(r.arbeitMin / 60), stunden(sollFuer(ich, d.heute)))}</span>
      </section>
      {gesendet ? (
        <div className="hinweis gruen"><strong>{tx("Gesendet.")}</strong> {' '}{tx("Dein Tag liegt beim Polier.")}</div>
      ) : (
        <p className="text">{tx("Prüfe deinen Tag und sende ihn an den Polier. Danach kannst du ihn nicht mehr ändern.")}</p>
      )}
      <Fueller />
      {!gesendet && <Link to={`/ma/tag/${d.heute}`} className="knopf blau">{tx("Tag prüfen und senden")}</Link>}
      {status}
    </Seite>
  );
}

const STANDORT_GRUENDE = [tx("Material geholt oder gebracht"), tx("Arbeit außerhalb des Baufelds"), tx("Ortung ungenau"), 'Anderer Grund'];

/** M5: Standort passt nicht – Begründung, die Zeit wird trotzdem gespeichert */
export function Standort() {
  const { a } = useIch();
  const [sp] = useSearchParams();
  const art = (sp.get('art') ?? 'beginn') as StempelArt;
  const loc = useLocation();
  const nav = useNavigate();
  const gewaehlt = (loc.state ?? {}) as Gewaehlt;
  const [grund, setGrund] = useState<string>();
  const [text, setText] = useState('');
  const fertig = grund && (grund !== 'Anderer Grund' || text.trim().length > 2);
  return (
    <Seite titel={tx("Standort passt nicht")} menue="stempeln">
      <Zurueck to="/ma/heute">{tx("Stempeln")}</Zurueck>
      <span className="gross-kreis" style={{ background: 'var(--orange-hell)', color: 'var(--orange-text)' }} aria-hidden="true"><IOrt size={40} /></span>
      <h1 className="h1" style={{ textAlign: 'center' }}>{tx("Du bist ca. 400 m von der Baustelle entfernt")}</h1>
      <p className="text" style={{ textAlign: 'center' }}>{tx("Deine Zeit für „{0}“ wird trotzdem gespeichert. Sag kurz, warum.", artName(art))}</p>
      <Auswahl label={tx("Grund")} spalten={1} optionen={STANDORT_GRUENDE.map((g) => ({ wert: g, text: g }))} wert={grund} setWert={setGrund} />
      {grund === 'Anderer Grund' && (
        <div className="feld"><label htmlFor="sgrund">{tx("Grund in eigenen Worten")}</label><textarea id="sgrund" className="eingabe" rows={2} value={text} onChange={(e) => setText(e.target.value)} /></div>
      )}
      <p className="text">{tx("Der Polier sieht nur den Abstand und deinen Grund, keine Karte.")}</p>
      <Fueller />
      <Knopf gesperrt={!fertig} onClick={() => {
        a.stempeln(art, { baustelleId: gewaehlt.bs, vonHand: gewaehlt.vonHand, begruendung: grund === 'Anderer Grund' ? text.trim() : grund });
        nav('/ma/heute', { replace: true });
      }}>{tx("{0} speichern", artName(art))}</Knopf>
      <Link to="/ma/baustelle" className="link mitte">{tx("Andere Baustelle wählen")}</Link>
    </Seite>
  );
}

const WAHL_GRUENDE = [tx("Einteilung geändert"), tx("Ortung klappt nicht"), tx("Material holen"), 'Anderer Grund'];

/** M2: Baustelle von Hand wählen – alle aktuellen Baustellen durchsuchbar, Grund ist Pflicht */
export function BaustelleWaehlen() {
  const { d, ich, a } = useIch();
  const laeuft = rechnung(d, ich.id, d.heute).zustand === 'arbeit';
  const nav = useNavigate();
  const [suche, setSuche] = useState('');
  const [wahl, setWahl] = useState<string>();
  const [grund, setGrund] = useState<string>();
  const geplant = einteilungAm(d, ich.id, d.heute);
  const liste = useMemo(() => {
    const s = suche.trim().toLowerCase();
    return d.baustellen.filter((b) => !b.archiviert && (!s || `${b.kst} ${b.strasse} ${b.plzOrt}`.toLowerCase().includes(s)));
  }, [d.baustellen, suche]);
  return (
    <Seite titel={tx("Baustelle wählen")} menue="stempeln">
      <Zurueck to="/ma/heute">{tx("Stempeln")}</Zurueck>
      <h1 className="h1">{laeuft ? tx("Baustelle wechseln") : tx("Baustelle wählen")}</h1>
      <div className="feld">
        <label htmlFor="suche">{tx("Suchen nach Kostenstelle, Straße oder Ort")}</label>
        <input id="suche" className="eingabe" type="search" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder={tx("z. B. 25050 oder Ottobrunn")} />
      </div>
      <ul className="liste" aria-label={tx("Baustellen")}>
        {liste.map((b) => (
          <li key={b.id}>
            <button type="button" className="zeile" aria-pressed={wahl === b.id} onClick={() => setWahl(b.id)} style={{ background: wahl === b.id ? 'var(--blau-hell)' : undefined, cursor: 'pointer' }}>
              <span className="wachs"><span className="fett">{bsName(b)}</span><span className="klein">{b.plzOrt}{b.id === geplant?.id ? tx(" · laut Einteilung") : ''}</span></span>
            </button>
          </li>
        ))}
        {liste.length === 0 && <li className="zeile klein">{tx("Keine Baustelle gefunden.")}</li>}
      </ul>
      {wahl && wahl !== geplant?.id && (
        <>
          <span className="fett" style={{ fontSize: 15 }}>{tx("Warum eine andere Baustelle? (Pflicht)")}</span>
          <Auswahl label={tx("Grund")} spalten={2} klein optionen={WAHL_GRUENDE.map((g) => ({ wert: g, text: g }))} wert={grund} setWert={setGrund} />
        </>
      )}
      <Fueller />
      <Knopf gesperrt={!wahl || (wahl !== geplant?.id && !grund)} onClick={() => {
        if (laeuft) { a.wechseln(wahl!, wahl !== geplant?.id ? grund : undefined); nav('/ma/heute'); return; }
        nav('/ma/heute', { state: { bs: wahl, vonHand: wahl !== geplant?.id, grund: wahl !== geplant?.id ? grund : undefined } });
      }}>
        {laeuft ? tx("Jetzt Baustelle wechseln") : tx("Diese Baustelle nehmen")}
      </Knopf>
      {laeuft && <p className="text">{tx("Tippe bei der Abfahrt. Die Zeit bis jetzt zählt für die bisherige Baustelle, ab jetzt für die neue.")}</p>}
      <p className="text">{tx("Der Polier sieht, dass du von Hand gewählt hast.")}</p>
    </Seite>
  );
}

/** M6: Vergessenes Stempeln melden – drei Knöpfe statt freiem Text */
export function Vergessen() {
  const { d, a } = useIch();
  const gestern = werktag(d.heute, -1);
  const [datum, setDatum] = useState(d.heute);
  const [art, setArt] = useState<'beginn' | 'ende' | 'pause'>();
  const [von, setVon] = useState('16:00');
  const [bis, setBis] = useState('12:30');
  const [fertig, setFertig] = useState(false);
  if (fertig) {
    return (
      <Seite titel={tx("Gemeldet")} menue="stempeln">
        <Fueller />
        <div className="hinweis gruen"><strong>{tx("Gemeldet.")}</strong> {' '}{tx("Dein Polier bekommt einen fertigen Vorschlag und übernimmt ihn oder lehnt ihn ab.")}</div>
        <Fueller />
        <Link to="/ma/heute" className="knopf blau">{tx("Zurück zum Stempeln")}</Link>
      </Seite>
    );
  }
  return (
    <Seite titel={tx("Stempeln vergessen")} menue="stempeln">
      <Zurueck to="/ma/heute">{tx("Stempeln")}</Zurueck>
      <h1 className="h1">{tx("Stempeln vergessen")}</h1>
      <Auswahl label={tx("Tag")} optionen={[{ wert: d.heute, text: tx("Heute, {0}", tagLang(d.heute).split(', ')[1]) }, { wert: gestern, text: tagLang(gestern) }]} wert={datum} setWert={setDatum} />
      <Auswahl label={tx("Was hast du vergessen?")} spalten={1} optionen={[
        { wert: 'beginn', text: tx("Beginn war um …") },
        { wert: 'ende', text: tx("Ende war um …") },
        { wert: 'pause', text: tx("Pause war von … bis …") },
      ]} wert={art} setWert={(w) => { setArt(w as typeof art); setVon(w === 'beginn' ? '07:00' : w === 'pause' ? '12:00' : '16:00'); }} />
      {art && (
        <div className={art === 'pause' ? 'zwei' : ''}>
          <div className="feld"><label htmlFor="von">{art === 'pause' ? tx("Pause von") : tx("Uhrzeit")}</label><input id="von" className="eingabe" type="time" value={von} onChange={(e) => setVon(e.target.value)} /></div>
          {art === 'pause' && <div className="feld"><label htmlFor="bis">{tx("bis")}</label><input id="bis" className="eingabe" type="time" value={bis} onChange={(e) => setBis(e.target.value)} /></div>}
        </div>
      )}
      <p className="text">{tx("Dein Polier sieht die Meldung als Vorschlag. Erst wenn er ihn übernimmt, zählt die Zeit.")}</p>
      <Fueller />
      <Knopf gesperrt={!art} onClick={() => { a.vergessenMelden(datum, art!, von, art === 'pause' ? bis : undefined); setFertig(true); }}>{tx("An den Polier senden")}</Knopf>
    </Seite>
  );
}
