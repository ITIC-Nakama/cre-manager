import { useState, useRef, useMemo } from 'react';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import {
    Search, SlidersHorizontal, Loader2, AlertCircle, Briefcase,
    GraduationCap, FileSignature, Users, Star,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApplicationGroupedList, useApplicationStatuses, useContractTypes } from '../../../hooks/useApplications';
import { usePromotions } from '../../../hooks/usePromotions';
import CustomSelect from '../../../components/basics/CustomSelect';
import StudentCard from './components/StudentCard';
import StudentDrawer from './components/StudentDrawer';
import type { StudentGroup } from './types';

const PAGE_SIZE = 24;

export default function CandidaturesPage() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [promotionFilter, setPromotionFilter] = useState('');
    const [contractTypeFilter, setContractTypeFilter] = useState('');
    const [staleOnly, setStaleOnly] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<StudentGroup | null>(null);
    const [page, setPage] = useState(0);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: statuses } = useApplicationStatuses();
    const { data: promotions } = usePromotions();
    const { data: contractTypes } = useContractTypes();

    const statusOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_statuses') },
        ...(statuses ?? []).map((s) => ({ value: s.id, label: s.nom })),
    ], [statuses, t]);

    const promotionOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_promotions') },
        ...(promotions ?? []).map((p) => ({
            value: p.id,
            label: p.year ? `${p.name} (${p.year})` : p.name,
        })),
    ], [promotions, t]);

    const contractTypeOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_contracts') },
        ...(contractTypes ?? []).map((c) => ({ value: c.id, label: c.label })),
    ], [contractTypes, t]);

    const { data, isLoading, isFetching } = useApplicationGroupedList({
        page,
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        statusId: statusFilter || undefined,
        promotionId: promotionFilter || undefined,
        typeContratId: contractTypeFilter || undefined,
        stale: staleOnly ? true : undefined,
        activeStudentsOnly: true,
    });

    const studentGroups = (data?.content ?? []) as StudentGroup[];
    const totalStudents = data?.totalElements ?? 0;
    const totalPages = data?.totalPages ?? 0;

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(0);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
    };

    const handleStatusChange = (value: string) => {
        setStatusFilter(value);
        setPage(0);
    };

    const handlePromotionChange = (value: string) => {
        setPromotionFilter(value);
        setPage(0);
    };

    const handleContractTypeChange = (value: string) => {
        setContractTypeFilter(value);
        setPage(0);
    };

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                    <Briefcase className="h-7 w-7 text-[#E2762F] shrink-0" />
                    {renderTitleWithGradient(t('dashboard.candidatures.title', 'Gestion des Candidatures'), 'itic-gradient-blue')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t('dashboard.candidatures.student_count', { count: totalStudents, defaultValue: '{{count}} étudiant' })}
                    {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48 max-w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={t('dashboard.candidatures.search_placeholder')}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <CustomSelect
                    value={statusFilter}
                    options={statusOptions}
                    onChange={handleStatusChange}
                    icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                />
                <CustomSelect
                    value={promotionFilter}
                    options={promotionOptions}
                    onChange={handlePromotionChange}
                    icon={<GraduationCap className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                    searchable
                    searchPlaceholder={t('dashboard.candidatures.promotion_search_placeholder')}
                    noResultsLabel={t('dashboard.candidatures.promotion_no_results')}
                />
                <CustomSelect
                    value={contractTypeFilter}
                    options={contractTypeOptions}
                    onChange={handleContractTypeChange}
                    icon={<FileSignature className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                />
                <button
                    onClick={() => { setStaleOnly((p) => !p); setPage(0); }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        staleOnly
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                    <AlertCircle className="h-4 w-4" />
                    {t('dashboard.candidatures.filter_stale_only')}
                </button>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">{t('dashboard.candidatures.loading', 'Chargement des candidatures…')}</p>
                </div>
            ) : studentGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Star className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                    </div>
                    <p className="font-medium text-slate-600 dark:text-slate-400">{t('dashboard.candidatures.empty_title', 'Aucun étudiant actif avec des candidatures')}</p>
                    <p className="text-sm">{t('dashboard.candidatures.empty_desc', 'Modifiez vos filtres pour élargir la recherche.')}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {studentGroups.map((group) => (
                            <StudentCard
                                key={group.studentId}
                                group={group}
                                onClick={() => setSelectedGroup(group)}
                            />
                        ))}
                    </div>

                    {/* Backend Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-2 text-sm">
                            <span className="text-slate-500 dark:text-slate-400">
                                {t('dashboard.candidatures.pagination_info', { current: page + 1, total: totalPages, count: totalStudents, defaultValue: 'Page {{current}} sur {{total}} — {{count}} étudiant' })}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                                pageNum === page
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            {pageNum + 1}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {selectedGroup && (
                <StudentDrawer group={selectedGroup} onClose={() => setSelectedGroup(null)} />
            )}
        </div>
    );
}
