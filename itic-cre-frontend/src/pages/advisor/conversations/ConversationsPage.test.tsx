/**
 * Onglet « Conversations » (conseiller) : liste, fil, réponse, lecture — et surtout aucune boucle de requêtes :
 * un appel par endpoint à l'ouverture, un seul « lu » par nouveau message, rien de plus pour un étudiant sans message.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ConversationsPage from './ConversationsPage';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import type { ConversationMessage, ConversationThread, ConversationSummary } from '../../../types/models/Conversation';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const ines: ConversationSummary = {
  conversationId: 'c1', studentId: 's1', studentFirstName: 'Inès', studentLastName: 'Martin', studentEmail: 'ines@example.com',
  promotionName: 'Bachelor RH', studentActive: true, referentId: 'a1', referentName: 'Romain Référent', mine: true,
  lastMessageAt: '2026-11-14T09:00:00Z', lastMessagePreview: 'Bonjour, une question', lastMessageFromStudent: true,
  lastMessageAuthorName: 'Inès Martin', unreadCount: 1,
};

const message = (id: number, fromStudent: boolean, body: string): ConversationMessage => ({
  id, body, createdAt: '2026-11-14T09:00:00Z', fromStudent, mine: !fromStudent,
  authorId: fromStudent ? 's1' : 'a1', authorFirstName: fromStudent ? 'Inès' : 'Romain', authorLastName: fromStudent ? 'Martin' : 'Référent',
  authorRole: fromStudent ? 'STUDENT' : 'ADVISOR', formerStaff: false,
});

function thread(overrides: Partial<ConversationThread> = {}): ConversationThread {
  return {
    conversationId: 'c1', messages: [message(7, true, 'Bonjour, une question')], hasMore: false, unreadCount: 1,
    lastReadMessageId: 0, studentLastReadMessageId: 0,
    student: { id: 's1', firstName: 'Inès', lastName: 'Martin', email: 'ines@example.com', promotionName: 'Bachelor RH', active: true, anonymized: false },
    referent: { id: 'a1', firstName: 'Romain', lastName: 'Référent', jobTitle: null },
    ...overrides,
  };
}

function serve(threadReply: ConversationThread, list: ConversationSummary[] = [ines]) {
  api.get.mockImplementation((url: string) => {
    if (url === '/dashboard/conversations') return Promise.resolve({ data: { data: { content: list, totalElements: list.length, totalPages: 1, number: 0 } } });
    if (url === '/dashboard/conversations/unread-counts') return Promise.resolve({ data: { data: { badge: 1, mine: 1, all: 2 } } });
    if (url.startsWith('/dashboard/conversations/students/')) return Promise.resolve({ data: { data: threadReply } });
    return Promise.reject({ response: { status: 500 } });
  });
  api.post.mockImplementation((url: string, body: unknown) => {
    if (url.endsWith('/read')) return Promise.resolve({ data: { data: null } });
    if (url.endsWith('/messages')) return Promise.resolve({ data: { data: { ...message(8, false, (body as { body: string }).body) } } });
    return Promise.reject({ response: { status: 500 } });
  });
}

function calls(method: 'get' | 'post', url: string) {
  return api[method].mock.calls.filter(([u]) => u === url).length;
}

async function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/supervisor/conversations" element={<ConversationsPage />} />
          <Route path="/supervisor/conversations/:studentId" element={<ConversationsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
}

beforeEach(() => {
  useUserStore.setState({ user: { id: 'a1', role: Role.ADVISOR } as never });
});

describe('Onglet « Conversations » (conseiller)', () => {
  it('liste : filtres « Mes étudiants » par défaut avec les compteurs, un appel par endpoint', async () => {
    serve(thread());
    await renderAt('/supervisor/conversations');

    expect(await screen.findByText('Inès Martin')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mes étudiants/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Tous/ }).textContent).toContain('2');
    expect(api.get).toHaveBeenCalledWith('/dashboard/conversations', { params: { page: 0, size: 20, scope: 'MINE', unread: false } });
    expect(calls('get', '/dashboard/conversations')).toBe(1);
    expect(calls('get', '/dashboard/conversations/unread-counts')).toBe(1);
    expect(screen.getByText(/Choisissez une conversation/)).toBeTruthy();
  });

  it('fil non lu : affiché avec « Nouveaux messages », marqué lu UNE fois, sans redemander le fil', async () => {
    serve(thread());
    await renderAt('/supervisor/conversations/s1');

    const list = await screen.findByTestId('message-list');
    expect(within(list).getByText('Bonjour, une question')).toBeTruthy();
    expect(within(list).getByText('Nouveaux messages')).toBeTruthy();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(api.post).toHaveBeenCalledWith('/dashboard/conversations/students/s1/read', { lastMessageId: 7 });
    expect(calls('post', '/dashboard/conversations/students/s1/read')).toBe(1);
    expect(api.get.mock.calls.filter(([u]) => String(u).startsWith('/dashboard/conversations/students/')).length).toBe(1);
  });

  it('étudiant sans aucun message : invitation à écrire, aucun « lu », un seul appel au fil', async () => {
    serve(thread({ conversationId: null, messages: [], unreadCount: 0 }), []);
    await renderAt('/supervisor/conversations/s1');

    expect(await screen.findByText(/Aucun message avec Inès pour l’instant/)).toBeTruthy();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
    expect(api.post).not.toHaveBeenCalled();
    expect(api.get.mock.calls.filter(([u]) => String(u).startsWith('/dashboard/conversations/students/')).length).toBe(1);
  });

  it('répondre : le message part, la zone se vide ; compte désactivé : plus de zone de saisie', async () => {
    serve(thread({ unreadCount: 0, lastReadMessageId: 7 }));
    await renderAt('/supervisor/conversations/s1');

    const box = await screen.findByPlaceholderText('Écrire à Inès…');
    fireEvent.change(box, { target: { value: '  Bonjour Inès, je regarde ça.  ' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Envoyer' })); });
    expect(api.post).toHaveBeenCalledWith('/dashboard/conversations/students/s1/messages', { body: 'Bonjour Inès, je regarde ça.' });
    expect((box as HTMLTextAreaElement).value).toBe('');
  });

  it('compte désactivé : la raison remplace la zone de saisie', async () => {
    serve(thread({ unreadCount: 0, student: { ...thread().student!, active: false } }));
    await renderAt('/supervisor/conversations/s1');

    expect(await screen.findByText(/Compte désactivé/)).toBeTruthy();
    expect(screen.queryByPlaceholderText('Écrire à Inès…')).toBeNull();
  });
});
