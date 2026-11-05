// Polier: ohne Handy, nachtragen, Helfer, Ausfall, Kolonne, Auswertung, Mehr (P6–P14 im Entwurf V2)

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Fueller, Seite, Zurueck } from '../../components/Rahmen';
import { Auswahl, BaustelleWahl, Erledigt, Haken, Knopf, PinFeld, Weiter } from '../../components/Teile';
import { useDaten, useIch } from '../../domain/store';
import {
  abwesendBis, baustelle, baustellenVonPolier, bsLang, bsName, einteilungAm, helferStunden, person, rechnung, stundenIstBaustelle, tagVon, voll,
} from '../../domain/sel';
import type { Baustelle, Daten } from '../../domain/types';
import { euro, plusTage, stunden, tagLang, tm, werktag, wtKurz } from '../../domain/zeit';
import { Demo, MehrListe, tageDerWoche } from '../ma/Rest';

const minuten = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

function useMeineBaustelle() {
  const { d, ich } = useIch();
  const liste = baustellenVonPolier(d, ich.id);
  const [bs, setBs] = useState(liste[0]?.id ?? '');
  return { liste, bs, setBs, b: baustelle(d, bs) ?? liste[0] };
}

/** Zeitfelder von–bis mit Pause */
function Zeiten({ von, bis, pause, set }: { von: string; bis: string; pause: number; set: (v: { von?: string; bis?: string; pause?: number }) => void }) {
  return (
    <>
      <div className="zwei">
        <div className="feld"><label htmlFor="von">Beginn</label><input id="von" type="time" className="eingabe" value={von} onChange={(e) => set({ von: e.target.value })} /></div>
        <div className="feld"><label htmlFor="bis">Ende</label><input id="bis" type="time" className="eingabe" value={bis} onChange={(e) => set({ bis: e.target.value })} /></div>
      </div>
      <div className="feld">
        <span className="label">Pause</span>
        <Auswahl label="Pause" spalten={4} klein wert={pause} setWert={(p) => set({ pause: p })}
          optionen={[0, 30, 45, 60].map((m) => ({ wert: m, text: `${m} Min.` }))} />
      </div>
      <span className="unter">Arbeitszeit: {stunden(Math.max(0, minuten(bis) - minuten(von) - pause) / 60)}</span>
    </>
  );
}

function pruefeZeiten(von: string, bis: string, pause: number): string {
  const h = (minuten(bis) - minuten(von) - pause) / 60;
  if (h <= 0) return 'Das Ende muss nach dem Beginn liegen.';
  if (h > 6 && pause < 30) return 'Über 6 h sind mindestens 30 Min. Pause Pflicht.';
  if (h > 9 && pause < 45) return 'Über 9 h sind mindestens 45 Min. Pause Pflicht.';
  if (h > 10) return 'Mehr als 10 h am Tag sind nicht erlaubt.';
  return '';
}

/** P6: Stunden für jemanden ohne Handy erfassen */
export function POhneHandy() {
  const { d, ich, a } = useIch();
  const nav = useNavigate();
  const meine = baustellenVonPolier(d, ich.id).map((b) => b.id);
  const leute = d.personen.filter((p) => !p.nutztApp && d.einteilung.some((e) => e.personId === p.id && meine.includes(e.baustelleId)));
  const [pid, setPid] = useState(leute[0]?.id ?? '');
  const [datum, setDatum] = useState(d.heute);
  const [z, setZ] = useState({ von: '07:00', bis: '16:00', pause: 60 });
  const [fehler, setFehler] = useState('');
  const schonDa = pid ? rechnung(d, pid, datum).gueltig.length > 0 : false;
  const b = pid ? einteilungAm(d, pid, datum) : undefined;
  return (
    <Seite titel="Ohne Handy" menue="heute">
      <Zurueck to="/p/heute">Heute</Zurueck>
      <h1 className="h1">Stunden ohne Handy</h1>
      {leute.length === 0 ? <p className="text">In deiner Kolonne arbeiten alle mit Handy.</p> : (
        <>
          <Auswahl label="Person" spalten={1} wert={pid} setWert={setPid} optionen={leute.map((p) => ({ wert: p.id, text: voll(p) }))} />
          <Auswahl label="Tag" spalten={2} wert={datum} setWert={setDatum} optionen={[{ wert: d.heute, text: `Heute ${tm(d.heute)}` }, { wert: werktag(d.heute, -1), text: `${wtKurz(werktag(d.heute, -1))} ${tm(werktag(d.heute, -1))}` }]} />
          <span className="unter">Baustelle: {bsName(b)}</span>
          {schonDa ? <div className="hinweis blau">Für diesen Tag sind schon Zeiten erfasst.</div> : (
            <>
              <Zeiten {...z} set={(v) => setZ({ ...z, ...v })} />
              {fehler && <div role="alert" className="hinweis rot">{fehler}</div>}
              <Fueller />
              <Knopf onClick={() => {
                const f = pruefeZeiten(z.von, z.bis, z.pause);
                if (f) return setFehler(f);
                a.zeitenErfassen(pid, datum, z.von, z.bis, z.pause, 'polier_ohne_handy', b?.id ?? meine[0]);
                nav(`/p/ohne-handy/pin/${pid}/${datum}`);
              }}>Weiter: {person(d, pid).vorname} bestätigt</Knopf>
            </>
          )}
        </>
      )}
    </Seite>
  );
}

/** P7: Die Person bestätigt am Handy des Poliers mit ihrer PIN */
export function PPinBestaetigen() {
  const { pid = '', datum = '' } = useParams();
  const { d, a } = useIch();
  const [fehler, setFehler] = useState('');
  const p = person(d, pid);
  const r = rechnung(d, pid, datum);
  const fertig = tagVon(d, pid, datum)?.bestaetigtMitPin;
  if (fertig) {
    return (
      <Seite titel="Bestätigt" menue="heute">
        <Fueller />
        <Erledigt titel={`${p.vorname} hat bestätigt`}><p className="text" style={{ textAlign: 'center' }}>{stunden(r.arbeitMin / 60)} am {tm(datum)}. Der Tag liegt jetzt bei der Bauleitung.</p></Erledigt>
        <Fueller />
        <Link to="/p/heute" className="knopf blau">Fertig</Link>
      </Seite>
    );
  }
  return (
    <Seite titel="Mit PIN bestätigen" ohneMenue>
      <div className="karte pad">
        <span className="fett">{voll(p)} · {tagLang(datum)}</span>
        <span>{r.beginn && r.ende ? `${r.beginn.zeit.slice(11, 16)}–${r.ende.zeit.slice(11, 16)}` : ''} · Pause {Math.round(r.pauseMin)} Min. · {stunden(r.arbeitMin / 60)}</span>
      </div>
      <PinFeld frage={`${p.vorname}, stimmen die Zeiten? Dann gib deine PIN ein.`}
        fertig={(pin) => { if (pin !== p.pin) return setFehler('Die PIN stimmt nicht.'); setFehler(''); a.mitPinBestaetigt(pid, datum); }} />
      {fehler && <div role="alert" className="hinweis rot">{fehler}</div>}
      <Link to="/p/heute" className="link mitte">Abbrechen, später bestätigen</Link>
    </Seite>
  );
}

/** P8: Zeiten nachtragen (Handy verloren oder abgemeldet) */
export function PNachtragen() {
  const { d, ich, a } = useIch();
  const meine = baustellenVonPolier(d, ich.id).map((b) => b.id);
  const leute = [...new Set(d.einteilung.filter((e) => meine.includes(e.baustelleId) && e.personId !== ich.id).map((e) => e.personId))].map((id) => person(d, id)).filter((p) => p.nutztApp);
  const vorschlag = leute.find((p) => d.geraete.some((g) => g.personId === p.id && !g.aktiv)) ?? leute[0];
  const [pid, setPid] = useState(vorschlag?.id ?? '');
  const [datum, setDatum] = useState(werktag(d.heute, -1));
  const [z, setZ] = useState({ von: '07:00', bis: '16:00', pause: 60 });
  const [grund, setGrund] = useState('');
  const [fehler, setFehler] = useState('');
  const [fertig, setFertig] = useState(false);
  const schonDa = pid ? rechnung(d, pid, datum).gueltig.length > 0 : false;
  if (fertig) {
    return (
      <Seite titel="Nachgetragen" menue="heute">
        <Fueller />
        <Erledigt titel="Nachgetragen"><p className="text" style={{ textAlign: 'center' }}>Der Tag steht jetzt in deiner Freigabe und ist als „nachgetragen“ markiert.</p></Erledigt>
        <Fueller />
        <Link to="/p/freigabe" className="knopf blau">Zur Freigabe</Link>
      </Seite>
    );
  }
  const tage = [0, -1, -2, -3, -4].map((n) => (n === 0 ? d.heute : werktag(d.heute, n)));
  return (
    <Seite titel="Zeiten nachtragen" menue="mehr">
      <Zurueck to="/p/mehr">Mehr</Zurueck>
      <h1 className="h1">Zeiten nachtragen</h1>
      <p className="text">Zum Beispiel, wenn ein Handy verloren ging. Der Mitarbeiter sieht den Eintrag später in seiner App.</p>
      <div className="feld">
        <label htmlFor="wer">Für wen?</label>
        <select id="wer" className="eingabe" value={pid} onChange={(e) => setPid(e.target.value)}>
          {leute.map((p) => <option key={p.id} value={p.id}>{voll(p)}{d.geraete.some((g) => g.personId === p.id && !g.aktiv) ? ' (Handy abgemeldet)' : ''}</option>)}
        </select>
      </div>
      <Auswahl label="Tag" spalten={5} klein wert={datum} setWert={setDatum} optionen={tage.map((t) => ({ wert: t, text: `${wtKurz(t)} ${tm(t)}` }))} />
      {schonDa ? <div className="hinweis blau">Für diesen Tag gibt es schon Zeiten. Ändern geht über „Zeit korrigieren“ in der Freigabe.</div> : (
        <>
          <Zeiten {...z} set={(v) => setZ({ ...z, ...v })} />
          <div className="feld"><label htmlFor="grund">Grund (Pflicht)</label><input id="grund" className="eingabe" value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="z. B. Handy verloren" /></div>
          {fehler && <div role="alert" className="hinweis rot">{fehler}</div>}
          <Fueller />
          <Knopf onClick={() => {
            const f = pruefeZeiten(z.von, z.bis, z.pause) || (grund.trim() ? '' : 'Bitte einen Grund angeben.');
            if (f) return setFehler(f);
            a.zeitenErfassen(pid, datum, z.von, z.bis, z.pause, 'nachgetragen', einteilungAm(d, pid, datum)?.id ?? meine[0], [], grund.trim());
            setFertig(true);
          }}>Nachtragen</Knopf>
        </>
      )}
    </Seite>
  );
}

/** P9/P10: Helfer und Nachunternehmer laut Disposition */
export function PHelfer() {
  const { d, a } = useIch();
  const { liste, bs, setBs, b } = useMeineBaustelle();
  const [datum, setDatum] = useState(d.heute);
  const dispo = d.helferDispo.filter((h) => h.baustelleId === b?.id);
  const vorhanden = (name: string) => d.helfer.find((h) => h.baustelleId === b?.id && h.datum === datum && h.name === name);
  const [werte, setWerte] = useState<Record<string, { an: boolean; von: string; bis: string; pause: number }>>({});
  const [gespeichert, setGespeichert] = useState(false);
  const wert = (name: string) => werte[`${datum}|${name}`] ?? (() => { const v = vorhanden(name); return { an: !!v, von: v?.von ?? '07:00', bis: v?.bis ?? '16:00', pause: v?.pauseMin ?? 60 }; })();
  const setze = (name: string, v: Partial<{ an: boolean; von: string; bis: string; pause: number }>) => { setGespeichert(false); setWerte({ ...werte, [`${datum}|${name}`]: { ...wert(name), ...v } }); };
  const gruppen = [
    { titel: 'Eigene Helfer (Fa. Baumann)', unter: 'Mitarbeiter der Fa. Baumann ohne App', liste: dispo.filter((h) => !h.nu) },
    { titel: 'Nachunternehmer', unter: 'Lohnleister laut Disposition', liste: dispo.filter((h) => h.nu) },
  ];
  return (
    <Seite titel="Helfer und NU" menue="heute">
      <Zurueck to="/p/heute">Heute</Zurueck>
      <h1 className="h1">Helfer und Nachunternehmer</h1>
      <BaustelleWahl liste={liste} wert={bs} setWert={setBs} />
      <Auswahl label="Tag" spalten={2} wert={datum} setWert={setDatum} optionen={[{ wert: d.heute, text: `Heute ${tm(d.heute)}` }, { wert: werktag(d.heute, -1), text: `${wtKurz(werktag(d.heute, -1))} ${tm(werktag(d.heute, -1))}` }]} />
      {dispo.length === 0 && <p className="text">Für {bsName(b)} sind keine Helfer disponiert.</p>}
      {gruppen.filter((g) => g.liste.length).map((g) => (
        <section key={g.titel} aria-label={g.titel} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="kopfzeilen"><h2 className="h2">{g.titel}</h2><span className="klein">{g.unter}</span></div>
          {g.liste.map((h) => {
            const w = wert(h.name);
            return (
              <div key={h.name} className="karte pad">
                <button type="button" onClick={() => setze(h.name, { an: !w.an })} aria-pressed={w.an}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
                  <Haken an={w.an} />
                  <span className="kopfzeilen"><span className="fett" style={{ fontSize: 17 }}>{h.name}</span><span className="klein">{h.nu ? h.firma : 'Fa. Baumann'} · {h.taetigkeit}</span></span>
                </button>
                {h.warnung && <div className="hinweis rot" style={{ fontSize: 15 }}><strong>{h.warnung}.</strong> Bitte mit der Bauleitung klären, bevor er arbeitet.</div>}
                {w.an && (
                  <>
                    <div className="zwei">
                      <div className="feld"><label htmlFor={`v${h.name}`}>Beginn</label><input id={`v${h.name}`} type="time" className="eingabe" value={w.von} onChange={(e) => setze(h.name, { von: e.target.value })} /></div>
                      <div className="feld"><label htmlFor={`b${h.name}`}>Ende</label><input id={`b${h.name}`} type="time" className="eingabe" value={w.bis} onChange={(e) => setze(h.name, { bis: e.target.value })} /></div>
                    </div>
                    <Auswahl label={`Pause ${h.name}`} spalten={4} klein wert={w.pause} setWert={(p) => setze(h.name, { pause: p })} optionen={[0, 30, 45, 60].map((m) => ({ wert: m, text: `${m} Min.` }))} />
                    <span className="unter">{stunden(helferStunden({ von: w.von, bis: w.bis, pauseMin: w.pause }))}</span>
                  </>
                )}
              </div>
            );
          })}
        </section>
      ))}
      {gespeichert && <div role="status" className="hinweis gruen"><strong>Gespeichert.</strong> Die Bauleitung zeichnet die Stunden gegen.</div>}
      <Fueller />
      {dispo.length > 0 && b && (
        <Knopf onClick={() => {
          a.helferSpeichern(dispo.filter((h) => wert(h.name).an).map((h) => {
            const w = wert(h.name);
            return { baustelleId: b.id, datum, firma: h.firma, nu: h.nu, name: h.name, von: w.von, bis: w.bis, pauseMin: w.pause, taetigkeit: h.taetigkeit, warnung: h.warnung };
          }));
          setGespeichert(true);
        }}>Stunden speichern</Knopf>
      )}
    </Seite>
  );
}

const istWinter = (key: string) => { const m = Number(key.slice(5, 7)); return m === 12 || m <= 3; };

/** P11: Ausfall melden (Schlechtwetter, nur 01.12.–31.03.) */
export function PAusfall() {
  const { d, ich, a } = useIch();
  const { liste, bs, setBs, b } = useMeineBaustelle();
  const [demoWinter, setDemoWinter] = useState(false);
  const [art, setArt] = useState<'Schlechtwetter' | 'Anderer Ausfall'>('Schlechtwetter');
  const [ab, setAb] = useState('10:00');
  const leute = d.einteilung.filter((e) => e.datum === d.heute && e.baustelleId === b?.id).map((e) => person(d, e.personId)).filter((p) => !abwesendBis(d, p.id, d.heute));
  const [wer, setWer] = useState<string[]>([]);
  const [fertig, setFertig] = useState(false);
  const alleIds = wer.length ? wer : leute.map((p) => p.id);
  if (!istWinter(d.heute) && !demoWinter) {
    return (
      <Seite titel="Ausfall melden" menue="mehr">
        <Zurueck to="/p/mehr">Mehr</Zurueck>
        <h1 className="h1">Ausfall melden</h1>
        <div className="hinweis blau"><strong>Erst ab 01.12.</strong> Schlechtwetter meldest du in der Schlechtwetterzeit vom 01.12. bis 31.03.</div>
        <button type="button" className="link" onClick={() => setDemoWinter(true)}>Demo: trotzdem ansehen</button>
      </Seite>
    );
  }
  if (fertig) {
    return (
      <Seite titel="Ausfall gemeldet" menue="mehr">
        <Fueller />
        <Erledigt titel="Ausfall gemeldet"><p className="text" style={{ textAlign: 'center' }}>{art} ab {ab} für {alleIds.length} Personen. Die Lohnbuchhaltung bekommt die Meldung.</p></Erledigt>
        <Fueller />
        <Link to="/p/heute" className="knopf blau">Fertig</Link>
      </Seite>
    );
  }
  return (
    <Seite titel="Ausfall melden" menue="mehr">
      <Zurueck to="/p/mehr">Mehr</Zurueck>
      <h1 className="h1">Ausfall melden</h1>
      <BaustelleWahl liste={liste} wert={bs} setWert={setBs} />
      <Auswahl label="Art" spalten={2} wert={art} setWert={setArt} optionen={[{ wert: 'Schlechtwetter' as const, text: 'Schlechtwetter' }, { wert: 'Anderer Ausfall' as const, text: 'Anderer Ausfall' }]} />
      <div className="feld"><label htmlFor="ab">Ab wann?</label><input id="ab" type="time" className="eingabe" value={ab} onChange={(e) => setAb(e.target.value)} /></div>
      <span className="label fett">Wer ist betroffen? ({alleIds.length})</span>
      <ul className="liste">
        {leute.map((p) => {
          const an = alleIds.includes(p.id);
          return (
            <li key={p.id}>
              <button type="button" className="zeile" aria-pressed={an} style={{ width: '100%', cursor: 'pointer' }}
                onClick={() => setWer(an ? alleIds.filter((x) => x !== p.id) : [...alleIds, p.id])}>
                <Haken an={an} /><span className="wachs"><span className="fett">{voll(p)}</span></span>
              </button>
            </li>
          );
        })}
      </ul>
      <Fueller />
      <Knopf gesperrt={!b || alleIds.length === 0} onClick={() => { a.ausfallMelden({ baustelleId: b!.id, datum: d.heute, art, ab, personIds: alleIds }); setFertig(true); }}>Ausfall melden</Knopf>
      <span className="klein">Gemeldet von {voll(ich)}</span>
    </Seite>
  );
}

/** P12: Kolonne – wer ist wo, wer fehlt (nur „abwesend bis“, nie der Grund) */
export function PKolonne() {
  const { d, ich } = useIch();
  const { liste, bs, setBs, b } = useMeineBaustelle();
  const tage = tageDerWoche(d.heute);
  const [tag, setTag] = useState(tage.includes(d.heute) ? d.heute : tage[0]);
  const leute = d.einteilung.filter((e) => e.datum === tag && e.baustelleId === b?.id && e.personId !== ich.id).map((e) => person(d, e.personId));
  const weg = d.einteilung.filter((e) => e.datum === plusTage(tag, -1) && e.baustelleId === b?.id && !leute.some((p) => p.id === e.personId) && e.personId !== ich.id).map((e) => person(d, e.personId));
  return (
    <Seite titel="Kolonne" menue="kolonne">
      <h1 className="h1 gross">Kolonne</h1>
      <BaustelleWahl liste={liste} wert={bs} setWert={setBs} />
      <div className="tag-tabs" role="group" aria-label="Tag">
        {tage.map((t) => (
          <button key={t} type="button" className="wahl" aria-pressed={t === tag} onClick={() => setTag(t)}>
            <span className="fett">{wtKurz(t)}</span><span className="klein">{tm(t)}</span>
          </button>
        ))}
      </div>
      <span className="unter">{bsLang(b)} · {leute.length} eingeteilt</span>
      <ul className="liste">
        {leute.map((p) => {
          const bis = abwesendBis(d, p.id, tag);
          const r = tag === d.heute ? rechnung(d, p.id, tag) : undefined;
          return (
            <li key={p.id} className="zeile">
              <span className="wachs">
                <span className="fett">{voll(p)}</span>
                <span className="klein">{p.nutztApp ? p.rolle === 'vorarbeiter' ? 'Vorarbeiter' : p.rolle === 'helfer' ? 'Helfer' : 'Facharbeiter' : 'ohne Handy'}</span>
              </span>
              {bis ? <span className="warn" style={{ fontSize: 14 }}>abwesend bis {tm(bis)}</span>
                : r ? <span className={r.zustand === 'aus' ? 'klein' : 'ok'} style={{ fontSize: 14 }}>{r.zustand === 'aus' ? 'noch nicht da' : r.zustand === 'pause' ? 'Pause' : r.zustand === 'fertig' ? 'fertig' : 'arbeitet'}</span> : null}
            </li>
          );
        })}
      </ul>
      {weg.length > 0 && <div className="hinweis blau">Ab {wtKurz(tag)} woanders eingeteilt: {weg.map((p) => `${voll(p)} (${bsName(einteilungAm(d, p.id, tag))})`).join(', ')}</div>}
      <p className="text">Gründe für Abwesenheit sieht nur die Lohnbuchhaltung.</p>
    </Seite>
  );
}

export function ampel(ist: number, soll: number) {
  const q = soll ? ist / soll : 0;
  return q <= 1 ? { farbe: 'var(--gruen)', text: 'im Plan' } : q <= 1.1 ? { farbe: 'var(--orange)', text: 'knapp drüber' } : { farbe: 'var(--rot)', text: 'drüber' };
}

/** Stunden-Karte einer Baustelle (auch für die Bauleitung) */
export function StundenKarte({ d, b }: { d: Daten; b: Baustelle }) {
  const ist = stundenIstBaustelle(d, b);
  const am = ampel(ist, b.stundenSollBisHeute);
  const proz = Math.min(100, (ist / b.stundenSoll) * 100);
  return (
    <section aria-label="Stunden" className="karte pad">
      <span className="fett klein" style={{ color: 'var(--blau-dunkel)' }}>Stunden</span>
      <span className="zahl" style={{ fontSize: 26 }}>{Math.round(ist).toLocaleString('de-DE')} <span className="unter">von {b.stundenSoll.toLocaleString('de-DE')} h</span></span>
      <div className="balken" role="img" aria-label={`${Math.round(proz)} Prozent verbraucht`}><span style={{ width: `${proz}%`, background: am.farbe }} /></div>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="punkt" style={{ background: am.farbe }} aria-hidden="true" />
        <span>Soll bis heute {Math.round(b.stundenSollBisHeute).toLocaleString('de-DE')} h · <strong>{am.text}</strong> ({ist - b.stundenSollBisHeute >= 0 ? '+' : '−'}{Math.abs(Math.round(ist - b.stundenSollBisHeute))} h)</span>
      </span>
    </section>
  );
}

/** P13: Auswertung der Baustelle */
export function PAuswertung() {
  const { d } = useIch();
  const { liste, bs, setBs, b } = useMeineBaustelle();
  if (!b) return <Seite titel="Baustelle" menue="baustelle"><p className="text">Keine Baustelle.</p></Seite>;
  const tage = tageDerWoche(d.heute).filter((t) => t <= d.heute);
  const proTag = tage.map((t) => ({
    t,
    h: d.tage.filter((x) => x.datum === t && x.status !== 'offen').reduce((s, x) => (baustelle(d, rechnung(d, x.personId, x.datum).gueltig[0]?.baustelleId)?.id === b.id ? s + rechnung(d, x.personId, x.datum).arbeitMin / 60 : s), 0),
  }));
  const max = Math.max(1, ...proTag.map((x) => x.h));
  return (
    <Seite titel="Baustelle" menue="baustelle">
      <h1 className="h1 gross">Baustelle</h1>
      <BaustelleWahl liste={liste} wert={bs} setWert={setBs} />
      <span className="unter">{bsLang(b)}</span>
      <StundenKarte d={d} b={b} />
      <section aria-label="Diese Woche" className="karte pad">
        <span className="fett klein" style={{ color: 'var(--blau-dunkel)' }}>Diese Woche (gesendete Tage)</span>
        {proTag.map((x) => (
          <div key={x.t} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 64px', alignItems: 'center', gap: 8 }}>
            <span className="fett">{wtKurz(x.t)}</span>
            <div className="balken"><span style={{ width: `${(x.h / max) * 100}%`, background: 'var(--blau)' }} /></div>
            <span className="tab" style={{ textAlign: 'right' }}>{Math.round(x.h)} h</span>
          </div>
        ))}
      </section>
      <Link to={`/p/kosten/${b.id}`} className="zeile karte" style={{ minHeight: 56, padding: '8px 16px' }}><span className="wachs"><span className="fett">Kosten der Baustelle</span><span className="klein">Lohn, Material, Geräte</span></span><Weiter /></Link>
    </Seite>
  );
}

/** P14: Kosten (NU nur in der Summe) */
export function PKosten() {
  const { id = '' } = useParams();
  const { d, ich } = useDaten();
  const b = baustelle(d, id);
  const zurueck = ich?.rolle === 'bauleitung' ? `/b/baustelle/${id}` : '/p/auswertung';
  if (!b) return null;
  return (
    <Seite titel="Kosten" menue="baustelle">
      <Zurueck to={zurueck}>Baustelle</Zurueck>
      <h1 className="h1">Kosten {b.kst}</h1>
      <ul className="liste">
        {b.kosten.map((k) => {
          const am = ampel(k.ist, k.soll);
          return (
            <li key={k.art} className="zeile">
              <span className="punkt" style={{ background: am.farbe }} aria-hidden="true" />
              <span className="wachs"><span className="fett">{k.art}</span><span className="klein">Soll {euro(k.soll)}</span></span>
              <span className="tab fett">{euro(k.ist)}</span>
            </li>
          );
        })}
        <li className="zeile">
          <span className="wachs"><span className="fett">Gesamt mit Nachunternehmern</span><span className="klein">Soll {euro(b.gesamtSoll)}</span></span>
          <span className="tab fett">{euro(b.gesamtIst)}</span>
        </li>
      </ul>
      <p className="text">Stand aus der Baustellenabrechnung. Nachunternehmer stecken nur in der Gesamtsumme.</p>
    </Seite>
  );
}

/** P15: Mehr für den Polier */
export function PMehr() {
  const { abmelden } = useDaten();
  const nav = useNavigate();
  const gruppen = [
    { titel: 'Kolonne', punkte: [
      { text: 'Stunden ohne Handy', to: '/p/ohne-handy' },
      { text: 'Zeiten nachtragen', to: '/p/nachtragen' },
      { text: 'Helfer und Nachunternehmer', to: '/p/helfer' },
      { text: 'Ausfall melden', to: '/p/ausfall', zusatz: '01.12.–31.03.' },
      { text: 'Stempeln vergessen', to: '/p/vorschlag' },
    ] },
    { titel: 'Für mich', punkte: [
      { text: 'Meine Zeit stempeln', to: '/ma/heute' },
      { text: 'Meine Einteilung', to: '/ma/einteilung' },
      { text: 'Mein Konto', to: '/ma/konto' },
      { text: 'Urlaub und Anträge', to: '/ma/antraege' },
    ] },
    { titel: 'Nachunternehmer', punkte: [{ text: 'Ausweis eintragen', to: '/ma/ausweis' }] },
    { titel: 'Am PC', punkte: [{ text: 'PC-Ansicht öffnen', to: '/pc/polier' }] },
    { titel: 'Hilfe', punkte: [{ text: 'Hilfe', to: '/hilfe' }, { text: 'Häufige Fragen', to: '/faq' }, { text: 'Einführung ansehen', to: '/intro' }, { text: 'Datenschutz', to: '/datenschutz' }] },
    { titel: 'Sicherheit', punkte: [{ text: 'Mitteilungen', to: '/ma/mitteilungen' }, { text: 'PIN ändern', to: '/ma/pin' }, { text: 'Meine Geräte', to: '/ma/geraete' }] },
  ];
  return (
    <Seite titel="Mehr" menue="mehr">
      <h1 className="h1 gross">Mehr</h1>
      <MehrListe gruppen={gruppen} />
      <Demo abmelden={() => { abmelden(); nav('/'); }} />
    </Seite>
  );
}
