import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Link2, Loader2, Search, Unlink, X } from 'lucide-react';
import { fetchAllJobOffers } from '../../../../api-s/requests/JobOfferRequest';
import { attachOfferProgram, detachOfferProgram } from '../../../../api-s/requests/OfferAlertRequest';
import type { FormationOverview } from '../../../../api-s/requests/OfferAlertRequest';

/**
 * Rattacher / détacher des offres d'une formation (onglet Formations). Rattacher prévient les étudiants de la formation
 * (alerte instantanée) ; détacher n'envoie rien.
 */
export default function FormationOffersModal({ formation, onClose }: { formation: FormationOverview; onClose: () => void }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    useEffect(() => {
        const id = setTimeout(() => setDebounced(search.trim()), 300);
        return () => clearTimeout(id);
    }, [search]);

    const linkedKey = ['offer-alerts', 'formation-offers', formation.id];
    const { data: linked, isLoading } = useQuery({
        queryKey: linkedKey,
        queryFn: () => fetchAllJobOffers({ programIds: formation.id, source: 'ALL', size: 50, sort: 'createdAt,desc' }),
    });
    const { data: found, isFetching: searching } = useQuery({
        queryKey: ['offer-alerts', 'formation-search', debounced],
        queryFn: () => fetchAllJobOffers({ search: debounced, source: 'ALL', active: true, size: 10 }),
        enabled: debounced.length >= 2,
    });
    const linkedIds = new Set((linked?.content ?? []).map((o) => o.id));
    const refresh = () => queryClient.invalidateQueries({ queryKey: linkedKey });

    const attach = useMutation({
        mutationFn: (offerId: string) => attachOfferProgram(offerId, formation.id),
        onSuccess: () => {
            refresh();
            toast.success(t('formations.toast_attached', 'Offre rattachée : les étudiants de la formation seront prévenus.'));
        },
        onError: () => toast.error(t('formations.toast_error', 'Action impossible. Réessayez.')),
    });
    const detach = useMutation({
        mutationFn: (offerId: string) => detachOfferProgram(offerId, formation.id),
        onSuccess: () => {
            refresh();
            toast.success(t('formations.toast_detached', 'Offre détachée de la formation.'));
        },
        onError: () => toast.error(t('formations.toast_error', 'Action impossible. Réessayez.')),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true" aria-labelledby="formation-offers-title">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 id="formation-offers-title" className="text-base font-bold text-slate-900 dark:text-white">{formation.formation}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{t('formations.manage_hint', 'Rattacher une offre prévient les étudiants de la formation par e-mail ; détacher n’envoie rien.')}</p>
                    </div>
                    <button onClick={onClose} aria-label={t('alerts.close', 'Fermer')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="formation-offer-search" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('formations.attach_label', 'Rattacher une offre')}
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input id="formation-offer-search" type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('formations.attach_placeholder', 'Intitulé ou entreprise…')}
                                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        {searching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                        {found && debounced.length >= 2 && (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
                                {found.content.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">{t('formations.attach_none', 'Aucune offre trouvée.')}</li>}
                                {found.content.map((o) => (
                                    <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                        <span className="min-w-0"><span className="font-semibold">{o.title}</span><span className="block text-xs text-slate-400 truncate">{o.company}</span></span>
                                        {linkedIds.has(o.id) ? (
                                            <span className="text-xs text-slate-400 shrink-0">{t('formations.already_linked', 'Déjà rattachée')}</span>
                                        ) : (
                                            <button type="button" onClick={() => attach.mutate(o.id)} disabled={attach.isPending}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-60">
                                                <Link2 className="h-3.5 w-3.5" /> {t('formations.attach', 'Rattacher')}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('formations.linked_title', 'Offres rattachées ({{count}})', { count: linked?.totalElements ?? 0 })}
                        </p>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : (linked?.content ?? []).length === 0 ? (
                            <p className="text-sm text-slate-400">{t('formations.linked_none', 'Aucune offre rattachée.')}</p>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
                                {(linked?.content ?? []).map((o) => {
                                    const manual = o.programs?.find((p) => p.id === formation.id)?.manual;
                                    return (
                                        <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                            <span className="min-w-0">
                                                <span className="font-semibold">{o.title}</span>
                                                <span className="block text-xs text-slate-400 truncate">
                                                    {o.company} · {manual ? t('formations.link_manual', 'choisie par l’équipe') : t('formations.link_auto', 'déduite à l’import')}
                                                </span>
                                            </span>
                                            <button type="button" onClick={() => detach.mutate(o.id)} disabled={detach.isPending}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 cursor-pointer disabled:opacity-60">
                                                <Unlink className="h-3.5 w-3.5" /> {t('formations.detach', 'Détacher')}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
