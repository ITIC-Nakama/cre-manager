import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompanyDirectory } from './useCompanyDirectory';

const LEVEL_LABEL: Record<string, string> = { BTS: 'BTS', BACHELOR: 'Bachelor', MASTERE: 'Mastère' };

/** /entreprise : présentation et accès au répertoire. */
export default function CompanyHomePage() {
    const { t } = useTranslation();
    const { data, isLoading } = useCompanyDirectory();
    if (isLoading || !data) {
        return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
    }
    const total = data.levels.flatMap((l) => l.domains.flatMap((d) => d.programs)).reduce((sum, p) => sum + p.cvCount, 0);

    return (
        <section className="bg-white dark:bg-[#15171f] rounded-2xl shadow-xl px-5 py-10 sm:p-12 space-y-8">
            <div className="space-y-4 max-w-3xl">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d95e3e] to-[#fbbb07] text-white">
                    <Briefcase className="h-6 w-6" />
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">{data.texts.homeTitle}</h1>
                {data.texts.homeIntro && <p className="text-lg text-slate-600 dark:text-[#9aa0a6]">{data.texts.homeIntro}</p>}
                <Link to="/entreprise/candidats"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3f74ff] text-white font-semibold hover:bg-[#2f63ee]">
                    {t('company.home.cta', 'Voir nos candidats')} <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                {data.levels.map((level) => {
                    const count = level.domains.flatMap((d) => d.programs).reduce((sum, p) => sum + p.cvCount, 0);
                    return (
                        <Link key={level.level} to={`/entreprise/candidats#${level.level.toLowerCase()}`}
                            className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-[#3f74ff] transition-colors">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{LEVEL_LABEL[level.level]}</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{t('company.cv_count', '{{count}} CV', { count })}</p>
                            <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                                {t('company.home.domains', '{{count}} domaine(s)', { count: level.domains.length })}
                            </p>
                        </Link>
                    );
                })}
            </div>
            <p className="text-sm text-slate-400">{t('company.home.total', '{{count}} CV disponibles en ce moment.', { count: total })}</p>
        </section>
    );
}
