import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useStudentArticle,
  useStudentArticlesByCategory,
  useStudentQuiz,
  useSubmitQuiz,
} from '../../../hooks/useSkills';
import type { QuizResult } from '../../../types/models/Skill';
import Breadcrumb from './components/Breadcrumb';
import QuizResultView from './quiz/QuizResultView';
import QuizQuestionCard from './quiz/QuizQuestionCard';

export default function QuizPage() {
  const { t } = useTranslation();
  const { categoryId = '', articleId = '' } = useParams<{ categoryId: string; articleId: string }>();

  const { data: article } = useStudentArticle(articleId);
  const { data: categoryArticles } = useStudentArticlesByCategory(categoryId);
  const { data: quiz, isLoading, isError } = useStudentQuiz(articleId);
  const submitMutation = useSubmitQuiz();

  const currentArticleIdx = categoryArticles?.findIndex((a) => a.id === articleId) ?? -1;
  const nextArticle = currentArticleIdx >= 0 && categoryArticles && currentArticleIdx < categoryArticles.length - 1
    ? categoryArticles[currentArticleIdx + 1]
    : null;

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
      <div className="flex flex-col gap-6 pb-16 max-w-2xl mx-auto animate-fadeIn">
        <div className="h-8 w-48 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-4 w-72 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col gap-4 animate-pulse">
          <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
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

      {showAlreadyValidated || result ? (
        <QuizResultView
          quiz={quiz}
          result={result}
          showAlreadyValidated={showAlreadyValidated}
          sortedQuestions={sortedQuestions}
          selected={selected}
          articlePath={articlePath}
          categoryId={categoryId}
          nextArticle={nextArticle}
          handleRetry={handleRetry}
        />
      ) : currentQuestion ? (
        <QuizQuestionCard
          currentQuestion={currentQuestion}
          currentIndex={currentIndex}
          totalQuestions={sortedQuestions.length}
          answeredCount={answeredCount}
          direction={direction}
          selected={selected}
          currentAnswered={currentAnswered}
          isLastQuestion={isLastQuestion}
          isSubmitting={submitMutation.isPending}
          toggleAnswer={toggleAnswer}
          handlePrevious={handlePrevious}
          handleNext={handleNext}
        />
      ) : null}
    </div>
  );
}
