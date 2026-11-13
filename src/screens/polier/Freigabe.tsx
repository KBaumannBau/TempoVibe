// Polier: Start, Freigabe, Tag prüfen, Zeit korrigieren, Vorschläge (P1–P5 im Entwurf V2)

import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Fueller, Seite, Zurueck } from '../../components/Rahmen';
import { Auswahl, BaustelleWahl, Erledigt, Knopf, Weiter, ZuschlagInfo } from '../../components/Teile';
import { useIch } from '../../domain/store';
import {
  baustellenVonPolier, bsName, vorschlaegeFuerBauleitung, vorschlaegeFuerPolier, fristRueckmeldung, hinweiseTag, offeneKorrekturen, person, rechnung, stundenJeBaustelle, stundenTag, tageBeimPolier, voll, wartetAufPolier,
} from '../../domain/sel';
import type { Daten, Tag } from '../../domain/types';
import { artName, stunden, tagLang, tm, uhr } from '../../domain/zeit';
import { geltendeStunden, konflikte, zuschlagArt } from '../../domain/zuschlaege';

// Die eigene Meldung bearbeitet nie der Polier selbst, sondern die Bauleitung
const offeneVorschlaege = (d: Daten, polierId: string) => vorschlaegeFuerPolier(d, polierId);

/** Kurze Zeile für einen Tag in einer Liste */
function TagZeile({ d, t, ziel }: { d: Daten; t: Tag; ziel: string }) {
  const p = person(d, t.personId);
  const r = rechnung(d, t.personId, t.datum);
  const h = hinweiseTag(d, t);
  return (
    <li>
      <Link to={ziel} className="zeile" style={{ minHeight: 60 }}>
        <span className="wachs">
          <span className="name">{voll(p)}</span>
          <span className="klein">
            {tm(t.datum)} · {r.beginn ? uhr(r.beginn.zeit) : '–'}–{r.ende ? uhr(r.ende.zeit) : '–'} · {stunden(r.arbeitMin / 60)}
            {t.zuschlaege.length ? ` · ${t.zuschlaege.length} Zuschl.` : ''}
          </span>
          {h.length > 0 && <span className="warn" style={{ fontSize: 14 }}>{h[0]}{h.length > 1 ? ` (+${h.length - 1})` : ''}</span>}
        </span>
        <Weiter />
      </Link>
    </li>
  );
}

/** P1: Heute beim Polier */
export function PHeute() {
  const { d, ich } = useIch();
  const gruppen = tageBeimPolier(d, ich.id);
  const offen = gruppen.reduce((s, g) => s + g.tage.length, 0);
  const vorschlaege = offeneVorschlaege(d, ich.id);
  const eigen = rechnung(d, ich.id, d.heute);
  const ohneHandy = d.personen.filter((p) => !p.nutztApp && d.einteilung.some((e) => e.personId === p.id && e.datum === d.heute && baustellenVonPolier(d, ich.id).some((b) => b.id === e.baustelleId)));
  const aufgaben: { text: string; unter: string; to: string; warn?: boolean }[] = [];
  if (offen) aufgaben.push({ text: `${offen} ${offen === 1 ? 'Tag' : 'Tage'} freigeben`, unter: gruppen.filter((g) => g.tage.length).map((g) => `${g.baustelle.kst}: ${g.tage.length}`).join(' · '), to: '/p/freigabe' });
  if (vorschlaege.length) aufgaben.push({ text: `${vorschlaege.length} Meldung${vorschlaege.length === 1 ? '' : 'en'} „Stempeln vergessen“`, unter: vorschlaege.map((v) => voll(person(d, v.personId))).join(', '), to: '/p/vorschlag', warn: true });
  for (const p of ohneHandy) aufgaben.push({ text: `Stunden für ${voll(p)} erfassen`, unter: 'ohne Handy, bestätigt mit PIN', to: '/p/ohne-handy' });
  aufgaben.push({ text: 'Helfer und Nachunternehmer eintragen', unter: 'Stunden laut Disposition', to: '/p/helfer' });
  return (
    <Seite titel="Heute" menue="heute">
      <div className="kopfzeilen">
        <span className="unter">{tagLang(d.heute)}</span>
        <h1 className="h1 gross">Servus {ich.vorname}</h1>
      </div>
      <section aria-label="Meine Zeit" className="karte pad">
        <span className="fett klein" style={{ color: 'var(--blau-dunkel)' }}>Meine Zeit heute</span>
        <span className="fett" style={{ fontSize: 17 }}>
          {eigen.zustand === 'aus' ? 'Noch nicht gestempelt' : eigen.zustand === 'arbeit' ? `Arbeit seit ${uhr(eigen.seit!)} · ${stunden(eigen.arbeitMin / 60)}` : eigen.zustand === 'pause' ? `Pause seit ${uhr(eigen.seit!)}` : `Feierabend · ${stunden(eigen.arbeitMin / 60)}`}
        </span>
        <Link to="/ma/heute" className="knopf rahmen mittel">Zum Stempeln</Link>
      </section>
      <h2 className="h2">Zu tun</h2>
      <ul className="liste">
        {aufgaben.map((x) => (
          <li key={x.text}>
            <Link to={x.to} className="zeile" style={{ minHeight: 60 }}>
              <span className="wachs"><span className="name" style={x.warn ? { color: 'var(--orange-text)' } : undefined}>{x.text}</span><span className="klein">{x.unter}</span></span>
              <Weiter />
            </Link>
          </li>
        ))}
      </ul>
    </Seite>
  );
}

/** P2: Freigabe, nach Baustelle */
export function PFreigabe() {
  const { d, ich, a } = useIch();
  const gruppen = tageBeimPolier(d, ich.id);
  const [bs, setBs] = useState(gruppen.find((g) => g.tage.length)?.baustelle.id ?? gruppen[0]?.baustelle.id ?? '');
  const [fertig, setFertig] = useState(0);
  const g = gruppen.find((x) => x.baustelle.id === bs) ?? gruppen[0];
  if (fertig) {
    return (
      <Seite titel="Freigegeben" menue="freigabe">
        <Fueller />
        <Erledigt titel={`${fertig} ${fertig === 1 ? 'Tag' : 'Tage'} freigegeben`}><p className="text" style={{ textAlign: 'center' }}>Sie liegen jetzt bei der Bauleitung.</p></Erledigt>
        <Fueller />
        <Knopf onClick={() => setFertig(0)}>Zurück zur Freigabe</Knopf>
      </Seite>
    );
  }
  if (!g) return <Seite titel="Freigabe" menue="freigabe"><h1 className="h1 gross">Freigabe</h1><p className="text">Du hast keine Baustelle.</p></Seite>;
  const ohne = g.tage.filter((t) => hinweiseTag(d, t).length === 0 && rechnung(d, t.personId, t.datum).zustand === 'fertig');
  const mit = g.tage.filter((t) => !ohne.includes(t));
  const summe = g.tage.reduce((s, t) => s + stundenTag(d, t.personId, t.datum), 0);
  return (
    <Seite titel="Freigabe" menue="freigabe">
      <h1 className="h1 gross">Freigabe</h1>
      <BaustelleWahl liste={gruppen.map((x) => x.baustelle)} wert={g.baustelle.id} setWert={setBs} />
      {g.tage.length === 0 ? (
        <div className="hinweis gruen"><strong>Alles erledigt.</strong> Auf {bsName(g.baustelle)} liegt nichts zur Freigabe.</div>
      ) : (
        <>
          <span className="unter">{g.tage.length} {g.tage.length === 1 ? 'Tag' : 'Tage'} · zusammen {stunden(summe)}</span>
          {mit.length > 0 && (
            <section aria-label="Bitte ansehen" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 className="h2">Bitte ansehen ({mit.length})</h2>
              <ul className="liste">{mit.map((t) => <TagZeile key={t.id} d={d} t={t} ziel={`/p/tag/${t.id}`} />)}</ul>
            </section>
          )}
          {ohne.length > 0 && (
            <section aria-label="Ohne Auffälligkeit" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 className="h2">Ohne Auffälligkeit ({ohne.length})</h2>
              <ul className="liste">{ohne.map((t) => <TagZeile key={t.id} d={d} t={t} ziel={`/p/tag/${t.id}`} />)}</ul>
              <Knopf farbe="gruen" onClick={() => { a.polierFreigeben(ohne.map((t) => t.id)); setFertig(ohne.length); }}>
                {ohne.length} {ohne.length === 1 ? 'Tag' : 'Tage'} freigeben
              </Knopf>
            </section>
          )}
        </>
      )}
      <Link to="/p/freigegeben" className="link">Schon freigegeben</Link>
    </Seite>
  );
}

const PAUSE_GRUENDE = ['Betonage am Stück', 'Witterung, Arbeit musste fertig werden', 'Mit Mitarbeiter besprochen'];

/** P3: einen Tag prüfen */
export function PTag() {
  const { id = '' } = useParams();
  const { d, a, ich } = useIch();
  const nav = useNavigate();
  const t = d.tage.find((x) => x.id === id);
  const [kurz, setKurz] = useState<Record<string, string>>({});
  const [pauseGrund, setPauseGrund] = useState('');
  const [fehler, setFehler] = useState('');
  if (!t) return <Navigate to="/p/freigabe" replace />;
  const p = person(d, t.personId);
  const r = rechnung(d, t.personId, t.datum);
  const h = hinweiseTag(d, t);
  const offen = wartetAufPolier(d, t, ich.id);
  const wartet = offeneKorrekturen(t);
  const frist = wartet.length ? wartet.map(fristRueckmeldung).sort().pop()! : '';
  const jeBs = stundenJeBaustelle(d, t.personId, t.datum);
  const freigeben = () => {
    if (wartet.length) return setFehler(`Erst freigeben, wenn ${p.vorname} auf die Korrektur geantwortet hat.`);
    if (r.zustand !== 'fertig') return setFehler('Der Tag hat kein Arbeitsende. Bitte zuerst die Zeit ergänzen.');
    if (r.pauseFehlt && !pauseGrund.trim()) return setFehler('Bitte begründe, warum die Pause zu kurz war.');
    a.polierFreigeben([t.id], r.pauseFehlt ? pauseGrund.trim() : undefined);
    nav('/p/freigabe');
  };
  return (
    <Seite titel="Tag prüfen" menue="freigabe">
      <Zurueck to="/p/freigabe">Freigabe</Zurueck>
      <div className="kopfzeilen">
        <span className="unter">{tagLang(t.datum)}</span>
        <h1 className="h1">{voll(p)}</h1>
      </div>
      {h.map((x) => <div key={x} className="hinweis orange" style={{ fontSize: 15 }}>{x}</div>)}
      <ol aria-label="Zeiten" className="liste">
        {r.gueltig.map((s) => (
          <li key={s.id} className="zeile">
            <span className="fett tab" style={{ width: 56 }}>{uhr(s.zeit)}</span>
            <span style={{ flexGrow: 1 }}>{s.raucher ? "Raucherpause" : artName(s.art)}{s.herkunft === 'korrektur' ? ' (korrigiert)' : ''}</span>
            {s.standort === 'weicht_ab' && <span className="warn" style={{ fontSize: 14 }}>ca. {s.entfernungM} m weg</span>}
          </li>
        ))}
      </ol>
      {r.gueltig.filter((s) => s.begruendung).map((s) => (
        <p key={s.id} className="text"><strong>Begründung {artName(s.art)}:</strong> „{s.begruendung}“</p>
      ))}
      <section aria-label="Summe" className="karte drei" style={{ padding: '14px 16px' }}>
        <div className="kopfzeilen"><span className="klein">Arbeit</span><span className="zahl" style={{ fontSize: 20 }}>{stunden(r.arbeitMin / 60)}</span></div>
        <div className="kopfzeilen"><span className="klein">Pause</span><span className="zahl" style={{ fontSize: 20 }}>{Math.round(r.pauseMin)} Min.</span></div>
        <div className="kopfzeilen"><span className="klein">Zuschläge</span><span className="zahl" style={{ fontSize: 20 }}>{t.zuschlaege.length}</span></div>
      </section>
      {jeBs.length > 1 && (
        <section aria-label="Stunden je Baustelle" className="karte pad">
          <span className="fett klein">Baustellenwechsel: jeder Polier gibt seine Stunden frei</span>
          {jeBs.map((x) => <span key={x.baustelle?.id ?? '-'} className={x.baustelle?.polierId === ich.id ? 'fett' : 'klein'}>{bsName(x.baustelle)}: {stunden(x.stunden)}{x.baustelle?.polierId === ich.id ? ' (deine Baustelle)' : x.baustelle?.polierId ? ` · Polier ${voll(person(d, x.baustelle.polierId))}` : ''}</span>)}
          {(t.polierOk ?? []).length > 0 && <span className="klein">Schon freigegeben von: {(t.polierOk ?? []).map((id) => voll(person(d, id))).join(', ')}</span>}
        </section>
      )}
      {offen && <Link to={`/p/tag/${t.id}/korrektur`} className="link">Zeit korrigieren</Link>}

      {t.zuschlaege.length > 0 && (
        <section aria-label="Zuschläge" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="h2">Zuschläge</h2>
          {konflikte(Object.fromEntries(t.zuschlaege.filter((z) => z.entscheidung !== 'weg').map((z) => [z.art, { typ: z.typ }]))).map(([x, y]) => (
            <div key={x + y} className="hinweis orange">{zuschlagArt(x).name} und {zuschlagArt(y).name} gibt es nach § 6 Nr. 2 BRTV nicht für dieselbe Zeit. Bitte einen kürzen oder streichen, wenn die Stunden sich überschneiden.</div>
          ))}
          {t.zuschlaege.map((z) => {
            const art = zuschlagArt(z.art);
            return (
              <div key={z.id} className="karte pad">
                <span className="fett" style={{ fontSize: 17 }}>{art.name} · {stunden(z.stunden)}</span>
                {z.typ && <span className="unter">{z.typ}</span>}
                <ZuschlagInfo art={z.art} mitParagraf />
                {offen ? (
                  <>
                    <Auswahl label={`Entscheidung ${art.name}`} spalten={3} klein wert={z.entscheidung === 'offen' ? undefined : z.entscheidung}
                      setWert={(w) => a.zuschlagEntscheiden(t.id, z.id, w, w === 'kurz' ? Number((kurz[z.id] ?? '').replace(',', '.')) || z.stunden / 2 : undefined)}
                      optionen={[{ wert: 'ok' as const, text: 'Bestätigen' }, { wert: 'kurz' as const, text: 'Kürzen' }, { wert: 'weg' as const, text: 'Streichen' }]} />
                    {z.entscheidung === 'kurz' && (
                      <div className="feld">
                        <label htmlFor={`k${z.id}`}>Stunden nach Kürzung</label>
                        <input id={`k${z.id}`} className="eingabe" inputMode="decimal" value={kurz[z.id] ?? String(z.stundenGekuerzt ?? '').replace('.', ',')}
                          onChange={(e) => setKurz({ ...kurz, [z.id]: e.target.value })}
                          onBlur={(e) => a.zuschlagEntscheiden(t.id, z.id, 'kurz', Math.min(z.stunden, Number(e.target.value.replace(',', '.')) || 0))} />
                      </div>
                    )}
                  </>
                ) : (
                  <span className="klein">Gilt: {stunden(geltendeStunden(z))}</span>
                )}
              </div>
            );
          })}
        </section>
      )}

      {offen && r.pauseFehlt && (
        <section aria-label="Pause begründen" className="feld">
          <span className="label">Pause zu kurz: Begründung (Pflicht)</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PAUSE_GRUENDE.map((g) => <button key={g} type="button" className="chip" aria-pressed={pauseGrund === g} onClick={() => setPauseGrund(g)} style={{ cursor: 'pointer', border: pauseGrund === g ? '2px solid var(--blau)' : undefined }}>{g}</button>)}
          </div>
          <textarea className="eingabe" rows={2} value={pauseGrund} onChange={(e) => setPauseGrund(e.target.value)} aria-label="Begründung Pause" />
        </section>
      )}
      {fehler && <div role="alert" className="hinweis rot">{fehler}</div>}
      <Fueller />
      {offen && wartet.length > 0 && (
        <div className="hinweis orange">
          <strong>Wartet auf {p.vorname}.</strong> Er soll die Korrektur bestätigen oder widersprechen. Die App erinnert ihn.
          {d.heute >= frist ? ' Die Frist ist abgelaufen: Du kannst jetzt ohne Rückmeldung entscheiden.' : ` Ohne Antwort entscheidest du ab ${tm(frist)}.`}
        </div>
      )}
      {offen && wartet.length > 0 && d.heute >= frist && <Knopf farbe="rahmen" onClick={() => a.ohneRueckmeldungEntschieden(t.id)}>Ohne Rückmeldung entscheiden</Knopf>}
      {offen ? <Knopf farbe="gruen" gesperrt={wartet.length > 0} onClick={freigeben}>Tag freigeben</Knopf>
        : <div className="hinweis blau">{t.personId === ich.id ? 'Deinen eigenen Tag gibt die Bauleitung frei.' : (t.polierOk ?? []).includes(ich.id) ? 'Du hast diesen Tag schon freigegeben.' : 'Dieser Tag ist schon weitergegeben.'}</div>}
    </Seite>
  );
}

const KORR_GRUENDE = ['Mit Mitarbeiter besprochen', 'Falsch gestempelt', 'Laut Bautagebuch'];

/** P4: Zeit korrigieren – Grund ist Pflicht, das Original bleibt erhalten */
export function PKorrektur() {
  const { id = '' } = useParams();
  const { d, a, ich } = useIch();
  const nav = useNavigate();
  const t0 = d.tage.find((x) => x.id === id);
  // Korrigieren nur, solange der Tag bei diesem Polier liegt (nie der eigene Tag)
  const t = t0 && wartetAufPolier(d, t0, ich.id) ? t0 : undefined;
  const r = t ? rechnung(d, t.personId, t.datum) : undefined;
  const [sid, setSid] = useState(r?.ende?.id ?? r?.gueltig[0]?.id ?? '');
  const alt = r?.gueltig.find((s) => s.id === sid);
  const [neu, setNeu] = useState(alt ? uhr(alt.zeit) : '');
  const [grund, setGrund] = useState('');
  const [fehler, setFehler] = useState('');
  if (!t || !r) return <Navigate to="/p/freigabe" replace />;
  return (
    <Seite titel="Zeit korrigieren" menue="freigabe">
      <Zurueck to={`/p/tag/${t.id}`}>Zurück zum Tag</Zurueck>
      <h1 className="h1">Zeit korrigieren</h1>
      <span className="unter">{voll(person(d, t.personId))} · {tagLang(t.datum)}</span>
      <div className="feld">
        <span className="label">Welche Zeit?</span>
        <Auswahl label="Welche Zeit" spalten={2} klein wert={sid} setWert={(w) => { setSid(w); setNeu(uhr(r.gueltig.find((s) => s.id === w)!.zeit)); }}
          optionen={r.gueltig.map((s) => ({ wert: s.id, text: `${artName(s.art)} ${uhr(s.zeit)}` }))} />
      </div>
      <div className="feld">
        <label htmlFor="neu">Richtige Uhrzeit</label>
        <input id="neu" type="time" className="eingabe" value={neu} onChange={(e) => setNeu(e.target.value)} />
      </div>
      <div className="feld">
        <span className="label">Grund (Pflicht)</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {KORR_GRUENDE.map((g) => <button key={g} type="button" className="chip" aria-pressed={grund === g} onClick={() => setGrund(g)} style={{ cursor: 'pointer', border: grund === g ? '2px solid var(--blau)' : undefined }}>{g}</button>)}
        </div>
        <textarea className="eingabe" rows={2} value={grund} onChange={(e) => setGrund(e.target.value)} aria-label="Grund" />
      </div>
      <p className="text">Die alte Zeit bleibt gespeichert. {voll(person(d, t.personId))} sieht die Änderung und kann widersprechen. Freigeben kannst du erst nach der Antwort.</p>
      {fehler && <div role="alert" className="hinweis rot">{fehler}</div>}
      <Fueller />
      <Knopf onClick={() => {
        if (!alt || !neu) return setFehler('Bitte Zeit wählen.');
        if (neu === uhr(alt.zeit)) return setFehler('Die Uhrzeit ist unverändert.');
        if (!grund.trim()) return setFehler('Bitte einen Grund angeben.');
        a.zeitKorrigieren(t.id, alt.id, neu, grund.trim());
        nav(`/p/tag/${t.id}`);
      }}>Korrektur speichern</Knopf>
    </Seite>
  );
}

/** P5: Meldungen „Stempeln vergessen“ (Polier; Bauleitung für die Meldungen der Poliere) */
export function PVorschlag() {
  const { d, ich, a } = useIch();
  const bl = ich.rolle === 'bauleitung';
  const liste = bl ? vorschlaegeFuerBauleitung(d, ich.id) : offeneVorschlaege(d, ich.id);
  return (
    <Seite titel="Stempeln vergessen" menue="heute">
      <Zurueck to={bl ? '/b/heute' : '/p/heute'}>Heute</Zurueck>
      {bl && <p className="text">Hier landen die Meldungen der Poliere selbst und von Baustellen ohne Polier (z. B. Lager).</p>}
      <h1 className="h1">Stempeln vergessen</h1>
      {liste.length === 0 && <div className="hinweis gruen"><strong>Keine offenen Meldungen.</strong></div>}
      {liste.map((v) => {
        const r = rechnung(d, v.personId, v.datum);
        return (
          <section key={v.id} aria-label={voll(person(d, v.personId))} className="karte pad">
            <span className="fett" style={{ fontSize: 17 }}>{voll(person(d, v.personId))}</span>
            <span className="unter">{tagLang(v.datum)} · gemeldet {tm(v.gemeldet.slice(0, 10))} um {uhr(v.gemeldet)}</span>
            <span>Gestempelt: {r.gueltig.map((s) => `${artName(s.art)} ${uhr(s.zeit)}`).join(', ') || 'nichts'}</span>
            <span className="fett">Vorschlag: {artName(v.art)} {v.von}{v.bis ? `–${v.bis}` : ''}</span>
            <div className="zwei">
              <Knopf farbe="rahmen-rot" klasse="mittel" onClick={() => a.vorschlagEntscheiden(v.id, false)}>Ablehnen</Knopf>
              <Knopf farbe="gruen" klasse="mittel" onClick={() => a.vorschlagEntscheiden(v.id, true)}>Übernehmen</Knopf>
            </div>
          </section>
        );
      })}
      <p className="text">Übernommene Zeiten sind als Korrektur gekennzeichnet. Ist der Tag noch nicht gesendet, prüft und sendet ihn der Mitarbeiter selbst.</p>
    </Seite>
  );
}

/** Schon freigegeben (letzte Tage) */
export function PFreigegeben() {
  const { d, ich } = useIch();
  const liste = d.tage
    .filter((t) => ((t.polierOk ?? []).includes(ich.id) || t.polierFreigabeVon === ich.id) && t.personId !== ich.id && t.status !== 'offen')
    .sort((x, y) => (x.datum < y.datum ? 1 : -1))
    .slice(0, 30);
  return (
    <Seite titel="Schon freigegeben" menue="freigabe">
      <Zurueck to="/p/freigabe">Freigabe</Zurueck>
      <h1 className="h1">Schon freigegeben</h1>
      <ul className="liste">
        {liste.map((t) => (
          <li key={t.id} className="zeile">
            <span className="wachs"><span className="fett">{voll(person(d, t.personId))}</span><span className="klein">{tm(t.datum)} · {stunden(stundenTag(d, t.personId, t.datum))}</span></span>
            <span className={t.status === 'freigegeben' ? 'ok' : 'klein'} style={{ fontSize: 14 }}>{t.status === 'freigegeben' ? 'an Lohnbuchhaltung' : t.status === 'bei_bauleitung' ? 'bei Bauleitung' : 'beim anderen Polier'}</span>
          </li>
        ))}
      </ul>
    </Seite>
  );
}
