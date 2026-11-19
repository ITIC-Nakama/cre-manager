/**
 * Lot 11 : page Étudiants (données fictives).
 *   (D) tous les filtres de la barre ont le même déclencheur, et leur libellé indique le filtre actif ;
 *   (B) colonnes « sélection » et « Étudiant » figées, tableau qui défile dans sa carte, textes longs complets au survol ;
 *   (C) bouton « Colonnes » : masquer une colonne ne touche ni à la sélection ni aux actions groupées ;
 *   pas de régression de la sélection multiple, de « tous les résultats » ni de l'affectation groupée.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EtudiantsPage from './EtudiantsPage';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

// jsdom n'a pas d'IntersectionObserver (défilement infini) : aucun déclenchement pendant les tests.
class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

const flush = () => act(async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0)); });

function student(i: number, firstName: string, lastName: string, extra: Record<string, unknown> = {}) {
    return {
        id: `etu-${i}`, firstName, lastName, profilePicture: null, email: `${firstName}.${lastName}@example.test`.toLowerCase(),
        promotion: { id: 'p1', nom: 'Bachelor Développeur Concepteur d’Applications Web et Mobiles' }, formation: 'Bachelor Concepteur Développeur',
        advisor: { id: 'adv-1', firstName: 'Camille', lastName: 'MARTIN-ROUSSEAU' }, studyYear: 3, xpTotal: 120,
        grade: { nom: 'Explorateur', icone: '' }, lastActivity: null, isActive: true, accountActive: true, applicationCount: 2,
        staleApplicationCount: 0, hasCv: true, underContract: false, contractNeedsVerification: false, starRating: null, latestRating: 4,
        ...extra,
    };
}

const STUDENTS = [
    student(1, 'Marie-Charlotte', 'DUPONT-LEFEBVRE', { underContract: true }),
    student(2, 'Jean-Baptiste', 'DE LA FONTAINE-MOREAU'),
    student(3, 'Alice', 'CLOT-MENARD'),
];
const TOTAL = 45;

const PROGRAMS = [
    { id: 'f1', displayName: 'Bachelor Concepteur Développeur' },
    { id: 'f2', displayName: 'Mastère Expert en Cybersécurité' },
    { id: 'f3', displayName: 'BTS SIO' },
];

const ok = (data: unknown) => Promise.resolve({ data: { data } });

function renderPage(path = '/supervisor/etudiants') {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/supervisor/etudiants" element={<EtudiantsPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({ user: { id: 'admin-1', firstName: 'Admin', lastName: 'Essai', email: 'admin@example.test', role: Role.ADMIN, mustChangePassword: false } as never });
    api.get.mockImplementation((url: string) => {
        if (url === '/dashboard/students') return ok({ content: STUDENTS, totalElements: TOTAL, totalPages: 3, number: 0 });
        if (url === '/dashboard/students/all') return ok(Array.from({ length: TOTAL }, (_, i) => student(100 + i, `Prénom${i}`, `NOM${i}`)));
        if (url === '/advisors/all') return ok([
            { id: 'admin-1', firstName: 'Admin', lastName: 'Essai', role: 'ADMIN' },
            { id: 'adv-2', firstName: 'Lucie', lastName: 'BERNARD', role: 'ADVISOR' },
        ]);
        if (url === '/company-space/programs') return ok(PROGRAMS);
        return ok([]);
    });
    api.put.mockResolvedValue({ data: { data: null } });
});

const filterBar = () => screen.getByPlaceholderText(/Rechercher/).closest('div.flex-wrap') as HTMLElement;

describe('page Étudiants : filtres au même format', () => {
    it('statut, note, formations et panneau « Filtres » : même déclencheur', async () => {
        renderPage();
        await flush();
        const triggers = within(filterBar()).getAllByRole('button').filter((b) => b.hasAttribute('data-filter-trigger'));
        const labels = triggers.map((b) => b.textContent);
        expect(labels).toEqual(['Tous', 'Toutes les notes', 'Toutes les formations', 'Filtres']);
        // Même habillage (hors état actif), même largeur minimale sur les conteneurs.
        const classes = new Set(triggers.map((b) => b.className));
        expect(classes.size).toBe(1);
        for (const b of triggers) expect(b.closest('.min-w-48')).not.toBeNull();
        // Aucun filtre appliqué : pas d'état actif.
        expect(triggers.some((b) => b.hasAttribute('data-active'))).toBe(false);
    });

    it('formations : « Formations (2) » quand deux formations sont choisies, liste complète au survol ; recherche conservée', async () => {
        renderPage('/supervisor/etudiants?formations=f1,f2');
        await flush();
        const trigger = within(screen.getByTestId('formation-filter')).getByRole('button');
        expect(trigger.textContent).toBe('Formations (2)');
        expect(trigger.getAttribute('data-active')).toBe('true');
        expect(trigger.getAttribute('title')).toBe('Bachelor Concepteur Développeur, Mastère Expert en Cybersécurité');
        expect(trigger.getAttribute('aria-label')).toContain('Filtrer par formation');
        // Plus de pastilles sous le filtre (elles décalaient la barre).
        expect(within(screen.getByTestId('formation-filter')).queryAllByRole('button')).toHaveLength(1);
        // Choix multiple et recherche dans la liste : inchangés.
        fireEvent.click(trigger);
        const search = screen.getByPlaceholderText('Rechercher une formation…');
        fireEvent.change(search, { target: { value: 'BTS' } });
        expect(screen.getByRole('button', { name: /^BTS SIO/ })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /^Mastère Expert/ })).toBeNull();
    });

    it('une seule formation : son nom ; filtre de note appliqué : état actif', async () => {
        renderPage('/supervisor/etudiants?formations=f3');
        await flush();
        expect(within(screen.getByTestId('formation-filter')).getByRole('button').textContent).toBe('BTS SIO');
        const note = within(filterBar()).getByRole('button', { name: /Toutes les notes/ });
        fireEvent.click(note);
        fireEvent.click(screen.getByRole('button', { name: '4/5 et plus' }));
        await flush();
        const active = within(filterBar()).getByRole('button', { name: /4\/5 et plus/ });
        expect(active.getAttribute('data-active')).toBe('true');
    });
});

describe('page Étudiants : tableau lisible', () => {
    it('colonnes sélection et « Étudiant » figées à gauche, tableau qui défile dans sa carte, noms complets au survol', async () => {
        renderPage();
        await flush();
        const region = screen.getByRole('region', { name: 'Tableau des étudiants' });
        expect(region.className).toContain('overflow-auto');
        const header = within(region).getAllByRole('columnheader');
        expect(header[0].className).toContain('dt-sticky');
        expect(header[0].style.left).toBe('0px');
        expect(header[1].textContent).toContain('Étudiant');
        expect(header[1].className).toContain('dt-sticky-edge');
        expect(header[1].style.left).toBe('48px');
        // Pas de retour à la ligne dans les en-têtes ; nom long coupé visuellement mais complet (survol, lecteurs d'écran).
        for (const th of header) expect(th.className).toContain('whitespace-nowrap');
        const name = within(region).getByText('Marie-Charlotte DUPONT-LEFEBVRE');
        expect(name.getAttribute('title')).toBe('Marie-Charlotte DUPONT-LEFEBVRE');
        expect(name.className).toContain('truncate');
        const promo = within(region).getAllByText('Bachelor Développeur Concepteur d’Applications Web et Mobiles')[0];
        expect(promo.getAttribute('title')).toBe(promo.textContent);
        // Badge « Sous contrat » : texte toujours présent pour les lecteurs d'écran.
        expect(within(region).getByText('Sous contrat')).toBeTruthy();
    });

    it('conseiller : pas de colonne de sélection, la colonne « Étudiant » est figée au bord', async () => {
        useUserStore.setState({ user: { id: 'adv-1', firstName: 'Camille', lastName: 'MARTIN-ROUSSEAU', email: 'conseil@example.test', role: Role.ADVISOR, mustChangePassword: false } as never });
        renderPage();
        await flush();
        const header = within(screen.getByRole('region', { name: 'Tableau des étudiants' })).getAllByRole('columnheader');
        expect(header[0].textContent).toContain('Étudiant');
        expect(header[0].style.left).toBe('0px');
    });
});

describe('page Étudiants : sélection et actions groupées (pas de régression)', () => {
    it('sélection multiple, colonne masquée, puis affectation groupée des étudiants choisis', async () => {
        renderPage();
        await flush();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Sélectionner Marie-Charlotte DUPONT-LEFEBVRE' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Sélectionner Alice CLOT-MENARD' }));
        expect(screen.getByText('2 étudiants sélectionnés')).toBeTruthy();

        // Masquer une colonne ne touche pas à la sélection.
        fireEvent.click(screen.getByTestId('columns-menu-trigger'));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: /Formation/ }));
        expect(within(screen.getByRole('region', { name: 'Tableau des étudiants' })).queryByRole('columnheader', { name: /Formation/ })).toBeNull();
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(screen.getByText('2 étudiants sélectionnés')).toBeTruthy();

        // Affectation groupée : conseiller choisi, puis « Affecter ».
        fireEvent.click(screen.getByRole('button', { name: /Choisir un conseiller/ }));
        fireEvent.click(screen.getByRole('button', { name: /Lucie BERNARD/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Affecter' }));
        await flush();
        expect(api.put).toHaveBeenCalledWith('/advisors/adv-2/students', { studentIds: ['etu-1', 'etu-3'] });
    });

    it('« tout sélectionner » sur la page, puis « les 45 étudiants correspondant au filtre »', async () => {
        renderPage();
        await flush();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Sélectionner tous les étudiants affichés' }));
        expect(screen.getByText('3 étudiants sélectionnés')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Sélectionner les 45 étudiants/ }));
        await flush();
        expect(screen.getByText('45 étudiants sélectionnés')).toBeTruthy();
    });
});
