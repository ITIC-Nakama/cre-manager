/**
 * Matching : « Recommandées pour toi » (raisons au tutoiement, ouverture de l'offre) et « Candidats suggérés »
 * (raisons au vouvoiement, envoi de l'offre par la messagerie avec un message prérempli).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecommendedOffers from './RecommendedOffers';
import SuggestedCandidatesModal from './SuggestedCandidatesModal';
import { useUserStore } from '../../store/UserStore';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const reasons = [
    { type: 'FORMATION', values: ['recrutement'] },
    { type: 'CONTRACT', values: ['Alternance'] },
    { type: 'NEAR', values: ['93', 'Seine-Saint-Denis'] },
];

function wrap(ui: React.ReactElement) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    localStorage.clear();
    useUserStore.setState({ user: { id: 'staff1' } as never });
});

describe('Matching', () => {
    it('« Recommandées pour toi » : « Pourquoi : … » au tutoiement, clic = ouverture de l’offre ; rien sans recommandation', async () => {
        api.get.mockResolvedValue({ data: { data: { hasFormation: true, offers: [
            { id: 'o1', title: 'Chargé de recrutement', company: 'Acme', location: '93 - BOBIGNY', contractType: 'Alternance', publishedAt: null, score: 14, reasons },
        ] } } });
        const onOpen = vi.fn();
        const { unmount } = wrap(<RecommendedOffers onOpen={onOpen} />);
        await flush();
        expect(screen.getByText('Recommandées pour toi')).toBeTruthy();
        expect(screen.getByText(/proche de ta formation \(recrutement\) · en alternance · près de chez toi \(Seine-Saint-Denis\)/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Chargé de recrutement/ }));
        expect(onOpen).toHaveBeenCalledWith('o1');
        unmount();

        api.get.mockResolvedValue({ data: { data: { hasFormation: false, offers: [] } } });
        wrap(<RecommendedOffers onOpen={onOpen} />);
        await flush();
        expect(screen.queryByText('Recommandées pour toi')).toBeNull();
    });

    it('« Candidats suggérés » : score, raisons au vouvoiement, envoi de l’offre préremplie dans la conversation', async () => {
        api.get.mockResolvedValue({ data: { data: [
            { studentId: 's1', firstName: 'Nina', lastName: 'Martin', promotion: 'Bachelor RH 2026', formation: 'Bachelor RH', department: '93', score: 14, reasons },
        ] } });
        api.post.mockResolvedValue({ data: {} });
        const offer = { id: 'o1', title: 'Chargé de recrutement', company: 'Acme' } as never;
        wrap(<SuggestedCandidatesModal offer={offer} onClose={() => {}} />);
        await flush();
        expect(api.get).toHaveBeenCalledWith('/jobboard/offers/o1/suggested-candidates');
        expect(screen.getByText('14')).toBeTruthy();
        expect(screen.getByText(/proche de sa formation \(recrutement\) · en alternance · dans son département \(Seine-Saint-Denis\)/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Envoyer l’offre/ }));
        const box = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(box.value).toContain('Bonjour Nina, cette offre pourrait t’intéresser : « Chargé de recrutement » chez Acme');
        expect(box.value).toContain('/student/offres?offre=o1');
        const send = screen.getAllByRole('button').find((b) => /Envoyer/.test(b.textContent ?? '') && !/l’offre/.test(b.textContent ?? ''));
        await act(async () => { fireEvent.click(send!); });
        await flush();
        expect(api.post).toHaveBeenCalledWith('/dashboard/students/s1/notify', { message: expect.stringContaining('?offre=o1') });
    });
});
