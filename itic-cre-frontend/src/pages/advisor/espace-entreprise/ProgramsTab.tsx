import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Copy, Eye, EyeOff, Loader2, Pencil, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    companyProgramUrl, fetchAdminPrograms, fetchCompanySpaceSettings, fetchPromotionOverview, updateProgram,
} from '../../../api-s/requests/CompanySpaceRequest';
import type { AdminProgram } from '../../../api-s/requests/CompanySpaceRequest';
import ProgramEditModal from './ProgramEditModal';
import { PROGRAMS_KEY, PROMOTIONS_OVERVIEW_KEY, SETTINGS_KEY } from './queryKeys';
import OrphanPromotionsBanner from './OrphanPromotionsBanner';
import ProgramPreviewModal from './ProgramPreviewModal';

const LEVEL_LABEL: Record<string, string> = { BTS: 'BTS', BACHELOR: 'Bachelor', MASTERE: 'Mastère' };

/** Formations de l'annuaire : promotions rattachées, nombre de CV, visibilité, aperçu, lien à copier. */
export default function ProgramsTab({ isAdmin }: { isAdmin: boolean }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { data: programs, isLoading } = useQuery({ queryKey: PROGRAMS_KEY, queryFn: fetchAdminPrograms });
    const { data: settings } = useQuery({ queryKey: SETTINGS_KEY, queryFn: fetchCompanySpaceSettings });
    const [editing, setEditing] = useState<AdminProgram | 'new' | null>(null);
    // Bandeau des promotions orphelines (lot 12) : « Rattacher » ouvre la formation qui leur ressemble, promotion cochée.
    const [presetPromotionId, setPresetPromotionId] = useState<string | undefined>();
    const { data: promotionOverview } = useQuery({ queryKey: PROMOTIONS_OVERVIEW_KEY, queryFn: fetchPromotionOverview });
    const [previewing, setPreviewing] = useState<AdminProgram | null>(null);

    const toggle = useMutation({
        mutationFn: (p: AdminProgram) => updateProgram(p.id, { visible: !p.visible }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company-space'] }),
        onError: () => toast.error(t('company_admin.save_error', 'La modification n’a pas pu être enregistrée.')),
    });

    const copy = async (p: AdminProgram) => {
        try {
            await navigator.clipboard.writeText(companyProgramUrl(p.slug, settings));
            toast.success(t('company_admin.link_copied', 'Lien copié'));
        } catch {
            toast.error(t('company_admin.copy_error', 'Copie impossible : sélectionnez le lien à la main.'));
        }
    };

    if (isLoading || !programs) {
        return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
    }
    const levels = ['BTS', 'BACHELOR', 'MASTERE'] as const;
    const unlinked = programs.filter((p) => p.visible && p.linkedPromotions.length === 0).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                    {t('company_admin.programs.hint', 'Chaque formation a sa page dans la CVthèque. Les étudiants des promotions affichées y apparaissent quand leur CV est validé, tant qu’ils n’ont pas de contrat.')}
                </p>
                {isAdmin && (
                    <button type="button" onClick={() => setEditing('new')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3f74ff] text-white text-sm font-semibold hover:bg-[#2f63ee] cursor-pointer">
                        <Plus className="h-4 w-4" /> {t('company_admin.programs.add', 'Ajouter une formation')}
                    </button>
                )}
            </div>
            <OrphanPromotionsBanner promotions={promotionOverview ?? []} programs={programs}
                onAttach={(program, promotionId) => { setPresetPromotionId(promotionId); setEditing(program ?? 'new'); }} />
            {unlinked > 0 && (
                <p className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl px-4 py-3">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {t('company_admin.programs.unlinked', '{{count}} formation(s) affichée(s) sans aucune promotion : leur page reste vide. Ouvrez la formation et cochez ses promotions.', { count: unlinked })}
                </p>
            )}
            {levels.map((level) => {
                const rows = programs.filter((p) => p.level === level);
                if (rows.length === 0) return null;
                return (
                    <section key={level} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <h2 className="px-5 py-3 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">{LEVEL_LABEL[level]}</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs uppercase text-slate-400 text-left">
                                    <tr>
                                        <th className="px-5 py-2 font-semibold">{t('company_admin.programs.col_program', 'Formation')}</th>
                                        <th className="px-3 py-2 font-semibold">{t('company_admin.programs.col_address', 'Adresse de la page')}</th>
                                        <th className="px-3 py-2 font-semibold">{t('company_admin.programs.col_promotions', 'Promotions affichées')}</th>
                                        <th className="px-3 py-2 font-semibold text-right" title={t('company_admin.programs.col_visible_hint', 'Étudiants qui apparaissent réellement : compte actif, CV validé, sans contrat, d’accord pour apparaître.')}>{t('company_admin.programs.col_visible', 'Étudiants visibles')}</th>
                                        <th className="px-3 py-2 font-semibold text-right">{t('company_admin.programs.col_views', 'Vues 30 j')}</th>
                                        <th className="px-5 py-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {rows.map((p) => (
                                        <tr key={p.id} className={p.visible ? '' : 'opacity-60'}>
                                            <td className="px-5 py-3">
                                                <p className="font-semibold text-slate-900 dark:text-white">{p.label}</p>
                                                <p className="text-xs text-slate-400">{p.domain}{p.studyYear ? ` · ${t('company_admin.programs.year', 'année {{year}}', { year: p.studyYear })}` : ''}</p>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{p.slug}</span>
                                                {!p.slugConfirmed && (
                                                    <span className="ml-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 rounded-full px-2 py-0.5">
                                                        {t('company_admin.programs.to_confirm', 'à confirmer')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 max-w-xs">
                                                {p.linkedPromotions.length === 0
                                                    ? <span className="text-xs text-amber-700 dark:text-amber-300">{t('company_admin.programs.none', 'Aucune')}</span>
                                                    : <span className="text-xs text-slate-600 dark:text-slate-300">{p.linkedPromotions.map((x) => x.name).join(', ')}</span>}
                                                <span className="block text-[11px] text-slate-400">
                                                    {p.manualPromotions.length > 0 ? t('company_admin.programs.manual', 'choisies à la main') : t('company_admin.programs.auto', 'rattachement automatique')}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                                                {p.cvCount === 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300" data-testid="zero-visible"
                                                        title={t('company_admin.programs.zero_hint', 'Aucun étudiant n’apparaît : la page publique est vide.')}>
                                                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />0
                                                        <span className="sr-only">{t('company_admin.programs.zero_hint', 'Aucun étudiant n’apparaît : la page publique est vide.')}</span>
                                                    </span>
                                                ) : <span className="text-slate-900 dark:text-white">{p.cvCount}</span>}
                                            </td>
                                            <td className="px-3 py-3 text-right text-slate-500">{p.pageViews30d}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <IconButton title={t('company_admin.programs.preview', 'Aperçu')} onClick={() => setPreviewing(p)}><Eye className="h-4 w-4" /></IconButton>
                                                    <IconButton title={t('company_admin.programs.copy', 'Copier le lien')} onClick={() => copy(p)}><Copy className="h-4 w-4" /></IconButton>
                                                    <IconButton title={p.visible ? t('company_admin.programs.hide', 'Masquer') : t('company_admin.programs.show', 'Afficher')}
                                                        onClick={() => toggle.mutate(p)}>{p.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-emerald-600" />}</IconButton>
                                                    <IconButton title={t('company_admin.programs.edit', 'Modifier')} onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></IconButton>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            })}
            {editing && <ProgramEditModal program={editing === 'new' ? null : editing} isAdmin={isAdmin} presetPromotionId={presetPromotionId}
                onClose={() => { setEditing(null); setPresetPromotionId(undefined); }} />}
            {previewing && <ProgramPreviewModal program={previewing} onClose={() => setPreviewing(null)} />}
        </div>
    );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" title={title} aria-label={title} onClick={onClick}
            className="p-2 rounded-lg text-slate-500 hover:text-[#3f74ff] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            {children}
        </button>
    );
}
