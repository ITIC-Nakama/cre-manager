import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useModalLayer } from '../../../hooks/useModalLayer';
import { usePromotions } from '../../../hooks/usePromotions';
import { fieldClass } from '../../../components/basics/fieldStyles';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import { createProgram, deleteProgram, updateProgram } from '../../../api-s/requests/CompanySpaceRequest';
import type { AdminProgram, ProgramForm } from '../../../api-s/requests/CompanySpaceRequest';
import { getApiErrorMessage } from '../../../utils/errorHelper';
import { PROGRAMS_KEY } from './queryKeys';

/** Modifier (équipe) ou ajouter (admin) une formation de l'annuaire. */
export default function ProgramEditModal({ program, isAdmin, onClose }: { program: AdminProgram | null; isAdmin: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    useModalLayer();
    const queryClient = useQueryClient();
    const { data: promotions } = usePromotions();
    const creating = program === null;
    const [form, setForm] = useState({
        level: program?.level ?? 'BTS',
        domain: program?.domain ?? '',
        label: program?.label ?? '',
        slug: program?.slug ?? '',
        slugConfirmed: program?.slugConfirmed ?? true,
        matchKeywords: program?.matchKeywords ?? '',
        studyYear: program?.studyYear ?? 0,
        romeCodes: program?.romeCodes ?? '',
        offerKeywords: program?.offerKeywords ?? '',
        rhythm: program?.rhythm ?? '',
        availability: program?.availability ?? '',
        visible: program?.visible ?? true,
        promotionIds: program?.manualPromotions.map((p) => p.id) ?? [] as string[],
    });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

    const save = useMutation({
        mutationFn: () => {
            const body: ProgramForm = { ...form };
            return creating ? createProgram(body) : updateProgram(program.id, body);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY });
            toast.success(t('company_admin.saved', 'Enregistré.'));
            onClose();
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t('company_admin.save_error', 'La modification n’a pas pu être enregistrée.'))),
    });
    const remove = useMutation({
        mutationFn: () => deleteProgram(program!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY });
            onClose();
        },
    });

    const togglePromotion = (id: string) =>
        set('promotionIds', form.promotionIds.includes(id) ? form.promotionIds.filter((x) => x !== id) : [...form.promotionIds, id]);

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 animate-fadeIn" role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {creating ? t('company_admin.programs.add', 'Ajouter une formation') : program.displayName}
                    </h2>
                    <button type="button" onClick={onClose} aria-label={t('company_admin.close', 'Fermer')}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-5 grid gap-4 sm:grid-cols-2">
                    <Field label={t('company_admin.form.level', 'Niveau')}>
                        <select className={fieldClass(false, false)} value={form.level} disabled={!isAdmin} onChange={(e) => set('level', e.target.value as typeof form.level)}>
                            <option value="BTS">BTS</option><option value="BACHELOR">Bachelor</option><option value="MASTERE">Mastère</option>
                        </select>
                    </Field>
                    <Field label={t('company_admin.form.domain', 'Domaine')}>
                        <input className={fieldClass(false, false)} value={form.domain} maxLength={80} onChange={(e) => set('domain', e.target.value)} />
                    </Field>
                    <Field label={t('company_admin.form.label', 'Nom affiché')}>
                        <input className={fieldClass(false, false)} value={form.label} maxLength={80} onChange={(e) => set('label', e.target.value)} />
                    </Field>
                    <Field label={t('company_admin.form.slug', 'Adresse courte (comme itic.short.gy/…)')}>
                        <input className={`${fieldClass(false, false)} font-mono`} value={form.slug} maxLength={60}
                            onChange={(e) => set('slug', e.target.value.toLowerCase())} />
                        <label className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                            <input type="checkbox" className="accent-[#3f74ff]" checked={form.slugConfirmed} onChange={(e) => set('slugConfirmed', e.target.checked)} />
                            {t('company_admin.form.slug_confirmed', 'Adresse confirmée (lien court existant)')}
                        </label>
                    </Field>
                    <Field label={t('company_admin.form.year', 'Année d’étude')}>
                        <select className={fieldClass(false, false)} value={form.studyYear} onChange={(e) => set('studyYear', Number(e.target.value))}>
                            <option value={0}>{t('company_admin.form.all_years', 'Toutes')}</option>
                            {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </Field>
                    <Field label={t('company_admin.form.keywords', 'Mots-clés de rattachement')}>
                        <input className={fieldClass(false, false)} value={form.matchKeywords} maxLength={255}
                            placeholder="bts sio|bts informatique" onChange={(e) => set('matchKeywords', e.target.value)} />
                    </Field>
                    <Field label={t('company_admin.form.rome', 'Codes ROME (offres)')}>
                        <input className={`${fieldClass(false, false)} font-mono`} value={form.romeCodes} maxLength={255}
                            placeholder="M1805,M1810" onChange={(e) => set('romeCodes', e.target.value)} />
                    </Field>
                    <div className="sm:col-span-2 space-y-1.5">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('company_admin.form.offer_keywords', 'Mots-clés des offres (récapitulatif du lundi, suggestions)')}</p>
                        <textarea className={`${fieldClass(false, false)} min-h-20 font-mono text-xs`} value={form.offerKeywords} maxLength={1000}
                            placeholder="developpeur|web|java" onChange={(e) => set('offerKeywords', e.target.value)} />
                        <p className="text-xs text-slate-400">{t('company_admin.form.offer_keywords_hint', 'Cherchés dans l’intitulé (3 points), le secteur (2) et la description (1) des offres. Séparés par « | ».')}</p>
                    </div>
                    <Field label={t('company_admin.form.rhythm', 'Rythme (sur les cartes)')}>
                        <input className={fieldClass(false, false)} value={form.rhythm} maxLength={120}
                            placeholder={t('company_admin.form.rhythm_placeholder', '2 jours école / 3 jours entreprise')} onChange={(e) => set('rhythm', e.target.value)} />
                    </Field>
                    <Field label={t('company_admin.form.availability', 'Disponibilité (sur les cartes)')}>
                        <input className={fieldClass(false, false)} value={form.availability} maxLength={120}
                            placeholder={t('company_admin.form.availability_placeholder', 'Dès septembre 2026')} onChange={(e) => set('availability', e.target.value)} />
                    </Field>
                    <div className="sm:col-span-2 space-y-2">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('company_admin.form.promotions', 'Promotions choisies à la main')}</p>
                        <p className="text-xs text-slate-400">{t('company_admin.form.promotions_hint', 'Si vous en choisissez, elles remplacent les mots-clés.')}</p>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {(promotions ?? []).map((p) => {
                                const on = form.promotionIds.includes(p.id);
                                return (
                                    <button key={p.id} type="button" onClick={() => togglePromotion(p.id)} aria-pressed={on}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer ${on
                                            ? 'bg-[#3f74ff] border-[#3f74ff] text-white'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#3f74ff]'}`}>
                                        {p.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input type="checkbox" className="accent-[#3f74ff] h-4 w-4" checked={form.visible} onChange={(e) => set('visible', e.target.checked)} />
                        {t('company_admin.form.visible', 'Visible dans l’Espace entreprise')}
                    </label>
                </div>
                <div className="flex items-center justify-between gap-3 p-5 border-t border-slate-100 dark:border-slate-800">
                    {!creating && isAdmin ? (
                        <button type="button" onClick={() => setConfirmDelete(true)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 cursor-pointer">
                            <Trash2 className="h-4 w-4" /> {t('company_admin.form.delete', 'Retirer')}
                        </button>
                    ) : <span />}
                    <button type="button" onClick={() => save.mutate()} disabled={save.isPending}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3f74ff] text-white text-sm font-semibold hover:bg-[#2f63ee] disabled:opacity-50 cursor-pointer">
                        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t('company_admin.form.save', 'Enregistrer')}
                    </button>
                </div>
            </div>
            <ConfirmDialog isOpen={confirmDelete} title={t('company_admin.form.delete_title', 'Retirer cette formation ?')}
                message={t('company_admin.form.delete_message', 'Sa page publique ne sera plus accessible. Les CV restent dans le CRE.')}
                confirmLabel={t('company_admin.form.delete', 'Retirer')} loading={remove.isPending}
                onConfirm={() => remove.mutate()} onClose={() => setConfirmDelete(false)} />
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
            {children}
        </div>
    );
}
