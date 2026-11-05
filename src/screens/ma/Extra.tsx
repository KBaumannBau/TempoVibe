// Handy-Ergänzungen aus Entwurf V1: Mitteilungen, Betriebsurlaub, Arbeitsbefreiung, Nachweis nachreichen,
// Krank-Rückmeldung, Ausweis-Sichtung, Hilfe, Häufige Fragen, Datenschutz, Einführung

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Fueller, Seite, Zurueck, mehrVon, startVon } from '../../components/Rahmen';
import { Auswahl, Erledigt, Knopf } from '../../components/Teile';
import { useDaten, useIch } from '../../domain/store';
import { bsName, einteilungAm, kontoStand, person, urlaubRest, voll } from '../../domain/sel';
import { arbeitstage, plusTage, stunden, tm, tmj, uhr, werktag, wtKurz } from '../../domain/zeit';
import texte from '../../domain/texte.json';

// ------------------------------------------------------------------ Mitteilungen

export function Mitteilungen() {
  const { d, ich, a } = useIch();
  const nav = useNavigate();
  const liste = d.mitteilungen.filter((m) => m.personId === ich.id).sort((x, y) => y.zeit.localeCompare(x.zeit));
  return (
    <Seite titel="Mitteilungen" menue="mehr">
      <Zurueck to={mehrVon(ich.rolle)}>Mehr</Zurueck>
      <h1 className="h1">Mitteilungen</h1>
      <ul className="liste">
        {liste.map((m) => (
          <li key={m.id}>
            <button type="button" className="zeile" style={{ cursor: 'pointer', alignItems: 'flex-start' }} onClick={() => { a.mitteilungGelesen(m.id); if (m.link) nav(m.link); }}>
              <span className="punkt" aria-hidden="true" style={{ background: m.gelesen ? 'transparent' : 'var(--blau)', marginTop: 8 }} />
              <span className="wachs"><span className="fett">{m.titel}</span><span className="klein">{m.text}</span><span className="klein">{m.zeit.slice(0, 10) === d.heute ? 'heute' : tm(m.zeit.slice(0, 10))}, {uhr(m.zeit)}{m.gelesen ? '' : ' · neu'}</span></span>
            </button>
          </li>
        ))}
        {!liste.length && <li className="zeile klein">Keine Mitteilungen.</li>}
      </ul>
      <p className="text">Mitteilungen kommen auch als Nachricht aufs Handy. Der Text darin verrät nichts Persönliches; Einzelheiten stehen nur hier in der App.</p>
    </Seite>
  );
}

// ------------------------------------------------------------------ Betriebsurlaub (Mitarbeiter)

export function BetriebsurlaubWahl() {
  const { d, ich, a } = useIch();
  const bu = d.betriebsurlaub;
  const gew = ich.gruppe === 'gewerblich';
  const alt = bu.wahl[ich.id];
  const [d24, setD24] = useState<'frei' | 'konto' | 'urlaub'>(alt?.d24 ?? 'frei');
  const [d31, setD31] = useState<'frei' | 'konto' | 'urlaub'>(alt?.d31 ?? 'frei');
  const [zust, setZust] = useState<boolean | undefined>(alt?.zustimmung);
  const [fertig, setFertig] = useState(false);
  let n = 0;
  for (let k = bu.von; k <= bu.bis; k = plusTage(k, 1)) if (arbeitstage(k, k) && !['12-24', '12-31'].includes(k.slice(5))) n++;
  const rest = urlaubRest(d, ich.id).rest;
  const konto = kontoStand(d, ich.id);
  const fehlt = Math.max(0, n - rest);
  const restNach = Math.max(0, rest - n);
  const stdTag = 8;
  const abzug = (zust ? fehlt * stdTag : 0) + (d24 === 'konto' ? stdTag : 0) + (d31 === 'konto' ? stdTag : 0);
  const zuWenig = konto - abzug < 50;
  const jahr = bu.von.slice(0, 4);
  const opt = [{ wert: 'frei' as const, text: 'Unbezahlt frei' }, ...(restNach > 0 ? [{ wert: 'urlaub' as const, text: 'Urlaubstag' }] : []), ...(ich.gruppe !== 'azubi' ? [{ wert: 'konto' as const, text: 'Vom Konto' }] : [])];
  if (fertig) return <Seite titel="Betriebsurlaub" menue="antraege"><Erledigt titel="Gespeichert.">Deine Auswahl ist beim Büro. Bis 30.11. kannst du sie noch ändern.</Erledigt><Link to="/ma/antraege" className="knopf blau">Zu den Anträgen</Link></Seite>;
  return (
    <Seite titel="Betriebsurlaub" menue="antraege">
      <Zurueck to="/ma/antraege">Anträge</Zurueck>
      <h1 className="h1">Betriebsurlaub {jahr}/{String(Number(jahr) + 1).slice(2)}</h1>
      <section className="karte pad">
        <span className="zahl" style={{ fontSize: 22 }}>{tm(bu.von)}–{tmj(bu.bis)}</span>
        <span className="unter">{n} Urlaubstage · Feiertage zählen nicht{bu.festgelegt ? ' · verbindlich festgelegt' : ' · noch nicht verbindlich'}</span>
        <span className="unter">Noch frei {jahr}: {rest} Tage · Konto heute {stunden(konto)}</span>
      </section>
      {fehlt === 0
        ? <div className="hinweis gruen"><strong>Dein Urlaub reicht.</strong> Die Tage werden automatisch eingetragen. Danach frei: {restNach} Tage.</div>
        : (
          <section className="karte pad">
            <span className="fett">Dein Urlaub reicht nicht: {fehlt} {fehlt === 1 ? 'Tag fehlt' : 'Tage fehlen'}</span>
            <span className="text">Der Betrieb schlägt vor: Die Stunden kommen von deinem Arbeitszeitkonto. Dann bekommst du für die Tage Lohn. Im Winter müssen mindestens 50 h auf dem Konto bleiben. Das geht nur, wenn du zustimmst.</span>
            <Auswahl label="Zustimmung" optionen={[{ wert: 'ja', text: 'Zustimmen: vom Konto' }, { wert: 'nein', text: 'Nicht zustimmen' }]} wert={zust === undefined ? undefined : zust ? 'ja' : 'nein'} setWert={(w) => setZust(w === 'ja')} />
            {zust === false && <span className="unter">Kein Abzug. Das Büro klärt den Tag mit dir.</span>}
          </section>
        )}
      {gew && (
        <section className="karte pad">
          <span className="fett">Deine Wahl: Heiligabend und Silvester</span>
          <span className="text">Diese Tage sind laut Tarif arbeitsfrei, aber ohne Lohn. Du kannst einen Urlaubstag nehmen oder die Tage vom Arbeitszeitkonto nehmen, dann werden sie bezahlt.</span>
          <span className="unter">{wtKurz(`${jahr}-12-24`)}, 24.12. (Heiligabend)</span>
          <Auswahl label="24.12." klein spalten={3} optionen={opt} wert={d24} setWert={setD24} />
          <span className="unter">{wtKurz(`${jahr}-12-31`)}, 31.12. (Silvester)</span>
          <Auswahl label="31.12." klein spalten={3} optionen={opt} wert={d31} setWert={setD31} />
        </section>
      )}
      {!gew && <p className="text">Für Angestellte und Azubis sind 24.12. und 31.12. arbeitsfrei und bezahlt. Du musst nichts wählen.</p>}
      {abzug > 0 && <div className={`hinweis ${zuWenig ? 'orange' : 'blau'}`}>Konto nach deiner Auswahl: {stunden(konto - abzug)}{zuWenig ? '. Das ist unter 50 h. Bitte weniger vom Konto nehmen.' : ' (mind. 50 h).'}</div>}
      <Fueller />
      <Knopf gesperrt={zuWenig || (fehlt > 0 && zust === undefined)} onClick={() => { a.betriebsurlaubWaehlen(ich.id, { d24, d31, zustimmung: zust }); setFertig(true); }}>Auswahl speichern</Knopf>
      <p className="klein">Ohne Auswahl bleibt es bei „unbezahlt frei“ (Regel laut Tarif).</p>
    </Seite>
  );
}

// ------------------------------------------------------------------ Arbeitsbefreiung

const ANLAESSE = [
  { id: 'heirat', l: 'Eigene Hochzeit / Verpartnerung', tage: 1, p: 'Heiratsurkunde bzw. Urkunde über die Lebenspartnerschaft' },
  { id: 'geburt', l: 'Geburt eines Kindes', tage: 1, p: 'Geburtsurkunde' },
  { id: 'tod', l: 'Todesfall', tage: 2, p: 'Sterbeurkunde' },
  { id: 'krank', l: 'Schwere Erkrankung im Haushalt', tage: 1, p: 'Ärztliche Bescheinigung über die Notwendigkeit (ohne Diagnose)' },
  { id: 'umzug', l: 'Umzug', tage: 2, p: 'Neue Adresse und Meldebestätigung' },
  { id: 'arzt', l: 'Arztbesuch', tage: 1, p: 'Bescheinigung der Praxis mit Datum und Uhrzeit' },
  { id: 'amt', l: 'Behörde oder Gericht', tage: 1, p: 'Vorladung bzw. Bestätigung der Behörde' },
];
export const anlassText = (id?: string) => ANLAESSE.find((x) => x.id === id)?.l ?? id ?? '';

export function Arbeitsbefreiung() {
  const { d, ich, a } = useIch();
  const [anlass, setAnlass] = useState<string>();
  const [von, setVon] = useState(werktag(d.heute, 5));
  const [bis, setBis] = useState(werktag(d.heute, 5));
  const [foto, setFoto] = useState(false);
  const [fertig, setFertig] = useState(false);
  const x = ANLAESSE.find((y) => y.id === anlass);
  const n = bis >= von ? arbeitstage(von, bis) : 0;
  const fehler = bis < von ? '„Bis“ liegt vor „Von“.' : n === 0 ? 'Im Zeitraum liegt kein Arbeitstag.' : x && n > x.tage ? `Für diesen Anlass gibt es höchstens ${x.tage} Arbeitstag${x.tage > 1 ? 'e' : ''}. Im Zeitraum liegen ${n}. Für die übrigen Tage bitte Urlaub beantragen.` : '';
  const bl = einteilungAm(d, ich.id, von);
  if (fertig) return (
    <Seite titel="Antrag gesendet" menue="antraege">
      <Erledigt titel="Antrag gesendet.">Zuerst prüft der Bauleiter (er sieht nur Anlass und Tage), dann das Büro. Du bekommst eine Nachricht.{!foto && ' Den Nachweis reichst du später nach, die App erinnert dich.'}</Erledigt>
      <Link to="/ma/antraege" className="knopf blau">Zu den Anträgen</Link>
    </Seite>
  );
  return (
    <Seite titel="Arbeitsbefreiung" menue="antraege">
      <Zurueck to="/ma/antraege">Anträge</Zurueck>
      <h1 className="h1">Arbeitsbefreiung</h1>
      <p className="unter">Bezahlte Freistellung laut Tarifvertrag (Sozialtag)</p>
      <span className="fett">Anlass wählen</span>
      <ul className="liste">{ANLAESSE.map((y) => <li key={y.id}><button type="button" className="zeile" aria-pressed={anlass === y.id} style={{ cursor: 'pointer', background: anlass === y.id ? 'var(--blau-hell)' : undefined }} onClick={() => setAnlass(y.id)}><span className="wachs"><span className="fett">{y.l}</span><span className="klein">{y.id === 'arzt' ? 'nach Bedarf, stundenweise' : `${y.tage} Arbeitstag${y.tage > 1 ? 'e' : ''}`}</span></span></button></li>)}</ul>
      {x && (
        <>
          <div className="zwei">
            <div className="feld"><label htmlFor="abv">Von</label><input id="abv" className="eingabe" type="date" value={von} onChange={(e) => setVon(e.target.value)} /></div>
            <div className="feld"><label htmlFor="abb">Bis</label><input id="abb" className="eingabe" type="date" value={bis} onChange={(e) => setBis(e.target.value)} /></div>
          </div>
          {fehler ? <div className="hinweis orange">{fehler}</div> : <span className="unter">{n} Arbeitstag{n > 1 ? 'e' : ''} im Zeitraum</span>}
          <section className="karte pad">
            <span className="fett">Nachweis nötig: {x.p}</span>
            <span className="text">Du kannst den Antrag auch ohne Nachweis senden. Nach dem Anlass erinnert dich die App. Frist: 14 Tage nach dem Anlass, danach noch 7 Tage Nachfrist.</span>
            <Knopf farbe="rahmen" klasse="mittel" onClick={() => setFoto(true)}>{foto ? 'Nachweis hinzugefügt ✓' : 'Nachweis jetzt fotografieren (oder später)'}</Knopf>
            <span className="klein">{x.id === 'arzt' || x.id === 'krank' ? 'Die Bescheinigung braucht keine Diagnose. Steht doch eine darauf, darfst du sie abdecken.' : 'Angaben, die für den Anlass nicht nötig sind, darfst du abdecken.'} Der Bauleiter sieht nur Anlass und Tage. Den Nachweis sieht nur das Büro.</span>
          </section>
          <p className="text">Genehmigung: {bl ? `Bauleiter ${voll(person(d, bl.bauleitungId))}` : 'Bauleiter'} → Büro. Die Genehmigung gilt zunächst unter Vorbehalt. Endgültig wird sie, sobald der Nachweis geprüft ist.</p>
        </>
      )}
      <Fueller />
      <Knopf gesperrt={!x || !!fehler} onClick={() => { a.antragStellen({ art: 'arbeitsbefreiung', anlass, von, bis, tage: n, nachweis: foto ? 'hochgeladen' : 'fehlt', quelle: 'app' }); setFertig(true); }}>Antrag senden</Knopf>
      <p className="klein">Wird als Sozialtag (Kürzel S) an die Lohnbuchhaltung übergeben.</p>
    </Seite>
  );
}

// ------------------------------------------------------------------ Nachweis nachreichen

export function NachweisNachreichen() {
  const { id } = useParams();
  const { d, ich, a } = useIch();
  const [foto, setFoto] = useState(false);
  const antrag = d.antraege.find((x) => x.id === id && x.personId === ich.id);
  if (!antrag) return <Seite titel="Nachweis" menue="antraege"><Zurueck to="/ma/antraege">Anträge</Zurueck><p className="text">Diesen Antrag gibt es nicht.</p></Seite>;
  const frist = plusTage(antrag.bis, 14);
  const nachfrist = plusTage(frist, 7);
  const stand = d.heute <= frist ? 'Erinnerung' : d.heute <= nachfrist ? 'Nachfrist' : 'Abgelaufen';
  const x = ANLAESSE.find((y) => y.id === antrag.anlass);
  const rest = urlaubRest(d, ich.id).rest;
  return (
    <Seite titel="Nachweis nachreichen" menue="antraege">
      <Zurueck to="/ma/antraege">Anträge</Zurueck>
      <h1 className="h1">Nachweis nachreichen</h1>
      <section className="karte pad">
        <span className="fett">{anlassText(antrag.anlass)} · {tm(antrag.von)}{antrag.bis !== antrag.von ? `–${tm(antrag.bis)}` : ''} · {antrag.tage} {antrag.tage === 1 ? 'Tag' : 'Tage'}</span>
        <span className="unter">Genehmigt unter Vorbehalt: Bauleiter und Büro</span>
        <span className="unter">Frist {tmj(frist)} · Nachfrist bis {tmj(nachfrist)} · Stand: {stand}</span>
      </section>
      {antrag.nachweis === 'fehlt' ? (
        <>
          <div className={`hinweis ${stand === 'Erinnerung' ? 'blau' : 'orange'}`}><strong>{stand === 'Abgelaufen' ? `Die Nachfrist ist am ${tmj(nachfrist)} abgelaufen. Der Nachweis fehlt.` : stand === 'Nachfrist' ? 'Nachfrist läuft: Ein Nachweis fehlt noch.' : 'Ein Nachweis fehlt noch.'}</strong> Nötig: {x?.p}</div>
          <Knopf farbe="rahmen" klasse="mittel" onClick={() => setFoto(true)}>{foto ? 'Foto hinzugefügt ✓' : 'Nachweis fotografieren'}</Knopf>
          <span className="klein">Den Nachweis sieht nur das Büro. Der Bauleiter sieht nur Anlass und Tage.</span>
          <Knopf gesperrt={!foto} onClick={() => a.nachweisHochladen(antrag.id)}>Nachweis senden</Knopf>
          {stand !== 'Erinnerung' && (
            <section className="karte pad">
              <span className="fett">Falls du keinen Nachweis hast</span>
              <span className="text">Wie sollen die {antrag.tage} {antrag.tage === 1 ? 'Tag' : 'Tage'} gebucht werden? Wählst du nicht, buchen wir die Zeit vorläufig als unbezahlt. Reichst du den Nachweis nach, wird das korrigiert.</span>
              <Auswahl label="Ersatz" spalten={1} optionen={[{ wert: 'urlaub' as const, text: `Als Urlaubstag (du hast noch ${rest} frei)` }, { wert: 'unbezahlt' as const, text: 'Unbezahlt frei' }]} wert={antrag.ersatz === 'konto' ? undefined : antrag.ersatz} setWert={(w) => a.ersatzWaehlen(antrag.id, w)} />
              {antrag.ersatz && <span className="unter">Gespeichert: {antrag.ersatz === 'urlaub' ? 'Gebucht als Urlaub' : 'Gebucht als unbezahlt frei'}. Das Büro ist informiert.</span>}
            </section>
          )}
        </>
      ) : <div className="hinweis gruen"><strong>{antrag.nachweis === 'gesehen' ? 'Nachweis geprüft.' : 'Nachweis wird geprüft.'}</strong> {antrag.nachweis === 'gesehen' ? 'Die Arbeitsbefreiung ist endgültig genehmigt.' : 'Endgültig genehmigt, sobald das Büro den Nachweis geprüft hat.'}</div>}
      <Fueller />
      <p className="klein">An offene Nachweise erinnert die App, bis sie hochgeladen sind.</p>
    </Seite>
  );
}

// ------------------------------------------------------------------ Krank: Rückmeldung vor dem Ende

export function KrankRueckmeldung() {
  const { id } = useParams();
  const { d, ich, a } = useIch();
  const k = d.antraege.find((x) => x.id === id && x.personId === ich.id);
  const [wahl, setWahl] = useState<'wie' | 'laenger' | 'frueh'>();
  const [neuBis, setNeuBis] = useState(k ? werktag(k.bis, 5) : d.heute);
  const [frueh, setFrueh] = useState(plusTage(d.heute, 1));
  const [fertig, setFertig] = useState('');
  if (!k) return <Seite titel="Krankmeldung" menue="antraege"><Zurueck to="/ma/antraege">Anträge</Zurueck><p className="text">Keine Krankmeldung gefunden.</p></Seite>;
  const zurueck = werktag(k.bis, 1);
  const bl = einteilungAm(d, ich.id, k.von);
  const wer = bl ? `Polier ${bl.polierId ? voll(person(d, bl.polierId)) : ''} und Bauleiter ${voll(person(d, bl.bauleitungId))}` : 'Polier und Bauleiter';
  if (fertig) return <Seite titel="Antwort gesendet" menue="antraege"><Erledigt titel="Antwort gesendet">{fertig} {wer} sind informiert.</Erledigt><Link to="/ma/antraege" className="knopf blau">Zu den Anträgen</Link></Seite>;
  return (
    <Seite titel="Meine Krankmeldung" menue="antraege">
      <Zurueck to="/ma/antraege">Anträge</Zurueck>
      <h1 className="h1">Meine Krankmeldung</h1>
      <section className="karte pad"><span className="fett">Krankgeschrieben {tm(k.von)}–{tmj(k.bis)}</span><span className="unter">Bitte antworten bis {wtKurz(k.bis)}, {tmj(k.bis)}</span></section>
      <span className="fett">Wie geht es weiter?</span>
      <Auswahl label="Wie geht es weiter?" spalten={1} optionen={[{ wert: 'wie' as const, text: `Ich komme wie geplant wieder (${tm(zurueck)})` }, { wert: 'laenger' as const, text: 'Krankschreibung wurde verlängert' }, { wert: 'frueh' as const, text: 'Ich bin früher gesund' }]} wert={wahl} setWert={setWahl} />
      {wahl === 'laenger' && <div className="feld"><label htmlFor="nb">Neu bis (Folgebescheinigung)</label><input id="nb" className="eingabe" type="date" min={plusTage(k.bis, 1)} value={neuBis} onChange={(e) => setNeuBis(e.target.value)} /><span className="klein">„Neu ab“ ist der {tm(plusTage(k.bis, 1))} (Tag nach dem alten Ende).</span></div>}
      {wahl === 'frueh' && <div className="feld"><label htmlFor="fr">Ich komme wieder am</label><input id="fr" className="eingabe" type="date" min={plusTage(d.heute, 1)} max={k.bis} value={frueh} onChange={(e) => setFrueh(e.target.value)} /></div>}
      <Fueller />
      <Knopf gesperrt={!wahl || (wahl === 'laenger' && neuBis <= k.bis)} onClick={() => {
        if (wahl === 'laenger') { a.krankRueckmeldung(k.id, 'weiter', neuBis); setFertig(`Neue Krankschreibung bis ${tmj(neuBis)}. Wir rufen sie bei deiner Krankenkasse ab.`); }
        else { a.krankRueckmeldung(k.id, 'gesund'); setFertig(wahl === 'frueh' ? `Du kommst früher wieder, am ${tmj(frueh)}.` : `Du kommst wie geplant wieder, am ${tmj(zurueck)}.`); }
      }}>Antwort senden</Knopf>
      <p className="klein">Ohne Antwort bekommen Polier und Bauleiter automatisch den Hinweis „keine Rückmeldung“.</p>
    </Seite>
  );
}

// ------------------------------------------------------------------ Ausweis-Sichtung (Polier oder Mitarbeiter)

export function AusweisSichtung() {
  const { d, ich, a } = useIch();
  const bs = einteilungAm(d, ich.id, d.heute) ?? d.baustellen.find((b) => b.polierId === ich.id);
  const leute = d.personen.filter((p) => p.rolle === 'nu' && d.einteilung.some((e) => e.personId === p.id && e.datum === d.heute && (!bs || e.baustelleId === bs.id)));
  const [pid, setPid] = useState<string>();
  const [art, setArt] = useState('Personalausweis');
  const [bis, setBis] = useState('');
  const [staat, setStaat] = useState('');
  const [ok, setOk] = useState(false);
  const [fertig, setFertig] = useState<string>();
  const p = leute.find((x) => x.id === pid);
  const abgelaufen = !!bis && bis < d.heute;
  return (
    <Seite titel="Ausweis eintragen" menue="mehr">
      <Zurueck to={mehrVon(ich.rolle)}>Mehr</Zurueck>
      <h1 className="h1">Ausweis eintragen</h1>
      <p className="text">Lass dir den Ausweis im Original zeigen. Trag nur die Daten unten ein. Es wird kein Foto, keine Kopie und keine Ausweisnummer gespeichert.</p>
      {fertig ? <><Erledigt titel="Gespeichert">{fertig}</Erledigt><Knopf farbe="rahmen" onClick={() => { setFertig(undefined); setPid(undefined); setOk(false); setBis(''); }}>Weitere Person</Knopf></> : <>
        <span className="fett">1. Person wählen</span>
        <span className="klein">Nachunternehmer, die heute eingeteilt sind{bs ? ` auf ${bsName(bs)}` : ''}:</span>
        <ul className="liste">{leute.map((x) => { const bald = x.ausweis && x.ausweis.bis < plusTage(d.heute, 30); return <li key={x.id}><button type="button" className="zeile" aria-pressed={pid === x.id} style={{ cursor: 'pointer', background: pid === x.id ? 'var(--blau-hell)' : undefined }} onClick={() => { setPid(x.id); setStaat(x.ausweis?.staat ?? ''); }}><span className="wachs"><span className="fett">{voll(x)}</span><span className="klein">{!x.ausweis ? 'noch nicht gesehen' : bald ? 'läuft bald ab' : `gesehen ${tm(x.ausweis.am)}`}</span></span></button></li>; })}
          {!leute.length && <li className="zeile klein">Heute ist hier niemand eingeteilt, dessen Ausweis du eintragen kannst.</li>}</ul>
        {p && <>
          <span className="fett">2. Ausweisdaten von {voll(p)}</span>
          <Auswahl label="Art des Ausweises" spalten={1} klein optionen={['Personalausweis', 'Reisepass', 'Aufenthaltstitel'].map((x) => ({ wert: x, text: x }))} wert={art} setWert={setArt} />
          <div className="feld"><label htmlFor="ab">Gültig bis</label><input id="ab" className="eingabe" type="date" value={bis} onChange={(e) => setBis(e.target.value)} /></div>
          {abgelaufen && <div className="hinweis rot">Dieser Ausweis ist abgelaufen. Bitte die Verwaltung anrufen.</div>}
          <div className="feld"><label htmlFor="st">Staatsangehörigkeit</label><input id="st" className="eingabe" placeholder="z. B. kroatisch" value={staat} onChange={(e) => setStaat(e.target.value)} /><span className="klein">Nur damit die Verwaltung weiß, welche Unterlagen nötig sind.</span></div>
          <label className="check" style={{ fontSize: 16 }}><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> Ich habe den Ausweis im Original gesehen. Das Foto passt zur Person.</label>
          <Knopf gesperrt={!ok || !bis || !staat.trim() || abgelaufen} onClick={() => { a.ausweisEintragen(p.id, art, bis, staat.trim()); setFertig(`Ausweis von ${voll(p)} gesehen am ${tmj(d.heute)} von ${voll(ich)}. Die Ausweisdaten sieht ab jetzt nur noch die Verwaltung.`); }}>Ausweis gesehen – speichern</Knopf>
        </>}
      </>}
      <section className="karte pad"><span className="fett">Gut zu wissen</span><span className="klein">Bitte kein Foto vom Ausweis machen, auch nicht mit dem eigenen Handy. Hat jemand keinen Ausweis dabei: nicht eintragen und den Polier oder die Verwaltung informieren.</span></section>
    </Seite>
  );
}

// ------------------------------------------------------------------ Hilfe, Häufige Fragen, Datenschutz

function zurueckZiel(rolle?: string) {
  return rolle ? mehrVon(rolle as Parameters<typeof mehrVon>[0]) : '/';
}

export function Hilfe() {
  const { ich } = useDaten();
  const [suche, setSuche] = useState('');
  const q = suche.trim().toLowerCase();
  const liste = texte.hilfe.filter((h) => !q || `${h.t} ${h.p.join(' ')} ${h.k}`.toLowerCase().includes(q));
  return (
    <Seite titel="Hilfe" menue="mehr">
      <Zurueck to={zurueckZiel(ich?.rolle)}>{ich ? 'Mehr' : 'Anmeldung'}</Zurueck>
      <h1 className="h1">Hilfe</h1>
      <div className="feld"><label htmlFor="hs">Suchen</label><input id="hs" className="eingabe" type="search" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="z. B. PIN, Pause, Urlaub" /></div>
      <div className="pk-reihe"><Link className="link" to="/faq">Häufige Fragen</Link><Link className="link" to="/intro">Einführung ansehen</Link><Link className="link" to="/datenschutz">Datenschutz</Link></div>
      {liste.map((h) => (
        <details key={h.id} className="faq"><summary>{h.t}</summary>{h.p.map((x, i) => <p key={i} className="text">{x}</p>)}</details>
      ))}
      {!liste.length && <p className="text">Nichts gefunden. Frag deinen Polier oder ruf im Büro an.</p>}
    </Seite>
  );
}

export function Faq() {
  const { ich } = useDaten();
  return (
    <Seite titel="Häufige Fragen" menue="mehr">
      <Zurueck to={zurueckZiel(ich?.rolle)}>{ich ? 'Mehr' : 'Anmeldung'}</Zurueck>
      <h1 className="h1">Häufige Fragen</h1>
      {texte.faq.map((f, i) => <details key={i} className="faq"><summary>{f.q}</summary><p className="text">{f.a}</p></details>)}
      <div className="pk-reihe"><Link className="link" to="/hilfe">Zur Hilfe</Link><Link className="link" to="/intro">Einführung ansehen</Link></div>
    </Seite>
  );
}

export function Datenschutz() {
  const { ich } = useDaten();
  const [alle, setAlle] = useState(false);
  const ds = texte.datenschutz;
  return (
    <Seite titel="Datenschutzhinweise" menue="mehr">
      <Zurueck to={zurueckZiel(ich?.rolle)}>{ich ? 'Mehr' : 'Anmeldung'}</Zurueck>
      <span className="pill vor" style={{ alignSelf: 'flex-start' }}>{ds.entwurf}</span>
      <h1 className="h1">Datenschutzhinweise</h1>
      <p className="text">{ds.intro}</p>
      <button type="button" className="link" onClick={() => setAlle(!alle)}>{alle ? 'Alle schließen' : 'Alle öffnen'}</button>
      {ds.abschnitte.map((s) => (
        <details key={s.t + String(alle)} className="faq" open={alle}><summary>{s.t}</summary>
          {s.p.map((x, i) => <p key={i} className="text">{'t' in x && x.t ? <strong>{x.t} </strong> : null}{x.x}</p>)}
        </details>
      ))}
    </Seite>
  );
}

// ------------------------------------------------------------------ Einführung

const INTRO_MA = [
  ['Willkommen', 'Mit dieser App schreibst du deine Arbeitszeit auf. Wir zeigen dir kurz, wie es geht.'],
  ['Anmelden mit PIN', 'Du bekommst eine Einladung per E-Mail. Tippe auf den Link, gib deine E-Mail-Adresse ein und dann den Code aus der E-Mail. Lege dann eine PIN mit 4 Ziffern fest.'],
  ['Arbeitsbeginn und Arbeitsende tippen', 'Tippe morgens auf „Arbeitsbeginn“ und abends auf „Arbeitsende“. Die App schlägt deine Baustelle vor. Stimmt sie nicht, tippe auf „Andere Baustelle wählen“.'],
  ['Pause und Baustellenwechsel', 'Tippe auf „Pause“, wenn deine Pause beginnt, und danach auf „Weiter arbeiten“. Fährst du zu einer anderen Baustelle, tippe bei der Abfahrt auf „Baustelle wechseln“.'],
  ['Dein Standort', 'Die App vergleicht deinen Standort nur in dem Moment, in dem du tippst. Die genaue Position wird nicht gespeichert. Gespeichert wird nur: „passt“ oder „weicht ab“.'],
  ['Tag prüfen und absenden', 'Am Abend prüfst du deinen Tag und wählst Zuschläge, wenn welche angefallen sind. Mit dem Senden an deinen Polier bestätigst du, dass Beginn, Ende und Pausen stimmen.'],
  ['Dein Polier prüft', 'Dein Polier prüft den Tag und gibt ihn frei. Ändert er etwas, siehst du die Korrektur und kannst widersprechen.'],
  ['Kalender und Arbeitszeitkonto', 'Im Kalender siehst du deine Tage. Unter „Konto“ siehst du dein Arbeitszeitkonto.'],
  ['Urlaub und Krank', 'Urlaub beantragst du unter „Anträge“. Bist du krank, melde dich unter „Krank melden“. Eine Diagnose gibst du nicht an.'],
  ['Hilfe und Sprache', 'Hilfe, häufige Fragen und Sprache findest du jederzeit oben rechts. Dort kannst du auch diese Einführung noch einmal ansehen.'],
];
const INTRO_NU = [
  ['Willkommen', 'Mit dieser App schreibst du deine Arbeitszeit auf den Baustellen von K. Baumann auf. Wir zeigen dir kurz, wie es geht.'],
  ['Start, Pause und Arbeitsende tippen', 'Tippe auf „Start“, wenn du auf der Baustelle bist. Tippe auf „Pause“ und am Ende auf „Arbeitsende“. Dein Standort wird nur beim Tippen verglichen; die genaue Position wird nicht gespeichert.'],
  ['Tag an den Polier senden', 'Nach dem Arbeitsende tippst du auf „Tag an Polier senden“. Der Polier prüft deine Stunden und gibt sie frei. Ändert er etwas, siehst du es unter „Meine Stunden“ und kannst widersprechen.'],
  ['Nachweise', 'Unter „Nachweise“ siehst du deine Unterlagen. Fehlt etwas, lädst du ein Foto hoch. Deinen Ausweis zeigst du beim Polier oder im Büro. Davon wird keine Kopie gespeichert.'],
  ['Mindestlohn: unterschreiben', 'Einmal im Monat liest du in der App eine kurze Erklärung zum Mindestlohn. Du unterschreibst mit dem Finger auf dem Handy. Die Unterschrift geht nur an die Verwaltung von K. Baumann, nicht an deine Firma.'],
];

export function Intro() {
  const { ich, a } = useDaten();
  const nav = useNavigate();
  const [wer, setWer] = useState<'ma' | 'nu'>(ich?.rolle === 'nu' ? 'nu' : 'ma');
  const [i, setI] = useState(0);
  const schritte = wer === 'nu' ? INTRO_NU : INTRO_MA;
  const ende = () => { if (ich) { a.introGesehen(ich.id); nav(startVon(ich.rolle)); } else nav('/'); };
  return (
    <Seite titel="Einführung" ohneMenue>
      {!ich && <Auswahl label="Beispiel ansehen" klein optionen={[{ wert: 'ma' as const, text: 'Mitarbeiter' }, { wert: 'nu' as const, text: 'Nachunternehmer-Person' }]} wert={wer} setWert={(w) => { setWer(w); setI(0); }} />}
      <span className="unter">Schritt {i + 1} von {schritte.length}</span>
      <div className="fortschritt" aria-hidden="true" style={{ height: 6, background: 'var(--linie)', borderRadius: 3 }}><span style={{ display: 'block', height: 6, width: `${((i + 1) / schritte.length) * 100}%`, background: 'var(--blau)', borderRadius: 3 }} /></div>
      <h1 className="h1 gross">{schritte[i][0]}</h1>
      <p className="text" style={{ fontSize: 18 }}>{schritte[i][1]}</p>
      <Fueller />
      <div className="zwei">
        {i > 0 ? <Knopf farbe="rahmen" onClick={() => setI(i - 1)}>Zurück</Knopf> : <Knopf farbe="rahmen" onClick={ende}>Überspringen</Knopf>}
        {i < schritte.length - 1 ? <Knopf onClick={() => setI(i + 1)}>Weiter</Knopf> : <Knopf farbe="gruen" onClick={ende}>Los geht's</Knopf>}
      </div>
      <Link className="link" to="/hilfe">Mehr dazu in der Hilfe</Link>
    </Seite>
  );
}

