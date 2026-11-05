// Einfache Strich-Icons (24er Raster), wie im Entwurf V2

type P = { size?: number };
const S = ({ size = 22, children, sw = 2 }: P & { children: React.ReactNode; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const IUhr = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>;
export const IKalender = (p: P) => <S {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></S>;
export const IBalken = (p: P) => <S {...p}><path d="M4 19V5M10 19v-8M16 19V9M22 19H2" /></S>;
export const IDokument = (p: P) => <S {...p}><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></S>;
export const IMenue = (p: P) => <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>;
export const IHaus = (p: P) => <S {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></S>;
export const IHaken = (p: P & { sw?: number }) => <S {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>;
export const ILeute = (p: P) => <S {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.5a3.5 3.5 0 010 7M18 14.3c2 .8 3.5 2.8 3.5 5.7" /></S>;
export const ISonne = (p: P) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></S>;
export const IWelt = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></S>;
export const IFrage = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.5M12 17v.5" /></S>;
export const IInfo = (p: P) => <S size={p.size ?? 18} sw={2.2}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.5" /></S>;
export const IZurueck = (p: P) => <S size={p.size ?? 20} sw={2.5}><path d="M15 5l-7 7 7 7" /></S>;
export const IWeiter = (p: P) => <S size={p.size ?? 18} sw={2.5}><path d="M9 5l7 7-7 7" /></S>;
export const IRunter = (p: P) => <S size={p.size ?? 20} sw={2.5}><path d="M6 9l6 6 6-6" /></S>;
export const IPlay = ({ size = 34 }: P) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" /></svg>;
export const IPause = ({ size = 30 }: P) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></svg>;
export const IStop = ({ size = 28 }: P) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5.5" y="5.5" width="13" height="13" rx="2" /></svg>;
export const IHandyWeg = (p: P) => <S size={p.size ?? 40} sw={2.2}><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M4 4l16 16" /></S>;
export const IOrt = (p: P) => <S {...p}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></S>;
