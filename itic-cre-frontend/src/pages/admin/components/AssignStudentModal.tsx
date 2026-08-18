import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Loader2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentList } from '../../../hooks/useDashboard';
import { useAssignStudentToPromotion } from '../../../hooks/usePromotions';
import CustomSelect, { type SelectOption } from '../../../components/basics/CustomSelect';
import type { StudentRow } from '../../../types/models/Dashboard';
import type { Promotion } from '../../../types/models/Promotion';

interface Props {
  isOpen: boolean;
  promotion: Promotion;
  yearSelectOptions: SelectOption[];
  onClose: () => void;
}

export default function AssignStudentModal({ isOpen, promotion, yearSelectOptions, onClose }: Props) {
  const { t } = useTranslation();
  const assignMutation = useAssignStudentToPromotion();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [addStudyYear, setAddStudyYear] = useState<number>(() => promotion.availableYears?.[0] ?? 1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: searchData, isFetching: searching } = useStudentList(
    { search: debouncedSearch || undefined, excludePromotionId: promotion.id, size: 10 },
    isOpen && !!debouncedSearch
  );
  const searchResults = searchData?.content ?? [];

  if (!isOpen) return null;

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 400);
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
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.promotions.toast_student_assign_error', "Erreur lors de l'affectation"));
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('dashboard.promotions.label_add_student', 'Affecter un étudiant')}
              </h3>
              <p className="text-xs text-slate-400">{promotion.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Study Year Selection */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {promotion.hasYears && yearSelectOptions.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {t('dashboard.promotions.available_years_label', "Niveau d'année d'affectation")}
              </label>
              <CustomSelect
                value={String(addStudyYear)}
                options={yearSelectOptions}
                onChange={(val) => setAddStudyYear(Number(val))}
                className="w-full text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {t('dashboard.promotions.search_student_label', 'Rechercher un étudiant')}
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('dashboard.promotions.placeholder_add_student', 'Rechercher par nom, prénom ou email...')}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Results */}
          {debouncedSearch && (
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2">
              {searching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  {t('dashboard.promotions.no_search_results', 'Aucun étudiant correspondant.')}
                </p>
              ) : (
                searchResults.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {st.firstName} {st.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {st.email}{' '}
                        {st.promotion
                          ? ` — ${t('dashboard.promotions.currently_in', { name: st.promotion.nom })}`
                          : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAssign(st)}
                      disabled={assigningId === st.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
                    >
                      {assigningId === st.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                      )}
                      <span>{t('dashboard.promotions.btn_add_student', 'Affecter')}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
