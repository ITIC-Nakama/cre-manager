import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, FileSignature, Tags } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import ReferenceDataManager from '../../../components/shared/ReferenceDataManager';
import { SECTORS_BASE_PATH, CONTRACT_TYPES_BASE_PATH } from '../../../api-s/requests/ReferenceDataRequest';

type Tab = 'sectors' | 'contractTypes';

export default function CategoriesPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('sectors');

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">
            <div>
                <button
                    onClick={() => navigate('/supervisor/offres')}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer mb-2"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t('dashboard.offres.categories.back_button')}
                </button>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                    <Tags className="h-7 w-7 text-[#E2762F] shrink-0" />
                    {renderTitleWithGradient(t('dashboard.offres.categories.page_title'), 'itic-gradient-blue')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('dashboard.offres.categories.page_subtitle')}
                </p>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setTab('sectors')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
                        tab === 'sectors'
                            ? 'border-[#E2762F] text-[#E2762F]'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                    <Layers className="h-4 w-4" />
                    {t('dashboard.offres.categories.tab_sectors')}
                </button>
                <button
                    onClick={() => setTab('contractTypes')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
                        tab === 'contractTypes'
                            ? 'border-[#E2762F] text-[#E2762F]'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                    <FileSignature className="h-4 w-4" />
                    {t('dashboard.offres.categories.tab_contract_types')}
                </button>
            </div>

            {tab === 'sectors' ? (
                <ReferenceDataManager basePath={SECTORS_BASE_PATH} queryKey="sectors" />
            ) : (
                <ReferenceDataManager basePath={CONTRACT_TYPES_BASE_PATH} queryKey="contract-types" />
            )}
        </div>
    );
}
