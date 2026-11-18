/**
 * Fenêtre d'offre (équipe) : « Enregistrer comme brouillon » sans moyen de postuler, « Publier » qui l'exige,
 * « Promotions ciblées », et confirmation avant de fermer un formulaire modifié.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JobOfferFormModal from './JobOfferFormModal';
import { useUserStore } from '../../store/UserStore';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

beforeEach(() => {
  localStorage.clear();
  useUserStore.setState({ user: { id: 'a1' } as never });
  api.get.mockImplementation((url: string) => {
    if (url.includes('promotions')) return Promise.resolve({ data: { data: [{ id: 'p1', name: 'BTS SIO 1A' }, { id: 'p2', name: 'Bachelor RH' }] } });
    if (url.includes('contract')) return Promise.resolve({ data: { data: [{ id: 'c1', label: 'Alternance' }] } });
    return Promise.resolve({ data: { data: [] } });
  });
});

async function open(onSave = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><JobOfferFormModal onClose={onClose} onSave={onSave} /></QueryClientProvider>);
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  const inputs = screen.getAllByRole('textbox');
  fireEvent.change(inputs[0], { target: { value: 'Alternance développeur' } });
  fireEvent.change(inputs[1], { target: { value: 'Acme' } });
  fireEvent.change(inputs[2], { target: { value: 'Poste en alternance, sans contact pour l’instant' } });
  return { onSave, onClose };
}

describe('Offre : brouillon, publication, promotions ciblées', () => {
  it('brouillon existant : « Enregistrer comme brouillon » accepté sans lien ni adresse, avec draft=true et les promotions ciblées', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const offer = {
      id: 'o1', title: 'Alternance développeur', company: 'Acme', description: 'À compléter', location: null,
      contractType: { id: 'c1', label: 'Alternance' }, sector: null, externalLink: null, active: true, createdAt: '', updatedAt: '',
      applicationCount: 0, source: 'MANUAL', companyLogoUrl: null, expiresAt: null, publishedAt: null,
      createdByFirstName: null, createdByLastName: null, emailCandidature: null, draft: true, targetPromotions: [],
    };
    render(<QueryClientProvider client={client}><JobOfferFormModal offer={offer as never} onClose={vi.fn()} onSave={onSave} /></QueryClientProvider>);
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(screen.getByText(/Brouillon : cette offre n’est pas visible des étudiants/)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'BTS SIO 1A' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Enregistrer comme brouillon/ })); });
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ draft: true, targetPromotionIds: ['p1'], contractTypeId: 'c1' }));

    onSave.mockClear();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Publier/ })); });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('« Publier » sans lien ni adresse : refusé avant l’envoi', async () => {
    const { onSave } = await open();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Publier/ })); });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Aucun moyen de postuler/).length).toBeGreaterThan(0);
  });

  it('fermer un formulaire modifié : confirmation (« Fermer sans envoyer ? »)', async () => {
    const { onClose } = await open();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.getByText('Fermer sans envoyer ?')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
