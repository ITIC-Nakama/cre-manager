import { Loader2, FileSpreadsheet, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../../utils/titleUtils';

interface EtudiantsHeaderProps {
    totalElements: number;
    exporting: boolean;
    onExport: () => void;
}

export default function EtudiantsHeader({ totalElements, exporting, onExport }: EtudiantsHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                    <Users className="h-7 w-7 text-[#E2762F] shrink-0" />
                    {renderTitleWithGradient(t('dashboard.etudiants.title', 'Gestion des Étudiants'), 'itic-gradient-blue')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5">
                    {t('dashboard.etudiants.subtitle', { count: totalElements })}
                </p>
            </div>
            <button
                onClick={onExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
                {exporting
                    ? <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                    : <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                }
                {exporting ? t('dashboard.etudiants.exporting') : t('dashboard.etudiants.export_csv')}
            </button>
        </div>
    );
}
