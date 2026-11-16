import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import RecommendedOffers from '../../../components/matching/RecommendedOffers';
import { Building2, Globe, GraduationCap } from 'lucide-react';
import { apiClient } from '../../../api-s/AxiosApiClient';
import { unwrap } from '../../../api-s/unwrap';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { useScrollTopOnChange } from '../../../hooks/useScrollTopOnChange';
import IticOffresTab from './components/IticOffresTab';
import ExternalOffresTab from './components/ExternalOffresTab';

type OffresTab = 'itic' | 'external';

export default function OffresPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<OffresTab>('itic');
    useScrollTopOnChange(activeTab);
    const [, setSearchParams] = useSearchParams();
    // « Offres pour ma formation » (lot 8) : choisi par défaut quand l'étudiant a une formation ; il peut tout voir.
    const { data: myFormation, isPending: formationPending } = useQuery({
        queryKey: ['me', 'formation'],
        queryFn: () => apiClient.get('/me/formation').then((r) => unwrap<{ formation: string | null; pedagogyUrl: string | null }>(r)),
        staleTime: 30 * 60_000,
    });
    const [showAll, setShowAll] = useState(false);
    const hasFormation = !!myFormation?.formation;
    const onlyMine = hasFormation && !showAll;
    // Une recommandation ouvre la fiche de l'offre (lien direct ?offre=, géré par l'onglet ITIC quelle que soit la source).
    const openOffer = (offerId: string) => {
        setActiveTab('itic');
        setSearchParams({ offre: offerId });
    };

    return (
        <div className="flex flex-col gap-6  animate-fadeIn">

            {/* Header + Tabs (sticky ensemble) */}
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] py-2 flex flex-col gap-4">
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
                        {t('dashboard.offres.tabs.itic', 'Exclusivité ITIC PARIS')}
                    </button>
                    <button
                        onClick={() => setActiveTab('external')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 cursor-pointer ${
                            activeTab === 'external'
                                ? 'bg-white dark:bg-slate-800 text-[#1E51FF] dark:text-[#7B9FFF] shadow-sm scale-[1.03]'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <Globe className={`h-4 w-4 transition-transform duration-300 ${activeTab === 'external' ? 'scale-110 rotate-12' : ''}`} />
                        {t('dashboard.offres.tabs.external')}
                    </button>
                </div>
            </div>

            <RecommendedOffers onOpen={openOffer} />

            {hasFormation && (
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('student.offers_scope_label', 'Offres affichées')}>
                    <button type="button" aria-pressed={onlyMine} onClick={() => setShowAll(false)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${onlyMine
                            ? 'bg-[#3f74ff] border-[#3f74ff] text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#3f74ff]'}`}>
                        <GraduationCap className="h-4 w-4" />
                        {t('student.offers_mine', 'Offres pour ma formation')}
                    </button>
                    <button type="button" aria-pressed={!onlyMine} onClick={() => setShowAll(true)}
                        className={`px-3 py-1.5 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${!onlyMine
                            ? 'bg-[#3f74ff] border-[#3f74ff] text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#3f74ff]'}`}>
                        {t('student.offers_all', 'Toutes les offres')}
                    </button>
                    {onlyMine && <span className="text-xs text-slate-400">{myFormation?.formation}</span>}
                </div>
            )}

            {/* Liste chargée une fois la formation connue : une seule requête, déjà filtrée sur « ma formation ». */}
            {formationPending ? null
                : activeTab === 'itic' ? <IticOffresTab myFormation={onlyMine} /> : <ExternalOffresTab myFormation={onlyMine} />}
        </div>
    );
}
