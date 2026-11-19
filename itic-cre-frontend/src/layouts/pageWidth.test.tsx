/**
 * Lot 11 (A) : largeur du contenu par page. Pleine largeur (plafond 1 920 px) pour les pages à tableau de l'équipe,
 * largeur habituelle (1 280 px) partout ailleurs, y compris côté étudiant.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupervisorLayout from './SupervisorLayout';
import StudentLayout from './StudentLayout';
import { pageWidthFor } from './pageWidth';
import { useUserStore } from '../store/UserStore';
import { Role } from '../types/models/Auth';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

function renderAt(path: string, ui: React.ReactElement) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route element={ui}><Route path="*" element={<p>page</p>} /></Route>
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

const contentWidth = () => document.querySelector('[data-page-width]');

beforeEach(() => {
    vi.clearAllMocks();
    if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
    api.get.mockImplementation((url: string) => Promise.resolve({ data: { data:
        url.includes('conversations') ? { badge: 0, mine: 0, unassigned: 0, total: 0 }
            : url.includes('new-count') ? { count: 0 }
                : url.includes('public/config') ? { companySpaceEnabled: false } : 0 } }));
});

describe('largeur des pages', () => {
    it.each([
        '/supervisor/etudiants',
        '/supervisor/etudiants/0b6f2c1e-1111-4a4a-9c9c-000000000001',
        '/supervisor/candidatures',
        '/supervisor/offres',
        '/supervisor/cv',
        '/admin/conseillers',
        '/admin/promotions',
        '/admin/promotions/42',
        '/admin/audit',
    ])('%s : pleine largeur', (path) => {
        expect(pageWidthFor(path)).toBe('wide');
    });

    it.each([
        '/supervisor/dashboard',
        '/supervisor/parametres',
        '/supervisor/conversations',
        '/supervisor/offres/categories',
        '/supervisor/offres/synchronisation-externe',
        '/student/dashboard',
        '/student/candidatures',
        '/student/offres',
    ])('%s : largeur habituelle', (path) => {
        expect(pageWidthFor(path)).toBe('default');
    });

    it('gabarit équipe : la page Étudiants occupe toute la largeur (plafond 1 920 px), l’accueil garde 1 280 px', async () => {
        useUserStore.setState({ user: { id: 'u1', firstName: 'Test', lastName: 'Largeur', email: 'largeur@example.test', role: Role.ADMIN, mustChangePassword: false } as never });
        const first = renderAt('/supervisor/etudiants', <SupervisorLayout />);
        await flush();
        expect(contentWidth()?.getAttribute('data-page-width')).toBe('wide');
        expect(contentWidth()?.className).toContain('max-w-[1920px]');
        expect(contentWidth()?.className).not.toContain('max-w-screen-xl');
        first.unmount();

        renderAt('/supervisor/dashboard', <SupervisorLayout />);
        await flush();
        expect(contentWidth()?.getAttribute('data-page-width')).toBe('default');
        expect(contentWidth()?.className).toContain('max-w-screen-xl');
    });

    it('gabarit étudiant : « Mes candidatures » (grille de cartes) garde la largeur habituelle', async () => {
        useUserStore.setState({ user: { id: 'u2', firstName: 'Test', lastName: 'Étudiant', email: 'etudiant@example.test', role: Role.STUDENT, mustChangePassword: false } as never });
        renderAt('/student/candidatures', <StudentLayout />);
        await flush();
        expect(contentWidth()?.getAttribute('data-page-width')).toBe('default');
    });
});
