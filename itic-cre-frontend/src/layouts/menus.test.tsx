/**
 * Lot 10 : menus de tous les rôles. (B) plus aucune entrée « Demandes d'aide » ni bouton flottant, plus de compteur
 * de demandes en arrière-plan, anciennes adresses redirigées vers la messagerie.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupervisorLayout from './SupervisorLayout';
import StudentLayout from './StudentLayout';
import { useUserStore } from '../store/UserStore';
import { Role } from '../types/models/Auth';
import { legacyRoutes, STAFF_LEGACY_REDIRECTS, STUDENT_LEGACY_REDIRECTS } from '../routes/legacyRedirects';

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

function asUser(role: Role) {
    useUserStore.setState({ user: { id: 'u1', firstName: 'Test', lastName: 'Menu', email: 'menu@example.test', role, mustChangePassword: false } as never });
}

beforeEach(() => {
    vi.clearAllMocks();
    // jsdom : pas de scrollTo sur les éléments (remise en haut de page à la navigation).
    if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
    api.get.mockImplementation((url: string) => Promise.resolve({ data: { data:
        url.includes('conversations') ? { badge: 0, mine: 0, unassigned: 0, total: 0 }
            : url.includes('new-count') ? { count: 0 }
                : url.includes('public/config') ? { companySpaceEnabled: false } : 0 } }));
});

const calledUrls = () => api.get.mock.calls.map((c) => String(c[0]));

describe('« Demandes d’aide » retirées de tous les menus', () => {
    it.each([Role.ADVISOR, Role.ADMIN])('équipe (%s) : ni entrée, ni lien, ni compteur en arrière-plan', async (role) => {
        asUser(role);
        renderAt('/supervisor/dashboard', <SupervisorLayout />);
        await flush();
        expect(screen.getAllByText('Conversations').length).toBeGreaterThan(0);
        expect(screen.queryByText(/Demandes d.aide/)).toBeNull();
        expect(document.querySelector('a[href="/supervisor/reclamations"]')).toBeNull();
        expect(calledUrls().some((u) => u.includes('reclamations'))).toBe(false);
    });

    it('étudiant : ni entrée, ni bouton flottant « Contacter l’équipe » ; la messagerie reste dans le menu', async () => {
        asUser(Role.STUDENT);
        renderAt('/student/dashboard', <StudentLayout />);
        await flush();
        expect(screen.getAllByText('Messages').length).toBeGreaterThan(0);
        expect(screen.queryByText(/Demandes d.aide/)).toBeNull();
        expect(screen.queryByRole('button', { name: /Contacter l.équipe/ })).toBeNull();
        expect(calledUrls().some((u) => u.includes('reclamations'))).toBe(false);
    });
});

describe('anciennes adresses des demandes d’aide', () => {
    it.each([
        ['/supervisor/reclamations', '/supervisor/conversations', STAFF_LEGACY_REDIRECTS],
        ['/student/reclamations', '/student/messages', STUDENT_LEGACY_REDIRECTS],
    ] as const)('%s → %s', (from, to, redirects) => {
        render(
            <MemoryRouter initialEntries={[from]}>
                <Routes>
                    {legacyRoutes(redirects)}
                    <Route path={to} element={<p>messagerie</p>} />
                </Routes>
            </MemoryRouter>,
        );
        expect(screen.getByText('messagerie')).toBeTruthy();
    });
});
