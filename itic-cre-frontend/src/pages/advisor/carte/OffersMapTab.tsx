import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Loader2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fieldClass } from '../../../components/basics/fieldStyles';
import FormationFilter from '../../../components/offers/FormationFilter';
import { useContractTypes } from '../../../hooks/useApplications';
import { fetchOffersMap, fetchOffersMapDepartment } from '../../../api-s/requests/OfferAlertRequest';
import type { OfferMapFilters } from '../../../api-s/requests/OfferAlertRequest';
import IdfMap from './IdfMap';

const SOURCES = ['ALL', 'MANUAL', 'EXTERNAL', 'FRANCE_TRAVAIL', 'BONNE_ALTERNANCE', 'ADZUNA', 'JSEARCH'] as const;

/**
 * Onglet « Entreprises et offres » (lot 8) : offres en ligne et entreprises par département, déduit de la
 * localisation de l'offre. Aucune adresse exacte, comme la carte des étudiants. Filtres : formations, contrat, source.
 */
export default function OffersMapTab() {
    const { t } = useTranslation();
    const [formations, setFormations] = useState('');
    const [contractTypeId, setContractTypeId] = useState('');
    const [source, setSource] = useState<string>('ALL');
    const [selected, setSelected] = useState<string | null>(null);
    const { data: contractTypes } = useContractTypes();
    const filters: OfferMapFilters = {
        programIds: formations ? formations.split(',') : undefined,
        contractTypeId: contractTypeId || undefined,
        source,
    };
    const { data: map, isLoading } = useQuery({ queryKey: ['offers-map', filters], queryFn: () => fetchOffersMap(filters) });
    const { data: companies, isFetching } = useQuery({
        queryKey: ['offers-map', 'department', selected, filters],
        queryFn: () => fetchOffersMapDepartment(selected as string, filters),
        enabled: !!selected,
    });

    const counts = Object.fromEntries((map?.departments ?? []).map((d) => [d.code, d.count]));
    const others = (map?.departments ?? []).filter((d) => !d.ileDeFrance);
    const idfTotal = (map?.departments ?? []).filter((d) => d.ileDeFrance).reduce((s, d) => s + d.count, 0);
    const selectedDep = map?.departments.find((d) => d.code === selected);
    const label = (code: string, name: string, count: number) =>
        t('carte.offers_department_label', '{{name}} ({{code}}) : {{count}} offre(s)', { name, code, count });
    const sourceLabels: Record<string, string> = {
        ALL: t('carte.source_all', 'Toutes les sources'),
        MANUAL: t('carte.source_manual', 'Exclusivité ITIC PARIS'),
        EXTERNAL: t('carte.source_external', 'Offres externes (toutes)'),
        FRANCE_TRAVAIL: t('carte.source_france_travail', 'France Travail'),
        BONNE_ALTERNANCE: t('carte.source_bonne_alternance', 'La Bonne Alternance'),
        ADZUNA: t('carte.source_adzuna', 'Adzuna'),
        JSEARCH: t('carte.source_jsearch', 'JSearch'),
    };
    const sourceLabel = (s: string) => sourceLabels[s] ?? s;

    return (
        <div className="space-y-6">
            <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                {t('carte.offers_subtitle', 'Offres en ligne et entreprises qui recrutent, par département (d’après la localisation de l’offre). Aucune adresse exacte n’est affichée.')}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
                <FormationFilter appearance="field" value={formations} onChange={(v) => { setFormations(v); setSelected(null); }} className="w-full" />
                <select className={fieldClass(false, false)} aria-label={t('carte.filter_contract_type', 'Type de contrat')}
                    value={contractTypeId} onChange={(e) => setContractTypeId(e.target.value)}>
                    <option value="">{t('carte.all_contract_types', 'Tous les contrats')}</option>
                    {(contractTypes ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select className={fieldClass(false, false)} aria-label={t('carte.filter_source', 'Source')}
                    value={source} onChange={(e) => setSource(e.target.value)}>
                    {SOURCES.map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
                </select>
            </div>

            {isLoading || !map ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : (
                <>
                    <p className="text-sm text-slate-500 dark:text-[#9aa0a6]" data-testid="offers-map-summary">
                        {t('carte.offers_summary', '{{located}} offre(s) localisée(s), dont {{idf}} en Île-de-France · {{companies}} entreprise(s) · {{missing}} sans localisation', {
                            located: map.located, idf: idfTotal, companies: map.companies, missing: map.notLocated,
                        })}
                    </p>
                    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t('carte.idf', 'Île-de-France')}</h2>
                            <IdfMap counts={counts} selected={selected} onSelect={setSelected} label={label} />
                            <p className="mt-3 text-[11px] text-slate-400">
                                {t('carte.source', 'Contours : IGN – Admin Express, via france-geojson (Licence ouverte).')}
                            </p>
                        </section>
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t('carte.others', 'Autres départements')}</h2>
                            {others.length === 0 ? (
                                <p className="text-sm text-slate-400">{t('carte.offers_others_none', 'Aucune offre hors Île-de-France.')}</p>
                            ) : (
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                                    {others.map((d) => (
                                        <li key={d.code}>
                                            <button type="button" onClick={() => setSelected(d.code)} aria-pressed={selected === d.code}
                                                className={`w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg text-left text-sm cursor-pointer ${selected === d.code
                                                    ? 'bg-[#3f74ff]/10 text-[#3f74ff]' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
                                                <span><span className="font-mono text-xs text-slate-400 mr-2">{d.code}</span>{d.name}</span>
                                                <span className="font-semibold tabular-nums">{d.count}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                </>
            )}

            {selected && (
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <h2 className="flex flex-wrap items-center gap-2 px-5 py-3 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                        <MapPin className="h-4 w-4 text-[#3f74ff]" /> {selectedDep?.name ?? selected} ({selected})
                        {selectedDep && <span className="font-normal text-slate-400">· {t('carte.offers_department_counts', '{{count}} offre(s), {{companies}} entreprise(s)', { count: selectedDep.count, companies: selectedDep.companies })}</span>}
                    </h2>
                    {isFetching && !companies ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                    ) : !companies || companies.length === 0 ? (
                        <p className="px-5 py-8 text-sm text-slate-400 text-center">{t('carte.offers_none', 'Aucune offre avec ces filtres.')}</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {companies.map((c) => (
                                <li key={c.company} className="px-5 py-3">
                                    <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" /> {c.company}
                                        <span className="text-xs font-normal text-slate-400">{t('carte.offers_count', '{{count}} offre(s)', { count: c.offers })}</span>
                                    </p>
                                    <ul className="mt-1 ml-6 space-y-0.5">
                                        {c.items.map((o) => (
                                            <li key={o.id} className="text-sm text-slate-600 dark:text-slate-300">
                                                <Link to={`/supervisor/offres?q=${encodeURIComponent(o.title)}&source=ALL`} className="hover:text-[#3f74ff]">{o.title}</Link>
                                                <span className="text-xs text-slate-400"> · {[o.contractType, sourceLabel(o.source)].filter(Boolean).join(' · ')}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </div>
    );
}
