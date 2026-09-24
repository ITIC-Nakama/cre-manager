const DAY_MS = 86_400_000;

/** Duree ecoulee depuis une date, dans l'unite la plus lisible : "45 jours", "3 mois", "2 ans" (localisee). */
export function formatElapsedSince(iso: string, locale: string, now: number = Date.now()): string {
  const days = Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY_MS));
  const [value, unit] =
    days < 60 ? [days, 'day'] : days < 730 ? [Math.floor(days / 30), 'month'] : [Math.floor(days / 365), 'year'];
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value);
}
