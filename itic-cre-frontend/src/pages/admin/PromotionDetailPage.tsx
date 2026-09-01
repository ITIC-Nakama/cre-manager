import { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Loader2,
  UserMinus,
  UserPlus,
  Search,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { renderTitleWithGradient } from '../../utils/titleUtils';
import { useStudentList, usePromotionYearCounts } from '../../hooks/useDashboard';
import { usePromotions, useRemoveStudentFromPromotion, useAssignStudentToPromotion } from '../../hooks/usePromotions';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import CustomSelect, { type SelectOption } from '../../components/basics/CustomSelect';
import PromotionYearTabs from './components/PromotionYearTabs';
import AssignStudentModal from './components/AssignStudentModal';
import type { StudentRow } from '../../types/models/Dashboard';

const PAGE_SIZE = 10;

export default function PromotionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: promotions, isLoading: loadingPromos } = usePromotions();
  const promotion = promotions?.find((p) => p.id === id);

  const [page, setPage] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedYearTab, setSelectedYearTab] = useState<'ALL' | number | 'UNASSIGNED'>('ALL');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dedicated lightweight aggregate stats endpoint
  const { data: yearCountsData } = usePromotionYearCounts(id, !!id);

  // Paginated table data from backend
  const params = {
    page,
    size: PAGE_SIZE,
    promotionId: id,
    studyYear: typeof selectedYearTab === 'number' ? selectedYearTab : undefined,
    studyYearMissing: selectedYearTab === 'UNASSIGNED' ? true : undefined,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading: loadingStudents, isFetching } = useStudentList(params);
  const students = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const removeMutation = useRemoveStudentFromPromotion();
  const assignMutation = useAssignStudentToPromotion();

  const [confirmTarget, setConfirmTarget] = useState<StudentRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const availableYears = useMemo(() => {
    return (promotion?.availableYears ?? []).slice().sort((a, b) => a - b);
  }, [promotion?.availableYears]);

  const yearCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    availableYears.forEach((y) => {
      counts[y] = yearCountsData?.counts?.[String(y)] ?? 0;
    });
    return { counts, unassigned: yearCountsData?.unassigned ?? 0 };
  }, [yearCountsData, availableYears]);

  const yearSelectOptions: SelectOption[] = useMemo(() => {
    return availableYears.map((yr) => ({
      value: String(yr),
      label: t(`study_years.year_${yr}`, `${yr}e année`),
    }));
  }, [availableYears, t]);

  const handleSearchChange = (value: string) => {
    setFilterText(value);
    setPage(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(value.trim()), 400);
  };

  const handleSelectTab = (tab: 'ALL' | number | 'UNASSIGNED') => {
    setSelectedYearTab(tab);
    setPage(0);
  };

  const handleRemove = async () => {
    if (!confirmTarget || !id) return;
    setRemoving(true);
    try {
      await removeMutation.mutateAsync({ promotionId: id, studentId: confirmTarget.id });
      toast.success(t('dashboard.promotions.toast_student_removed', 'Étudiant retiré de la promotion'));
      setConfirmTarget(null);
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.promotions.toast_student_remove_error', 'Erreur lors du retrait'));
    } finally {
      setRemoving(false);
    }
  };

  const handleStudyYearChange = async (student: StudentRow, newYear: number) => {
    if (!id) return;
    setUpdatingId(student.id);
    try {
      await assignMutation.mutateAsync({ promotionId: id, studentId: student.id, studyYear: newYear });
      toast.success(t('dashboard.promotions.toast_year_updated', "Année d'étude mise à jour !"));
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.promotions.toast_year_update_error', 'Erreur lors de la mise à jour'));
    } finally {
      setUpdatingId(null);
    }
  };

  if (loadingPromos) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-slate-500">{t('dashboard.promotions.empty', 'Promotion introuvable.')}</p>
        <Link to="/admin/promotions" className="inline-flex items-center gap-2 text-sm text-indigo-600 font-semibold hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t('common.back', 'Retour aux promotions')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header with Title and Single Primary Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/promotions')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t('common.back', 'Retour aux promotions')}</span>
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {renderTitleWithGradient(promotion.name)}
            </h1>
            {promotion.year && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                {promotion.year}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {t('dashboard.promotions.student_count', {
                count: yearCountsData?.totalStudents ?? totalElements,
                defaultValue: `${yearCountsData?.totalStudents ?? totalElements} étudiant(s)`
              })}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer flex-shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>{t('dashboard.promotions.btn_add_student', 'Affecter un étudiant')}</span>
        </button>
      </div>

      {/* Year Tabs */}
      {promotion.hasYears && availableYears.length > 0 && (
        <PromotionYearTabs
          totalStudents={yearCountsData?.totalStudents ?? totalElements}
          availableYears={availableYears}
          yearCounts={yearCounts}
          selectedYearTab={selectedYearTab}
          onSelectTab={handleSelectTab}
        />
      )}

      {/* Main Student List Table with Single Search Input */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 rounded-t-2xl p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('dashboard.promotions.search_in_promo', 'Rechercher un étudiant...')}
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            {isFetching && !loadingStudents && (
              <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />
            )}
            <span className="text-xs text-slate-400">
              {t('dashboard.promotions.filtered_count', { count: totalElements, defaultValue: `${totalElements} étudiant(s)` })}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-b-2xl min-h-[320px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4">{t('dashboard.promotions.table.students', 'Étudiant')}</th>
                <th className="px-6 py-4">{t('dashboard.promotions.status_label', 'Statut')}</th>
                {promotion.hasYears && <th className="px-6 py-4">{t('dashboard.promotions.available_years_label', "Niveau d'année")}</th>}
                <th className="px-6 py-4 text-right">{t('dashboard.promotions.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingStudents ? (
                <tr>
                  <td colSpan={4} className="text-center py-16">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-slate-400 space-y-2">
                    <GraduationCap className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
                    <p>{t('dashboard.promotions.no_students', 'Aucun étudiant dans cette sélection.')}</p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        student.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                      }`}>
                        {student.isActive ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                        {student.isActive ? t('dashboard.etudiants.table.active', 'Actif') : t('dashboard.etudiants.table.inactive', 'Inactif')}
                      </span>
                    </td>
                    {promotion.hasYears && (
                      <td className="px-6 py-3.5">
                        <div className="w-40">
                          {updatingId === student.id ? (
                            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                          ) : (
                            <CustomSelect
                              value={student.studyYear ? String(student.studyYear) : ''}
                              options={yearSelectOptions}
                              onChange={(val) => handleStudyYearChange(student, Number(val))}
                              className="w-full text-xs"
                            />
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmTarget(student)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer text-xs font-semibold"
                        title={t('dashboard.promotions.btn_remove_student', 'Retirer de la promotion')}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('dashboard.promotions.btn_remove_student', 'Retirer')}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loadingStudents && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.etudiants.pagination.info', {
                current: page + 1,
                total: totalPages,
                count: totalElements,
                defaultValue: `Page ${page + 1} sur ${totalPages} (${totalElements} étudiants)`
              })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-600 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal to Assign / Add an External Student */}
      <AssignStudentModal
        isOpen={isAssignModalOpen}
        promotion={promotion}
        yearSelectOptions={yearSelectOptions}
        onClose={() => setIsAssignModalOpen(false)}
      />

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        isOpen={confirmTarget !== null}
        title={t('dashboard.promotions.confirm_remove_student_title', "Retirer l'étudiant")}
        message={confirmTarget ? t('dashboard.promotions.confirm_remove_student', { name: `${confirmTarget.firstName} ${confirmTarget.lastName}`, defaultValue: `Retirer ${confirmTarget.firstName} ${confirmTarget.lastName} de cette promotion ?` }) : ''}
        confirmLabel={t('dashboard.promotions.btn_remove_student', 'Retirer')}
        loading={removing}
        onConfirm={handleRemove}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
