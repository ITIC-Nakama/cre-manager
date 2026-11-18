import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronDown, Loader2, Lock, Star } from 'lucide-react';
import { useRateStudent, useStudentRatings } from '../../hooks/useStudentRatings';
import { useFormDraft } from '../../hooks/useFormDraft';

const COMMENT_MAX = 1000;

/** Étoiles 1 à 5 (lecture seule). */
export function RatingStars({ score, size = 'h-3.5 w-3.5' }: { score: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star key={v} className={`${size} ${v <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
      ))}
    </span>
  );
}

/**
 * Note de l'étudiant (fiche étudiant, équipe seulement) : note de 1 à 5 + commentaire facultatif, historisée (qui, quand).
 * La dernière note sert à la colonne et au filtre « note minimale » de la liste.
 */
export default function StudentRatingSection({ studentId }: { studentId: string }) {
  const { t, i18n } = useTranslation();
  const { data: history = [], isLoading } = useStudentRatings(studentId);
  const rate = useRateStudent(studentId);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [showAll, setShowAll] = useState(false);
  const draft = useFormDraft(`note:${studentId}`, comment, '');

  const save = async () => {
    if (!score) return;
    try {
      await rate.mutateAsync({ score, comment: comment.trim() || undefined });
      draft.clear();
      setScore(null);
      setComment('');
      toast.success(t('dashboard.etudiants.rating.saved', 'Note enregistrée.'));
    } catch {
      toast.error(t('dashboard.etudiants.rating.error', 'La note n’a pas pu être enregistrée.'));
    }
  };

  const shown = showAll ? history : history.slice(0, 3);
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <section className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-3"
      aria-label={t('dashboard.etudiants.rating.title', 'Note de l’équipe')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-400" />
          {t('dashboard.etudiants.rating.title', 'Note de l’équipe')}
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
          <Lock className="h-3 w-3" />
          {t('dashboard.etudiants.rating.private', 'Jamais visible par l’étudiant')}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1" role="radiogroup" aria-label={t('dashboard.etudiants.rating.pick', 'Note de 1 à 5')}>
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} type="button" role="radio" aria-checked={score === v}
              aria-label={t('dashboard.etudiants.rating.value', { count: v, defaultValue: '{{count}} sur 5' })}
              onClick={() => setScore(v)} className="p-0.5 cursor-pointer">
              <Star className={`h-6 w-6 transition-colors ${score !== null && v <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'}`} />
            </button>
          ))}
          {score !== null && <span className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{score}/5</span>}
        </div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={COMMENT_MAX} rows={2}
          placeholder={t('dashboard.etudiants.rating.comment_placeholder', 'Commentaire (facultatif) : motivation, entretien, savoir-être…')}
          className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        {draft.pending && (
          <button type="button" onClick={() => { const v = draft.restore(); if (v !== null) setComment(v); }}
            className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer">
            {t('drafts.restore_comment', 'Reprendre le commentaire non enregistré')}
          </button>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={save} disabled={!score || rate.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {rate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('dashboard.etudiants.rating.save', 'Enregistrer la note')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : history.length === 0 ? (
        <p className="text-xs text-slate-400">{t('dashboard.etudiants.rating.none', 'Pas encore noté.')}</p>
      ) : (
        <ol className="space-y-2" aria-label={t('dashboard.etudiants.rating.history', 'Historique des notes')}>
          {shown.map((r) => (
            <li key={r.id} className="text-xs border-t border-slate-100 dark:border-slate-800 pt-2 first:border-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <RatingStars score={r.score} />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{r.score}/5</span>
                <span className="text-slate-400">
                  {r.formerStaff ? t('conversation.common.former_staff', 'Compte supprimé') : r.authorName} · {formatDate(r.createdAt)}
                </span>
              </div>
              {r.comment && <p className="mt-0.5 text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{r.comment}</p>}
            </li>
          ))}
          {history.length > 3 && (
            <li>
              <button type="button" onClick={() => setShowAll((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer">
                <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                {showAll ? t('dashboard.etudiants.rating.less', 'Moins') : t('dashboard.etudiants.rating.more', { count: history.length - 3, defaultValue: '{{count}} note(s) plus ancienne(s)' })}
              </button>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}
