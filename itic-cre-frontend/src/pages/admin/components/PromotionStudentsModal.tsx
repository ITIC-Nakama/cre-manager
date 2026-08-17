import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, UserMinus, UserPlus, Users, Search, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentList } from '../../../hooks/useDashboard';
import { useRemoveStudentFromPromotion, useAssignStudentToPromotion } from '../../../hooks/usePromotions';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import CustomSelect, { type SelectOption } from '../../../components/basics/CustomSelect';
import PromotionYearTabs from './PromotionYearTabs';
import type { Promotion } from '../../../types/models/Promotion';
import type { StudentRow } from '../../../types/models/Dashboard';

interface PromotionStudentsModalProps {
  isOpen: boolean;
  promotion?: Promotion;
  onClose: () => void;
}

export default function PromotionStudentsModal({ isOpen, promotion, onClose }: PromotionStudentsModalProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentList({ promotionId: promotion?.id, size: 500 });
  const students = data?.content ?? [];
  const removeMutation = useRemoveStudentFromPromotion();
  const assignMutation = useAssignStudentToPromotion();

  const [confirmTarget, setConfirmTarget] = useState<StudentRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [selectedYearTab, setSelectedYearTab] = useState<'ALL' | number | 'UNASSIGNED'>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: searchData, isFetching: searching } = useStudentList({ search: debouncedSearch || undefined, size: 10 });
  const searchResults = (searchData?.content ?? []).filter((s) => s.promotion?.id !== promotion?.id);

  const availableYears = useMemo(() => {
    return (promotion?.availableYears ?? []).slice().sort((a, b) => a - b);
  }, [promotion?.availableYears]);

  const [addStudyYear, setAddStudyYear] = useState<number>(() => availableYears[0] ?? 1);

  const yearCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    let unassigned = 0;
    availableYears.forEach((y) => { counts[y] = 0; });
    students.forEach((s) => {
      if (s.studyYear && counts[s.studyYear] !== undefined) {
        counts[s.studyYear]++;
      } else {
        unassigned++;
      }
    });
    return { counts, unassigned };
  }, [students, availableYears]);

  const yearSelectOptions: SelectOption[] = useMemo(() => {
    return availableYears.map((yr) => ({
      value: String(yr),
      label: t(`study_years.year_${yr}`, `${yr}e année`),
    }));
  }, [availableYears, t]);

  const displayedStudents = useMemo(() => {
    if (selectedYearTab === 'ALL') return students;
    if (selectedYearTab === 'UNASSIGNED') return students.filter((s) => !s.studyYear);
    return students.filter((s) => s.studyYear === selectedYearTab);
  }, [students, selectedYearTab]);

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
      toast.success(t('dashboard.promotions.toast_student_removed', 'Étudiant retiré de la promotion'));
      setConfirmTarget(null);
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.promotions.toast_student_remove_error', 'Erreur lors du retrait'));
    } finally {
      setRemoving(false);
    }
  };

  const handleAssign = async (student: StudentRow) => {
    setAssigningId(student.id);
    try {
      const yearToAssign = promotion.hasYears ? addStudyYear : undefined;
      await assignMutation.mutateAsync({
        promotionId: promotion.id,
        studentId: student.id,
        studyYear: yearToAssign,
      });
      toast.success(t('dashboard.promotions.toast_student_assigned', 'Étudiant affecté avec succès'));
      setSearch('');
      setDebouncedSearch('');
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.promotions.toast_student_assign_error', "Erreur lors de l'affectation"));
    } finally {
      setAssigningId(null);
    }
  };

  const handleStudyYearChange = async (student: StudentRow, newYear: number) => {
    setUpdatingId(student.id);
    try {
      await assignMutation.mutateAsync({
        promotionId: promotion.id,
        studentId: student.id,
        studyYear: newYear,
      });
      toast.success(t('dashboard.promotions.toast_year_updated', "Année d'étude mise à jour !"));
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.promotions.toast_year_update_error', 'Erreur lors de la mise à jour'));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{promotion.name}</span>
                {promotion.year && (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {promotion.year}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {t('dashboard.promotions.student_count', { count: students.length, defaultValue: `${students.length} étudiant(s)` })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Year Tabs */}
        {promotion.hasYears && availableYears.length > 0 && (
          <div className="px-6 py-2.5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
            <PromotionYearTabs
              totalStudents={students.length}
              availableYears={availableYears}
              yearCounts={yearCounts}
              selectedYearTab={selectedYearTab}
              onSelectTab={setSelectedYearTab}
            />
          </div>
        )}

        {/* Add Student Bar */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('dashboard.promotions.label_add_student', 'Ajouter un étudiant à cette promotion')}
          </label>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('dashboard.promotions.placeholder_add_student', 'Rechercher par nom, prénom ou email...')}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {promotion.hasYears && yearSelectOptions.length > 0 && (
              <div className="w-full sm:w-44 flex-shrink-0">
                <CustomSelect
                  value={String(addStudyYear)}
                  options={yearSelectOptions}
                  onChange={(val) => setAddStudyYear(Number(val))}
                  className="w-full text-xs"
                />
              </div>
            )}
          </div>

          {debouncedSearch && (
            <div className="mt-2 flex flex-col gap-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-md animate-fadeIn">
              {searching ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">{t('dashboard.promotions.no_search_results', 'Aucun résultat trouvé')}</p>
              ) : (
                searchResults.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {st.firstName} {st.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {st.email}
                        {st.promotion && ` — ${t('dashboard.promotions.currently_in', { name: st.promotion.nom, defaultValue: `En ${st.promotion.nom}` })}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAssign(st)}
                      disabled={assigningId === st.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer text-xs font-semibold flex-shrink-0 disabled:opacity-50"
                    >
                      {assigningId === st.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                      {t('dashboard.promotions.btn_add_student', 'Ajouter')}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[260px] pb-16">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
            </div>
          ) : displayedStudents.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <GraduationCap className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">{t('dashboard.promotions.no_students', 'Aucun étudiant dans cette sélection.')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {displayedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{student.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {promotion.hasYears && yearSelectOptions.length > 0 && (
                      <div className="w-36">
                        {updatingId === student.id ? (
                          <div className="px-3 py-1 flex items-center gap-1.5 text-xs text-indigo-500 font-medium">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          </div>
                        ) : (
                          <CustomSelect
                            value={student.studyYear ? String(student.studyYear) : ''}
                            options={yearSelectOptions}
                            onChange={(val) => handleStudyYearChange(student, Number(val))}
                            className="w-full text-xs"
                          />
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setConfirmTarget(student)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer text-xs font-semibold"
                      title={t('dashboard.promotions.btn_remove_student', 'Retirer')}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t('dashboard.promotions.btn_remove_student', 'Retirer')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmTarget !== null}
        title={t('dashboard.promotions.confirm_remove_student_title', 'Retirer l\'étudiant')}
        message={confirmTarget ? t('dashboard.promotions.confirm_remove_student', { name: `${confirmTarget.firstName} ${confirmTarget.lastName}`, defaultValue: `Retirer ${confirmTarget.firstName} ${confirmTarget.lastName} de cette promotion ?` }) : ''}
        confirmLabel={t('dashboard.promotions.btn_remove_student', 'Retirer')}
        loading={removing}
        onConfirm={handleRemove}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
