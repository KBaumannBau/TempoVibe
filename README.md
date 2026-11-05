# TempoVibe

Zeiterfassung für Mitarbeitende auf Montage: Stunden werden direkt am Handy erfasst – als installierbare Web-App (PWA) mit einer REST-API im Hintergrund.

> **Status:** Projekt-Setup. Noch kein Code im Repository – diese README beschreibt die Zielarchitektur und wird mit dem Projekt fortgeschrieben.

---

## Überblick

| Baustein | Aufgabe |
|---|---|
| **PWA (Frontend)** | Mobile Erfassung von Arbeitszeiten auf der Baustelle, installierbar auf dem Homescreen, für schwache Netzabdeckung ausgelegt |
| **REST-API (Backend)** | Validierung, Speicherung und Auswertung der Zeiteinträge; Anbindung an die Benutzerverwaltung |
| **Identity (Microsoft Entra ID)** | Single Sign-on mit den bestehenden Firmenkonten |
| **Hosting** | On-Prem auf einer lokalen VM, Betrieb durch die Systemadministration |

## Architektur

```
 ┌──────────────┐   HTTPS + Basic Auth    ┌──────────────────┐
 │  PWA (Handy) │ ──────────────────────▶ │  Reverse Proxy   │
 └──────┬───────┘                         └────────┬─────────┘
        │ Login (OIDC / PKCE)                      │
        ▼                                          ▼
 ┌──────────────┐   Entra-Token           ┌──────────────────┐
 │ Microsoft    │ ◀────────────────────── │    REST-API      │
 │ Entra ID     │   Validierung /         │ (Token-Exchange, │
 └──────────────┘   Token-Exchange        │  Fachlogik, DB)  │
                                          └──────────────────┘
```

### Sicherheitskonzept (mehrstufig)

1. **Basic Auth** am Eingang als erster Schutzwall – die Anwendung ist ohne Zugangsdaten nicht erreichbar.
2. **SSO über Microsoft Entra ID** – Anmeldung mit dem Firmenkonto (OIDC, Authorization Code Flow mit PKCE).
3. **Token-Exchange in der API** – das Entra-Token wird von der API geprüft und gegen ein eigenes, kurzlebiges API-Token getauscht. Die Fachlogik arbeitet ausschließlich mit diesem Token.

## Funktionsumfang (geplant)

- Arbeitszeiten erfassen (Beginn, Ende, Pausen) pro Tag und Einsatz
- Zuordnung zu Baustelle / Projekt
- Übersicht und Korrektur eigener Einträge
- Erfassung auch bei fehlender Verbindung, Synchronisation sobald wieder online
- Auswertung / Export für die Lohn- bzw. Projektabrechnung

## Tech-Stack

_Wird beim Aufsetzen festgelegt und hier ergänzt._

| Bereich | Technologie |
|---|---|
| Frontend | _offen_ |
| Backend | _offen_ (PHP) |
| Datenbank | _offen_ |
| Auth | Microsoft Entra ID (OIDC) |
| Deployment | VM On-Prem |

## Projektstruktur

_Folgt mit dem ersten Code._

## Lokale Entwicklung

### Voraussetzungen

- _offen_

### Setup

```bash
git clone https://github.com/KBaumannBau/TempoVibe.git
cd TempoVibe
# weitere Schritte folgen
```

### Konfiguration

Konfiguration erfolgt über Umgebungsvariablen. Geheimnisse (Client-Secrets, Basic-Auth-Zugangsdaten, Signaturschlüssel) gehören **nicht** ins Repository.

| Variable | Beschreibung |
|---|---|
| `ENTRA_TENANT_ID` | Tenant-ID in Microsoft Entra |
| `ENTRA_CLIENT_ID` | Client-ID der App-Registrierung |
| `ENTRA_CLIENT_SECRET` | Client-Secret (nur Backend) |
| `API_TOKEN_SECRET` | Schlüssel zum Signieren der API-Tokens |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | Zugangsdaten für den vorgeschalteten Schutz |

## Deployment

Betrieb auf einer lokalen VM. Ablauf, Reverse-Proxy-Konfiguration und Zertifikate werden mit der Systemadministration abgestimmt und hier dokumentiert.

## Offene Punkte

- [ ] Tech-Stack für Frontend, Backend und Datenbank festlegen
- [ ] App-Registrierung in Entra ID anlegen (Redirect-URIs, Scopes)
- [ ] Datenmodell für Zeiteinträge, Baustellen und Mitarbeitende
- [ ] Offline-Strategie und Konfliktbehandlung bei der Synchronisation
- [ ] Export-Format für die Abrechnung
- [ ] VM-Bereitstellung und Deployment-Prozess mit dem Betrieb klären
