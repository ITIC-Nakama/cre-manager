import { useState } from 'react';
import { AlertTriangle, ChevronDown, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AdminProgram, PromotionOverview } from '../../../api-s/requests/CompanySpaceRequest';
import { bestProgramFor } from './programFormHelpers';

/**
 * Lot 12 : « X promotions ne sont rattachées à aucune formation (Y étudiants) ». Seules les promotions qui ont des
 * étudiants actifs comptent. « Rattacher » ouvre la formation dont le nom ressemble le plus à la promotion (ou l'ajout
 * d'une formation si aucune ne ressemble), avec la promotion déjà cochée : il reste à vérifier et enregistrer.
 */
export default function OrphanPromotionsBanner({ promotions, programs, onAttach }: {
    promotions: PromotionOverview[];
    programs: AdminProgram[];
    onAttach: (program: AdminProgram | undefined, promotionId: string) => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const orphans = promotions.filter((p) => p.activeStudents > 0 && p.programIds.length === 0);
    if (orphans.length === 0) return null;
    const students = orphans.reduce((sum, p) => sum + p.activeStudents, 0);

    return (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30" data-testid="orphan-banner">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
                className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">
                    {t('company_admin.orphans.title', {
                        count: orphans.length, students,
                        defaultValue: '{{count}} promotion(s) ne sont rattachées à aucune formation ({{students}} étudiants)',
                    })}
                </span>
                <span className="text-xs font-medium underline">{open ? t('company_admin.orphans.hide', 'Masquer la liste') : t('company_admin.orphans.show', 'Voir la liste')}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-2">
                    <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                        {t('company_admin.orphans.help', 'Leurs étudiants n’apparaissent sur aucune page de la CVthèque. « Rattacher » ouvre la formation la plus proche, avec la promotion déjà cochée : vérifiez puis enregistrez.')}
                    </p>
                    <ul className="divide-y divide-amber-200/70 dark:divide-amber-900/40 rounded-lg bg-white/70 dark:bg-slate-900/60">
                        {orphans.map((p) => {
                            const target = bestProgramFor(p.name, programs);
                            return (
                                <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                                    <span className="flex-1 min-w-0 text-sm">
                                        <span className="font-medium text-slate-800 dark:text-slate-100">{p.name}</span>
                                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                            {t('company_admin.form.students_count', { count: p.activeStudents, defaultValue: '{{count}} étudiant(s)' })}
                                        </span>
                                    </span>
                                    <button type="button" onClick={() => onAttach(target, p.id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3f74ff] text-white text-xs font-semibold hover:bg-[#2f63ee] cursor-pointer"
                                        aria-label={t('company_admin.orphans.attach_to', {
                                            promotion: p.name, program: target?.displayName ?? t('company_admin.orphans.new_program', 'une nouvelle formation'),
                                            defaultValue: 'Rattacher {{promotion}} à {{program}}',
                                        })}>
                                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        {t('company_admin.orphans.attach', 'Rattacher')}
                                        {target && <span className="font-normal opacity-90">→ {target.displayName}</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
