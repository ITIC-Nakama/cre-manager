/** « Ma fiche formation » : lien vers la page du site pédagogique (nouvel onglet), masqué sans page. */
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyFormationButton from './MyFormationButton';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

function renderButton() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><MyFormationButton /></QueryClientProvider>);
}

describe('Ma fiche formation', () => {
    it('ouvre la page de la formation dans un nouvel onglet ; rien sans page', async () => {
        api.get.mockResolvedValue({ data: { data: { formation: 'BTS CG - 1A',
            pedagogyUrl: 'https://malekedine.github.io/itic-pedagogie/businessschool/bts/cg.html' } } });
        const { unmount } = renderButton();
        await flush();
        const link = screen.getByRole('link', { name: /Ma fiche formation/ });
        expect(link.getAttribute('href')).toBe('https://malekedine.github.io/itic-pedagogie/businessschool/bts/cg.html');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toContain('noopener');
        unmount();

        api.get.mockResolvedValue({ data: { data: { formation: 'BTS TP RH', pedagogyUrl: null } } });
        renderButton();
        await flush();
        expect(screen.queryByRole('link', { name: /Ma fiche formation/ })).toBeNull();
    });
});
