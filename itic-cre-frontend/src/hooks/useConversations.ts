import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
import {
  fetchConversationUnreadCounts, fetchConversations, fetchMyThread, fetchMyUnreadCount, fetchStudentThread,
  markMyThreadRead, markStudentThreadRead, sendMyMessage, sendToStudent,
} from '../api-s/requests/ConversationRequest';
import type { ConversationSummary, ConversationThread, FetchConversationsParams } from '../types/models/Conversation';

/**
 * Messagerie, vue équipe. Rafraîchissement par interrogation, sans temps réel : compteurs et liste toutes les
 * 60 secondes, conversation ouverte toutes les 12 secondes (React Query suspend tout quand l'onglet est caché).
 */
const KEY = ['conversations'] as const;
const COUNTS_KEY = [...KEY, 'unread-counts'] as const;
const LIST_KEY = [...KEY, 'list'] as const;
const threadKey = (studentId: string) => [...KEY, 'thread', studentId] as const;

export const COUNTS_POLL_MS = 60_000;
export const THREAD_POLL_MS = 12_000;

const conversationKey = (c: ConversationSummary) => c.conversationId;

/** Badge du menu et compteurs des filtres : une seule requête par minute, partagée par le menu et la page. */
export function useConversationUnreadCounts() {
  return useQuery({
    queryKey: COUNTS_KEY,
    queryFn: fetchConversationUnreadCounts,
    refetchInterval: COUNTS_POLL_MS,
    staleTime: 30_000,
  });
}

export function useConversationsInfinite(params: FetchConversationsParams) {
  return useInfiniteListQuery([...LIST_KEY, params], fetchConversations, params,
    { getItemKey: conversationKey, refetchInterval: COUNTS_POLL_MS });
}

export function useStudentThread(studentId: string | undefined, limit: number) {
  return useQuery({
    queryKey: [...threadKey(studentId ?? ''), limit],
    queryFn: () => fetchStudentThread(studentId as string, limit),
    enabled: !!studentId,
    refetchInterval: THREAD_POLL_MS,
    placeholderData: (previous) => previous,
  });
}

export function useSendToStudent(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendToStudent(studentId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: threadKey(studentId) });
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

/**
 * « Lu jusqu'au message n » : le fil affiché passe à 0 non lu sans être redemandé (pas de boucle), seuls le badge
 * et la liste sont rafraîchis.
 */
export function useMarkStudentThreadRead(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lastMessageId: number) => markStudentThreadRead(studentId, lastMessageId),
    onSuccess: (_, lastMessageId) => {
      queryClient.setQueriesData<ConversationThread>({ queryKey: threadKey(studentId) }, (thread) =>
        thread ? { ...thread, unreadCount: 0, lastReadMessageId: Math.max(thread.lastReadMessageId, lastMessageId) } : thread);
      void queryClient.invalidateQueries({ queryKey: COUNTS_KEY });
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

// ─── Étudiant ───────────────────────────────────────────────────────────────

const MY_KEY = ['my-conversation'] as const;
const MY_THREAD_KEY = [...MY_KEY, 'thread'] as const;
const MY_UNREAD_KEY = [...MY_KEY, 'unread-count'] as const;

/** Badge « Messages » du menu étudiant : une requête par minute. */
export function useMyConversationUnreadCount() {
  return useQuery({
    queryKey: MY_UNREAD_KEY,
    queryFn: fetchMyUnreadCount,
    refetchInterval: COUNTS_POLL_MS,
    staleTime: 30_000,
  });
}

export function useMyThread(limit: number) {
  return useQuery({
    queryKey: [...MY_THREAD_KEY, limit],
    queryFn: () => fetchMyThread(limit),
    refetchInterval: THREAD_POLL_MS,
    placeholderData: (previous) => previous,
  });
}

export function useSendMyMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMyMessage(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_THREAD_KEY });
    },
  });
}

/** Comme côté équipe : le fil passe à 0 non lu sans être redemandé, seul le badge est rafraîchi. */
export function useMarkMyThreadRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lastMessageId: number) => markMyThreadRead(lastMessageId),
    onSuccess: (_, lastMessageId) => {
      queryClient.setQueriesData<ConversationThread>({ queryKey: MY_THREAD_KEY }, (thread) =>
        thread ? { ...thread, unreadCount: 0, lastReadMessageId: Math.max(thread.lastReadMessageId, lastMessageId) } : thread);
      void queryClient.invalidateQueries({ queryKey: MY_UNREAD_KEY });
    },
  });
}
