export type TimeGreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** Periode de la journee pour un message d'accueil contextuel (ex: "Bonjour"/"Bonsoir") —
  * le soir/la nuit couvre aussi les tres petites heures (avant 5h), ou "Bonjour" sonnerait faux. */
export function getTimeGreetingPeriod(date: Date = new Date()): TimeGreetingPeriod {
    const hour = date.getHours();
    if (hour >= 18 || hour < 5) return 'evening';
    if (hour < 12) return 'morning';
    return 'afternoon';
}
