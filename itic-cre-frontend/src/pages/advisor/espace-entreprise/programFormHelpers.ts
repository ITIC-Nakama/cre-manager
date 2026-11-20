/**
 * Lot 12 : calculs du formulaire « Formations de la CVthèque » (sans React, testés à part).
 * Nom proposé, adresse de la page, listes de rythmes et de dates de disponibilité, ressemblance promotion ↔ formation.
 */

export type Level = 'BTS' | 'BACHELOR' | 'MASTERE';

export const LEVEL_LABEL: Record<Level, string> = { BTS: 'BTS', BACHELOR: 'Bachelor', MASTERE: 'Mastère' };
const SLUG_PREFIX: Record<Level, string> = { BTS: 'bts', BACHELOR: 'bach', MASTERE: 'mast' };

/** Format de l'adresse de la page : minuscules sans accent, chiffres, tirets (comme le serveur). */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalize(text: string): string {
    return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function slugify(text: string): string {
    return normalize(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** « 1re année », « 2e année »… ; en Mastère, « M1 », « M2 ». Vide si toutes les années. */
export function yearLabel(level: Level, year: number): string {
    if (!year) return '';
    if (level === 'MASTERE' && year <= 2) return `M${year}`;
    return year === 1 ? '1re année' : `${year}e année`;
}

// Morceaux d'un nom qui désignent l'année (« 2A », « M1 », « 1re année ») : retirés pour garder le nom de la formation.
const YEAR_TOKEN = /^(\d\s*a|m\d|\d\s*(re|er|e|ère|ème)?\s*ann[ée]e|\d)$/i;

/** Nom de la formation sans l'année : « SIO - 2A - SLAM » → « SIO SLAM », « Cyber - M1 » → « Cyber ». */
export function baseName(label: string): string {
    const parts = label.split(/\s+[-—–]\s+|\s*—\s*/).map((p) => p.trim()).filter(Boolean);
    const kept = parts.filter((p) => !YEAR_TOKEN.test(p));
    return (kept.length ? kept : parts).join(' ').replace(/\s+/g, ' ').trim();
}

/** Nom proposé (sans le niveau, ajouté à l'affichage) : « SIO — 1re année ». */
export function proposeLabel(base: string, level: Level, year: number): string {
    const name = base.trim();
    const y = yearLabel(level, year);
    if (!name) return '';
    return y ? `${name} — ${y}` : name;
}

/** Nom affiché aux entreprises : le niveau puis le nom (« BTS SIO — 1re année »), comme le serveur. */
export function displayName(level: Level, label: string): string {
    return `${LEVEL_LABEL[level]} ${label.trim()}`.trim();
}

/** Adresse proposée à la création, unique : « bts-sio-1a », puis « bts-sio-1a-2 » si elle est prise. */
export function proposeSlug(level: Level, base: string, year: number, taken: Iterable<string>): string {
    const used = new Set(taken);
    const core = [SLUG_PREFIX[level], slugify(base), year ? `${year}a` : ''].filter(Boolean).join('-').slice(0, 56);
    let slug = core;
    for (let i = 2; used.has(slug); i++) slug = `${core}-${i}`;
    return slug;
}

// ─── Rythme de l'alternance ───────────────────────────────────────────────────────────────────────────────

export const COMMON_RHYTHMS = [
    '2 jours école / 3 jours entreprise',
    '3 jours école / 2 jours entreprise',
    '1 jour école / 4 jours entreprise',
    '1 semaine école / 3 semaines entreprise',
    '1 semaine école / 2 semaines entreprise',
    '2 semaines école / 2 semaines entreprise',
];

/** Valeurs courantes, puis celles déjà présentes en base (sans doublon, ordre alphabétique). */
export function rhythmOptions(existing: (string | null | undefined)[]): string[] {
    const known = new Set(COMMON_RHYTHMS.map(normalize));
    const extra = Array.from(new Set(existing.map((v) => (v ?? '').trim()).filter((v) => v && !known.has(normalize(v)))))
        .sort((a, b) => a.localeCompare(b, 'fr'));
    return [...COMMON_RHYTHMS, ...extra];
}

// ─── Disponible à partir de ───────────────────────────────────────────────────────────────────────────────

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const NOW_TEXT = 'Immédiatement';

export type Availability = { kind: 'none' } | { kind: 'now' } | { kind: 'month'; month: number; year: number } | { kind: 'other'; text: string };

export function formatAvailability(a: Availability): string {
    switch (a.kind) {
        case 'none': return '';
        case 'now': return NOW_TEXT;
        case 'month': return `Dès ${MONTHS[a.month]} ${a.year}`;
        case 'other': return a.text;
    }
}

/** Texte enregistré → choix du formulaire ; un texte libre ancien reste tel quel (« Autre… »). */
export function parseAvailability(text: string | null | undefined): Availability {
    const v = (text ?? '').trim();
    if (!v) return { kind: 'none' };
    if (normalize(v) === normalize(NOW_TEXT)) return { kind: 'now' };
    const m = /^d[èe]s\s+([a-zéû]+)\s+(\d{4})$/i.exec(v);
    if (m) {
        const month = MONTHS.map(normalize).indexOf(normalize(m[1]));
        if (month >= 0) return { kind: 'month', month, year: Number(m[2]) };
    }
    return { kind: 'other', text: v };
}

/** Mois proposés : du mois courant à 24 mois plus tard (« Septembre 2026 »). */
export function availabilityMonths(today = new Date()): { month: number; year: number; label: string }[] {
    const out = [];
    for (let i = 0; i < 24; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const label = MONTHS[d.getMonth()];
        out.push({ month: d.getMonth(), year: d.getFullYear(), label: `${label[0].toUpperCase()}${label.slice(1)} ${d.getFullYear()}` });
    }
    return out;
}

// ─── Promotions ──────────────────────────────────────────────────────────────────────────────────────────

const STOP = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'en', 'et', 'a', 'promo', 'promotion']);

function words(text: string): Set<string> {
    return new Set(normalize(text).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !/^\d{4}$/.test(w) && !STOP.has(w)));
}

/** Ressemblance entre un nom de promotion et une formation (mots communs, le niveau compte). 0 = rien en commun. */
export function similarity(promotionName: string, level: Level, programName: string): number {
    const promo = words(promotionName);
    const target = words(`${LEVEL_LABEL[level]} ${programName}`);
    let score = 0;
    target.forEach((w) => { if (promo.has(w)) score += 1; });
    return score;
}

/** Formation qui ressemble le plus à une promotion (bouton « Rattacher » du bandeau). */
export function bestProgramFor<P extends { level: string; label: string }>(promotionName: string, programs: P[]): P | undefined {
    let best: P | undefined;
    let bestScore = 0;
    for (const p of programs) {
        const s = similarity(promotionName, p.level as Level, baseName(p.label));
        if (s > bestScore) { best = p; bestScore = s; }
    }
    return best;
}
