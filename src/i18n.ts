// Sprachen der Handy-App (Mitarbeiter, Nachunternehmer, Registrierung, Hilfe).
// Schlüssel ist der deutsche Text. Fehlt eine Übersetzung, erscheint Deutsch.
// PC-Seiten sowie die Seiten von Polier und Bauleitung bleiben deutsch.
// Rechtstexte: maßgeblich ist die deutsche Fassung.
import pl from './i18n/pl.json';
import ro from './i18n/ro.json';
import hr from './i18n/hr.json';
import en from './i18n/en.json';
import fr from './i18n/fr.json';
import it from './i18n/it.json';

export type Sprache = 'de' | 'pl' | 'ro' | 'hr' | 'en' | 'fr' | 'it';
export const SPRACHEN: { code: Sprache; name: string }[] = [
  { code: 'de', name: 'Deutsch' }, { code: 'pl', name: 'Polski' }, { code: 'ro', name: 'Română' },
  { code: 'hr', name: 'Hrvatski / Srpski / Bosanski' }, { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' }, { code: 'it', name: 'Italiano' },
];
const WOERTER: Record<string, Record<string, string>> = { pl, ro, hr, en, fr, it };
const SCHLUESSEL = 'stundenerfassung-sprache';

export function gespeicherteSprache(): Sprache {
  try {
    const s = localStorage.getItem(SCHLUESSEL) as Sprache | null;
    return s && SPRACHEN.some((x) => x.code === s) ? s : 'de';
  } catch { return 'de'; }
}
/** PC-Seiten und die Handy-Seiten von Polier (#/p/) und Bauleitung (#/b/) sind immer deutsch */
export const nurDeutsch = () => typeof location !== 'undefined' && /^#\/(pc|p|b)(\/|$)/.test(location.hash);

/** Sprache, mit der diese Seite geladen wurde (PC, Polier, Bauleitung immer Deutsch) */
export const sprache: Sprache = nurDeutsch() ? 'de' : gespeicherteSprache();
if (typeof document !== 'undefined') document.documentElement.lang = sprache;

/** Text übersetzen; {0}, {1} … werden durch die Werte ersetzt */
export function tx(s: string, ...werte: unknown[]): string {
  const v = sprache === 'de' ? s : WOERTER[sprache]?.[s] || s;
  return werte.length ? v.replace(/\{(\d+)\}/g, (_, i) => String(werte[Number(i)] ?? '')) : v;
}

/** Sprache wechseln: speichern und neu laden, damit alle Texte neu aufgebaut werden */
export function spracheWaehlen(s: Sprache) {
  try { localStorage.setItem(SCHLUESSEL, s); } catch { /* ohne Speicher bleibt Deutsch */ }
  // kurz warten, damit die Auswahl auch bei der Person gespeichert ist
  setTimeout(() => location.reload(), 80);
}

/** Passt die geladene Sprache nicht zur Seite, neu laden */
export function spracheAbgleichen(ziel?: Sprache) {
  const soll = nurDeutsch() ? 'de' : ziel ?? gespeicherteSprache();
  if (ziel && !nurDeutsch()) try { localStorage.setItem(SCHLUESSEL, ziel); } catch { /* egal */ }
  if (soll !== sprache) location.reload();
}

// Wechsel zwischen übersetzten und deutschen Seiten: neu laden
if (typeof window !== 'undefined') {
  const amDeutsch = nurDeutsch();
  window.addEventListener('hashchange', () => {
    if (nurDeutsch() !== amDeutsch && gespeicherteSprache() !== 'de') location.reload();
  });
}
