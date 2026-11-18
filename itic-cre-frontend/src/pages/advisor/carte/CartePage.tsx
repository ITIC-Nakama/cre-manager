import { useSearchParams } from 'react-router-dom';
import { Building2, GraduationCap, Map as MapIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StudentsMapTab from './StudentsMapTab';
import OffersMapTab from './OffersMapTab';

type View = 'etudiants' | 'offres';

/** /supervisor/carte : les deux cartes de l'équipe (lot 8), un onglet par carte. Équipe CRE et admin. */
export default function CartePage() {
    const { t } = useTranslation();
    const [params, setParams] = useSearchParams();
    const view: View = params.get('vue') === 'offres' ? 'offres' : 'etudiants';
    const tabs: { key: View; label: string; icon: React.ReactNode }[] = [
        { key: 'etudiants', label: t('carte.tab_students', 'Étudiants'), icon: <GraduationCap className="h-4 w-4" /> },
        { key: 'offres', label: t('carte.tab_offers', 'Entreprises et offres'), icon: <Building2 className="h-4 w-4" /> },
    ];

    return (
        <div className="space-y-6">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <MapIcon className="h-6 w-6 text-[#3f74ff]" /> {t('carte.title_maps', 'Cartes')}
            </h1>
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist">
                {tabs.map((tab) => (
                    <button key={tab.key} type="button" role="tab" aria-selected={view === tab.key}
                        onClick={() => setParams(tab.key === 'offres' ? { vue: 'offres' } : {}, { replace: true })}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap cursor-pointer ${view === tab.key
                            ? 'border-[#3f74ff] text-[#3f74ff]'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>
            {view === 'etudiants' ? <StudentsMapTab /> : <OffersMapTab />}
        </div>
    );
}
