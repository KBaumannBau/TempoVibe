// 6: Mitarbeiter-Stammdaten · 7: Mehrstunden Angestellte · 9: Abwesenheiten · 10: Betriebsurlaub (Entwurf V1)

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PcSeite, Pill, Pk, Reiter, h1, rollenText, useToast, zahlDe } from '../../components/Pc';
import { useDaten } from '../../domain/store';
import { kontoStand, nameKomma, person, urlaubRest, voll } from '../../domain/sel';
import { arbeitstage, feiertage, istWerktag, monatPlus, monatVon, plusTage, sollFuer, tm, tmj, wtKurz } from '../../domain/zeit';
import type { Antrag, Daten, Gruppe, Person } from '../../domain/types';

const GRUPPE: Record<Gruppe, string> = { gewerblich: 'Gewerblich (BRTV)', angestellt: 'Angestellt (RTV)', azubi: 'Auszubildend' };
const ZUGANG: Record<Person['zugang'], { t: string; f: 'gruen' | 'orange' | 'rot' | undefined }> = {
  aktiv: { t: 'App aktiv', f: 'gruen' }, eingeladen: { t: 'eingeladen', f: 'orange' }, gesperrt: { t: 'gesperrt', f: 'rot' }, ohne: { t: 'ohne App', f: undefined },
};
const mitarbeiter = (d: Daten) => d.personen.filter((p) => p.rolle !== 'nu' && p.rolle !== 'gl' && p.rolle !== 'admin').sort((a, b) => nameKomma(a).localeCompare(nameKomma(b)));

// ------------------------------------------------------------------ Stammdaten

export function PcMitarbeiter() {
  const { d, a } = useDaten();
  const [suche, setSuche] = useState('');
  const [selId, setSel] = useState('stefan');
  const [neu, setNeu] = useState(false);
  const [toast, zeige] = useToast();
  const liste = mitarbeiter(d).filter((p) => `${p.vorname} ${p.nachname} ${p.persNr}`.toLowerCase().includes(suche.trim().toLowerCase()));
  const p = d.personen.find((x) => x.id === selId) ?? liste[0];
  return (
    <PcSeite titel="Mitarbeiter-Stammdaten" pfad="Mitarbeiter › Stammdaten" rechts={<Pk farbe="blau" onClick={() => setNeu(true)}>+ Mitarbeiter anlegen</Pk>}>
      {toast}
      {neu && <Anlegen onFertig={(id, txt) => { setNeu(false); if (id) { setSel(id); zeige(txt ?? ''); } }} />}
      <div className="pc-liste-detail">
        <div className="pc-wahlliste" aria-label="Mitarbeiter">
          <div style={{ padding: 10 }}><input className="pc-in" style={{ width: '100%' }} aria-label="Suche" placeholder="Suche Name oder Personalnummer" value={suche} onChange={(e) => setSuche(e.target.value)} /></div>
          <span className="klein" style={{ padding: '0 14px 6px' }}>Mitarbeiter ({liste.length})</span>
          {liste.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === p?.id} onClick={() => setSel(x.id)}>
              <strong>{nameKomma(x)}</strong>
              <span className="klein">{x.persNr} · {GRUPPE[x.gruppe].split(' ')[0]} · {rollenText(x.rolle) === x.rolle ? funktion(x) : rollenText(x.rolle)} {x.zugang !== 'aktiv' && <Pill farbe={ZUGANG[x.zugang].f}>{ZUGANG[x.zugang].t}</Pill>}</span>
            </button>
          ))}
        </div>
        {p && <Detail key={p.id} p={p} zeige={zeige} a={a} d={d} />}
      </div>
    </PcSeite>
  );
}

const funktion = (p: Person) => ({ facharbeiter: 'Facharbeiter', helfer: p.gruppe === 'azubi' ? 'Azubi' : 'Helfer', vorarbeiter: 'Vorarbeiter', polier: 'Polier', bauleitung: 'Bauleiter' } as Record<string, string>)[p.rolle] ?? rollenText(p.rolle);

function Anlegen({ onFertig }: { onFertig: (id?: string, txt?: string) => void }) {
  const { d, a } = useDaten();
  const [name, setName] = useState('');
  const [gruppe, setGruppe] = useState<Gruppe>('gewerblich');
  const [eintritt, setEintritt] = useState(plusTage(d.heute, 7));
  const [mail, setMail] = useState('');
  const [handy, setHandy] = useState('');
  const [fehler, setFehler] = useState('');
  const los = () => {
    const teile = name.trim().split(/\s+/);
    if (teile.length < 2) return setFehler('Bitte Vor- und Nachnamen eintragen.');
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim())) return setFehler('Die E-Mail-Adresse sieht nicht gültig aus.');
    const id = a.personAnlegen({ vorname: teile.slice(0, -1).join(' '), nachname: teile[teile.length - 1], gruppe, eintritt, email: mail.trim() || undefined, handy: handy.trim() || undefined });
    onFertig(id, mail ? `${name.trim()} angelegt. Die Einladung mit Anmelde-Code geht an ${mail.trim()}.` : `${name.trim()} angelegt, noch ohne App-Zugang.`);
  };
  return (
    <section className="pc-karte" aria-label="Mitarbeiter anlegen" style={{ borderColor: 'var(--blau)' }}>
      <h2>Mitarbeiter anlegen</h2>
      <div className="pc-formular">
        <label className="pc-feld"><span>Vor- und Nachname</span><input value={name} onChange={(e) => { setName(e.target.value); setFehler(''); }} /></label>
        <label className="pc-feld"><span>Gruppe</span><select value={gruppe} onChange={(e) => setGruppe(e.target.value as Gruppe)}><option value="gewerblich">Gewerblich</option><option value="angestellt">Angestellt</option><option value="azubi">Auszubildend</option></select></label>
        <label className="pc-feld"><span>Eintritt</span><input type="date" value={eintritt} onChange={(e) => setEintritt(e.target.value)} /></label>
        <label className="pc-feld"><span>E-Mail-Adresse (für die App)</span><input type="email" value={mail} onChange={(e) => setMail(e.target.value)} /></label>
        <label className="pc-feld"><span>Handynummer (freiwillig)</span><input value={handy} onChange={(e) => setHandy(e.target.value)} /></label>
      </div>
      <span className="klein">Ohne E-Mail-Adresse wird keine Einladung verschickt. Die Personalnummer vergibt das System.</span>
      {fehler && <div role="alert" className="meldung rot">{fehler}</div>}
      <div className="pk-reihe"><Pk onClick={() => onFertig()}>Abbrechen</Pk><Pk farbe="blau" onClick={los}>Anlegen</Pk></div>
    </section>
  );
}

function Detail({ p, d, a, zeige }: { p: Person; d: Daten; a: ReturnType<typeof useDaten>['a']; zeige: (t: string, f?: 'gruen' | 'orange' | 'rot' | 'blau') => void }) {
  const stichtag = `${monatVon(plusTage(d.heute, 31))}-01`;
  const [ab, setAb] = useState(stichtag);
  const [gruppe, setGruppe] = useState(p.gruppe);
  const [abweichend, setAbw] = useState(!!p.wochenStunden && p.gruppe !== 'angestellt');
  const [woche, setWoche] = useState(String(p.wochenStunden ?? (p.gruppe === 'angestellt' ? 38 : 41)).replace('.', ','));
  const [anspruch, setAnspruch] = useState(String(p.urlaubAnspruch));
  const [kinder, setKinder] = useState(p.kinder);
  const [kind, setKind] = useState('');
  const [allein, setAllein] = useState(!!p.alleinerziehend);
  const [u18, setU18] = useState(!!p.unter18);
  const [mail, setMail] = useState(p.email ?? '');
  const [handy, setHandy] = useState(p.handy ?? '');
  const [austritt, setAustritt] = useState(p.austritt ?? '');
  const [sperrFrage, setSperrFrage] = useState(false);
  const geaendert = gruppe !== p.gruppe || Number(anspruch) !== p.urlaubAnspruch || kinder.join() !== p.kinder.join() || allein !== !!p.alleinerziehend || u18 !== !!p.unter18
    || mail !== (p.email ?? '') || handy !== (p.handy ?? '') || austritt !== (p.austritt ?? '') || (abweichend || p.gruppe === 'angestellt' ? zahlDe(woche) !== (p.wochenStunden ?? (p.gruppe === 'angestellt' ? 38 : 41)) : !!p.wochenStunden);
  const speichern = () => {
    const w = zahlDe(woche);
    if (!(Number(anspruch) >= 20 && Number(anspruch) <= 40)) return zeige('Urlaubsanspruch bitte zwischen 20 und 40 Arbeitstagen.', 'rot');
    if ((abweichend || gruppe === 'angestellt') && !(w > 0 && w <= 48)) return zeige('Wochenarbeitszeit bitte zwischen 1 und 48 Stunden.', 'rot');
    const patch: Partial<Person> = { gruppe, urlaubAnspruch: Number(anspruch), kinder, alleinerziehend: allein, unter18: u18, email: mail.trim() || undefined, handy: handy.trim() || undefined, austritt: austritt || undefined };
    if (abweichend || gruppe === 'angestellt') {
      patch.wochenStunden = w;
      const tag = gruppe === 'angestellt' ? Math.round((w / 5) * 4) / 4 : w / 41 * 8.5;
      patch.sollMoDo = gruppe === 'angestellt' ? tag : Math.round(tag * 4) / 4;
      patch.sollFr = gruppe === 'angestellt' ? Math.round((w - tag * 4) * 4) / 4 : Math.round((w - patch.sollMoDo * 4) * 4) / 4;
    } else { patch.wochenStunden = undefined; patch.sollMoDo = 8.5; patch.sollFr = 7; }
    a.personAendern(p.id, patch, gruppe !== p.gruppe || patch.wochenStunden !== p.wochenStunden ? ab : undefined);
    zeige(`Gespeichert. ${gruppe !== p.gruppe || patch.wochenStunden !== p.wochenStunden ? `Gruppe und Arbeitszeit gelten ab ${tmj(ab)}.` : ''}`);
  };
  const urlaub = urlaubRest(d, p.id);
  const kk = (allein ? 2 : 1) * 15 * Math.max(1, kinder.length);
  const regeln = gruppe === 'gewerblich' ? ['BRTV Bau: Sommer 41 h, Winter 38 h', 'Zuschläge nach Katalog', 'SIKOFlex-Arbeitszeitkonto (max. 150 h)', 'Ortung beim Stempeln'] : gruppe === 'azubi' ? ['Ausbildungstarif, kein Arbeitszeitkonto', 'Berufsschultage aus dem Stundenplan', 'Ortung beim Stempeln'] : ['RTV Angestellte', 'Mehrstunden-Konto (ab 100 h Genehmigung GL)', 'keine Ortung', 'Freigabe durch Bauleitung bzw. Oberbauleitung'];
  const freigabe = p.rolle === 'polier' ? 'Bauleitung (direkt)' : p.rolle === 'bauleitung' ? 'Oberbauleitung' : p.gruppe === 'angestellt' ? 'Vorgesetzter (Oberbauleitung)' : 'Polier, dann Bauleitung';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section className="pc-karte">
        <div className="pk-reihe" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 22 }}>{voll(p)}</h2>
          <div className="pk-reihe">
            <label className="pc-feld" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><span>Änderung gültig ab</span><input type="date" min={stichtag} value={ab} onChange={(e) => setAb(e.target.value < stichtag ? stichtag : e.target.value)} /></label>
            <Pk farbe="blau" gesperrt={!geaendert} onClick={speichern}>Speichern</Pk>
          </div>
        </div>
        <span className="klein">Frühestens ab {tmj(stichtag)} (der laufende Monat ist schon in der Abrechnung). Jede Änderung steht im Änderungsverlauf.</span>
      </section>
      <div className="pc-zwei">
        <section className="pc-karte">
          <h2>Beschäftigung</h2>
          <dl className="dl">
            <dt>Personalnummer</dt><dd className="mono">{p.persNr}</dd>
            <dt>Eintritt</dt><dd>{tmj(p.eintritt)}</dd>
            <dt>Funktion</dt><dd>{funktion(p)}</dd>
            <dt>Freigabe der Stunden</dt><dd>{freigabe}</dd>
          </dl>
          <label className="pc-feld"><span>Austritt am</span><input type="date" value={austritt} onChange={(e) => setAustritt(e.target.value)} /></label>
          {austritt && <span className="klein">Nach dem Austritt wird der App-Zugang automatisch gesperrt. Daten bleiben nach den Aufbewahrungsfristen erhalten.</span>}
          <fieldset className="pc-feld" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-2)' }}>Beschäftigtengruppe (legt die Tarifregeln fest)</legend>
            <Reiter label="Gruppe" wert={gruppe} setWert={setGruppe} optionen={(['gewerblich', 'angestellt', 'azubi'] as Gruppe[]).map((g) => ({ wert: g, text: GRUPPE[g] }))} />
          </fieldset>
          <span className="klein">Es gelten automatisch: {regeln.join(' · ')}</span>
          {gruppe === 'azubi' && (
            <label className="check"><input type="checkbox" checked={u18} onChange={(e) => setU18(e.target.checked)} /> Unter 18 Jahre (Jugendarbeitsschutzgesetz): höchstens 8 h am Tag, 40 h in der Woche, keine Arbeit zwischen 20 und 6 Uhr</label>
          )}
        </section>
        <section className="pc-karte">
          <h2>Arbeitszeit</h2>
          {gruppe !== 'angestellt' && <Reiter label="Arbeitszeit" wert={abweichend ? 'abw' : 'tarif'} setWert={(w) => setAbw(w === 'abw')} optionen={[{ wert: 'tarif', text: 'Tariflich (BRTV)' }, { wert: 'abw', text: 'Abweichend (Teilzeit)' }]} />}
          {gruppe !== 'angestellt' && !abweichend
            ? <span className="text">Sommer 41 h (Mo–Do 8,5 h, Fr 7 h) · Winter 38 h (Mo–Do 8 h, Fr 6 h)</span>
            : <label className="pc-feld"><span>Wochenarbeitszeit laut Arbeitsvertrag (Stunden)</span><input className="pc-in schmal" inputMode="decimal" value={woche} onChange={(e) => setWoche(e.target.value)} /></label>}
          <span className="klein">Soll heute: {h1(sollFuer(p, d.heute))}. Die Stunden gelten als Soll für Arbeitszeitkonto, Kalender, Urlaubsanträge und Betriebsurlaub.</span>
          <label className="pc-feld"><span>Urlaubsanspruch pro Jahr (Arbeitstage, Schwerbehinderung: 35)</span><input className="pc-in schmal" inputMode="numeric" value={anspruch} onChange={(e) => setAnspruch(e.target.value.replace(/\D/g, ''))} /></label>
          <span className="klein">Rest {urlaub.rest} Tage, davon verplant {urlaub.verplant}. Konto: {h1(kontoStand(d, p.id))}</span>
          <div className="pc-feld"><span>Kinder unter 12 Jahren (für Kinderkrankentage)</span>
            <div className="pk-reihe">
              {kinder.length ? kinder.map((k) => <span key={k} className="pill">{k} <button type="button" className="link" aria-label={`Kind ${k} entfernen`} onClick={() => setKinder(kinder.filter((x) => x !== k))}>×</button></span>) : <span className="klein">keine eingetragen</span>}
              <input className="pc-in schmal" placeholder="MM/JJJJ" aria-label="Geburtsmonat und -jahr" value={kind} onChange={(e) => setKind(e.target.value)} />
              <Pk klein onClick={() => { if (/^(0[1-9]|1[0-2])\/20\d\d$/.test(kind) && !kinder.includes(kind)) { setKinder([...kinder, kind]); setKind(''); } else zeige('Bitte Geburtsmonat und -jahr als MM/JJJJ eintragen.', 'rot'); }}>+ Kind</Pk>
            </div>
            <span className="klein">Es wird kein Name gespeichert, nur Geburtsmonat und -jahr.</span>
          </div>
          <label className="check"><input type="checkbox" checked={allein} onChange={(e) => setAllein(e.target.checked)} /> Alleinerziehend</label>
          {kinder.length > 0 && <span className="klein">Kinderkrankentage: bis zu {kk} Arbeitstage im Jahr (gesetzlich, Stand 2026).</span>}
        </section>
      </div>
      <section className="pc-karte">
        <div className="pk-reihe" style={{ justifyContent: 'space-between' }}><h2>App-Zugang</h2><Pill farbe={ZUGANG[p.zugang].f}>{ZUGANG[p.zugang].t}</Pill></div>
        <div className="pc-formular">
          <label className="pc-feld"><span>E-Mail-Adresse für Einladung und Anmelde-Code</span><input type="email" value={mail} onChange={(e) => setMail(e.target.value)} /></label>
          <label className="pc-feld"><span>Handynummer (freiwillig)</span><input value={handy} onChange={(e) => setHandy(e.target.value)} /></label>
        </div>
        <span className="klein">Die Handynummer ist nur Kontaktangabe für das Büro. Für die Anmeldung in der App ist sie nicht nötig.</span>
        {!p.nutztApp && <div className="meldung blau">Kein Smartphone: Der Polier erfasst die Stunden. Bestätigt wird mit der PIN am Handy des Poliers.</div>}
        <div className="pk-reihe">
          {(p.zugang === 'ohne' || p.zugang === 'gesperrt') && <Pk farbe="blau" gesperrt={!p.email} titel={!p.email ? 'Zuerst E-Mail-Adresse speichern' : undefined} onClick={() => { a.zugangSetzen(p.id, 'eingeladen', 'Einladung gesendet'); zeige(`Einladung mit Anmelde-Code an ${p.email} gesendet. Der Code gilt 7 Tage.`); }}>Einladung senden</Pk>}
          {p.zugang === 'eingeladen' && <Pk onClick={() => { a.zugangSetzen(p.id, 'ohne', 'Einladung zurückgezogen'); zeige('Einladung zurückgezogen.'); }}>Einladung zurückziehen</Pk>}
          <Pk onClick={() => zeige('Die Einladung mit QR-Code ist zum Drucken bereit (in der Demo ohne Ausdruck).', 'blau')}>Einladung drucken (QR-Code)</Pk>
          {p.zugang === 'aktiv' && <Pk onClick={() => { a.zugangSetzen(p.id, 'aktiv', 'PIN zurückgesetzt'); zeige('PIN zurückgesetzt. Der PIN-Brief mit der Start-PIN ist zum Drucken bereit.'); }}>PIN zurücksetzen</Pk>}
          {p.zugang !== 'gesperrt' && p.zugang !== 'ohne' && <Pk farbe="rot" onClick={() => setSperrFrage(true)}>Zugang sperren</Pk>}
        </div>
        {sperrFrage && (
          <div className="meldung rot" role="alertdialog" aria-label="Zugang sperren">
            <span>{voll(p)} wird auf allen Handys sofort abgemeldet. Erfasste Stunden und der Änderungsverlauf bleiben erhalten.</span>
            <div className="pk-reihe" style={{ marginTop: 8 }}><Pk onClick={() => setSperrFrage(false)}>Abbrechen</Pk><Pk farbe="rot" onClick={() => { a.zugangSetzen(p.id, 'gesperrt', 'Zugang gesperrt'); setSperrFrage(false); zeige('Zugang gesperrt.', 'orange'); }}>Ja, sperren</Pk></div>
          </div>
        )}
        <span className="klein">Den Code gibt das Büro oder der Polier nur persönlich weiter. Die eigene PIN sieht niemand, auch die Verwaltung nicht.</span>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Mehrstunden

const ANG_ROLLEN = ['polier', 'bauleitung', 'buero', 'oberbauleitung', 'einkauf'];

export function mehrStand(d: Daten, id: string) {
  const start = `${monatPlus(monatVon(d.heute), -1)}-01`;
  return kontoStand(d, id) - d.mehrBuchungen.filter((b) => b.personId === id && b.datum >= start).reduce((s, b) => s + b.stunden, 0);
}

export function PcMehrstunden() {
  const { d, a } = useDaten();
  const leute = d.personen.filter((p) => p.gruppe === 'angestellt' && ANG_ROLLEN.includes(p.rolle));
  const [selId, setSel] = useState('keller');
  const p = leute.find((x) => x.id === selId) ?? leute[0];
  const [art, setArt] = useState<'auszahlung' | 'frei'>('auszahlung');
  const [std, setStd] = useState('');
  const [monat, setMonat] = useState(monatVon(d.heute));
  const [von, setVon] = useState('');
  const [bis, setBis] = useState('');
  const [bem, setBem] = useState('');
  const [frage, setFrage] = useState(false);
  const [toast, zeige] = useToast();
  const stand = mehrStand(d, p.id);
  const bestaetigt = kontoStand(d, p.id, true) - (kontoStand(d, p.id) - stand);
  const h = zahlDe(std);
  const verlauf = useMemo(() => {
    const out: { wann: string; was: string; h: number; von: string }[] = [{ wann: 'Stand vorher', was: 'Übertrag', h: p.kontoStart, von: '–' }];
    const tage = d.tage.filter((t) => t.personId === p.id && t.status !== 'offen');
    const proMonat = new Map<string, number>();
    for (const t of tage) proMonat.set(monatVon(t.datum), (proMonat.get(monatVon(t.datum)) ?? 0) + 0);
    const diff = kontoStand(d, p.id) - p.kontoStart;
    if (tage.length) out.push({ wann: `${tm(tage[0].datum)}–${tm(tage[tage.length - 1].datum)}`, was: 'Mehrstunden aus Freigabe', h: diff, von: 'System' });
    for (const b of d.mehrBuchungen.filter((x) => x.personId === p.id)) out.push({ wann: tmj(b.datum), was: b.art === 'auszahlung' ? `Auszahlung mit Gehalt ${b.monat ?? ''}` : `Freizeitausgleich ${b.von ? tm(b.von) : ''}–${b.bis ? tm(b.bis) : ''}`, h: -b.stunden, von: b.erfasstVon });
    return out;
  }, [d, p]);
  const pruefen = (): string | undefined => {
    if (!(h > 0)) return 'Bitte Stunden größer 0 eingeben.';
    if (h > stand) return `Mehr als der aktuelle Stand (${h1(stand)}). Bitte weniger Stunden eingeben.`;
    if (art === 'auszahlung' && h > bestaetigt) return `Auszahlbar sind nur bestätigte Stunden: höchstens ${h1(bestaetigt)}.`;
    if (art === 'frei') {
      if (!von || !bis) return 'Bitte „Frei von“ und „bis“ wählen. Für einen einzelnen Tag zweimal dasselbe Datum.';
      if (von <= d.heute) return `Der Zeitraum muss in der Zukunft liegen (ab ${tmj(plusTage(d.heute, 1))}).`;
      if (bis < von) return '„bis“ liegt vor „Frei von“. Bitte den Zeitraum prüfen.';
      if (!istWerktag(von) || !istWerktag(bis)) return 'Erster und letzter Tag müssen Arbeitstage sein (kein Wochenende, kein Feiertag).';
      const max = arbeitstage(von, bis) * p.sollMoDo;
      if (h > max) return `Zu viele Stunden für den Zeitraum: höchstens ${h1(max)}.`;
    }
    if (!bem.trim()) return 'Bitte die Absprache eintragen (mit wem, wann).';
  };
  const fehler = std ? pruefen() : undefined;
  return (
    <PcSeite titel="Mehrstunden Angestellte" pfad={`Mitarbeiter › Mehrstunden · Stand ${tmj(d.heute)}`}>
      {toast}
      <div className="pc-liste-detail">
        <div className="pc-wahlliste">
          {leute.map((x) => {
            const s = mehrStand(d, x.id);
            return <button key={x.id} type="button" aria-pressed={x.id === p.id} onClick={() => { setSel(x.id); setFrage(false); }}><strong>{nameKomma(x)}</strong><span className="klein">{rollenText(x.rolle) === x.rolle ? funktion(x) : rollenText(x.rolle)} · <strong style={{ color: s >= 100 ? 'var(--rot-text)' : s >= 90 ? 'var(--orange-dunkel)' : undefined }}>{h1(s)}</strong></span></button>;
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <section className="pc-karte">
            <span className="klein">{funktion(p)} · Wochenarbeitszeit {p.wochenStunden ?? 38} h</span>
            <h2 style={{ fontSize: 22 }}>{voll(p)}</h2>
            <div className="kpi" style={{ border: 0, padding: 0 }}><span className="bez">Aktueller Stand</span><span className="wert">{h1(stand)}</span><span className="klein">davon bestätigt {h1(bestaetigt)}</span></div>
            {stand >= 100 && <div className="meldung rot"><strong>100 Mehrstunden erreicht.</strong> Weitere Überstunden müssen von der Geschäftsleitung genehmigt werden. Einträge mit Mehrstunden gehen deshalb zusätzlich an die Geschäftsleitung.</div>}
            {stand >= 90 && stand < 100 && <div className="meldung orange">Nähert sich 100 Mehrstunden. Ab 100 h ist für weitere Überstunden eine Genehmigung der Geschäftsleitung nötig.</div>}
            <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Monat / Datum</th><th>Vorgang</th><th className="r">Stunden</th><th className="r">Stand danach</th><th>Erfasst von</th></tr></thead>
              <tbody>{verlauf.reduce<{ r: typeof verlauf[number]; nach: number }[]>((acc, r) => [...acc, { r, nach: (acc[acc.length - 1]?.nach ?? 0) + r.h }], []).map(({ r, nach }, i) => <tr key={i}><td>{r.wann}</td><td>{r.was}</td><td className="r">{i === 0 ? '' : `${r.h >= 0 ? '+' : '−'}${h1(Math.abs(r.h))}`}</td><td className="r">{h1(nach)}</td><td>{r.von}</td></tr>)}</tbody></table></div>
          </section>
          <section className="pc-karte">
            <h2>Ausgleich buchen (nach Absprache)</h2>
            <Reiter label="Art" wert={art} setWert={(w) => { setArt(w); setFrage(false); }} optionen={[{ wert: 'auszahlung', text: 'Auszahlung' }, { wert: 'frei', text: 'Freizeitausgleich' }]} />
            <div className="pc-formular">
              <label className="pc-feld"><span>Stunden</span><input className="pc-in" inputMode="decimal" value={std} onChange={(e) => { setStd(e.target.value); setFrage(false); }} /></label>
              {art === 'auszahlung'
                ? <label className="pc-feld"><span>Mit Lohn/Gehalt für</span><input type="month" value={monat} onChange={(e) => setMonat(e.target.value)} /></label>
                : <><label className="pc-feld"><span>Frei von</span><input type="date" value={von} onChange={(e) => setVon(e.target.value)} /></label><label className="pc-feld"><span>bis (einschließlich)</span><input type="date" value={bis} onChange={(e) => setBis(e.target.value)} /></label></>}
              <label className="pc-feld" style={{ gridColumn: '1 / -1' }}><span>Bemerkung / Absprache mit</span><input value={bem} onChange={(e) => setBem(e.target.value)} placeholder="z. B. lt. Absprache mit der Geschäftsleitung vom …" /></label>
            </div>
            {fehler && <div className="meldung rot" role="alert">{fehler}</div>}
            {!fehler && std && <span className="klein">Neuer Stand nach Buchung: {h1(stand - h)}</span>}
            {!frage
              ? <div className="pk-reihe"><Pk farbe="blau" gesperrt={!std || !!fehler} onClick={() => setFrage(true)}>{art === 'auszahlung' ? 'Auszahlung buchen' : 'Freizeitausgleich buchen'}</Pk></div>
              : <div className="meldung blau" role="alertdialog" aria-label="Buchen bestätigen"><span>{art === 'auszahlung' ? `Auszahlung mit dem Gehalt ${monat}` : `Freizeitausgleich ${tm(von)}–${tm(bis)}`}: {h1(h)} für {voll(p)} buchen?</span>
                <div className="pk-reihe" style={{ marginTop: 8 }}><Pk onClick={() => setFrage(false)}>Abbrechen</Pk><Pk farbe="blau" onClick={() => { a.mehrBuchen({ personId: p.id, art, stunden: h, monat: art === 'auszahlung' ? monat : undefined, von: art === 'frei' ? von : undefined, bis: art === 'frei' ? bis : undefined, bem }); setFrage(false); setStd(''); setBem(''); zeige(`Gebucht. Neuer Stand ${h1(stand - h)}.`); }}>Ja, buchen</Pk></div></div>}
          </section>
        </div>
      </div>
    </PcSeite>
  );
}

// ------------------------------------------------------------------ Abwesenheiten

const ART: Record<string, string> = { krank: 'Krank', urlaub: 'Urlaub', konto: 'Frei vom Konto', arbeitsbefreiung: 'Arbeitsbefreiung', betriebsurlaub: 'Betriebsurlaub' };
const STATUS: Record<Antrag['status'], { t: string; f?: 'gruen' | 'orange' | 'rot' | 'blau' }> = {
  offen: { t: 'liegt beim Bauleiter', f: 'orange' }, bauleitung_ok: { t: 'Bauleiter ok · liegt bei der GL', f: 'orange' }, genehmigt: { t: 'genehmigt', f: 'gruen' }, abgelehnt: { t: 'abgelehnt', f: 'rot' }, gemeldet: { t: 'gemeldet', f: 'blau' },
};

export function PcAbwesenheiten() {
  const { d, a } = useDaten();
  const m = monatVon(d.heute);
  const [filter, setFilter] = useState<'alle' | 'krank' | 'urlaub' | 'befreiung' | 'nachweis'>('alle');
  const [hand, setHand] = useState(false);
  const [toast, zeige] = useToast();
  const liste = d.antraege.filter((x) => {
    const p = person(d, x.personId);
    if (!p || p.rolle === 'nu') return false;
    if (!(monatVon(x.von) >= monatPlus(m, -1) || x.bis >= d.heute || x.status === 'offen' || x.nachweis === 'fehlt')) return false;
    if (filter === 'krank') return x.art === 'krank';
    if (filter === 'urlaub') return x.art === 'urlaub' || x.art === 'konto' || x.art === 'betriebsurlaub';
    if (filter === 'befreiung') return x.art === 'arbeitsbefreiung';
    if (filter === 'nachweis') return x.nachweis === 'fehlt' || x.nachweis === 'hochgeladen';
    return true;
  }).sort((x, y) => y.von.localeCompare(x.von));
  const heuteWeg = d.antraege.filter((x) => x.von <= d.heute && x.bis >= d.heute && (x.status === 'genehmigt' || x.status === 'gemeldet'));
  const kpis = [
    { bez: 'Heute abwesend', wert: heuteWeg.length, sub: heuteWeg.map((x) => person(d, x.personId).nachname).join(', ') || 'niemand' },
    { bez: 'Krank gemeldet', wert: d.antraege.filter((x) => x.art === 'krank' && x.bis >= d.heute).length, sub: 'laufend oder angekündigt' },
    { bez: 'Nachweis fehlt', wert: d.antraege.filter((x) => x.nachweis === 'fehlt').length, sub: 'Krankschreibung oder Bescheinigung' },
    { bez: 'Anträge offen', wert: d.antraege.filter((x) => x.status === 'offen' || x.status === 'bauleitung_ok').length, sub: 'bei Bauleiter oder GL' },
  ];
  return (
    <PcSeite titel={`Abwesenheiten`} pfad="Krankmeldungen, Urlaub, Arbeitsbefreiungen und Nachweise" rechts={<div className="pk-reihe"><Link className="pk" to="/pc/betriebsurlaub">Betriebsurlaub festlegen ›</Link><Pk farbe="blau" onClick={() => setHand(true)}>+ Abwesenheit von Hand eintragen</Pk></div>}>
      {toast}
      <div className="pc-raster">{kpis.map((k) => <div key={k.bez} className="kpi"><span className="bez">{k.bez}</span><span className="wert">{k.wert}</span><span className="klein">{k.sub}</span></div>)}</div>
      {hand && <HandEintrag onFertig={(t) => { setHand(false); if (t) zeige(t); }} />}
      <Reiter label="Filter" wert={filter} setWert={setFilter} optionen={[{ wert: 'alle', text: 'Alle' }, { wert: 'krank', text: 'Krank' }, { wert: 'urlaub', text: 'Urlaub und Frei' }, { wert: 'befreiung', text: 'Arbeitsbefreiung' }, { wert: 'nachweis', text: 'Nachweis offen' }]} />
      <div className="tab-wrap"><table className="tabelle">
        <thead><tr><th>Mitarbeiter</th><th>Art</th><th>von – bis</th><th className="r">Tage</th><th>Status</th><th>Nachweis</th><th>Quelle</th><th>Aktion</th></tr></thead>
        <tbody>
          {liste.map((x) => {
            const p = person(d, x.personId);
            return (
              <tr key={x.id}>
                <td><strong>{nameKomma(p)}</strong><br /><span className="klein">{funktion(p)}</span></td>
                <td>{ART[x.art]}{x.art === 'krank' && x.wer === 'kind' ? ' (Kind)' : ''}{x.anlass ? <><br /><span className="klein">{x.anlass}</span></> : null}</td>
                <td>{wtKurz(x.von)} {tm(x.von)} – {wtKurz(x.bis)} {tm(x.bis)}{x.von <= d.heute && x.bis >= d.heute && <><br /><Pill farbe="blau">heute abwesend</Pill></>}</td>
                <td className="r">{x.tage}</td>
                <td><Pill farbe={STATUS[x.status].f}>{STATUS[x.status].t}</Pill>{x.status === 'bauleitung_ok' && <><br /><Link className="link klein" to="/pc/gl">Antrag ansehen ›</Link></>}</td>
                <td>{x.nachweis === 'fehlt' ? <Pill farbe="rot">fehlt</Pill> : x.nachweis === 'hochgeladen' ? <Pill farbe="orange">hochgeladen, prüfen</Pill> : x.nachweis === 'gesehen' ? <Pill farbe="gruen">gesehen</Pill> : '–'}{x.ersatz && <><br /><span className="klein">Wahl: {x.ersatz === 'urlaub' ? 'Urlaubstag' : x.ersatz === 'konto' ? 'vom Konto' : 'unbezahlt'}</span></>}{x.erinnert && <><br /><span className="klein">Erinnerung gesendet am {tmj(x.erinnert)}</span></>}</td>
                <td><span className="klein">{x.quelle === 'hand' ? 'Büro (von Hand)' : x.quelle === 'polier' ? 'Polier' : 'App'}<br />{tm(x.gestellt.slice(0, 10))}</span></td>
                <td><div className="pk-reihe">
                  {x.nachweis === 'hochgeladen' && <Pk klein farbe="blau" onClick={() => { a.nachweisGesehen(x.id); zeige('Nachweis als gesehen vermerkt.'); }}>Nachweis gesehen</Pk>}
                  {x.nachweis === 'fehlt' && !x.erinnert && <Pk klein onClick={() => { a.nachweisErinnern(x.id); zeige(`Erinnerung an ${voll(p)} gesendet.`); }}>Erinnern</Pk>}
                  {x.quelle === 'hand' && <Pk klein farbe="rot" onClick={() => { a.abwesenheitEntfernen(x.id); zeige('Eintrag entfernt.', 'orange'); }}>Entfernen</Pk>}
                </div></td>
              </tr>
            );
          })}
          {!liste.length && <tr><td colSpan={8} className="klein">Kein Eintrag passt zu diesem Filter.</td></tr>}
        </tbody>
      </table></div>
      <div className="pc-zwei">
        <section className="pc-karte"><h2>Krankmeldung ohne Diagnose</h2><span className="text">Die App fragt keine Diagnose ab, und hier wird keine gespeichert. Bescheinigungen sieht nur das Büro. Polier und Bauleiter sehen nur „abwesend“ und bis wann.</span></section>
        <section className="pc-karte"><h2>Automatisch weitergegeben</h2><span className="text">Jede Abwesenheit erscheint in der <Link className="link" to="/pc/disposition">Disposition</Link> und in der <Link className="link" to="/pc/stunden">Stundenübersicht</Link> (Export an die Lohnbuchhaltung: Krank K, Urlaub U, Arbeitsbefreiung S). Urlaubsanträge genehmigen Bauleiter und Geschäftsleitung, nicht das Büro.</span></section>
      </div>
    </PcSeite>
  );
}

function HandEintrag({ onFertig }: { onFertig: (t?: string) => void }) {
  const { d, a } = useDaten();
  const [pid, setPid] = useState('');
  const [art, setArt] = useState<'' | 'krank' | 'urlaub' | 'arbeitsbefreiung'>('');
  const [von, setVon] = useState(d.heute);
  const [bis, setBis] = useState(d.heute);
  const [notiz, setNotiz] = useState('');
  const fehler = [!pid && 'Mitarbeiter wählen', !art && 'Art wählen', bis < von && '„bis“ liegt vor „von“'].filter(Boolean) as string[];
  const tage = bis >= von ? arbeitstage(von, bis) : 0;
  return (
    <section className="pc-karte" style={{ borderColor: 'var(--blau)' }} aria-label="Abwesenheit von Hand eintragen">
      <h2>Abwesenheit von Hand eintragen</h2>
      <span className="text">Für Mitarbeiter ohne Smartphone oder wenn sich jemand per Telefon meldet. Alle Felder außer der Notiz sind Pflicht.</span>
      <div className="pc-formular">
        <label className="pc-feld"><span>Mitarbeiter</span><select value={pid} onChange={(e) => setPid(e.target.value)}><option value="">– bitte wählen –</option>{mitarbeiter(d).map((p) => <option key={p.id} value={p.id}>{nameKomma(p)}</option>)}</select></label>
        <label className="pc-feld"><span>Art</span><select value={art} onChange={(e) => setArt(e.target.value as typeof art)}><option value="">– bitte wählen –</option><option value="krank">Krank</option><option value="urlaub">Urlaub</option><option value="arbeitsbefreiung">Arbeitsbefreiung</option></select></label>
        <label className="pc-feld"><span>von</span><input type="date" value={von} onChange={(e) => setVon(e.target.value)} /></label>
        <label className="pc-feld"><span>bis</span><input type="date" value={bis} onChange={(e) => setBis(e.target.value)} /></label>
        <label className="pc-feld" style={{ gridColumn: '1 / -1' }}><span>Notiz (freiwillig)</span><input value={notiz} onChange={(e) => setNotiz(e.target.value)} /></label>
      </div>
      <span className="klein">Bitte keine Gesundheitsangaben und keine Diagnose eintragen. Nur, was für die Planung nötig ist.</span>
      {pid && art && !fehler.length && <div className="meldung blau">{voll(person(d, pid))}: {ART[art]} {tm(von)}–{tm(bis)}, {tage} Arbeitstage.</div>}
      <div className="pk-reihe"><Pk onClick={() => onFertig()}>Abbrechen</Pk><Pk farbe="blau" gesperrt={!!fehler.length} titel={fehler.join(', ')} onClick={() => {
        a.abwesenheitEintragen({ personId: pid, art: art as Antrag['art'], von, bis, tage, notiz: notiz || undefined, nachweis: art === 'arbeitsbefreiung' || (art === 'krank' && tage > 3) ? 'fehlt' : undefined, quelle: 'hand' });
        onFertig(`${voll(person(d, pid))}: ${ART[art]} eingetragen.`);
      }}>Abwesenheit eintragen</Pk></div>
    </section>
  );
}

// ------------------------------------------------------------------ Betriebsurlaub

export function PcBetriebsurlaub() {
  const { d, a } = useDaten();
  const bu = d.betriebsurlaub;
  const [von, setVon] = useState(bu.von);
  const [bis, setBis] = useState(bu.bis);
  const [frage, setFrage] = useState(false);
  const [jahr, setJahr] = useState(Number(d.heute.slice(0, 4)));
  const [toast, zeige] = useToast();
  const brauchtTage = (gew: boolean) => {
    let n = 0;
    for (let k = von; k <= bis; k = plusTage(k, 1)) {
      if (!istWerktag(k)) continue;
      const md = k.slice(5);
      if (md === '12-24' || md === '12-31') { if (gew) n += 0; continue; }
      n++;
    }
    return n;
  };
  const gewNeed = brauchtTage(true), angNeed = brauchtTage(false);
  const zeilen = mitarbeiter(d).map((p) => {
    const rest = urlaubRest(d, p.id).rest;
    const k = p.gruppe === 'azubi' ? null : kontoStand(d, p.id);
    const fehlt = Math.max(0, angNeed - rest);
    const hrs = fehlt * 8;
    const w = bu.wahl[p.id];
    let st: { t: string; f: 'gruen' | 'orange' | 'rot' }, vor = '–', nach = k === null ? 'kein Konto' : `unverändert (${h1(k)})`;
    if (!fehlt) st = { t: 'Urlaub reicht', f: 'gruen' };
    else if (k !== null && k - hrs >= 50) { vor = `${fehlt} Tage (${h1(hrs)}) vom Konto`; nach = h1(k - hrs); st = w?.zustimmung ? { t: 'Zustimmung liegt vor', f: 'gruen' } : { t: 'Zustimmung offen', f: 'orange' }; }
    else { vor = 'kein Abzug möglich'; st = { t: 'Klärung nötig', f: 'rot' }; }
    return { p, rest, fehlt, vor, nach, st, w };
  });
  const fh = [...feiertage(jahr).entries()].sort();
  return (
    <PcSeite titel={`Betriebsurlaub ${von.slice(0, 4)}/${bis.slice(2, 4)} festlegen`} pfad="‹ Abwesenheiten › Betriebsurlaub">
      {toast}
      <section className="pc-karte">
        <div className="pc-formular">
          <label className="pc-feld"><span>Von</span><input type="date" value={von} disabled={!!bu.festgelegt} onChange={(e) => setVon(e.target.value)} /></label>
          <label className="pc-feld"><span>Bis</span><input type="date" value={bis} disabled={!!bu.festgelegt} onChange={(e) => setBis(e.target.value)} /></label>
          <div className="kpi" style={{ border: 0, padding: 0 }}><span className="bez">Benötigte Urlaubstage</span><span className="wert">{angNeed}</span><span className="klein">{arbeitstage(von, bis)} Werktage ohne Feiertage im Zeitraum</span></div>
        </div>
        <span className="klein">Bundesland Bayern: 25./26.12., 1.1. und 6.1. (Hl. Drei Könige) sind Feiertage. 24.12. und 31.12. sind tariflich arbeitsfrei.</span>
        <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Gruppe</th><th>24.12. und 31.12.</th><th className="r">Urlaubstage nötig</th><th>Stunden je Tag (wenn vom Konto)</th></tr></thead><tbody>
          <tr><td>Gewerbliche (BRTV)</td><td>arbeitsfrei, <strong>ohne Lohn</strong>. Mitarbeiter wählt in der App: Urlaubstag, unbezahlt frei oder vom Konto (solange danach mindestens 50 h bleiben)</td><td className="r">{gewNeed}</td><td>Winter (Dez–Mär): Mo–Do 8 h, Fr 6 h</td></tr>
          <tr><td>Angestellte und Poliere (RTV)</td><td>arbeitsfrei, <strong>gilt als gearbeitet</strong> (bezahlt)</td><td className="r">{angNeed}</td><td>laut Arbeitsvertrag, z. B. 8 h</td></tr>
          <tr><td>Auszubildende</td><td>wie Angestellte</td><td className="r">{angNeed}</td><td>kein Arbeitszeitkonto</td></tr>
        </tbody></table></div>
      </section>
      <section className="pc-karte">
        <h2>Mitarbeiter</h2>
        <div className="pk-reihe"><Pill farbe="gruen">{zeilen.filter((z) => z.st.f === 'gruen').length} Urlaub reicht oder zugestimmt</Pill><Pill farbe="orange">{zeilen.filter((z) => z.st.f === 'orange').length} Zustimmung offen</Pill><Pill farbe="rot">{zeilen.filter((z) => z.st.f === 'rot').length} Klärung nötig</Pill></div>
        <div className="tab-wrap"><table className="tabelle"><thead><tr><th>Mitarbeiter</th><th>Gruppe</th><th className="r">Resturlaub</th><th className="r">Fehlende Tage</th><th>Vorschlag</th><th>Konto danach</th><th>Status</th><th>Wahl 24./31.12.</th></tr></thead><tbody>
          {zeilen.map((z) => <tr key={z.p.id}><td>{nameKomma(z.p)}</td><td>{GRUPPE[z.p.gruppe].split(' ')[0]}</td><td className="r">{z.rest}</td><td className="r">{z.fehlt || '–'}</td><td>{z.vor}</td><td>{z.nach}</td><td><Pill farbe={z.st.f}>{z.st.t}</Pill></td><td className="klein">{z.p.gruppe === 'gewerblich' ? (z.w ? `${WAHL[z.w.d24]} / ${WAHL[z.w.d31]}` : 'noch nicht gewählt') : 'bezahlt frei'}</td></tr>)}
        </tbody></table></div>
        <span className="klein">Im Betriebsurlaub sind keine Minusstunden erlaubt. Reicht der Resturlaub nicht, kann der Rest vom Arbeitszeitkonto genommen werden, solange das Konto danach nicht unter 50 h fällt. Ein Abzug vom Konto erfolgt nur mit Zustimmung des Mitarbeiters in der App. Reichen Urlaub und Konto nicht, klärt das Büro den Tag einzeln <Pill farbe="vor">rechtlich prüfen</Pill></span>
        {bu.festgelegt
          ? <div className="meldung gruen">Festgelegt am {tmj(bu.festgelegt)} für {tmj(bu.von)} bis {tmj(bu.bis)}. Die Mitarbeiter haben die Einträge in ihrer App. <Pk klein onClick={() => { a.betriebsurlaubAufheben(); zeige('Die Festlegung kann jetzt geändert werden.', 'orange'); }}>Festlegung ändern</Pk></div>
          : !frage
            ? <div className="pk-reihe"><Pk farbe="blau" gesperrt={bis <= von} onClick={() => setFrage(true)}>Für alle verbindlich festlegen</Pk><span className="klein">Ankündigung mindestens [FRIST] vorher <Pill farbe="vor">rechtlich prüfen</Pill></span></div>
            : <div className="meldung blau" role="alertdialog" aria-label="Festlegen bestätigen">Betriebsurlaub {tmj(von)} bis {tmj(bis)} für alle {zeilen.length} Mitarbeiter festlegen? Alle bekommen eine Mitteilung in der App.
              <div className="pk-reihe" style={{ marginTop: 8 }}><Pk onClick={() => setFrage(false)}>Abbrechen</Pk><Pk farbe="blau" onClick={() => { a.betriebsurlaubFestlegen(von, bis); setFrage(false); zeige('Betriebsurlaub festgelegt. Die Mitarbeiter sind benachrichtigt.'); }}>Ja, festlegen</Pk></div></div>}
      </section>
      <section className="pc-karte">
        <div className="pk-reihe" style={{ justifyContent: 'space-between' }}><h2>Feiertage Bayern {jahr}</h2><Reiter label="Jahr" wert={String(jahr)} setWert={(j) => setJahr(Number(j))} optionen={[String(jahr === Number(d.heute.slice(0, 4)) ? jahr : jahr - 1), String((jahr === Number(d.heute.slice(0, 4)) ? jahr : jahr - 1) + 1)].map((j) => ({ wert: j, text: j }))} /></div>
        <span className="klein">Werden automatisch berechnet und in allen Kalendern, Urlaubsanträgen und im Soll berücksichtigt.</span>
        <div className="tab-wrap"><table className="tabelle"><tbody>{fh.map(([k, n]) => <tr key={k}><td>{wtKurz(k)} {tmj(k)}</td><td>{n}</td><td className="klein">{istWerktag(k) || ['Sa', 'So'].includes(wtKurz(k)) ? (['Sa', 'So'].includes(wtKurz(k)) ? 'fällt aufs Wochenende' : '') : 'Feiertagslohn'}</td></tr>)}</tbody></table></div>
        <span className="klein">Mariä Himmelfahrt (15.08.) gilt am Betriebssitz als Feiertag. Nicht gesetzlich, aber tariflich arbeitsfrei: 24.12. und 31.12. Buß- und Bettag ist in Bayern kein Feiertag.</span>
      </section>
    </PcSeite>
  );
}

const WAHL = { frei: 'unbezahlt frei', konto: 'vom Konto', urlaub: 'Urlaubstag' } as const;
