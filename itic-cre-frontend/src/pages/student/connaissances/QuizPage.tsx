import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useStudentArticle, useStudentQuiz, useSubmitQuiz } from '../../../hooks/useSkills';
import type { QuizResult } from '../../../types/models/Skill';
import Breadcrumb from './components/Breadcrumb';

function ScoreGauge({ score, passed }: { score: number; passed: boolean }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(score));
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;

  return (
    <div className="relative h-36 w-36 flex-shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx={60} cy={60} r={radius} fill="none" strokeWidth={10} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
        <circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={passed ? 'text-emerald-500' : 'text-red-500'}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{score}%</span>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const { t } = useTranslation();
  const { categoryId = '', articleId = '' } = useParams<{ categoryId: string; articleId: string }>();

  const { data: article } = useStudentArticle(articleId);
  const { data: quiz, isLoading, isError } = useStudentQuiz(articleId);
  const submitMutation = useSubmitQuiz();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attempting, setAttempting] = useState(false);

  const sortedQuestions = useMemo(
    () => (quiz?.questions ? [...quiz.questions].sort((a, b) => a.ordre - b.ordre) : []),
    [quiz]
  );

  const currentQuestion = sortedQuestions[currentIndex];
  const isLastQuestion = currentIndex === sortedQuestions.length - 1;
  const answeredCount = sortedQuestions.filter((q) => (selected[q.id]?.size ?? 0) > 0).length;
  const currentAnswered = currentQuestion ? (selected[currentQuestion.id]?.size ?? 0) > 0 : false;

  const articlePath = `/student/connaissances/${categoryId}/${articleId}`;

  const toggleAnswer = (answerId: string) => {
    if (!currentQuestion) return;
    setSelected((prev) => {
      const next = new Set(prev[currentQuestion.id] ?? []);
      if (currentQuestion.type === 'SINGLE') {
        return { ...prev, [currentQuestion.id]: new Set([answerId]) };
      }
      if (next.has(answerId)) next.delete(answerId);
      else next.add(answerId);
      return { ...prev, [currentQuestion.id]: next };
    });
  };

  const handlePrevious = () => {
    if (currentIndex === 0) return;
    setDirection('back');
    setCurrentIndex((i) => i - 1);
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

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit();
      return;
    }
    setDirection('forward');
    setCurrentIndex((i) => i + 1);
  };

  const handleRetry = () => {
    setResult(null);
    setSelected({});
    setCurrentIndex(0);
    setDirection('forward');
    setAttempting(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (isError || !quiz) {
    return (
      <div className="flex justify-center py-24 text-sm text-slate-400">
        {t('dashboard.connaissances.quiz.load_error')}
      </div>
    );
  }

  const showAlreadyValidated = quiz.dejaValide && !attempting && !result;
  const correctCount = result?.questionResults.filter((r) => r.correct).length ?? 0;

  return (
    <div className="flex flex-col gap-6 pb-16 max-w-2xl mx-auto animate-fade-in-up">
      <Breadcrumb
        items={[
          { label: t('dashboard.connaissances.category.breadcrumb_root'), to: '/student/connaissances' },
          { label: article?.categoryNom ?? '…', to: `/student/connaissances/${categoryId}` },
          { label: article?.titre ?? '…', to: articlePath },
          { label: t('dashboard.connaissances.quiz.title') },
        ]}
      />

      {/* Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-violet-950/20 p-6 sm:p-8 flex flex-col gap-2 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('dashboard.connaissances.quiz.title')}
        </h1>
        {article && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.connaissances.quiz.article_label', { title: article.titre })}
          </p>
        )}
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
          {t('dashboard.connaissances.quiz.min_score_label', { min: quiz.scoreMinimum })}
        </span>
      </div>

      {showAlreadyValidated ? (
        <div className="animate-pop-in flex flex-col items-center gap-3 rounded-3xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-10 text-center">
          <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <p className="font-bold text-slate-900 dark:text-white">{t('dashboard.connaissances.quiz.already_validated')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {t('dashboard.connaissances.quiz.already_validated_desc')}
          </p>
          <div className="flex items-center gap-3 mt-2">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              {t('dashboard.connaissances.quiz.retry_quiz')}
            </button>
          </div>
        </div>
      ) : result ? (
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
              return (
                <div
                  key={q.id}
                  className="animate-fade-in-up flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <span className="animate-check-pop flex-shrink-0 mt-0.5">
                    {correct ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4.5 w-4.5 text-red-500" />
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{q.texte}</p>
                    <span className={`text-xs font-semibold ${correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {correct
                        ? t('dashboard.connaissances.quiz.question_correct')
                        : t('dashboard.connaissances.quiz.question_incorrect')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to={articlePath}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('dashboard.connaissances.quiz.reread_article')}
            </Link>
            {!result.passed && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer w-full sm:w-auto justify-center"
              >
                <RotateCcw className="h-4 w-4" />
                {t('dashboard.connaissances.quiz.retry_quiz')}
              </button>
            )}
          </div>
        </div>
      ) : currentQuestion ? (
        <div className="flex flex-col gap-5">
          {/* Progress */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>{t('dashboard.connaissances.quiz.questions_answered', { answered: answeredCount, total: sortedQuestions.length })}</span>
              <span>{currentIndex + 1} / {sortedQuestions.length}</span>
            </div>
            <div className="flex gap-1.5">
              {sortedQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    idx === currentIndex
                      ? 'bg-indigo-600'
                      : (selected[q.id]?.size ?? 0) > 0
                        ? 'bg-indigo-300 dark:bg-indigo-800'
                        : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Question card */}
          <div
            key={currentQuestion.id}
            className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm flex flex-col gap-5 ${
              direction === 'forward' ? 'animate-question-forward' : 'animate-question-back'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {t('dashboard.connaissances.quiz.title')} · {currentIndex + 1}/{sortedQuestions.length}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {currentQuestion.type === 'SINGLE'
                  ? t('dashboard.connaissances.quiz.type_single')
                  : t('dashboard.connaissances.quiz.type_multiple')}
              </span>
            </div>

            <p className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
              {currentQuestion.texte}
            </p>

            <div className="flex flex-col gap-2.5">
              {currentQuestion.answers.map((answer) => {
                const isChecked = selected[currentQuestion.id]?.has(answer.id) ?? false;
                return (
                  <label
                    key={answer.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 dark:border-indigo-600'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type={currentQuestion.type === 'SINGLE' ? 'radio' : 'checkbox'}
                      name={currentQuestion.id}
                      checked={isChecked}
                      onChange={() => toggleAnswer(answer.id)}
                      className="h-4 w-4 flex-shrink-0 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{answer.texte}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('dashboard.connaissances.quiz.previous')}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!currentAnswered || submitMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLastQuestion
                ? (submitMutation.isPending ? t('dashboard.connaissances.quiz.submitting') : t('dashboard.connaissances.quiz.submit'))
                : t('dashboard.connaissances.quiz.next')}
              {!isLastQuestion && <ArrowRight className="h-4 w-4" />}
              {isLastQuestion && !submitMutation.isPending && <Sparkles className="h-4 w-4" />}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
