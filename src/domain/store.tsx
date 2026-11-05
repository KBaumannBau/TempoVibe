// Zentraler Zustand der Demo. Später ersetzt eine Server-Schnittstelle diesen
// Speicher: jede Aktion unten entspricht dann einem Aufruf an den Server.
// In der Demo liegt alles nur im Browser (localStorage).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DATEN_VERSION, erzeugeDemo } from './seed';
import { noetigeBauleitung, noetigePoliere, person, rechnung, voll } from './sel';
import type { Antrag, Baustelle, Daten, HelferEintrag, Kosten4, KostenMonat, MehrBuchung, Nachtrag, Person, Rechnung, StempelArt, Stempelung, Tag, ZuschlagEintrag } from './types';
import { artName, datumKey, isoAus, isoMitZone, plusTage, tm, uhr } from './zeit';

const plusEinTag = (k: string) => plusTage(k, 1);

const SPEICHER = 'stundenerfassung-demo';
const SITZUNG = 'stundenerfassung-sitzung';

function laden(): Daten {
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (roh) {
      const d = JSON.parse(roh) as Daten;
      // neue Version oder neuer Tag: frische Beispieldaten
      if (d.version === DATEN_VERSION && d.heute === datumKey(new Date())) return d;
    }
  } catch {
    /* Speicher nicht verfügbar: Demo läuft ohne Speichern */
  }
  return erzeugeDemo();
}

let zaehler = 0;
const neueId = (p: string) => `${p}${Date.now().toString(36)}${(zaehler++).toString(36)}`;

export interface StempelOptionen {
  baustelleId?: string;
  vonHand?: boolean;
  begruendung?: string;
}

function erzeugeAktionen(aendern: (fn: (d: Daten) => void) => void, ich: () => Person | undefined) {
  const wer = () => {
    const p = ich();
    return p ? voll(p) : 'unbekannt';
  };
  const log = (d: Daten, was: string, warum?: string) => d.protokoll.push({ zeit: isoMitZone(new Date()), wer: wer(), was, warum });

  const tagHolen = (d: Daten, personId: string, datum: string): Tag => {
    let t = d.tage.find((x) => x.personId === personId && x.datum === datum);
    if (!t) {
      t = { id: `${personId}_${datum}`, personId, datum, status: 'offen', zuschlaege: [], wegezeitMin: 0, verpflegung: false, uebernachtung: false, korrekturen: [] };
      d.tage.push(t);
    }
    return t;
  };
  const tagNachId = (d: Daten, id: string) => d.tage.find((t) => t.id === id)!;

  const stempel = (d: Daten, s: Omit<Stempelung, 'id' | 'eingang'> & { eingang?: string }) => {
    const neu: Stempelung = { ...s, id: neueId('s'), eingang: s.eingang ?? isoMitZone(new Date()) };
    d.stempelungen.push(neu);
    return neu;
  };

  const mitteilung = (d: Daten, personId: string, titel: string, text: string, link?: string) =>
    d.mitteilungen.push({ id: neueId('mt'), personId, zeit: isoMitZone(new Date()), titel, text, link });

  /** Nach der Polier-Stufe: liegt der Tag noch bei einem Polier oder geht er an die Bauleitung? */
  const nachPolierStufe = (d: Daten, t: Tag) => {
    const fehlen = noetigePoliere(d, t).filter((id) => !(t.polierOk ?? []).includes(id));
    if (fehlen.length) return;
    t.status = 'bei_bauleitung';
    t.bauleitungOk = [];
  };
  /** Nach der Bauleitungs-Stufe: erst wenn alle zuständigen Bauleiter freigegeben haben */
  const nachBauleitungsStufe = (d: Daten, t: Tag) => {
    const fehlen = noetigeBauleitung(d, t).filter((id) => !(t.bauleitungOk ?? []).includes(id));
    if (!fehlen.length) t.status = 'freigegeben';
  };
  /** Ein schon weitergegebener Tag ändert sich: zurück zum Polier, bei Übernahme/Export Hinweis an die Lohnbuchhaltung */
  const geaendert = (d: Daten, t: Tag, was: string) => {
    if (t.uebernommen || t.exportId) {
      t.geaendertNachUebernahme = { am: isoMitZone(new Date()), was };
      t.uebernommen = undefined;
      log(d, `Tag ${tm(t.datum)} von ${voll(person(d, t.personId))} nach der Übernahme geändert, Lohnbuchhaltung muss nacharbeiten`, was);
    }
  };

  return {
    // ---------- Mitarbeiter ----------
    stempeln(art: StempelArt, o: StempelOptionen = {}) {
      aendern((d) => {
        const p = ich()!;
        const heute = d.heute;
        const letzte = d.stempelungen.filter((s) => s.personId === p.id && s.datum === heute && !s.ersetztDurch).pop();
        const baustelleId = o.baustelleId ?? letzte?.baustelleId;
        const ortung = p.gruppe !== 'angestellt';
        const standort = ortung ? d.demoStandort : 'ohne';
        stempel(d, {
          personId: p.id, datum: heute, art, zeit: isoMitZone(new Date()), baustelleId,
          standort, entfernungM: standort === 'weicht_ab' ? 400 : undefined,
          begruendung: o.begruendung, vonHandGewaehlt: o.vonHand,
          herkunft: navigator.onLine ? 'gestempelt' : 'nachgesendet', erfasstVon: p.id,
        });
        tagHolen(d, p.id, heute);
        log(d, `${artName(art)} gestempelt`);
      });
    },
    setDemoStandort(s: Daten['demoStandort']) {
      aendern((d) => {
        d.demoStandort = s;
      });
    },
    vergessenMelden(datum: string, art: 'beginn' | 'ende' | 'pause', von: string, bis?: string) {
      aendern((d) => {
        const p = ich()!;
        d.vergessen.push({ id: neueId('v'), personId: p.id, datum, art, von, bis, gemeldet: isoMitZone(new Date()), status: 'offen' });
        log(d, `Vergessenes Stempeln gemeldet (${art} ${von}${bis ? `–${bis}` : ''})`);
      });
    },
    zuschlaegeSetzen(datum: string, zuschlaege: ZuschlagEintrag[]) {
      aendern((d) => {
        tagHolen(d, ich()!.id, datum).zuschlaege = zuschlaege;
      });
    },
    fahrtSetzen(datum: string, f: { wegezeitMin: number; verpflegung: boolean; uebernachtung: boolean }) {
      aendern((d) => {
        Object.assign(tagHolen(d, ich()!.id, datum), f);
      });
    },
    tagSenden(datum: string) {
      aendern((d) => {
        const t = tagHolen(d, ich()!.id, datum);
        t.status = 'beim_polier';
        t.polierOk = [];
        // Nachgetragen: wer erfasst hat, gibt nicht selbst frei
        if (t.nachgetragenVon) t.polierOk.push(t.nachgetragenVon);
        nachPolierStufe(d, t);
        log(d, t.status === 'beim_polier' ? `Tag ${tm(datum)} an den Polier gesendet` : `Tag ${tm(datum)} an die Bauleitung gesendet (kein anderer Polier zuständig)`);
      });
    },
    korrekturAntworten(tagId: string, korrekturId: string, antwort: 'bestaetigt' | 'widerspruch', text?: string) {
      aendern((d) => {
        const k = tagNachId(d, tagId).korrekturen.find((x) => x.id === korrekturId)!;
        k.antwort = antwort;
        k.antwortText = text;
        log(d, `Korrektur „${k.was}“ ${antwort === 'bestaetigt' ? 'bestätigt' : 'widersprochen'}`, text);
      });
    },
    antragStellen(a: Omit<Antrag, 'id' | 'personId' | 'gestellt' | 'status'>) {
      aendern((d) => {
        // Anträge gehen an die Oberbauleitung; stellt sie selbst einen, entscheidet die Geschäftsleitung
        const selbstObl = ich()!.id === d.oberbauleitungId && a.art !== 'krank';
        d.antraege.push({ ...a, id: neueId('a'), personId: ich()!.id, gestellt: isoMitZone(new Date()), status: a.art === 'krank' ? 'gemeldet' : selbstObl ? 'bauleitung_ok' : 'offen' });
        log(d, a.art === 'krank' ? 'Krankmeldung gesendet' : 'Antrag gestellt');
      });
    },
    pinAendern(personId: string, neu: string) {
      aendern((d) => {
        d.personen.find((p) => p.id === personId)!.pin = neu;
        log(d, 'PIN geändert');
      });
    },
    geraetAbmelden(id: string) {
      aendern((d) => {
        const g = d.geraete.find((x) => x.id === id)!;
        g.aktiv = false;
        log(d, `Gerät „${g.name}“ abgemeldet`);
      });
    },

    // ---------- Polier ----------
    zuschlagEntscheiden(tagId: string, zId: string, entscheidung: ZuschlagEintrag['entscheidung'], stundenGekuerzt?: number) {
      aendern((d) => {
        const z = tagNachId(d, tagId).zuschlaege.find((x) => x.id === zId)!;
        z.entscheidung = entscheidung;
        z.stundenGekuerzt = stundenGekuerzt;
      });
    },
    /** Korrektur: alter Eintrag bleibt, ein neuer ersetzt ihn */
    zeitKorrigieren(tagId: string, stempelungId: string, neu: string, grund: string) {
      aendern((d) => {
        const t = tagNachId(d, tagId);
        const alt = d.stempelungen.find((s) => s.id === stempelungId)!;
        const ersatz = stempel(d, { ...alt, zeit: isoAus(t.datum, neu), herkunft: 'korrektur', erfasstVon: ich()!.id, ersetztDurch: undefined, standort: alt.standort });
        alt.ersetztDurch = ersatz.id;
        const was = `${artName(alt.art)} ${uhr(alt.zeit)} → ${neu}`;
        t.korrekturen.push({ id: neueId('k'), von: ich()!.id, zeit: isoMitZone(new Date()), was, grund, altId: alt.id, neuId: ersatz.id });
        log(d, `Zeit korrigiert bei ${voll(person(d, t.personId))}: ${was}`, grund);
      });
    },
    polierFreigeben(tagIds: string[], pauseBegruendung?: string) {
      aendern((d) => {
        for (const id of tagIds) {
          const t = tagNachId(d, id);
          // Vier Augen: nie der eigene Tag, nie mit unbeantworteter Korrektur
          if (t.personId === ich()!.id) continue;
          if (t.korrekturen.some((k) => !k.antwort && !k.ohneRueckmeldung)) continue;
          t.polierOk = [...new Set([...(t.polierOk ?? []), ich()!.id])];
          t.polierFreigabeVon = ich()!.id;
          t.zurueckGrund = undefined;
          if (pauseBegruendung) t.pauseBegruendung = pauseBegruendung;
          for (const z of t.zuschlaege) if (z.entscheidung === 'offen') z.entscheidung = 'ok';
          nachPolierStufe(d, t);
          log(d, `Tag ${tm(t.datum)} von ${voll(person(d, t.personId))} freigegeben (Polier)`, pauseBegruendung);
        }
      });
    },
    vorschlagEntscheiden(id: string, ok: boolean) {
      aendern((d) => {
        const v = d.vergessen.find((x) => x.id === id)!;
        // die eigene Meldung bearbeitet nie man selbst
        if (v.personId === ich()!.id) return;
        v.status = ok ? 'uebernommen' : 'abgelehnt';
        if (ok) {
          const base = { personId: v.personId, datum: v.datum, baustelleId: rechnung(d, v.personId, v.datum).gueltig[0]?.baustelleId, standort: 'ohne' as const, herkunft: 'korrektur' as const, erfasstVon: ich()!.id };
          if (v.art === 'pause') {
            stempel(d, { ...base, art: 'pause', zeit: isoAus(v.datum, v.von) });
            stempel(d, { ...base, art: 'weiter', zeit: isoAus(v.datum, v.bis!) });
          } else stempel(d, { ...base, art: v.art, zeit: isoAus(v.datum, v.von) });
          const t = tagHolen(d, v.personId, v.datum);
          const was = `${artName(v.art)} ${v.von}${v.bis ? `–${v.bis}` : ''} aus Meldung übernommen`;
          t.korrekturen.push({ id: neueId('k'), von: ich()!.id, zeit: isoMitZone(new Date()), was, grund: 'Meldung des Mitarbeiters', antwort: 'bestaetigt' });
          if (t.status === 'offen') {
            // Der Mitarbeiter prüft und sendet seinen Tag selbst (Zuschläge, Fahrt)
            mitteilung(d, v.personId, 'Meldung übernommen', 'Dein Polier hat deine Meldung übernommen. Prüfe den Tag und sende ihn.', `/ma/tag/${v.datum}`);
          } else if (t.status !== 'beim_polier' && t.status !== 'zurueck_polier') {
            // schon weitergegeben: zurück zum Polier, alle Freigaben neu
            geaendert(d, t, was);
            t.status = 'beim_polier';
            t.polierOk = [];
            t.bauleitungOk = [];
          }
        }
        log(d, `Meldung vergessenes Stempeln ${ok ? 'übernommen' : 'abgelehnt'} (${voll(person(d, v.personId))})`);
      });
    },
    /** Polier erfasst Stunden für jemanden ohne Handy oder trägt nach (Handy verloren) */
    zeitenErfassen(personId: string, datum: string, von: string, bis: string, pauseMin: number, art: 'polier_ohne_handy' | 'nachgetragen', baustelleId: string, zuschlaege: ZuschlagEintrag[] = [], grund?: string) {
      aendern((d) => {
        const base = { personId, datum, baustelleId, standort: 'ohne' as const, herkunft: art, erfasstVon: ich()!.id, begruendung: grund };
        stempel(d, { ...base, art: 'beginn', zeit: isoAus(datum, von) });
        if (pauseMin > 0) {
          const [h, m] = '12:00'.split(':').map(Number);
          const ende = h * 60 + m + pauseMin;
          stempel(d, { ...base, art: 'pause', zeit: isoAus(datum, '12:00') });
          stempel(d, { ...base, art: 'weiter', zeit: isoAus(datum, `${String(Math.floor(ende / 60)).padStart(2, '0')}:${String(ende % 60).padStart(2, '0')}`) });
        }
        stempel(d, { ...base, art: 'ende', zeit: isoAus(datum, bis) });
        const t = tagHolen(d, personId, datum);
        t.zuschlaege = zuschlaege;
        if (art === 'nachgetragen') {
          // Der Mitarbeiter muss bestätigen: in seiner App (prüfen und senden) oder mit PIN am Handy des Poliers
          t.nachgetragenVon = ich()!.id;
          mitteilung(d, personId, 'Zeiten nachgetragen', 'Dein Polier hat Zeiten für einen Tag nachgetragen. Bitte prüfe sie und sende den Tag.', `/ma/tag/${datum}`);
        }
        log(d, `${art === 'nachgetragen' ? 'Zeiten nachgetragen' : 'Stunden ohne Handy erfasst'} für ${voll(person(d, personId))} (${tm(datum)})`, grund);
      });
    },
    mitPinBestaetigt(personId: string, datum: string) {
      aendern((d) => {
        const t = tagHolen(d, personId, datum);
        t.bestaetigtMitPin = true;
        // Der Polier hat erfasst, die Person bestätigt: Freigabe des erfassenden Poliers ist damit erledigt
        t.status = 'beim_polier';
        t.polierOk = [ich()!.id];
        t.polierFreigabeVon = ich()!.id;
        nachPolierStufe(d, t);
        log(d, `${voll(person(d, personId))} hat Tag ${tm(datum)} mit PIN bestätigt`);
      });
    },
    helferSpeichern(eintraege: Omit<HelferEintrag, 'id'>[]) {
      aendern((d) => {
        for (const e of eintraege) {
          const alt = d.helfer.find((h) => h.baustelleId === e.baustelleId && h.datum === e.datum && h.name === e.name);
          if (alt) Object.assign(alt, e, { gegengezeichnet: false });
          else d.helfer.push({ ...e, id: neueId('h') });
        }
        log(d, `Helfer- und NU-Stunden gespeichert (${eintraege.length} Personen)`);
      });
    },
    ausfallMelden(a: Omit<Daten['ausfaelle'][number], 'id' | 'von'>) {
      aendern((d) => {
        d.ausfaelle.push({ ...a, id: neueId('af'), von: ich()!.id });
        log(d, `Ausfall gemeldet (${a.art}, ab ${a.ab}, ${a.personIds.length} Personen)`);
      });
    },

    // ---------- Bauleitung ----------
    bauleitungFreigeben(tagIds: string[]) {
      aendern((d) => {
        for (const id of tagIds) {
          const t = tagNachId(d, id);
          if (t.personId === ich()!.id || t.status !== 'bei_bauleitung') continue;
          // Widerspruch zuerst entscheiden
          if (t.korrekturen.some((k) => k.antwort === 'widerspruch' && !k.entscheidung)) continue;
          t.bauleitungOk = [...new Set([...(t.bauleitungOk ?? []), ich()!.id])];
          t.bauleitungFreigabeVon = ich()!.id;
          nachBauleitungsStufe(d, t);
          log(d, `Tag ${tm(t.datum)} von ${voll(person(d, t.personId))} freigegeben (Bauleitung)${(t.status as Tag['status']) === 'freigegeben' ? ', an die Lohnbuchhaltung' : ''}`);
        }
      });
    },
    /** Oberbauleitung: eigene Tage der Bauleiter freigeben */
    oblFreigeben(tagIds: string[]) {
      aendern((d) => {
        for (const id of tagIds) {
          const t = tagNachId(d, id);
          if (t.personId === ich()!.id || !t.anOberbauleitung || t.status !== 'bei_bauleitung') continue;
          t.status = 'freigegeben';
          t.bauleitungFreigabeVon = ich()!.id;
          log(d, `Tag ${tm(t.datum)} von ${voll(person(d, t.personId))} freigegeben (Oberbauleitung), an die Lohnbuchhaltung`);
        }
      });
    },
    zurueckAnPolier(tagId: string, grund: string) {
      aendern((d) => {
        const t = tagNachId(d, tagId);
        t.status = 'zurueck_polier';
        t.zurueckGrund = grund;
        t.polierOk = [];
        t.bauleitungOk = [];
        log(d, `Tag ${tm(t.datum)} von ${voll(person(d, t.personId))} zurück an den Polier`, grund);
      });
    },
    gegenzeichnen(ids: string[]) {
      aendern((d) => {
        for (const h of d.helfer) if (ids.includes(h.id)) h.gegengezeichnet = true;
        log(d, `Helfer- und NU-Stunden gegengezeichnet (${ids.length} Einträge)`);
      });
    },
    antragEntscheiden(id: string, ok: boolean, grund?: string) {
      aendern((d) => {
        const a = d.antraege.find((x) => x.id === id)!;
        if (a.personId === ich()!.id) return;
        // Oberbauleitung entscheidet. Urlaub geht danach an die Geschäftsleitung.
        // Frei vom Konto entscheidet die Oberbauleitung endgültig.
        // Arbeitsbefreiung: genehmigt unter Vorbehalt, das Büro prüft den Nachweis.
        a.status = ok ? (a.art === 'urlaub' ? 'bauleitung_ok' : 'genehmigt') : 'abgelehnt';
        a.oblVon = ich()!.id;
        a.ablehnGrund = grund;
        if (!ok) mitteilung(d, a.personId, 'Antrag abgelehnt', `Dein Antrag wurde abgelehnt: ${grund}`, '/ma/antraege');
        else if (a.status === 'genehmigt') mitteilung(d, a.personId, 'Antrag genehmigt', 'Dein Antrag ist genehmigt.', '/ma/antraege');
        log(d, `Antrag von ${voll(person(d, a.personId))} ${ok ? (a.status === 'genehmigt' ? 'genehmigt (Oberbauleitung)' : 'genehmigt (Oberbauleitung, weiter an die Geschäftsleitung)') : 'abgelehnt (Oberbauleitung)'}`, grund);
      });
    },
    eigenenTagSenden(datum: string) {
      aendern((d) => {
        const t = tagHolen(d, ich()!.id, datum);
        t.anOberbauleitung = true;
        t.status = 'bei_bauleitung';
        log(d, `Eigener Tag ${tm(datum)} an die Oberbauleitung gesendet`);
      });
    },
    // ---------- Mitarbeiter: Ergänzungen aus V1 ----------
    wechseln(baustelleId: string, begruendung?: string) {
      aendern((d) => {
        const p = ich()!;
        stempel(d, {
          personId: p.id, datum: d.heute, art: 'wechsel', zeit: isoMitZone(new Date()), baustelleId,
          standort: p.gruppe !== 'angestellt' ? d.demoStandort : 'ohne', begruendung, herkunft: navigator.onLine ? 'gestempelt' : 'nachgesendet', erfasstVon: p.id,
        });
        log(d, `Baustelle gewechselt auf ${d.baustellen.find((b) => b.id === baustelleId)?.kst}`);
      });
    },
    nachweisHochladen(id: string) {
      aendern((d) => {
        const a = d.antraege.find((x) => x.id === id)!;
        a.nachweis = 'hochgeladen';
        log(d, 'Nachweis hochgeladen');
      });
    },
    ersatzWaehlen(id: string, ersatz: 'urlaub' | 'unbezahlt' | 'konto') {
      aendern((d) => {
        d.antraege.find((x) => x.id === id)!.ersatz = ersatz;
        log(d, `Arbeitsbefreiung ohne Nachweis: ${ersatz}`);
      });
    },
    krankRueckmeldung(id: string, r: 'gesund' | 'weiter', neuBis?: string) {
      aendern((d) => {
        const a = d.antraege.find((x) => x.id === id)!;
        a.rueckmeldung = r;
        if (r === 'weiter' && neuBis) {
          d.antraege.push({ ...a, id: neueId('a'), von: plusEinTag(a.bis), bis: neuBis, gestellt: isoMitZone(new Date()), rueckmeldung: undefined, nachweis: 'fehlt' });
        }
        log(d, r === 'gesund' ? 'Rückmeldung: wieder gesund' : `Folgebescheinigung bis ${neuBis}`);
      });
    },
    betriebsurlaubWaehlen(personId: string, w: Daten['betriebsurlaub']['wahl'][string]) {
      aendern((d) => {
        d.betriebsurlaub.wahl[personId] = { ...w, gespeichert: isoMitZone(new Date()) };
        log(d, 'Auswahl Betriebsurlaub gespeichert');
      });
    },
    mitteilungGelesen(id: string) {
      aendern((d) => {
        const m = d.mitteilungen.find((x) => x.id === id);
        if (m) m.gelesen = true;
      });
    },
    introGesehen(personId: string) {
      aendern((d) => {
        d.personen.find((p) => p.id === personId)!.introGesehen = true;
      });
    },
    ausweisEintragen(personId: string, art: string, bis: string, staat: string) {
      aendern((d) => {
        const p = d.personen.find((x) => x.id === personId)!;
        p.ausweis = { art, bis, staat, gesehenVon: wer(), am: d.heute };
        log(d, `Ausweis von ${voll(p)} gesehen und eingetragen (keine Kopie)`);
      });
    },
    mindestlohnUnterschreiben(personId: string, monat: string) {
      aendern((d) => {
        const p = d.personen.find((x) => x.id === personId)!;
        p.mindestlohn = { ...(p.mindestlohn ?? {}), [monat]: 'unterschrieben' };
        log(d, `Mindestlohnerklärung ${monat} unterschrieben (${voll(p)})`);
      });
    },
    nachrichtSenden(text: string, baustelleId?: string) {
      aendern((d) => {
        d.nachrichten.push({ id: neueId('nm'), von: ich()!.id, zeit: isoMitZone(new Date()), text, baustelleId });
        log(d, 'Nachricht an die Verwaltung gesendet');
      });
    },
    nachrichtErledigt(id: string) {
      aendern((d) => {
        d.nachrichten.find((x) => x.id === id)!.erledigt = true;
      });
    },

    // ---------- Personal / HR / Lohn ----------
    uebernehmen(tagIds: string[]) {
      aendern((d) => {
        for (const id of tagIds) {
          const t = tagNachId(d, id);
          if (t.status === 'freigegeben') { t.uebernommen = d.heute; t.geaendertNachUebernahme = undefined; }
        }
        log(d, `${tagIds.length} Tage übernommen`);
      });
    },
    exportErstellen(monat: string, zeilen: string[], keys: string[], nachtrag: boolean) {
      aendern((d) => {
        d.exporte.push({ id: neueId('ex'), monat, erstellt: isoMitZone(new Date()), von: wer(), zeilen, tagIds: keys, nachtrag });
        for (const k of keys) {
          const t = d.tage.find((x) => x.id === k);
          if (t) t.exportId = d.exporte[d.exporte.length - 1].id;
        }
        log(d, `Export ZEITERF.DAT für ${monat} erstellt (${zeilen.length} Zeilen)`);
      });
    },
    exportZuruecknehmen(id: string) {
      aendern((d) => {
        d.exporte = d.exporte.filter((e) => e.id !== id);
        for (const t of d.tage) if (t.exportId === id) t.exportId = undefined;
        log(d, 'Export zurückgenommen (Demo)');
      });
    },
    nachtMailVersendet(monat: string, an: boolean) {
      aendern((d) => {
        if (an) d.nachtMail[monat] = isoMitZone(new Date());
        else delete d.nachtMail[monat];
        log(d, `Nachtstunden ${monat} ${an ? 'als versendet markiert' : 'Versand zurückgenommen'}`);
      });
    },
    personAnlegen(p: Pick<Person, 'vorname' | 'nachname' | 'gruppe' | 'eintritt'> & { email?: string; handy?: string }) {
      let id = '';
      aendern((d) => {
        id = neueId('p');
        const nr = String(Math.max(...d.personen.map((x) => Number(x.persNr) || 0)) + 1).padStart(4, '0');
        const angestellt = p.gruppe === 'angestellt';
        d.personen.push({
          id, ...p, rolle: angestellt ? 'buero' : 'facharbeiter', nutztApp: true, persNr: nr, zugang: p.email ? 'eingeladen' : 'ohne', kinder: [],
          sollMoDo: angestellt ? 8 : 8.5, sollFr: angestellt ? 6 : 7, pin: '1234', urlaubAnspruch: 30, urlaubGenommen: 0, kontoStart: 0,
        });
        log(d, `Mitarbeiter ${p.vorname} ${p.nachname} angelegt`);
      });
      return id;
    },
    personAendern(id: string, patch: Partial<Person>, ab?: string) {
      aendern((d) => {
        const p = d.personen.find((x) => x.id === id)!;
        Object.assign(p, patch);
        log(d, `Stammdaten von ${voll(p)} geändert${ab ? `, gültig ab ${ab}` : ''}`, Object.keys(patch).join(', '));
      });
    },
    spracheSetzen(id: string, sprache: NonNullable<Person['sprache']>) {
      aendern((d) => {
        const p = d.personen.find((x) => x.id === id)!;
        p.sprache = sprache;
        d.techLog.push({ zeit: isoMitZone(new Date()), wer: wer(), was: `Sprache ${sprache.toUpperCase()} gewählt: ${voll(p)}` });
      });
    },
    zugangSetzen(id: string, zugang: Person['zugang'], was: string) {
      aendern((d) => {
        const p = d.personen.find((x) => x.id === id)!;
        p.zugang = zugang;
        if (zugang === 'gesperrt') for (const g of d.geraete) if (g.personId === id) g.aktiv = false;
        d.techLog.push({ zeit: isoMitZone(new Date()), wer: wer(), was: `${was}: ${voll(p)}` });
        log(d, `${was}: ${voll(p)}`);
      });
    },
    abwesenheitEintragen(a: Omit<Antrag, 'id' | 'gestellt' | 'status'>) {
      aendern((d) => {
        d.antraege.push({ ...a, id: neueId('a'), gestellt: isoMitZone(new Date()), status: a.art === 'krank' ? 'gemeldet' : 'genehmigt', quelle: 'hand' });
        log(d, `Abwesenheit von Hand eingetragen: ${voll(person(d, a.personId))} (${a.art}, ${a.von}–${a.bis})`);
      });
    },
    abwesenheitEntfernen(id: string) {
      aendern((d) => {
        const a = d.antraege.find((x) => x.id === id)!;
        d.antraege = d.antraege.filter((x) => x.id !== id);
        log(d, `Abwesenheit entfernt: ${voll(person(d, a.personId))} (${a.art})`);
      });
    },
    nachweisGesehen(id: string) {
      aendern((d) => {
        const a = d.antraege.find((x) => x.id === id)!;
        a.nachweis = 'gesehen';
        log(d, `Nachweis gesehen: ${voll(person(d, a.personId))}`);
      });
    },
    nachweisErinnern(id: string) {
      aendern((d) => {
        const a = d.antraege.find((x) => x.id === id)!;
        a.erinnert = d.heute;
        d.mitteilungen.push({ id: neueId('mt'), personId: a.personId, zeit: isoMitZone(new Date()), titel: 'Nachweis fehlt noch', text: 'Bitte reiche den Nachweis für deine Abwesenheit nach.', link: `/ma/nachweis/${a.id}` });
        log(d, `Erinnerung Nachweis an ${voll(person(d, a.personId))}`);
      });
    },
    betriebsurlaubFestlegen(von: string, bis: string) {
      aendern((d) => {
        d.betriebsurlaub = { von, bis, festgelegt: d.heute, wahl: d.betriebsurlaub.wahl };
        for (const p of d.personen) if (p.rolle !== 'nu' && p.rolle !== 'gl' && p.rolle !== 'admin')
          d.mitteilungen.push({ id: neueId('mt'), personId: p.id, zeit: isoMitZone(new Date()), titel: 'Betriebsurlaub festgelegt', text: `Betriebsurlaub vom ${von} bis ${bis}. Bitte deine Auswahl prüfen.`, link: '/ma/betriebsurlaub' });
        log(d, `Betriebsurlaub festgelegt: ${von} bis ${bis}`);
      });
    },
    betriebsurlaubAufheben() {
      aendern((d) => {
        d.betriebsurlaub.festgelegt = undefined;
        log(d, 'Festlegung Betriebsurlaub geändert');
      });
    },
    mehrBuchen(b: Omit<MehrBuchung, 'id' | 'erfasstVon' | 'datum'>) {
      aendern((d) => {
        d.mehrBuchungen.push({ ...b, id: neueId('mb'), datum: d.heute, erfasstVon: wer() });
        log(d, `Mehrstunden ${b.art === 'auszahlung' ? 'Auszahlung' : 'Freizeitausgleich'} gebucht: ${voll(person(d, b.personId))}, ${b.stunden} h`, b.bem);
      });
    },

    // ---------- Baustellen, Disposition ----------
    baustelleAnlegen(b: Pick<Baustelle, 'kst' | 'strasse' | 'plzOrt' | 'bauleitungId' | 'polierId' | 'ortung' | 'massnahme'>) {
      aendern((d) => {
        d.baustellen.push({ ...b, id: neueId('b'), stundenSoll: 0, stundenIstVorher: 0, stundenSollBisHeute: 0, kosten: [], gesamtSoll: 0, gesamtIst: 0 });
        log(d, `Baustelle ${b.kst} angelegt`);
      });
    },
    baustelleAendern(id: string, patch: Partial<Baustelle>) {
      aendern((d) => {
        Object.assign(d.baustellen.find((b) => b.id === id)!, patch);
      });
    },
    archivieren(id: string, an: boolean) {
      aendern((d) => {
        const b = d.baustellen.find((x) => x.id === id)!;
        b.archiviert = an ? d.heute : undefined;
        log(d, `Baustelle ${b.kst} ${an ? 'archiviert' : 'wiederhergestellt'}`);
      });
    },
    einteilen(personId: string, datum: string, baustelleId: string | null, haelfte?: 'vm' | 'nm') {
      aendern((d) => {
        if (haelfte) d.einteilung = d.einteilung.filter((e) => !(e.personId === personId && e.datum === datum && (e.haelfte === haelfte || !e.haelfte)));
        else d.einteilung = d.einteilung.filter((e) => !(e.personId === personId && e.datum === datum));
        if (baustelleId) d.einteilung.push({ personId, datum, baustelleId, haelfte, geaendert: true });
      });
    },
    geraetEinteilen(geraetId: string, datum: string, baustelleId: string | null) {
      aendern((d) => {
        d.geraeteEinteilung = d.geraeteEinteilung.filter((e) => !(e.geraetId === geraetId && e.datum === datum));
        if (baustelleId) d.geraeteEinteilung.push({ geraetId, datum, baustelleId });
      });
    },
    dispoSenden() {
      aendern((d) => {
        const betroffen = new Set(d.einteilung.filter((e) => e.geaendert).map((e) => e.personId));
        for (const e of d.einteilung) e.geaendert = undefined;
        for (const id of betroffen) d.mitteilungen.push({ id: neueId('mt'), personId: id, zeit: isoMitZone(new Date()), titel: 'Einteilung geändert', text: 'Deine Einteilung hat sich geändert. Bitte ansehen.', link: '/ma/einteilung' });
        log(d, `Disposition gesendet (${betroffen.size} Personen benachrichtigt)`);
      });
    },

    // ---------- Nachunternehmer (Einkauf) ----------
    firmaAnlegen(name: string, kontakt: string, mail: string) {
      aendern((d) => {
        const vorlage = d.firmen[0]?.unterlagen.map((u) => ({ name: u.name, status: 'fehlt' as const })) ?? [];
        d.firmen.push({ id: neueId('f'), name, kontakt, mail, adresse: '', tel: '', zugang: false, unterlagen: vorlage });
        log(d, `Nachunternehmer ${name} angelegt`);
      });
    },
    unterlageSetzen(firmaId: string, name: string, patch: Partial<Daten['firmen'][number]['unterlagen'][number]>) {
      aendern((d) => {
        const u = d.firmen.find((f) => f.id === firmaId)!.unterlagen.find((x) => x.name === name)!;
        Object.assign(u, patch);
        log(d, `Unterlage „${name}“: ${patch.status ?? 'geändert'}`);
      });
    },
    nuPersonAnlegen(firmaId: string, vorname: string, nachname: string, taetigkeit: string, stundensatz: number) {
      aendern((d) => {
        d.personen.push({
          id: neueId('nu'), vorname, nachname, rolle: 'nu', gruppe: 'gewerblich', nutztApp: false, sollMoDo: 8.5, sollFr: 7, pin: '1234', urlaubAnspruch: 0, urlaubGenommen: 0, kontoStart: 0,
          persNr: `NU-${d.personen.filter((p) => p.rolle === 'nu').length + 31}`, eintritt: d.heute, zugang: 'ohne', kinder: [], firmaId, taetigkeit, stundensatz, mindestlohn: {},
        });
        log(d, `NU-Person ${vorname} ${nachname} angelegt`);
      });
    },
    mindestlohnErinnern(personId: string, monat: string) {
      aendern((d) => {
        const p = d.personen.find((x) => x.id === personId)!;
        p.mindestlohn = { ...(p.mindestlohn ?? {}), [monat]: 'erinnert' };
        d.mitteilungen.push({ id: neueId('mt'), personId, zeit: isoMitZone(new Date()), titel: 'Mindestlohnerklärung', text: 'Bitte unterschreibe die Erklärung für den letzten Monat.', link: '/nu/nachweise' });
        log(d, `Erinnerung Mindestlohnerklärung an ${voll(p)}`);
      });
    },
    stundensatzSetzen(personId: string, satz: number) {
      aendern((d) => {
        d.personen.find((x) => x.id === personId)!.stundensatz = satz;
        // bewusst ohne Protokoll der Beträge (Vorgabe Rollentabelle)
      });
    },

    // ---------- Projektkosten ----------
    ursprungsSollSetzen(id: string, soll: Kosten4) {
      aendern((d) => {
        d.baustellen.find((b) => b.id === id)!.ursprungsSoll = soll;
        log(d, 'Ursprungs-Soll eingetragen');
      });
    },
    kostenMonatSetzen(id: string, monat: string, patch: Partial<KostenMonat>) {
      aendern((d) => {
        const m = d.baustellen.find((b) => b.id === id)!.kostenMonate!.find((x) => x.monat === monat)!;
        Object.assign(m, patch);
        log(d, `Kostenmonat ${monat}: ${patch.status ?? 'geändert'}`);
      });
    },
    rechnungBuchen(id: string, r: Omit<Rechnung, 'id' | 'gebucht' | 'von'>) {
      aendern((d) => {
        const b = d.baustellen.find((x) => x.id === id)!;
        b.rechnungen = [...(b.rechnungen ?? []), { ...r, id: neueId('r'), gebucht: d.heute, von: wer() }];
        log(d, `Rechnung ${r.nr} gebucht (${r.firma})`);
      });
    },
    mittellohnSetzen(monat: string, wert: number) {
      aendern((d) => {
        d.mittellohn[monat] = wert;
        log(d, `Mittellohn ${monat} geändert`);
      });
    },

    // ---------- Geschäftsleitung, Bauleitung PC, Administrator ----------
    glAntragEntscheiden(id: string, ok: boolean, grund?: string) {
      aendern((d) => {
        const a = d.antraege.find((x) => x.id === id)!;
        a.status = ok ? 'genehmigt' : 'abgelehnt';
        a.glVon = ich()!.id;
        a.ablehnGrund = grund;
        d.mitteilungen.push({ id: neueId('mt'), personId: a.personId, zeit: isoMitZone(new Date()), titel: ok ? 'Antrag genehmigt' : 'Antrag abgelehnt', text: ok ? 'Dein Antrag ist genehmigt.' : `Dein Antrag wurde abgelehnt: ${grund}`, link: '/ma/antraege' });
        log(d, `Antrag von ${voll(person(d, a.personId))} ${ok ? 'genehmigt (Geschäftsleitung)' : 'abgelehnt (Geschäftsleitung)'}`, grund);
      });
    },
    /** Geschäftsleitung legt die Oberbauleitung fest */
    oberbauleitungSetzen(personId: string) {
      aendern((d) => {
        const alt = d.personen.find((p) => p.id === d.oberbauleitungId);
        const neu = d.personen.find((p) => p.id === personId)!;
        if (alt && alt.id !== neu.id && alt.rolle === 'oberbauleitung') alt.rolle = 'bauleitung';
        neu.rolle = 'oberbauleitung';
        d.oberbauleitungId = personId;
        log(d, `Oberbauleitung festgelegt: ${voll(neu)}`);
        d.techLog.push({ zeit: isoMitZone(new Date()), wer: wer(), was: `Rolle Oberbauleitung an ${voll(neu)} vergeben (Geschäftsleitung)` });
      });
    },
    vertretungSetzen(v: Daten['vertretung']) {
      aendern((d) => {
        d.vertretung = v;
        d.techLog.push({ zeit: isoMitZone(new Date()), wer: wer(), was: v.aktiv ? `Vertretung Lohnbüro durch Buchhaltung eingeschaltet (${v.von}–${v.bis})` : 'Vertretung Lohnbüro ausgeschaltet' });
      });
    },
    widerspruchEntscheiden(tagId: string, korrId: string, e: 'bleibt' | 'original') {
      aendern((d) => {
        const t = tagNachId(d, tagId);
        const k = t.korrekturen.find((x) => x.id === korrId)!;
        k.entscheidung = e;
        if (e === 'original') geaendert(d, t, `Widerspruch: ursprüngliche Zeit gilt (${k.was})`);
        if (e === 'original' && k.altId && k.neuId) {
          const alt = d.stempelungen.find((s) => s.id === k.altId)!;
          const neuS = d.stempelungen.find((s) => s.id === k.neuId)!;
          const zurueck = stempel(d, { ...alt, herkunft: 'korrektur', erfasstVon: ich()!.id, ersetztDurch: undefined });
          neuS.ersetztDurch = zurueck.id;
        }
        log(d, `Widerspruch entschieden: ${e === 'bleibt' ? 'Korrektur bleibt' : 'ursprüngliche Zeit gilt'} (${voll(person(d, t.personId))})`);
      });
    },
    rolleJeBaustelle(personId: string, baustelleId: string, rolle: 'bauleitung' | 'polier' | 'vorarbeiter', an: boolean) {
      aendern((d) => {
        d.rollenJeBaustelle = d.rollenJeBaustelle.filter((r) => !(r.personId === personId && r.baustelleId === baustelleId && r.rolle === rolle));
        if (an) d.rollenJeBaustelle.push({ personId, baustelleId, rolle });
        const b = d.baustellen.find((x) => x.id === baustelleId)!;
        d.techLog.push({ zeit: isoMitZone(new Date()), wer: wer(), was: `Rolle ${rolle} auf ${b.kst} ${an ? 'vergeben an' : 'entfernt bei'} ${voll(person(d, personId))}` });
      });
    },
    benutzerRolle(personId: string, rolle: Person['rolle']) {
      aendern((d) => {
        const p = d.personen.find((x) => x.id === personId)!;
        p.rolle = rolle;
        d.techLog.push({ zeit: isoMitZone(new Date()), wer: wer(), was: `Rolle firmenweit für ${voll(p)}: ${rolle}` });
      });
    },
    techLog(was: string) {
      aendern((d) => {
        d.techLog.push({ zeit: isoMitZone(new Date()), wer: wer(), was });
      });
    },
    ohneRueckmeldungEntschieden(tagId: string) {
      aendern((d) => {
        const t = tagNachId(d, tagId);
        for (const k of t.korrekturen) if (!k.antwort && !k.ohneRueckmeldung) k.ohneRueckmeldung = isoMitZone(new Date());
        log(d, `Korrektur bei ${voll(person(d, t.personId))} (${tm(t.datum)}) ohne Rückmeldung entschieden`);
      });
    },
    nachtragAnlegen(n: Omit<Nachtrag, 'id'>) {
      aendern((d) => {
        d.nachtraege.push({ ...n, id: neueId('n') });
        log(d, `Nachtrag ${n.nr} angelegt (${n.status})`);
      });
    },
  };
}

export type Aktionen = ReturnType<typeof erzeugeAktionen>;

interface Kontext {
  d: Daten;
  ich?: Person;
  anmelden: (id: string) => void;
  abmelden: () => void;
  zuruecksetzen: () => void;
  a: Aktionen;
  /** tickt jede halbe Minute, damit laufende Zeiten weiterzählen */
  jetzt: Date;
}

const Ctx = createContext<Kontext | null>(null);

export function DatenProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Daten>(laden);
  const [ichId, setIchId] = useState<string | undefined>(() => {
    try {
      return sessionStorage.getItem(SITZUNG) ?? undefined;
    } catch {
      return undefined;
    }
  });
  const [jetzt, setJetzt] = useState(() => new Date());

  useEffect(() => {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(d));
    } catch {
      /* ohne Speicher weiter */
    }
  }, [d]);
  useEffect(() => {
    const t = setInterval(() => setJetzt(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const ich = ichId ? d.personen.find((p) => p.id === ichId) : undefined;

  const aendern = useCallback((fn: (x: Daten) => void) => {
    setD((alt) => {
      const neu = structuredClone(alt);
      fn(neu);
      return neu;
    });
    setJetzt(new Date());
  }, []);

  const ichRef = useRef(ich);
  ichRef.current = ich;
  const a = useMemo(() => erzeugeAktionen(aendern, () => ichRef.current), [aendern, ichRef]);

  const wert: Kontext = {
    d,
    ich,
    a,
    jetzt,
    anmelden: (id) => {
      setIchId(id);
      try {
        sessionStorage.setItem(SITZUNG, id);
      } catch {
        /* egal */
      }
    },
    abmelden: () => {
      setIchId(undefined);
      try {
        sessionStorage.removeItem(SITZUNG);
      } catch {
        /* egal */
      }
    },
    zuruecksetzen: () => setD(erzeugeDemo()),
  };
  return <Ctx.Provider value={wert}>{children}</Ctx.Provider>;
}

export function useDaten() {
  const c = useContext(Ctx);
  if (!c) throw new Error('DatenProvider fehlt');
  return c;
}

/** für Seiten, die eine angemeldete Person brauchen */
export function useIch() {
  const c = useDaten();
  return { ...c, ich: c.ich! };
}
