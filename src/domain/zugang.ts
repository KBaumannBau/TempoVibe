// Zugang zur Handy-App: Registrierungsbrief mit Einmal-Passwort, eigenes Passwort, gemerktes Handy

import type { Person } from './types';

/** So lange gilt das Einmal-Passwort aus dem Brief */
export const BRIEF_TAGE = 14;
/** Demo: Einmal-Passwort im Musterbrief, gilt für jede Person ohne eigenen Brief */
export const DEMO_EINMAL = 'K7Q4-MX2P';
/** Demo: Passwort aller Personen, die noch kein eigenes festgelegt haben */
export const DEMO_PASSWORT = 'Baustelle-2026';

/** Einmal-Passwort ohne leicht verwechselbare Zeichen (kein 0/O, 1/I/L) */
export function einmalPasswort(): string {
  const z = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const buf = new Uint32Array(8);
  crypto.getRandomValues(buf);
  const s = Array.from(buf, (n) => z[n % z.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

const norm = (s: string) => s.trim().toUpperCase().replace(/[\s-]/g, '');

/** Passt das eingegebene Einmal-Passwort zum Brief dieser Person? */
export function einmalPasst(p: Person, eingabe: string, heute: string): 'ok' | 'falsch' | 'abgelaufen' {
  if (p.brief) {
    if (p.brief.gueltigBis < heute) return 'abgelaufen';
    return norm(eingabe) === norm(p.brief.passwort) ? 'ok' : 'falsch';
  }
  return norm(eingabe) === norm(DEMO_EINMAL) ? 'ok' : 'falsch';
}

export const passwortPasst = (p: Person, eingabe: string) => eingabe === (p.passwort ?? DEMO_PASSWORT);

/** Regeln für das eigene Passwort; liefert den Fehlertext (deutsch, wird übersetzt) oder '' */
export function passwortFehler(neu: string, verboten: string[] = []): string {
  if (neu.length < 8) return 'Mindestens 8 Zeichen.';
  if (!/[A-Za-zÄÖÜäöüß]/.test(neu) || !/\d/.test(neu)) return 'Mindestens ein Buchstabe und eine Ziffer.';
  if (verboten.some((v) => v && norm(v) === norm(neu))) return 'Bitte ein neues Passwort wählen, nicht das aus dem Brief oder das bisherige.';
  return '';
}
