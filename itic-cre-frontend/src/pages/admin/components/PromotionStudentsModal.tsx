import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentList } from '../../../hooks/useDashboard';
import { useRemoveStudentFromPromotion } from '../../../hooks/usePromotions';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import type { Promotion } from '../../../api-s/requests/PromotionRequest';
import type { StudentRow } from '../../../types/models/Dashboard';

interface PromotionStudentsModalProps {
  isOpen: boolean;
  promotion?: Promotion;
  onClose: () => void;
}

export default function PromotionStudentsModal({ isOpen, promotion, onClose }: PromotionStudentsModalProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentList({ promotionId: promotion?.id, size: 200 });
  const students = data?.content ?? [];
  const removeMutation = useRemoveStudentFromPromotion();

  const [confirmTarget, setConfirmTarget] = useState<StudentRow | null>(null);
  const [removing, setRemoving] = useState(false);

  if (!isOpen || !promotion) return null;

  const handleRemove = async () => {
    if (!confirmTarget) return;
    setRemoving(true);
    try {
      await removeMutation.mutateAsync({ promotionId: promotion.id, studentId: confirmTarget.id });
      toast.success(t('dashboard.promotions.toast_student_removed'));
      setConfirmTarget(null);
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.promotions.toast_student_remove_error'));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            {t('dashboard.promotions.modal_students', { name: promotion.name })}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">{t('dashboard.promotions.no_students')}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{student.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmTarget(student)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer text-xs font-semibold flex-shrink-0"
                    title={t('dashboard.promotions.btn_remove_student')}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    {t('dashboard.promotions.btn_remove_student')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmTarget !== null}
        title={t('dashboard.promotions.confirm_remove_student_title')}
        message={confirmTarget ? t('dashboard.promotions.confirm_remove_student', { name: `${confirmTarget.firstName} ${confirmTarget.lastName}` }) : ''}
        confirmLabel={t('dashboard.promotions.btn_remove_student')}
        loading={removing}
        onConfirm={handleRemove}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
