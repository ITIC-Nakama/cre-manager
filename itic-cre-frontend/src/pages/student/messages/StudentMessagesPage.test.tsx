/**
 * Page « Messages » de l'étudiant : lire, écrire, répondre, tutoiement ; aucune boucle de requêtes, en particulier
 * pour un étudiant qui n'a encore aucun message.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import StudentMessagesPage from './StudentMessagesPage';
import type { ConversationMessage, ConversationThread } from '../../../types/models/Conversation';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const staffMessage: ConversationMessage = {
  id: 12, body: 'Bonjour Inès, as-tu des nouvelles de l’entreprise ?', createdAt: '2026-11-14T09:00:00Z', fromStudent: false, mine: false,
  authorId: 'a1', authorFirstName: 'Romain', authorLastName: 'Référent', authorRole: 'ADVISOR', formerStaff: false,
};

function thread(overrides: Partial<ConversationThread> = {}): ConversationThread {
  return {
    conversationId: 'c1', messages: [staffMessage], hasMore: false, unreadCount: 1, lastReadMessageId: 0,
    studentLastReadMessageId: null, student: null, referent: { id: 'a1', firstName: 'Romain', lastName: 'Référent', jobTitle: null },
    ...overrides,
  };
}

function serve(reply: ConversationThread) {
  api.get.mockImplementation((url: string) => (url === '/conversation/me'
    ? Promise.resolve({ data: { data: reply } })
    : Promise.reject({ response: { status: 500 } })));
  api.post.mockImplementation((url: string, body: unknown) => {
    if (url === '/conversation/me/read') return Promise.resolve({ data: { data: null } });
    if (url === '/conversation/me/messages') {
      return Promise.resolve({ data: { data: { ...staffMessage, id: 13, fromStudent: true, mine: true, body: (body as { body: string }).body } } });
    }
    return Promise.reject({ response: { status: 500 } });
  });
}

async function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><StudentMessagesPage /></MemoryRouter></QueryClientProvider>);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
}

const threadCalls = () => api.get.mock.calls.filter(([u]) => u === '/conversation/me').length;

describe('Page « Messages » (étudiant)', () => {
  it('aucun message encore : invitation à écrire (tutoiement), un seul appel, aucun « lu »', async () => {
    serve(thread({ conversationId: null, messages: [], unreadCount: 0 }));
    await renderPage();

    expect(await screen.findByText(/Pas encore de message. Pose ta question/)).toBeTruthy();
    expect(screen.getByText(/Ton conseiller : Romain Référent/)).toBeTruthy();
    expect(screen.getByPlaceholderText('Écris ton message…')).toBeTruthy();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
    expect(threadCalls()).toBe(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('message de l’équipe non lu : affiché et signé, marqué lu une seule fois, fil non redemandé', async () => {
    serve(thread());
    await renderPage();

    const list = await screen.findByTestId('message-list');
    expect(within(list).getByText('Bonjour Inès, as-tu des nouvelles de l’entreprise ?')).toBeTruthy();
    expect(within(list).getByText('Romain Référent · équipe CRE')).toBeTruthy();
    expect(within(list).getByText('Nouveaux messages')).toBeTruthy();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(api.post).toHaveBeenCalledWith('/conversation/me/read', { lastMessageId: 12 });
    expect(api.post.mock.calls.filter(([u]) => u === '/conversation/me/read').length).toBe(1);
    expect(threadCalls()).toBe(1);
  });

  it('répondre : le message part (Ctrl + Entrée), la zone se vide ; sans référent, toute l’équipe lit', async () => {
    serve(thread({ unreadCount: 0, lastReadMessageId: 12, referent: null }));
    await renderPage();

    expect(await screen.findByText(/toute l’équipe CRE lit tes messages/)).toBeTruthy();
    const box = screen.getByPlaceholderText('Écris ton message…');
    fireEvent.change(box, { target: { value: 'Oui, entretien vendredi !' } });
    await act(async () => { fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true }); });
    expect(api.post).toHaveBeenCalledWith('/conversation/me/messages', { body: 'Oui, entretien vendredi !' });
    expect((box as HTMLTextAreaElement).value).toBe('');
  });
});
