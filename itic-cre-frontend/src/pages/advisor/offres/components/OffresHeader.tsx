import { Building2, Globe, Plus, Tags, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../../utils/titleUtils';

interface Props {
    totalElements: number;
    isAdmin: boolean;
    onExternalSyncClick: () => void;
    onWipeClick: () => void;
    onCategoriesClick: () => void;
    onCreateClick: () => void;
}

export default function OffresHeader({
    totalElements, isAdmin, onExternalSyncClick, onWipeClick, onCategoriesClick, onCreateClick,
}: Props) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                    <Building2 className="h-7 w-7 text-[#E2762F] shrink-0" />
                    {renderTitleWithGradient(t('dashboard.offres.title', "Gestion des Offres d'Emploi"), 'itic-gradient-blue')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('dashboard.offres.subtitle', { count: totalElements })}
                </p>
            </div>
            <div className="flex items-center gap-2">
                {isAdmin && (
                    <button
                        onClick={onExternalSyncClick}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#E2762F]/40 dark:border-[#E2762F]/50 bg-[#E2762F]/10 dark:bg-[#E2762F]/10 text-[#E2762F] hover:bg-[#E2762F]/20 dark:hover:bg-[#E2762F]/20 px-4 py-2 text-sm font-semibold transition-colors cursor-pointer"
                    >
                        <Globe className="h-4 w-4" />
                        {t('dashboard.offres.external_sync_button', 'Offres externes')}
                    </button>
                )}
                {isAdmin && (
                    <button
                        onClick={onWipeClick}
                        title={t('dashboard.offres.wipe_button', 'Tout supprimer')}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 px-3 py-2 text-sm font-semibold transition-colors cursor-pointer"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
                <button
                    onClick={onCategoriesClick}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 text-sm font-semibold transition-colors cursor-pointer"
                >
                    <Tags className="h-4 w-4" />
                    {t('dashboard.offres.categories_button', 'Secteurs & contrats')}
                </button>
                <button
                    onClick={onCreateClick}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    {t('dashboard.offres.create_button')}
                </button>
            </div>
        </div>
    );
}
