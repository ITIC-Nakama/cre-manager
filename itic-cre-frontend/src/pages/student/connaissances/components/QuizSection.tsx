import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useStudentQuiz, useSubmitQuiz } from '../../../../hooks/useSkills';
import type { QuizResult } from '../../../../types/models/Skill';

export default function QuizSection({ articleId }: { articleId: string }) {
  const { t } = useTranslation();
  const { data: quiz, isLoading, isError } = useStudentQuiz(articleId);
  const submitMutation = useSubmitQuiz();

  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const sortedQuestions = useMemo(
    () => (quiz?.questions ? [...quiz.questions].sort((a, b) => a.ordre - b.ordre) : []),
    [quiz]
  );

  const toggleAnswer = (questionId: string, answerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev[questionId] ?? []);
      if (next.has(answerId)) next.delete(answerId);
      else next.add(answerId);
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    const payload = {
      answers: sortedQuestions.map((q) => ({
        questionId: q.id,
        reponseIds: Array.from(selected[q.id] ?? []),
      })),
    };
    try {
      const res = await submitMutation.mutateAsync({ quizId: quiz.id, articleId, payload });
      setResult(res);
    } catch {
      toast.error(t('dashboard.connaissances.quiz.submit_error'));
    }
  };

  const handleRetry = () => {
    setResult(null);
    setSelected({});
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (isError || !quiz) {
    return (
      <div className="text-sm text-slate-400 text-center py-8">
        {t('dashboard.connaissances.quiz.load_error')}
      </div>
    );
  }

  const allAnswered = sortedQuestions.every((q) => (selected[q.id]?.size ?? 0) > 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('dashboard.connaissances.quiz.title')}
        </h2>
        <span className="text-xs text-slate-400">
          {t('dashboard.connaissances.quiz.min_score_info', { min: quiz.scoreMinimum })}
        </span>
      </div>

      {!result && quiz.dejaValide ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          {t('dashboard.connaissances.quiz.already_validated')}
        </div>
      ) : result ? (
        result.passed ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white">{t('dashboard.connaissances.quiz.success_title')}</p>
            {result.dejaValide ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('dashboard.connaissances.quiz.already_validated_no_xp')}
              </p>
            ) : (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {t('dashboard.connaissances.quiz.success_xp', { xp: result.xpAwarded })}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white">{t('dashboard.connaissances.quiz.fail_title')}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('dashboard.connaissances.quiz.fail_score', { score: result.score, min: quiz.scoreMinimum })}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {t('dashboard.connaissances.quiz.retry')}
            </button>
          </div>
        )
      ) : (
        <>
          <div className="flex flex-col gap-5">
            {sortedQuestions.map((question, qIdx) => (
              <div key={question.id} className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {qIdx + 1}. {question.texte}
                </p>
                <div className="flex flex-col gap-1.5">
                  {question.answers.map((answer) => (
                    <label
                      key={answer.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selected[question.id]?.has(answer.id) ?? false}
                        onChange={() => toggleAnswer(question.id, answer.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{answer.texte}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered || submitMutation.isPending}
            className="self-start px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitMutation.isPending ? t('dashboard.connaissances.quiz.submitting') : t('dashboard.connaissances.quiz.submit')}
          </button>
        </>
      )}
    </div>
  );
}
