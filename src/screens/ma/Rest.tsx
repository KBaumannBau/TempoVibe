// Mitarbeiter: Einteilung, Woche, Konto, Anträge, Mehr, PIN, Geräte, Abgemeldet

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IHandyWeg } from '../../components/Icons';
import { Fueller, Seite, Zurueck, mehrVon } from '../../components/Rahmen';
import { Auswahl, Erledigt, Knopf, PinFeld, Weiter } from '../../components/Teile';
import { useDaten, useIch } from '../../domain/store';
import { abwesendBis, bsLang, bsName, einteilungAm, kontoStand, person, rechnung, stundenTag, tagVon, urlaubRest, voll } from '../../domain/sel';
import type { AntragArt, TagStatus } from '../../domain/types';
import { arbeitstage, ausKey, feiertag, istWerktag, kw, montagDerWoche, plusTage, sollFuer, stunden, tagLang, tm, vorzeichen, werktag, wtKurz } from '../../domain/zeit';
import { anlassText } from './Extra';

const STATUS: Record<TagStatus, string> = {
  offen: 'nicht gesendet', beim_polier: 'beim Polier', zurueck_polier: 'beim Polier', bei_bauleitung: 'bei der Bauleitung', freigegeben: 'freigegeben',
};

/** E1: Meine Einteilung – heute und morgen */
export function Einteilung() {
  const { d, ich } = useIch();
  const morgen = werktag(d.heute, 1);
  const karte = (datum: string, titel: string) => {
    const b = einteilungAm(d, ich.id, datum);
    const polier = b?.polierId ? person(d, b.polierId) : undefined;
    const bl = b ? person(d, b.bauleitungId) : undefined;
    return (
      <section aria-label={titel} className="karte pad">
        <span className="fett klein" style={{ color: 'var(--blau-dunkel)' }}>{titel} · {tagLang(datum)}</span>
        <span className="titel fett" style={{ fontSize: 19, lineHeight: 1.3 }}>{b ? bsLang(b) : 'Keine Einteilung'}</span>
        {polier && <span className="unter">Melden bei Polier {voll(polier)}</span>}
        {bl && <span className="unter">Bauleiter {voll(bl)}</span>}
      </section>
    );
  };
  const aenderung = einteilungAm(d, ich.id, d.heute)?.id !== einteilungAm(d, ich.id, morgen)?.id;
  return (
    <Seite titel="Meine Einteilung" menue="einteilung">
      <h1 className="h1 gross">Meine Einteilung</h1>
      {karte(d.heute, 'Heute')}
      {aenderung && <div className="hinweis orange"><strong>Ab morgen andere Baustelle.</strong> Du bekommst bei jeder Änderung eine Nachricht.</div>}
      {karte(morgen, 'Morgen')}
      <Link to="/ma/woche" className="link">Ganze Woche und Kalender</Link>
    </Seite>
  );
}

/** E2: Meine Woche */
export function Woche() {
  const { d, ich } = useIch();
  const [versatz, setVersatz] = useState(0);
  const mo = plusTage(montagDerWoche(d.heute), versatz * 7);
  const tage = [0, 1, 2, 3, 4].map((i) => plusTage(mo, i));
  return (
    <Seite titel="Meine Woche" menue="einteilung">
      <Zurueck to="/ma/einteilung">Einteilung</Zurueck>
      <div className="kopfzeilen">
        <h1 className="h1">KW {kw(mo)}</h1>
        <span className="unter">{tm(mo)} bis {tm(plusTage(mo, 4))}</span>
      </div>
      <div className="zwei">
        <button type="button" className="wahl klein-w" onClick={() => setVersatz(versatz - 1)}>← Vorwoche</button>
        <button type="button" className="wahl klein-w" onClick={() => setVersatz(versatz + 1)}>Nächste Woche →</button>
      </div>
      <ul className="liste" aria-label="Tage der Woche">
        {tage.map((t) => {
          const b = einteilungAm(d, ich.id, t);
          const tag = tagVon(d, ich.id, t);
          const h = stundenTag(d, ich.id, t);
          const ft = feiertag(t);
          const weg = abwesendBis(d, ich.id, t);
          return (
            <li key={t} className="zeile" style={{ background: t === d.heute ? 'var(--blau-flaeche)' : undefined }}>
              <span className="fett" style={{ width: 44 }}>{wtKurz(t)}<br /><span className="klein" style={{ fontWeight: 400 }}>{tm(t)}</span></span>
              <span className="wachs">
                <span className="fett">{ft ?? (weg ? 'Abwesend' : bsName(b))}</span>
                <span className="klein">{ft ? 'Feiertag' : tag ? `${stunden(h)} · ${STATUS[tag.status]}` : t > d.heute ? 'geplant' : '–'}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text">Feiertage gelten für Bayern. Urlaub und Betriebsurlaub stehen hier, sobald sie genehmigt sind.</p>
    </Seite>
  );
}

/** E3: Arbeitszeitkonto (SIKOFlex) bzw. Mehrstunden für Angestellte */
export function Konto() {
  const { d, ich } = useIch();
  const stand = kontoStand(d, ich.id);
  const bestaetigt = kontoStand(d, ich.id, true);
  const tage = d.tage.filter((t) => t.personId === ich.id && t.status !== 'offen').sort((x, y) => y.datum.localeCompare(x.datum)).slice(0, 8);
  const angestellt = ich.gruppe === 'angestellt';
  return (
    <Seite titel="Mein Konto" menue="konto">
      <h1 className="h1 gross">{angestellt ? 'Meine Mehrstunden' : 'Mein Arbeitszeitkonto'}</h1>
      <section className="karte pad" aria-label="Stand">
        <span className="unter">Stand nach deinen gesendeten Tagen</span>
        <span className="zahl" style={{ fontSize: 34 }}>{stunden(stand)}</span>
        <span className="unter">davon von der Bauleitung freigegeben: {stunden(bestaetigt)}</span>
      </section>
      <h2 className="h2">Letzte Tage</h2>
      <ul className="liste">
        {tage.map((t) => {
          const h = stundenTag(d, ich.id, t.datum);
          return (
            <li key={t.id} className="zeile">
              <span className="wachs"><span className="fett">{tagLang(t.datum)}</span><span className="klein">{stunden(h)} · Soll {stunden(sollFuer(ich, t.datum))} · {STATUS[t.status]}</span></span>
              <span className="fett tab">{vorzeichen(h - sollFuer(ich, t.datum))}</span>
            </li>
          );
        })}
      </ul>
      {!angestellt && <p className="text">Über 150 h wird ausbezahlt. Frei vom Konto geht im Sommer erst ab 100 h, im Winter (Dezember bis März) bis 50 h. Verbindlich rechnet die Lohnbuchhaltung.</p>}
    </Seite>
  );
}

const ANTRAG_STATUS: Record<string, string> = { offen: 'wartet auf Bauleitung', bauleitung_ok: 'Bauleiter ok, liegt bei der Geschäftsleitung', genehmigt: 'genehmigt', abgelehnt: 'abgelehnt', gemeldet: 'gemeldet' };

/** A1: Anträge und Meldungen */
export function Antraege() {
  const { d, ich } = useIch();
  const { rest } = urlaubRest(d, ich.id);
  const meine = d.antraege.filter((x) => x.personId === ich.id).sort((x, y) => y.gestellt.localeCompare(x.gestellt));
  return (
    <Seite titel="Anträge" menue="antraege">
      <h1 className="h1 gross">Anträge</h1>
      <section className="karte pad" aria-label="Urlaub">
        <span className="unter">Urlaub {ausKey(d.heute).getFullYear()}</span>
        <span className="zahl" style={{ fontSize: 26 }}>noch {rest} Tage</span>
        <span className="unter">Konto {stunden(kontoStand(d, ich.id))}</span>
      </section>
      <div className="zwei">
        <Link to="/ma/urlaub" className="knopf blau mittel">Frei nehmen</Link>
        <Link to="/ma/krank" className="knopf rahmen mittel">Krank melden</Link>
      </div>
      <div className="zwei">
        <Link to="/ma/arbeitsbefreiung" className="knopf rahmen mittel">Arbeitsbefreiung</Link>
        <Link to="/ma/betriebsurlaub" className="knopf rahmen mittel">Betriebsurlaub</Link>
      </div>
      <h2 className="h2">Meine Anträge</h2>
      <ul className="liste">
        {meine.map((x) => (
          <li key={x.id} className="zeile">
            <span className="wachs">
              <span className="fett">{x.art === 'urlaub' ? 'Urlaub' : x.art === 'konto' ? 'Frei vom Konto' : x.art === 'arbeitsbefreiung' ? `Arbeitsbefreiung (${anlassText(x.anlass)})` : x.art === 'betriebsurlaub' ? 'Betriebsurlaub' : x.wer === 'kind' ? 'Kind krank' : 'Krank'} {tm(x.von)}{x.bis !== x.von ? `–${tm(x.bis)}` : ''}</span>
              <span className="klein">{x.art === 'konto' ? stunden(x.stunden ?? 0) : `${x.tage} Tage`} · {ANTRAG_STATUS[x.status]}</span>
              {x.ablehnGrund && <span className="klein">„{x.ablehnGrund}“</span>}
              {x.art === 'arbeitsbefreiung' && x.nachweis === 'fehlt' && <Link className="link" to={`/ma/nachweis/${x.id}`}>Nachweis fehlt: nachreichen ›</Link>}
              {x.art === 'arbeitsbefreiung' && x.nachweis === 'hochgeladen' && <span className="klein">Nachweis wird geprüft</span>}
              {x.art === 'krank' && x.status === 'gemeldet' && x.bis >= d.heute && !x.rueckmeldung && <Link className="link" to={`/ma/krank/${x.id}`}>Wie geht es weiter? Bitte antworten ›</Link>}
            </span>
          </li>
        ))}
        {meine.length === 0 && <li className="zeile klein">Noch keine Anträge.</li>}
      </ul>
    </Seite>
  );
}

/** A2: Urlaub oder Frei vom Konto beantragen */
export function Urlaub() {
  const { d, ich, a } = useIch();
  const nav = useNavigate();
  const [art, setArt] = useState<AntragArt>('urlaub');
  const [von, setVon] = useState(werktag(d.heute, 10));
  const [bis, setBis] = useState(werktag(d.heute, 14));
  const tage = bis >= von ? arbeitstage(von, bis) : 0;
  const { rest } = urlaubRest(d, ich.id);
  const konto = kontoStand(d, ich.id);
  let h = 0;
  for (let k = von; k <= bis; k = plusTage(k, 1)) h += sollFuer(ich, k);
  const winter = [12, 1, 2, 3].includes(ausKey(von).getMonth() + 1);
  const kontoProblem = art === 'konto' && (winter ? konto - h < -50 : konto < 100);
  const bl = einteilungAm(d, ich.id, von);
  return (
    <Seite titel="Frei nehmen" menue="antraege">
      <Zurueck to="/ma/antraege">Anträge</Zurueck>
      <h1 className="h1">Frei nehmen</h1>
      <Auswahl label="Art" optionen={[{ wert: 'urlaub' as AntragArt, text: 'Urlaub' }, { wert: 'konto' as AntragArt, text: 'Vom Konto' }]} wert={art} setWert={setArt} />
      <div className="zwei">
        <div className="feld"><label htmlFor="von">Von</label><input id="von" className="eingabe" type="date" value={von} onChange={(e) => setVon(e.target.value)} /></div>
        <div className="feld"><label htmlFor="bis">Bis</label><input id="bis" className="eingabe" type="date" value={bis} min={von} onChange={(e) => setBis(e.target.value)} /></div>
      </div>
      <section className="karte pad" aria-label="Ergebnis">
        <span className="zahl" style={{ fontSize: 22 }}>{art === 'urlaub' ? `${tage} Urlaubstage` : `${stunden(h)} vom Konto`}</span>
        <span className="unter">{art === 'urlaub' ? `Danach noch ${rest - tage} Tage frei. Wochenenden und Feiertage zählen nicht.` : `Konto jetzt ${stunden(konto)}, danach ${stunden(konto - h)}.`}</span>
      </section>
      {art === 'urlaub' && tage > rest && <div className="hinweis orange">Du hast nur noch {rest} Urlaubstage.</div>}
      {kontoProblem && <div className="hinweis orange">{winter ? 'Im Winter geht Frei vom Konto nur bis −50 h.' : 'Im Sommer geht Frei vom Konto erst ab 100 h auf dem Konto.'} Die Bauleitung entscheidet trotzdem.</div>}
      <p className="text">Geht zuerst an {bl ? `Bauleiter ${voll(person(d, bl.bauleitungId))}` : 'die Bauleitung'}, danach an die Geschäftsleitung.</p>
      <Fueller />
      <Knopf gesperrt={tage === 0} onClick={() => { a.antragStellen({ art, von, bis, tage, stunden: art === 'konto' ? h : undefined }); nav('/ma/antraege'); }}>Antrag senden</Knopf>
    </Seite>
  );
}

/** A3: Krank melden – Polier und Bauleitung sehen nur „abwesend bis“ */
export function Krank() {
  const { d, a } = useIch();
  const nav = useNavigate();
  const [wer, setWer] = useState<'ich' | 'kind'>('ich');
  const [seit, setSeit] = useState(d.heute);
  const [bis, setBis] = useState(werktag(d.heute, 2));
  return (
    <Seite titel="Krank melden" menue="antraege">
      <Zurueck to="/ma/antraege">Anträge</Zurueck>
      <h1 className="h1">Krank melden</h1>
      <Auswahl label="Wer ist krank?" optionen={[{ wert: 'ich' as const, text: 'Ich' }, { wert: 'kind' as const, text: 'Mein Kind' }]} wert={wer} setWert={setWer} />
      <div className="zwei">
        <div className="feld"><label htmlFor="seit">Seit</label><input id="seit" className="eingabe" type="date" value={seit} onChange={(e) => setSeit(e.target.value)} /></div>
        <div className="feld"><label htmlFor="kbis">Voraussichtlich bis</label><input id="kbis" className="eingabe" type="date" value={bis} min={seit} onChange={(e) => setBis(e.target.value)} /></div>
      </div>
      <section className="karte pad" aria-label="Krankschreibung">
        <span className="fett" style={{ fontSize: 16 }}>{wer === 'kind' ? 'Bescheinigung ab dem 1. Tag' : 'Krankschreibung ab dem 4. Tag'}</span>
        <span className="unter">Wenn du eine hast, trag die Daten später hier ein. Die Lohnbuchhaltung ruft sie dann bei der Krankenkasse ab.</span>
      </section>
      <p className="text">Polier und Bauleiter sehen nur „abwesend bis {tm(bis)}“. Einen Grund erfährt niemand.</p>
      <Fueller />
      <Knopf onClick={() => { a.antragStellen({ art: 'krank', wer, von: seit, bis, tage: bis >= seit ? arbeitstage(seit, bis) : 1 }); nav('/ma/antraege'); }}>Krankmeldung senden</Knopf>
    </Seite>
  );
}

/** S1: Mehr */
export function Mehr() {
  const { d, ich, abmelden } = useDaten();
  const ungelesen = d.mitteilungen.filter((m) => m.personId === ich?.id && !m.gelesen).length;
  const nav = useNavigate();
  const gruppen = [
    { titel: 'Auf der Baustelle', punkte: [{ text: 'Kalender', to: '/ma/woche' }, { text: 'Stempeln vergessen melden', to: '/ma/vergessen' }, { text: 'Ausweis eines Kollegen eintragen', to: '/ma/ausweis' }] },
    { titel: 'Für mich', punkte: [{ text: 'Mitteilungen', to: '/ma/mitteilungen', zusatz: ungelesen ? `${ungelesen} neu` : undefined }, { text: 'Betriebsurlaub', to: '/ma/betriebsurlaub' }, { text: 'Arbeitsbefreiung beantragen', to: '/ma/arbeitsbefreiung' }] },
    { titel: 'Hilfe', punkte: [{ text: 'Hilfe', to: '/hilfe' }, { text: 'Häufige Fragen', to: '/faq' }, { text: 'Einführung ansehen', to: '/intro' }, { text: 'Datenschutz', to: '/datenschutz' }] },
    { titel: 'Sicherheit', punkte: [{ text: 'PIN ändern', to: '/ma/pin' }, { text: 'Meine Geräte', to: '/ma/geraete' }] },
  ];
  return (
    <Seite titel="Mehr" menue="mehr">
      <h1 className="h1 gross">Mehr</h1>
      <MehrListe gruppen={gruppen} />
      <Demo abmelden={() => { abmelden(); nav('/'); }} />
    </Seite>
  );
}

export function MehrListe({ gruppen }: { gruppen: { titel: string; punkte: { text: string; to: string; zusatz?: string }[] }[] }) {
  return (
    <>
      {gruppen.map((g) => (
        <section key={g.titel} aria-label={g.titel} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 className="h2">{g.titel}</h2>
          <ul className="liste">
            {g.punkte.map((p) => (
              <li key={p.text}>
                <Link to={p.to} className="zeile" style={{ minHeight: 52 }}>
                  <span style={{ flexGrow: 1, fontSize: 17 }}>{p.text}</span>
                  {p.zusatz && <span className="klein">{p.zusatz}</span>}
                  <Weiter />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/** Demo-Bereich unter „Mehr“: Standort simulieren, Person wechseln */
export function Demo({ abmelden }: { abmelden: () => void }) {
  const { d, ich, a } = useIch();
  return (
    <section aria-label="Demo" className="karte pad" style={{ borderStyle: 'dashed' }}>
      <span className="fett">Nur in der Demo</span>
      {ich.gruppe === 'gewerblich' && (
        <>
          <span className="unter">Nächster Standortvergleich beim Stempeln:</span>
          <Auswahl label="Standort simulieren" klein optionen={[{ wert: 'passt' as const, text: 'passt' }, { wert: 'weicht_ab' as const, text: 'weicht ab' }]} wert={d.demoStandort === 'ohne' ? 'passt' : d.demoStandort} setWert={a.setDemoStandort} />
        </>
      )}
      <Knopf farbe="rahmen" klasse="mittel" onClick={abmelden}>Andere Person wählen</Knopf>
    </section>
  );
}

/** S2: PIN ändern in drei Schritten */
export function Pin() {
  const { ich, a } = useIch();
  const [schritt, setSchritt] = useState(0);
  const [neu, setNeu] = useState('');
  const [fehler, setFehler] = useState('');
  const fragen = ['Deine bisherige PIN', 'Neue PIN', 'Neue PIN wiederholen'];
  if (schritt >= 3) {
    return (
      <Seite titel="PIN geändert" menue="mehr">
        <Fueller />
        <Erledigt titel="PIN geändert"><p className="text" style={{ textAlign: 'center' }}>Ab jetzt öffnest du die App mit der neuen PIN.</p></Erledigt>
        <Fueller />
        <Link to={mehrVon(ich.rolle)} className="knopf blau">Fertig</Link>
      </Seite>
    );
  }
  return (
    <Seite titel="PIN ändern" menue="mehr">
      <Zurueck to={mehrVon(ich.rolle)}>Mehr</Zurueck>
      <PinFeld
        frage={fragen[schritt]}
        unter={<span className="fett klein" style={{ textAlign: 'center' }}>Schritt {schritt + 1} von 3{fehler ? '' : ''}</span>}
        fertig={(pin) => {
          if (schritt === 0 && pin !== ich.pin) return setFehler('Die PIN stimmt nicht.');
          if (schritt === 1 && (pin === ich.pin || /^(\d)\1{3}$/.test(pin) || pin === '1234')) return setFehler('Bitte eine andere PIN wählen, nicht 1234 und keine vier gleichen Ziffern.');
          if (schritt === 2 && pin !== neu) { setSchritt(1); return setFehler('Die beiden neuen PINs sind verschieden. Bitte noch einmal.'); }
          setFehler('');
          if (schritt === 1) setNeu(pin);
          if (schritt === 2) a.pinAendern(ich.id, pin);
          setSchritt(schritt + 1);
        }}
      />
      {fehler && <div role="alert" className="hinweis rot">{fehler}</div>}
    </Seite>
  );
}

/** S3: Meine Geräte – altes Handy abmelden */
export function Geraete() {
  const { d, ich, a } = useIch();
  const nav = useNavigate();
  const meine = d.geraete.filter((g) => g.personId === ich.id);
  const dieses = meine.find((g) => g.diesesHandy);
  const andere = meine.filter((g) => !g.diesesHandy);
  return (
    <Seite titel="Meine Geräte" menue="mehr">
      <Zurueck to={mehrVon(ich.rolle)}>Mehr</Zurueck>
      <h1 className="h1">Meine Geräte</h1>
      {dieses && (
        <section aria-label="Dieses Handy" className="karte pad aktiv-rand">
          <span className="fett klein" style={{ color: 'var(--blau-dunkel)' }}>Dieses Handy</span>
          <span className="fett" style={{ fontSize: 17 }}>{dieses.name}</span>
          <span className="unter">Angemeldet seit {tm(dieses.seit)}</span>
        </section>
      )}
      {andere.map((g) => (
        <section key={g.id} aria-label={g.name} className="karte pad">
          <span className="fett" style={{ fontSize: 17 }}>{g.name}</span>
          <span className="unter">Zuletzt benutzt am {tm(g.zuletzt)}</span>
          {g.aktiv ? (
            <Knopf farbe="rahmen-rot" klasse="mittel" onClick={() => a.geraetAbmelden(g.id)}>Dieses Gerät abmelden</Knopf>
          ) : (
            <div role="status" className="hinweis gruen" style={{ fontSize: 15 }}><strong>Abgemeldet.</strong> Es kann nichts mehr senden. Was dort noch nicht gesendet war, trägt dein Polier nach.</div>
          )}
        </section>
      ))}
      <p className="text">Handy verloren, verkauft oder getauscht? Melde das alte Gerät hier ab. Ohne App-Zugang hilft dir die Lohnbuchhaltung.</p>
      {dieses && (
        <button type="button" className="link" onClick={() => { a.geraetAbmelden(dieses.id); nav('/abgemeldet'); }}>Demo: so sieht ein abgemeldetes Handy aus</button>
      )}
    </Seite>
  );
}

/** S4: Dieses Handy ist abgemeldet (ohne Menü) */
export function Abgemeldet() {
  const { d, ich, abmelden } = useDaten();
  const nav = useNavigate();
  const b = ich ? einteilungAm(d, ich.id, d.heute) : undefined;
  const polier = b?.polierId ? person(d, b.polierId) : undefined;
  return (
    <Seite titel="Abgemeldet" ohneMenue>
      <Fueller />
      <span className="gross-kreis" style={{ background: 'var(--linie)', color: 'var(--text-2)' }} aria-hidden="true"><IHandyWeg /></span>
      <h1 className="h1" style={{ textAlign: 'center' }}>Dieses Handy ist abgemeldet</h1>
      <p role="status" className="text mitte" style={{ fontSize: 17, textAlign: 'center' }}>Es wurde von dir oder von der Lohnbuchhaltung abgemeldet. Von hier kann nichts mehr gesendet werden.</p>
      <section aria-label="Was jetzt?" className="karte pad" style={{ fontSize: 16, lineHeight: 1.4 }}>
        <span><strong>Nicht gesendete Zeiten</strong> von diesem Handy trägt {polier ? `dein Polier ${voll(polier)}` : 'dein Polier'} nach.</span>
        <span><strong>Neues Handy?</strong> Die Lohnbuchhaltung schickt dir eine Einladung per E-Mail.</span>
      </section>
      <Fueller />
      <Knopf onClick={() => { abmelden(); nav('/'); }}>Neu registrieren</Knopf>
      <p className="text" style={{ textAlign: 'center' }}>Geht nur mit dem Link aus der Einladung. In der Demo: zurück zur Personenwahl.</p>
    </Seite>
  );
}

/** Kleine Hilfe, die von anderen Rollen genutzt wird */
export function tageDerWoche(heute: string) {
  const mo = montagDerWoche(heute);
  return [0, 1, 2, 3, 4].map((i) => plusTage(mo, i)).filter(istWerktag);
}
export { rechnung };
