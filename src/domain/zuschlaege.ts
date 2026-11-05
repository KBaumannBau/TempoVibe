// Erschwerniszuschläge nach § 6 BRTV Bau, gruppiert wie im Tarifvertrag.
// Grundlage war die frei verfügbare Fassung von 2014: vor dem Echtbetrieb
// bitte von der Lohnbuchhaltung mit der aktuellen Fassung abgleichen.
// Beträge in Euro zeigt die App bewusst nicht an.

export interface ZuschlagArt {
  id: string;
  name: string;
  typen: string[];
  text: string;
  /** schließt diese Arten für dieselbe Zeit aus */
  nichtMit: string[];
  oben?: boolean;
}

export const ZUSCHLAEGE: ZuschlagArt[] = [
  {
    id: 'atem', name: 'Staub und Atemschutz', oben: true,
    typen: ['Filtrierende Halbmaske (FFP)', 'Halbmaske mit Wechselfilter', 'Vollmaske mit Wechselfilter', 'Schlauch- oder Pressluftgerät'],
    text: 'Für die Stunden, in denen ein Atemschutzgerät getragen wird: filtrierende Halbmaske (FFP, aber nicht die einfache „Hundeschnauze“), Halb- oder Vollmaske mit Wechselfilter, Schlauch- oder Pressluftgerät. Staub allein ohne Maske gibt keinen Zuschlag. Nicht zusammen mit Schutzanzug oder Schmutzarbeit für dieselbe Zeit.',
    nichtMit: ['schutz', 'schmutz'],
  },
  {
    id: 'schmutz', name: 'Schmutzarbeit', oben: true,
    typen: ['Außergewöhnlich schmutzig', 'Abort- oder Kläranlage mit Schmutzwasser'],
    text: 'Für Arbeiten, die deutlich schmutziger sind als sonst im Fach üblich, oder Arbeiten mit Schmutzwasser in Abort- und Kläranlagen. Gibt es nicht zusätzlich, wenn für dieselbe Zeit schon Atemschutz, Schutzanzug oder Wasserarbeit anfällt.',
    nichtMit: ['atem', 'schutz', 'wasser'],
  },
  {
    id: 'erschuett', name: 'Erschütterung', oben: true,
    typen: ['Bohr- oder Abbruchhammer ab 13 kg', 'Baumaschine ohne Schwingungsdämpfung', 'Höchstdruck-Wasserstrahl ab 500 bar'],
    text: 'Für Arbeit mit handgeführten Bohr- und Schlaghämmern ab 13 kg, die nicht als schwingungsgedämpft gekennzeichnet sind, für Fahren oder Mitfahren auf ungedämpften Baumaschinen und für Höchstdruck-Wasserstrahlen ab 500 bar und über 30 l/min.',
    nichtMit: [],
  },
  {
    id: 'schutz', name: 'Schutzkleidung',
    typen: ['Einweg-Schutzanzug, luftdicht', 'Chemikalien- oder Kontaminationsschutzanzug', 'Schutzanzug mit Gesichts- und Atemschutz, Hitze- oder Schallschutzanzug'],
    text: 'Für die Stunden in einem luftdichten Einweg-Schutzanzug, einem Chemikalien- oder Kontaminationsschutzanzug, einem Hitze- oder Schallschutzanzug. Daneben gibt es keinen Atemschutz-Zuschlag.',
    nichtMit: ['atem', 'schmutz'],
  },
  {
    id: 'wasser', name: 'Wasserarbeit',
    typen: ['Schaftstiefel', 'Wat- oder Kanalhose', 'Wat- oder Taucheranzug ohne Helm'],
    text: 'Wenn bei der Arbeit Schaftstiefel, eine Wat- oder Kanalhose oder ein Wat- oder Taucheranzug ohne Helm getragen werden muss.',
    nichtMit: ['schmutz'],
  },
  {
    id: 'hoehe', name: 'Höhe und Gerüst',
    typen: ['über 20 m', 'über 30 m', 'über 50 m'],
    text: 'Erst ab über 20 m Höhe: Gerüst auf- und abbauen, Arbeit auf Gerüsten mit Belag unter 90 cm Breite, aus dem Arbeitskorb, Türme aufstellen, Schornsteine abbrechen, Mitfahren am Betonkübel mit Personenaufnahme. Gestaffelt über 20, 30 und 50 m.',
    nichtMit: [],
  },
  {
    id: 'abbruch', name: 'Besonders gefährlicher Abbruch', typen: [],
    text: 'Für Abbrucharbeiten, die besonders gefährlich sind. Das legt die Bauleitung fest, die Höhe wird im Betrieb vereinbart.',
    nichtMit: [],
  },
  {
    id: 'hitze', name: 'Hitze', typen: ['40 bis 50 °C', 'über 50 °C'],
    text: 'Für Arbeit in Räumen mit 40 bis 50 °C oder mit mehr als 50 °C.',
    nichtMit: [],
  },
  {
    id: 'schacht', name: 'Schacht und Tunnel', typen: ['Enger Schacht', 'Niedriger Tunnel', 'Unter Tage im Bergwerk'],
    text: 'Unterfangungen in engen, tiefen Schächten (unter 4 m² Querschnitt, über 3,60 m tief) oder in niedrigen Tunneln (unter 2,20 m lichte Höhe) und Arbeit unter Tage im Bergwerk.',
    nichtMit: [],
  },
  {
    id: 'kanal', name: 'Kanalarbeit', typen: ['Enger, tiefer Graben ohne Maschine', 'Geschlossener Kanal'],
    text: 'Handarbeit ohne Maschine in Gräben unter 1 m breit und über 3,60 m tief, oder Arbeit in geschlossenen Kanälen.',
    nichtMit: [],
  },
  {
    id: 'druck', name: 'Druckluft', typen: [],
    text: 'Für Arbeit unter Überdruck, zum Beispiel hinter einer Druckluftschleuse. Gestaffelt nach dem Überdruck.',
    nichtMit: [],
  },
  {
    id: 'taucher', name: 'Taucherarbeit', typen: [],
    text: 'Für die Zeit, in der die Tauchausrüstung geschlossen ist. Gestaffelt nach der Tauchtiefe.',
    nichtMit: [],
  },
];

export const zuschlagArt = (id: string) => ZUSCHLAEGE.find((z) => z.id === id)!;

/** Stunden, die nach der Prüfung gelten */
export function geltendeStunden(z: { stunden: number; entscheidung: string; stundenGekuerzt?: number }): number {
  if (z.entscheidung === 'weg') return 0;
  if (z.entscheidung === 'kurz') return z.stundenGekuerzt ?? z.stunden;
  return z.stunden;
}
