import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Lock, FileText, Clock, UserCheck, Trash2, Download } from 'lucide-react';
import logoDark from '../../assets/itic-paris-logo-dark.svg';
import logoWhite from '../../assets/itic-paris-logo-white.svg';

export default function PrivacyPolicyPage() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <img src={logoDark} alt="ITIC Paris" className="h-8 w-auto dark:hidden" />
                        <img src={logoWhite} alt="ITIC Paris" className="h-8 w-auto hidden dark:block" />
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-[#3f74ff] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {t('legal.privacy.badge')}
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
                        {t('legal.privacy.title')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('legal.privacy.last_updated', { date: '21 Juillet 2026' })} — {t('legal.privacy.gdpr_compliance')}
                    </p>
                </div>

                {/* Content Cards */}
                <div className="grid gap-6">

                    {/* Section 1: Intro */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                        <div className="flex items-center gap-3 text-[#3f74ff]">
                            <Lock className="w-5 h-5" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('legal.privacy.sec1_title')}</h2>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {t('legal.privacy.sec1_desc')}
                        </p>
                    </div>

                    {/* Section 2: Data Collected */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-700/60 space-y-4">
                        <div className="flex items-center gap-3 text-[#3f74ff]">
                            <FileText className="w-5 h-5" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('legal.privacy.sec2_title')}</h2>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            {t('legal.privacy.sec2_desc')}
                        </p>
                        <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
                            <li><strong className="text-slate-900 dark:text-white">{t('legal.privacy.sec2_item1_label')}</strong> {t('legal.privacy.sec2_item1_val')}</li>
                            <li><strong className="text-slate-900 dark:text-white">{t('legal.privacy.sec2_item2_label')}</strong> {t('legal.privacy.sec2_item2_val')}</li>
                            <li><strong className="text-slate-900 dark:text-white">{t('legal.privacy.sec2_item3_label')}</strong> {t('legal.privacy.sec2_item3_val')}</li>
                            <li><strong className="text-slate-900 dark:text-white">{t('legal.privacy.sec2_item4_label')}</strong> {t('legal.privacy.sec2_item4_val')}</li>
                            <li><strong className="text-slate-900 dark:text-white">{t('legal.privacy.sec2_item5_label')}</strong> {t('legal.privacy.sec2_item5_val')}</li>
                        </ul>
                    </div>

                    {/* Section 3: Data Retention */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-700/60 space-y-4">
                        <div className="flex items-center gap-3 text-[#3f74ff]">
                            <Clock className="w-5 h-5" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('legal.privacy.sec3_title')}</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                        <th className="py-2.5 px-3 font-semibold">{t('legal.privacy.sec3_col_type')}</th>
                                        <th className="py-2.5 px-3 font-semibold">{t('legal.privacy.sec3_col_duration')}</th>
                                        <th className="py-2.5 px-3 font-semibold">{t('legal.privacy.sec3_col_process')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    <tr>
                                        <td className="py-2.5 px-3 font-medium">{t('legal.privacy.sec3_row1_type')}</td>
                                        <td className="py-2.5 px-3">{t('legal.privacy.sec3_row1_duration')}</td>
                                        <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-medium">{t('legal.privacy.sec3_row1_process')}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2.5 px-3 font-medium">{t('legal.privacy.sec3_row2_type')}</td>
                                        <td className="py-2.5 px-3">{t('legal.privacy.sec3_row2_duration')}</td>
                                        <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-medium">{t('legal.privacy.sec3_row2_process')}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2.5 px-3 font-medium">{t('legal.privacy.sec3_row3_type')}</td>
                                        <td className="py-2.5 px-3">{t('legal.privacy.sec3_row3_duration')}</td>
                                        <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-medium">{t('legal.privacy.sec3_row3_process')}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2.5 px-3 font-medium">{t('legal.privacy.sec3_row4_type')}</td>
                                        <td className="py-2.5 px-3">{t('legal.privacy.sec3_row4_duration')}</td>
                                        <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-medium">{t('legal.privacy.sec3_row4_process')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 4: User Rights */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-700/60 space-y-4">
                        <div className="flex items-center gap-3 text-[#3f74ff]">
                            <UserCheck className="w-5 h-5" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('legal.privacy.sec4_title')}</h2>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            {t('legal.privacy.sec4_desc')}
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white mb-1">
                                    <Download className="w-4 h-4 text-[#3f74ff]" />
                                    {t('legal.privacy.sec4_box1_title')}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('legal.privacy.sec4_box1_desc')}
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white mb-1">
                                    <Trash2 className="w-4 h-4 text-rose-500" />
                                    {t('legal.privacy.sec4_box2_title')}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('legal.privacy.sec4_box2_desc')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Contact DPO */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('legal.privacy.sec5_title')}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            {t('legal.privacy.sec5_desc')}
                        </p>
                        <p className="text-sm font-medium text-[#3f74ff]">
                            {t('legal.privacy.sec5_contact')}
                        </p>
                    </div>

                </div>

            </div>
        </div>
    );
}
