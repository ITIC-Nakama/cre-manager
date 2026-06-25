import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, GraduationCap, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion } from '../../hooks/usePromotions';
import { useAllStudents } from '../../hooks/useDashboard';
import type { Promotion } from '../../api-s/requests/PromotionRequest';

import ConfirmDialog from '../../components/shared/ConfirmDialog';
import PromotionModal from './components/PromotionModal';
import PromotionStudentsModal from './components/PromotionStudentsModal';

export default function PromotionsPage() {
  const { t } = useTranslation();
  const { data: promotions, isLoading } = usePromotions();
  const { data: students } = useAllStudents(true);

  const studentCountByPromotion = useMemo(() => {
    const counts = new Map<string, number>();
    (students ?? []).forEach((student) => {
      if (student.promotion?.id) {
        counts.set(student.promotion.id, (counts.get(student.promotion.id) ?? 0) + 1);
      }
    });
    return counts;
  }, [students]);

  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const deleteMutation = useDeletePromotion();

  const [modal, setModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; promotion?: Promotion }>({
    isOpen: false,
    mode: 'create',
  });
  const [saving, setSaving] = useState(false);

  const [studentsModal, setStudentsModal] = useState<{ isOpen: boolean; promotion?: Promotion }>({ isOpen: false });

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

  const handleSave = async (data: { name: string; year: string }) => {
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await createMutation.mutateAsync({ name: data.name, year: data.year || undefined });
        toast.success(t('dashboard.promotions.toast_created'));
      } else if (modal.mode === 'edit' && modal.promotion) {
        await updateMutation.mutateAsync({ id: modal.promotion.id, data: { name: data.name, year: data.year || undefined } });
        toast.success(t('dashboard.promotions.toast_updated'));
      }
      setModal({ isOpen: false, mode: 'create' });
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.messageKey === 'promotion-name-already-exists') {
        toast.error(t('dashboard.promotions.toast_name_exists'));
      } else {
        toast.error(t('dashboard.promotions.toast_save_error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (promotion: Promotion) => {
    openConfirm(
      t('dashboard.promotions.confirm_delete_title'),
      t('dashboard.promotions.confirm_delete', { name: promotion.name }),
      async () => {
        try {
          await deleteMutation.mutateAsync(promotion.id);
          toast.success(t('dashboard.promotions.toast_deleted'));
        } catch (err: any) {
          console.error(err);
          if (err.response?.data?.messageKey === 'promotion-has-students') {
            toast.error(t('dashboard.promotions.toast_has_students'));
          } else {
            toast.error(t('dashboard.promotions.toast_delete_error'));
          }
        }
      }
    );
  };

  const totalElements = promotions?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('dashboard.promotions.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('dashboard.promotions.subtitle', { count: totalElements })}
          </p>
        </div>
        <button
          onClick={() => setModal({ isOpen: true, mode: 'create' })}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {t('dashboard.promotions.create_button')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4">{t('dashboard.promotions.table.name')}</th>
                <th className="px-6 py-4">{t('dashboard.promotions.table.year')}</th>
                <th className="px-6 py-4">{t('dashboard.promotions.table.students')}</th>
                <th className="px-6 py-4 text-right">{t('dashboard.promotions.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-16">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : !promotions || promotions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-slate-400">
                    <GraduationCap className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    {t('dashboard.promotions.table.empty')}
                  </td>
                </tr>
              ) : (
                promotions.map((promotion) => {
                  const count = studentCountByPromotion.get(promotion.id) ?? 0;
                  return (
                    <tr key={promotion.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                            <GraduationCap className="h-4.5 w-4.5" />
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white">{promotion.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {promotion.year || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Users className="h-3.5 w-3.5" />
                          {t('dashboard.promotions.table.student_count', { count })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button
                          onClick={() => setStudentsModal({ isOpen: true, promotion })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer text-xs font-semibold"
                          title={t('dashboard.promotions.actions.manage_students')}
                        >
                          <Users className="h-3.5 w-3.5" />
                          {t('dashboard.promotions.actions.manage_students')}
                        </button>
                        <button
                          onClick={() => setModal({ isOpen: true, mode: 'edit', promotion })}
                          className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                          title={t('dashboard.promotions.actions.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(promotion)}
                          className="inline-flex p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                          title={t('dashboard.promotions.actions.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PromotionModal
        isOpen={modal.isOpen}
        mode={modal.mode}
        promotion={modal.promotion}
        saving={saving}
        onClose={() => setModal({ isOpen: false, mode: 'create' })}
        onSave={handleSave}
      />

      <PromotionStudentsModal
        isOpen={studentsModal.isOpen}
        promotion={studentsModal.promotion}
        onClose={() => setStudentsModal({ isOpen: false })}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={t('dashboard.promotions.actions.delete')}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
}
