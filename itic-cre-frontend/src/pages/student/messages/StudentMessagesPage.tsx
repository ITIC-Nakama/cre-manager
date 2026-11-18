import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, MessagesSquare, UserRound, UsersRound } from 'lucide-react';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { getApiErrorMessage } from '../../../utils/errorHelper';
import MessageList from '../../../components/conversation/MessageList';
import MessageComposer from '../../../components/conversation/MessageComposer';
import { useThreadReading } from '../../../components/conversation/useThreadReading';
import { useMarkMyThreadRead, useMyThread, useSendMyMessage } from '../../../hooks/useConversations';
import { CONVERSATION_PAGE } from '../../../types/models/Conversation';

/**
 * Page « Messages » de l'étudiant : son fil avec l'équipe CRE. Il lit, écrit à tout moment et répond ; son conseiller
 * référent est prévenu par e-mail. Tutoiement, comme dans « Mon CV ». Fil redemandé toutes les 12 secondes.
 */
export default function StudentMessagesPage() {
  const { t } = useTranslation();
  const [limit, setLimit] = useState(CONVERSATION_PAGE);
  const { data: thread, isLoading, isError, isFetching } = useMyThread(limit);
  const send = useSendMyMessage();
  const markRead = useMarkMyThreadRead();
  const firstUnreadId = useThreadReading('me', thread, true, markRead.mutate);
  const referent = thread?.referent;

  return (
    <div className="flex flex-col gap-4 animate-fadeIn" data-conversations-page
      style={{ height: 'calc(100dvh - var(--conversations-offset) - var(--pwa-banner-space, 0px))' }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <MessagesSquare className="h-7 w-7 text-[#E2762F] shrink-0" />
          {renderTitleWithGradient(t('conversation.student.title', 'Messages'), 'itic-gradient-blue')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('conversation.student.subtitle', 'Écris à l’équipe CRE quand tu veux : ta question, une nouvelle, un doute.')}
        </p>
      </div>

      <section className="flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 overflow-hidden"
        aria-label={t('conversation.student.thread_label', 'Ta conversation avec l’équipe CRE')}>
        <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="h-10 w-10 rounded-full bg-[#3f74ff]/10 flex items-center justify-center shrink-0">
            {referent ? <UserRound className="h-5 w-5 text-[#3f74ff]" /> : <UsersRound className="h-5 w-5 text-[#3f74ff]" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {t('conversation.student.team', 'Équipe CRE')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {referent
                ? t('conversation.student.referent', {
                  name: `${referent.firstName} ${referent.lastName}`,
                  defaultValue: 'Ton conseiller : {{name}}, prévenu(e) à chaque message',
                })
                : t('conversation.student.no_referent', 'Tu n’as pas encore de conseiller : toute l’équipe CRE lit tes messages.')}
            </p>
          </div>
          {isFetching && !send.isPending && <Loader2 className="h-3.5 w-3.5 text-slate-300 animate-spin shrink-0" aria-hidden="true" />}
        </header>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 text-slate-400 animate-spin" /></div>
        ) : isError || !thread ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-slate-500">
            {t('conversation.student.load_error', 'Tes messages n’ont pas pu être chargés. Réessaie dans un instant.')}
          </div>
        ) : (
          <MessageList
            messages={thread.messages}
            audience="student"
            firstUnreadId={firstUnreadId}
            hasMore={thread.hasMore}
            loadingMore={isFetching && limit > thread.messages.length}
            onLoadMore={() => setLimit((l) => l + CONVERSATION_PAGE)}
            empty={
              <div className="max-w-sm text-center flex flex-col items-center gap-2">
                <MessagesSquare className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('conversation.student.empty', 'Pas encore de message. Pose ta question à l’équipe CRE : ton conseiller est prévenu par e-mail et te répond ici.')}
                </p>
              </div>
            }
          />
        )}

        <MessageComposer
          placeholder={t('conversation.student.placeholder', 'Écris ton message…')}
          sending={send.isPending}
          onSend={(body) => send.mutateAsync(body).catch((err) => {
            toast.error(getApiErrorMessage(err, t('conversation.student.send_error', 'Ton message n’a pas pu être envoyé, réessaie.')));
            throw err;
          })}
        />
      </section>
    </div>
  );
}
