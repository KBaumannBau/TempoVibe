// Handy-Ergänzungen aus Entwurf V1: Mitteilungen, Betriebsurlaub, Arbeitsbefreiung, Nachweis nachreichen,
// Krank-Rückmeldung, Ausweis-Sichtung, Hilfe, Häufige Fragen, Datenschutz, Einführung

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Fueller, Seite, Zurueck, mehrVon, startVon } from '../../components/Rahmen';
import { Auswahl, Erledigt, Knopf } from '../../components/Teile';
import { useDaten, useIch } from '../../domain/store';
import { bsName, einteilungAm, kontoStand, person, urlaubRest, voll } from '../../domain/sel';
import { arbeitstage, plusTage, stunden, tm, tmj, uhr, werktag, wtKurz } from '../../domain/zeit';
import tDe from '../../domain/texte/de.json';
import tPl from '../../domain/texte/pl.json';
import tRo from '../../domain/texte/ro.json';
import tHr from '../../domain/texte/hr.json';
import tEn from '../../domain/texte/en.json';
import tFr from '../../domain/texte/fr.json';
import tIt from '../../domain/texte/it.json';
import { sprache, tx } from '../../i18n';

/** Hilfe, häufige Fragen und Datenschutz aus dem Entwurf V1, je Sprache */
const texte = { de: tDe, pl: tPl, ro: tRo, hr: tHr, en: tEn, fr: tFr, it: tIt }[sprache];

// ------------------------------------------------------------------ Mitteilungen

export function Mitteilungen() {
  const { d, ich, a } = useIch();
  const nav = useNavigate();
  const liste = d.mitteilungen.filter((m) => m.personId === ich.id).sort((x, y) => y.zeit.localeCompare(x.zeit));
  return (
    <Seite titel={tx("Mitteilungen")} menue="mehr">
      <Zurueck to={mehrVon(ich.rolle)}>{tx("Mehr")}</Zurueck>
      <h1 className="h1">{tx("Mitteilungen")}</h1>
      <ul className="liste">
        {liste.map((m) => (
          <li key={m.id}>
            <button type="button" className="zeile" style={{ cursor: 'pointer', alignItems: 'flex-start' }} onClick={() => { a.mitteilungGelesen(m.id); if (m.link) nav(m.link); }}>
              <span className="punkt" aria-hidden="true" style={{ background: m.gelesen ? 'transparent' : 'var(--blau)', marginTop: 8 }} />
              <span className="wachs"><span className="fett">{tx(m.titel)}</span><span className="klein">{tx(m.text)}</span><span className="klein">{m.zeit.slice(0, 10) === d.heute ? tx('heute') : tm(m.zeit.slice(0, 10))}, {uhr(m.zeit)}{m.gelesen ? '' : tx(" · neu")}</span></span>
            </button>
          </li>
        ))}
        {!liste.length && <li className="zeile klein">{tx("Keine Mitteilungen.")}</li>}
      </ul>
      <p className="text">{tx("Mitteilungen kommen auch als Nachricht aufs Handy. Der Text darin verrät nichts Persönliches; Einzelheiten stehen nur hier in der App.")}</p>
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
  const opt = [{ wert: 'frei' as const, text: tx("Unbezahlt frei") }, ...(restNach > 0 ? [{ wert: 'urlaub' as const, text: tx("Urlaubstag") }] : []), ...(ich.gruppe !== 'azubi' ? [{ wert: 'konto' as const, text: tx("Vom Konto") }] : [])];
  if (fertig) return <Seite titel={tx("Betriebsurlaub")} menue="antraege"><Erledigt titel={tx("Gespeichert.")}>{tx("Deine Auswahl ist beim Büro. Bis 30.11. kannst du sie noch ändern.")}</Erledigt><Link to="/ma/antraege" className="knopf blau">{tx("Zu den Anträgen")}</Link></Seite>;
  return (
    <Seite titel={tx("Betriebsurlaub")} menue="antraege">
      <Zurueck to="/ma/antraege">{tx("Anträge")}</Zurueck>
      <h1 className="h1">{tx("Betriebsurlaub {0}/{1}", jahr, String(Number(jahr) + 1).slice(2))}</h1>
      <section className="karte pad">
        <span className="zahl" style={{ fontSize: 22 }}>{tm(bu.von)}–{tmj(bu.bis)}</span>
        <span className="unter">{n} {' '}{tx("Urlaubstage · Feiertage zählen nicht")}{bu.festgelegt ? tx(" · verbindlich festgelegt") : tx(" · noch nicht verbindlich")}</span>
        <span className="unter">{tx("Noch frei {0}: {1} Tage · Konto heute {2}", jahr, rest, stunden(konto))}</span>
      </section>
      {fehlt === 0
        ? <div className="hinweis gruen"><strong>{tx("Dein Urlaub reicht.")}</strong> {' '}{tx("Die Tage werden automatisch eingetragen. Danach frei:")}{' '}{restNach} {' '}{tx("Tage.")}</div>
        : (
          <section className="karte pad">
            <span className="fett">{tx("Dein Urlaub reicht nicht:")}{' '}{fehlt} {fehlt === 1 ? tx("Tag fehlt") : tx("Tage fehlen")}</span>
            <span className="text">{tx("Der Betrieb schlägt vor: Die Stunden kommen von deinem Arbeitszeitkonto. Dann bekommst du für die Tage Lohn. Im Winter müssen mindestens 50 h auf dem Konto bleiben. Das geht nur, wenn du zustimmst.")}</span>
            <Auswahl label={tx("Zustimmung")} optionen={[{ wert: 'ja', text: tx("Zustimmen: vom Konto") }, { wert: 'nein', text: tx("Nicht zustimmen") }]} wert={zust === undefined ? undefined : zust ? 'ja' : 'nein'} setWert={(w) => setZust(w === 'ja')} />
            {zust === false && <span className="unter">{tx("Kein Abzug. Das Büro klärt den Tag mit dir.")}</span>}
          </section>
        )}
      {gew && (
        <section className="karte pad">
          <span className="fett">{tx("Deine Wahl: Heiligabend und Silvester")}</span>
          <span className="text">{tx("Diese Tage sind laut Tarif arbeitsfrei, aber ohne Lohn. Du kannst einen Urlaubstag nehmen oder die Tage vom Arbeitszeitkonto nehmen, dann werden sie bezahlt.")}</span>
          <span className="unter">{wtKurz(`${jahr}-12-24`)}{tx(", 24.12. (Heiligabend)")}</span>
          <Auswahl label="24.12." klein spalten={3} optionen={opt} wert={d24} setWert={setD24} />
          <span className="unter">{wtKurz(`${jahr}-12-31`)}{tx(", 31.12. (Silvester)")}</span>
          <Auswahl label="31.12." klein spalten={3} optionen={opt} wert={d31} setWert={setD31} />
        </section>
      )}
      {!gew && <p className="text">{tx("Für Angestellte und Azubis sind 24.12. und 31.12. arbeitsfrei und bezahlt. Du musst nichts wählen.")}</p>}
      {abzug > 0 && <div className={`hinweis ${zuWenig ? 'orange' : 'blau'}`}>{tx("Konto nach deiner Auswahl:")}{' '}{stunden(konto - abzug)}{zuWenig ? '. Das ist unter 50 h. Bitte weniger vom Konto nehmen.' : tx(" (mind. 50 h).")}</div>}
      <Fueller />
      <Knopf gesperrt={zuWenig || (fehlt > 0 && zust === undefined)} onClick={() => { a.betriebsurlaubWaehlen(ich.id, { d24, d31, zustimmung: zust }); setFertig(true); }}>{tx("Auswahl speichern")}</Knopf>
      <p className="klein">{tx("Ohne Auswahl bleibt es bei „unbezahlt frei“ (Regel laut Tarif).")}</p>
    </Seite>
  );
}

// ------------------------------------------------------------------ Arbeitsbefreiung

const ANLAESSE = [
  { id: 'heirat', l: tx("Eigene Hochzeit / Verpartnerung"), tage: 1, p: tx("Heiratsurkunde bzw. Urkunde über die Lebenspartnerschaft") },
  { id: 'geburt', l: tx("Geburt eines Kindes"), tage: 1, p: tx("Geburtsurkunde") },
  { id: 'tod', l: tx("Todesfall"), tage: 2, p: tx("Sterbeurkunde") },
  { id: 'krank', l: tx("Schwere Erkrankung im Haushalt"), tage: 1, p: tx("Ärztliche Bescheinigung über die Notwendigkeit (ohne Diagnose)") },
  { id: 'umzug', l: tx("Umzug"), tage: 2, p: tx("Neue Adresse und Meldebestätigung") },
  { id: 'arzt', l: tx("Arztbesuch"), tage: 1, p: tx("Bescheinigung der Praxis mit Datum und Uhrzeit") },
  { id: 'amt', l: tx("Behörde oder Gericht"), tage: 1, p: tx("Vorladung bzw. Bestätigung der Behörde") },
];
export const anlassText = (id?: string) => ANLAESSE.find((x) => x.id === id)?.l ?? id ?? '';

export function Arbeitsbefreiung() {
  const { d, a } = useIch();
  const [anlass, setAnlass] = useState<string>();
  const [von, setVon] = useState(werktag(d.heute, 5));
  const [bis, setBis] = useState(werktag(d.heute, 5));
  const [foto, setFoto] = useState(false);
  const [fertig, setFertig] = useState(false);
  const x = ANLAESSE.find((y) => y.id === anlass);
  const n = bis >= von ? arbeitstage(von, bis) : 0;
  const fehler = bis < von ? tx("„Bis“ liegt vor „Von“.") : n === 0 ? tx("Im Zeitraum liegt kein Arbeitstag.") : x && n > x.tage ? tx(x.tage > 1 ? "Für diesen Anlass gibt es höchstens {0} Arbeitstage. Im Zeitraum liegen {1}. Für die übrigen Tage bitte Urlaub beantragen." : "Für diesen Anlass gibt es höchstens {0} Arbeitstag. Im Zeitraum liegen {1}. Für die übrigen Tage bitte Urlaub beantragen.", x.tage, n) : '';
  if (fertig) return (
    <Seite titel={tx("Antrag gesendet")} menue="antraege">
      <Erledigt titel={tx("Antrag gesendet.")}>{tx("Zuerst prüft die Oberbauleitung (sie sieht nur Anlass und Tage), dann das Büro. Du bekommst eine Nachricht.")}{!foto && tx(" Den Nachweis reichst du später nach, die App erinnert dich.")}</Erledigt>
      <Link to="/ma/antraege" className="knopf blau">{tx("Zu den Anträgen")}</Link>
    </Seite>
  );
  return (
    <Seite titel={tx("Arbeitsbefreiung")} menue="antraege">
      <Zurueck to="/ma/antraege">{tx("Anträge")}</Zurueck>
      <h1 className="h1">{tx("Arbeitsbefreiung")}</h1>
      <p className="unter">{tx("Bezahlte Freistellung laut Tarifvertrag (Sozialtag)")}</p>
      <span className="fett">{tx("Anlass wählen")}</span>
      <ul className="liste">{ANLAESSE.map((y) => <li key={y.id}><button type="button" className="zeile" aria-pressed={anlass === y.id} style={{ cursor: 'pointer', background: anlass === y.id ? 'var(--blau-hell)' : undefined }} onClick={() => setAnlass(y.id)}><span className="wachs"><span className="fett">{y.l}</span><span className="klein">{y.id === 'arzt' ? tx("nach Bedarf, stundenweise") : tx(y.tage > 1 ? "{0} Arbeitstage" : "{0} Arbeitstag", y.tage)}</span></span></button></li>)}</ul>
      {x && (
        <>
          <div className="zwei">
            <div className="feld"><label htmlFor="abv">{tx("Von")}</label><input id="abv" className="eingabe" type="date" value={von} onChange={(e) => setVon(e.target.value)} /></div>
            <div className="feld"><label htmlFor="abb">{tx("Bis")}</label><input id="abb" className="eingabe" type="date" value={bis} onChange={(e) => setBis(e.target.value)} /></div>
          </div>
          {fehler ? <div className="hinweis orange">{fehler}</div> : <span className="unter">{n > 1 ? tx("{0} Arbeitstage im Zeitraum", n) : tx("1 Arbeitstag im Zeitraum")}</span>}
          <section className="karte pad">
            <span className="fett">{tx("Nachweis nötig: {0}", x.p)}</span>
            <span className="text">{tx("Du kannst den Antrag auch ohne Nachweis senden. Nach dem Anlass erinnert dich die App. Frist: 14 Tage nach dem Anlass, danach noch 7 Tage Nachfrist.")}</span>
            <Knopf farbe="rahmen" klasse="mittel" onClick={() => setFoto(true)}>{foto ? tx("Nachweis hinzugefügt ✓") : tx("Nachweis jetzt fotografieren (oder später)")}</Knopf>
            <span className="klein">{x.id === 'arzt' || x.id === 'krank' ? tx("Die Bescheinigung braucht keine Diagnose. Steht doch eine darauf, darfst du sie abdecken.") : tx("Angaben, die für den Anlass nicht nötig sind, darfst du abdecken.")} {' '}{tx("Oberbauleitung und Bauleiter sehen nur Anlass und Tage. Den Nachweis sieht nur das Büro.")}</span>
          </section>
          <p className="text">{tx("Genehmigung: Oberbauleitung ({0}) → Büro. Die Genehmigung gilt zunächst unter Vorbehalt. Endgültig wird sie, sobald der Nachweis geprüft ist.", voll(person(d, d.oberbauleitungId)))}</p>
        </>
      )}
      <Fueller />
      <Knopf gesperrt={!x || !!fehler} onClick={() => { a.antragStellen({ art: 'arbeitsbefreiung', anlass, von, bis, tage: n, nachweis: foto ? 'hochgeladen' : 'fehlt', quelle: 'app' }); setFertig(true); }}>{tx("Antrag senden")}</Knopf>
      <p className="klein">{tx("Wird als Sozialtag (Kürzel S) an die Lohnbuchhaltung übergeben.")}</p>
    </Seite>
  );
}

// ------------------------------------------------------------------ Nachweis nachreichen

export function NachweisNachreichen() {
  const { id } = useParams();
  const { d, ich, a } = useIch();
  const [foto, setFoto] = useState(false);
  const antrag = d.antraege.find((x) => x.id === id && x.personId === ich.id);
  if (!antrag) return <Seite titel={tx("Nachweis")} menue="antraege"><Zurueck to="/ma/antraege">{tx("Anträge")}</Zurueck><p className="text">{tx("Diesen Antrag gibt es nicht.")}</p></Seite>;
  const frist = plusTage(antrag.bis, 14);
  const nachfrist = plusTage(frist, 7);
  const stand = d.heute <= frist ? 'Erinnerung' : d.heute <= nachfrist ? 'Nachfrist' : 'Abgelaufen';
  const x = ANLAESSE.find((y) => y.id === antrag.anlass);
  const rest = urlaubRest(d, ich.id).rest;
  return (
    <Seite titel={tx("Nachweis nachreichen")} menue="antraege">
      <Zurueck to="/ma/antraege">{tx("Anträge")}</Zurueck>
      <h1 className="h1">{tx("Nachweis nachreichen")}</h1>
      <section className="karte pad">
        <span className="fett">{anlassText(antrag.anlass)} · {tm(antrag.von)}{antrag.bis !== antrag.von ? `–${tm(antrag.bis)}` : ''} · {antrag.tage} {antrag.tage === 1 ? tx("Tag") : tx("Tage")}</span>
        <span className="unter">{tx("Genehmigt unter Vorbehalt: Oberbauleitung und Büro")}</span>
        <span className="unter">{tx("Frist {0} · Nachfrist bis {1} · Stand: {2}", tmj(frist), tmj(nachfrist), stand)}</span>
      </section>
      {antrag.nachweis === 'fehlt' ? (
        <>
          <div className={`hinweis ${stand === 'Erinnerung' ? 'blau' : 'orange'}`}><strong>{stand === 'Abgelaufen' ? tx("Die Nachfrist ist am {0} abgelaufen. Der Nachweis fehlt.", tmj(nachfrist)) : stand === 'Nachfrist' ? tx("Nachfrist läuft: Ein Nachweis fehlt noch.") : tx("Ein Nachweis fehlt noch.")}</strong> {' '}{tx("Nötig:")}{' '}{x?.p}</div>
          <Knopf farbe="rahmen" klasse="mittel" onClick={() => setFoto(true)}>{foto ? tx("Foto hinzugefügt ✓") : tx("Nachweis fotografieren")}</Knopf>
          <span className="klein">{tx("Den Nachweis sieht nur das Büro. Oberbauleitung und Bauleiter sehen nur Anlass und Tage.")}</span>
          <Knopf gesperrt={!foto} onClick={() => a.nachweisHochladen(antrag.id)}>{tx("Nachweis senden")}</Knopf>
          {stand !== 'Erinnerung' && (
            <section className="karte pad">
              <span className="fett">{tx("Falls du keinen Nachweis hast")}</span>
              <span className="text">{tx("Wie sollen die")}{' '}{antrag.tage} {antrag.tage === 1 ? tx("Tag") : tx("Tage")} {' '}{tx("gebucht werden? Wählst du nicht, buchen wir die Zeit vorläufig als unbezahlt. Reichst du den Nachweis nach, wird das korrigiert.")}</span>
              <Auswahl label={tx("Ersatz")} spalten={1} optionen={[{ wert: 'urlaub' as const, text: tx("Als Urlaubstag (du hast noch {0} frei)", rest) }, { wert: 'unbezahlt' as const, text: tx("Unbezahlt frei") }]} wert={antrag.ersatz === 'konto' ? undefined : antrag.ersatz} setWert={(w) => a.ersatzWaehlen(antrag.id, w)} />
              {antrag.ersatz && <span className="unter">{tx("Gespeichert:")}{' '}{antrag.ersatz === 'urlaub' ? tx("Gebucht als Urlaub") : tx("Gebucht als unbezahlt frei")}{tx(". Das Büro ist informiert.")}</span>}
            </section>
          )}
        </>
      ) : <div className="hinweis gruen"><strong>{antrag.nachweis === 'gesehen' ? tx("Nachweis geprüft.") : tx("Nachweis wird geprüft.")}</strong> {antrag.nachweis === 'gesehen' ? tx("Die Arbeitsbefreiung ist endgültig genehmigt.") : tx("Endgültig genehmigt, sobald das Büro den Nachweis geprüft hat.")}</div>}
      <Fueller />
      <p className="klein">{tx("An offene Nachweise erinnert die App, bis sie hochgeladen sind.")}</p>
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
  if (!k) return <Seite titel={tx("Krankmeldung")} menue="antraege"><Zurueck to="/ma/antraege">{tx("Anträge")}</Zurueck><p className="text">{tx("Keine Krankmeldung gefunden.")}</p></Seite>;
  const zurueck = werktag(k.bis, 1);
  const bl = einteilungAm(d, ich.id, k.von);
  const wer = bl ? tx("Polier {0} und Bauleiter {1}", bl.polierId ? voll(person(d, bl.polierId)) : '', voll(person(d, bl.bauleitungId))) : tx("Polier und Bauleiter");
  if (fertig) return <Seite titel={tx("Antwort gesendet")} menue="antraege"><Erledigt titel={tx("Antwort gesendet")}>{tx("{0} {1} sind informiert.", fertig, wer)}</Erledigt><Link to="/ma/antraege" className="knopf blau">{tx("Zu den Anträgen")}</Link></Seite>;
  return (
    <Seite titel={tx("Meine Krankmeldung")} menue="antraege">
      <Zurueck to="/ma/antraege">{tx("Anträge")}</Zurueck>
      <h1 className="h1">{tx("Meine Krankmeldung")}</h1>
      <section className="karte pad"><span className="fett">{tx("Krankgeschrieben {0}–{1}", tm(k.von), tmj(k.bis))}</span><span className="unter">{tx("Bitte antworten bis {0}, {1}", wtKurz(k.bis), tmj(k.bis))}</span></section>
      <span className="fett">{tx("Wie geht es weiter?")}</span>
      <Auswahl label={tx("Wie geht es weiter?")} spalten={1} optionen={[{ wert: 'wie' as const, text: tx("Ich komme wie geplant wieder ({0})", tm(zurueck)) }, { wert: 'laenger' as const, text: tx("Krankschreibung wurde verlängert") }, { wert: 'frueh' as const, text: tx("Ich bin früher gesund") }]} wert={wahl} setWert={setWahl} />
      {wahl === 'laenger' && <div className="feld"><label htmlFor="nb">{tx("Neu bis (Folgebescheinigung)")}</label><input id="nb" className="eingabe" type="date" min={plusTage(k.bis, 1)} value={neuBis} onChange={(e) => setNeuBis(e.target.value)} /><span className="klein">{tx("„Neu ab“ ist der {0} (Tag nach dem alten Ende).", tm(plusTage(k.bis, 1)))}</span></div>}
      {wahl === 'frueh' && <div className="feld"><label htmlFor="fr">{tx("Ich komme wieder am")}</label><input id="fr" className="eingabe" type="date" min={plusTage(d.heute, 1)} max={k.bis} value={frueh} onChange={(e) => setFrueh(e.target.value)} /></div>}
      <Fueller />
      <Knopf gesperrt={!wahl || (wahl === 'laenger' && neuBis <= k.bis)} onClick={() => {
        if (wahl === 'laenger') { a.krankRueckmeldung(k.id, 'weiter', neuBis); setFertig(tx("Neue Krankschreibung bis {0}. Wir rufen sie bei deiner Krankenkasse ab.", tmj(neuBis))); }
        else { a.krankRueckmeldung(k.id, 'gesund'); setFertig(wahl === 'frueh' ? tx("Du kommst früher wieder, am {0}.", tmj(frueh)) : tx("Du kommst wie geplant wieder, am {0}.", tmj(zurueck))); }
      }}>{tx("Antwort senden")}</Knopf>
      <p className="klein">{tx("Ohne Antwort bekommen Polier und Bauleiter automatisch den Hinweis „keine Rückmeldung“.")}</p>
    </Seite>
  );
}

// ------------------------------------------------------------------ Ausweis-Sichtung (Polier oder Mitarbeiter)

export function AusweisSichtung() {
  const { d, ich, a } = useIch();
  const bs = einteilungAm(d, ich.id, d.heute) ?? d.baustellen.find((b) => b.polierId === ich.id);
  const leute = d.personen.filter((p) => p.rolle === 'nu' && d.einteilung.some((e) => e.personId === p.id && e.datum === d.heute && (!bs || e.baustelleId === bs.id)));
  const [pid, setPid] = useState<string>();
  const [art, setArt] = useState(tx("Personalausweis"));
  const [bis, setBis] = useState('');
  const [staat, setStaat] = useState('');
  const [ok, setOk] = useState(false);
  const [fertig, setFertig] = useState<string>();
  const p = leute.find((x) => x.id === pid);
  const abgelaufen = !!bis && bis < d.heute;
  return (
    <Seite titel={tx("Ausweis eintragen")} menue="mehr">
      <Zurueck to={mehrVon(ich.rolle)}>{tx("Mehr")}</Zurueck>
      <h1 className="h1">{tx("Ausweis eintragen")}</h1>
      <p className="text">{tx("Lass dir den Ausweis im Original zeigen. Trag nur die Daten unten ein. Es wird kein Foto, keine Kopie und keine Ausweisnummer gespeichert.")}</p>
      {fertig ? <><Erledigt titel={tx("Gespeichert")}>{fertig}</Erledigt><Knopf farbe="rahmen" onClick={() => { setFertig(undefined); setPid(undefined); setOk(false); setBis(''); }}>{tx("Weitere Person")}</Knopf></> : <>
        <span className="fett">{tx("1. Person wählen")}</span>
        <span className="klein">{bs ? tx("Nachunternehmer, die heute auf {0} eingeteilt sind:", bsName(bs)) : tx("Nachunternehmer, die heute eingeteilt sind") + ':'}</span>
        <ul className="liste">{leute.map((x) => { const bald = x.ausweis && x.ausweis.bis < plusTage(d.heute, 30); return <li key={x.id}><button type="button" className="zeile" aria-pressed={pid === x.id} style={{ cursor: 'pointer', background: pid === x.id ? 'var(--blau-hell)' : undefined }} onClick={() => { setPid(x.id); setStaat(x.ausweis?.staat ?? ''); }}><span className="wachs"><span className="fett">{voll(x)}</span><span className="klein">{!x.ausweis ? tx("noch nicht gesehen") : bald ? tx("läuft bald ab") : `gesehen ${tm(x.ausweis.am)}`}</span></span></button></li>; })}
          {!leute.length && <li className="zeile klein">{tx("Heute ist hier niemand eingeteilt, dessen Ausweis du eintragen kannst.")}</li>}</ul>
        {p && <>
          <span className="fett">{tx("2. Ausweisdaten von {0}", voll(p))}</span>
          <Auswahl label={tx("Art des Ausweises")} spalten={1} klein optionen={[tx("Personalausweis"), tx("Reisepass"), tx("Aufenthaltstitel")].map((x) => ({ wert: x, text: x }))} wert={art} setWert={setArt} />
          <div className="feld"><label htmlFor="ab">{tx("Gültig bis")}</label><input id="ab" className="eingabe" type="date" value={bis} onChange={(e) => setBis(e.target.value)} /></div>
          {abgelaufen && <div className="hinweis rot">{tx("Dieser Ausweis ist abgelaufen. Bitte die Verwaltung anrufen.")}</div>}
          <div className="feld"><label htmlFor="st">{tx("Staatsangehörigkeit")}</label><input id="st" className="eingabe" placeholder={tx("z. B. kroatisch")} value={staat} onChange={(e) => setStaat(e.target.value)} /><span className="klein">{tx("Nur damit die Verwaltung weiß, welche Unterlagen nötig sind.")}</span></div>
          <label className="check" style={{ fontSize: 16 }}><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> {' '}{tx("Ich habe den Ausweis im Original gesehen. Das Foto passt zur Person.")}</label>
          <Knopf gesperrt={!ok || !bis || !staat.trim() || abgelaufen} onClick={() => { a.ausweisEintragen(p.id, art, bis, staat.trim()); setFertig(tx("Ausweis von {0} gesehen am {1} von {2}. Die Ausweisdaten sieht ab jetzt nur noch die Verwaltung.", voll(p), tmj(d.heute), voll(ich))); }}>{tx("Ausweis gesehen – speichern")}</Knopf>
        </>}
      </>}
      <section className="karte pad"><span className="fett">{tx("Gut zu wissen")}</span><span className="klein">{tx("Bitte kein Foto vom Ausweis machen, auch nicht mit dem eigenen Handy. Hat jemand keinen Ausweis dabei: nicht eintragen und den Polier oder die Verwaltung informieren.")}</span></section>
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
    <Seite titel={tx("Hilfe")} menue="mehr">
      <Zurueck to={zurueckZiel(ich?.rolle)}>{ich ? tx("Mehr") : tx("Anmeldung")}</Zurueck>
      <h1 className="h1">{tx("Hilfe")}</h1>
      <div className="feld"><label htmlFor="hs">{tx("Suchen")}</label><input id="hs" className="eingabe" type="search" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder={tx("z. B. PIN, Pause, Urlaub")} /></div>
      <div className="pk-reihe"><Link className="link" to="/faq">{tx("Häufige Fragen")}</Link><Link className="link" to="/intro">{tx("Einführung ansehen")}</Link><Link className="link" to="/datenschutz">{tx("Datenschutz")}</Link></div>
      {liste.map((h) => (
        <details key={h.id} className="faq"><summary>{h.t}</summary>{h.p.map((x, i) => <p key={i} className="text">{x}</p>)}</details>
      ))}
      {!liste.length && <p className="text">{tx("Nichts gefunden. Frag deinen Polier oder ruf im Büro an.")}</p>}
    </Seite>
  );
}

export function Faq() {
  const { ich } = useDaten();
  return (
    <Seite titel={tx("Häufige Fragen")} menue="mehr">
      <Zurueck to={zurueckZiel(ich?.rolle)}>{ich ? tx("Mehr") : tx("Anmeldung")}</Zurueck>
      <h1 className="h1">{tx("Häufige Fragen")}</h1>
      {texte.faq.map((f, i) => <details key={i} className="faq"><summary>{f.q}</summary><p className="text">{f.a}</p></details>)}
      <div className="pk-reihe"><Link className="link" to="/hilfe">{tx("Zur Hilfe")}</Link><Link className="link" to="/intro">{tx("Einführung ansehen")}</Link></div>
    </Seite>
  );
}

export function Datenschutz() {
  const { ich } = useDaten();
  const [alle, setAlle] = useState(false);
  const ds = texte.datenschutz;
  return (
    <Seite titel={tx("Datenschutzhinweise")} menue="mehr">
      <Zurueck to={zurueckZiel(ich?.rolle)}>{ich ? tx("Mehr") : tx("Anmeldung")}</Zurueck>
      <span className="pill vor" style={{ alignSelf: 'flex-start' }}>{ds.entwurf}</span>
      <h1 className="h1">{tx("Datenschutzhinweise")}</h1>
      <p className="text">{ds.intro}</p>
      <button type="button" className="link" onClick={() => setAlle(!alle)}>{alle ? tx("Alle schließen") : tx("Alle öffnen")}</button>
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
  [tx("Willkommen"), tx("Mit dieser App schreibst du deine Arbeitszeit auf. Wir zeigen dir kurz, wie es geht.")],
  [tx("Anmelden mit PIN"), tx("Du bekommst eine Einladung per E-Mail. Tippe auf den Link, gib deine E-Mail-Adresse ein und dann den Code aus der E-Mail. Lege dann eine PIN mit 4 Ziffern fest.")],
  [tx("Arbeitsbeginn und Arbeitsende tippen"), tx("Tippe morgens auf „Arbeitsbeginn“ und abends auf „Arbeitsende“. Die App schlägt deine Baustelle vor. Stimmt sie nicht, tippe auf „Andere Baustelle wählen“.")],
  [tx("Pause und Baustellenwechsel"), tx("Tippe auf „Pause“, wenn deine Pause beginnt, und danach auf „Weiter arbeiten“. Fährst du zu einer anderen Baustelle, tippe bei der Abfahrt auf „Baustelle wechseln“.")],
  [tx("Dein Standort"), tx("Die App vergleicht deinen Standort nur in dem Moment, in dem du tippst. Die genaue Position wird nicht gespeichert. Gespeichert wird nur: „passt“ oder „weicht ab“.")],
  [tx("Tag prüfen und absenden"), tx("Am Abend prüfst du deinen Tag und wählst Zuschläge, wenn welche angefallen sind. Mit dem Senden an deinen Polier bestätigst du, dass Beginn, Ende und Pausen stimmen.")],
  [tx("Dein Polier prüft"), tx("Dein Polier prüft den Tag und gibt ihn frei. Ändert er etwas, siehst du die Korrektur und kannst widersprechen.")],
  [tx("Kalender und Arbeitszeitkonto"), tx("Im Kalender siehst du deine Tage. Unter „Konto“ siehst du dein Arbeitszeitkonto.")],
  [tx("Urlaub und Krank"), tx("Urlaub beantragst du unter „Anträge“. Bist du krank, melde dich unter „Krank melden“. Eine Diagnose gibst du nicht an.")],
  [tx("Hilfe und Sprache"), tx("Hilfe, häufige Fragen und Sprache findest du jederzeit oben rechts. Dort kannst du auch diese Einführung noch einmal ansehen.")],
];
const INTRO_NU = [
  [tx("Willkommen"), tx("Mit dieser App schreibst du deine Arbeitszeit auf den Baustellen von K. Baumann auf. Wir zeigen dir kurz, wie es geht.")],
  [tx("Start, Pause und Arbeitsende tippen"), tx("Tippe auf „Start“, wenn du auf der Baustelle bist. Tippe auf „Pause“ und am Ende auf „Arbeitsende“. Dein Standort wird nur beim Tippen verglichen; die genaue Position wird nicht gespeichert.")],
  [tx("Tag an den Polier senden"), tx("Nach dem Arbeitsende tippst du auf „Tag an Polier senden“. Der Polier prüft deine Stunden und gibt sie frei. Ändert er etwas, siehst du es unter „Meine Stunden“ und kannst widersprechen.")],
  [tx("Nachweise"), tx("Unter „Nachweise“ siehst du deine Unterlagen. Fehlt etwas, lädst du ein Foto hoch. Deinen Ausweis zeigst du beim Polier oder im Büro. Davon wird keine Kopie gespeichert.")],
  [tx("Mindestlohn: unterschreiben"), tx("Einmal im Monat liest du in der App eine kurze Erklärung zum Mindestlohn. Du unterschreibst mit dem Finger auf dem Handy. Die Unterschrift geht nur an die Verwaltung von K. Baumann, nicht an deine Firma.")],
];

export function Intro() {
  const { ich, a } = useDaten();
  const nav = useNavigate();
  const [wer, setWer] = useState<'ma' | 'nu'>(ich?.rolle === 'nu' ? 'nu' : 'ma');
  const [i, setI] = useState(0);
  const schritte = wer === 'nu' ? INTRO_NU : INTRO_MA;
  const ende = () => { if (ich) { a.introGesehen(ich.id); nav(startVon(ich.rolle)); } else nav('/'); };
  return (
    <Seite titel={tx("Einführung")} ohneMenue>
      {!ich && <Auswahl label={tx("Beispiel ansehen")} klein optionen={[{ wert: 'ma' as const, text: tx("Mitarbeiter") }, { wert: 'nu' as const, text: tx("Nachunternehmer-Person") }]} wert={wer} setWert={(w) => { setWer(w); setI(0); }} />}
      <span className="unter">{tx("Schritt {0} von {1}", i + 1, schritte.length)}</span>
      <div className="fortschritt" aria-hidden="true" style={{ height: 6, background: 'var(--linie)', borderRadius: 3 }}><span style={{ display: 'block', height: 6, width: `${((i + 1) / schritte.length) * 100}%`, background: 'var(--blau)', borderRadius: 3 }} /></div>
      <h1 className="h1 gross">{schritte[i][0]}</h1>
      <p className="text" style={{ fontSize: 18 }}>{schritte[i][1]}</p>
      <Fueller />
      <div className="zwei">
        {i > 0 ? <Knopf farbe="rahmen" onClick={() => setI(i - 1)}>{tx("Zurück")}</Knopf> : <Knopf farbe="rahmen" onClick={ende}>{tx("Überspringen")}</Knopf>}
        {i < schritte.length - 1 ? <Knopf onClick={() => setI(i + 1)}>{tx("Weiter")}</Knopf> : <Knopf farbe="gruen" onClick={ende}>{tx("Los geht's")}</Knopf>}
      </div>
      <Link className="link" to="/hilfe">{tx("Mehr dazu in der Hilfe")}</Link>
    </Seite>
  );
}

