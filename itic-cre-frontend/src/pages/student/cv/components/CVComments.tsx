import { MessageSquare } from 'lucide-react';
import type { CVComment } from '../../../../types/models/CV';
import { useTranslation } from 'react-i18next';

interface Props {
  comments: CVComment[];
}

function formatCommentDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CVComments({ comments }: Props) {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-400" />
          {t('studentCv.comments.title', 'Retours du conseiller')}
        </h3>
        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          {comments.length}
        </span>
      </div>

      {/* Contenu */}
      {comments.length === 0 ? (
        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center gap-2">
          <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('studentCv.comments.empty', 'Aucun commentaire pour le moment.')}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t('studentCv.comments.emptyDesc', 'Votre conseiller vous informera de ses retours ici.')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1">
          {comments.map((comment) => {
            const advisorName = comment.advisor
              ? `${comment.advisor.firstName} ${comment.advisor.lastName}`
              : t('studentCv.comments.fallbackAdvisor', 'Conseiller');
            const initials = comment.advisor
              ? `${comment.advisor.firstName[0]}${comment.advisor.lastName[0]}`.toUpperCase()
              : 'C';

            return (
              <div
                key={comment.id}
                className="flex gap-3.5 p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-xl animate-fadeIn"
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm shadow-indigo-500/10">
                  {initials}
                </div>

                {/* Texte du commentaire & Métadonnées */}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {advisorName}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatCommentDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words whitespace-pre-line">
                    {comment.contenu}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
