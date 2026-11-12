import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigationType, useSearchParams } from 'react-router-dom';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from '@tanstack/react-table';
import {
    Search, SlidersHorizontal, Loader2, FileText, FileCheck,
    Eye, CheckCircle, Clock, AlertTriangle, Users, Star,
    ChevronUp, ChevronDown, ChevronsUpDown, X, UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { useAllCVsInfinite, useCVStatuts, useCVStats } from '../../../hooks/useCV';
import { useAllAdvisors } from '../../../hooks/useAdvisors';
import { useReactivateStudent } from '../../../hooks/useDashboard';
import { formatStaffLabel } from '../../../utils/staffUtils';
import CVDetailModal from '../../../components/shared/CVDetailModal';
import ReactivateAccountDialog from '../../../components/shared/ReactivateAccountDialog';
import StudentActivityBadge from '../../../components/shared/StudentActivityBadge';
import CustomSelect from '../../../components/basics/CustomSelect';
import TruncatedText from '../../../components/shared/TruncatedText';
import InfiniteScrollSentinel from '../../../components/shared/InfiniteScrollSentinel';
import type { CVRow } from '../../../types/models/CV';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import type { StarredFilter } from '../etudiants/components/EtudiantsFilters';

const PAGE_SIZE_LOCAL = 20;

/** Position de défilement mémorisée en quittant la page (ex. vers la fiche d'un étudiant). */
const SCROLL_STORAGE_KEY = 'cv-validation-scroll';

/** Filtres recopiés dans l'URL : retour arrière et lien partagé retrouvent la même vue. */
function buildFilterSearch(current: string, filters: Record<string, string>): string {
    const next = new URLSearchParams(current);
    for (const [key, value] of Object.entries(filters)) {
        if (value) next.set(key, value);
        else next.delete(key);
    }
    return next.toString();
}

function parseSortParam(value: string | null): SortingState {
    if (!value) return [];
    const [id, dir] = value.split(':');
    return id ? [{ id, desc: dir === 'desc' }] : [];
}

/** Conteneur qui défile dans le layout staff (SupervisorLayout) — la page elle-même ne défile pas. */
function scrollContainer(): HTMLElement | null {
    return document.querySelector('main');
}

/** Gris neutre (slate-500) de la puce « Comptes désactivés », même modèle que les puces de statut. */
const DISABLED_ACCOUNTS_CHIP_COLOR = '#64748B';

const col = createColumnHelper<CVRow>();

const SORT_FIELD_BY_COLUMN: Record<string, string> = {
    student: 'student.lastName',
    promotion: 'student.promotion.name',
    statut: 'statut.nom',
    uploadedAt: 'uploadedAt',
    updatedAt: 'updatedAt',
};

function toSortParam(sorting: SortingState): string | undefined {
    const [first] = sorting;
    if (!first) return undefined;
    const field = SORT_FIELD_BY_COLUMN[first.id];
    if (!field) return undefined;
    return `${field},${first.desc ? 'desc' : 'asc'}`;
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5" />;
    if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
}

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

function StatutBadge({ nom, couleur }: { nom: string; couleur: string }) {
    let icon;
    const lc = nom.toLowerCase();
    if (lc.includes('valid')) icon = <CheckCircle className="h-3 w-3" />;
    else if (lc.includes('corriger')) icon = <AlertTriangle className="h-3 w-3" />;
    else icon = <Clock className="h-3 w-3" />;

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{
                background: `${couleur}22`,
                color: couleur,
                border: `1px solid ${couleur}44`,
            }}
        >
            {icon}
            {nom}
        </span>
    );
}

export default function CVValidationPage() {
    const { t } = useTranslation();
    const currentUser = useUserStore((state) => state.user);
    const isAdmin = currentUser?.role === Role.ADMIN;

    // Etat initial lu dans l'URL : en revenant de la fiche d'un étudiant (ou par un lien partagé),
    // on retrouve les mêmes filtres.
    const [searchParams, setSearchParams] = useSearchParams();
    const defaultAdvisorFilter = !isAdmin && currentUser ? String(currentUser.id) : '';
    const [statutFilter, setStatutFilter] = useState(() => searchParams.get('statut') ?? '');
    const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
    const [selectedCV, setSelectedCV] = useState<CVRow | null>(null);
    // CV dont on confirme la réactivation du compte (vue « Comptes désactivés »).
    const [reactivatingCv, setReactivatingCv] = useState<CVRow | null>(null);
    const reactivateMutation = useReactivateStudent();
    // Un conseiller voit par defaut uniquement les CV de son portefeuille ;
    // un admin voit tout le monde par defaut, avec la possibilite de filtrer par conseiller.
    // Dans l'URL, 'all' = « tous les conseillers » choisi explicitement par un conseiller.
    const [advisorFilter, setAdvisorFilter] = useState(() => {
        const value = searchParams.get('conseiller');
        if (value === null) return defaultAdvisorFilter;
        return value === 'all' ? '' : value;
    });
    const [starredFilter, setStarredFilter] = useState<StarredFilter>(() => (searchParams.get('etoiles') as StarredFilter | null) ?? 'all');
    // Les CV des comptes desactives sont masques partout (filtre serveur) ; la puce « Comptes désactivés »
    // permet de les retrouver. Une seule puce active a la fois : choisir un statut ramene a la vue normale.
    const [disabledAccountsOnly, setDisabledAccountsOnly] = useState(() => searchParams.get('desactives') === '1');
    const [sorting, setSorting] = useState<SortingState>(() => parseSortParam(searchParams.get('tri')));

    useEffect(() => {
        const [firstSort] = sorting;
        const next = buildFilterSearch(window.location.search, {
            statut: statutFilter,
            q: search.trim(),
            conseiller: advisorFilter === defaultAdvisorFilter ? '' : (advisorFilter || 'all'),
            etoiles: starredFilter === 'all' ? '' : starredFilter,
            desactives: disabledAccountsOnly ? '1' : '',
            tri: firstSort ? `${firstSort.id}:${firstSort.desc ? 'desc' : 'asc'}` : '',
        });
        if (next !== new URLSearchParams(window.location.search).toString()) {
            setSearchParams(new URLSearchParams(next), { replace: true });
        }
    }, [statutFilter, search, advisorFilter, defaultAdvisorFilter, starredFilter, disabledAccountsOnly, sorting, setSearchParams]);
    const accountActive = disabledAccountsOnly ? false : undefined;

    const { data: statuts = [] } = useCVStatuts();
    // Puces de statut : comptes actifs uniquement, quelle que soit la vue.
    const { data: stats = [] } = useCVStats(advisorFilter || undefined);
    const { data: disabledStats = [] } = useCVStats(advisorFilter || undefined, false);
    const disabledCount = disabledStats.reduce((sum, s) => sum + s.count, 0);
    const { data: advisors = [] } = useAllAdvisors();
    const params = useMemo(() => ({
        size: PAGE_SIZE_LOCAL,
        statutId: statutFilter || undefined,
        search: search.trim() || undefined,
        advisorId: advisorFilter || undefined,
        starred: starredFilter === 'starred' ? true : starredFilter === 'unstarred' ? false : undefined,
        accountActive,
        sort: toSortParam(sorting),
    }), [statutFilter, search, advisorFilter, starredFilter, accountActive, sorting]);

    const {
        items: pagedCVs, totalElements, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage,
    } = useAllCVsInfinite(params);

    // « Page » de la liste à défilement infini : la position est mémorisée pendant le défilement (avec
    // les filtres de l'URL) et rétablie sur un retour arrière (fermeture de la fiche étudiant, bouton
    // Précédent), une fois les lignes en cache réaffichées. Une visite par le menu repart du haut.
    const navigationType = useNavigationType();
    const scrollRestored = useRef(false);
    useEffect(() => {
        const container = scrollContainer();
        if (!container) return;
        let frame = 0;
        const save = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify({ search: window.location.search, top: container.scrollTop }));
            });
        };
        container.addEventListener('scroll', save, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            container.removeEventListener('scroll', save);
        };
    }, []);
    useEffect(() => {
        if (scrollRestored.current || isLoading) return;
        scrollRestored.current = true;
        const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
        if (!saved || navigationType !== 'POP') return;
        const { search: savedSearch, top } = JSON.parse(saved) as { search: string; top: number };
        const container = scrollContainer();
        if (!container || savedSearch !== window.location.search) return;
        // À l'image suivante : le layout staff remonte en haut à chaque changement de page
        // (useResetScrollOnNavigate, effet du parent, exécuté après celui-ci).
        requestAnimationFrame(() => {
            container.scrollTop = top;
        });
    }, [isLoading, navigationType]);

    // La fiche étudiant est réservée au staff (conseillers et admins, voir /dashboard/students/** côté API).
    const canOpenStudentProfile = currentUser?.role === Role.ADVISOR || currentUser?.role === Role.ADMIN;
    // Réactiver un compte étudiant : conseillers et admins (l'API refuse toute cible qui n'est pas un étudiant).
    const canReactivateAccount = canOpenStudentProfile;

    const handleConfirmReactivate = async () => {
        if (!reactivatingCv) return;
        try {
            await reactivateMutation.mutateAsync(reactivatingCv.studentId);
            toast.success(t('dashboard.etudiants.toast_reactivated'));
            setReactivatingCv(null);
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.toast_reactivate_error'));
        }
    };

    const statutOptions = useMemo(() => [
        { value: '', label: t('dashboard.cv.filter_all_statuts', 'Tous les statuts') },
        ...statuts.map((s) => ({ value: s.id, label: s.nom })),
    ], [statuts, t]);

    const currentUserId = currentUser ? String(currentUser.id) : '';

    const advisorOptions = useMemo(() => [
        { value: '', label: t('dashboard.etudiants.filter_all_advisors', 'Tous les conseillers') },
        ...advisors
            .filter((a) => a.id !== currentUserId)
            .map((a) => ({ value: a.id, label: formatStaffLabel(a, t('common.admin_tag', '(Admin)')) })),
    ], [advisors, t, currentUserId]);

    const columns = useMemo(() => [
        col.accessor((row) => row.student ? `${row.student.firstName} ${row.student.lastName}` : '—', {
            id: 'student',
            header: t('dashboard.cv.table.student', 'Étudiant'),
            cell: ({ row }) => (
                <div className="max-w-[200px]">
                    <TruncatedText
                        text={row.original.student
                            ? `${row.original.student.firstName} ${row.original.student.lastName}`
                            : '—'}
                        className="font-semibold text-slate-900 dark:text-white"
                    />
                    {row.original.student?.email && (
                        <TruncatedText text={row.original.student.email} className="text-xs text-slate-400" />
                    )}
                    {row.original.student?.accountActive === false && (
                        <div className="mt-1">
                            <StudentActivityBadge accountActive={false} isActive={false} lastActivity={null} />
                        </div>
                    )}
                </div>
            ),
        }),
        col.accessor((row) => row.student?.promotion?.nom ?? '', {
            id: 'promotion',
            header: t('dashboard.cv.table.promotion', 'Promotion'),
            cell: ({ getValue }) => {
                const v = getValue();
                return v
                    ? <TruncatedText text={v} className="max-w-[140px] text-slate-500 dark:text-slate-400 text-sm" />
                    : <span className="text-slate-300 dark:text-slate-600">—</span>;
            },
        }),
        col.accessor('statut', {
            header: t('dashboard.cv.table.status', 'Statut'),
            cell: ({ getValue }) => {
                const s = getValue();
                return <StatutBadge nom={s.nom} couleur={s.couleur} />;
            },
        }),
        col.accessor('uploadedAt', {
            header: t('dashboard.cv.table.uploaded_at', 'Déposé le'),
            cell: ({ getValue }) => (
                <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(getValue())}</span>
            ),
        }),
        col.accessor('updatedAt', {
            header: t('dashboard.cv.table.updated_at', 'Mis à jour'),
            cell: ({ getValue }) => (
                <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(getValue())}</span>
            ),
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [t]);

    const coreRowModel = useMemo(() => getCoreRowModel(), []);

    const table = useReactTable({
        data: pagedCVs,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: coreRowModel,
        manualSorting: true,
    });

    const handleStatutChange = (val: string) => {
        setStatutFilter(val);
        setDisabledAccountsOnly(false);
    };

    const handleDisabledAccountsChip = () => {
        setStatutFilter('');
        setDisabledAccountsOnly((active) => !active);
    };

    const handleSearch = (val: string) => {
        setSearch(val);
    };

    const handleAdvisorFilterChange = (val: string) => {
        setAdvisorFilter(val);
    };

    const handleStarredFilterChange = (val: StarredFilter) => {
        setStarredFilter(val);
    };

    const starredFilterOptions = useMemo(() => [
        { value: 'all', label: t('dashboard.etudiants.filter_starred_all', 'Tous') },
        { value: 'starred', label: t('dashboard.etudiants.filter_starred_yes', 'Étoilés') },
        { value: 'unstarred', label: t('dashboard.etudiants.filter_starred_no', 'Non étoilés') },
    ], [t]);

    return (
        <div className="flex flex-col gap-6  animate-fadeIn">

            {/* Header + Filters (sticky ensemble) */}
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] py-2 flex flex-col gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <FileCheck className="h-7 w-7 text-[#E2762F] shrink-0" />
                        {renderTitleWithGradient(t('dashboard.cv_validation.title', 'Validation des CVs'), 'itic-gradient-blue')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-1">
                        {`${totalElements} CV${totalElements !== 1 ? 's' : ''} déposé${totalElements !== 1 ? 's' : ''}`}
                        {disabledAccountsOnly && ` · ${t('dashboard.etudiants.filter_disabled', 'Comptes désactivés')}`}
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
                            placeholder={t('dashboard.cv.search_placeholder', 'Rechercher un étudiant…')}
                            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                aria-label={t('common.clear', 'Effacer')}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <CustomSelect
                        value={statutFilter}
                        options={statutOptions}
                        onChange={handleStatutChange}
                        icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
                        className="min-w-48"
                    />
                    <CustomSelect
                        value={starredFilter}
                        options={starredFilterOptions}
                        onChange={(value) => handleStarredFilterChange(value as StarredFilter)}
                        icon={<Star className="h-4 w-4 text-slate-400" />}
                        className="min-w-40"
                    />
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input
                            type="checkbox"
                            checked={advisorFilter === currentUserId}
                            onChange={(e) => handleAdvisorFilterChange(e.target.checked ? currentUserId : '')}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <Users className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{t('dashboard.etudiants.filter_my_students', 'Mes étudiants uniquement')}</span>
                    </label>
                    {isAdmin && (
                        <CustomSelect
                            value={advisorFilter === currentUserId ? '' : advisorFilter}
                            options={advisorOptions}
                            onChange={handleAdvisorFilterChange}
                            icon={<Users className="h-4 w-4 text-slate-400" />}
                            className={`min-w-48 transition-opacity ${advisorFilter === currentUserId ? 'opacity-50' : ''}`}
                            searchable
                        />
                    )}
                    {isLoading && (
                        <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                    )}
                </div>

                {/* Status summary chips */}
                {!isLoading && statuts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {statuts.map((s) => {
                            const stat = stats.find((st) => st.statutId === s.id);
                            const count = stat ? stat.count : 0;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => handleStatutChange(statutFilter === s.id ? '' : s.id)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${statutFilter === s.id ? 'ring-2 ring-offset-1' : 'opacity-80 hover:opacity-100'
                                        }`}
                                    style={{
                                        background: `${s.couleur}18`,
                                        color: s.couleur,
                                        border: `1px solid ${s.couleur}44`,
                                    }}
                                >
                                    {s.nom} · {count}
                                </button>
                            );
                        })}
                        <button
                            onClick={handleDisabledAccountsChip}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${disabledAccountsOnly ? 'ring-2 ring-offset-1' : 'opacity-80 hover:opacity-100'
                                }`}
                            style={{
                                background: `${DISABLED_ACCOUNTS_CHIP_COLOR}18`,
                                color: DISABLED_ACCOUNTS_CHIP_COLOR,
                                border: `1px solid ${DISABLED_ACCOUNTS_CHIP_COLOR}44`,
                            }}
                        >
                            {t('dashboard.etudiants.filter_disabled', 'Comptes désactivés')} · {disabledCount}
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            {table.getHeaderGroups().map((hg) => (
                                <tr key={hg.id} className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {hg.headers.map((header) => (
                                        <th key={header.id} className="px-6 py-4">
                                            {header.column.getCanSort() ? (
                                                <button
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    <SortIcon sorted={header.column.getIsSorted()} />
                                                </button>
                                            ) : (
                                                flexRender(header.column.columnDef.header, header.getContext())
                                            )}
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-right">{t('dashboard.offres.table.actions', 'Actions')}</th>
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-16">
                                        <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : pagedCVs.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-16 text-slate-400">
                                        <FileText className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                        {t('dashboard.cv.table.empty', 'Aucun CV ne correspond à vos critères.')}
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-6 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center justify-end gap-2">
                                                {canReactivateAccount && row.original.student?.accountActive === false && row.original.studentId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReactivatingCv(row.original)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors cursor-pointer"
                                                        aria-label={t('dashboard.etudiants.actions.reactivate_account_of', {
                                                            name: `${row.original.student.firstName} ${row.original.student.lastName}`,
                                                        })}
                                                    >
                                                        <UserCheck className="h-3.5 w-3.5" />
                                                        <span>{t('dashboard.etudiants.actions.reactivate_account')}</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedCV(row.original)}
                                                    className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                                                    title={t('dashboard.cv.actions.review', 'Examiner le CV')}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!isLoading && pagedCVs.length > 0 && (
                    <InfiniteScrollSentinel
                        hasMore={!!hasNextPage}
                        isLoadingMore={isFetchingNextPage}
                        onLoadMore={fetchNextPage}
                    />
                )}
            </div>

            {/* CV Detail Modal */}
            {selectedCV && (
                <CVDetailModal
                    cv={selectedCV}
                    statuts={statuts}
                    onClose={() => setSelectedCV(null)}
                    studentLink={canOpenStudentProfile && selectedCV.studentId
                        ? { to: `/supervisor/etudiants/${selectedCV.studentId}`, state: { from: 'cv-validation' } }
                        : undefined}
                />
            )}

            <ReactivateAccountDialog
                student={reactivatingCv?.student ?? null}
                loading={reactivateMutation.isPending}
                onConfirm={handleConfirmReactivate}
                onClose={() => setReactivatingCv(null)}
            />
        </div>
    );
}
