/**
 * Lot 12 : formulaire « Formations de la CVthèque » (données fictives). Conseiller : formulaire simple, adresse verrouillée,
 * pas de réglages avancés ; admin : réglages avancés repliés, déverrouillage confirmé ; nom proposé ; rythme et
 * disponibilité guidés ; alerte de promotion déjà rattachée ; validation avant envoi ; aperçu en direct ; bandeau.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProgramEditModal from './ProgramEditModal';
import OrphanPromotionsBanner from './OrphanPromotionsBanner';
import type { AdminProgram } from '../../../api-s/requests/CompanySpaceRequest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const flush = () => act(async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0)); });

function program(id: string, level: string, label: string, slug: string, extra: Partial<AdminProgram> = {}): AdminProgram {
    return {
        id, level, domain: 'Informatique', label, displayName: `${level === 'BTS' ? 'BTS' : level === 'MASTERE' ? 'Mastère' : 'Bachelor'} ${label}`,
        slug, slugConfirmed: true, legacyUrl: null, matchKeywords: 'bts sio', studyYear: 1, romeCodes: 'M1805', offerKeywords: 'web',
        pedagogyUrl: null, rhythm: '2 jours école / 3 jours entreprise', availability: 'Dès septembre 2026', visible: true, sortOrder: 0,
        manualPromotions: [], linkedPromotions: [], cvCount: 3, pageViews30d: 0, cvViews30d: 0, requests30d: 0, ...extra,
    } as AdminProgram;
}

const SIO1 = program('p1', 'BTS', 'SIO - 1A', 'bts-sio1a');
const SLAM = program('p2', 'BTS', 'SIO - 2A - SLAM', 'bts-sio2a-slam', { studyYear: 2 });
const CI = program('p3', 'BTS', 'CI - 1A', 'bts-ci1a', { domain: 'Commerce' });
const PROMOTIONS = [
    { id: 'pr1', name: 'BTS SIO 2025-2027', activeStudents: 24, programIds: ['p1', 'p2'] },
    { id: 'pr2', name: 'Bachelor RH 2025-2026', activeStudents: 12, programIds: [] },
    { id: 'pr3', name: 'BTS CI 2025-2027', activeStudents: 0, programIds: ['p3'] },
];

beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url: string) => Promise.resolve({ data: { data:
        url === '/company-space/programs' ? [SIO1, SLAM, CI]
            : url === '/company-space/promotions' ? PROMOTIONS
                : url === '/company-space/settings' ? { promotionIntro: 'Vous pouvez retrouver ici l’ensemble des CV de nos étudiants en {formation}.', warningText: null, homeTitle: 'Espace', contactTitle: 'Contact' }
                    : [] } }));
    api.put.mockResolvedValue({ data: {} });
    api.post.mockResolvedValue({ data: {} });
});

async function open(p: AdminProgram | null, isAdmin: boolean, presetPromotionId?: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ProgramEditModal program={p} isAdmin={isAdmin} presetPromotionId={presetPromotionId} onClose={() => {}} /></QueryClientProvider>);
    await flush();
}

const input = (name: RegExp | string) => screen.getByLabelText(name) as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement;

describe('formulaire « Formations de la CVthèque »', () => {
    it('conseiller : libellés explicites, aide sous les champs, pas de réglages avancés, adresse verrouillée', async () => {
        await open(SIO1, false);
        expect(screen.getByRole('heading', { name: 'Modifier la formation : BTS SIO - 1A' })).toBeTruthy();
        expect(screen.getByText('Nom de la formation affiché aux entreprises')).toBeTruthy();
        expect(screen.getByText('Ce que l’entreprise lit en titre de la page.')).toBeTruthy();
        expect(screen.getByText('Adresse de la page publique')).toBeTruthy();
        expect(screen.getByText('Lien de la page dans la CVthèque. Ne pas modifier : les liens déjà envoyés ne marcheraient plus.')).toBeTruthy();
        expect(screen.queryByTestId('advanced-settings')).toBeNull();
        expect(screen.queryByText(/codes ROME/)).toBeNull();
        expect(input('Adresse de la page publique').readOnly).toBe(true);
        expect(screen.queryByRole('button', { name: /Déverrouiller/ })).toBeNull();
        expect(screen.getByText('Verrouillée : seul un administrateur peut la changer.')).toBeTruthy();
    });

    it('conseiller : l’enregistrement n’envoie ni l’adresse ni les réglages avancés', async () => {
        await open(SIO1, false);
        fireEvent.click(saveButton());
        await flush();
        const [url, body] = api.put.mock.calls[0];
        expect(url).toBe('/company-space/programs/p1');
        expect(body).not.toHaveProperty('slug');
        for (const k of ['matchKeywords', 'romeCodes', 'offerKeywords', 'pedagogyUrl']) expect(body).not.toHaveProperty(k);
        expect(body).toMatchObject({ label: 'SIO - 1A', rhythm: '2 jours école / 3 jours entreprise', availability: 'Dès septembre 2026' });
    });

    it('admin : réglages avancés repliés par défaut, avec l’avertissement', async () => {
        await open(SIO1, true);
        const advanced = screen.getByTestId('advanced-settings') as HTMLDetailsElement;
        expect(advanced.open).toBe(false);
        expect(within(advanced).getByText('Réglages avancés (admin)')).toBeTruthy();
        expect(within(advanced).getByText(/Ces réglages font fonctionner les alertes/)).toBeTruthy();
        expect(within(advanced).getByText('Métiers visés (codes ROME)')).toBeTruthy();
    });

    it('admin : adresse déverrouillée seulement après confirmation, puis envoyée avec confirmSlugChange', async () => {
        await open(SIO1, true);
        expect(input('Adresse de la page publique').readOnly).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: /Déverrouiller/ }));
        expect(screen.getByText(/Les liens déjà envoyés aux entreprises/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Je comprends, déverrouiller' }));
        expect(input('Adresse de la page publique').readOnly).toBe(false);
        fireEvent.change(input('Adresse de la page publique'), { target: { value: 'bts-sio-1a' } });
        fireEvent.click(saveButton());
        await flush();
        expect(api.put.mock.calls[0][1]).toMatchObject({ slug: 'bts-sio-1a', confirmSlugChange: true });
    });

    it('adresse déjà prise ou mal écrite : message explicite, enregistrement impossible', async () => {
        await open(SIO1, true);
        fireEvent.click(screen.getByRole('button', { name: /Déverrouiller/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Je comprends, déverrouiller' }));
        fireEvent.change(input('Adresse de la page publique'), { target: { value: 'bts-ci1a' } });
        expect(screen.getByText('Cette adresse est déjà utilisée par la formation « BTS CI - 1A ».')).toBeTruthy();
        expect(saveButton().disabled).toBe(true);
        fireEvent.change(input('Adresse de la page publique'), { target: { value: 'bts_sio!' } });
        expect(screen.getByText(/Seulement des minuscules sans accent/)).toBeTruthy();
        expect(saveButton().disabled).toBe(true);
        fireEvent.change(input('Nom de la formation affiché aux entreprises'), { target: { value: '' } });
        expect(screen.getByText('Indiquez le nom de la formation.')).toBeTruthy();
        expect(screen.getByTestId('form-has-errors')).toBeTruthy();
    });

    it('ajout : nom et adresse proposés à partir du niveau, de la formation et de l’année ; « Revenir au nom proposé »', async () => {
        await open(null, true);
        expect(screen.getByRole('heading', { name: 'Ajouter une formation' })).toBeTruthy();
        fireEvent.change(input('Intitulé court de la formation'), { target: { value: 'NDRC' } });
        fireEvent.change(input('Année d’étude'), { target: { value: '2' } });
        expect(input('Nom de la formation affiché aux entreprises').value).toBe('NDRC — 2e année');
        expect(input('Adresse de la page publique').value).toBe('bts-ndrc-2a');
        expect(input('Adresse de la page publique').readOnly).toBe(false);
        fireEvent.change(input('Nom de la formation affiché aux entreprises'), { target: { value: 'NDRC alternance' } });
        expect(screen.getByTestId('proposed-name').textContent).toBe('Nom proposé : BTS NDRC — 2e année');
        fireEvent.click(screen.getByRole('button', { name: /Revenir au nom proposé/ }));
        expect(input('Nom de la formation affiché aux entreprises').value).toBe('NDRC — 2e année');
    });

    it('rythme et disponibilité : listes guidées, « Autre… » ouvre un champ libre, texte affiché « Dès … »', async () => {
        await open(SIO1, false);
        const rhythm = input('Rythme de l’alternance') as unknown as HTMLSelectElement;
        expect([...rhythm.options].map((o) => o.text)).toContain('1 semaine école / 3 semaines entreprise');
        fireEvent.change(rhythm, { target: { value: '__other__' } });
        fireEvent.change(input('Autre rythme'), { target: { value: '4 jours / 1 jour' } });
        const availability = input('Disponible à partir de') as unknown as HTMLSelectElement;
        expect(availability.value).toBe('2026-8');
        expect(screen.getByTestId('availability-text').textContent).toBe('Affiché : « Dès septembre 2026 »');
        fireEvent.change(availability, { target: { value: 'now' } });
        fireEvent.click(saveButton());
        await flush();
        expect(api.put.mock.calls[0][1]).toMatchObject({ rhythm: '4 jours / 1 jour', availability: 'Immédiatement' });
    });

    it('promotions : nombre d’étudiants, alerte « Déjà dans », recherche ; promotion du bandeau cochée d’office', async () => {
        await open(CI, false, 'pr2');
        const list = screen.getByTestId('promotion-list');
        const sio = within(list).getByText('BTS SIO 2025-2027').closest('label')!;
        expect(within(sio).getByText('24 étudiant(s)')).toBeTruthy();
        expect(within(sio).getByTestId('already-linked').textContent).toContain('Déjà dans : BTS SIO - 1A, BTS SIO - 2A - SLAM');
        const rh = within(list).getByText('Bachelor RH 2025-2026').closest('label')!;
        expect((within(rh).getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
        fireEvent.change(screen.getByLabelText('Rechercher une promotion…'), { target: { value: 'sio' } });
        expect(within(list).queryByText('Bachelor RH 2025-2026')).toBeNull();
    });

    it('aperçu en direct : en-tête et cartes de 2 étudiants fictifs, mis à jour pendant la saisie', async () => {
        await open(SIO1, false);
        const preview = screen.getByTestId('live-preview');
        expect(within(preview).getByRole('heading', { level: 1, hidden: true }).textContent).toBe('BTS SIO - 1A');
        expect(within(preview).getAllByText('Camille EXEMPLE', { exact: false }).length).toBeGreaterThan(0);
        fireEvent.change(input('Nom de la formation affiché aux entreprises'), { target: { value: 'SIO — Option cyber' } });
        expect(within(preview).getByRole('heading', { level: 1, hidden: true }).textContent).toBe('BTS SIO — Option cyber');
        expect(within(preview).getAllByText('Dès septembre 2026', { exact: false }).length).toBeGreaterThan(0);
    });
});

describe('bandeau des promotions orphelines', () => {
    it('compte les promotions sans formation (avec étudiants) et propose la formation la plus proche', () => {
        const onAttach = vi.fn();
        const rh = program('p9', 'BACHELOR', 'RH', 'bach-rh');
        render(<OrphanPromotionsBanner promotions={PROMOTIONS} programs={[SIO1, CI, rh]} onAttach={onAttach} />);
        expect(screen.getByText('1 promotion(s) ne sont rattachées à aucune formation (12 étudiants)')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Voir la liste/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Rattacher Bachelor RH 2025-2026 à Bachelor RH' }));
        expect(onAttach).toHaveBeenCalledWith(rh, 'pr2');
    });

    it('aucune promotion orpheline : pas de bandeau', () => {
        render(<OrphanPromotionsBanner promotions={PROMOTIONS.filter((p) => p.programIds.length)} programs={[SIO1]} onAttach={() => {}} />);
        expect(screen.queryByTestId('orphan-banner')).toBeNull();
    });
});
