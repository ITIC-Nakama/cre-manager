import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCheck, Loader2 } from 'lucide-react';
import type { ConversationMessage } from '../../types/models/Conversation';

interface Props {
  messages: ConversationMessage[];
  /** Qui regarde : l'équipe (vouvoiement, ses messages à droite) ou l'étudiant (tutoiement, les siens à droite). */
  audience: 'staff' | 'student';
  /** Premier message non lu à l'ouverture : la ligne « Nouveaux messages » le précède. */
  firstUnreadId: number | null;
  /** Vue équipe : dernier message lu par l'étudiant (« Lu » sous le dernier message de l'équipe qu'il a vu). */
  studentLastReadMessageId?: number | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /** Contenu quand le fil est vide. */
  empty: React.ReactNode;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Fil de messages, du plus ancien au plus récent ; c'est lui qui défile. Au premier affichage et à l'arrivée d'un
 * message, il descend en bas (sauf si l'on est remonté lire l'historique et que le message n'est pas le sien).
 */
export default function MessageList({
  messages, audience, firstUnreadId, studentLastReadMessageId, hasMore, loadingMore, onLoadMore, empty,
}: Props) {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id ?? null;
  const shownLastId = useRef<number | null>(null);
  const firstId = messages[0]?.id ?? null;
  const shownFirstId = useRef<number | null>(null);
  const heightBefore = useRef(0);

  // Messages plus anciens ajoutés en haut : on garde la position de lecture.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (shownFirstId.current !== null && firstId !== null && firstId < shownFirstId.current) {
      el.scrollTop += el.scrollHeight - heightBefore.current;
    }
    shownFirstId.current = firstId;
    heightBefore.current = el.scrollHeight;
  }, [firstId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || lastId === null || lastId === shownLastId.current) return;
    const first = shownLastId.current === null;
    const mine = messages.at(-1)?.mine ?? false;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    shownLastId.current = lastId;
    heightBefore.current = el.scrollHeight;
    if (first || mine || nearBottom) el.scrollTop = el.scrollHeight;
  }, [lastId, messages]);

  const formatDay = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (sameDay(date, today)) return t('conversation.common.today', 'Aujourd’hui');
    if (sameDay(date, yesterday)) return t('conversation.common.yesterday', 'Hier');
    return date.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  const formatTime = (date: Date) => date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  // « Lu » : sous le dernier message de l'équipe que l'étudiant a lu (vue équipe seulement).
  const readMarkId = audience === 'staff' && studentLastReadMessageId
    ? [...messages].reverse().find((m) => !m.fromStudent && m.id <= studentLastReadMessageId)?.id ?? null
    : null;

  const authorLabel = (m: ConversationMessage) => {
    if (m.formerStaff) return t('conversation.common.former_staff', 'Compte supprimé');
    const name = [m.authorFirstName, m.authorLastName].filter(Boolean).join(' ');
    if (audience === 'student' && !m.fromStudent) {
      return t('conversation.student.staff_author', { name, defaultValue: '{{name}} · équipe CRE' });
    }
    return name;
  };

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-4" data-testid="message-list">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center">{empty}</div>
      ) : (
        <ol className="flex flex-col gap-1.5" aria-label={t('conversation.common.messages', 'Messages')}>
          {hasMore && (
            <li className="flex justify-center pb-2">
              <button type="button" onClick={onLoadMore} disabled={loadingMore}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer disabled:opacity-60">
                {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('conversation.common.load_more', 'Afficher les messages précédents')}
              </button>
            </li>
          )}
          {messages.map((m, index) => {
            const date = new Date(m.createdAt);
            const previous = messages[index - 1];
            const newDay = !previous || !sameDay(new Date(previous.createdAt), date);
            const ours = audience === 'staff' ? !m.fromStudent : m.fromStudent;
            const showAuthor = !m.mine && (!previous || previous.authorId !== m.authorId || previous.fromStudent !== m.fromStudent || newDay);
            return (
              <li key={m.id} className="flex flex-col">
                {newDay && (
                  <div className="flex justify-center my-3">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70 first-letter:uppercase">
                      {formatDay(date)}
                    </span>
                  </div>
                )}
                {m.id === firstUnreadId && (
                  <div className="flex items-center gap-3 my-2" role="separator">
                    <span className="h-px flex-1 bg-[#E2762F]/40" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#E2762F]">
                      {t('conversation.common.new_messages', 'Nouveaux messages')}
                    </span>
                    <span className="h-px flex-1 bg-[#E2762F]/40" />
                  </div>
                )}
                <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${ours ? 'self-end items-end' : 'self-start items-start'}`}>
                  {showAuthor && (
                    <span className="px-1 mb-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{authorLabel(m)}</span>
                  )}
                  <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                    m.mine
                      ? 'bg-[#3f74ff] text-white rounded-br-md'
                      : ours
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-slate-800 dark:text-slate-100 rounded-br-md'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md'
                  }`}>
                    {m.body}
                  </div>
                  <span className="px-1 mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-400">
                    <time dateTime={m.createdAt}>{formatTime(date)}</time>
                    {m.id === readMarkId && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCheck className="h-3 w-3" />
                        {t('conversation.staff.read_by_student', 'Lu')}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
