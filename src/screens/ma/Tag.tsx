// Mitarbeiter: Tag prüfen in drei Schritten, Gesendet, Korrektur vom Polier (T1–T5)

import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Fueller, Seite, Zurueck } from '../../components/Rahmen';
import { Erledigt, Haken, Knopf, ZuschlagInfo } from '../../components/Teile';
import { useIch } from '../../domain/store';
import { baustelleVonTag, bsName, hatZuschlaege, kontoStand, person, rechnung, tagVon, voll } from '../../domain/sel';
import type { ZuschlagEintrag } from '../../domain/types';
import { artName, sollFuer, stunden, tagLang, uhr, vorzeichen } from '../../domain/zeit';
import { ZUSCHLAEGE } from '../../domain/zuschlaege';

function Schritte({ n, von }: { n: number; von: number }) {
  return (
    <div aria-hidden="true" className="schritte" style={{ gridTemplateColumns: `repeat(${von}, minmax(0, 1fr))` }}>
      {Array.from({ length: von }, (_, i) => <span key={i} className={i < n ? 'an' : ''} />)}
    </div>
  );
}

/** T1: Zeiten des Tages */
export function TagPruefen() {
  const { datum = '' } = useParams();
  const { d, ich } = useIch();
  const r = rechnung(d, ich.id, datum);
  const tag = tagVon(d, ich.id, datum);
  const mitZ = hatZuschlaege(ich);
  if (tag && tag.status !== 'offen') return <Navigate to={`/ma/gesendet/${datum}`} replace />;
  const soll = sollFuer(ich, datum);
  const ist = r.arbeitMin / 60;
  const unfertig = r.zustand !== 'fertig';
  return (
    <Seite titel="Tag prüfen" menue="stempeln">
      <div className="kopfzeilen" style={{ gap: 6 }}>
        <span className="fett klein">Schritt 1 von {mitZ ? 3 : 2} · Zeiten</span>
        <Schritte n={1} von={mitZ ? 3 : 2} />
        <h1 className="h1" style={{ marginTop: 4 }}>{tagLang(datum)}</h1>
      </div>
      <ol aria-label="Zeiten des Tages" className="liste">
        {r.gueltig.map((s) => (
          <li key={s.id} className="zeile">
            <span className="fett tab" style={{ width: 56 }}>{uhr(s.zeit)}</span>
            <span style={{ flexGrow: 1 }}>{artName(s.art)}{s.herkunft === 'korrektur' ? ' (vom Polier)' : ''}</span>
            {s.standort === 'passt' && <span className="ok" style={{ fontSize: 14 }}>Standort passt</span>}
            {s.standort === 'weicht_ab' && <span className="warn" style={{ fontSize: 14 }}>weicht ab, begründet</span>}
          </li>
        ))}
        {r.gueltig.length === 0 && <li className="zeile klein">Für diesen Tag ist nichts gestempelt.</li>}
      </ol>
      <section aria-label="Summe" className="karte drei mitte" style={{ padding: '14px 16px', display: 'grid' }}>
        <div className="kopfzeilen"><span className="klein">Gearbeitet</span><span className="zahl" style={{ fontSize: 22 }}>{stunden(ist)}</span></div>
        <div className="kopfzeilen"><span className="klein">Soll</span><span className="zahl" style={{ fontSize: 22 }}>{stunden(soll)}</span></div>
        <div className="kopfzeilen"><span className="klein">Konto</span><span className="zahl" style={{ fontSize: 22 }}>{vorzeichen(ist - soll)}</span></div>
      </section>
      {r.pauseFehlt && <div className="hinweis orange"><strong>Zu wenig Pause.</strong> Ab 6 h sind 30 Min., ab 9 h 45 Min. Pause Pflicht. Der Polier bekommt einen Hinweis.</div>}
      {unfertig && <div className="hinweis orange"><strong>Der Tag ist noch nicht beendet.</strong> Stempel zuerst das Arbeitsende oder melde es als vergessen.</div>}
      <Link to="/ma/vergessen" className="link">Eine Zeit fehlt oder ist falsch</Link>
      <Fueller />
      {unfertig ? <Link to="/ma/heute" className="knopf rahmen">Zum Stempeln</Link> : (
        <Link to={mitZ ? `/ma/tag/${datum}/zuschlaege` : `/ma/tag/${datum}/fahrt`} className="knopf blau">Weiter: {mitZ ? 'Zuschläge' : 'Fahrt'}</Link>
      )}
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
  const konflikt = Object.keys(wahl).flatMap((id) => ZUSCHLAEGE.find((z) => z.id === id)!.nichtMit.filter((x) => wahl[x]).map((x) => [id, x]));

  const weiter = () => {
    const eintraege: ZuschlagEintrag[] = Object.entries(wahl).map(([art, w], i) => ({ id: `z${i}${art}`, art, typ: w.typ, stunden: zahl(w.h), entscheidung: 'offen' }));
    a.zuschlaegeSetzen(datum, eintraege);
    nav(`/ma/tag/${datum}/fahrt`);
  };

  return (
    <Seite titel="Zuschläge" menue="stempeln">
      <div className="kopfzeilen" style={{ gap: 6 }}>
        <span className="fett klein">Schritt 2 von 3 · Zuschläge</span>
        <Schritte n={2} von={3} />
        <h1 className="h1" style={{ marginTop: 4 }}>Was ist heute angefallen?</h1>
        <span className="unter">Die häufigsten auf deiner Baustelle</span>
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
              <Haken an={an} /><span>{z.name}</span>
            </button>
            <div style={{ padding: '0 16px 10px 52px', marginTop: -10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ZuschlagInfo art={z.id} />
              {an && (
                <>
                  {z.typen.length > 0 && (
                    <div className="feld">
                      <label htmlFor={`${z.id}-typ`} style={{ fontWeight: 400 }}>Welche Art?</label>
                      <select id={`${z.id}-typ`} className="eingabe" style={{ height: 44, fontSize: 16 }} value={wahl[z.id].typ} onChange={(e) => setWahl({ ...wahl, [z.id]: { ...wahl[z.id], typ: e.target.value } })}>
                        {z.typen.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label htmlFor={`${z.id}-h`} style={{ fontSize: 15 }}>Stunden</label>
                    <input id={`${z.id}-h`} className="eingabe" style={{ width: 90, height: 44 }} inputMode="decimal" value={wahl[z.id].h} onChange={(e) => setWahl({ ...wahl, [z.id]: { ...wahl[z.id], h: e.target.value } })} />
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
      {!alle && <button type="button" className="link" onClick={() => setAlle(true)}>Weitere Zuschläge anzeigen ({weitere})</button>}
      {zuViel && <div className="hinweis orange">Ein Zuschlag hat mehr Stunden als dein Arbeitstag ({stunden(istH)}).</div>}
      {konflikt.length > 0 && <div className="hinweis orange">Einige Zuschläge gibt es nicht zusammen für dieselbe Zeit. Lies dazu „Wann gibt es das?“. Der Polier prüft das.</div>}
      <p className="text" style={{ fontSize: 14 }}>Zuschläge gibt es nur für die Stunden, in denen du die Arbeit wirklich machst, und nur mit der vorgeschriebenen Schutzausrüstung. Grundlage: § 6 Rahmentarifvertrag Bau.</p>
      <Fueller />
      <p className="klein" style={{ margin: 0 }}>Der Polier prüft deine Zuschläge.</p>
      <Knopf gesperrt={zuViel} onClick={weiter}>{n === 0 ? 'Weiter ohne Zuschlag' : n === 1 ? 'Weiter mit 1 Zuschlag' : `Weiter mit ${n} Zuschlägen`}</Knopf>
    </Seite>
  );
}

/** T3: Wegezeit, Verpflegung, Übernachtung – rechnet die Lohnbuchhaltung, die App erfasst sie zur Kontrolle */
export function Fahrt() {
  const { datum = '' } = useParams();
  const { d, ich, a } = useIch();
  const nav = useNavigate();
  const tag = tagVon(d, ich.id, datum);
  const mitZ = hatZuschlaege(ich);
  const [weg, setWeg] = useState(tag?.wegezeitMin ?? 0);
  const [verpf, setVerpf] = useState(tag?.verpflegung ?? false);
  const [ueber, setUeber] = useState(tag?.uebernachtung ?? false);
  const bs = baustelleVonTag(d, ich.id, datum);
  const polier = bs?.polierId ? person(d, bs.polierId) : undefined;
  return (
    <Seite titel="Fahrt und Verpflegung" menue="stempeln">
      <Zurueck to={mitZ ? `/ma/tag/${datum}/zuschlaege` : `/ma/tag/${datum}`}>{mitZ ? 'Zuschläge' : 'Zeiten'}</Zurueck>
      <div className="kopfzeilen" style={{ gap: 6 }}>
        <span className="fett klein">Schritt {mitZ ? 3 : 2} von {mitZ ? 3 : 2} · Fahrt</span>
        <Schritte n={mitZ ? 3 : 2} von={mitZ ? 3 : 2} />
        <h1 className="h1" style={{ marginTop: 4 }}>Fahrt und Verpflegung</h1>
      </div>
      <div className="feld">
        <label htmlFor="weg">Wegezeit (Hin- und Rückfahrt)</label>
        <select id="weg" className="eingabe" value={weg} onChange={(e) => setWeg(Number(e.target.value))}>
          {[0, 15, 30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m === 0 ? 'keine' : `${m} Min.`}</option>)}
        </select>
      </div>
      {[['Verpflegungszuschuss', verpf, setVerpf], ['Übernachtung auswärts', ueber, setUeber]].map(([text, an, set]) => (
        <button key={text as string} type="button" className="karte" aria-pressed={an as boolean} onClick={() => (set as (b: boolean) => void)(!(an as boolean))}
          style={{ minHeight: 56, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 17, fontWeight: 700, textAlign: 'left', cursor: 'pointer', border: an ? '2px solid var(--blau)' : undefined }}>
          <Haken an={an as boolean} />{text as string}
        </button>
      ))}
      <p className="text">Ob und wie viel es gibt, rechnet die Lohnbuchhaltung. Die App erfasst es nur zur Kontrolle.</p>
      <Fueller />
      <Knopf onClick={() => { a.fahrtSetzen(datum, { wegezeitMin: weg, verpflegung: verpf, uebernachtung: ueber }); a.tagSenden(datum); nav(`/ma/gesendet/${datum}`, { replace: true }); }}>
        Tag an {polier ? `Polier ${polier.vorname}` : 'den Polier'} senden
      </Knopf>
    </Seite>
  );
}

/** T4: Tag gesendet – Status in der Freigabe-Kette */
export function Gesendet() {
  const { datum = '' } = useParams();
  const { d, ich } = useIch();
  const tag = tagVon(d, ich.id, datum);
  const bs = baustelleVonTag(d, ich.id, datum);
  const polier = bs?.polierId ? person(d, bs.polierId) : undefined;
  const stufen = [
    { text: 'Von dir gesendet', an: true },
    { text: `Polier ${polier ? voll(polier) : ''}`, an: tag?.status === 'bei_bauleitung' || tag?.status === 'freigegeben' },
    { text: 'Bauleitung', an: tag?.status === 'freigegeben' },
    { text: 'Lohnbuchhaltung', an: tag?.status === 'freigegeben' },
  ];
  return (
    <Seite titel="Tag gesendet" menue="stempeln">
      <Fueller />
      <Erledigt titel={`${tagLang(datum)} ist gesendet`}>
        <p className="text" style={{ textAlign: 'center' }}>{bsName(bs)} · {stunden(rechnung(d, ich.id, datum).arbeitMin / 60)}. Ändert jemand etwas, siehst du es hier und kannst widersprechen.</p>
      </Erledigt>
      <ol className="liste" aria-label="Stand der Freigabe">
        {stufen.map((s) => (
          <li key={s.text} className="zeile"><Haken an={s.an} /><span style={{ fontSize: 16 }}>{s.text}</span></li>
        ))}
      </ol>
      <section className="karte pad" aria-label="Konto">
        <span className="unter">Arbeitszeitkonto nach diesem Tag</span>
        <span className="zahl" style={{ fontSize: 22 }}>{stunden(kontoStand(d, ich.id))}</span>
      </section>
      <Fueller />
      <Link to="/ma/heute" className="knopf blau">Fertig</Link>
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
    <Seite titel="Korrektur vom Polier" menue="stempeln">
      <Zurueck to="/ma/heute">Stempeln</Zurueck>
      <div className="kopfzeilen">
        <h1 className="h1">Korrektur vom Polier</h1>
        <span className="unter">{tagLang(tag.datum)} · {voll(von)}</span>
      </div>
      <section className="hinweis orange" aria-label="Was geändert wurde">
        <strong>{k.was}</strong><br />Grund: „{k.grund}“
      </section>
      <section className="karte pad" aria-label="Der Tag jetzt">
        <span className="unter">Der Tag jetzt</span>
        <span className="fett" style={{ fontSize: 17 }}>{r.beginn && uhr(r.beginn.zeit)} bis {r.ende && uhr(r.ende.zeit)} · Pause {Math.round(r.pauseMin)} Min.</span>
        <span className="unter">{stunden(r.arbeitMin / 60)} gearbeitet</span>
      </section>
      {k.antwort ? (
        <div className="hinweis gruen"><strong>{k.antwort === 'bestaetigt' ? 'Du hast bestätigt.' : 'Du hast widersprochen.'}</strong> {k.antwort === 'widerspruch' ? 'Die Bauleitung entscheidet.' : ''}</div>
      ) : widerspruch ? (
        <>
          <div className="feld"><label htmlFor="wtext">Was stimmt nicht? (Pflicht)</label><textarea id="wtext" className="eingabe" rows={3} value={text} onChange={(e) => setText(e.target.value)} /></div>
          <Fueller />
          <Knopf farbe="rot" gesperrt={text.trim().length < 3} onClick={() => a.korrekturAntworten(tag.id, k.id, 'widerspruch', text.trim())}>Widerspruch senden</Knopf>
        </>
      ) : (
        <>
          <p className="text">Antwortest du nicht, erinnert dich die App. Danach entscheidet der Polier mit dem Vermerk „ohne Rückmeldung“. Widersprechen kannst du auch später noch.</p>
          <Fueller />
          <div className="zwei">
            <Knopf farbe="rahmen-rot" onClick={() => setWiderspruch(true)}>Widersprechen</Knopf>
            <Knopf farbe="gruen" onClick={() => a.korrekturAntworten(tag.id, k.id, 'bestaetigt')}>Stimmt so</Knopf>
          </div>
        </>
      )}
    </Seite>
  );
}
