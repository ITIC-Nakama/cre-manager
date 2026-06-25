import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, UserMinus, UserPlus, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentList } from '../../../hooks/useDashboard';
import { useRemoveStudentFromPromotion, useAssignStudentToPromotion } from '../../../hooks/usePromotions';
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
  const assignMutation = useAssignStudentToPromotion();

  const [confirmTarget, setConfirmTarget] = useState<StudentRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: searchData, isFetching: searching } = useStudentList({ search: debouncedSearch || undefined, size: 10 });
  const searchResults = (searchData?.content ?? []).filter((s) => s.promotion?.id !== promotion?.id);

  if (!isOpen || !promotion) return null;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
  };

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

  const handleAssign = async (student: StudentRow) => {
    setAssigningId(student.id);
    try {
      await assignMutation.mutateAsync({ promotionId: promotion.id, studentId: student.id });
      toast.success(t('dashboard.promotions.toast_student_assigned'));
      setSearch('');
      setDebouncedSearch('');
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.promotions.toast_student_assign_error'));
    } finally {
      setAssigningId(null);
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

        {/* Add / move a student into this promotion */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {t('dashboard.promotions.label_add_student')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('dashboard.promotions.placeholder_add_student')}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {debouncedSearch && (
            <div className="mt-2 flex flex-col gap-1 max-h-40 overflow-y-auto">
              {searching ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">{t('dashboard.promotions.no_search_results')}</p>
              ) : (
                searchResults.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {student.email}
                        {student.promotion && ` — ${t('dashboard.promotions.currently_in', { name: student.promotion.nom })}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAssign(student)}
                      disabled={assigningId === student.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer text-xs font-semibold flex-shrink-0 disabled:opacity-50"
                    >
                      {assigningId === student.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                      {t('dashboard.promotions.btn_add_student')}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
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
