/** Messagerie conseiller ↔ étudiant : un fil unique par étudiant, partagé par toute l'équipe CRE. */

export const CONVERSATION_MESSAGE_MAX = 4000;
/** Messages chargés par défaut ; « Afficher les messages précédents » en ajoute autant. */
export const CONVERSATION_PAGE = 50;

export interface ConversationMessage {
  id: number;
  body: string;
  createdAt: string;
  /** Écrit par l'étudiant (sinon par l'équipe). */
  fromStudent: boolean;
  /** Écrit par la personne connectée. */
  mine: boolean;
  authorId: string | null;
  authorFirstName: string | null;
  authorLastName: string | null;
  authorRole: 'STUDENT' | 'ADVISOR' | 'ADMIN' | null;
  /** Compte de l'équipe supprimé : « Ancien conseiller ». */
  formerStaff: boolean;
}

export interface ConversationThread {
  /** null tant qu'aucun message n'a été écrit. */
  conversationId: string | null;
  messages: ConversationMessage[];
  hasMore: boolean;
  unreadCount: number;
  lastReadMessageId: number;
  /** Vue équipe : jusqu'où l'étudiant a lu. */
  studentLastReadMessageId: number | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    promotionName: string | null;
    active: boolean;
    anonymized: boolean;
  } | null;
  referent: { id: string; firstName: string; lastName: string; jobTitle: string | null } | null;
}

export interface ConversationSummary {
  conversationId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  promotionName: string | null;
  studentActive: boolean;
  referentId: string | null;
  referentName: string | null;
  mine: boolean;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastMessageFromStudent: boolean;
  lastMessageAuthorName: string | null;
  unreadCount: number;
}

export interface ConversationSummaryPage {
  content: ConversationSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface ConversationUnreadCounts {
  /** Badge du menu : mes étudiants et les étudiants sans référent. */
  badge: number;
  mine: number;
  all: number;
}

export type ConversationScope = 'MINE' | 'ALL';

export interface FetchConversationsParams {
  page?: number;
  size?: number;
  scope: ConversationScope;
  unread: boolean;
  q?: string;
}
