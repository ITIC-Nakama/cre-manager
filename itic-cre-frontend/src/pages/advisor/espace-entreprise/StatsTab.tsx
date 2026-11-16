import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchAdminPrograms, fetchCompanySpaceStats } from '../../../api-s/requests/CompanySpaceRequest';
import { PROGRAMS_KEY } from './queryKeys';

/** Statistiques simples, sur 30 jours, sans aucune donnée sur les visiteurs. */
export default function StatsTab() {
    const { t } = useTranslation();
    const { data: stats } = useQuery({ queryKey: ['company-space', 'stats'], queryFn: fetchCompanySpaceStats });
    const { data: programs } = useQuery({ queryKey: PROGRAMS_KEY, queryFn: fetchAdminPrograms });
    if (!stats || !programs) {
        return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
    }
    const tiles = [
        { label: t('company_admin.stats.cv', 'CV en ligne'), value: stats.cvCount },
        { label: t('company_admin.stats.pages', 'Pages vues (30 j)'), value: stats.pageViews30d },
        { label: t('company_admin.stats.cv_views', 'CV ouverts (30 j)'), value: stats.cvViews30d },
        { label: t('company_admin.stats.requests', 'Demandes (30 j)'), value: stats.requests30d },
        { label: t('company_admin.stats.new_requests', 'Demandes à traiter'), value: stats.newRequests },
        { label: t('company_admin.stats.hidden', 'Étudiants qui ne veulent pas apparaître'), value: stats.hiddenStudents },
    ];
    const top = [...programs].filter((p) => p.pageViews30d + p.cvViews30d + p.requests30d > 0)
        .sort((a, b) => b.cvViews30d - a.cvViews30d || b.pageViews30d - a.pageViews30d).slice(0, 15);

    return (
        <div className="space-y-6">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                {tiles.map((tile) => (
                    <div key={tile.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
                        <p className="text-xs font-semibold text-slate-400">{tile.label}</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{tile.value}</p>
                    </div>
                ))}
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-slate-400 text-left">
                        <tr>
                            <th className="px-5 py-3 font-semibold">{t('company_admin.programs.col_program', 'Formation')}</th>
                            <th className="px-3 py-3 font-semibold text-right">{t('company_admin.stats.col_pages', 'Pages vues')}</th>
                            <th className="px-3 py-3 font-semibold text-right">{t('company_admin.stats.col_cv', 'CV ouverts')}</th>
                            <th className="px-5 py-3 font-semibold text-right">{t('company_admin.stats.col_requests', 'Demandes')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {top.length === 0 ? (
                            <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">{t('company_admin.stats.none', 'Aucune visite sur les 30 derniers jours.')}</td></tr>
                        ) : top.map((p) => (
                            <tr key={p.id}>
                                <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{p.displayName}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{p.pageViews30d}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{p.cvViews30d}</td>
                                <td className="px-5 py-2.5 text-right tabular-nums">{p.requests30d}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400">{t('company_admin.stats.privacy', 'Compteurs par jour et par formation uniquement : ni adresse IP, ni navigateur, ni cookie de mesure.')}</p>
        </div>
    );
}
