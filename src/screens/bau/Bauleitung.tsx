// Bauleitung: Start, Freigabe, Tag, zurück an den Polier, Gegenzeichnen, Urlaub,
// eigene Zeit, Baustellen und Nachträge (B1–B12 im Entwurf V2)

import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Fueller, Seite, Zurueck } from '../../components/Rahmen';
import { Auswahl, BaustelleWahl, Erledigt, Haken, Knopf, Weiter, ZuschlagInfo } from '../../components/Teile';
import { useDaten, useIch } from '../../domain/store';
import {
  antraegeFuerBauleitung, baustelle, baustellenVonBauleitung, bsLang, bsName, einteilungAm, helferStunden, hinweiseTag, nachtragSumme, offeneWidersprueche, person, rechnung,
  stundenJeBaustelle, stundenTag, tageBeiBauleitung, tagVon, urlaubRest, voll, vorschlaegeFuerBauleitung, wartetAufBauleitung,
} from '../../domain/sel';
import type { Antrag, Daten, Nachtrag, Tag } from '../../domain/types';
import { artName, euro, euroAbw, stunden, tagLang, tm, uhr, werktag, wtKurz } from '../../domain/zeit';
import { geltendeStunden, zuschlagArt } from '../../domain/zuschlaege';
import { Demo, MehrListe } from '../ma/Rest';
import { StundenKarte } from '../polier/Kolonne';

/** Anträge der eigenen Leute, die noch entschieden werden (nur zur Info, es entscheidet die Oberbauleitung) */
const offeneAntraege = (d: Daten, blId: string) => antraegeFuerBauleitung(d, blId).filter((a) => a.status === 'offen' || a.status === 'bauleitung_ok');
const offeneHelfer = (d: Daten, blId: string) => {
  const meine = baustellenVonBauleitung(d, blId).map((b) => b.id);
  return d.helfer.filter((h) => !h.gegengezeichnet && meine.includes(h.baustelleId));
};

/** B1: Heute bei der Bauleitung */
export function BHeute() {
  const { d, ich } = useIch();
  const freigabe = tageBeiBauleitung(d, ich.id).reduce((s, g) => s + g.tage.length, 0);
  const antraege = offeneAntraege(d, ich.id);
  const helfer = offeneHelfer(d, ich.id);
  const meldungen = vorschlaegeFuerBauleitung(d, ich.id);
  const gestern = werktag(d.heute, -1);
  const eigenOffen = tagVon(d, ich.id, gestern)?.status === 'offen';
  const aufgaben = [
    freigabe && { text: `${freigabe} ${freigabe === 1 ? 'Tag' : 'Tage'} freigeben`, unter: 'vom Polier freigegeben', to: '/b/freigabe' },
    meldungen.length && { text: `${meldungen.length} ${meldungen.length === 1 ? 'Meldung' : 'Meldungen'} „Stempeln vergessen“`, unter: `von Polieren: ${meldungen.map((v) => voll(person(d, v.personId))).join(', ')}`, to: '/b/vorschlag' },
    helfer.length && { text: `${helfer.length} Helfer- und NU-Einträge gegenzeichnen`, unter: [...new Set(helfer.map((h) => bsName(baustelle(d, h.baustelleId))))].join(', '), to: '/b/gegenzeichnen' },
    antraege.length && { text: `${antraege.length} ${antraege.length === 1 ? 'Antrag' : 'Anträge'} deiner Leute (zur Info)`, unter: `entscheidet die Oberbauleitung: ${antraege.map((a) => voll(person(d, a.personId))).join(', ')}`, to: '/b/urlaub' },
    eigenOffen && { text: `Eigenen Tag ${tm(gestern)} senden`, unter: 'an die Oberbauleitung', to: '/b/meine-zeit' },
  ].filter(Boolean) as { text: string; unter: string; to: string }[];
  return (
    <Seite titel="Heute" menue="heute">
      <div className="kopfzeilen">
        <span className="unter">{tagLang(d.heute)}</span>
        <h1 className="h1 gross">Servus {ich.vorname}</h1>
      </div>
      {aufgaben.length === 0 ? <div className="hinweis gruen"><strong>Alles erledigt.</strong></div> : (
        <ul className="liste">
          {aufgaben.map((x) => (
            <li key={x.text}>
              <Link to={x.to} className="zeile" style={{ minHeight: 60 }}>
                <span className="wachs"><span className="name">{x.text}</span><span className="klein">{x.unter}</span></span>
                <Weiter />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/b/meine-zeit" className="knopf rahmen mittel">Meine Zeit</Link>
    </Seite>
  );
}

function TagZeileB({ d, t }: { d: Daten; t: Tag }) {
  const r = rechnung(d, t.personId, t.datum);
  const h = hinweiseTag(d, t);
  return (
    <li>
      <Link to={`/b/tag/${t.id}`} className="zeile" style={{ minHeight: 60 }}>
        <span className="wachs">
          <span className="name">{voll(person(d, t.personId))}</span>
          <span className="klein">{tm(t.datum)} · {stunden(r.arbeitMin / 60)} · Polier {t.polierFreigabeVon ? person(d, t.polierFreigabeVon).nachname : '–'}</span>
          {h.length > 0 && <span className="warn" style={{ fontSize: 14 }}>{h[0]}{h.length > 1 ? ` (+${h.length - 1})` : ''}</span>}
        </span>
        <Weiter />
      </Link>
    </li>
  );
}

/** B2: Freigabe */
export function BFreigabe() {
  const { d, ich, a } = useIch();
  const gruppen = tageBeiBauleitung(d, ich.id);
  const [bs, setBs] = useState(gruppen.find((g) => g.tage.length)?.baustelle.id ?? gruppen[0]?.baustelle.id ?? '');
  const [fertig, setFertig] = useState(0);
  const g = gruppen.find((x) => x.baustelle.id === bs) ?? gruppen[0];
  if (fertig) {
    return (
      <Seite titel="Freigegeben" menue="freigabe">
        <Fueller />
        <Erledigt titel={`${fertig} ${fertig === 1 ? 'Tag' : 'Tage'} freigegeben`}><p className="text" style={{ textAlign: 'center' }}>Sie gehen an die Lohnbuchhaltung.</p></Erledigt>
        <Fueller />
        <Knopf onClick={() => setFertig(0)}>Zurück zur Freigabe</Knopf>
      </Seite>
    );
  }
  if (!g) return <Seite titel="Freigabe" menue="freigabe"><p className="text">Keine Baustellen.</p></Seite>;
  const summe = g.tage.reduce((s, t) => s + stundenTag(d, t.personId, t.datum), 0);
  const mit = g.tage.filter((t) => hinweiseTag(d, t).length > 0);
  const ohne = g.tage.filter((t) => !mit.includes(t));
  return (
    <Seite titel="Freigabe" menue="freigabe">
      <h1 className="h1 gross">Freigabe</h1>
      <BaustelleWahl liste={gruppen.map((x) => x.baustelle)} wert={g.baustelle.id} setWert={setBs} />
      {g.baustelle.polierId && <span className="unter">Polier {voll(person(d, g.baustelle.polierId))}</span>}
      {g.tage.length === 0 ? <div className="hinweis gruen"><strong>Nichts offen</strong> auf {bsName(g.baustelle)}.</div> : (
        <>
          <span className="unter">{g.tage.length} {g.tage.length === 1 ? 'Tag' : 'Tage'} · zusammen {stunden(summe)}</span>
          {mit.length > 0 && <><h2 className="h2">Mit Hinweis ({mit.length})</h2><ul className="liste">{mit.map((t) => <TagZeileB key={t.id} d={d} t={t} />)}</ul></>}
          {ohne.length > 0 && <><h2 className="h2">Ohne Hinweis ({ohne.length})</h2><ul className="liste">{ohne.map((t) => <TagZeileB key={t.id} d={d} t={t} />)}</ul></>}
          <Knopf farbe="gruen" onClick={() => { a.bauleitungFreigeben(g.tage.map((t) => t.id)); setFertig(g.tage.length); }}>
            Alle {g.tage.length} freigeben
          </Knopf>
          <span className="klein">Einzelne Tage mit Fragen erst öffnen und an den Polier zurückgeben.</span>
        </>
      )}
    </Seite>
  );
}

/** B3: einen Tag ansehen */
export function BTag() {
  const { id = '' } = useParams();
  const { d, a, ich } = useIch();
  const nav = useNavigate();
  const t = d.tage.find((x) => x.id === id);
  if (!t) return <Navigate to="/b/freigabe" replace />;
  const r = rechnung(d, t.personId, t.datum);
  const offen = wartetAufBauleitung(d, t, ich.id);
  const ws = offeneWidersprueche(t);
  const jeBs = stundenJeBaustelle(d, t.personId, t.datum);
  return (
    <Seite titel="Tag" menue="freigabe">
      <Zurueck to="/b/freigabe">Freigabe</Zurueck>
      <div className="kopfzeilen"><span className="unter">{tagLang(t.datum)} · {bsName(baustelle(d, r.gueltig[0]?.baustelleId))}</span><h1 className="h1">{voll(person(d, t.personId))}</h1></div>
      {hinweiseTag(d, t).map((x) => <div key={x} className="hinweis orange" style={{ fontSize: 15 }}>{x}</div>)}
      <ol aria-label="Zeiten" className="liste">
        {r.gueltig.map((s) => (
          <li key={s.id} className="zeile">
            <span className="fett tab" style={{ width: 56 }}>{uhr(s.zeit)}</span>
            <span style={{ flexGrow: 1 }}>{artName(s.art)}</span>
            {s.herkunft !== 'gestempelt' && <span className="klein">{s.herkunft === 'korrektur' ? 'vom Polier' : s.herkunft === 'polier_ohne_handy' ? 'ohne Handy' : s.herkunft}</span>}
          </li>
        ))}
      </ol>
      {t.korrekturen.map((k) => (
        <div key={k.id} className="karte pad">
          <span className="fett">Korrektur: {k.was}</span>
          <span className="unter">{voll(person(d, k.von))}: „{k.grund}“</span>
          <span className="klein">{k.antwort === 'bestaetigt' ? 'Vom Mitarbeiter bestätigt' : k.antwort === 'widerspruch' ? `Widerspruch: „${k.antwortText ?? ''}“` : k.ohneRueckmeldung ? 'Ohne Rückmeldung des Mitarbeiters entschieden' : 'Mitarbeiter hat noch nicht geantwortet'}</span>
          {k.entscheidung && <span className="ok" style={{ fontSize: 14 }}>Entschieden: {k.entscheidung === 'bleibt' ? 'Korrektur bleibt' : 'ursprüngliche Zeit gilt'}</span>}
          {offen && k.antwort === 'widerspruch' && !k.entscheidung && (
            <div className="zwei">
              <Knopf farbe="rahmen" klasse="mittel" onClick={() => a.widerspruchEntscheiden(t.id, k.id, 'original')}>Ursprüngliche Zeit gilt</Knopf>
              <Knopf farbe="rahmen" klasse="mittel" onClick={() => a.widerspruchEntscheiden(t.id, k.id, 'bleibt')}>Korrektur bleibt</Knopf>
            </div>
          )}
        </div>
      ))}
      {jeBs.length > 1 && (
        <section aria-label="Stunden je Baustelle" className="karte pad">
          <span className="fett klein">Baustellenwechsel</span>
          {jeBs.map((x) => <span key={x.baustelle?.id ?? '-'} className="klein">{bsName(x.baustelle)}: {stunden(x.stunden)}{x.baustelle?.polierId ? ` · Polier ${voll(person(d, x.baustelle.polierId))}` : ''}</span>)}
        </section>
      )}
      <span className="fett">Gearbeitet {stunden(r.arbeitMin / 60)} · Pause {Math.round(r.pauseMin)} Min.</span>
      {t.zuschlaege.length > 0 && (
        <section aria-label="Zuschläge" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="h2">Zuschläge</h2>
          {t.zuschlaege.map((z) => (
            <div key={z.id} className="karte pad">
              <span className="fett">{zuschlagArt(z.art).name} · {stunden(geltendeStunden(z))}{z.entscheidung === 'kurz' ? ` (statt ${stunden(z.stunden)})` : ''}</span>
              {z.typ && <span className="unter">{z.typ}</span>}
              <span className="klein">Polier: {{ offen: 'offen', ok: 'bestätigt', kurz: 'gekürzt', weg: 'gestrichen' }[z.entscheidung]}</span>
              <ZuschlagInfo art={z.art} mitParagraf />
            </div>
          ))}
        </section>
      )}
      <Fueller />
      {offen && ws.length > 0 && <div className="hinweis orange">Erst den Widerspruch entscheiden, dann freigeben.</div>}
      {offen ? (
        <div className="zwei">
          {t.polierFreigabeVon ? <Link to={`/b/tag/${t.id}/zurueck`} className="knopf rahmen-rot mittel">Zurück an Polier</Link> : <span />}
          <Knopf farbe="gruen" klasse="mittel" gesperrt={ws.length > 0} onClick={() => { a.bauleitungFreigeben([t.id]); nav('/b/freigabe'); }}>Freigeben</Knopf>
        </div>
      ) : <div className="hinweis blau">Status: {t.status === 'freigegeben' ? 'an die Lohnbuchhaltung' : t.status === 'bei_bauleitung' ? (t.personId === ich.id ? 'bei der Oberbauleitung' : 'beim anderen Bauleiter') : 'beim Polier'}</div>}
    </Seite>
  );
}

/** B4: zurück an den Polier – Grund ist Pflicht */
export function BZurueck() {
  const { id = '' } = useParams();
  const { d, a } = useIch();
  const nav = useNavigate();
  const [grund, setGrund] = useState('');
  const [fehler, setFehler] = useState('');
  const t = d.tage.find((x) => x.id === id);
  if (!t) return <Navigate to="/b/freigabe" replace />;
  const vorschlaege = ['Zuschlag bitte prüfen', 'Zeiten passen nicht zum Bautagebuch', 'Pause bitte klären'];
  return (
    <Seite titel="Zurück an Polier" menue="freigabe">
      <Zurueck to={`/b/tag/${t.id}`}>Tag</Zurueck>
      <h1 className="h1">Zurück an den Polier</h1>
      <span className="unter">{voll(person(d, t.personId))} · {tagLang(t.datum)}</span>
      <div className="feld">
        <span className="label">Was soll der Polier klären? (Pflicht)</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {vorschlaege.map((g) => <button key={g} type="button" className="chip" aria-pressed={grund === g} onClick={() => setGrund(g)} style={{ cursor: 'pointer', border: grund === g ? '2px solid var(--blau)' : undefined }}>{g}</button>)}
        </div>
        <textarea className="eingabe" rows={3} value={grund} onChange={(e) => setGrund(e.target.value)} aria-label="Grund" />
      </div>
      {fehler && <div role="alert" className="hinweis rot">{fehler}</div>}
      <Fueller />
      <Knopf farbe="rot" onClick={() => { if (!grund.trim()) return setFehler('Bitte einen Grund angeben.'); a.zurueckAnPolier(t.id, grund.trim()); nav('/b/freigabe'); }}>Zurückschicken</Knopf>
    </Seite>
  );
}

/** B5: Helfer- und NU-Stunden gegenzeichnen */
export function BGegenzeichnen() {
  const { d, ich, a } = useIch();
  const offen = offeneHelfer(d, ich.id);
  const [weg, setWeg] = useState<string[]>([]);
  const nachBs = [...new Set(offen.map((h) => h.baustelleId))];
  return (
    <Seite titel="Gegenzeichnen" menue="heute">
      <Zurueck to="/b/heute">Heute</Zurueck>
      <h1 className="h1">Helfer und NU gegenzeichnen</h1>
      {offen.length === 0 && <div className="hinweis gruen"><strong>Alles gegengezeichnet.</strong></div>}
      {nachBs.map((bid) => (
        <section key={bid} aria-label={bsName(baustelle(d, bid))} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 className="h2">{bsName(baustelle(d, bid))}</h2>
          <ul className="liste">
            {offen.filter((h) => h.baustelleId === bid).map((h) => {
              const an = !weg.includes(h.id);
              return (
                <li key={h.id}>
                  <button type="button" className="zeile" aria-pressed={an} style={{ width: '100%', cursor: 'pointer' }} onClick={() => setWeg(an ? [...weg, h.id] : weg.filter((x) => x !== h.id))}>
                    <Haken an={an} />
                    <span className="wachs">
                      <span className="fett">{h.name}</span>
                      <span className="klein">{h.nu ? h.firma : 'Eigener Helfer (Fa. Baumann)'} · {tm(h.datum)} · {h.von}–{h.bis} · {stunden(helferStunden(h))}</span>
                      {h.warnung && <span className="warn" style={{ fontSize: 14 }}>{h.warnung}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <Fueller />
      {offen.length > 0 && <Knopf farbe="gruen" gesperrt={offen.length === weg.length} onClick={() => { a.gegenzeichnen(offen.filter((h) => !weg.includes(h.id)).map((h) => h.id)); setWeg([]); }}>{offen.length - weg.length} gegenzeichnen</Knopf>}
    </Seite>
  );
}

const ANTRAG_TEXT: Record<Antrag['art'], string> = { urlaub: 'Urlaub', konto: 'Frei vom Konto', krank: 'Krank', arbeitsbefreiung: 'Arbeitsbefreiung', betriebsurlaub: 'Betriebsurlaub' };
const STATUS_TEXT: Record<Antrag['status'], string> = { offen: 'bei der Oberbauleitung', bauleitung_ok: 'Oberbauleitung ok, liegt bei der Geschäftsleitung', abgelehnt: 'abgelehnt', genehmigt: 'genehmigt', gemeldet: 'gemeldet' };

/** B6: Urlaub und Anträge */
export function BUrlaub() {
  const { d, ich } = useIch();
  const offen = offeneAntraege(d, ich.id);
  const rest = antraegeFuerBauleitung(d, ich.id).filter((a) => !offen.includes(a));
  return (
    <Seite titel="Urlaub" menue="urlaub">
      <h1 className="h1 gross">Urlaub und Anträge</h1>
      <div className="hinweis blau">Anträge entscheidet die Oberbauleitung ({voll(person(d, d.oberbauleitungId))}). Du siehst die Anträge deiner Leute zur Info.</div>
      <h2 className="h2">Noch nicht entschieden ({offen.length})</h2>
      {offen.length === 0 ? <div className="hinweis gruen"><strong>Nichts offen.</strong></div> : (
        <ul className="liste">
          {offen.map((a) => (
            <li key={a.id}>
              <Link to={`/b/antrag/${a.id}`} className="zeile" style={{ minHeight: 60 }}>
                <span className="wachs"><span className="name">{voll(person(d, a.personId))}</span><span className="klein">{ANTRAG_TEXT[a.art]} · {tm(a.von)}–{tm(a.bis)} · {a.art === 'konto' ? stunden(a.stunden ?? 0) : `${a.tage} Tage`} · {STATUS_TEXT[a.status]}</span></span>
                <Weiter />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h2 className="h2">Schon entschieden</h2>
      <ul className="liste">
        {rest.map((a) => (
          <li key={a.id} className="zeile">
            <span className="wachs"><span className="fett">{voll(person(d, a.personId))}</span><span className="klein">{ANTRAG_TEXT[a.art]} · {tm(a.von)}–{tm(a.bis)}</span></span>
            <span className={a.status === 'abgelehnt' ? 'warn' : 'ok'} style={{ fontSize: 14, textAlign: 'right' }}>{STATUS_TEXT[a.status]}</span>
          </li>
        ))}
      </ul>
      <p className="text">Krankmeldungen gehen direkt an die Lohnbuchhaltung. Du siehst nur, wer bis wann fehlt.</p>
    </Seite>
  );
}

/** B7: einen Antrag entscheiden – Überschneidung in der Kolonne zeigen */
export function BAntrag() {
  const { id = '' } = useParams();
  const { d } = useIch();
  const x = d.antraege.find((y) => y.id === id);
  if (!x) return <Navigate to="/b/urlaub" replace />;
  const p = person(d, x.personId);
  const bs = einteilungAm(d, p.id, d.heute);
  const kolonne = new Set(d.einteilung.filter((e) => e.baustelleId === bs?.id && e.datum === d.heute).map((e) => e.personId));
  const gleichzeitig = d.antraege.filter((y) => y.id !== x.id && kolonne.has(y.personId) && y.art !== 'krank' && y.status !== 'abgelehnt' && y.von <= x.bis && y.bis >= x.von);
  const rest = urlaubRest(d, p.id);
  return (
    <Seite titel="Antrag" menue="urlaub">
      <Zurueck to="/b/urlaub">Urlaub</Zurueck>
      <div className="kopfzeilen"><span className="unter">{ANTRAG_TEXT[x.art]} · gestellt {tm(x.gestellt.slice(0, 10))}</span><h1 className="h1">{voll(p)}</h1></div>
      <section className="karte pad" aria-label="Antrag">
        <span className="zahl" style={{ fontSize: 22 }}>{tagLang(x.von)} – {tagLang(x.bis)}</span>
        <span className="unter">{x.art === 'konto' ? `${stunden(x.stunden ?? 0)} vom Konto` : `${x.tage} Arbeitstage · danach noch ${rest.rest} Tage Resturlaub`}</span>
        <span className="unter">Baustelle {bsName(bs)}</span>
      </section>
      {gleichzeitig.length > 0 ? (
        <div className="hinweis orange"><strong>Gleichzeitig frei in der Kolonne:</strong> {gleichzeitig.map((y) => `${voll(person(d, y.personId))} (${tm(y.von)}–${tm(y.bis)})`).join(', ')}</div>
      ) : <div className="hinweis gruen">Niemand aus der Kolonne ist in dieser Zeit frei.</div>}
      <div className="hinweis blau">Status: <strong>{STATUS_TEXT[x.status]}</strong>{x.ablehnGrund ? ` · Grund: ${x.ablehnGrund}` : ''}</div>
      <Fueller />
      <span className="klein">Entscheiden muss die Oberbauleitung ({voll(person(d, d.oberbauleitungId))}). Passt der Zeitraum nicht zur Baustelle, sag ihr Bescheid.</span>
    </Seite>
  );
}

/** B8: Meine Zeit (angestellt, ohne Ortung) */
export function BMeineZeit() {
  const { d, ich, a, jetzt } = useIch();
  void jetzt;
  const r = rechnung(d, ich.id, d.heute);
  const gestern = werktag(d.heute, -1);
  const rg = rechnung(d, ich.id, gestern);
  const tg = tagVon(d, ich.id, gestern);
  const knopf = (art: 'beginn' | 'pause' | 'weiter' | 'ende', text: string, farbe = 'blau') => <Knopf farbe={farbe} klasse="mittel" onClick={() => a.stempeln(art)}>{text}</Knopf>;
  return (
    <Seite titel="Meine Zeit" menue="heute">
      <Zurueck to="/b/heute">Heute</Zurueck>
      <h1 className="h1">Meine Zeit</h1>
      <section aria-label="Heute" className="karte pad">
        <span className="fett klein" style={{ color: 'var(--blau-dunkel)' }}>Heute · {tagLang(d.heute)}</span>
        <span className="zahl" style={{ fontSize: 26 }}>{stunden(r.arbeitMin / 60)}</span>
        <span className="unter">{r.zustand === 'aus' ? 'Noch nicht gestempelt' : r.gueltig.map((s) => `${artName(s.art)} ${uhr(s.zeit)}`).join(' · ')}</span>
        {r.zustand === 'aus' && knopf('beginn', 'Arbeitsbeginn')}
        {r.zustand === 'arbeit' && <div className="zwei">{knopf('pause', 'Pause', 'rahmen')}{knopf('ende', 'Feierabend', 'dunkel')}</div>}
        {r.zustand === 'pause' && knopf('weiter', 'Pause beenden', 'gruen')}
        {r.zustand === 'fertig' && <span className="ok">Feierabend gestempelt</span>}
      </section>
      <section aria-label="Gestern" className="karte pad">
        <span className="fett klein" style={{ color: 'var(--blau-dunkel)' }}>{wtKurz(gestern)} {tm(gestern)}</span>
        <span>{rg.gueltig.length ? `${rg.beginn ? uhr(rg.beginn.zeit) : '–'}–${rg.ende ? uhr(rg.ende.zeit) : '–'} · Pause ${Math.round(rg.pauseMin)} Min. · ${stunden(rg.arbeitMin / 60)}` : 'Keine Zeiten'}</span>
        {tg?.status === 'offen' && rg.zustand === 'fertig' ? <Knopf farbe="gruen" klasse="mittel" onClick={() => a.eigenenTagSenden(gestern)}>An die Oberbauleitung senden</Knopf>
          : tg?.anOberbauleitung ? <span className="ok">An die Oberbauleitung gesendet</span> : null}
      </section>
      <p className="text">Als Angestellter stempelst du ohne Standort. Mehrstunden laufen auf dein Mehrstundenkonto.</p>
    </Seite>
  );
}

/** B9: meine Baustellen */
export function BBaustellen() {
  const { d, ich } = useIch();
  return (
    <Seite titel="Baustellen" menue="baustelle">
      <h1 className="h1 gross">Baustellen</h1>
      <ul className="liste">
        {baustellenVonBauleitung(d, ich.id).map((b) => (
          <li key={b.id}>
            <Link to={`/b/baustelle/${b.id}`} className="zeile" style={{ minHeight: 60 }}>
              <span className="wachs"><span className="name">{bsName(b)}</span><span className="klein">{b.plzOrt}{b.polierId ? ` · Polier ${person(d, b.polierId).nachname}` : ''}</span></span>
              <Weiter />
            </Link>
          </li>
        ))}
      </ul>
    </Seite>
  );
}

/** B10: eine Baustelle mit Stunden, Kosten und Nachträgen */
export function BBaustelle() {
  const { id = '' } = useParams();
  const { d } = useIch();
  const b = baustelle(d, id);
  if (!b) return <Navigate to="/b/baustellen" replace />;
  const nt = d.nachtraege.filter((n) => n.baustelleId === b.id);
  const beauftragt = nt.filter((n) => n.status === 'beauftragt').reduce((s, n) => s + nachtragSumme(n), 0);
  return (
    <Seite titel={`Baustelle ${b.kst}`} menue="baustelle">
      <Zurueck to="/b/baustellen">Baustellen</Zurueck>
      <div className="kopfzeilen"><h1 className="h1">{bsName(b)}</h1><span className="unter">{bsLang(b)}</span></div>
      <StundenKarte d={d} b={b} />
      <Link to={`/b/kosten/${b.id}`} className="zeile karte" style={{ minHeight: 56, padding: '8px 16px' }}>
        <span className="wachs"><span className="fett">Kosten</span><span className="klein">{euro(b.gesamtIst)} von {euro(b.gesamtSoll)}</span></span><Weiter />
      </Link>
      <h2 className="h2">Nachträge</h2>
      <ul className="liste">
        {nt.map((n) => (
          <li key={n.id} className="zeile">
            <span className="wachs"><span className="fett">{n.nr} · {n.bezeichnung}</span><span className="klein">{tm(n.datum)} · {n.status}{n.stunden ? ` · ${n.stunden} h` : ''}</span></span>
            <span className="tab fett">{euroAbw(nachtragSumme(n))}</span>
          </li>
        ))}
        {nt.length === 0 && <li className="zeile klein">Noch keine Nachträge.</li>}
      </ul>
      {nt.length > 0 && <span className="unter">Beauftragt zusammen: {euroAbw(beauftragt)}</span>}
      <Link to={`/b/nachtrag/${b.id}`} className="knopf rahmen mittel">Nachtrag anlegen</Link>
    </Seite>
  );
}

/** B11: Nachtrag anlegen */
export function BNachtrag() {
  const { id = '' } = useParams();
  const { d, a } = useIch();
  const nav = useNavigate();
  const b = baustelle(d, id);
  const nr = `NT ${String(d.nachtraege.filter((n) => n.baustelleId === id).length + 1).padStart(2, '0')}`;
  const [f, setF] = useState({ bezeichnung: '', lohn: '', material: '', geraete: '', nu: '', stunden: '' });
  const [status, setStatus] = useState<Nachtrag['status']>('angeboten');
  const [fehler, setFehler] = useState('');
  if (!b) return <Navigate to="/b/baustellen" replace />;
  const zahl = (s: string) => Number(s.replace(/\./g, '').replace(',', '.')) || 0;
  const feld = (k: keyof typeof f, label: string, mode: 'text' | 'decimal' = 'decimal') => (
    <div className="feld"><label htmlFor={k}>{label}</label><input id={k} className="eingabe" inputMode={mode} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  const summe = zahl(f.lohn) + zahl(f.material) + zahl(f.geraete) + zahl(f.nu);
  return (
    <Seite titel="Nachtrag anlegen" menue="baustelle">
      <Zurueck to={`/b/baustelle/${b.id}`}>{bsName(b)}</Zurueck>
      <h1 className="h1">{nr} anlegen</h1>
      {feld('bezeichnung', 'Bezeichnung', 'text')}
      <div className="zwei">{feld('lohn', 'Lohn €')}{feld('material', 'Material €')}</div>
      <div className="zwei">{feld('geraete', 'Geräte €')}{feld('nu', 'Nachunternehmer €')}</div>
      {feld('stunden', 'Stunden')}
      <Auswahl label="Status" spalten={3} klein wert={status} setWert={setStatus} optionen={[{ wert: 'angeboten' as const, text: 'angeboten' }, { wert: 'beauftragt' as const, text: 'beauftragt' }, { wert: 'abgelehnt' as const, text: 'abgelehnt' }]} />
      <span className="fett">Summe {euroAbw(summe)}</span>
      {fehler && <div role="alert" className="hinweis rot">{fehler}</div>}
      <Fueller />
      <Knopf onClick={() => {
        if (!f.bezeichnung.trim()) return setFehler('Bitte eine Bezeichnung eingeben.');
        a.nachtragAnlegen({ baustelleId: b.id, nr, bezeichnung: f.bezeichnung.trim(), datum: d.heute, status, lohn: zahl(f.lohn), material: zahl(f.material), geraete: zahl(f.geraete), nu: zahl(f.nu), stunden: zahl(f.stunden) });
        nav(`/b/baustelle/${b.id}`);
      }}>Speichern</Knopf>
    </Seite>
  );
}

/** B12: Mehr für die Bauleitung */
export function BMehr() {
  const { abmelden } = useDaten();
  const nav = useNavigate();
  const gruppen = [
    { titel: 'Für mich', punkte: [
      { text: 'Meine Zeit', to: '/b/meine-zeit' },
      { text: 'Mein Mehrstundenkonto', to: '/ma/konto' },
      { text: 'Meine Anträge', to: '/ma/antraege' },
    ] },
    { titel: 'Baustellen', punkte: [{ text: 'Helfer und NU gegenzeichnen', to: '/b/gegenzeichnen' }] },
    { titel: 'Am PC', punkte: [{ text: 'PC-Ansicht öffnen (Disposition, Auswertungen)', to: '/pc/bl' }] },
    { titel: 'Hilfe', punkte: [{ text: 'Hilfe', to: '/hilfe' }, { text: 'Häufige Fragen', to: '/faq' }, { text: 'Einführung ansehen', to: '/intro' }, { text: 'Datenschutz', to: '/datenschutz' }] },
    { titel: 'Sicherheit', punkte: [{ text: 'Mitteilungen', to: '/ma/mitteilungen' }, { text: 'PIN ändern', to: '/ma/pin' }, { text: 'Meine Geräte', to: '/ma/geraete' }] },
  ];
  return (
    <Seite titel="Mehr" menue="mehr">
      <h1 className="h1 gross">Mehr</h1>
      <MehrListe gruppen={gruppen} />
      <div className="hinweis blau"><strong>Disposition und Auswertungen</strong> gibt es nur am PC.</div>
      <Demo abmelden={() => { abmelden(); nav('/'); }} />
    </Seite>
  );
}
