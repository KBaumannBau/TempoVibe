// Beispieldaten für die Demo. Alle Namen und Zahlen sind erfunden.
// Die Daten richten sich nach dem heutigen Datum: „gestern“ ist immer der
// letzte Werktag, damit die Freigabe-Kette sofort etwas zu tun hat.

import type { Daten, Person, Stempelung, StempelArt, Standort, Tag, ZuschlagEintrag } from './types';
import { datumKey, istWerktag, isoAus, monatPlus, monatVon, montagDerWoche, plusTage, werktag } from './zeit';

export const DATEN_VERSION = 6;

let nr = 1000;
const person = (p: Partial<Person> & Pick<Person, 'id' | 'vorname' | 'nachname' | 'rolle'>): Person => ({
  persNr: String(++nr).padStart(4, '0'),
  eintritt: '2019-04-01',
  zugang: 'aktiv',
  kinder: [],
  email: `${p.vorname.toLowerCase().replace(/[^a-z]/g, '')}.${p.nachname.toLowerCase().replace(/[^a-z]/g, '')}@k-baumann.example`,
  gruppe: 'gewerblich',
  nutztApp: true,
  sollMoDo: 8.5,
  sollFr: 7,
  pin: '1234',
  urlaubAnspruch: 30,
  urlaubGenommen: 14,
  kontoStart: 30,
  ...p,
});

export function erzeugeDemo(heuteDate = new Date()): Daten {
  nr = 1000;
  const heute = datumKey(heuteDate);
  const monat = monatVon(heute);
  const vormonat = monatPlus(monat, -1);
  const g = werktag(heute, -1); // gestern (letzter Werktag)
  const vg = werktag(heute, -2); // vorgestern

  const personen: Person[] = [
    person({ id: 'stefan', vorname: 'Stefan', nachname: 'Brandl', rolle: 'facharbeiter', urlaubGenommen: 18, kontoStart: 52.3, kinder: ['03/2019'], eintritt: '2017-03-01' }),
    person({ id: 'keller', vorname: 'Martin', nachname: 'Keller', rolle: 'polier', gruppe: 'angestellt', kontoStart: 71, eintritt: '2009-02-01' }),
    person({ id: 'kern', vorname: 'Markus', nachname: 'Kern', rolle: 'vorarbeiter' }),
    person({ id: 'nowak', vorname: 'Andrzej', nachname: 'Nowak', rolle: 'facharbeiter' }),
    person({ id: 'maric', vorname: 'Tomislav', nachname: 'Marić', rolle: 'facharbeiter' }),
    person({ id: 'huber', vorname: 'Peter', nachname: 'Huber', rolle: 'facharbeiter', kontoStart: 64 }),
    person({ id: 'yilmaz', vorname: 'Ali', nachname: 'Yılmaz', rolle: 'facharbeiter' }),
    person({ id: 'popescu', vorname: 'Florin', nachname: 'Popescu', rolle: 'helfer', nutztApp: false, pin: '2468', zugang: 'ohne', email: undefined }),
    person({ id: 'wimmer', vorname: 'Jonas', nachname: 'Wimmer', rolle: 'facharbeiter', zugang: 'gesperrt' }),
    person({ id: 'aydin', vorname: 'Kemal', nachname: 'Aydın', rolle: 'facharbeiter' }),
    person({ id: 'berger', vorname: 'Lukas', nachname: 'Berger', rolle: 'facharbeiter' }),
    person({ id: 'rieger', vorname: 'Thomas', nachname: 'Rieger', rolle: 'polier' }),
    person({ id: 'demir', vorname: 'Burak', nachname: 'Demir', rolle: 'facharbeiter' }),
    person({ id: 'hofmann', vorname: 'Sven', nachname: 'Hofmann', rolle: 'facharbeiter' }),
    person({ id: 'lehner', vorname: 'Marco', nachname: 'Lehner', rolle: 'facharbeiter' }),
    person({ id: 'petrovic', vorname: 'Dragan', nachname: 'Petrović', rolle: 'facharbeiter' }),
    person({ id: 'buerger', vorname: 'Willibald', nachname: 'Bürger', rolle: 'bauleitung', gruppe: 'angestellt', sollMoDo: 8, sollFr: 6, kontoStart: 93, wochenStunden: 38 }),
    person({ id: 'tobias', vorname: 'Tobias', nachname: 'Lechner', rolle: 'helfer', gruppe: 'azubi', unter18: true, kontoStart: 0, urlaubAnspruch: 30, eintritt: '2025-09-01' }),
    // Büro und Leitung (PC)
    person({ id: 'weber', vorname: 'Anna', nachname: 'Weber', rolle: 'buero', gruppe: 'angestellt', sollMoDo: 8, sollFr: 6, kontoStart: 6, wochenStunden: 38 }),
    person({ id: 'sgruber', vorname: 'Stefanie', nachname: 'Gruber', rolle: 'oberbauleitung', gruppe: 'angestellt', sollMoDo: 8, sollFr: 6, kontoStart: 22.5 }),
    person({ id: 'roth', vorname: 'Sabine', nachname: 'Roth', rolle: 'einkauf', gruppe: 'angestellt', sollMoDo: 8, sollFr: 6, kontoStart: 4 }),
    person({ id: 'gl', vorname: 'Geschäftsleitung', nachname: '', rolle: 'gl', gruppe: 'angestellt', sollMoDo: 8, sollFr: 6, kontoStart: 0, email: 'gl@k-baumann.example' }),
    person({ id: 'brunner', vorname: 'Thomas', nachname: 'Brunner', rolle: 'admin', gruppe: 'angestellt', sollMoDo: 8, sollFr: 6, kontoStart: 0 }),
    // Personen der Nachunternehmer
    person({ id: 'horvat', vorname: 'Marko', nachname: 'Horvat', rolle: 'nu', firmaId: 'f2', stundensatz: 42, taetigkeit: 'Facharbeiter', kontoStart: 0, urlaubAnspruch: 0, persNr: 'NU-21',
      ausweis: { art: 'Personalausweis', bis: plusTage(heute, 9), staat: 'Kroatien', gesehenVon: 'Martin Keller', am: plusTage(heute, -50) }, a1Bis: '2026-12-31',
      mindestlohn: { [monatPlus(monat, -2)]: 'unterschrieben', [vormonat]: 'offen' } }),
    person({ id: 'kowalski', vorname: 'Dariusz', nachname: 'Kowalski', rolle: 'nu', firmaId: 'f1', nutztApp: false, zugang: 'ohne', stundensatz: 38, taetigkeit: 'Facharbeiter', kontoStart: 0, urlaubAnspruch: 0, persNr: 'NU-11',
      ausweis: { art: 'Personalausweis', bis: '2029-05-31', staat: 'Polen', gesehenVon: 'Anna Weber', am: plusTage(heute, -120) }, a1Bis: '2027-03-31',
      mindestlohn: { [monatPlus(monat, -2)]: 'unterschrieben', [vormonat]: 'unterschrieben' } }),
    person({ id: 'ionescu', vorname: 'Mihai', nachname: 'Ionescu', rolle: 'nu', firmaId: 'f1', nutztApp: false, zugang: 'ohne', stundensatz: 36, taetigkeit: 'Helfer', kontoStart: 0, urlaubAnspruch: 0, persNr: 'NU-12',
      ausweis: { art: 'Reisepass', bis: '2030-01-31', staat: 'Rumänien', gesehenVon: 'Anna Weber', am: plusTage(heute, -120) }, a1Bis: plusTage(heute, -12),
      mindestlohn: { [monatPlus(monat, -2)]: 'unterschrieben', [vormonat]: 'erinnert' } }),
  ];

  const baustellen: Daten['baustellen'] = [
    {
      id: 'b25050', kst: '25050', strasse: 'Achleitnerstraße 8', plzOrt: '81545 München', polierId: 'keller', bauleitungId: 'buerger',
      stundenSoll: 2520, stundenIstVorher: 700, stundenSollBisHeute: 1120, ortung: true,
      kosten: [{ art: 'Lohn', soll: 182000, ist: 176400 }, { art: 'Material', soll: 96000, ist: 101300 }, { art: 'Geräte', soll: 24000, ist: 22900 }],
      gesamtSoll: 368000, gesamtIst: 366900, massnahme: 'Neubau Mehrfamilienhaus, Rohbau',
      ursprungsSoll: { lohn: 173800, material: 92800, geraete: 23200, nu: 62200 },
    },
    {
      id: 'b25062', kst: '25062', strasse: 'Rosenheimer Landstraße 14', plzOrt: '85521 Ottobrunn', polierId: 'keller', bauleitungId: 'buerger',
      stundenSoll: 640, stundenIstVorher: 210, stundenSollBisHeute: 240, ortung: true,
      kosten: [{ art: 'Lohn', soll: 46000, ist: 15800 }, { art: 'Material', soll: 31000, ist: 9700 }, { art: 'Geräte', soll: 6000, ist: 2100 }],
      gesamtSoll: 96000, gesamtIst: 31900, massnahme: 'Anbau Kindergarten',
      ursprungsSoll: { lohn: 46000, material: 31000, geraete: 6000, nu: 13000 },
    },
    {
      id: 'b25075', kst: '25075', strasse: 'Alpenveilchenstraße 56a', plzOrt: '81549 München', polierId: 'rieger', bauleitungId: 'buerger',
      stundenSoll: 1800, stundenIstVorher: 760, stundenSollBisHeute: 860, ortung: true,
      kosten: [{ art: 'Lohn', soll: 128000, ist: 61200 }, { art: 'Material', soll: 74000, ist: 33900 }, { art: 'Geräte', soll: 15000, ist: 6800 }],
      gesamtSoll: 251000, gesamtIst: 118200, massnahme: 'Sanierung Wohnanlage, Kellergeschoss',
      ursprungsSoll: { lohn: 126200, material: 73800, geraete: 14100, nu: 34000 },
    },
    {
      id: 'b24031', kst: '24031', strasse: 'Wendelsteinstraße 3', plzOrt: '83026 Rosenheim', polierId: 'keller', bauleitungId: 'buerger',
      stundenSoll: 900, stundenIstVorher: 884, stundenSollBisHeute: 900, ortung: true, archiviert: plusTage(heute, -60), massnahme: 'Garagenzeile',
      kosten: [{ art: 'Lohn', soll: 61000, ist: 60200 }, { art: 'Material', soll: 33000, ist: 34100 }, { art: 'Geräte', soll: 8000, ist: 7600 }],
      gesamtSoll: 112000, gesamtIst: 111800,
    },
    {
      id: 'b300', kst: '300', strasse: 'Lager Bruckmühl', plzOrt: '83052 Bruckmühl', bauleitungId: 'buerger', massnahme: 'Lager, Werkstatt (ohne festen Ort für Regie)',
      stundenSoll: 0, stundenIstVorher: 0, stundenSollBisHeute: 0, ortung: false, kosten: [], gesamtSoll: 0, gesamtIst: 0,
    },
  ];

  // Einteilung (Disposition) für 3 Wochen ab Montag der Vorwoche
  const einteilung: Daten['einteilung'] = [];
  const kolonne25050 = ['keller', 'stefan', 'kern', 'nowak', 'maric', 'huber', 'yilmaz', 'popescu', 'wimmer', 'horvat', 'tobias'];
  const start = `${vormonat}-01`;
  const tageEinteilung = Math.round((Date.parse(plusTage(montagDerWoche(heute), 14)) - Date.parse(start)) / 86400000);
  for (let i = 0; i < tageEinteilung; i++) {
    const d = plusTage(start, i);
    for (const p of kolonne25050) {
      const abWoche = d >= plusTage(montagDerWoche(heute), 3); // Marić ab Donnerstag woanders
      einteilung.push({ personId: p, datum: d, baustelleId: p === 'maric' && abWoche ? 'b25075' : 'b25050' });
    }
    for (const p of ['aydin', 'berger']) einteilung.push({ personId: p, datum: d, baustelleId: 'b25062' });
    for (const p of ['rieger', 'demir', 'hofmann', 'lehner', 'petrovic']) einteilung.push({ personId: p, datum: d, baustelleId: 'b25075' });
  }

  const stempelungen: Stempelung[] = [];
  let n = 0;
  const st = (personId: string, datum: string, art: StempelArt, hhmm: string, baustelleId: string, extra: Partial<Stempelung> = {}) => {
    const zeit = isoAus(datum, hhmm);
    stempelungen.push({
      id: `s${++n}`, personId, datum, art, zeit, eingang: zeit, baustelleId,
      standort: 'passt' as Standort, herkunft: 'gestempelt', erfasstVon: personId, ...extra,
    });
  };
  const normalerTag = (p: string, d: string, b: string, von = '07:00', bis = '16:00', pause: [string, string] = ['12:00', '13:00']) => {
    st(p, d, 'beginn', von, b);
    st(p, d, 'pause', pause[0], b);
    st(p, d, 'weiter', pause[1], b);
    st(p, d, 'ende', bis, b);
  };

  const tage: Tag[] = [];
  const tag = (personId: string, datum: string, status: Tag['status'], extra: Partial<Tag> = {}) =>
    tage.push({ id: `${personId}_${datum}`, personId, datum, status, zuschlaege: [], wegezeitMin: 0, verpflegung: false, uebernachtung: false, korrekturen: [], ...extra });
  const z = (id: string, art: string, stunden: number, typ?: string): ZuschlagEintrag => ({ id, art, typ, stunden, entscheidung: 'offen' });

  // Abwesenheiten im Vormonat (für Export und Kalender)
  const urlaubStefan = [werktag(`${vormonat}-01`, 6), werktag(`${vormonat}-01`, 7)];
  const krankNowak = werktag(`${vormonat}-01`, 11);
  const nachtTag = werktag(`${vormonat}-01`, 14);
  // ältere Tage: Vormonat und aktueller Monat bis vor drei Werktagen, alle freigegeben
  const historie: Record<string, string[]> = {
    b25050: ['stefan', 'kern', 'nowak', 'maric', 'huber', 'wimmer', 'keller', 'horvat', 'tobias'],
    b25062: ['aydin', 'berger'],
    b25075: ['demir', 'hofmann', 'lehner', 'petrovic', 'rieger'],
  };
  const bisHist = werktag(heute, -3);
  let zaehl = 0;
  for (let d = `${vormonat}-01`; d <= bisHist; d = plusTage(d, 1)) {
    if (!istWerktag(d)) continue;
    zaehl++;
    for (const [b, leute] of Object.entries(historie)) {
      for (const p of leute) {
        if (p === 'stefan' && urlaubStefan.includes(d)) continue;
        if (p === 'nowak' && d === krankNowak) continue;
        const pol = b === 'b25075' ? 'rieger' : 'keller';
        if (b === 'b25075' && p === 'demir' && d === nachtTag) {
          // Nachtschicht: zählt zum Tag des Beginns
          normalerTag(p, d, b, '19:00', '02:30', ['23:00', '23:30']);
          const ende = stempelungen[stempelungen.length - 1];
          ende.zeit = isoAus(plusTage(d, 1), '02:30');
        } else if (p === 'tobias') normalerTag(p, d, b, '07:00', '15:30', ['12:00', '13:00']);
        else normalerTag(p, d, b, '07:00', zaehl % 2 ? '16:30' : '16:00');
        const imVormonat = d.startsWith(vormonat);
        const uebernehmen = imVormonat && !(p === 'huber' && zaehl > 18) && p !== 'horvat';
        tag(p, d, 'freigegeben', {
          polierFreigabeVon: pol, bauleitungFreigabeVon: 'buerger',
          uebernommen: uebernehmen ? plusTage(d, 2) : undefined,
          wegezeitMin: b === 'b25062' ? 40 : 20, verpflegung: b === 'b25062',
        });
      }
    }
    // Angestellte: eigene Zeiten ohne Ortung
    for (const p of ['buerger', 'weber', 'sgruber', 'roth']) {
      normalerTag(p, d, '', '07:30', p === 'buerger' ? '17:00' : '16:00', ['12:00', '12:45']);
      tag(p, d, 'freigegeben', { anOberbauleitung: p === 'buerger', bauleitungFreigabeVon: p === 'buerger' ? 'sgruber' : 'gl', uebernommen: d.startsWith(vormonat) ? plusTage(d, 2) : undefined });
    }
  }

  // vorgestern: Stefan mit Korrektur vom Polier, noch ohne Antwort
  // Stefan hatte keine Pause gestempelt, der Polier hat sie als neuen Eintrag ergänzt
  st('stefan', vg, 'beginn', '07:02', 'b25050');
  st('stefan', vg, 'ende', '16:10', 'b25050');
  st('stefan', vg, 'pause', '12:00', 'b25050', { herkunft: 'korrektur', erfasstVon: 'keller' });
  st('stefan', vg, 'weiter', '12:30', 'b25050', { herkunft: 'korrektur', erfasstVon: 'keller' });
  // Der Tag bleibt beim Polier, bis Stefan antwortet (oder die Frist abläuft)
  tag('stefan', vg, 'beim_polier', {
    korrekturen: [{ id: 'k-vg', von: 'keller', zeit: isoAus(vg, '18:05'), was: 'Pause 12:00–12:30 ergänzt', grund: 'Mit Stefan besprochen' }],
  });
  for (const p of ['kern', 'nowak', 'maric', 'huber', 'wimmer']) {
    normalerTag(p, vg, 'b25050');
    tag(p, vg, 'freigegeben', { polierFreigabeVon: 'keller', bauleitungFreigabeVon: 'buerger' });
  }

  // gestern, Baustelle 25050
  st('stefan', g, 'beginn', '06:58', 'b25050');
  st('stefan', g, 'pause', '09:30', 'b25050');
  st('stefan', g, 'weiter', '10:00', 'b25050');
  st('stefan', g, 'pause', '12:00', 'b25050');
  st('stefan', g, 'weiter', '12:30', 'b25050');
  st('stefan', g, 'ende', '15:45', 'b25050', { standort: 'weicht_ab', entfernungM: 400, begruendung: 'Restmaterial zum Container an der Bahnstraße gebracht.' });
  tag('stefan', g, 'beim_polier', {
    zuschlaege: [z('z1', 'atem', 2.5, 'Halbmaske mit Wechselfilter'), z('z2', 'erschuett', 1, 'Bohr- oder Abbruchhammer ab 13 kg')],
  });
  normalerTag('kern', g, 'b25050', '07:00', '16:30');
  tag('kern', g, 'beim_polier');
  normalerTag('maric', g, 'b25050', '07:00', '16:30');
  tag('maric', g, 'beim_polier');
  normalerTag('huber', g, 'b25050', '07:00', '17:00');
  tag('huber', g, 'beim_polier');
  normalerTag('keller', g, 'b25050', '06:50', '16:20');
  // Der Polier gibt seinen eigenen Tag nicht frei: er geht direkt an die Bauleitung
  tag('keller', g, 'bei_bauleitung');
  // Nowak: Ende vergessen, Meldung liegt beim Polier
  st('nowak', g, 'beginn', '06:55', 'b25050');
  st('nowak', g, 'pause', '12:00', 'b25050');
  st('nowak', g, 'weiter', '13:00', 'b25050');
  tag('nowak', g, 'offen');
  // Baustelle 25062
  for (const p of ['aydin', 'berger']) {
    normalerTag(p, g, 'b25062', '07:00', '16:30');
    tag(p, g, 'beim_polier');
  }
  // Baustelle 25075 (Polier Rieger hat schon freigegeben)
  st('demir', g, 'beginn', '06:30', 'b25075');
  st('demir', g, 'pause', '12:00', 'b25075');
  st('demir', g, 'weiter', '12:30', 'b25075');
  st('demir', g, 'ende', '16:30', 'b25075');
  tag('demir', g, 'bei_bauleitung', { polierFreigabeVon: 'rieger', pauseBegruendung: 'Betonage am Stück, zweite Pause nicht möglich.' });
  for (const p of ['hofmann', 'lehner', 'petrovic']) {
    normalerTag(p, g, 'b25075', '07:00', '16:30');
    tag(p, g, 'bei_bauleitung', { polierFreigabeVon: 'rieger' });
  }
  // Bauleiter: eigener Tag gestern, noch nicht an die Oberbauleitung gesendet
  st('buerger', g, 'beginn', '07:05', '', { standort: 'ohne' });
  st('buerger', g, 'pause', '12:00', '', { standort: 'ohne' });
  st('buerger', g, 'weiter', '12:45', '', { standort: 'ohne' });
  st('buerger', g, 'ende', '17:20', '', { standort: 'ohne' });
  tag('buerger', g, 'offen');

  // Nachunternehmer-Person mit App: gestern gesendet
  normalerTag('horvat', g, 'b25050', '07:00', '16:15', ['12:00', '12:45']);
  tag('horvat', g, 'beim_polier');
  normalerTag('tobias', g, 'b25050', '07:00', '15:30');
  tag('tobias', g, 'beim_polier');
  for (const s of stempelungen) if (['buerger', 'weber', 'sgruber', 'roth', 'keller'].includes(s.personId)) s.standort = 'ohne';

  // Projektkosten: Monate bis heute (abgeschlossen, wartet auf Lohnwert, läuft)
  for (const b of baustellen) {
    if (!b.ursprungsSoll) continue;
    const monate: NonNullable<typeof b.kostenMonate> = [];
    const anzahl = 6;
    const anteil = (k: string) => b.kosten.find((x) => x.art === k)?.ist ?? 0;
    const nuIst = b.gesamtIst - b.kosten.reduce((s, k) => s + k.ist, 0);
    for (let i = anzahl - 1; i >= 0; i--) {
      const m = monatPlus(monat, -i);
      const f = i === 0 ? 0.35 : 1;
      monate.push({
        monat: m, status: i === 0 ? 'laeuft' : i === 1 ? 'wartet' : 'abgeschlossen',
        lohn: i <= 1 ? 0 : Math.round((anteil('Lohn') / anzahl) * f),
        material: Math.round((anteil('Material') / anzahl) * f), geraete: Math.round((anteil('Geräte') / anzahl) * f), nu: Math.round((Math.max(0, nuIst) / anzahl) * f),
      });
    }
    b.kostenMonate = monate;
    b.rechnungen = [
      { id: `${b.id}-r1`, monat: vormonat, gebucht: plusTage(`${monat}-01`, 2), firma: 'Baustoff Huber KG', nr: 'RE-26-4471', leistung: 'Beton C25/30, 42 m³', art: 'material', betrag: Math.round(anteil('Material') / anzahl * 0.4), von: 'Buchhaltung' },
      { id: `${b.id}-r2`, monat: monat, gebucht: plusTage(heute, -1), firma: 'Mietpark Inn GmbH', nr: 'MP-11-208', leistung: 'Miete Minibagger', art: 'geraete', betrag: 1180, von: 'Buchhaltung' },
      { id: `${b.id}-r3`, monat: monatPlus(monat, -2), gebucht: plusTage(`${vormonat}-01`, 12), firma: 'Bauservice Gruber GmbH', nr: 'BG-2026-117', leistung: 'Bewehrung, Nachberechnung', art: 'nu', betrag: 2400, von: 'Buchhaltung', nachbuchung: true },
    ];
  }

  const montagIn6 = montagDerWoche(plusTage(heute, 42));

  return {
    version: DATEN_VERSION,
    heute,
    oberbauleitungId: 'sgruber',
    personen,
    baustellen,
    einteilung,
    stempelungen,
    tage,
    vergessen: [{ id: 'v1', personId: 'nowak', datum: g, art: 'ende', von: '16:15', gemeldet: isoAus(g, '18:40'), status: 'offen' }],
    antraege: [
      { id: 'a1', personId: 'stefan', art: 'urlaub', von: montagIn6, bis: plusTage(montagIn6, 4), tage: 5, gestellt: isoAus(vg, '19:12'), status: 'offen' },
      { id: 'a2', personId: 'huber', art: 'konto', von: werktag(heute, 8), bis: werktag(heute, 8), tage: 1, stunden: 8.5, gestellt: isoAus(g, '17:30'), status: 'offen' },
      { id: 'a3', personId: 'nowak', art: 'urlaub', von: plusTage(montagIn6, 2), bis: plusTage(montagIn6, 3), tage: 2, gestellt: isoAus(werktag(heute, -6), '18:00'), status: 'bauleitung_ok' },
      { id: 'a4', personId: 'demir', art: 'urlaub', von: werktag(heute, 15), bis: werktag(heute, 19), tage: 5, gestellt: isoAus(werktag(heute, -9), '18:00'), status: 'genehmigt' },
      { id: 'a5', personId: 'yilmaz', art: 'krank', wer: 'ich', von: vg, bis: werktag(heute, 1), tage: 4, gestellt: isoAus(vg, '06:10'), status: 'gemeldet', nachweis: 'hochgeladen', quelle: 'app' },
      { id: 'a6', personId: 'stefan', art: 'urlaub', von: urlaubStefan[0], bis: urlaubStefan[1], tage: 2, gestellt: isoAus(`${monatPlus(monat, -2)}-10`, '18:00'), status: 'genehmigt', glVon: 'gl' },
      { id: 'a7', personId: 'nowak', art: 'krank', wer: 'ich', von: krankNowak, bis: krankNowak, tage: 1, gestellt: isoAus(krankNowak, '06:02'), status: 'gemeldet', quelle: 'hand', notiz: 'telefonisch beim Polier' },
      { id: 'a8', personId: 'stefan', art: 'arbeitsbefreiung', anlass: 'umzug', von: werktag(heute, -14), bis: werktag(heute, -14), tage: 1, gestellt: isoAus(werktag(heute, -20), '19:00'), status: 'genehmigt', nachweis: 'fehlt', quelle: 'app' },
      { id: 'a9', personId: 'keller', art: 'urlaub', von: werktag(heute, 25), bis: werktag(heute, 29), tage: 5, gestellt: isoAus(werktag(heute, -3), '18:00'), status: 'offen' },
    ],
    helfer: [
      { id: 'h0', baustelleId: 'b25050', datum: vg, firma: 'eigen', nu: false, name: 'Sepp Maier', von: '07:00', bis: '16:00', pauseMin: 60, taetigkeit: 'Schalung' },
      { id: 'h1', baustelleId: 'b25050', datum: vg, firma: 'Bauservice Gruber GmbH', nu: true, name: 'Dariusz Kowalski', von: '07:00', bis: '16:30', pauseMin: 60, taetigkeit: 'Bewehrung' },
      { id: 'h2', baustelleId: 'b25050', datum: vg, firma: 'Bauservice Gruber GmbH', nu: true, name: 'Mihai Ionescu', von: '07:00', bis: '16:00', pauseMin: 60, taetigkeit: 'Bewehrung', warnung: 'A1-Bescheinigung abgelaufen' },
    ],
    helferDispo: [
      { baustelleId: 'b25050', firma: 'eigen', nu: false, name: 'Sepp Maier', taetigkeit: 'Schalung' },
      { baustelleId: 'b25050', firma: 'Bauservice Gruber GmbH', nu: true, name: 'Dariusz Kowalski', taetigkeit: 'Bewehrung' },
      { baustelleId: 'b25050', firma: 'Bauservice Gruber GmbH', nu: true, name: 'Mihai Ionescu', taetigkeit: 'Bewehrung', warnung: 'A1-Bescheinigung abgelaufen' },
      { baustelleId: 'b25062', firma: 'eigen', nu: false, name: 'Anton Huber', taetigkeit: 'Erdarbeiten' },
    ],
    ausfaelle: [],
    nachtraege: [
      { id: 'n3', baustelleId: 'b25050', nr: 'NT 03', bezeichnung: 'Kellerabdichtung zusätzlich', datum: werktag(heute, -30), status: 'beauftragt', lohn: 8200, material: 3200, geraete: 800, nu: 6200, stunden: 120 },
      { id: 'n4', baustelleId: 'b25050', nr: 'NT 04', bezeichnung: 'Mehrmengen Aushub', datum: werktag(heute, -10), status: 'angeboten', lohn: 2600, material: 0, geraete: 4600, nu: 0, stunden: 40 },
      { id: 'n5', baustelleId: 'b25050', nr: 'NT 05', bezeichnung: 'Entfall Pflaster Hof', datum: werktag(heute, -5), status: 'beauftragt', lohn: 0, material: 0, geraete: 0, nu: -4000, stunden: 0 },
      { id: 'n6', baustelleId: 'b25075', nr: 'NT 01', bezeichnung: 'Zusätzliche Kernbohrungen', datum: werktag(heute, -4), status: 'angeboten', lohn: 1800, material: 200, geraete: 900, nu: 0, stunden: 24 },
    ],
    geraete: [
      { id: 'g1', personId: 'stefan', name: 'Samsung Galaxy A54', seit: werktag(heute, -25), zuletzt: heute, aktiv: true, diesesHandy: true },
      { id: 'g2', personId: 'stefan', name: 'iPhone 11', seit: werktag(heute, -300), zuletzt: werktag(heute, -26), aktiv: true, diesesHandy: false },
      { id: 'g3', personId: 'wimmer', name: 'iPhone 12', seit: werktag(heute, -200), zuletzt: g, aktiv: false, diesesHandy: false },
      { id: 'g4', personId: 'keller', name: 'Samsung Galaxy S23', seit: werktag(heute, -90), zuletzt: heute, aktiv: true, diesesHandy: true },
      { id: 'g5', personId: 'buerger', name: 'iPhone 15', seit: werktag(heute, -120), zuletzt: heute, aktiv: true, diesesHandy: true },
    ],
    protokoll: [
      { zeit: isoAus(g, '17:10'), wer: 'Lohnbuchhaltung', was: 'Gerät „iPhone 12“ von Jonas Wimmer abgemeldet', warum: 'Handy verloren' },
    ],
    demoStandort: 'passt',

    firmen: [
      {
        id: 'f1', name: 'Bauservice Gruber GmbH', kontakt: 'Josef Gruber (Geschäftsführer)', mail: 'info@bauservice-gruber.example', adresse: 'Industriestraße 4, 83043 Bad Aibling', tel: '08061 5550-40', zugang: true,
        unterlagen: [
          { name: 'Gewerbeanmeldung / Handwerkskarte', status: 'gueltig' },
          { name: 'Nachweis Betriebshaftpflicht', status: 'gueltig', bis: '2027-03-31' },
          { name: 'Freistellungsbescheinigung § 48b EStG (Unbedenklichkeit Finanzamt)', status: 'abgelaufen', bis: plusTage(heute, -20) },
          { name: 'Unbedenklichkeit SOKA-BAU (oder Negativbescheinigung)', status: 'gueltig', bis: plusTage(heute, 40) },
          { name: 'Unbedenklichkeit BG BAU', status: 'gueltig', bis: '2027-01-31' },
          { name: 'Unbedenklichkeit Krankenkassen (alle Kassen der eingesetzten Personen)', status: 'pruefen', bis: plusTage(heute, 85) },
          { name: 'Mindestlohnerklärung der Firma (MiLoG / AEntG)', status: 'gueltig' },
        ],
      },
      {
        id: 'f2', name: 'Bau-Service Kovač GmbH', kontakt: 'Ivan Kovač (Geschäftsführer)', mail: 'buero@bauservice-kovac.example', adresse: 'Kufsteiner Straße 12, 83022 Rosenheim', tel: '08031 5550-12', zugang: false,
        unterlagen: [
          { name: 'Gewerbeanmeldung / Handwerkskarte', status: 'gueltig' },
          { name: 'Nachweis Betriebshaftpflicht', status: 'gueltig', bis: '2027-06-30' },
          { name: 'Freistellungsbescheinigung § 48b EStG (Unbedenklichkeit Finanzamt)', status: 'gueltig', bis: '2027-02-28' },
          { name: 'Unbedenklichkeit SOKA-BAU (oder Negativbescheinigung)', status: 'fehlt' },
          { name: 'Unbedenklichkeit BG BAU', status: 'gueltig', bis: '2027-01-31' },
          { name: 'Unbedenklichkeit Krankenkassen (alle Kassen der eingesetzten Personen)', status: 'gueltig', bis: plusTage(heute, 60) },
          { name: 'Mindestlohnerklärung der Firma (MiLoG / AEntG)', status: 'gueltig' },
        ],
      },
    ],
    exporte: [],
    nachtMail: {},
    mehrBuchungen: [
      { id: 'mb1', personId: 'keller', datum: `${monatPlus(monat, -3)}-28`, art: 'auszahlung', stunden: 10, monat: monatPlus(monat, -3), bem: 'lt. Absprache mit der Geschäftsleitung', erfasstVon: 'Anna Weber' },
      { id: 'mb2', personId: 'buerger', datum: `${monatPlus(monat, -2)}-15`, art: 'frei', stunden: 16, von: `${monatPlus(monat, -2)}-15`, bis: `${monatPlus(monat, -2)}-16`, bem: 'Freizeitausgleich nach Betonage', erfasstVon: 'Anna Weber' },
    ],
    betriebsurlaub: { von: `${heute.slice(0, 4)}-12-21`, bis: `${Number(heute.slice(0, 4)) + 1}-01-06`, wahl: {} },
    nachrichten: [
      { id: 'nm1', von: 'keller', zeit: isoAus(heute, '06:52'), text: 'Minibagger ab Donnerstag nicht mehr nötig.', baustelleId: 'b25050' },
    ],
    geraetePool: [
      { id: 'gx1', name: 'Minibagger Kubota KX019' }, { id: 'gx2', name: 'Bagger Takeuchi TB260' }, { id: 'gx3', name: 'Bauaufzug GEDA 500' },
      { id: 'gx4', name: 'Rüttelplatte 400 kg' }, { id: 'gx5', name: 'Kernbohrgerät Hilti DD 350' }, { id: 'gx6', name: 'Transporter VW Crafter' },
      { id: 'gx7', name: 'Transporter Ford Transit' }, { id: 'gx8', name: 'LKW Kipper MAN TGS' },
    ],
    geraeteEinteilung: [0, 1, 2, 3, 4].flatMap((i) => {
      const d = plusTage(montagDerWoche(heute), i);
      const l = [{ geraetId: 'gx2', datum: d, baustelleId: 'b25075' }, { geraetId: 'gx6', datum: d, baustelleId: 'b25050' }];
      if (i < 3) l.push({ geraetId: 'gx1', datum: d, baustelleId: 'b25050' });
      if (i >= 2) l.push({ geraetId: 'gx5', datum: d, baustelleId: 'b25075' });
      return l;
    }),
    rollenJeBaustelle: [
      { personId: 'buerger', baustelleId: 'b25050', rolle: 'bauleitung' }, { personId: 'buerger', baustelleId: 'b25062', rolle: 'bauleitung' }, { personId: 'buerger', baustelleId: 'b25075', rolle: 'bauleitung' },
      { personId: 'keller', baustelleId: 'b25050', rolle: 'polier' }, { personId: 'keller', baustelleId: 'b25062', rolle: 'polier' }, { personId: 'rieger', baustelleId: 'b25075', rolle: 'polier' },
    ],
    mittellohn: { [monatPlus(monat, -3)]: 62.8, [monatPlus(monat, -2)]: 63.1, [vormonat]: 63.5, [monat]: 63.5 },
    vertretung: { aktiv: false },
    techLog: [
      { zeit: isoAus(heute, '07:41'), wer: 'Anna Weber', was: 'Anmeldung am PC' },
      { zeit: isoAus(g, '16:02'), wer: 'Thomas Brunner', was: 'Rolle „Vorarbeiter“ an Markus Kern vergeben' },
      { zeit: isoAus(g, '17:10'), wer: 'Lohnbuchhaltung', was: 'Zugang von Jonas Wimmer gesperrt (Handy verloren)' },
      { zeit: isoAus(vg, '08:15'), wer: 'Thomas Brunner', was: 'Einladung an Marko Horvat (Bau-Service Kovač GmbH) gesendet' },
    ],
    mitteilungen: [
      { id: 'mt1', personId: 'stefan', zeit: isoAus(g, '13:05'), titel: 'Pause nicht vergessen', text: 'Du arbeitest seit 6 Stunden. Ab 6 h sind mindestens 30 Minuten Pause Pflicht.', gelesen: true },
      { id: 'mt2', personId: 'stefan', zeit: isoAus(werktag(heute, -1), '18:00'), titel: 'Nachweis fehlt noch', text: 'Für deine Arbeitsbefreiung (Umzug) fehlt der Nachweis. Bitte nachreichen.', link: '/ma/nachweis/a8' },
      { id: 'mt3', personId: 'stefan', zeit: isoAus(heute, '06:30'), titel: 'Resturlaub', text: 'Du hast noch Urlaub aus diesem Jahr. Plane ihn bis 31.03. des nächsten Jahres ein.', link: '/ma/antraege' },
      { id: 'mt4', personId: 'keller', zeit: isoAus(g, '13:20'), titel: 'Pause fehlt: Peter Huber', text: 'Peter Huber arbeitet seit über 6 Stunden ohne Pause.', link: '/p/kolonne' },
    ],
  };
}
