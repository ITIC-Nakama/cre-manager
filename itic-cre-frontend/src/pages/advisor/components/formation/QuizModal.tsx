import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, ArrowLeft, Save, Loader2, HelpCircle, Check, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { fetchQuizByArticle } from '../../../../api-s/requests/SkillRequest';
import type { Quiz, Question } from '../../../../types/models/Skill';

interface QuizModalProps {
  isOpen: boolean;
  articleId?: string;
  articleTitle?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (data: { scoreMinimum: number; questions: Omit<Question, 'id'>[] }, quizId?: string) => void;
  onDelete: (quizId: string) => void;
}

export default function QuizModal({
  isOpen,
  articleId,
  articleTitle,
  saving,
  onClose,
  onSave,
  onDelete
}: QuizModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [scoreMinimum, setScoreMinimum] = useState(80);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!isOpen || !articleId) return;

    const loadQuiz = async () => {
      setLoading(true);
      try {
        let q: Quiz | null = null;
        try {
          q = await fetchQuizByArticle(articleId);
        } catch (err: any) {
          if (err.response?.status !== 404) {
            throw err;
          }
        }

        if (q) {
          setQuiz(q);
          setScoreMinimum(q.scoreMinimum ?? 80);
          setQuestions(q.questions || []);
        } else {
          setQuiz(null);
          setScoreMinimum(80);
          setQuestions([
            {
              texte: t('dashboard.formation.default_first_question'),
              ordre: 1,
              answers: [
                { texte: t('dashboard.formation.default_option_a'), estCorrecte: true },
                { texte: t('dashboard.formation.default_option_b'), estCorrecte: false }
              ]
            }
          ]);
        }
      } catch (err) {
        console.error(err);
        toast.error(t('dashboard.formation.toast_quiz_load_error'));
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [isOpen, articleId, onClose, t]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    const nextOrdre = questions.length > 0 
      ? Math.max(...questions.map(q => q.ordre)) + 1 
      : 1;

    const newQuestion: Question = {
      texte: t('dashboard.formation.default_new_question'),
      ordre: nextOrdre,
      answers: [
        { texte: t('dashboard.formation.default_option_1'), estCorrecte: true },
        { texte: t('dashboard.formation.default_option_2'), estCorrecte: false }
      ]
    };

    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    const updatedWithOrder = updated.map((q, idx) => ({
      ...q,
      ordre: idx + 1
    }));
    setQuestions(updatedWithOrder);
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].texte = text;
    setQuestions(updated);
  };

  const handleAddAnswer = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].answers.push({ texte: t('dashboard.formation.default_new_option'), estCorrecte: false });
    setQuestions(updated);
  };

  const handleRemoveAnswer = (qIndex: number, aIndex: number) => {
    const updated = [...questions];
    updated[qIndex].answers.splice(aIndex, 1);
    const hasCorrect = updated[qIndex].answers.some(a => a.estCorrecte);
    if (!hasCorrect && updated[qIndex].answers.length > 0) {
      updated[qIndex].answers[0].estCorrecte = true;
    }
    setQuestions(updated);
  };

  const handleAnswerTextChange = (qIndex: number, aIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].answers[aIndex].texte = text;
    setQuestions(updated);
  };

  const handleToggleCorrectAnswer = (qIndex: number, aIndex: number) => {
    const updated = [...questions];
    updated[qIndex].answers = updated[qIndex].answers.map((ans, idx) =>
      idx === aIndex ? { ...ans, estCorrecte: !ans.estCorrecte } : ans
    );
    setQuestions(updated);
  };

  const handleSave = () => {
    if (questions.length === 0) {
      toast.error(t('dashboard.formation.toast_quiz_min_questions'));
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.texte.trim()) {
        toast.error(t('dashboard.formation.toast_question_no_text', { num: i + 1 }));
        return;
      }
      if (q.texte.length > 500) {
        toast.error(t('dashboard.formation.toast_question_too_long', `La question ${i + 1} ne doit pas dépasser 500 caractères`));
        return;
      }
      if (q.answers.length < 2) {
        toast.error(t('dashboard.formation.toast_question_min_options', { num: i + 1 }));
        return;
      }
      const hasCorrect = q.answers.some(a => a.estCorrecte);
      if (!hasCorrect) {
        toast.error(t('dashboard.formation.toast_question_no_correct', { num: i + 1 }));
        return;
      }
      const anyEmpty = q.answers.some(a => !a.texte.trim());
      if (anyEmpty) {
        toast.error(t('dashboard.formation.toast_question_empty_options', { num: i + 1 }));
        return;
      }
      const anyTooLong = q.answers.some(a => a.texte.length > 255);
      if (anyTooLong) {
        toast.error(t('dashboard.formation.toast_question_option_too_long', `Une option de la question ${i + 1} ne doit pas dépasser 255 caractères`));
        return;
      }
    }

    const payload = {
      scoreMinimum,
      questions: questions.map(q => ({
        texte: q.texte,
        ordre: q.ordre,
        answers: q.answers.map(a => ({
          texte: a.texte,
          estCorrecte: a.estCorrecte
        }))
      }))
    };

    onSave(payload, quiz?.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 overflow-y-auto animate-fadeIn flex flex-col">
      {/* Header bar */}
      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {quiz ? t('dashboard.formation.modal_edit_quiz') : t('dashboard.formation.modal_create_quiz')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.formation.label_article_prefix')} <span className="font-semibold text-indigo-600 dark:text-indigo-400">{articleTitle}</span>
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {quiz && (
            <button
              onClick={() => onDelete(quiz.id)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 px-4 py-2 text-sm font-semibold transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              {t('dashboard.formation.btn_delete_quiz')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-white" />}
            {t('dashboard.formation.btn_save_quiz')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm">{t('dashboard.formation.loading')}</p>
        </div>
      ) : (
        /* Form Content */
        <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
          
          {/* Settings Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-500" />
              {t('dashboard.formation.general_config')}
            </h4>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('dashboard.formation.min_score')}
                </label>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t('dashboard.formation.min_score_desc')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={scoreMinimum}
                  onChange={(e) => setScoreMinimum(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  disabled={saving}
                  className="w-20 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
          </div>

          {/* Questions list */}
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-indigo-500" />
                {t('dashboard.formation.questions_count', { count: questions.length })}
              </h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('dashboard.formation.btn_add_question')}
              </button>
            </div>

            {questions.map((question, qIdx) => (
              <div 
                key={qIdx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col gap-4 relative group"
              >
                {/* Delete Question Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIdx)}
                  disabled={saving}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('dashboard.formation.btn_delete_question')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                    {qIdx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={500}
                    value={question.texte}
                    onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                    placeholder={t('dashboard.formation.placeholder_question_text')}
                    disabled={saving}
                    className="flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-600 py-1 font-bold text-slate-800 dark:text-slate-100 focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Answers section */}
                <div className="pl-10 flex flex-col gap-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t('dashboard.formation.label_answers_options')} <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="flex flex-col gap-2">
                    {question.answers.map((answer, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-3 group/ans">
                        
                        {/* Checkbox for correct selection — multiple answers can be marked correct */}
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleToggleCorrectAnswer(qIdx, aIdx)}
                          title={t('dashboard.formation.label_mark_correct')}
                          className={`flex items-center justify-center h-5 w-5 rounded-md border transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                            answer.estCorrecte
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500'
                          }`}
                        >
                          {answer.estCorrecte && <Check className="h-3 w-3 stroke-[3]" />}
                        </button>

                        {/* Option text input */}
                        <input
                          type="text"
                          required
                          maxLength={255}
                          value={answer.texte}
                          onChange={(e) => handleAnswerTextChange(qIdx, aIdx, e.target.value)}
                          placeholder={t('dashboard.formation.placeholder_answer_text', { num: aIdx + 1 })}
                          disabled={saving}
                          className={`flex-1 rounded-xl border px-3.5 py-1.5 text-sm focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                            answer.estCorrecte
                              ? 'border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/10 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-300'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/50 dark:text-slate-100'
                          }`}
                        />

                        {/* Delete option button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveAnswer(qIdx, aIdx)}
                          disabled={question.answers.length <= 2 || saving}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-0 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>

                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddAnswer(qIdx)}
                    disabled={saving}
                    className="self-start inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3 w-3" />
                    {t('dashboard.formation.btn_add_option')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddQuestion}
            disabled={saving}
            className="py-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-6 w-6" />
            <span className="font-bold text-sm">{t('dashboard.formation.btn_add_question_dashed')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
