/**
 * Lot 9 : suppression définitive d'un compte (adresse e-mail à retaper, jamais son propre compte), offres de
 * l'étudiant (repli sur « Toutes les offres » si sa formation n'a encore aucune offre, liste affichée même si sa
 * formation ne se charge pas), offre déjà publiée réenregistrable sans formation, pas de nouvel essai sur un 4xx.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeleteAccountDialog from './DeleteAccountDialog';
import AdvisorTable from '../../pages/admin/components/AdvisorTable';
import JobOfferFormModal from './JobOfferFormModal';
import StudentOffresPage from '../../pages/student/offres/OffresPage';
import { retryUnlessClientErrorGlobal } from '../../queryClient';
import { useUserStore } from '../../store/UserStore';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });

function wrap(ui: React.ReactElement) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

const page = (content: unknown[]) => ({ data: { data: { content, totalElements: content.length, totalPages: 1, number: 0 } } });

beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    api.post.mockReset();
    useUserStore.setState({ user: { id: 'me', role: 'ADMIN' } as never });
});

describe('Suppression définitive d’un compte', () => {
    it('le bouton n’envoie rien tant que l’adresse e-mail n’est pas retapée, puis appelle l’API avec cette adresse', async () => {
        api.post.mockResolvedValue({ data: { data: { id: 'u1', role: 'ADVISOR' } } });
        const onClose = vi.fn();
        wrap(<DeleteAccountDialog account={{ id: 'u1', email: 'nadia@itic.fr', firstName: 'Nadia', lastName: 'B', kind: 'staff' }} onClose={onClose} />);
        await flush();
        expect(screen.getByText(/signés « Compte supprimé »/)).toBeTruthy();
        const confirm = screen.getByRole('button', { name: 'Supprimer définitivement' }) as HTMLButtonElement;
        expect(confirm.disabled).toBe(true);
        fireEvent.change(screen.getByPlaceholderText('nadia@itic.fr'), { target: { value: 'NADIA@itic.fr' } });
        expect(confirm.disabled).toBe(false);
        await act(async () => { fireEvent.click(confirm); });
        await flush();
        expect(api.post).toHaveBeenCalledWith('/auth/admin/users/u1/delete-permanently', { confirmEmail: 'nadia@itic.fr' });
        expect(onClose).toHaveBeenCalled();
    });

    it('étudiant : le message annonce l’effacement du CV et des candidatures', async () => {
        wrap(<DeleteAccountDialog account={{ id: 's1', email: 'lina@itic.fr', firstName: 'Lina', lastName: 'D', kind: 'student' }} onClose={vi.fn()} />);
        await flush();
        expect(screen.getByText(/avec son CV, ses fichiers, ses candidatures/)).toBeTruthy();
    });

    it('liste de l’équipe : bouton de suppression pour les autres comptes (actifs ou non, admins compris), jamais le sien', async () => {
        const person = (id: string, active: boolean, role: string) => ({
            id, firstName: 'P' + id, lastName: 'N', email: `${id}@itic.fr`, active, role: { name: role }, jobTitle: null,
            phoneNumber: null, profilePicture: null, studentCount: 0, createdAt: '2026-11-01T00:00:00Z',
        });
        const onDelete = vi.fn();
        wrap(<AdvisorTable isAdminsTab={false} currentList={[person('me', true, 'ADMIN'), person('a2', true, 'ADMIN'), person('c3', false, 'ADVISOR')] as never}
            isLoading={false} hasNextPage={false} isFetchingNextPage={false} onLoadMore={vi.fn()} sort={null}
            onSort={vi.fn()} onEdit={vi.fn()} onResetPassword={vi.fn()} onDeactivate={vi.fn()} onDelete={onDelete} onReactivate={vi.fn()} />);
        await flush();
        const buttons = screen.getAllByRole('button', { name: /Supprimer définitivement le compte de/ });
        expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
            'Supprimer définitivement le compte de Pa2 N', 'Supprimer définitivement le compte de Pc3 N']);
        fireEvent.click(buttons[0]);
        expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'a2' }));
    });
});

describe('Offres de l’étudiant au lendemain du déploiement', () => {
    it('aucune offre rattachée à sa formation : bascule sur « Toutes les offres » avec une explication', async () => {
        api.get.mockImplementation((url: string, cfg?: { params?: Record<string, unknown> }) => {
            if (url === '/me/formation') return Promise.resolve({ data: { data: { formation: 'Bachelor RH', pedagogyUrl: null } } });
            if (url === '/jobboard/offers') {
                return Promise.resolve(cfg?.params?.myFormation ? page([]) : page([{
                    id: 'o1', title: 'Chargé de recrutement', company: 'Acme', description: 'x', location: 'Paris',
                    contractType: { id: 'c1', label: 'Alternance' }, sector: null, externalLink: 'https://x', active: true,
                    createdAt: '2026-11-16T08:00:00Z', updatedAt: '', applicationCount: 0, source: 'MANUAL', companyLogoUrl: null,
                    expiresAt: null, publishedAt: null, createdByFirstName: null, createdByLastName: null, emailCandidature: null,
                }]));
            }
            return Promise.resolve({ data: { data: url.includes('recommendations') ? { hasFormation: true, offers: [] } : [] } });
        });
        wrap(<StudentOffresPage />);
        await flush();
        await flush();
        expect(screen.getByRole('button', { name: 'Toutes les offres' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByTestId('empty-mine-note')).toBeTruthy();
        expect(screen.getAllByText('Chargé de recrutement').length).toBeGreaterThan(0);
    });

    it('formation impossible à charger : la liste s’affiche quand même (aucun écran blanc)', async () => {
        api.get.mockImplementation((url: string) => {
            if (url === '/me/formation') return Promise.reject({ response: { status: 500 } });
            if (url === '/jobboard/offers') return Promise.resolve(page([]));
            return Promise.resolve({ data: { data: url.includes('recommendations') ? { hasFormation: false, offers: [] } : [] } });
        });
        wrap(<StudentOffresPage />);
        await flush();
        expect(api.get.mock.calls.filter(([u]) => u === '/me/formation')).toHaveLength(1);
        expect(api.get.mock.calls.some(([u]) => u === '/jobboard/offers')).toBe(true);
    });
});

describe('Équipe et réglages', () => {
    it('offre déjà publiée sans formation : réenregistrable (la formation n’est exigée qu’à la publication)', async () => {
        api.get.mockImplementation((url: string) => {
            if (url.includes('contract')) return Promise.resolve({ data: { data: [{ id: 'c1', label: 'Alternance' }] } });
            return Promise.resolve({ data: { data: [] } });
        });
        const onSave = vi.fn().mockResolvedValue(undefined);
        const offer = {
            id: 'o1', title: 'Chargé de recrutement', company: 'Acme', description: 'Postuler : rh@acme.fr', location: null,
            contractType: { id: 'c1', label: 'Alternance' }, sector: null, externalLink: null, active: true, createdAt: '', updatedAt: '',
            applicationCount: 0, source: 'MANUAL', companyLogoUrl: null, expiresAt: null, publishedAt: null,
            createdByFirstName: null, createdByLastName: null, emailCandidature: 'rh@acme.fr', draft: false, targetPromotions: [], programs: [],
        };
        wrap(<JobOfferFormModal offer={offer as never} onClose={vi.fn()} onSave={onSave} />);
        await flush();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' })); });
        expect(onSave).toHaveBeenCalled();
        expect(screen.queryByText(/Choisissez au moins une formation/)).toBeNull();
    });

    it('requêtes : jamais de nouvel essai sur une erreur 4xx, 3 au plus sur une erreur réseau ou 5xx', () => {
        expect(retryUnlessClientErrorGlobal(0, { response: { status: 404 } })).toBe(false);
        expect(retryUnlessClientErrorGlobal(0, { response: { status: 403 } })).toBe(false);
        expect(retryUnlessClientErrorGlobal(0, { response: { status: 500 } })).toBe(true);
        expect(retryUnlessClientErrorGlobal(3, { response: { status: 500 } })).toBe(false);
        expect(retryUnlessClientErrorGlobal(1, new Error('Network Error'))).toBe(true);
    });
});
