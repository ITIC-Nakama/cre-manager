import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import ScoreGauge from './ScoreGauge';
import type { StudentQuestion, StudentQuiz, QuizResult } from '../../../../types/models/Skill';

interface QuizResultViewProps {
  quiz: StudentQuiz;
  result: QuizResult | null;
  showAlreadyValidated: boolean;
  sortedQuestions: StudentQuestion[];
  selected: Record<string, Set<string>>;
  articlePath: string;
  categoryId: string;
  nextArticle: { id: string; titre: string } | null;
  handleRetry: () => void;
}

export default function QuizResultView({
  quiz,
  result,
  showAlreadyValidated,
  sortedQuestions,
  selected,
  articlePath,
  categoryId,
  nextArticle,
  handleRetry,
}: QuizResultViewProps) {
  const { t } = useTranslation();
  const correctCount = result?.questionResults.filter((r) => r.correct).length ?? 0;

  if (showAlreadyValidated) {
    return (
      <div className="animate-pop-in flex flex-col items-center gap-3 rounded-3xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-10 text-center">
        <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        </div>
        <p className="font-bold text-slate-900 dark:text-white">{t('dashboard.connaissances.quiz.already_validated')}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {t('dashboard.connaissances.quiz.already_validated_desc')}
        </p>
        <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
          <Link
            to={articlePath}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('dashboard.connaissances.quiz.reread_article')}
          </Link>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            {t('dashboard.connaissances.quiz.retry_quiz')}
          </button>
          {nextArticle && (
            <Link
              to={`/student/connaissances/${categoryId}/${nextArticle.id}`}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm hover:shadow-md"
            >
              {t('dashboard.connaissances.article.next_article')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="animate-pop-in flex flex-col gap-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <ScoreGauge score={result.score} passed={result.passed} />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t('dashboard.connaissances.quiz.correct_count', { correct: correctCount, total: sortedQuestions.length })}
        </p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">
          {result.passed ? t('dashboard.connaissances.quiz.success_title') : t('dashboard.connaissances.quiz.fail_title')}
        </p>
        {result.passed ? (
          result.dejaValide ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('dashboard.connaissances.quiz.already_validated_no_xp')}
            </p>
          ) : (
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {t('dashboard.connaissances.quiz.success_xp', { xp: result.xpAwarded })}
            </p>
          )
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.connaissances.quiz.fail_score', { score: result.score, min: quiz.scoreMinimum })}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {sortedQuestions.map((q, idx) => {
          const qResult = result.questionResults.find((r) => r.questionId === q.id);
          const correct = qResult?.correct ?? false;
          const correctIds = new Set(qResult?.correctAnswerIds ?? []);
          const studentIds = selected[q.id] ?? new Set<string>();
          return (
            <div
              key={q.id}
              className={`animate-fade-in-up rounded-xl border px-4 py-3 ${
                correct
                  ? 'border-slate-200 dark:border-slate-800'
                  : 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/10'
              }`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-start gap-3">
                <span className="animate-check-pop flex-shrink-0 mt-0.5">
                  {correct ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4.5 w-4.5 text-red-500" />
                  )}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{q.texte}</p>
                  <span className={`text-xs font-semibold ${correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {correct
                      ? t('dashboard.connaissances.quiz.question_correct')
                      : t('dashboard.connaissances.quiz.question_incorrect')}
                  </span>
                </div>
              </div>

              {/* Detail des reponses — uniquement pour les questions ratees, pour ne pas
                * alourdir l'ecran avec ce qui est deja acquis (surtout sur mobile). */}
              {!correct && (
                <div className="mt-3 flex flex-col gap-1.5 pl-7">
                  {q.answers.map((a) => {
                    const isCorrectAnswer = correctIds.has(a.id);
                    const isStudentPick = studentIds.has(a.id);
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                          isCorrectAnswer
                            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                            : isStudentPick
                              ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                              : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isCorrectAnswer ? (
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        ) : isStudentPick ? (
                          <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        ) : (
                          <span className="h-3.5 w-3.5 flex-shrink-0" />
                        )}
                        <span className="flex-1 min-w-0">{a.texte}</span>
                        {isStudentPick && !isCorrectAnswer && (
                          <span className="text-[10px] font-bold uppercase tracking-wide flex-shrink-0">
                            {t('dashboard.connaissances.quiz.your_answer_badge')}
                          </span>
                        )}
                        {isCorrectAnswer && (
                          <span className="text-[10px] font-bold uppercase tracking-wide flex-shrink-0">
                            {t('dashboard.connaissances.quiz.correct_answer_badge')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {studentIds.size === 0 && (
                    <p className="text-xs italic text-slate-400 dark:text-slate-500">
                      {t('dashboard.connaissances.quiz.no_answer_given')}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 flex-wrap">
        <Link
          to={articlePath}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('dashboard.connaissances.quiz.reread_article')}
        </Link>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer w-full sm:w-auto justify-center"
        >
          <RotateCcw className="h-4 w-4" />
          {t('dashboard.connaissances.quiz.retry_quiz')}
        </button>
        {nextArticle && (
          <Link
            to={`/student/connaissances/${categoryId}/${nextArticle.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors w-full sm:w-auto justify-center shadow-sm cursor-pointer"
          >
            {t('dashboard.connaissances.article.next_article')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
