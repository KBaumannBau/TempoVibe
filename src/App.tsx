import type { ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { startVon } from './components/Rahmen';
import { PC_NAV, darfPc, pcStart } from './components/Pc';
import { DatenProvider, useDaten } from './domain/store';
import type { Rolle } from './domain/types';
import { Anmeldung } from './screens/Anmeldung';
import { Registrierung, Sperre } from './screens/Zugang';
import { BaustelleWaehlen, Heute, Standort, Vergessen } from './screens/ma/Stempeln';
import { Fahrt, Gesendet, Korrektur, TagPruefen, Zuschlaege } from './screens/ma/Tag';
import { Abgemeldet, Antraege, Einteilung, Geraete, Konto, Krank, Mehr, Pin, Urlaub, Woche } from './screens/ma/Rest';
import { Arbeitsbefreiung, AusweisSichtung, BetriebsurlaubWahl, Datenschutz, Faq, Hilfe, Intro, KrankRueckmeldung, Mitteilungen, NachweisNachreichen } from './screens/ma/Extra';
import { NuHeute, NuMehr, NuNachweise, NuStunden } from './screens/nu/Nu';
import { PFreigabe, PFreigegeben, PHeute, PKorrektur, PTag, PVorschlag } from './screens/polier/Freigabe';
import { PAusfall, PAuswertung, PHelfer, PKolonne, PKosten, PMehr, PNachtragen, POhneHandy, PPinBestaetigen } from './screens/polier/Kolonne';
import {
  BAntrag, BBaustelle, BBaustellen, BFreigabe, BGegenzeichnen, BHeute, BMehr, BMeineZeit, BNachtrag, BTag, BUrlaub, BZurueck,
} from './screens/bau/Bauleitung';
import { PcLogin } from './screens/pc/Login';
import { PcNachtstunden, PcStunden } from './screens/pc/Stunden';
import { PcAbwesenheiten, PcBetriebsurlaub, PcMehrstunden, PcMitarbeiter } from './screens/pc/Personal';
import { PcArchiv, PcBaustellen, PcProjektkosten } from './screens/pc/Baustellen';
import { PcDisposition } from './screens/pc/Disposition';
import { PcAuswertungNu, PcNu } from './screens/pc/Nu';
import { PcAuswertungBaustelle, PcAuswertungMitarbeiter } from './screens/pc/Auswertung';
import {
  PcAdmin, PcBl, PcBlAntraege, PcBlFreigabe, PcBlGegenzeichnen, PcBlWidersprueche, PcGl, PcObl, PcPolier, PcPolierEinteilung, PcPolierFreigabe, PcPolierHelfer,
} from './screens/pc/Leitung';

/** Nur angemeldet und mit aktivem Gerät; optional nur für bestimmte Rollen */
function Geschuetzt({ rollen, children }: { rollen?: Rolle[]; children: ReactNode }) {
  const { d, ich } = useDaten();
  if (!ich) return <Navigate to="/" replace />;
  const geraet = d.geraete.find((g) => g.personId === ich.id && g.diesesHandy);
  if (geraet && !geraet.aktiv) return <Navigate to="/abgemeldet" replace />;
  if (rollen && !rollen.includes(ich.rolle)) return <Navigate to={startVon(ich.rolle)} replace />;
  return <>{children}</>;
}

/** PC-Seiten: angemeldet am PC und die Rolle darf die Seite sehen */
function PcGeschuetzt({ pfad, children }: { pfad: string; children: ReactNode }) {
  const { ich } = useDaten();
  if (!ich || !darfPc(ich.rolle)) return <Navigate to="/pc" replace />;
  const punkt = PC_NAV.find((p) => p.to === pfad);
  if (punkt && !punkt.rollen.includes(ich.rolle)) return <Navigate to={pcStart(ich.rolle)} replace />;
  return <>{children}</>;
}

const P: Rolle[] = ['polier'];
const B: Rolle[] = ['bauleitung'];
const NU: Rolle[] = ['nu'];

const routen: [string, ReactNode, Rolle[]?][] = [
  ['/ma/heute', <Heute />], ['/ma/standort', <Standort />], ['/ma/baustelle', <BaustelleWaehlen />], ['/ma/vergessen', <Vergessen />],
  ['/ma/tag/:datum', <TagPruefen />], ['/ma/tag/:datum/zuschlaege', <Zuschlaege />], ['/ma/tag/:datum/fahrt', <Fahrt />],
  ['/ma/gesendet/:datum', <Gesendet />], ['/ma/korrektur/:tagId', <Korrektur />],
  ['/ma/einteilung', <Einteilung />], ['/ma/woche', <Woche />], ['/ma/konto', <Konto />], ['/ma/antraege', <Antraege />],
  ['/ma/urlaub', <Urlaub />], ['/ma/krank', <Krank />], ['/ma/mehr', <Mehr />], ['/ma/pin', <Pin />], ['/ma/geraete', <Geraete />],
  ['/ma/mitteilungen', <Mitteilungen />], ['/ma/betriebsurlaub', <BetriebsurlaubWahl />], ['/ma/arbeitsbefreiung', <Arbeitsbefreiung />],
  ['/ma/nachweis/:id', <NachweisNachreichen />], ['/ma/krank/:id', <KrankRueckmeldung />], ['/ma/ausweis', <AusweisSichtung />],

  ['/nu/heute', <NuHeute />, NU], ['/nu/stunden', <NuStunden />, NU], ['/nu/nachweise', <NuNachweise />, NU], ['/nu/mehr', <NuMehr />, NU],

  ['/p/heute', <PHeute />, P], ['/p/freigabe', <PFreigabe />, P], ['/p/tag/:id', <PTag />, P], ['/p/tag/:id/korrektur', <PKorrektur />, P],
  ['/p/vorschlag', <PVorschlag />, P], ['/p/freigegeben', <PFreigegeben />, P], ['/p/ohne-handy', <POhneHandy />, P],
  ['/p/ohne-handy/pin/:pid/:datum', <PPinBestaetigen />, P], ['/p/nachtragen', <PNachtragen />, P], ['/p/helfer', <PHelfer />, P],
  ['/p/ausfall', <PAusfall />, P], ['/p/kolonne', <PKolonne />, P], ['/p/auswertung', <PAuswertung />, P], ['/p/kosten/:id', <PKosten />, P],
  ['/p/mehr', <PMehr />, P],

  ['/b/heute', <BHeute />, B], ['/b/freigabe', <BFreigabe />, B], ['/b/tag/:id', <BTag />, B], ['/b/tag/:id/zurueck', <BZurueck />, B],
  ['/b/gegenzeichnen', <BGegenzeichnen />, B], ['/b/urlaub', <BUrlaub />, B], ['/b/antrag/:id', <BAntrag />, B],
  ['/b/meine-zeit', <BMeineZeit />, B], ['/b/baustellen', <BBaustellen />, B], ['/b/baustelle/:id', <BBaustelle />, B],
  ['/b/kosten/:id', <PKosten />, B], ['/b/nachtrag/:id', <BNachtrag />, B], ['/b/mehr', <BMehr />, B],
];

const pcRouten: [string, ReactNode][] = [
  ['/pc/stunden', <PcStunden />], ['/pc/nachtstunden', <PcNachtstunden />], ['/pc/mitarbeiter', <PcMitarbeiter />], ['/pc/mehrstunden', <PcMehrstunden />],
  ['/pc/abwesenheiten', <PcAbwesenheiten />], ['/pc/betriebsurlaub', <PcBetriebsurlaub />],
  ['/pc/baustellen', <PcBaustellen />], ['/pc/archiv', <PcArchiv />], ['/pc/projektkosten', <PcProjektkosten />], ['/pc/disposition', <PcDisposition />],
  ['/pc/nu', <PcNu />], ['/pc/auswertung/baustelle', <PcAuswertungBaustelle />], ['/pc/auswertung/mitarbeiter', <PcAuswertungMitarbeiter />], ['/pc/auswertung/nu', <PcAuswertungNu />],
  ['/pc/gl', <PcGl />], ['/pc/admin', <PcAdmin />], ['/pc/obl', <PcObl />],
  ['/pc/polier', <PcPolier />], ['/pc/polier/freigabe', <PcPolierFreigabe />], ['/pc/polier/einteilung', <PcPolierEinteilung />], ['/pc/polier/helfer', <PcPolierHelfer />],
  ['/pc/bl', <PcBl />], ['/pc/bl/freigabe', <PcBlFreigabe />], ['/pc/bl/gegenzeichnen', <PcBlGegenzeichnen />], ['/pc/bl/widersprueche', <PcBlWidersprueche />], ['/pc/bl/antraege', <PcBlAntraege />],
];

export function App() {
  return (
    <DatenProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Anmeldung />} />
          <Route path="/abgemeldet" element={<Abgemeldet />} />
          <Route path="/registrierung" element={<Registrierung />} />
          <Route path="/sperre" element={<Sperre />} />
          <Route path="/hilfe" element={<Hilfe />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/intro" element={<Intro />} />
          <Route path="/pc" element={<PcLogin />} />
          {routen.map(([pfad, el, rollen]) => <Route key={pfad} path={pfad} element={<Geschuetzt rollen={rollen}>{el}</Geschuetzt>} />)}
          {pcRouten.map(([pfad, el]) => <Route key={pfad} path={pfad} element={<PcGeschuetzt pfad={pfad}>{el}</PcGeschuetzt>} />)}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </DatenProvider>
  );
}
