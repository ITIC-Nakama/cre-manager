/**
 * Lot 10 (C) : Espace entreprise masqué (défaut) ou affiché. Menus de tous les rôles, vitrine publique
 * « Page non disponible », back-office ouvert aux admins par l'adresse directe (bandeau « masqué »), refusé aux
 * conseillers ; liste déroulante « Domaine » de la fiche formation, avec « Autre… ».
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupervisorLayout from '../../../layouts/SupervisorLayout';
import CompanySpaceGate from '../../public/entreprise/CompanySpaceGate';
import CompanySpacePage from './CompanySpacePage';
import DomainSelect from './DomainSelect';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
let enabled = false;

function mockApi() {
    api.get.mockImplementation((url: string) => Promise.resolve({ data: { data:
        url === '/public/config' ? { companySpaceEnabled: enabled }
            : url.includes('conversations') ? { badge: 0, mine: 0, unassigned: 0, total: 0 }
                : url.includes('new-count') ? { count: 0 }
                    : url.includes('/company-space/programs') ? [] : 0 } }));
}

function wrap(ui: React.ReactElement, path = '/') {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[path]}>
                <Routes><Route element={ui}><Route path="*" element={<p>page</p>} /></Route></Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

function wrapPlain(ui: React.ReactElement) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

function asUser(role: Role) {
    useUserStore.setState({ user: { id: 'u1', firstName: 'Test', lastName: 'Menu', email: 'menu@example.test', role, mustChangePassword: false } as never });
}

const urls = () => api.get.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
    vi.clearAllMocks();
    if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
    enabled = false;
    mockApi();
});

describe('interrupteur coupé (par défaut)', () => {
    it.each([Role.ADVISOR, Role.ADMIN])('menu de l’équipe (%s) : pas d’« Espace entreprise », pas de compteur des demandes', async (role) => {
        asUser(role);
        wrap(<SupervisorLayout />, '/supervisor/dashboard');
        await flush();
        expect(screen.queryByText('Espace entreprise')).toBeNull();
        expect(document.querySelector('a[href="/supervisor/espace-entreprise"]')).toBeNull();
        expect(urls().some((u) => u.includes('new-count'))).toBe(false);
    });

    it('vitrine publique : « Page non disponible »', async () => {
        wrapPlain(<CompanySpaceGate><p>annuaire des CV</p></CompanySpaceGate>);
        expect(await screen.findByText('Page non disponible')).toBeTruthy();
        expect(screen.queryByText('annuaire des CV')).toBeNull();
    });

    it('back-office par l’adresse directe : admin avec le bandeau « masqué » ; conseiller : page non disponible', async () => {
        asUser(Role.ADMIN);
        const admin = wrapPlain(<CompanySpacePage />);
        expect(await screen.findByText('Espace entreprise masqué : cette page n’apparaît dans aucun menu.')).toBeTruthy();
        expect(screen.getByRole('tab', { name: /Formations/ })).toBeTruthy();
        expect(screen.queryByText(/Ouvrir l’Espace entreprise/)).toBeNull();
        admin.unmount();

        asUser(Role.ADVISOR);
        wrapPlain(<CompanySpacePage />);
        expect(await screen.findByText('Page non disponible')).toBeTruthy();
        expect(screen.queryByRole('tab', { name: /Formations/ })).toBeNull();
    });
});

describe('interrupteur allumé : comme avant', () => {
    it('menu de l’équipe avec « Espace entreprise », vitrine affichée, pas de bandeau', async () => {
        enabled = true;
        asUser(Role.ADVISOR);
        const layout = wrap(<SupervisorLayout />, '/supervisor/dashboard');
        expect((await screen.findAllByText('Espace entreprise')).length).toBeGreaterThan(0);
        layout.unmount();

        const gate = wrapPlain(<CompanySpaceGate><p>annuaire des CV</p></CompanySpaceGate>);
        expect(await screen.findByText('annuaire des CV')).toBeTruthy();
        gate.unmount();

        wrapPlain(<CompanySpacePage />);
        expect(await screen.findByRole('tab', { name: /Formations/ })).toBeTruthy();
        expect(screen.queryByText(/Espace entreprise masqué/)).toBeNull();
    });
});

function DomainHarness({ initial }: { initial: string }) {
    const [value, setValue] = useState(initial);
    return (
        <>
            <DomainSelect value={value} domains={['Informatique', 'Commerce', 'Informatique', ' ', 'Ressources humaines']} onChange={setValue} />
            <p data-testid="value">{value}</p>
        </>
    );
}

describe('fiche formation : liste déroulante « Domaine »', () => {
    it('domaines déjà utilisés (sans doublon, triés) et « Autre… » qui ouvre un champ libre', () => {
        render(<DomainHarness initial="Commerce" />);
        const select = screen.getByLabelText('Domaine') as HTMLSelectElement;
        expect(Array.from(select.options).map((o) => o.textContent))
            .toEqual(['Choisir un domaine', 'Commerce', 'Informatique', 'Ressources humaines', 'Autre…']);
        expect(select.value).toBe('Commerce');
        fireEvent.change(select, { target: { value: 'Informatique' } });
        expect(screen.getByTestId('value').textContent).toBe('Informatique');

        fireEvent.change(select, { target: { value: '__other__' } });
        const free = screen.getByLabelText('Nouveau domaine') as HTMLInputElement;
        fireEvent.change(free, { target: { value: 'Santé' } });
        expect(screen.getByTestId('value').textContent).toBe('Santé');
    });

    it('un domaine absent de la liste s’affiche dans le champ libre, sans être perdu', () => {
        render(<DomainHarness initial="Hôtellerie" />);
        expect((screen.getByLabelText('Domaine') as HTMLSelectElement).value).toBe('__other__');
        expect((screen.getByLabelText('Nouveau domaine') as HTMLInputElement).value).toBe('Hôtellerie');
    });
});
