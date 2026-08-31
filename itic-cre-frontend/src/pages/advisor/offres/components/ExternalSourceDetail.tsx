import { Loader2, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MultiSelectReference from '../../../../components/basics/MultiSelectReference';
import type { ExternalSourceStat, ReferenceOption } from '../../../../types/models/JobOffer';

export interface CriteriaForm {
    romeCodes: string;
    departments: string;
    keywords: string;
    category: string;
    excludedEmployers: string;
}

/** ADZUNA n'a pas de taxonomie ROME (contrairement à FRANCE_TRAVAIL/BONNE_ALTERNANCE) — critères différents. */
const ROME_BASED_SOURCES = new Set(['FRANCE_TRAVAIL', 'BONNE_ALTERNANCE']);

/** Types de contrat priorisés à 2/3 du quota de synchronisation (voir AdzunaProvider/FranceTravailProvider) — mis en avant visuellement pour vérifier l'effet en direct. */
const PRIORITY_CONTRACT_LABELS = new Set(['Alternance', 'Stage']);

interface ExternalSourceDetailProps {
    source: ExternalSourceStat;
    form: CriteriaForm;
    onFieldChange: (field: keyof CriteriaForm, value: string) => void;
    dirty: boolean;
    saving: boolean;
    onSave: () => void;
    onToggle: () => void;
    toggling: boolean;
    romeCodesRef: ReferenceOption[];
    romeCodesRefLoading: boolean;
    adzunaCategoriesRef: ReferenceOption[];
    adzunaCategoriesRefLoading: boolean;
}

export default function ExternalSourceDetail({
    source,
    form,
    onFieldChange,
    dirty,
    saving,
    onSave,
    onToggle,
    toggling,
    romeCodesRef,
    romeCodesRefLoading,
    adzunaCategoriesRef,
    adzunaCategoriesRefLoading,
}: ExternalSourceDetailProps) {
    const { t } = useTranslation();
    const romeBased = ROME_BASED_SOURCES.has(source.source);

    return (
        <div className="flex flex-col gap-5 p-5 rounded-2xl bg-slate-50 dark:bg-[#15171F] border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {source.label}
                    </p>
                    <p className="text-xs text-slate-400">
                        {t('dashboard.admin.jobboard_external.active_offers', { count: source.activeOffers })}
                    </p>
                    {source.offersByContractType.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {source.offersByContractType.map(({ label, count }) => (
                                <span
                                    key={label}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        PRIORITY_CONTRACT_LABELS.has(label)
                                            ? 'bg-[#E2762F]/10 dark:bg-[#E2762F]/15 text-[#E2762F] dark:text-[#f0a066]'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    {label} · {count}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={onToggle}
                    disabled={toggling}
                    role="switch"
                    aria-checked={source.enabled}
                    title={t(
                        source.enabled
                            ? 'dashboard.admin.jobboard_external.source_enabled'
                            : 'dashboard.admin.jobboard_external.source_disabled'
                    )}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                        source.enabled ? 'bg-[#E2762F]' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            source.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>

            {/* Critère principal — plein largeur, c'est le plus consulté */}
            <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                    {romeBased
                        ? t('dashboard.admin.jobboard_external.field_rome_codes', 'Codes ROME')
                        : t('dashboard.admin.jobboard_external.field_category', 'Catégories')}
                </label>
                {romeBased ? (
                    <MultiSelectReference
                        options={romeCodesRef}
                        loading={romeCodesRefLoading}
                        value={form.romeCodes}
                        onChange={(csv) => onFieldChange('romeCodes', csv)}
                        allLabel={t('dashboard.admin.jobboard_external.option_all_offers', 'Toutes les offres')}
                        searchPlaceholder={t('dashboard.admin.jobboard_external.search_rome_codes', 'Rechercher un métier…')}
                        noResultsLabel={t('dashboard.admin.jobboard_external.no_results', 'Aucun résultat')}
                        closeLabel={t('dashboard.admin.jobboard_external.close', 'Fermer')}
                        selectedCountLabel={(count) => t('dashboard.admin.jobboard_external.multi_select_count', { count, defaultValue: `${count} sélectionnés` })}
                    />
                ) : (
                    <MultiSelectReference
                        options={adzunaCategoriesRef}
                        loading={adzunaCategoriesRefLoading}
                        value={form.category}
                        onChange={(csv) => onFieldChange('category', csv)}
                        allLabel={t('dashboard.admin.jobboard_external.option_all_offers', 'Toutes les offres')}
                        searchPlaceholder={t('dashboard.admin.jobboard_external.search_categories', 'Rechercher une catégorie…')}
                        noResultsLabel={t('dashboard.admin.jobboard_external.no_results', 'Aucun résultat')}
                        closeLabel={t('dashboard.admin.jobboard_external.close', 'Fermer')}
                        selectedCountLabel={(count) => t('dashboard.admin.jobboard_external.multi_select_count', { count, defaultValue: `${count} sélectionnés` })}
                    />
                )}
            </div>

            {/* Critères secondaires — deux colonnes sur écran large */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {romeBased ? (
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                            {t('dashboard.admin.jobboard_external.field_departments', 'Départements')}
                        </label>
                        <input
                            type="text"
                            value={form.departments}
                            onChange={(e) => onFieldChange('departments', e.target.value)}
                            placeholder={t('dashboard.admin.jobboard_external.field_departments_placeholder', 'Ex: 75,92,93 — vide = toute la France')}
                            className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2762F]/30"
                        />
                    </div>
                ) : (
                    <>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                {t('dashboard.admin.jobboard_external.field_keywords', 'Mots-clés')}
                            </label>
                            <input
                                type="text"
                                value={form.keywords}
                                onChange={(e) => onFieldChange('keywords', e.target.value)}
                                placeholder={t('dashboard.admin.jobboard_external.field_keywords_placeholder', 'Vide = aucune restriction')}
                                className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2762F]/30"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                {t('dashboard.admin.jobboard_external.field_location', 'Localisation')}
                            </label>
                            <input
                                type="text"
                                value={form.departments}
                                onChange={(e) => onFieldChange('departments', e.target.value)}
                                placeholder={t('dashboard.admin.jobboard_external.field_location_placeholder', 'Ex: Paris, Lyon — vide = toute la France')}
                                className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2762F]/30"
                            />
                        </div>
                    </>
                )}
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                        {t('dashboard.admin.jobboard_external.field_excluded_employers', 'Employeurs exclus')}
                    </label>
                    <input
                        type="text"
                        value={form.excludedEmployers}
                        onChange={(e) => onFieldChange('excludedEmployers', e.target.value)}
                        placeholder={t('dashboard.admin.jobboard_external.field_excluded_employers_placeholder', 'Ex: ISCOD,CFA ITIS — vide = aucune exclusion')}
                        className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2762F]/30"
                    />
                </div>
            </div>

            <button
                onClick={onSave}
                disabled={!dirty || saving}
                className="self-end inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-white disabled:opacity-40"
            >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('dashboard.admin.jobboard_external.save_criteria', 'Enregistrer')}
            </button>
        </div>
    );
}
