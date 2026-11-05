// 5: Monatsübersicht Stunden, Übernahme, Export ZEITERF.DAT · 14: Nachtstunden (Entwurf V1)

import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PcSeite, Pill, Pk, Reiter, h1, herunterladen, useToast } from '../../components/Pc';
import { useDaten } from '../../domain/store';
import { dateiText, exportZeilen, lohnPersonen, lohnZeile, nachtZeilen, BETRIEBSNUMMER, type LohnStand, type LohnZeile } from '../../domain/lohn';
import { baustelle, nameKomma, rechnung } from '../../domain/sel';
import { feiertage, monatName, monatPlus, monatVon, stunden, tm, uhr, wtKurz } from '../../domain/zeit';

const STAND: Record<LohnStand, { t: string; f: 'gruen' | 'orange' | 'rot' | 'blau' | undefined }> = {
  offen: { t: 'Mitarbeiter hat nicht gesendet', f: 'rot' },
  polier: { t: 'beim Polier', f: 'orange' },
  bauleitung: { t: 'bei der Bauleitung', f: 'orange' },
  bereit: { t: 'freigegeben, übernehmen', f: 'blau' },
  uebernommen: { t: '✓ übernommen', f: 'gruen' },
};

function useMonat() {
  const { d } = useDaten();
  const aktuell = monatVon(d.heute);
  const [m, setM] = useState(monatPlus(aktuell, -1));
  return { m, setM, optionen: [monatPlus(aktuell, -1), aktuell] };
}

export function PcStunden() {
  const { d, a } = useDaten();
  const { m, setM, optionen } = useMonat();
  const [gruppe, setGruppe] = useState<'gew' | 'ang'>('gew');
  const [filter, setFilter] = useState<'alle' | 'bereit' | 'klaeren' | 'offen'>('alle');
  const [suche, setSuche] = useState('');
  const [frage, setFrage] = useState<string>();
  const [offenTage, setOffenTage] = useState<string>();
  const [exportFrage, setExportFrage] = useState(false);
  const [toast, zeige] = useToast();
  const zeilen = useMemo(() => lohnPersonen(d).map((p) => lohnZeile(d, p, m)).filter((z) => z.tage.length || z.sondertage), [d, m]);
  const gew = zeilen.filter((z) => z.p.gruppe !== 'angestellt');
  const ang = zeilen.filter((z) => z.p.gruppe === 'angestellt');
  const liste = (gruppe === 'gew' ? gew : ang).filter((z) => {
    if (filter === 'bereit' && z.stand !== 'bereit') return false;
    if (filter === 'klaeren' && !z.hinweise.length) return false;
    if (filter === 'offen' && z.stand === 'uebernommen') return false;
    const q = suche.trim().toLowerCase();
    return !q || `${z.p.vorname} ${z.p.nachname} ${z.p.persNr}`.toLowerCase().includes(q);
  });
  const bulk = (gruppe === 'gew' ? gew : ang).filter((z) => z.stand === 'bereit' && !z.hinweise.length);
  const nichtUebernommen = zeilen.filter((z) => z.stand !== 'uebernommen');
  const ex = exportZeilen(d, m);
  const fertigeExporte = d.exporte.filter((e) => e.monat === m);
  const fh = feiertage(Number(m.slice(0, 4)));
  const feiertageImMonat = [...fh.entries()].filter(([k]) => k.startsWith(m));
  const soll = (z: LohnZeile) => z.soll;

  const uebernehmen = (z: LohnZeile) => {
    a.uebernehmen(z.tage.filter((t) => t.status === 'freigegeben' && !t.uebernommen).map((t) => t.id));
    setFrage(undefined);
    zeige(`${nameKomma(z.p)}: übernommen.`);
  };
  const exportieren = () => {
    if (!ex.length) return zeige('Es gibt keine übernommenen Tage, die noch nicht exportiert sind.', 'orange');
    a.exportErstellen(m, ex.map((x) => x.txt), ex.map((x) => x.key), fertigeExporte.length > 0);
    setExportFrage(false);
    herunterladen(`ZEITERF_${m}.DAT`, dateiText(ex.map((x) => x.txt)));
    zeige(`ZEITERF.DAT für ${monatName(m)} erstellt (${ex.length} Zeilen) und heruntergeladen.`);
  };

  return (
    <PcSeite titel={`Stunden ${monatName(m)}`} pfad={`Stand ${wtKurz(d.heute)}, ${tm(d.heute)}${d.heute.slice(0, 4)}`}
      rechts={<div className="pk-reihe"><Reiter label="Monat" wert={m} setWert={setM} optionen={optionen.map((o) => ({ wert: o, text: monatName(o) }))} /><Link className="pk" to="/pc/nachtstunden">Nachtstunden-Mail</Link></div>}>
      <span className="klein">Feiertage Bayern im {monatName(m).split(' ')[0]}: {feiertageImMonat.length ? feiertageImMonat.map(([k, n]) => `${tm(k)} ${n}`).join(', ') : 'keine'}</span>
      {toast}
      <div className={`meldung ${nichtUebernommen.length ? 'orange' : 'gruen'}`}>
        {nichtUebernommen.length
          ? <>Noch nicht übernommen: <strong>{nichtUebernommen.filter((z) => z.p.gruppe !== 'angestellt').length} von {gew.length}</strong> Gewerblichen und Azubis, <strong>{nichtUebernommen.filter((z) => z.p.gruppe === 'angestellt').length} von {ang.length}</strong> Angestellten. Der Export geht trotzdem: Offene Tage kommen als Nachtrag mit dem nächsten Export.</>
          : <>Alle Mitarbeiter sind übernommen. Der Export ist vollständig möglich.</>}
      </div>

      <section className="pc-karte" aria-label="Export">
        <div className="pk-reihe" style={{ justifyContent: 'space-between' }}>
          <div className="kopfzeilen">
            <h2>Export an die Lohnabrechnung: ZEITERF.DAT</h2>
            <span className="klein">{ex.length} Zeilen bereit{fertigeExporte.length ? ` · schon exportiert: ${fertigeExporte.map((e) => `${tm(e.erstellt.slice(0, 10))} ${uhr(e.erstellt)} (${e.zeilen.length})`).join(', ')}` : ''}</span>
          </div>
          <Pk farbe="blau" gesperrt={!ex.length} onClick={() => (nichtUebernommen.length ? setExportFrage(true) : exportieren())}>{fertigeExporte.length ? 'Nachtrag exportieren' : 'Export erstellen'}</Pk>
        </div>
        {exportFrage && (
          <div className="meldung orange" role="alertdialog" aria-label="Export mit offenen Tagen">
            <strong>Diese Mitarbeiter haben noch offene Tage. Sie werden nicht mitgesendet</strong> und kommen als Nachtrag mit dem nächsten Export.
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>{nichtUebernommen.map((z) => <li key={z.p.id}>{nameKomma(z.p)} ({z.p.persNr}): {z.offen.length} {z.offen.length === 1 ? 'Tag' : 'Tage'} · {STAND[z.stand].t}</li>)}</ul>
            <span className="klein">Mit der Lohnabrechnung klären: wie ein Nachtrag eingelesen wird.</span>
            <div className="pk-reihe" style={{ marginTop: 8 }}><Pk onClick={() => setExportFrage(false)}>Abbrechen</Pk><Pk farbe="blau" onClick={exportieren}>Trotzdem exportieren</Pk></div>
          </div>
        )}
        {fertigeExporte.length > 0 && (
          <div className="pk-reihe">
            {fertigeExporte.map((e) => <Pk key={e.id} klein onClick={() => herunterladen(`ZEITERF_${m}${e.nachtrag ? '_Nachtrag' : ''}.DAT`, dateiText(e.zeilen))}>{e.nachtrag ? 'Nachtrag' : 'Export'} vom {tm(e.erstellt.slice(0, 10))} laden</Pk>)}
            <Pk klein farbe="rot" onClick={() => { a.exportZuruecknehmen(fertigeExporte[fertigeExporte.length - 1].id); zeige('Letzter Export zurückgenommen (nur Demo).', 'blau'); }}>Demo: letzten Export zurücknehmen</Pk>
          </div>
        )}
      </section>

      <div className="pk-reihe" style={{ justifyContent: 'space-between' }}>
        <Reiter label="Gruppe" wert={gruppe} setWert={setGruppe} optionen={[
          { wert: 'gew', text: `Gewerbliche und Azubis (${gew.filter((z) => z.stand !== 'uebernommen').length} offen)` },
          { wert: 'ang', text: `Angestellte (${ang.filter((z) => z.stand !== 'uebernommen').length} offen)` },
        ]} />
        <div className="pk-reihe">
          <Reiter label="Filter" wert={filter} setWert={setFilter} optionen={[{ wert: 'alle', text: 'Alle' }, { wert: 'bereit', text: 'Übernahme möglich' }, { wert: 'klaeren', text: 'Zu klären' }, { wert: 'offen', text: 'Nicht übernommen' }]} />
          <input className="pc-in" type="search" placeholder="Suche" aria-label="Suche" value={suche} onChange={(e) => setSuche(e.target.value)} />
          <Pk farbe="gruen" gesperrt={!bulk.length} onClick={() => { a.uebernehmen(bulk.flatMap((z) => z.tage.filter((t) => t.status === 'freigegeben' && !t.uebernommen).map((t) => t.id))); zeige(`${bulk.length} Mitarbeiter übernommen.`); }}>Alle ohne Hinweis übernehmen ({bulk.length})</Pk>
        </div>
      </div>

      <div className="tab-wrap">
        <table className="tabelle">
          <thead>
            {gruppe === 'gew' ? (
              <tr><th>Mitarbeiter</th><th>Pers.-Nr.</th><th className="z">Ist<br /><span style={{ fontWeight: 400 }}>inkl. Urlaub/Krank</span></th><th className="z">Differenz</th><th className="z">Konto</th><th>Kontrolle<br /><span style={{ fontWeight: 400 }}>(nicht im Export)</span></th><th>Freigabe und Übernahme</th><th>Zu klären / Lohn-Info</th></tr>
            ) : (
              <tr><th>Mitarbeiter</th><th>Pers.-Nr.</th><th>Funktion</th><th className="z">Soll</th><th className="z">Ist</th><th className="z">Mehrstunden gesamt</th><th className="z">Sondertage</th><th>Freigabe und Übernahme</th></tr>
            )}
          </thead>
          <tbody>
            {liste.map((z) => (
              <Fragment key={z.p.id}>
                <tr>
                  <td><strong>{nameKomma(z.p)}</strong><br /><button type="button" className="link" style={{ fontSize: 14 }} onClick={() => setOffenTage(offenTage === z.p.id ? undefined : z.p.id)}>{offenTage === z.p.id ? 'Tage schließen' : 'Tage ansehen ›'}</button></td>
                  <td>{z.p.persNr}</td>
                  {gruppe === 'gew' ? (
                    <>
                      <td className="z">{h1(z.ist)}</td>
                      <td className="z">{z.ist - soll(z) >= 0 ? '+' : '−'}{h1(Math.abs(z.ist - soll(z)))}</td>
                      <td className="z">{h1(z.konto)}</td>
                      <td className="klein">Wegezeit {Math.round(z.wegeMin / 60)} h · Verpfl. {z.verpflegung} T. · Nacht {h1(z.nachtH)}</td>
                    </>
                  ) : (
                    <>
                      <td>{({ polier: 'Polier', bauleitung: 'Bauleiter', buero: 'Büro', oberbauleitung: 'Oberbauleitung', einkauf: 'Einkauf' } as Record<string, string>)[z.p.rolle] ?? z.p.rolle}</td>
                      <td className="z">{h1(z.soll)}</td>
                      <td className="z">{h1(z.ist)}</td>
                      <td className="z">{h1(z.konto)}</td>
                      <td className="z">{z.sondertage}</td>
                    </>
                  )}
                  <td>
                    <Pill farbe={STAND[z.stand].f}>{STAND[z.stand].t}</Pill>
                    {z.stand === 'bereit' && frage !== z.p.id && <div style={{ marginTop: 6 }}><Pk klein farbe="blau" onClick={() => (z.hinweise.length ? setFrage(z.p.id) : uebernehmen(z))}>Übernehmen</Pk></div>}
                    {frage === z.p.id && <div style={{ marginTop: 6 }} className="pk-reihe"><span className="klein">Hinweis geprüft?</span><Pk klein farbe="blau" onClick={() => uebernehmen(z)}>Ja, übernehmen</Pk><Pk klein onClick={() => setFrage(undefined)}>Abbrechen</Pk></div>}
                  </td>
                  {gruppe === 'gew' && <td className="klein">{z.hinweise.length ? z.hinweise.map((h) => <div key={h} className="warn" style={{ fontSize: 14 }}>{h}</div>) : '–'}</td>}
                </tr>
                {offenTage === z.p.id && (
                  <tr><td colSpan={8} style={{ background: '#fafbfc' }}>
                    <table className="tabelle"><tbody>
                      {z.tage.sort((x, y) => x.datum.localeCompare(y.datum)).map((t) => {
                        const r = rechnung(d, t.personId, t.datum);
                        return (
                          <tr key={t.id}>
                            <td>{wtKurz(t.datum)} {tm(t.datum)}</td>
                            <td>{r.beginn ? uhr(r.beginn.zeit) : '–'}–{r.ende ? uhr(r.ende.zeit) : '–'}</td>
                            <td className="z">{stunden(r.arbeitMin / 60, 2)}</td>
                            <td>{r.abschnitte.map((x) => baustelle(d, x.baustelleId)?.kst ?? 'ohne Kst.').join(' / ')}</td>
                            <td><Pill farbe={t.uebernommen ? 'gruen' : t.status === 'freigegeben' ? 'blau' : 'orange'}>{t.uebernommen ? 'übernommen' : t.status === 'freigegeben' ? 'freigegeben' : t.status.replace('_', ' ')}</Pill>{t.exportId && <> <Pill>exportiert</Pill></>}</td>
                          </tr>
                        );
                      })}
                    </tbody></table>
                  </td></tr>
                )}
              </Fragment>
            ))}
            {liste.length === 0 && <tr><td colSpan={8} className="klein">Keine Zeile passt zu Filter und Suche.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text">{gruppe === 'gew'
        ? 'Wegezeit, Verpflegung und Nachtstunden werden nicht in der Datei übergeben. Die Lohnabrechnung rechnet Wegezeit und Verpflegung selbst; die Werte hier dienen zur Kontrolle. Nachtstunden gehen per Mail. „Zu klären“ kommt aus der Freigabe; solche Zeilen werden einzeln und bewusst übernommen.'
        : 'Bei Angestellten werden nur Sondertage (Urlaub, Krank usw.) übergeben, immer auf Kostenstelle 170. Gearbeitete Stunden, Mehrstunden und Resturlaub bleiben in der App dokumentiert.'}</p>

      <section className="pc-karte" aria-label="Vorschau Exportdatei">
        <h2>Vorschau Exportdatei ZEITERF.DAT</h2>
        <span className="klein">55 Zeichen je Zeile, „·“ = Leerzeichen · Pers.-Nr. 5-stellig · Stunden mit 2 Nachkommastellen (bis 9,99) · Betriebsnummer {BETRIEBSNUMMER} ist ein Platzhalter</span>
        <div className="datei mono">
          <div style={{ color: '#9fb0bd' }}>JJJJMMBBBBBBPPPPPTTKKKKKKKKSSSSYYVVVV</div>
          {ex.slice(0, 14).map((x) => <div key={x.key + x.txt} style={x.warn ? { color: '#ffc078', fontWeight: 700 } : undefined}>{x.txt.replace(/ /g, '·')}</div>)}
          {ex.length > 14 && <div style={{ color: '#9fb0bd' }}>… {ex.length - 14} weitere Zeilen</div>}
          {ex.length === 0 && <div style={{ color: '#9fb0bd' }}>Keine Zeilen: Alles Übernommene ist schon exportiert.</div>}
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: 'var(--text-2)' }}>
          {ex.slice(0, 8).map((x) => <li key={'w' + x.key + x.txt} style={x.warn ? { color: 'var(--orange-text)', fontWeight: 700 } : undefined}>{x.why}</li>)}
        </ul>
        <span className="klein">J = Jahr, M = Monat, B = Betriebsnummer, P = Pers.-Nr., T = Tag, K = Kostenstelle, S = Stunden oder unbezahltes Symbol (U, UU, KK), Y = bezahltes Symbol (K, S), V = bezahlte Fehlstunden. Arbeit → Kostenstelle der Baustelle, Abwesenheiten → 180 (gewerblich) bzw. 170 (Angestellte). Format mit der Lohnabrechnung klären: Stunden über 9,99 werden gerundet und orange markiert.</span>
      </section>
    </PcSeite>
  );
}

/** 14: Nachtstunden per Mail an die Lohnabrechnung */
export function PcNachtstunden() {
  const { d, a } = useDaten();
  const { m, setM, optionen } = useMonat();
  const [aus, setAus] = useState<Record<string, boolean>>({});
  const [toast, zeige] = useToast();
  const liste = nachtZeilen(d, m);
  const an = liste.filter((r) => !aus[r.tagId]);
  const summe = an.reduce((s, r) => s + r.h, 0);
  const abgeschlossen = lohnPersonen(d).every((p) => lohnZeile(d, p, m).stand === 'uebernommen');
  const versendet = d.nachtMail[m];
  const f = (h: number) => `${h.toFixed(1).replace('.', ',')} h`;
  const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n);
  const mailZeilen = an.map((r) => `${pad(r.p.persNr, 9)} | ${pad(nameKomma(r.p), 18)} | ${tm(r.datum)}${r.datum.slice(0, 4)} | ${pad(r.kst, 12)} | ${f(r.h)}`);
  const mailText = `Guten Tag,\n\nanbei die Nachtstunden für ${monatName(m)} zur Abrechnung des Nachtzuschlags. Die übrigen Stunden erhalten Sie wie gewohnt mit der Datei ZEITERF.DAT.\n\nPers.-Nr. | Name               | Datum      | Kostenstelle | Nachtstunden\n${mailZeilen.join('\n')}\n          Summe                                              ${f(summe)}\n\nNachtarbeit haben wir als Arbeitszeit zwischen 20:00 und 05:00 Uhr gerechnet, Pausen sind abgezogen.\n\nMit freundlichen Grüßen\nK. Baumann Baugesellschaft mbH · Lohnbuchhaltung`;
  return (
    <PcSeite titel={`Nachtstunden ${monatName(m)}`} pfad="Stunden › Nachtstunden" rechts={<Reiter label="Monat" wert={m} setWert={setM} optionen={optionen.map((o) => ({ wert: o, text: monatName(o) }))} />}>
      <span className="klein">Nachtarbeit = gearbeitete Zeit zwischen <strong>20:00 und 05:00 Uhr</strong>, Pausen abgezogen. Eine Schicht über Mitternacht zählt zum Tag des Beginns.</span>
      {toast}
      <div className={`meldung ${abgeschlossen ? 'gruen' : 'orange'}`}>{abgeschlossen ? `${monatName(m)} ist abgeschlossen: alle Tage freigegeben und übernommen.` : `${monatName(m)} ist noch nicht abgeschlossen. Die Liste ist vorläufig.`} {!abgeschlossen && <Link to="/pc/stunden">Zur Übersicht Stunden</Link>}</div>
      <div className="tab-wrap">
        <table className="tabelle">
          <thead><tr><th>Mitsenden</th><th>Pers.-Nr.</th><th>Mitarbeiter</th><th>Datum</th><th>Kostenstelle</th><th>Arbeitszeit</th><th className="z">Nachtstunden</th></tr></thead>
          <tbody>
            {liste.map((r) => (
              <tr key={r.tagId} className={aus[r.tagId] ? 'aus' : ''}>
                <td><input type="checkbox" checked={!aus[r.tagId]} disabled={!!versendet} onChange={() => setAus({ ...aus, [r.tagId]: !aus[r.tagId] })} aria-label={`${nameKomma(r.p)} ${tm(r.datum)} mitsenden`} style={{ width: 20, height: 20 }} /></td>
                <td>{r.p.persNr}</td><td><strong>{nameKomma(r.p)}</strong></td><td>{wtKurz(r.datum)} {tm(r.datum)}</td><td>{r.kst}</td><td>{r.von}–{r.bis}</td><td className="z"><strong>{f(r.h)}</strong></td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={7} className="klein">In diesem Monat gibt es keine Nachtstunden.</td></tr>}
            <tr className="summe"><td /><td colSpan={5}>Summe</td><td className="z">{f(summe)}</td></tr>
          </tbody>
        </table>
      </div>
      <section className="pc-karte">
        <div className="pk-reihe" style={{ justifyContent: 'space-between' }}>
          <h2>Mail an die Lohnabrechnung (wird automatisch erstellt)</h2>
          <div className="pk-reihe">
            <Pk gesperrt={!an.length} onClick={() => { navigator.clipboard?.writeText(mailText).catch(() => {}); zeige(`Mailtext mit ${an.length} Zeilen in die Zwischenablage kopiert.`); }}>Text kopieren</Pk>
            <Pk gesperrt={!an.length} onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(`Nachtstunden ${monatName(m)} – K. Baumann Baugesellschaft mbH`)}&body=${encodeURIComponent(mailText)}`; }}>Im Mailprogramm öffnen</Pk>
            <Pk farbe={versendet ? 'gruen' : 'blau'} gesperrt={!an.length || !abgeschlossen || !!versendet} onClick={() => a.nachtMailVersendet(m, true)}>{versendet ? 'Versendet ✓' : 'Als versendet markieren'}</Pk>
          </div>
        </div>
        {!abgeschlossen && <span className="warn" style={{ fontSize: 14 }}>„Als versendet markieren“ ist gesperrt, solange {monatName(m)} nicht abgeschlossen ist.</span>}
        <div className="mono" style={{ background: '#f8fafb', border: '1px solid var(--linie)', borderRadius: 10, padding: 14, whiteSpace: 'pre-wrap' }}>{mailText}</div>
        {versendet && <div className="meldung gruen pk-reihe" style={{ justifyContent: 'space-between' }}><span>Als versendet dokumentiert: {tm(versendet.slice(0, 10))} {uhr(versendet)} Uhr. Die Tabelle ist damit gesperrt.</span><Pk klein onClick={() => a.nachtMailVersendet(m, false)}>Versand zurücknehmen</Pk></div>}
      </section>
    </PcSeite>
  );
}
