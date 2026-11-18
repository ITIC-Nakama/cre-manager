import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap, Loader2, MessagesSquare, Search, UserCog, UserRound } from 'lucide-react';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { getApiErrorMessage } from '../../../utils/errorHelper';
import UserAvatar from '../../../components/shared/UserAvatar';
import InfiniteScrollSentinel from '../../../components/shared/InfiniteScrollSentinel';
import MessageList from '../../../components/conversation/MessageList';
import MessageComposer from '../../../components/conversation/MessageComposer';
import { useThreadReading } from '../../../components/conversation/useThreadReading';
import {
  useConversationUnreadCounts, useConversationsInfinite, useMarkStudentThreadRead, useSendToStudent, useStudentThread,
} from '../../../hooks/useConversations';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import { CONVERSATION_PAGE, type ConversationScope, type ConversationSummary } from '../../../types/models/Conversation';

/**
 * Onglet « Conversations » (conseillers et admins) : la liste des fils, triée par dernier message, avec les filtres
 * « Mes étudiants / Tous / Non lus » et une recherche, et le fil choisi avec sa zone de réponse.
 * Sur mobile, la liste et le fil s'affichent l'un après l'autre (/supervisor/conversations/:studentId).
 */
export default function ConversationsPage() {
  const { studentId } = useParams<{ studentId?: string }>();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 animate-fadeIn" style={{ height: 'calc(100dvh - var(--conversations-offset) - var(--pwa-banner-space, 0px))' }}
      data-conversations-page>
      <div className={`${studentId ? 'hidden lg:block' : ''}`}>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <MessagesSquare className="h-7 w-7 text-[#E2762F] shrink-0" />
          {renderTitleWithGradient(t('conversation.staff.title', 'Conversations'), 'itic-gradient-blue')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('conversation.staff.subtitle', 'Un fil par étudiant, partagé par toute l’équipe CRE.')}
        </p>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr] gap-4">
        <section className={`${studentId ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden`}
          aria-label={t('conversation.staff.list_label', 'Liste des conversations')}>
          <ConversationList selectedStudentId={studentId} />
        </section>
        <section className={`${studentId ? 'flex' : 'hidden lg:flex'} min-h-0 flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 overflow-hidden`}
          aria-label={t('conversation.staff.thread_label', 'Conversation')}>
          {studentId ? <StaffThread key={studentId} studentId={studentId} /> : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
              <MessagesSquare className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('conversation.staff.pick', 'Choisissez une conversation, ou ouvrez-en une depuis la fiche d’un étudiant.')}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Liste ──────────────────────────────────────────────────────────────────

const chip = (active: boolean) => `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
  active ? 'bg-[#3f74ff] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`;

function CountBadge({ value, active }: { value: number | undefined; active: boolean }) {
  if (!value) return null;
  return (
    <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${active ? 'bg-white text-[#3f74ff]' : 'bg-[#E2762F] text-white'}`}>
      {value > 99 ? '99+' : value}
    </span>
  );
}

function ConversationList({ selectedStudentId }: { selectedStudentId?: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = useUserStore((state) => state.user?.role) === Role.ADMIN;
  // Comme les « Demandes d'aide » : un conseiller voit d'abord ses étudiants, un admin tout le monde.
  const [scope, setScope] = useState<ConversationScope>(isAdmin ? 'ALL' : 'MINE');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = useMemo(() => ({ size: 20, scope, unread: unreadOnly, q: query || undefined }), [scope, unreadOnly, query]);
  const { items, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useConversationsInfinite(params);
  const { data: counts } = useConversationUnreadCounts();

  const formatWhen = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    return date.toDateString() === now.toDateString()
      ? date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  };

  const preview = (c: ConversationSummary) => {
    if (!c.lastMessagePreview) return '';
    if (c.lastMessageFromStudent) return c.lastMessagePreview;
    const who = c.lastMessageAuthorName ?? t('conversation.common.former_staff', 'Compte supprimé');
    return `${who} : ${c.lastMessagePreview}`;
  };

  return (
    <>
      <div className="p-3 flex flex-col gap-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('conversation.staff.search', 'Rechercher un étudiant (nom, e-mail)…')}
            aria-label={t('conversation.staff.search', 'Rechercher un étudiant (nom, e-mail)…')}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3f74ff]/50" />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('conversation.staff.filters', 'Filtres')}>
          <button type="button" className={chip(scope === 'MINE')} aria-pressed={scope === 'MINE'} onClick={() => setScope('MINE')}>
            {t('conversation.staff.filter_mine', 'Mes étudiants')}
            <CountBadge value={counts?.mine} active={scope === 'MINE'} />
          </button>
          <button type="button" className={chip(scope === 'ALL')} aria-pressed={scope === 'ALL'} onClick={() => setScope('ALL')}>
            {t('conversation.staff.filter_all', 'Tous')}
            <CountBadge value={counts?.all} active={scope === 'ALL'} />
          </button>
          <button type="button" className={chip(unreadOnly)} aria-pressed={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
            {t('conversation.staff.filter_unread', 'Non lus')}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 text-slate-400 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
            {query
              ? t('conversation.staff.empty_search', 'Aucune conversation ne correspond à cette recherche.')
              : unreadOnly
                ? t('conversation.staff.empty_unread', 'Aucun message non lu.')
                : t('conversation.staff.empty', 'Aucune conversation pour l’instant. Ouvrez la fiche d’un étudiant pour lui écrire.')}
          </p>
        ) : (
          <ul>
            {items.map((c) => {
              const selected = c.studentId === selectedStudentId;
              return (
                <li key={c.conversationId}>
                  <button type="button" onClick={() => navigate(`/supervisor/conversations/${c.studentId}`)}
                    aria-current={selected ? 'true' : undefined}
                    className={`w-full text-left flex gap-3 px-3 py-3 border-b border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer ${
                      selected ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                    <UserAvatar profilePicture={null} firstName={c.studentFirstName} lastName={c.studentLastName} className="h-10 w-10 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm truncate ${c.unreadCount ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                          {c.studentFirstName} {c.studentLastName}
                        </p>
                        <span className={`shrink-0 text-[11px] ${c.unreadCount ? 'text-[#E2762F] font-semibold' : 'text-slate-400'}`}>{formatWhen(c.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${c.unreadCount ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{preview(c)}</p>
                        {c.unreadCount > 0 && (
                          <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#E2762F] text-white text-[10px] font-bold flex items-center justify-center"
                            aria-label={t('conversation.staff.unread_aria', { count: c.unreadCount, defaultValue: '{{count}} non lu(s)' })}>
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                        {c.referentName
                          ? (c.mine ? t('conversation.staff.my_student', 'Mon étudiant') : t('conversation.staff.referent', { name: c.referentName, defaultValue: 'Référent : {{name}}' }))
                          : t('conversation.staff.no_referent', 'Sans référent')}
                        {!c.studentActive && ` · ${t('conversation.staff.inactive_short', 'compte désactivé')}`}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
            <InfiniteScrollSentinel hasMore={!!hasNextPage} isLoadingMore={isFetchingNextPage} onLoadMore={fetchNextPage} />
          </ul>
        )}
      </div>
    </>
  );
}

// ─── Fil ────────────────────────────────────────────────────────────────────

function StaffThread({ studentId }: { studentId: string }) {
  const { t } = useTranslation();
  const [limit, setLimit] = useState(CONVERSATION_PAGE);
  const { data: thread, isLoading, isError, isFetching } = useStudentThread(studentId, limit);
  const send = useSendToStudent(studentId);
  const markRead = useMarkStudentThreadRead(studentId);
  const firstUnreadId = useThreadReading(studentId, thread, false, markRead.mutate);

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 text-slate-400 animate-spin" /></div>;
  }
  if (isError || !thread?.student) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-slate-500">{t('conversation.staff.not_found', 'Cet étudiant est introuvable.')}</p>
        <Link to="/supervisor/conversations" className="text-sm font-semibold text-[#3f74ff]">{t('conversation.staff.back', 'Toutes les conversations')}</Link>
      </div>
    );
  }
  const student = thread.student;
  const disabledReason = student.anonymized
    ? t('conversation.staff.anonymized', 'Compte anonymisé : plus de message possible.')
    : !student.active
      ? t('conversation.staff.inactive', 'Compte désactivé : l’étudiant ne peut plus se connecter, vous ne pouvez plus lui écrire.')
      : null;

  return (
    <>
      <header className="flex items-center gap-3 px-3 sm:px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Link to="/supervisor/conversations" className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={t('conversation.staff.back', 'Toutes les conversations')}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <UserAvatar profilePicture={null} firstName={student.firstName} lastName={student.lastName} className="h-10 w-10 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{student.firstName} {student.lastName}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {student.promotionName && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" />{student.promotionName}</span>}
            <span className="inline-flex items-center gap-1">
              <UserCog className="h-3 w-3" />
              {thread.referent
                ? t('conversation.staff.referent', { name: `${thread.referent.firstName} ${thread.referent.lastName}`, defaultValue: 'Référent : {{name}}' })
                : t('conversation.staff.no_referent', 'Sans référent')}
            </span>
          </div>
        </div>
        {isFetching && !send.isPending && <Loader2 className="h-3.5 w-3.5 text-slate-300 animate-spin shrink-0" aria-hidden="true" />}
        <Link to={`/supervisor/etudiants/${student.id}`}
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
          <UserRound className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('conversation.staff.open_file', 'Voir la fiche')}</span>
        </Link>
      </header>

      <MessageList
        messages={thread.messages}
        audience="staff"
        firstUnreadId={firstUnreadId}
        studentLastReadMessageId={thread.studentLastReadMessageId}
        hasMore={thread.hasMore}
        loadingMore={isFetching && limit > thread.messages.length}
        onLoadMore={() => setLimit((l) => l + CONVERSATION_PAGE)}
        empty={
          <p className="max-w-sm text-center text-sm text-slate-500 dark:text-slate-400">
            {t('conversation.staff.empty_thread', { name: student.firstName, defaultValue: 'Aucun message avec {{name}} pour l’instant. Écrivez-lui : {{name}} sera prévenu(e) par e-mail si le message reste non lu.' })}
          </p>
        }
      />

      <MessageComposer
        placeholder={t('conversation.staff.placeholder', { name: student.firstName, defaultValue: 'Écrire à {{name}}…' })}
        draftKey={`conversation:${student.id}`}
        audience="staff"
        sending={send.isPending}
        disabledReason={disabledReason}
        onSend={(body) => send.mutateAsync(body).catch((err) => {
          toast.error(getApiErrorMessage(err, t('conversation.common.send_error', 'Le message n’a pas pu être envoyé, réessayez.')));
          throw err;
        })}
      />
    </>
  );
}
