import { useState } from 'react';
import { Building2, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import IticOffresTab from './components/IticOffresTab';
import ExternalOffresTab from './components/ExternalOffresTab';

type OffresTab = 'itic' | 'external';

export default function OffresPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<OffresTab>('itic');

    return (
        <div className="flex flex-col gap-6  animate-fadeIn">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                    <Building2 className="h-7 w-7 text-[#E2762F] shrink-0" />
                    {renderTitleWithGradient(t('dashboard.student_offres.title', "Offres d'Emploi"), 'itic-gradient-blue')}
                </h1>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('itic')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 cursor-pointer ${
                        activeTab === 'itic'
                            ? 'bg-white dark:bg-slate-800 text-[#E2762F] shadow-sm scale-[1.03]'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    <Building2 className={`h-4 w-4 transition-transform duration-300 ${activeTab === 'itic' ? 'scale-110' : ''}`} />
                    {t('dashboard.offres.tabs.itic')}
                </button>
                <button
                    onClick={() => setActiveTab('external')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 cursor-pointer ${
                        activeTab === 'external'
                            ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm scale-[1.03]'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    <Globe className={`h-4 w-4 transition-transform duration-300 ${activeTab === 'external' ? 'scale-110 rotate-12' : ''}`} />
                    {t('dashboard.offres.tabs.external')}
                </button>
            </div>

            {activeTab === 'itic' ? <IticOffresTab /> : <ExternalOffresTab />}
        </div>
    );
}
