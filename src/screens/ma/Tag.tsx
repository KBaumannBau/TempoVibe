// Mitarbeiter: Tagesabschluss nach dem Arbeitsende: 1. Zuschläge, 2. Tag prüfen und senden; Gesendet, Korrektur vom Polier.
// Fahrtkosten, Verpflegung und Wegezeit ermittelt das Backoffice aus Stempelzeiten und Entfernungen.

import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Fueller, Seite, Zurueck } from '../../components/Rahmen';
import { Erledigt, Haken, Knopf, ZuschlagInfo } from '../../components/Teile';
import { useIch } from '../../domain/store';
import { baustelleVonTag, bsName, hatZuschlaege, kontoStand, person, rechnung, tagVon, voll } from '../../domain/sel';
import type { ZuschlagEintrag } from '../../domain/types';
import { artName, sollFuer, stunden, tagLang, uhr, vorzeichen } from '../../domain/zeit';
import { ZUSCHLAEGE, konflikte, zuschlagArt } from '../../domain/zuschlaege';
import { tx } from '../../i18n';

function Schritte({ n, von }: { n: number; von: number }) {
  return (
    <div aria-hidden="true" className="schritte" style={{ gridTemplateColumns: `repeat(${von}, minmax(0, 1fr))` }}>
      {Array.from({ length: von }, (_, i) => <span key={i} className={i < n ? 'an' : ''} />)}
    </div>
  );
}

/** Einstieg Tagesabschluss: mit Zuschlägen zuerst die Zuschläge, sonst gleich prüfen */
export function TagAbschluss() {
  const { datum = '' } = useParams();
  const { ich } = useIch();
  return hatZuschlaege(ich) ? <Zuschlaege /> : <Navigate to={`/ma/tag/${datum}/pruefen`} replace />;
}

/** Hinweis, solange das Arbeitsende fehlt */
function NichtBeendet() {
  return <>
    <div className="hinweis orange"><strong>{tx("Der Tag ist noch nicht beendet.")}</strong> {' '}{tx("Stempel zuerst das Arbeitsende oder melde es als vergessen.")}</div>
    <Link to="/ma/vergessen" className="link">{tx("Eine Zeit fehlt oder ist falsch")}</Link>
    <Fueller />
    <Link to="/ma/heute" className="knopf rahmen">{tx("Zum Stempeln")}</Link>
  </>;
}

/** Letzter Schritt: Zeiten und Zuschläge prüfen, dann an den Polier senden */
export function TagPruefen() {
  const { datum = '' } = useParams();
  const { d, ich, a } = useIch();
  const nav = useNavigate();
  const bs = baustelleVonTag(d, ich.id, datum);
  const polier = bs?.polierId ? person(d, bs.polierId) : undefined;
  const r = rechnung(d, ich.id, datum);
  const tag = tagVon(d, ich.id, datum);
  const mitZ = hatZuschlaege(ich);
  if (tag && tag.status !== 'offen') return <Navigate to={`/ma/gesendet/${datum}`} replace />;
  const soll = sollFuer(ich, datum);
  const ist = r.arbeitMin / 60;
  const unfertig = r.zustand !== 'fertig';
  return (
    <Seite titel={tx("Tag prüfen")} menue="stempeln">
      {mitZ && <Zurueck to={`/ma/tag/${datum}`}>{tx("Zuschläge")}</Zurueck>}
      <div className="kopfzeilen" style={{ gap: 6 }}>
        {mitZ && <span className="fett klein">{tx("Schritt 2 von 2 · Tag prüfen")}</span>}
        {mitZ && <Schritte n={2} von={2} />}
        <h1 className="h1" style={{ marginTop: 4 }}>{tagLang(datum)}</h1>
      </div>
      {tag?.nachgetragenVon && <div className="hinweis blau">{tx("Dein Polier {0} hat diese Zeiten nachgetragen. Prüfe sie und sende den Tag.", voll(person(d, tag.nachgetragenVon)))}</div>}
      <ol aria-label={tx("Zeiten des Tages")} className="liste">
        {r.gueltig.map((s) => (
          <li key={s.id} className="zeile">
            <span className="fett tab" style={{ width: 56 }}>{uhr(s.zeit)}</span>
            <span style={{ flexGrow: 1 }}>{s.raucher ? tx("Raucherpause") : artName(s.art)}{s.herkunft === 'korrektur' ? tx(" (vom Polier)") : ''}</span>
            {s.standort === 'passt' && <span className="ok" style={{ fontSize: 14 }}>{tx("Standort passt")}</span>}
            {s.standort === 'weicht_ab' && <span className="warn" style={{ fontSize: 14 }}>{tx("weicht ab, begründet")}</span>}
          </li>
        ))}
        {r.gueltig.length === 0 && <li className="zeile klein">{tx("Für diesen Tag ist nichts gestempelt.")}</li>}
      </ol>
      <section aria-label={tx("Summe")} className="karte drei mitte" style={{ padding: '14px 16px', display: 'grid' }}>
        <div className="kopfzeilen"><span className="klein">{tx("Gearbeitet")}</span><span className="zahl" style={{ fontSize: 22 }}>{stunden(ist)}</span></div>
        <div className="kopfzeilen"><span className="klein">{tx("Soll")}</span><span className="zahl" style={{ fontSize: 22 }}>{stunden(soll)}</span></div>
        <div className="kopfzeilen"><span className="klein">{tx("Konto")}</span><span className="zahl" style={{ fontSize: 22 }}>{vorzeichen(ist - soll)}</span></div>
      </section>
      {r.pauseAutoMin > 0 && <div className="hinweis orange"><strong>{tx("Zu wenig Pause.")}</strong> {' '}{tx("Ab 6 Stunden Arbeit sind 30 Minuten Pause Pflicht, ab 9 Stunden 45 Minuten. Deshalb wurden {0} Min. automatisch von deiner Arbeitszeit abgezogen.", r.pauseAutoMin)}</div>}
      {unfertig ? <NichtBeendet /> : <>
        {mitZ && (
          <section aria-label={tx("Zuschläge")} className="karte pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="fett">{tx("Zuschläge")}</span>
              <Link to={`/ma/tag/${datum}`} className="link">{tx("ändern")}</Link>
            </div>
            {(tag?.zuschlaege ?? []).length === 0
              ? <span className="unter">{tx("keine")}</span>
              : (tag?.zuschlaege ?? []).map((z) => <span key={z.id}>{tx(zuschlagArt(z.art).name)}{z.typ ? ` · ${tx(z.typ)}` : ''} · {stunden(z.stunden)}</span>)}
          </section>
        )}
        <Link to="/ma/vergessen" className="link">{tx("Eine Zeit fehlt oder ist falsch")}</Link>
        <p className="text" style={{ fontSize: 14 }}>{tx("Fahrtkosten, Verpflegung und Wegezeit trägst du nicht ein. Das ermittelt die Lohnbuchhaltung aus deinen Zeiten und der Baustelle.")}</p>
        <Fueller />
        <p className="klein" style={{ margin: 0 }}>{tx("Mit dem Senden bestätigst du, dass Beginn, Ende, Pausen und Zuschläge stimmen.")}</p>
        <Knopf onClick={() => { a.tagSenden(datum); nav(`/ma/gesendet/${datum}`, { replace: true }); }}>
          {tx("Tag an {0} senden", polier ? tx("Polier {0}", polier.vorname) : tx("den Polier"))}</Knopf>
      </>}
    </Seite>
  );
}

/** T2: Zuschläge nach § 6 BRTV, mit Erklärung je Zulage */
export function Zuschlaege() {
  const { datum = '' } = useParams();
  const { d, ich, a } = useIch();
  const nav = useNavigate();
  const tag = tagVon(d, ich.id, datum);
  const istH = rechnung(d, ich.id, datum).arbeitMin / 60;
  const [wahl, setWahl] = useState<Record<string, { typ?: string; h: string }>>(() =>
    Object.fromEntries((tag?.zuschlaege ?? []).map((z) => [z.art, { typ: z.typ, h: String(z.stunden).replace('.', ',') }])),
  );
  const [alle, setAlle] = useState(false);
  const liste = ZUSCHLAEGE.filter((z) => alle || z.oben || wahl[z.id]);
  const weitere = ZUSCHLAEGE.filter((z) => !z.oben).length;
  const n = Object.keys(wahl).length;
  const zahl = (s: string) => Number(s.replace(',', '.')) || 0;
  const zuViel = Object.values(wahl).some((w) => zahl(w.h) > istH + 0.01);
  const konflikt = konflikte(wahl);

  const weiter = () => {
    const eintraege: ZuschlagEintrag[] = Object.entries(wahl).map(([art, w], i) => ({ id: `z${i}${art}`, art, typ: w.typ, stunden: zahl(w.h), entscheidung: 'offen' }));
    a.zuschlaegeSetzen(datum, eintraege);
    nav(`/ma/tag/${datum}/pruefen`);
  };
  if (tag && tag.status !== 'offen') return <Navigate to={`/ma/gesendet/${datum}`} replace />;
  if (rechnung(d, ich.id, datum).zustand !== 'fertig') return (
    <Seite titel={tx("Zuschläge")} menue="stempeln">
      <h1 className="h1">{tagLang(datum)}</h1>
      <NichtBeendet />
    </Seite>
  );

  return (
    <Seite titel={tx("Zuschläge")} menue="stempeln">
      <div className="kopfzeilen" style={{ gap: 6 }}>
        <span className="fett klein">{tx("Schritt 1 von 2 · Zuschläge")}</span>
        <Schritte n={1} von={2} />
        <h1 className="h1" style={{ marginTop: 4 }}>{tx("Was ist heute angefallen?")}</h1>
        <span className="unter">{tx("Die häufigsten auf deiner Baustelle")}</span>
      </div>
      {liste.map((z) => {
        const an = !!wahl[z.id];
        return (
          <div key={z.id} className={`karte${an ? ' aktiv-rand' : ''}`}>
            <button type="button" aria-pressed={an} onClick={() => {
              const neu = { ...wahl };
              if (an) delete neu[z.id];
              else neu[z.id] = { typ: z.typen[0], h: '1' };
              setWahl(neu);
            }} style={{ minHeight: 56, width: '100%', background: 'transparent', border: 0, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 17, fontWeight: 700, textAlign: 'left', cursor: 'pointer' }}>
              <Haken an={an} /><span>{tx(z.name)}</span>
            </button>
            <div style={{ padding: '0 16px 10px 52px', marginTop: -10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ZuschlagInfo art={z.id} />
              {an && (
                <>
                  {z.typen.length > 0 && (
                    <div className="feld">
                      <label htmlFor={`${z.id}-typ`} style={{ fontWeight: 400 }}>{tx("Welche Art?")}</label>
                      <select id={`${z.id}-typ`} className="eingabe" style={{ height: 44, fontSize: 16 }} value={wahl[z.id].typ} onChange={(e) => setWahl({ ...wahl, [z.id]: { ...wahl[z.id], typ: e.target.value } })}>
                        {z.typen.map((t) => <option key={t} value={t}>{tx(t)}</option>)}
                      </select>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label htmlFor={`${z.id}-h`} style={{ fontSize: 15 }}>{tx("Stunden")}</label>
                    <input id={`${z.id}-h`} className="eingabe" style={{ width: 90, height: 44 }} inputMode="decimal" value={wahl[z.id].h} onChange={(e) => setWahl({ ...wahl, [z.id]: { ...wahl[z.id], h: e.target.value } })} />
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
      {!alle && <button type="button" className="link" onClick={() => setAlle(true)}>{tx("Weitere Zuschläge anzeigen ({0})", weitere)}</button>}
      {zuViel && <div className="hinweis orange">{tx("Ein Zuschlag hat mehr Stunden als dein Arbeitstag ({0}).", stunden(istH))}</div>}
      {konflikt.map(([x, y]) => <div key={x + y} className="hinweis orange">{tx("„{0}“ und „{1}“ gibt es nicht zusammen für dieselbe Zeit. Lies dazu „Wann gibt es das?“. Der Polier prüft das.", tx(zuschlagArt(x).name), tx(zuschlagArt(y).name))}</div>)}
      <p className="text" style={{ fontSize: 14 }}>{tx("Zuschläge gibt es nur für die Stunden, in denen du die Arbeit wirklich machst, und nur mit der vorgeschriebenen Schutzausrüstung. Grundlage: § 6 Rahmentarifvertrag Bau.")}</p>
      <Fueller />
      <p className="klein" style={{ margin: 0 }}>{tx("Der Polier prüft deine Zuschläge.")}</p>
      <Knopf gesperrt={zuViel} onClick={weiter}>{n === 0 ? tx("Weiter ohne Zuschlag") : n === 1 ? tx("Weiter mit 1 Zuschlag") : tx("Weiter mit {0} Zuschlägen", n)}</Knopf>
    </Seite>
  );
}

/** alte Links auf den früheren Schritt „Fahrt“ führen zum Prüfen */
export function AlteFahrt() {
  const { datum = '' } = useParams();
  return <Navigate to={`/ma/tag/${datum}/pruefen`} replace />;
}

/** T4: Tag gesendet – Status in der Freigabe-Kette */
export function Gesendet() {
  const { datum = '' } = useParams();
  const { d, ich } = useIch();
  const tag = tagVon(d, ich.id, datum);
  const bs = baustelleVonTag(d, ich.id, datum);
  const polier = bs?.polierId ? person(d, bs.polierId) : undefined;
  const stufen = [
    { text: tx("Von dir gesendet"), an: true },
    { text: tx("Polier {0}", polier ? voll(polier) : ''), an: tag?.status === 'bei_bauleitung' || tag?.status === 'freigegeben' },
    { text: tx("Bauleitung"), an: tag?.status === 'freigegeben' },
    { text: tx("Lohnbuchhaltung"), an: tag?.status === 'freigegeben' },
  ];
  return (
    <Seite titel={tx("Tag gesendet")} menue="stempeln">
      <Fueller />
      <Erledigt titel={tx("{0} ist gesendet", tagLang(datum))}>
        <p className="text" style={{ textAlign: 'center' }}>{tx("{0} · {1}. Ändert jemand etwas, siehst du es hier und kannst widersprechen.", bsName(bs), stunden(rechnung(d, ich.id, datum).arbeitMin / 60))}</p>
      </Erledigt>
      <ol className="liste" aria-label={tx("Stand der Freigabe")}>
        {stufen.map((s) => (
          <li key={s.text} className="zeile"><Haken an={s.an} /><span style={{ fontSize: 16 }}>{s.text}</span></li>
        ))}
      </ol>
      <section className="karte pad" aria-label={tx("Konto")}>
        <span className="unter">{tx("Arbeitszeitkonto nach diesem Tag")}</span>
        <span className="zahl" style={{ fontSize: 22 }}>{stunden(kontoStand(d, ich.id))}</span>
      </section>
      <Fueller />
      <Link to="/ma/heute" className="knopf blau">{tx("Fertig")}</Link>
    </Seite>
  );
}

/** T5: Korrektur vom Polier – bestätigen oder widersprechen */
export function Korrektur() {
  const { tagId = '' } = useParams();
  const { d, a } = useIch();
  const tag = d.tage.find((t) => t.id === tagId);
  const [text, setText] = useState('');
  const [widerspruch, setWiderspruch] = useState(false);
  if (!tag) return <Navigate to="/ma/heute" replace />;
  const k = tag.korrekturen.find((x) => !x.antwort) ?? tag.korrekturen[tag.korrekturen.length - 1];
  const r = rechnung(d, tag.personId, tag.datum);
  const von = person(d, k.von);
  return (
    <Seite titel={tx("Korrektur vom Polier")} menue="stempeln">
      <Zurueck to="/ma/heute">{tx("Stempeln")}</Zurueck>
      <div className="kopfzeilen">
        <h1 className="h1">{tx("Korrektur vom Polier")}</h1>
        <span className="unter">{tagLang(tag.datum)} · {voll(von)}</span>
      </div>
      <section className="hinweis orange" aria-label={tx("Was geändert wurde")}>
        <strong>{k.was}</strong><br />{tx("Grund: „{0}“", k.grund)}
      </section>
      <section className="karte pad" aria-label={tx("Der Tag jetzt")}>
        <span className="unter">{tx("Der Tag jetzt")}</span>
        <span className="fett" style={{ fontSize: 17 }}>{tx("{0} bis {1} · Pause {2} Min.", r.beginn && uhr(r.beginn.zeit), r.ende && uhr(r.ende.zeit), Math.round(r.pauseMin))}</span>
        <span className="unter">{tx("{0} gearbeitet", stunden(r.arbeitMin / 60))}</span>
      </section>
      {k.antwort ? (
        <div className="hinweis gruen"><strong>{k.antwort === 'bestaetigt' ? tx("Du hast bestätigt.") : tx("Du hast widersprochen.")}</strong> {k.antwort === 'widerspruch' ? tx("Die Bauleitung entscheidet.") : ''}</div>
      ) : widerspruch ? (
        <>
          <div className="feld"><label htmlFor="wtext">{tx("Was stimmt nicht? (Pflicht)")}</label><textarea id="wtext" className="eingabe" rows={3} value={text} onChange={(e) => setText(e.target.value)} /></div>
          <Fueller />
          <Knopf farbe="rot" gesperrt={text.trim().length < 3} onClick={() => a.korrekturAntworten(tag.id, k.id, 'widerspruch', text.trim())}>{tx("Widerspruch senden")}</Knopf>
        </>
      ) : (
        <>
          <p className="text">{tx("Antwortest du nicht, erinnert dich die App. Danach entscheidet der Polier mit dem Vermerk „ohne Rückmeldung“. Widersprechen kannst du auch später noch.")}</p>
          <Fueller />
          <div className="zwei">
            <Knopf farbe="rahmen-rot" onClick={() => setWiderspruch(true)}>{tx("Widersprechen")}</Knopf>
            <Knopf farbe="gruen" onClick={() => a.korrekturAntworten(tag.id, k.id, 'bestaetigt')}>{tx("Stimmt so")}</Knopf>
          </div>
        </>
      )}
    </Seite>
  );
}
