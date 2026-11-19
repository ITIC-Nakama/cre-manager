/**
 * Carte des étudiants (équipe) : carte de l'Île-de-France et autres départements avec leurs nombres, liste d'un
 * département (nom, formation, promotion, contrat oui / non), filtres (le bandeau côté étudiant est devenu le bandeau « adresse », lot 10).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CartePage from './CartePage';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const summary = {
    located: 4, withoutPostalCode: 2,
    departments: [
        { code: '93', name: 'Seine-Saint-Denis', ileDeFrance: true, count: 2 },
        { code: '75', name: 'Paris', ileDeFrance: true, count: 1 },
        { code: '69', name: 'Rhône', ileDeFrance: false, count: 1 },
    ],
};
const students = [
    { id: 's1', firstName: 'Nina', lastName: 'Carte', formation: 'Bachelor RH', promotion: 'Bachelor RH 2026', underContract: false },
    { id: 's2', firstName: 'Sami', lastName: 'Carte', formation: null, promotion: 'Bachelor RH 2026', underContract: true },
];

function wrap(ui: React.ReactElement) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
    api.get.mockReset();
    api.get.mockImplementation((url: string) => {
        if (url === '/dashboard/students/map') return Promise.resolve({ data: { data: summary } });
        if (url.startsWith('/dashboard/students/map/departments/')) return Promise.resolve({ data: { data: students } });
        return Promise.resolve({ data: { data: [] } });
    });
});

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

describe('Carte des étudiants', () => {
    it('Île-de-France en carte (8 départements, nombres), autres départements en liste, résumé', async () => {
        wrap(<CartePage />);
        await flush();
        expect(screen.getByRole('button', { name: 'Seine-Saint-Denis (93) : 2 étudiant(s)' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Val-d\'Oise (95) : 0 étudiant(s)' })).toBeTruthy();
        expect(screen.getAllByRole('button', { name: /\(\d+\) : \d+ étudiant/ })).toHaveLength(8);
        expect(screen.getByRole('button', { name: /Rhône\s*1/ })).toBeTruthy();
        expect(screen.getByText(/4 étudiant\(s\) localisé\(s\), dont 3 en Île-de-France · 2 sans code postal/)).toBeTruthy();
    });

    it('clic sur un département : liste avec nom, formation, promotion, contrat oui / non (une requête)', async () => {
        wrap(<CartePage />);
        await flush();
        fireEvent.click(screen.getByRole('button', { name: 'Seine-Saint-Denis (93) : 2 étudiant(s)' }));
        await flush();
        expect(api.get).toHaveBeenCalledWith('/dashboard/students/map/departments/93', { params: { contract: 'ALL' } });
        expect(screen.getByRole('link', { name: 'Carte Nina' }).getAttribute('href')).toBe('/supervisor/etudiants/s1');
        expect(screen.getByText('Bachelor RH')).toBeTruthy();
        expect(screen.getByText('Oui')).toBeTruthy();
        expect(screen.getByText('Non')).toBeTruthy();
        expect(api.get.mock.calls.filter(([u]) => String(u).startsWith('/dashboard/students/map/departments/'))).toHaveLength(1);
    });

    it('filtre « Sans contrat » : la carte est redemandée avec ce filtre', async () => {
        wrap(<CartePage />);
        await flush();
        fireEvent.change(screen.getByLabelText('Contrat'), { target: { value: 'WITHOUT' } });
        await flush();
        expect(api.get).toHaveBeenCalledWith('/dashboard/students/map', { params: { contract: 'WITHOUT' } });
    });
});
