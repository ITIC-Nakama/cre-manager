/**
 * Lot 8 : formations ciblées dans le formulaire d'offre (obligatoires à la publication, « Toutes les formations »),
 * aperçu des destinataires, onglet Formations (statistiques, bascule des alertes, clic → offres, journal),
 * colonne et tri « Formation(s) », carte des entreprises et des offres, « Offres pour ma formation » côté étudiant.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JobOfferFormModal from '../shared/JobOfferFormModal';
import AlertRecipientsModal from './AlertRecipientsModal';
import FormationsTab from '../../pages/advisor/offres/components/FormationsTab';
import OffresTable from '../../pages/advisor/offres/components/OffresTable';
import CartePage from '../../pages/advisor/carte/CartePage';
import { useUserStore } from '../../store/UserStore';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const programs = [
    { id: 'pr-rh', level: 'BACHELOR', label: 'RH', displayName: 'Bachelor RH', slug: 'bach-rh' },
    { id: 'pr-cyber', level: 'BACHELOR', label: 'Cybersécurité / Cloud', displayName: 'Bachelor Cybersécurité / Cloud', slug: 'bach-cyber' },
    { id: 'pr-sio', level: 'BTS', label: 'SIO - 1A', displayName: 'BTS SIO - 1A', slug: 'bts-sio1a' },
];
const overview = [
    { id: 'pr-sio', level: 'BTS', formation: 'BTS SIO - 1A', slug: 'bts-sio1a', activeOffers: 4, newOffers7d: 2, activeStudents: 30, studentsUnderContract: 12, alertsEnabled: true, lastAlertAt: '2026-11-16T09:30:00Z' },
    { id: 'pr-rh', level: 'BACHELOR', formation: 'Bachelor RH', slug: 'bach-rh', activeOffers: 7, newOffers7d: 3, activeStudents: 25, studentsUnderContract: 9, alertsEnabled: false, lastAlertAt: null },
];
const offer = {
    id: 'o1', title: 'Chargé de recrutement', company: 'Acme', description: 'Postuler : rh@acme.fr', location: '75011 Paris',
    contractType: { id: 'c1', label: 'Alternance' }, sector: null, externalLink: null, active: true, createdAt: '2026-11-16T08:00:00Z',
    updatedAt: '', applicationCount: 0, source: 'MANUAL', companyLogoUrl: null, expiresAt: null, publishedAt: null,
    createdByFirstName: 'Nadia', createdByLastName: 'CRE', emailCandidature: 'rh@acme.fr', draft: false, targetPromotions: [],
    programs: [{ id: 'pr-rh', name: 'Bachelor RH', manual: true }, { id: 'pr-cyber', name: 'Bachelor Cybersécurité / Cloud', manual: false },
        { id: 'pr-sio', name: 'BTS SIO - 1A', manual: true }],
};

beforeEach(() => {
    localStorage.clear();
    useUserStore.setState({ user: { id: 'a1' } as never });
    api.get.mockReset();
    api.put.mockReset();
    api.get.mockImplementation((url: string) => {
        if (url === '/company-space/programs') return Promise.resolve({ data: { data: programs } });
        if (url.includes('promotions')) return Promise.resolve({ data: { data: [] } });
        if (url.includes('contract')) return Promise.resolve({ data: { data: [{ id: 'c1', label: 'Alternance' }] } });
        if (url === '/jobboard/formations') return Promise.resolve({ data: { data: overview } });
        if (url === '/jobboard/alerts/settings') return Promise.resolve({ data: { data: { enabled: true, windowMinutes: 10, dailyCap: 5 } } });
        if (url === '/jobboard/alerts/journal') return Promise.resolve({ data: { data: { totalElements: 1, totalPages: 1, content: [
            { offerId: 'o1', offerTitle: 'Chargé de recrutement', company: 'Acme', programId: 'pr-rh', formation: 'Bachelor RH',
                recipients: 12, sent: 10, failed: 1, grouped: 4, evening: 1, pending: 0, lastAt: '2026-11-16T10:00:00Z' }] } } });
        if (url === '/jobboard/offers/o1/alert-recipients') return Promise.resolve({ data: { data: {
            alertsEnabled: true, count: 2, disabledFormations: ['BTS SIO - 1A'], recipients: [
                { studentId: 's1', firstName: 'Lina', lastName: 'Martin', promotion: 'Bachelor RH 2026', formation: 'Bachelor RH', alreadyAlerted: true },
                { studentId: 's2', firstName: 'Yanis', lastName: 'Diallo', promotion: 'Bachelor RH 2026', formation: 'Bachelor RH', alreadyAlerted: false },
            ] } } });
        if (url === '/dashboard/offers/map') return Promise.resolve({ data: { data: { located: 5, notLocated: 1, companies: 3, departments: [
            { code: '75', name: 'Paris', ileDeFrance: true, count: 4, companies: 2 },
            { code: '69', name: 'Rhône', ileDeFrance: false, count: 1, companies: 1 },
        ] } } });
        if (url.startsWith('/dashboard/offers/map/departments/')) return Promise.resolve({ data: { data: [
            { company: 'Acme', offers: 2, items: [{ id: 'o1', title: 'Chargé de recrutement', contractType: 'Alternance', source: 'MANUAL', createdAt: null },
                { id: 'o2', title: 'Assistant RH', contractType: 'Stage', source: 'FRANCE_TRAVAIL', createdAt: null }] },
        ] } });
        if (url.includes('students/map')) return Promise.resolve({ data: { data: { located: 0, withoutPostalCode: 0, departments: [] } } });
        return Promise.resolve({ data: { data: [] } });
    });
});

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });

function wrap(ui: React.ReactElement, path = '/') {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter></QueryClientProvider>);
}

describe('Formulaire : formations ciblées', () => {
    async function openForm(onSave = vi.fn().mockResolvedValue(undefined)) {
        // Brouillon de l'équipe (type de contrat déjà choisi) : « Enregistrer comme brouillon » et « Publier ».
        wrap(<JobOfferFormModal offer={{ ...offer, draft: true, programs: [] } as never} onClose={vi.fn()} onSave={onSave} />);
        await flush();
        return onSave;
    }

    it('« Publier » sans formation : refusé ; une formation choisie : envoyée dans programIds', async () => {
        const onSave = await openForm();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Publier/ })); });
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByText(/Choisissez au moins une formation/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'RH' }));
        expect(screen.queryByText(/Choisissez au moins une formation/)).toBeNull();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Publier/ })); });
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ programIds: ['pr-rh'], allPrograms: undefined, draft: false }));
    });

    it('« Toutes les formations » : allPrograms=true, les puces disparaissent ; un brouillon peut s’en passer', async () => {
        const onSave = await openForm();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Enregistrer comme brouillon/ })); });
        expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ draft: true, programIds: [] }));

        fireEvent.click(screen.getByRole('checkbox', { name: 'Toutes les formations' }));
        expect(screen.queryByRole('button', { name: 'RH' })).toBeNull();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Publier/ })); });
        expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ allPrograms: true, programIds: undefined }));
    });
});

describe('Aperçu des destinataires', () => {
    it('nombre, liste, « Déjà prévenu », formations coupées ; une seule requête, aucun envoi', async () => {
        wrap(<AlertRecipientsModal offer={offer as never} onClose={vi.fn()} />);
        await flush();
        expect(screen.getByTestId('recipients-count').textContent).toMatch(/2 étudiant\(s\) recevront l’alerte/);
        expect(screen.getByText('Martin Lina')).toBeTruthy();
        expect(screen.getByText('Diallo Yanis')).toBeTruthy();
        expect(screen.getAllByText('Déjà prévenu')).toHaveLength(1);
        expect(screen.getByText(/Alertes coupées pour : BTS SIO - 1A/)).toBeTruthy();
        expect(api.get.mock.calls.filter(([u]) => String(u).includes('alert-recipients'))).toHaveLength(1);
        expect(api.post).not.toHaveBeenCalled();
    });
});

describe('Onglet Formations', () => {
    it('une ligne par formation avec ses chiffres, réglages, journal ; clic sur une formation → ses offres', async () => {
        const onShowOffers = vi.fn();
        wrap(<FormationsTab onShowOffers={onShowOffers} />);
        await flush();
        const row = screen.getByRole('button', { name: 'Bachelor RH' }).closest('tr') as HTMLElement;
        expect(within(row).getByText('7')).toBeTruthy();
        expect(within(row).getByText('25')).toBeTruthy();
        expect(within(row).getByText('9')).toBeTruthy();
        expect(screen.getByTestId('alerts-settings').textContent).toMatch(/sous 10 min, 5 e-mails/);
        expect(screen.getByText('Journal des alertes')).toBeTruthy();
        const journalRow = screen.getAllByText('Chargé de recrutement')[0].closest('tr') as HTMLElement;
        expect(within(journalRow).getByText('10')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Bachelor RH' }));
        expect(onShowOffers).toHaveBeenCalledWith('pr-rh');
    });

    it('bascule des alertes d’une formation : PUT puis ligne mise à jour', async () => {
        api.put.mockResolvedValue({ data: { data: { ...overview[1], alertsEnabled: true } } });
        wrap(<FormationsTab onShowOffers={vi.fn()} />);
        await flush();
        const toggle = screen.getByRole('switch', { name: 'Alertes pour Bachelor RH' }) as HTMLInputElement;
        expect(toggle.checked).toBe(false);
        await act(async () => { fireEvent.click(toggle); });
        await flush();
        expect(api.put).toHaveBeenCalledWith('/jobboard/formations/pr-rh/alerts', { enabled: true });
        expect((screen.getByRole('switch', { name: 'Alertes pour Bachelor RH' }) as HTMLInputElement).checked).toBe(true);
    });
});

describe('Liste des offres : colonne Formation(s)', () => {
    it('deux formations affichées puis « +1 », tri par formation, bouton « Destinataires de l’alerte »', () => {
        const onSortingChange = vi.fn();
        const onPreviewAlert = vi.fn();
        wrap(<OffresTable offers={[offer as never]} isLoading={false} hasNextPage={false} isFetchingNextPage={false} onLoadMore={vi.fn()}
            onView={vi.fn()} onEdit={vi.fn()} onViewApplicants={vi.fn()} onPreviewAlert={onPreviewAlert}
            sorting={[]} onSortingChange={onSortingChange} />);
        expect(screen.getByText('Bachelor RH')).toBeTruthy();
        expect(screen.getByText('+1')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Formation\(s\)/ }));
        expect(onSortingChange).toHaveBeenCalledWith([{ id: 'formations', desc: false }]);
        fireEvent.click(screen.getByRole('button', { name: 'Destinataires de l’alerte' }));
        expect(onPreviewAlert).toHaveBeenCalledWith(offer);
    });
});

describe('Carte des entreprises et des offres', () => {
    it('onglet « Entreprises et offres » : carte, résumé, détail d’un département (entreprises et offres)', async () => {
        wrap(<CartePage />, '/supervisor/carte?vue=offres');
        await flush();
        expect(screen.getByRole('tab', { name: /Entreprises et offres/ }).getAttribute('aria-selected')).toBe('true');
        expect(screen.getByTestId('offers-map-summary').textContent)
            .toMatch(/5 offre\(s\) localisée\(s\), dont 4 en Île-de-France · 3 entreprise\(s\) · 1 sans localisation/);
        fireEvent.click(screen.getByRole('button', { name: 'Paris (75) : 4 offre(s)' }));
        await flush();
        expect(api.get).toHaveBeenCalledWith('/dashboard/offers/map/departments/75', { params: { source: 'ALL' } });
        expect(screen.getByText('Acme')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Assistant RH' })).toBeTruthy();
        expect(screen.getByText(/Stage · France Travail/)).toBeTruthy();
    });

    it('filtre « Type de contrat » : la carte est redemandée avec ce filtre', async () => {
        wrap(<CartePage />, '/supervisor/carte?vue=offres');
        await flush();
        fireEvent.change(screen.getByLabelText('Type de contrat'), { target: { value: 'c1' } });
        await flush();
        expect(api.get).toHaveBeenCalledWith('/dashboard/offers/map', { params: { contractTypeId: 'c1', source: 'ALL' } });
    });

    it('onglet « Étudiants » par défaut', async () => {
        wrap(<CartePage />, '/supervisor/carte');
        await flush();
        expect(screen.getByRole('tab', { name: /Étudiants/ }).getAttribute('aria-selected')).toBe('true');
        expect(api.get).toHaveBeenCalledWith('/dashboard/students/map', { params: { contract: 'ALL' } });
    });
});
