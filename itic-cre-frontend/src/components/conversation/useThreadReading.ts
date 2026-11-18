import { useEffect, useRef, useState } from 'react';
import type { ConversationThread } from '../../types/models/Conversation';

/**
 * Lecture d'un fil ouvert :
 * - la ligne « Nouveaux messages » est calculée à l'ouverture (premier message de l'autre côté non lu) et ne bouge
 *   plus ensuite, même quand le fil passe à « lu » ;
 * - « lu jusqu'au dernier message » est envoyé UNE fois par nouveau dernier message, seulement s'il y a des non-lus
 *   et que l'onglet est visible : pas de boucle de requêtes (le fil n'est pas redemandé après coup).
 */
export function useThreadReading(
  threadKey: string | undefined,
  thread: ConversationThread | undefined,
  viewerIsStudent: boolean,
  markRead: (lastMessageId: number) => void,
) {
  const [divider, setDivider] = useState<{ key: string | undefined; id: number | null }>({ key: undefined, id: null });
  if (thread && threadKey && divider.key !== threadKey) {
    const firstUnread = thread.unreadCount > 0
      ? thread.messages.find((m) => m.fromStudent !== viewerIsStudent && m.id > thread.lastReadMessageId)?.id ?? null
      : null;
    setDivider({ key: threadKey, id: firstUnread });
  }

  const sent = useRef<string | null>(null);
  const lastId = thread?.messages.at(-1)?.id;
  const unread = thread?.unreadCount ?? 0;
  useEffect(() => {
    if (!threadKey || !lastId || unread === 0 || document.visibilityState !== 'visible') return;
    const tag = `${threadKey}:${lastId}`;
    if (sent.current === tag) return;
    sent.current = tag;
    markRead(lastId);
  }, [threadKey, lastId, unread, markRead]);

  return divider.key === threadKey ? divider.id : null;
}
