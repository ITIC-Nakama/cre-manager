import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Plus, Award, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  useGamificationConfigs,
  useUpdateGamificationConfig,
  useGrades,
  useCreateGrade,
  useUpdateGrade,
  useDeleteGrade,
} from '../../hooks/useGamification';

import type { Grade } from '../../types/models/Gamification';

import ConfirmDialog from '../../components/shared/ConfirmDialog';
import ConfigRow from './components/gamification/ConfigRow';
import GradeCard from './components/gamification/GradeCard';
import GradeModal from './components/gamification/GradeModal';

export default function GamificationPage() {
  const { t } = useTranslation();

  const { data: configs = [], isLoading: loadingConfigs } = useGamificationConfigs();
  const { data: grades = [], isLoading: loadingGrades } = useGrades();
  const loading = loadingConfigs || loadingGrades;

  const updateConfigMutation = useUpdateGamificationConfig();
  const createGradeMutation = useCreateGrade();
  const updateGradeMutation = useUpdateGrade();
  const deleteGradeMutation = useDeleteGrade();

  const [savingConfigId, setSavingConfigId] = useState<string | null>(null);
  const [gradeModal, setGradeModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; grade?: Grade }>({
    isOpen: false,
    mode: 'create',
  });
  const [saving, setSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openConfirm = (title: string, message: string, onConfirm: () => Promise<void>) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };
  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  const handleConfirm = async () => {
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
      closeConfirm();
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSaveConfig = async (id: string, data: { valeurXP: number; active: boolean }) => {
    setSavingConfigId(id);
    try {
      await updateConfigMutation.mutateAsync({ id, data });
      toast.success(t('dashboard.gamification.toast_config_updated'));
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.gamification.toast_config_save_error'));
    } finally {
      setSavingConfigId(null);
    }
  };

  const handleSaveGrade = async (data: { nom: string; xpMinimum: number; ordre: number; icone: string }) => {
    setSaving(true);
    try {
      if (gradeModal.mode === 'create') {
        await createGradeMutation.mutateAsync(data);
        toast.success(t('dashboard.gamification.toast_grade_created'));
      } else if (gradeModal.mode === 'edit' && gradeModal.grade) {
        await updateGradeMutation.mutateAsync({ id: gradeModal.grade.id, data });
        toast.success(t('dashboard.gamification.toast_grade_updated'));
      }
      setGradeModal({ isOpen: false, mode: 'create' });
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.messageKey === 'grade-name-already-exists') {
        toast.error(t('dashboard.gamification.toast_grade_name_exists'));
      } else {
        toast.error(t('dashboard.gamification.toast_grade_save_error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGrade = (gradeId: string, name: string) => {
    openConfirm(
      t('dashboard.gamification.confirm_delete_grade_title'),
      t('dashboard.gamification.confirm_delete_grade', { name }),
      async () => {
        try {
          await deleteGradeMutation.mutateAsync(gradeId);
          toast.success(t('dashboard.gamification.toast_grade_deleted'));
        } catch (err) {
          console.error(err);
          toast.error(t('dashboard.gamification.toast_grade_delete_error'));
        }
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            {t('dashboard.gamification.title')}
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
              {t('dashboard.gamification.badge')}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.gamification.subtitle')}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm">{t('dashboard.gamification.loading')}</p>
        </div>
      )}

      {!loading && (
        <>
          {/* XP Configuration Section */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.gamification.config_section_title')}</h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('dashboard.gamification.config_section_desc')}</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950/50">
                    <th className="py-3 px-6">{t('dashboard.gamification.col_action')}</th>
                    <th className="py-3 px-6">{t('dashboard.gamification.col_xp_value')}</th>
                    <th className="py-3 px-6">{t('dashboard.gamification.col_status')}</th>
                    <th className="py-3 px-6 text-right">{t('dashboard.gamification.col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {configs.map((config) => (
                    <ConfigRow
                      key={config.id}
                      config={config}
                      saving={savingConfigId === config.id}
                      onSave={handleSaveConfig}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grades Section */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm p-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.gamification.grades_section_title')}</h2>
              </div>
              <button
                onClick={() => setGradeModal({ isOpen: true, mode: 'create' })}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {t('dashboard.gamification.create_grade')}
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('dashboard.gamification.grades_section_desc')}</p>

            {grades.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-base font-semibold">{t('dashboard.gamification.no_grades')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {grades.map((grade) => (
                  <GradeCard
                    key={grade.id}
                    grade={grade}
                    onEdit={(g) => setGradeModal({ isOpen: true, mode: 'edit', grade: g })}
                    onDelete={handleDeleteGrade}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <GradeModal
        isOpen={gradeModal.isOpen}
        mode={gradeModal.mode}
        grade={gradeModal.grade}
        saving={saving}
        initialOrder={grades.length > 0 ? Math.max(...grades.map((g) => g.ordre)) + 1 : 1}
        onClose={() => setGradeModal({ isOpen: false, mode: 'create' })}
        onSave={handleSaveGrade}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onClose={closeConfirm}
      />

    </div>
  );
}
