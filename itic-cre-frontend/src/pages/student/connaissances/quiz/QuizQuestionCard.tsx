import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import type { StudentQuestion } from '../../../../types/models/Skill';

interface QuizQuestionCardProps {
  currentQuestion: StudentQuestion;
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
  direction: 'forward' | 'back';
  selected: Record<string, Set<string>>;
  currentAnswered: boolean;
  isLastQuestion: boolean;
  isSubmitting: boolean;
  toggleAnswer: (answerId: string) => void;
  handlePrevious: () => void;
  handleNext: () => void;
}

export default function QuizQuestionCard({
  currentQuestion,
  currentIndex,
  totalQuestions,
  answeredCount,
  direction,
  selected,
  currentAnswered,
  isLastQuestion,
  isSubmitting,
  toggleAnswer,
  handlePrevious,
  handleNext,
}: QuizQuestionCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5">
      {/* Progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{t('dashboard.connaissances.quiz.questions_answered', { answered: answeredCount, total: totalQuestions })}</span>
          <span>{currentIndex + 1} / {totalQuestions}</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: totalQuestions }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                idx === currentIndex
                  ? 'bg-indigo-600'
                  : idx < answeredCount
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
            {t('dashboard.connaissances.quiz.title')} · {currentIndex + 1}/{totalQuestions}
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
            const isChecked = (currentQuestion.id ? selected[currentQuestion.id] : undefined)?.has(answer.id) ?? false;
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
          disabled={!currentAnswered || isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLastQuestion
            ? (isSubmitting ? t('dashboard.connaissances.quiz.submitting') : t('dashboard.connaissances.quiz.submit'))
            : t('dashboard.connaissances.quiz.next')}
          {!isLastQuestion && <ArrowRight className="h-4 w-4" />}
          {isLastQuestion && !isSubmitting && <Sparkles className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
