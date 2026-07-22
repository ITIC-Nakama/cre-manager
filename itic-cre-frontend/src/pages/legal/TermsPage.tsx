import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import logoDark from '../../assets/itic-paris-logo-dark.svg';
import logoWhite from '../../assets/itic-paris-logo-white.svg';

export default function TermsPage() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <img src={logoDark} alt="ITIC Paris" className="h-8 w-auto dark:hidden" />
                        <img src={logoWhite} alt="ITIC Paris" className="h-8 w-auto hidden dark:block" />
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <FileText className="w-3.5 h-3.5" />
                            {t('legal.terms.badge')}
                        </span>
                    </div>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#3f74ff] hover:text-blue-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('legal.back_to_home')}
                    </Link>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('legal.terms.title')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('legal.terms.last_updated', { date: '21 Juillet 2026' })}
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-700/60 space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <section className="space-y-2">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('legal.terms.sec1_title')}</h2>
                        <p>
                            {t('legal.terms.sec1_desc')}
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('legal.terms.sec2_title')}</h2>
                        <p>
                            {t('legal.terms.sec2_desc')}
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('legal.terms.sec3_title')}</h2>
                        <p>
                            {t('legal.terms.sec3_desc')}
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('legal.terms.sec4_title')}</h2>
                        <p>
                            {t('legal.terms.sec4_desc')}
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
