import { useSearchParams } from 'react-router-dom';
import { BarChart3, Building2, ExternalLink, GraduationCap, Inbox, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import { useNewCompanyRequestCount } from './useNewCompanyRequestCount';
import { usePublicConfig } from '../../../hooks/usePublicConfig';
import NotAvailablePage from '../../../components/shared/NotAvailablePage';
import ProgramsTab from './ProgramsTab';
import RequestsTab from './RequestsTab';
import StatsTab from './StatsTab';
import SettingsTab from './SettingsTab';

type Tab = 'formations' | 'demandes' | 'statistiques' | 'reglages';

/** /supervisor/espace-entreprise : back-office de l'Espace entreprise (vouvoiement). */
export default function CompanySpacePage() {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const isAdmin = user?.role === Role.ADMIN;
    const [params, setParams] = useSearchParams();
    const tab = (params.get('onglet') as Tab) || 'formations';
    // Lot 10 : espace masqué → page réservée aux admins (adresse directe), aucun menu n'y mène.
    const { companySpaceEnabled, isPending } = usePublicConfig();
    const { data: newCount } = useNewCompanyRequestCount(!isPending && (companySpaceEnabled || isAdmin));

    const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
        { key: 'formations', label: t('company_admin.tabs.programs', 'Formations'), icon: <GraduationCap className="h-4 w-4" /> },
        { key: 'demandes', label: t('company_admin.tabs.requests', 'Demandes'), icon: <Inbox className="h-4 w-4" />, badge: newCount },
        { key: 'statistiques', label: t('company_admin.tabs.stats', 'Statistiques'), icon: <BarChart3 className="h-4 w-4" /> },
        { key: 'reglages', label: t('company_admin.tabs.settings', 'Textes et accès'), icon: <Settings2 className="h-4 w-4" /> },
    ];

    if (isPending) return null;
    if (!companySpaceEnabled && !isAdmin) return <NotAvailablePage fullScreen={false} />;

    return (
        <div className="space-y-6">
            {!companySpaceEnabled && (
                <p role="note" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300">
                    {t('company_admin.hidden_banner', 'Espace entreprise masqué : cette page n’apparaît dans aucun menu.')}
                </p>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                        <Building2 className="h-6 w-6 text-[#3f74ff]" /> {t('company_admin.title', 'Espace entreprise')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-1 max-w-3xl">
                        {t('company_admin.subtitle', 'L’annuaire public des CV pour les entreprises. Un étudiant y apparaît automatiquement quand son CV est validé, tant qu’il n’a pas de contrat, que son compte est actif et qu’il ne s’y est pas opposé.')}
                    </p>
                </div>
                {companySpaceEnabled && <a href="/entreprise" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <ExternalLink className="h-4 w-4" /> {t('company_admin.open_public', 'Ouvrir l’Espace entreprise')}
                </a>}
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist">
                {tabs.map((item) => (
                    <button key={item.key} type="button" role="tab" aria-selected={tab === item.key}
                        onClick={() => setParams({ onglet: item.key }, { replace: true })}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap cursor-pointer ${tab === item.key
                            ? 'border-[#3f74ff] text-[#3f74ff]'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                        {item.icon}{item.label}
                        {!!item.badge && <span className="ml-1 text-[11px] font-bold bg-rose-500 text-white rounded-full px-1.5 py-0.5">{item.badge}</span>}
                    </button>
                ))}
            </div>

            {tab === 'formations' && <ProgramsTab isAdmin={isAdmin} />}
            {tab === 'demandes' && <RequestsTab />}
            {tab === 'statistiques' && <StatsTab />}
            {tab === 'reglages' && <SettingsTab isAdmin={isAdmin} />}
        </div>
    );
}
