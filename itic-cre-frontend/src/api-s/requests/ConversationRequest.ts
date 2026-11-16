import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';
import type {
  ConversationMessage, ConversationSummaryPage, ConversationThread, ConversationUnreadCounts, FetchConversationsParams,
} from '../../types/models/Conversation';

// ─── Équipe (conseillers et admins) ──────────────────────────────────────────

export function fetchConversations(params: FetchConversationsParams): Promise<ConversationSummaryPage> {
  const query: Record<string, unknown> = { page: params.page ?? 0, size: params.size ?? 20, scope: params.scope, unread: params.unread };
  if (params.q?.trim()) query.q = params.q.trim();
  return apiClient.get('/dashboard/conversations', { params: query }).then((r) => unwrap<ConversationSummaryPage>(r));
}

export function fetchConversationUnreadCounts(): Promise<ConversationUnreadCounts> {
  return apiClient.get('/dashboard/conversations/unread-counts').then((r) => unwrap<ConversationUnreadCounts>(r));
}

export function fetchStudentThread(studentId: string, limit: number): Promise<ConversationThread> {
  return apiClient.get(`/dashboard/conversations/students/${studentId}`, { params: { limit } })
    .then((r) => unwrap<ConversationThread>(r));
}

export function sendToStudent(studentId: string, body: string): Promise<ConversationMessage> {
  return apiClient.post(`/dashboard/conversations/students/${studentId}/messages`, { body })
    .then((r) => unwrap<ConversationMessage>(r));
}

export function markStudentThreadRead(studentId: string, lastMessageId: number): Promise<void> {
  return apiClient.post(`/dashboard/conversations/students/${studentId}/read`, { lastMessageId }).then(() => undefined);
}

// ─── Étudiant ─────────────────────────────────────────────────────────────────

export function fetchMyThread(limit: number): Promise<ConversationThread> {
  return apiClient.get('/conversation/me', { params: { limit } }).then((r) => unwrap<ConversationThread>(r));
}

export function fetchMyUnreadCount(): Promise<number> {
  return apiClient.get('/conversation/me/unread-count').then((r) => unwrap<number>(r));
}

export function sendMyMessage(body: string): Promise<ConversationMessage> {
  return apiClient.post('/conversation/me/messages', { body }).then((r) => unwrap<ConversationMessage>(r));
}

export function markMyThreadRead(lastMessageId: number): Promise<void> {
  return apiClient.post('/conversation/me/read', { lastMessageId }).then(() => undefined);
}
