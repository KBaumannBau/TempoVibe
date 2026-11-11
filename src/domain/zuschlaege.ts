// Erschwerniszuschläge nach § 6 BRTV Bau, gruppiert wie im Tarifvertrag.
// Geprüft gegen die Tarifsammlung für die Bauwirtschaft 2026/2027 (BRTV § 6, S. 245–249).
// Beträge in Euro zeigt die App bewusst nicht an.

export interface ZuschlagArt {
  id: string;
  name: string;
  typen: string[];
  /** Info-Text: wann es den Zuschlag gibt und wann nicht */
  text: string;
  /** schließt diese Arten für dieselbe Zeit aus, egal welcher Typ */
  nichtMit: string[];
  /** schließt zusätzlich diese Arten aus, wenn genau dieser Typ gewählt ist */
  nichtMitBeiTyp?: Record<string, string[]>;
  oben?: boolean;
}

export const SCHUTZ_VOLL = 'Schutzanzug mit Gesichts- und Atemschutz, Hitze- oder Schallschutzanzug';
export const ABORT = 'Abort- oder Kläranlage mit Schmutzwasser';

export const ZUSCHLAEGE: ZuschlagArt[] = [
  {
    id: 'atem', name: 'Staub und Atemschutz', oben: true,
    typen: ['Filtrierende Halbmaske (FFP)', 'Halbmaske mit Wechselfilter', 'Vollmaske mit Wechselfilter', 'Frischluft-Druckschlauchgerät', 'Saugschlauchgerät, Pressluftatmer oder Regenerationsgerät'],
    text: 'Ja: für die Stunden, in denen du bei der Arbeit ein Atemschutzgerät trägst, also eine FFP-Maske, eine Halb- oder Vollmaske mit Wechselfilter, ein Schlauchgerät, einen Pressluftatmer oder ein Regenerationsgerät. Nein: für Staub ohne Maske, für die einfache Staubmaske („Hundeschnauze“) und für Zeit, in der du die Maske nicht trägst. Zusammen mit Einweg- oder Chemikalienschutzanzug gibt es beide Zuschläge. Zusammen mit Vollschutz-, Hitze- oder Schallschutzanzug gibt es nur den Zuschlag für den Anzug. Den Schmutzzuschlag gibt es daneben nicht.',
    nichtMit: ['schmutz'],
  },
  {
    id: 'schmutz', name: 'Schmutzarbeit', oben: true,
    typen: ['Außergewöhnlich schmutzig', ABORT],
    text: 'Außergewöhnlich schmutzig: Ja, wenn die Arbeit deutlich schmutziger ist als das, was in deinem Gewerk sonst üblich ist. Nein für normalen Baustellendreck, und nein, wenn du für dieselbe Zeit schon Atemschutz, Schutzkleidung oder Wasserarbeit bekommst. Abort- oder Kläranlage: Ja, wenn du in einer Abort- oder Kläranlage arbeitest, die in Betrieb ist, und dabei mit Schmutzwasser in Berührung kommst. Daneben gibt es für dieselbe Zeit keinen anderen Zuschlag.',
    nichtMit: ['atem', 'schutz', 'wasser'],
    nichtMitBeiTyp: { [ABORT]: ['atem', 'erschuett', 'schutz', 'wasser', 'hoehe', 'abbruch', 'hitze', 'schacht', 'kanal', 'druck', 'taucher'] },
  },
  {
    id: 'erschuett', name: 'Erschütterung', oben: true,
    typen: ['Bohr- oder Abbruchhammer ab 13 kg', 'Baumaschine ohne Schwingungsdämpfung', 'Höchstdruck-Wasserstrahl ab 500 bar'],
    text: 'Ja: für die Stunden, in denen du einen handgeführten Bohr- oder Schlaghammer mit 13 kg oder mehr bedienst, auf einer Baumaschine oder einem Fahrzeug fährst oder mitfährst, oder von Hand mit der Pistole eines Höchstdruckgeräts arbeitest (500 bar und mehr als 30 Liter pro Minute). Nein, wenn der Hersteller den Hammer oder die Maschine als schwingungsgedämpft gekennzeichnet hat. Werker im Schacht- und Tunnelbau bekommen den Zuschlag nicht, außer unter Tage im Bergwerk.',
    nichtMit: [],
  },
  {
    id: 'schutz', name: 'Schutzkleidung',
    typen: ['Einweg-Schutzanzug, luftdicht', 'Chemikalien- oder Kontaminationsschutzanzug', SCHUTZ_VOLL],
    text: 'Ja: für die Stunden, in denen du einen luftdichten Einweg-Schutzanzug, einen Chemikalienschutzanzug ohne Gesichtsschutz, einen Kontaminationsschutzanzug, einen Vollschutzanzug mit Gesichts- und Atemschutz, Schutzkleidung gegen Hitzestrahlung oder einen Schallschutzanzug trägst. Nein für normale Arbeitskleidung, Warn- oder Regenkleidung. Beim Einweg- oder Chemikalienschutzanzug kann zusätzlich der Atemschutz-Zuschlag anfallen. Beim Vollschutz-, Hitze- oder Schallschutzanzug ist der Atemschutz schon enthalten. Den Schmutzzuschlag gibt es daneben nicht.',
    nichtMit: ['schmutz'],
    nichtMitBeiTyp: { [SCHUTZ_VOLL]: ['atem'] },
  },
  {
    id: 'wasser', name: 'Wasserarbeit',
    typen: ['Schaftstiefel', 'Wat- oder Kanalhose', 'Wat- oder Taucheranzug ohne Helm'],
    text: 'Ja: für die Stunden, in denen du für die Arbeit Schaftstiefel, eine Wathose oder Kanal-Latzhose oder einen Watanzug oder Taucheranzug ohne Helm tragen musst. Den Schmutzzuschlag gibt es daneben nicht.',
    nichtMit: ['schmutz'],
  },
  {
    id: 'hoehe', name: 'Höhe und Gerüst',
    typen: ['über 20 m', 'über 30 m', 'über 50 m'],
    text: 'Ja, aber nur über 20 m Höhe und nur für diese Arbeiten: Gerüste auf- oder abbauen, auf Gerüsten mit weniger als 90 cm breitem Belag arbeiten, Türme richten und aufstellen, Schornsteine abbrechen, auf dem Betonkübel mit Personenaufnahme mitfahren, am Kran arbeiten, aus dem Arbeitskorb arbeiten. Gestaffelt über 20, 30 und 50 m. Nein für andere Arbeiten in der Höhe, zum Beispiel auf einem breiten Gerüst.',
    nichtMit: [],
  },
  {
    id: 'abbruch', name: 'Besonders gefährlicher Abbruch', typen: [],
    text: 'Ja, nur wenn der Abbruch vorher im Betrieb als besonders gefährlich eingestuft und der Zuschlag vereinbart wurde. Frag im Zweifel die Bauleitung. Nein für normalen Abbruch.',
    nichtMit: [],
  },
  {
    id: 'hitze', name: 'Hitze', typen: ['40 bis 50 °C', 'über 50 °C'],
    text: 'Ja: für die Stunden, in denen du in einem Raum arbeitest, in dem es 40 bis 50 °C oder mehr als 50 °C heiß ist, zum Beispiel an Öfen oder in Kesselhäusern. Nein für Sommerhitze im Freien.',
    nichtMit: [],
  },
  {
    id: 'schacht', name: 'Schacht und Tunnel', typen: ['Enger Schacht', 'Niedriger Tunnel', 'Tunnel unter 1,60 m lichte Höhe', 'Tunnel unter 1,20 m lichte Höhe', 'Unter Tage im Bergwerk'],
    text: 'Enger Schacht: Ja bei Unterfangungen in Schächten mit weniger als 4 m² Querschnitt und mehr als 3,60 m Tiefe. Niedriger Tunnel: Ja in Tunneln unter 2,20 m lichter Höhe beim Rohrvortrieb, im Schildvortrieb bis zum festen Ausbau, im Ausbau und in Felstunneln. Unter 1,60 m und unter 1,20 m gibt es mehr. Bergwerk: Ja für Arbeit unter Tage; dann gibt es den Schacht- oder Tunnelzuschlag nicht zusätzlich.',
    nichtMit: [],
  },
  {
    id: 'kanal', name: 'Kanalarbeit', typen: ['Enger, tiefer Graben ohne Maschine', 'Geschlossener Kanal'],
    text: 'Graben: Ja für Arbeit ohne Maschine in offenen Baugruben, wenn der Graben schmaler als 1 m und tiefer als 3,60 m ist. Kanal: Ja für Arbeit in geschlossenen Kanälen. Werker im Schacht- und Tunnelbau bekommen diesen Zuschlag nicht.',
    nichtMit: [],
  },
  {
    id: 'druck', name: 'Druckluft', typen: ['bis 100 kPa', 'bis 150 kPa', 'bis 200 kPa', 'bis 250 kPa', 'bis 300 kPa', 'bis 370 kPa'],
    text: 'Ja: für die Stunden, in denen du unter Überdruck arbeitest, zum Beispiel hinter einer Druckluftschleuse. Gestaffelt nach dem Überdruck. Nein für Arbeit mit Druckluftwerkzeugen bei normalem Luftdruck.',
    nichtMit: [],
  },
  {
    id: 'taucher', name: 'Taucherarbeit', typen: ['bis 5 m', 'bis 10 m', 'bis 15 m', 'bis 20 m', 'bis 25 m', 'bis 30 m'],
    text: 'Ja: nur für die Zeit, in der deine Tauchausrüstung geschlossen ist. Gestaffelt nach der Tauchtiefe. Bei mehr als 30 m oder bei Schlick, Moor, starker Strömung oder im Winter legt der Betrieb einen eigenen Zuschlag fest.',
    nichtMit: [],
  },
];

export const zuschlagArt = (id: string) => ZUSCHLAEGE.find((z) => z.id === id)!;

/** Arten, die neben dieser Art (mit diesem Typ) für dieselbe Zeit nicht gezahlt werden */
export function ausschluesse(art: string, typ?: string): string[] {
  const z = zuschlagArt(art);
  return [...z.nichtMit, ...((typ && z.nichtMitBeiTyp?.[typ]) || [])];
}

/** Paare von gewählten Arten, die sich für dieselbe Zeit ausschließen (jedes Paar einmal) */
export function konflikte(wahl: Record<string, { typ?: string }>): [string, string][] {
  const paare: [string, string][] = [];
  const ids = Object.keys(wahl);
  for (const a of ids) for (const b of ids) {
    if (a >= b) continue;
    if (ausschluesse(a, wahl[a].typ).includes(b) || ausschluesse(b, wahl[b].typ).includes(a)) paare.push([a, b]);
  }
  return paare;
}

/** Stunden, die nach der Prüfung gelten */
export function geltendeStunden(z: { stunden: number; entscheidung: string; stundenGekuerzt?: number }): number {
  if (z.entscheidung === 'weg') return 0;
  if (z.entscheidung === 'kurz') return z.stundenGekuerzt ?? z.stunden;
  return z.stunden;
}
