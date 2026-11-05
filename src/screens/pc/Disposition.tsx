// 15: Disposition – Mitarbeiter, Helfer/NU und Geräte auf Baustellen einteilen (Entwurf V1)

import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { PcSeite, Pk, useToast } from '../../components/Pc';
import { useDaten } from '../../domain/store';
import { abwesendBis, baustelle, person, voll } from '../../domain/sel';
import { feiertag, kw, monatPlus, monatVon, montagDerWoche, plusTage, tm, uhr, wtKurz } from '../../domain/zeit';
import type { Daten, Person } from '../../domain/types';

type Auswahl = { art: 'p'; id: string } | { art: 'g'; id: string } | undefined;

const kurz = (p: Person) => (p.nachname ? `${p.vorname[0]}. ${p.nachname}` : p.vorname);

/** Warnung bei NU-Personen: Unterlagen der Firma, A1, Mindestlohnerklärung */
export function nuWarnung(d: Daten, p: Person): string | undefined {
  if (p.rolle !== 'nu') return undefined;
  const f = d.firmen.find((x) => x.id === p.firmaId);
  const ug = f?.unterlagen.filter((u) => u.status === 'abgelaufen' || u.status === 'fehlt') ?? [];
  if (ug.length) return `${f!.name}: ${ug.length} Unterlage${ug.length > 1 ? 'n' : ''} ungültig`;
  if (p.a1Bis && p.a1Bis < d.heute) return 'A1-Bescheinigung abgelaufen';
  const vm = monatPlus(monatVon(d.heute), -1);
  if (p.mindestlohn && p.mindestlohn[vm] !== 'unterschrieben') return 'Mindestlohnerklärung fehlt';
  return undefined;
}

export function PcDisposition() {
  const { d, a, ich } = useDaten();
  const darf = ich?.rolle === 'oberbauleitung' || ich?.rolle === 'bauleitung';
  const [mo, setMo] = useState(montagDerWoche(d.heute));
  const tage = [0, 1, 2, 3, 4].map((i) => plusTage(mo, i));
  const [poolTag, setPoolTag] = useState(tage.includes(d.heute) ? d.heute : tage[0]);
  const [wahl, setWahl] = useState<Auswahl>();
  const [extra, setExtra] = useState<string[]>([]);
  const [toast, zeige] = useToast();
  const aktive = d.baustellen.filter((b) => !b.archiviert);
  const zeilen = aktive.filter((b) => extra.includes(b.id) || d.einteilung.some((e) => e.baustelleId === b.id && tage.includes(e.datum)) || d.geraeteEinteilung.some((e) => e.baustelleId === b.id && tage.includes(e.datum)));
  const eigene = d.personen.filter((p) => ['facharbeiter', 'helfer', 'vorarbeiter', 'polier'].includes(p.rolle) && !p.austritt);
  const nu = d.personen.filter((p) => p.rolle === 'nu');
  const geaendert = d.einteilung.filter((e) => e.geaendert).length;
  const offeneNachrichten = d.nachrichten.filter((n) => !n.erledigt);

  const statusAm = (pid: string, datum: string) => {
    if (abwesendBis(d, pid, datum)) return 'abwesend';
    const es = d.einteilung.filter((e) => e.personId === pid && e.datum === datum);
    if (!es.length) return 'frei';
    if (es.length === 1 && es[0].haelfte) return `${es[0].haelfte === 'vm' ? 'NM' : 'VM'} frei`;
    return es.map((e) => baustelle(d, e.baustelleId)?.kst).join(' / ');
  };
  const hier = (bid: string, datum: string) => {
    if (!wahl || !darf) return;
    if (wahl.art === 'g') { a.geraetEinteilen(wahl.id, datum, bid); return; }
    const p = person(d, wahl.id);
    if (abwesendBis(d, p.id, datum)) return zeige(`${voll(p)} ist am ${tm(datum)} abwesend.`, 'orange');
    const es = d.einteilung.filter((e) => e.personId === p.id && e.datum === datum);
    const halb = es.length === 1 && es[0].haelfte ? (es[0].haelfte === 'vm' ? 'nm' : 'vm') : undefined;
    if (es.length && !halb && es.every((e) => e.baustelleId === bid)) return;
    a.einteilen(p.id, datum, bid, halb);
    const w = nuWarnung(d, p);
    if (w) zeige(`Achtung: ${voll(p)} – ${w}. Bitte mit dem Einkauf klären.`, 'rot');
  };
  const halbUmschalten = (pid: string, datum: string, bid: string) => {
    const e = d.einteilung.find((x) => x.personId === pid && x.datum === datum && x.baustelleId === bid)!;
    const next = !e.haelfte ? 'vm' : e.haelfte === 'vm' ? 'nm' : undefined;
    a.einteilen(pid, datum, null, e.haelfte);
    a.einteilen(pid, datum, bid, next);
  };
  const moBesetzungKopieren = (bid: string) => {
    for (const e of d.einteilung.filter((x) => x.baustelleId === bid && x.datum === tage[0])) for (const t of tage.slice(1)) if (!abwesendBis(d, e.personId, t) && feiertag(t) === undefined) a.einteilen(e.personId, t, bid, e.haelfte);
    zeige('Montags-Besetzung auf Di–Fr übernommen.');
  };

  return (
    <PcSeite titel="Disposition" pfad={`Mitarbeiter, Helfer und Geräte auf Baustellen einteilen · ${darf ? 'bedienen: Oberbauleitung und Bauleitung' : 'nur lesen'}`} rechts={
      <div className="pk-reihe">
        <Pk onClick={() => setMo(plusTage(mo, -7))} titel="Woche zurück">‹</Pk>
        <strong>KW {kw(mo)} · {tm(mo)}–{tm(tage[4])}{mo.slice(0, 4)}</strong>
        <Pk onClick={() => setMo(plusTage(mo, 7))} titel="Woche vor">›</Pk>
        {darf && <Pk farbe="blau" gesperrt={!geaendert} onClick={() => { a.dispoSenden(); zeige('Änderungen gesendet. Die betroffenen Personen mit App haben eine Mitteilung bekommen, die anderen informiert der Polier.'); }}>Änderungen senden{geaendert ? ` (${geaendert})` : ''}</Pk>}
      </div>}>
      {toast}
      {offeneNachrichten.map((n) => (
        <div key={n.id} className="meldung blau" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <span><strong>Nachricht vom Polier</strong> · {kurz(person(d, n.von))}{n.baustelleId ? ` (${baustelle(d, n.baustelleId)?.kst})` : ''}, {n.zeit.slice(0, 10) === d.heute ? 'heute' : tm(n.zeit.slice(0, 10))} {uhr(n.zeit)}: „{n.text}“</span>
          {darf && <Pk klein onClick={() => a.nachrichtErledigt(n.id)}>✓ Erledigt</Pk>}
        </div>
      ))}
      {darf && (
        <section className="pc-karte" aria-label="Wer und was ist frei?">
          <div className="pk-reihe" style={{ justifyContent: 'space-between' }}>
            <h2>Wer und was ist frei?</h2>
            <div className="reiter" role="group" aria-label="Tag für die Übersicht">{tage.map((t) => <button key={t} type="button" aria-pressed={t === poolTag} onClick={() => setPoolTag(t)}>{wtKurz(t)} {tm(t)}</button>)}</div>
          </div>
          <span className="klein">Mitarbeiter, Helfer oder Gerät anklicken, dann in der Tabelle bei Baustelle und Tag auf „+ hier“ klicken. Die Auswahl bleibt aktiv. Für einen Wechsel am selben Tag an der Pill auf „½“ klicken (ganz → VM → NM) und die freie Hälfte auf die andere Baustelle legen.</span>
          <div><strong className="klein">Mitarbeiter · {wtKurz(poolTag)} {tm(poolTag)}</strong><br />
            {eigene.map((p) => { const st = statusAm(p.id, poolTag); return <button key={p.id} type="button" className="pool-pill" aria-pressed={wahl?.art === 'p' && wahl.id === p.id} disabled={st === 'abwesend'} onClick={() => setWahl(wahl?.id === p.id ? undefined : { art: 'p', id: p.id })}>{kurz(p)} <span className="klein">· {st}</span></button>; })}</div>
          <div><strong className="klein">Nachunternehmer · {wtKurz(poolTag)}</strong><br />
            {nu.map((p) => { const w = nuWarnung(d, p); return <button key={p.id} type="button" className="pool-pill" aria-pressed={wahl?.art === 'p' && wahl.id === p.id} title={w} onClick={() => setWahl(wahl?.id === p.id ? undefined : { art: 'p', id: p.id })}>{w ? '! ' : ''}{kurz(p)} <span className="klein">· {d.firmen.find((f) => f.id === p.firmaId)?.name.split(' ').slice(0, 2).join(' ')} · {statusAm(p.id, poolTag)}</span></button>; })}
            <Link to="/pc/nu" className="link klein" style={{ marginLeft: 8 }}>Helfer oder Lohnleister anlegen ›</Link></div>
          <div><strong className="klein">Geräte · {wtKurz(poolTag)}</strong><br />
            {d.geraetePool.map((g) => { const e = d.geraeteEinteilung.find((x) => x.geraetId === g.id && x.datum === poolTag); return <button key={g.id} type="button" className="pool-pill" aria-pressed={wahl?.art === 'g' && wahl.id === g.id} onClick={() => setWahl(wahl?.id === g.id ? undefined : { art: 'g', id: g.id })}>{g.name} <span className="klein">· {e ? baustelle(d, e.baustelleId)?.kst : 'frei'}</span></button>; })}</div>
          {wahl && <div className="meldung blau">Ausgewählt: <strong>{wahl.art === 'p' ? voll(person(d, wahl.id)) : d.geraetePool.find((g) => g.id === wahl.id)?.name}</strong>. Jetzt in der Tabelle auf „+ hier“ klicken. <button type="button" className="link" onClick={() => setWahl(undefined)}>Auswahl aufheben</button></div>}
        </section>
      )}
      <div className="tab-wrap">
        <div className="woche-raster" style={{ gridTemplateColumns: `220px repeat(5, minmax(150px, 1fr))`, minWidth: 980 }}>
          <div className="kz">Baustelle</div>
          {tage.map((t) => <div key={t} className={`kz${t === d.heute ? ' heute' : ''}`}>{wtKurz(t)} {tm(t)}{feiertag(t) ? <span className="klein"> · {feiertag(t)}</span> : null}</div>)}
          {zeilen.map((b) => {
            const lead = d.einteilung.find((e) => e.baustelleId === b.id && e.datum === tage[0] && ['polier', 'vorarbeiter'].includes(person(d, e.personId)?.rolle));
            return (
              <Fragment key={b.id}>
                <div><strong>{b.kst}</strong> {b.strasse}<br /><span className="klein">{b.massnahme ?? ''}</span><br /><span className="klein">Bauleiter: {voll(person(d, b.bauleitungId))}</span><br /><span className="klein">Melden bei: {lead ? voll(person(d, lead.personId)) : voll(person(d, b.bauleitungId))}</span>
                  {darf && <div className="pk-reihe" style={{ marginTop: 4 }}><button type="button" className="link klein" onClick={() => moBesetzungKopieren(b.id)}>Mo-Besetzung auf Di–Fr</button>{extra.includes(b.id) && <button type="button" className="link klein" onClick={() => setExtra(extra.filter((x) => x !== b.id))}>Zeile entfernen</button>}</div>}
                </div>
                {tage.map((t) => {
                  const es = d.einteilung.filter((e) => e.baustelleId === b.id && e.datum === t);
                  const gs = d.geraeteEinteilung.filter((e) => e.baustelleId === b.id && e.datum === t);
                  const ft = feiertag(t);
                  return (
                    <div key={t} className={t === d.heute ? 'heute' : ''} aria-label={`${b.kst} ${wtKurz(t)} ${tm(t)}`}>
                      {ft ? <span className="klein">Feiertag</span> : <>
                        {es.map((e) => {
                          const p = person(d, e.personId);
                          const w = nuWarnung(d, p);
                          const leitet = ['polier', 'vorarbeiter'].includes(p.rolle) || d.rollenJeBaustelle.some((r) => r.personId === p.id && r.baustelleId === b.id && r.rolle === 'vorarbeiter');
                          return (
                            <span key={p.id + (e.haelfte ?? '')} className={`dispo-pill${p.rolle === 'nu' ? ' nu' : ''}${w ? ' warn' : ''}${e.geaendert ? ' neu' : ''}`} title={w}>
                              {w ? '! ' : ''}{leitet ? '★ ' : ''}{kurz(p)}{e.haelfte ? ` · ${e.haelfte.toUpperCase()}` : ''}
                              {darf && <><button type="button" aria-label={`${voll(p)} halber Tag`} onClick={() => halbUmschalten(p.id, t, b.id)}>½</button><button type="button" aria-label={`${voll(p)} entfernen`} onClick={() => a.einteilen(p.id, t, null, e.haelfte)}>×</button></>}
                            </span>
                          );
                        })}
                        {gs.map((g) => { const ge = d.geraetePool.find((x) => x.id === g.geraetId)!; return <span key={ge.id} className="dispo-pill geraet">{ge.name}{darf && <button type="button" aria-label={`${ge.name} entfernen`} onClick={() => a.geraetEinteilen(ge.id, t, null)}>×</button>}</span>; })}
                        {darf && wahl && <button type="button" className="hier" onClick={() => hier(b.id, t)}>+ hier</button>}
                      </>}
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
      {darf && (
        <div className="pk-reihe">
          <select className="pc-in" aria-label="Baustelle hinzufügen" value="" onChange={(e) => e.target.value && setExtra([...extra, e.target.value])}>
            <option value="">– Baustelle hinzufügen –</option>
            {aktive.filter((b) => !zeilen.includes(b)).map((b) => <option key={b.id} value={b.id}>{b.kst} {b.strasse}</option>)}
          </select>
        </div>
      )}
      <section className="pc-karte">
        <span className="klein"><strong>Legende:</strong> <span className="dispo-pill">★ Name</span> Ansprechpartner · <span className="dispo-pill">Name</span> eigene Mitarbeiter · <span className="dispo-pill nu">Name</span> Nachunternehmer · <span className="dispo-pill warn">! Name</span> NU mit ungültigen Unterlagen oder fehlender Mindestlohn-Unterschrift · <span className="dispo-pill geraet">Gerät</span> · <span className="dispo-pill neu">Name</span> geändert, noch nicht gesendet · <span className="dispo-pill">Name · VM</span> nur vormittags</span>
        <span className="klein">Abwesenheiten (Urlaub, krank) kommen automatisch aus der App oder aus <Link className="link" to="/pc/abwesenheiten">Abwesenheiten</Link>. Mit „Änderungen senden“ bekommen die betroffenen Personen mit App eine Mitteilung; wer kein Smartphone hat, wird über den Polier informiert.</span>
      </section>
    </PcSeite>
  );
}
