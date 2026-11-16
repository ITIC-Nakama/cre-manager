import { Link } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompanyDirectory } from './useCompanyDirectory';

const LEVEL_LABEL: Record<string, string> = { BTS: 'BTS', BACHELOR: 'Bachelor', MASTERE: 'Mastère' };

/** /entreprise/candidats : répertoire niveau → domaine → formation, avec le nombre de CV. */
export default function CompanyDirectoryPage() {
    const { t } = useTranslation();
    const { data, isLoading } = useCompanyDirectory();
    if (isLoading || !data) {
        return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
    }
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t('company.directory.title', 'Répertoire de nos candidats')}</h1>
                <p className="text-slate-600 dark:text-[#9aa0a6] mt-1">
                    {t('company.directory.subtitle', 'Choisissez une formation pour consulter les CV de nos étudiants.')}
                </p>
            </div>
            {data.levels.map((level) => (
                <section key={level.level} id={level.level.toLowerCase()} className="space-y-3 scroll-mt-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{LEVEL_LABEL[level.level]}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {level.domains.map((domain) => (
                            <div key={domain.domain} className="bg-white dark:bg-[#15171f] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 pb-2">{domain.domain}</h3>
                                <ul>
                                    {domain.programs.map((p) => (
                                        <li key={p.slug}>
                                            <Link to={`/entreprise/candidats/${p.slug}`}
                                                className="flex items-center justify-between gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1e2130] group">
                                                <span className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-[#3f74ff]">{p.label}</span>
                                                <span className="flex items-center gap-1 shrink-0">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.cvCount > 0
                                                        ? 'bg-[#3f74ff]/10 text-[#3f74ff]'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                        {t('company.cv_count', '{{count}} CV', { count: p.cvCount })}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#3f74ff]" />
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
