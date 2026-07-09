import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Loader2, Trophy, RotateCcw, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentQuiz, useSubmitQuiz } from '../../../../hooks/useSkills';
import type { QuizResult } from '../../../../types/models/Skill';

interface QuizSectionProps {
  articleId: string;
}

export default function QuizSection({ articleId }: QuizSectionProps) {
  const { t } = useTranslation();
  const { data: quiz, isLoading, isError } = useStudentQuiz(articleId);
  const { mutate: submit, isPending } = useSubmitQuiz();

  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [retrying, setRetrying] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (isError || !quiz) return null;

  // ── Already validated banner ─────────────────────────────────────────────────
  if ((quiz.dejaValide || result?.passed) && !retrying) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">
              {t('dashboard.connaissances.quiz.already_validated')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setRetrying(true); setSelected({}); setResult(null); }}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('dashboard.connaissances.quiz.retry_quiz')}
          </button>
        </div>
        {result && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            {result.xpAwarded > 0 ? (
              <><Trophy className="h-4 w-4" />{t('dashboard.connaissances.quiz.success_xp', { xp: result.xpAwarded })}</>
            ) : (
              t('dashboard.connaissances.quiz.already_validated_no_xp')
            )}
          </p>
        )}
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const toggle = (questionId: string, answerId: string, type: 'SINGLE' | 'MULTIPLE') => {
    setSelected(prev => {
      if (type === 'SINGLE') return { ...prev, [questionId]: new Set([answerId]) };
      const cur = new Set(prev[questionId] ?? []);
      if (cur.has(answerId)) cur.delete(answerId); else cur.add(answerId);
      return { ...prev, [questionId]: cur };
    });
  };

  const answered = quiz.questions.filter(q => (selected[q.id]?.size ?? 0) > 0).length;
  const allAnswered = answered === quiz.questions.length;

  const handleSubmit = () => {
    if (!allAnswered || isPending) return;
    submit(
      {
        quizId: quiz.id,
        articleId,
        payload: {
          answers: quiz.questions.map(q => ({
            questionId: q.id,
            reponseIds: Array.from(selected[q.id] ?? []),
          })),
        },
      },
      {
        onSuccess: (res) => { setResult(res); setRetrying(false); },
        onError: () => toast.error(t('dashboard.connaissances.quiz.submit_error')),
      }
    );
  };

  // ── Result banner ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className={`border rounded-2xl p-5 flex flex-col gap-4 ${
        result.passed
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
          : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-start gap-2.5">
          {result.passed
            ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />}
          <div className="flex flex-col gap-0.5">
            <p className={`font-semibold ${result.passed ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
              {result.passed
                ? t('dashboard.connaissances.quiz.success_title')
                : t('dashboard.connaissances.quiz.fail_title')}
            </p>
            <p className={`text-sm ${result.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {result.passed
                ? result.xpAwarded > 0
                  ? t('dashboard.connaissances.quiz.success_xp', { xp: result.xpAwarded })
                  : t('dashboard.connaissances.quiz.already_validated_no_xp')
                : t('dashboard.connaissances.quiz.fail_score', { score: result.score, min: quiz.scoreMinimum })}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {quiz.questions.map((q, qi) => {
            const qr = result.questionResults.find(r => r.questionId === q.id);
            return (
              <div key={q.id} className="flex items-start gap-2 text-sm">
                {qr?.correct
                  ? <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />}
                <span className={qr?.correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                  {qi + 1}. {q.texte}
                </span>
              </div>
            );
          })}
        </div>

        {!result.passed && (
          <button
            type="button"
            onClick={() => { setResult(null); setSelected({}); }}
            className="self-start flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('dashboard.connaissances.quiz.retry')}
          </button>
        )}
      </div>
    );
  }

  // ── Quiz form ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          {t('dashboard.connaissances.quiz.title')}
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{t('dashboard.connaissances.quiz.questions_answered', { answered, total: quiz.questions.length })}</span>
          <span>·</span>
          <span>{t('dashboard.connaissances.quiz.min_score_label', { min: quiz.scoreMinimum })}</span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6">
        {quiz.questions.map((q, qi) => {
          const type = q.type ?? 'SINGLE';
          const sel = selected[q.id] ?? new Set<string>();
          return (
            <div key={q.id} className="flex flex-col gap-2.5">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-600 mt-0.5 min-w-4">{qi + 1}.</span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{q.texte}</p>
                  {type === 'MULTIPLE' && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {t('dashboard.connaissances.quiz.type_multiple')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 pl-6">
                {q.answers.map(a => {
                  const checked = sel.has(a.id);
                  const isRound = type === 'SINGLE';
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggle(q.id, a.id, type)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm text-left transition-colors ${
                        checked
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className={`flex-shrink-0 h-4 w-4 border-2 flex items-center justify-center transition-colors ${
                        isRound ? 'rounded-full' : 'rounded-md'
                      } ${checked ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                        {checked && (
                          <span className={`bg-white ${isRound ? 'h-1.5 w-1.5 rounded-full' : 'h-2 w-2 rounded-sm'}`} />
                        )}
                      </span>
                      {a.texte}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered || isPending}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending
              ? t('dashboard.connaissances.quiz.submitting')
              : t('dashboard.connaissances.quiz.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
