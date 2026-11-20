import { useMemo, useRef, useEffect } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { FileText, ShieldAlert, FileSignature, Star, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StudentRow } from '../../../../types/models/Dashboard';
import TruncatedText from '../../../../components/shared/TruncatedText';
import UserAvatar from '../../../../components/shared/UserAvatar';
import StudentActivityBadge from '../../../../components/shared/StudentActivityBadge';
import { isAnonymizedStudent } from '../../../../utils/studentUtils';
import { SELECT_COLUMN_WIDTH } from '../../../../components/table/columnMeta';

const col = createColumnHelper<StudentRow>();

interface UseStudentColumnsOptions {
    isAdmin: boolean;
    /** Compte désactivé : bouton « Réactiver le compte » dans la ligne (conseillers et admins). */
    onReactivate?: (student: StudentRow) => void;
}

function IndeterminateCheckbox({
    indeterminate,
    className = '',
    ...rest
}: { indeterminate?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof indeterminate === 'boolean' && ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);

    return (
        <input
            type="checkbox"
            ref={ref}
            className={className}
            {...rest}
        />
    );
}

export function useStudentColumns({ isAdmin, onReactivate }: UseStudentColumnsOptions) {
    const { t } = useTranslation();

    return useMemo(() => [
        ...(isAdmin ? [col.display({
            id: 'select',
            // Figée à gauche, largeur fixe (décalage de la colonne « Étudiant ») ; jamais masquable.
            enableHiding: false,
            meta: { stickyLeft: 0, className: 'w-12 min-w-12 max-w-12' },
            header: ({ table }) => (
                <IndeterminateCheckbox
                    aria-label={t('dashboard.etudiants.table.select_all', 'Sélectionner tous les étudiants affichés')}
                    checked={table.getIsAllPageRowsSelected()}
                    indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
            ),
            cell: ({ row }) => {
                const isAnon = isAnonymizedStudent(row.original);
                return (
                    <input
                        type="checkbox"
                        aria-label={t('dashboard.etudiants.table.select_one', { name: `${row.original.firstName} ${row.original.lastName}`, defaultValue: 'Sélectionner {{name}}' })}
                        checked={row.getIsSelected()}
                        disabled={isAnon}
                        onChange={row.getToggleSelectedHandler()}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                );
            },
        })] : []),
        col.accessor((row) => `${row.firstName} ${row.lastName}`, {
            id: 'name',
            header: t('dashboard.etudiants.table.student'),
            // Identité de la ligne : figée à gauche (après la sélection) et jamais masquable (lot 11).
            enableHiding: false,
            meta: { stickyLeft: isAdmin ? SELECT_COLUMN_WIDTH : 0, stickyEdge: true },
            cell: ({ row }) => {
                const isAnon = isAnonymizedStudent(row.original);
                const fullName = `${row.original.firstName} ${row.original.lastName}`;
                // Badges : icône seule sur mobile (le texte reste lu par les lecteurs d'écran) pour garder la colonne figée étroite.
                const badgeText = 'sr-only sm:not-sr-only';
                return (
                    <div className="flex items-center gap-2.5 whitespace-nowrap">
                        {/* Photo masquée sous sm : la colonne figée laisse de la place au reste du tableau. */}
                        <span className="hidden sm:contents">
                            <UserAvatar
                                profilePicture={row.original.profilePicture}
                                firstName={row.original.firstName}
                                lastName={row.original.lastName}
                                className="h-8 w-8 flex-shrink-0"
                                enlargeOnClick
                            />
                        </span>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <TruncatedText
                                    text={fullName}
                                    className={`max-w-[7.5rem] sm:max-w-[14rem] ${isAnon ? 'font-semibold text-slate-500 dark:text-slate-400' : 'font-semibold text-slate-900 dark:text-white'}`}
                                />
                                {isAnon && (
                                    <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                        title={t('dashboard.etudiants.table.gdpr_badge', 'Supprimé (RGPD)')}>
                                        <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                                        <span className={badgeText}>{t('dashboard.etudiants.table.gdpr_badge', 'Supprimé (RGPD)')}</span>
                                    </span>
                                )}
                                {row.original.underContract && (
                                    <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                        title={t('dashboard.etudiants.table.under_contract_badge', 'Sous contrat')}>
                                        <FileSignature className="h-3 w-3" aria-hidden="true" />
                                        <span className={badgeText}>{t('dashboard.etudiants.table.under_contract_badge', 'Sous contrat')}</span>
                                    </span>
                                )}
                                {row.original.contractNeedsVerification && (
                                    <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                        title={t('dashboard.etudiants.table.contract_unverified_badge', 'À vérifier')}>
                                        <ShieldAlert className="h-2.5 w-2.5" aria-hidden="true" />
                                        <span className={badgeText}>{t('dashboard.etudiants.table.contract_unverified_badge', 'À vérifier')}</span>
                                    </span>
                                )}
                            </div>
                            <TruncatedText text={row.original.email} className="max-w-[9rem] sm:max-w-[14rem] text-xs text-slate-400 font-mono" />
                        </div>
                    </div>
                );
            },
        }),
        col.accessor((row) => row.promotion?.nom ?? '', {
            id: 'promotion',
            header: t('dashboard.etudiants.table.promotion'),
            cell: ({ row, getValue }) => {
                const value = getValue();
                const studyYear = row.original.studyYear;
                return value ? (
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <TruncatedText text={value} className="max-w-[12rem] text-slate-500 dark:text-slate-400 text-sm" />
                        {studyYear && (
                            <span className="inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                                {t(`study_years.year_${studyYear}`, `${studyYear}e année`)}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                );
            },
            enableSorting: true,
        }),
        col.accessor((row) => row.formation ?? '', {
            id: 'formation',
            header: t('formations.column_student', 'Formation'),
            cell: ({ getValue }) => {
                const value = getValue();
                return value
                    ? <TruncatedText text={value} className="max-w-[12rem] text-slate-600 dark:text-slate-300 text-sm" />
                    : <span className="text-slate-300 dark:text-slate-600">—</span>;
            },
            enableSorting: true,
        }),
        col.accessor((row) => row.advisor ? `${row.advisor.firstName} ${row.advisor.lastName}` : '', {
            id: 'advisor',
            header: t('dashboard.etudiants.table.advisor', 'Conseiller'),
            cell: ({ row }) => {
                const student = row.original;
                return student.advisor
                    ? <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{student.advisor.firstName} {student.advisor.lastName}</span>
                    : <span className="text-slate-300 dark:text-slate-600">—</span>;
            },
        }),
        col.accessor('xpTotal', {
            header: t('dashboard.etudiants.table.grade_xp').split(' / ')[0],
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {row.original.grade?.nom ?? '—'}
                    </span>
                </div>
            ),
        }),
        col.accessor('hasCv', {
            header: t('dashboard.etudiants.table.cv'),
            cell: ({ getValue }) => (
                <div className="flex items-center whitespace-nowrap">
                    {getValue() ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                            {t('dashboard.etudiants.table.cv_deposited')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
                            <FileText className="h-3 w-3 shrink-0" />
                            {t('dashboard.etudiants.table.cv_none')}
                        </span>
                    )}
                </div>
            ),
        }),
        col.accessor((row) => row.latestRating ?? null, {
            id: 'latestRating',
            header: t('dashboard.etudiants.table.rating', 'Note'),
            cell: ({ getValue }) => {
                const value = getValue();
                return value ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs font-semibold text-amber-800 dark:text-amber-300"
                        title={t('dashboard.etudiants.rating.private', 'Jamais visible par l’étudiant')}>
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {value}/5
                    </span>
                ) : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
            },
        }),
        col.accessor('isActive', {
            header: t('dashboard.etudiants.table.status'),
            cell: ({ getValue, row }) => (
                // Badge et bouton « Réactiver » empilés (chacun sur une ligne) : la colonne reste étroite.
                <div className="flex flex-col items-start gap-1 whitespace-nowrap">
                    <StudentActivityBadge
                        accountActive={row.original.accountActive}
                        isActive={!!getValue()}
                        lastActivity={row.original.lastActivity}
                    />
                    {onReactivate && !row.original.accountActive && !isAnonymizedStudent(row.original) && (
                        <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); onReactivate(row.original); }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                        >
                            <UserCheck className="h-3 w-3" />
                            {t('dashboard.etudiants.actions.reactivate_account')}
                        </button>
                    )}
                </div>
            ),
        }),
    ], [t, isAdmin, onReactivate]);
}