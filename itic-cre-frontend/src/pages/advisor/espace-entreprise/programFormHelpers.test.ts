import { describe, expect, it } from 'vitest';
import {
    availabilityMonths, baseName, bestProgramFor, displayName, formatAvailability, parseAvailability, proposeLabel,
    proposeSlug, rhythmOptions, COMMON_RHYTHMS, similarity, slugify,
} from './programFormHelpers';

describe('formulaire des formations : calculs (lot 12)', () => {
    it('nom proposé à partir du niveau, de la formation et de l’année', () => {
        expect(proposeLabel('SIO', 'BTS', 1)).toBe('SIO — 1re année');
        expect(proposeLabel('SIO', 'BTS', 2)).toBe('SIO — 2e année');
        expect(proposeLabel('Cybersécurité', 'MASTERE', 1)).toBe('Cybersécurité — M1');
        expect(proposeLabel('RH', 'BACHELOR', 0)).toBe('RH');
        expect(displayName('BTS', proposeLabel('SIO', 'BTS', 1))).toBe('BTS SIO — 1re année');
        expect(proposeLabel('  ', 'BTS', 1)).toBe('');
    });

    it('intitulé court retrouvé dans un nom existant (sans l’année)', () => {
        expect(baseName('SIO - 1A')).toBe('SIO');
        expect(baseName('SIO - 2A - SLAM')).toBe('SIO SLAM');
        expect(baseName('Cyber - M1')).toBe('Cyber');
        expect(baseName('Cybersécurité / Cloud')).toBe('Cybersécurité / Cloud');
        expect(baseName('SIO — 1re année')).toBe('SIO');
    });

    it('adresse proposée : minuscules, tirets, unique', () => {
        expect(slugify('Développeur Full Stack')).toBe('developpeur-full-stack');
        expect(proposeSlug('BTS', 'SIO', 1, [])).toBe('bts-sio-1a');
        expect(proposeSlug('MASTERE', 'Cybersécurité', 2, [])).toBe('mast-cybersecurite-2a');
        expect(proposeSlug('BTS', 'SIO', 1, ['bts-sio-1a', 'bts-sio-1a-2'])).toBe('bts-sio-1a-3');
        expect(proposeSlug('BACHELOR', 'RH', 0, [])).toBe('bach-rh');
    });

    it('rythmes : valeurs courantes puis valeurs déjà en base, sans doublon', () => {
        const options = rhythmOptions(['2 jours école / 3 jours entreprise', '4 jours entreprise / 1 jour école', null, '  ']);
        expect(options.slice(0, COMMON_RHYTHMS.length)).toEqual(COMMON_RHYTHMS);
        expect(options).toContain('4 jours entreprise / 1 jour école');
        expect(options.filter((o) => o === '2 jours école / 3 jours entreprise')).toHaveLength(1);
    });

    it('disponibilité : mois et année → « Dès septembre 2026 », « Immédiatement », ancien texte libre conservé', () => {
        expect(formatAvailability({ kind: 'month', month: 8, year: 2026 })).toBe('Dès septembre 2026');
        expect(formatAvailability({ kind: 'now' })).toBe('Immédiatement');
        expect(parseAvailability('Dès septembre 2026')).toEqual({ kind: 'month', month: 8, year: 2026 });
        expect(parseAvailability('dès Février 2027')).toEqual({ kind: 'month', month: 1, year: 2027 });
        expect(parseAvailability('Immédiatement')).toEqual({ kind: 'now' });
        expect(parseAvailability('Rentrée prochaine')).toEqual({ kind: 'other', text: 'Rentrée prochaine' });
        expect(parseAvailability('')).toEqual({ kind: 'none' });
        const months = availabilityMonths(new Date(2026, 10, 20));
        expect(months[0].label).toBe('Novembre 2026');
        expect(months).toHaveLength(24);
        expect(months.some((m) => m.label === 'Septembre 2027')).toBe(true);
    });

    it('ressemblance promotion ↔ formation : sert au tri et au bouton « Rattacher »', () => {
        expect(similarity('BTS SIO 2025-2027', 'BTS', 'SIO')).toBe(2);
        expect(similarity('Bachelor RH 2025-2026', 'BTS', 'SIO')).toBe(0);
        const programs = [
            { level: 'BTS', label: 'SIO - 1A', displayName: 'BTS SIO - 1A' },
            { level: 'BACHELOR', label: 'RH', displayName: 'Bachelor RH' },
        ];
        expect(bestProgramFor('Bachelor RH alternance 2026', programs)?.displayName).toBe('Bachelor RH');
        expect(bestProgramFor('Licence pro inconnue', programs)).toBeUndefined();
    });
});
