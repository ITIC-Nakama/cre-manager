/**
 * Profil étudiant : alertes « nouvelle offre pour ta formation » (lot 8), « Offres ciblées du soir » et « Récapitulatif
 * du lundi », activés par défaut, modifiables un par un.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmailPreferencesCard from './EmailPreferencesCard';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

beforeEach(() => {
    api.get.mockReset();
    api.put.mockReset();
    api.get.mockResolvedValue({ data: { data: { targetedOffers: true, weeklyDigest: true, instantOffers: true, instantOffersAvailable: true } } });
    api.put.mockImplementation((_url: string, body: object) =>
        Promise.resolve({ data: { data: { targetedOffers: true, weeklyDigest: true, instantOffers: true, instantOffersAvailable: true, ...body } } }));
});

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

function renderCard() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><EmailPreferencesCard /></QueryClientProvider>);
}

describe('E-mails d’offres de l’étudiant', () => {
    it('trois interrupteurs, cochés par défaut', async () => {
        renderCard();
        await flush();
        const switches = screen.getAllByRole('switch') as HTMLInputElement[];
        expect(switches).toHaveLength(3);
        expect(switches.every((s) => s.checked)).toBe(true);
        expect(screen.getByText('Récapitulatif du lundi')).toBeTruthy();
        expect(screen.getByText('Alertes « nouvelle offre pour ta formation »')).toBeTruthy();
    });

    it('couper les alertes instantanées n’envoie que ce choix', async () => {
        renderCard();
        await flush();
        fireEvent.click(screen.getAllByRole('switch')[0]);
        await flush();
        expect(api.put).toHaveBeenCalledWith('/me/email-preferences', { instantOffers: false });
    });

    it('couper le récapitulatif du lundi n’envoie que ce choix', async () => {
        renderCard();
        await flush();
        fireEvent.click(screen.getAllByRole('switch')[2]);
        await flush();
        expect(api.put).toHaveBeenCalledWith('/me/email-preferences', { weeklyDigest: false });
        expect((screen.getAllByRole('switch')[2] as HTMLInputElement).checked).toBe(false);
        expect((screen.getAllByRole('switch')[1] as HTMLInputElement).checked).toBe(true);
    });

    it('alertes coupées sur le serveur : leur interrupteur n’est pas affiché (lot 9)', async () => {
        api.get.mockResolvedValue({ data: { data: { targetedOffers: true, weeklyDigest: true, instantOffers: true, instantOffersAvailable: false } } });
        renderCard();
        await flush();
        expect(screen.getAllByRole('switch')).toHaveLength(2);
        expect(screen.queryByText('Alertes « nouvelle offre pour ta formation »')).toBeNull();
    });
});
