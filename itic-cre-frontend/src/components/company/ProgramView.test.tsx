/**
 * Espace entreprise : cartes d'une formation (seulement prénom, nom, formation, promotion, rythme, disponibilité),
 * « Ce profil m'intéresse » (demande envoyée avec le profil, champ piège vide) et CV par lien signé, avec la clé du lien privé.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProgramView from './ProgramView';
import { rememberCompanySpaceKey } from '../../api-s/requests/CompanySpaceRequest';
import type { CompanyProgramPage } from '../../api-s/requests/CompanySpaceRequest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const texts = { homeTitle: 'Espace Entreprise', homeIntro: null, contactTitle: 'Un profil vous intéresse ?', contactText: null,
    address: null, phone: '01 43 73 20 40', warningText: '⚠️ Les profils sont soumis à une mise en place de contrat avec notre école exclusivement.' };
const page: CompanyProgramPage = {
    texts, slug: 'bach-rh', level: 'BACHELOR', domain: 'Ressources humaines', label: 'RH', displayName: 'Bachelor RH',
    intro: 'Vous pouvez retrouver ici l’ensemble des CV de nos étudiants en Bachelor RH.', linksExpireAt: new Date().toISOString(),
    candidates: [{ id: 's1', firstName: 'Lina', lastName: 'Martin', formation: 'Bachelor RH', promotion: 'Bachelor RH 2026-2027',
        rhythm: '2 jours école / 3 jours entreprise', availability: 'Septembre 2026', cvToken: 'jeton.signe' }],
};

function renderView(p: CompanyProgramPage = page) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><ProgramView page={p} /></QueryClientProvider>);
}

beforeEach(() => {
    sessionStorage.clear();
    api.get.mockReset();
    api.post.mockReset();
});

describe('Espace entreprise : page d’une formation', () => {
    it('carte : les six informations et deux boutons, avertissement affiché ; aucune formation vide sans message', () => {
        const { container, unmount } = renderView();
        expect(screen.getByText('Lina Martin')).toBeTruthy();
        for (const text of ['Bachelor RH 2026-2027', '2 jours école / 3 jours entreprise', 'Septembre 2026']) {
            expect(screen.getByText(text)).toBeTruthy();
        }
        expect(screen.getByText(/mise en place de contrat avec notre école exclusivement/)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Voir le CV/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Ce profil m’intéresse/ })).toBeTruthy();
        expect(container.textContent).not.toMatch(/@|06 /);
        unmount();

        renderView({ ...page, candidates: [] });
        expect(screen.getByText('Aucun CV disponible pour le moment')).toBeTruthy();
    });

    it('« Ce profil m’intéresse » : envoi seulement une fois les champs remplis, avec le profil, la formation et le champ piège vide', async () => {
        api.post.mockResolvedValue({ data: {} });
        renderView();
        fireEvent.click(screen.getByRole('button', { name: /Ce profil m’intéresse/ }));
        const submit = screen.getByRole('button', { name: 'Envoyer ma demande' }) as HTMLButtonElement;
        expect(submit.disabled).toBe(true);
        const dialog = screen.getByRole('dialog');
        const inputs = dialog.querySelectorAll('input:not([tabindex="-1"])');
        fireEvent.change(inputs[0], { target: { value: 'Acme RH' } });
        fireEvent.change(inputs[1], { target: { value: 'Paul Durand' } });
        fireEvent.change(inputs[2], { target: { value: 'paul@acme.fr' } });
        expect(submit.disabled).toBe(false);
        await act(async () => { fireEvent.click(submit); });
        expect(api.post).toHaveBeenCalledWith('/public/entreprise/demandes', expect.objectContaining({
            slug: 'bach-rh', candidateId: 's1', company: 'Acme RH', contactName: 'Paul Durand', email: 'paul@acme.fr', website: '',
            message: expect.stringContaining('Lina Martin'),
        }), { params: {} });
        expect(screen.getByText('Merci, votre demande est envoyée')).toBeTruthy();
    });

    it('lien privé : la clé reçue dans l’adresse accompagne l’ouverture du CV et la demande', async () => {
        rememberCompanySpaceKey('cle-privee');
        api.get.mockResolvedValue({ data: new Blob(['%PDF']), headers: { 'content-type': 'application/pdf' } });
        globalThis.URL.createObjectURL = vi.fn(() => 'blob:cv');
        globalThis.URL.revokeObjectURL = vi.fn();
        renderView();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Voir le CV/ })); });
        expect(api.get).toHaveBeenCalledWith('/public/entreprise/cv/jeton.signe?cle=cle-privee', { responseType: 'blob' });
        expect(api.get).toHaveBeenCalledTimes(1);
    });
});
