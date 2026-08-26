import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { Trophy, Plus, Award, ListChecks, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';

import {
  useGamificationConfigs,
  useUpdateGamificationConfig,
  useGrades,
  useCreateGrade,
  useUpdateGrade,
  useDeleteGrade,
} from '../../../hooks/useGamification';
import { useApplicationStatuses, useUpdateApplicationStatus } from '../../../hooks/useApplications';
import { useCVStatuts, useUpdateCVStatutConfig } from '../../../hooks/useCV';

import type { Grade } from '../../../types/models/Gamification';

import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import ConfigRow from './components/ConfigRow';
import StatusXpRow from './components/StatusXpRow';
import GradeCard from './components/GradeCard';
import GradeModal from './components/GradeModal';

export default function GamificationPage() {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const isAdmin = user?.role === Role.ADMIN;

  const { data: configs, isLoading: loadingConfigs } = useGamificationConfigs();
  const updateConfigMutation = useUpdateGamificationConfig();

  const { data: appStatuses, isLoading: loadingAppStatuses } = useApplicationStatuses();
  const updateAppStatusMutation = useUpdateApplicationStatus();

  const { data: cvStatuts, isLoading: loadingCvStatuts } = useCVStatuts();
  const updateCvStatutMutation = useUpdateCVStatutConfig();

  const { data: grades, isLoading: loadingGrades } = useGrades();
  const createGradeMutation = useCreateGrade();
  const updateGradeMutation = useUpdateGrade();
  const deleteGradeMutation = useDeleteGrade();

  const [savingId, setSavingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedGrade, setSelectedGrade] = useState<Grade | undefined>(undefined);

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  });

  const handleSaveConfig = async (id: string, data: { valeurXP: number; active: boolean }) => {
    if (!isAdmin) return;
    setSavingId(id);
    try {
      await updateConfigMutation.mutateAsync({ id, data });
      toast.success(t('dashboard.gamification.toast_rule_updated'));
    } catch {
      toast.error(t('dashboard.gamification.toast_rule_update_error'));
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAppStatus = async (id: string, data: { gainXP: number }) => {
    if (!isAdmin) return;
    setSavingId(`app-${id}`);
    try {
      await updateAppStatusMutation.mutateAsync({ id, data: { gainXP: data.gainXP } });
      toast.success(t('dashboard.gamification.toast_status_xp_updated'));
    } catch {
      toast.error(t('dashboard.gamification.toast_status_xp_update_error'));
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveCvStatut = async (id: string, data: { gainXP: number }) => {
    if (!isAdmin) return;
    setSavingId(`cv-${id}`);
    try {
      await updateCvStatutMutation.mutateAsync({ id, data: { gainXP: data.gainXP } });
      toast.success(t('dashboard.gamification.toast_cv_xp_updated'));
    } catch {
      toast.error(t('dashboard.gamification.toast_cv_xp_update_error'));
    } finally {
      setSavingId(null);
    }
  };

  const handleOpenCreateModal = () => {
    if (!isAdmin) return;
    setModalMode('create');
    setSelectedGrade(undefined);
    setModalOpen(true);
  };

  const handleOpenEditModal = (grade: Grade) => {
    if (!isAdmin) return;
    setModalMode('edit');
    setSelectedGrade(grade);
    setModalOpen(true);
  };

  const handleSaveGrade = async (data: { nom: string; xpMinimum: number; ordre: number; icone: string }) => {
    if (!isAdmin) return;
    try {
      if (modalMode === 'create') {
        await createGradeMutation.mutateAsync(data);
        toast.success(t('dashboard.gamification.toast_grade_created'));
      } else if (selectedGrade) {
        await updateGradeMutation.mutateAsync({ id: selectedGrade.id, data });
        toast.success(t('dashboard.gamification.toast_grade_updated'));
      }
      setModalOpen(false);
    } catch {
      toast.error(t('dashboard.gamification.toast_grade_save_error'));
    }
  };

  const handleDeleteGradeConfirm = async () => {
    if (!isAdmin) return;
    try {
      await deleteGradeMutation.mutateAsync(deleteConfirm.id);
      toast.success(t('dashboard.gamification.toast_grade_deleted'));
      setDeleteConfirm({ open: false, id: '', name: '' });
    } catch {
      toast.error(t('dashboard.gamification.toast_grade_delete_error'));
    }
  };

  const sortedGrades = [...(grades ?? [])].sort((a, b) => a.ordre - b.ordre);
  const nextOrder = sortedGrades.length > 0 ? Math.max(...sortedGrades.map((g) => g.ordre)) + 1 : 1;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Trophy className="h-7 w-7 text-[#E2762F] shrink-0" />
          {renderTitleWithGradient(t('dashboard.gamification.title', 'Centre de Gamification'), 'itic-gradient-blue')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5">
          {t('dashboard.gamification.subtitle')}
        </p>
      </div>

      {/* SECTION 1 : Actions de base */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('dashboard.gamification.sec1_title')}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {loadingConfigs ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="h-4 flex-1 rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-4 w-10 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">{t('dashboard.gamification.th_action')}</th>
                    <th className="py-3.5 px-6">{t('dashboard.gamification.th_xp')}</th>
                    <th className="py-3.5 px-6">{t('dashboard.gamification.th_active')}</th>
                    {isAdmin && <th className="py-3.5 px-6 text-right">{t('dashboard.gamification.th_actions')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(configs ?? []).map((config) => (
                    <ConfigRow
                      key={config.id}
                      config={config}
                      saving={savingId === config.id}
                      onSave={handleSaveConfig}
                      readOnly={!isAdmin}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2 : Gains XP par statut */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Candidatures */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('dashboard.gamification.sec2_app_title')}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex-1">
            {loadingAppStatuses ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                    <div className="h-4 flex-1 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-4 w-12 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-6">{t('dashboard.gamification.th_status')}</th>
                      <th className="py-3.5 px-6">{t('dashboard.gamification.th_gain_xp')}</th>
                      {isAdmin && <th className="py-3.5 px-6 text-right">{t('dashboard.gamification.th_actions')}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {(appStatuses ?? []).map((st) => (
                      <StatusXpRow
                        key={st.id}
                        status={st}
                        saving={savingId === `app-${st.id}`}
                        onSave={handleSaveAppStatus}
                        readOnly={!isAdmin}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CV */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('dashboard.gamification.sec2_cv_title')}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex-1">
            {loadingCvStatuts ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                    <div className="h-4 flex-1 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-4 w-12 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-6">{t('dashboard.gamification.th_status')}</th>
                      <th className="py-3.5 px-6">{t('dashboard.gamification.th_gain_xp')}</th>
                      {isAdmin && <th className="py-3.5 px-6 text-right">{t('dashboard.gamification.th_actions')}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {(cvStatuts ?? []).map((st) => (
                      <StatusXpRow
                        key={st.id}
                        status={st}
                        saving={savingId === `cv-${st.id}`}
                        onSave={handleSaveCvStatut}
                        readOnly={!isAdmin}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3 : Rangs (Grades) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('dashboard.gamification.sec3_title')}
            </h2>
          </div>
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {t('dashboard.gamification.btn_create_grade')}
            </button>
          )}
        </div>

        {loadingGrades ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : sortedGrades.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 border rounded-2xl bg-white dark:bg-slate-900 dark:border-slate-800 text-sm">
            {t('dashboard.gamification.no_grades')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedGrades.map((g) => (
              <GradeCard
                key={g.id}
                grade={g}
                onEdit={handleOpenEditModal}
                onDelete={(id, name) => setDeleteConfirm({ open: true, id, name })}
                readOnly={!isAdmin}
              />
            ))}
          </div>
        )}
      </section>

      {/* MODALES */}
      <GradeModal
        isOpen={modalOpen}
        mode={modalMode}
        grade={selectedGrade}
        initialOrder={nextOrder}
        saving={createGradeMutation.isPending || updateGradeMutation.isPending}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveGrade}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title={t('dashboard.gamification.confirm_delete_title')}
        message={t('dashboard.gamification.confirm_delete_desc', { name: deleteConfirm.name })}
        confirmLabel={t('dashboard.gamification.btn_confirm_delete')}
        loading={deleteGradeMutation.isPending}
        onConfirm={handleDeleteGradeConfirm}
        onClose={() => setDeleteConfirm({ open: false, id: '', name: '' })}
      />
    </div>
  );
}
