import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Download, Trash2, ExternalLink, AlertTriangle, X } from 'lucide-react';
import { useUserStore } from '../../../store/UserStore';
import { toast } from 'sonner';
import { useExportGdprData, useDeleteGdprAccount } from '../../../hooks/useGdpr';

export default function GdprCard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const clearUser = useUserStore((state) => state.clearUser);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const exportMutation = useExportGdprData();
    const deleteAccountMutation = useDeleteGdprAccount();

    const handleExportData = async () => {
        try {
            const blobData = await exportMutation.mutateAsync();
            
            const url = window.URL.createObjectURL(new Blob([blobData], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'export-rgpd-itic-cre.json');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(t('dashboard.parametres.gdpr.toast_export_success'));
        } catch (error) {
            console.error("Export RGPD failed:", error);
            toast.error(t('dashboard.parametres.gdpr.toast_export_error'));
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await deleteAccountMutation.mutateAsync();
            toast.success(t('dashboard.parametres.gdpr.toast_delete_success'));
            clearUser();
            navigate('/login');
        } catch (error) {
            console.error("Delete account failed:", error);
            toast.error(t('dashboard.parametres.gdpr.toast_delete_error'));
        } finally {
            setDeleteModalOpen(false);
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#3f74ff]">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {t('dashboard.parametres.gdpr.title')}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('dashboard.parametres.gdpr.subtitle')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-1">
                    {/* Export Data */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/50 space-y-3 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white mb-1">
                                <Download className="h-4 w-4 text-[#3f74ff]" />
                                {t('dashboard.parametres.gdpr.export_title')}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {t('dashboard.parametres.gdpr.export_desc')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleExportData}
                            disabled={exportMutation.isPending}
                            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <Download className="h-3.5 w-3.5" />
                            {exportMutation.isPending ? t('dashboard.parametres.gdpr.exporting_btn') : t('dashboard.parametres.gdpr.export_btn')}
                        </button>
                    </div>

                    {/* Delete Account */}
                    <div className="p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 space-y-3 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 font-semibold text-sm text-rose-600 dark:text-rose-400 mb-1">
                                <Trash2 className="h-4 w-4" />
                                {t('dashboard.parametres.gdpr.delete_title')}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {t('dashboard.parametres.gdpr.delete_desc')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDeleteModalOpen(true)}
                            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('dashboard.parametres.gdpr.delete_btn')}
                        </button>
                    </div>
                </div>

                {/* Legal docs links */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                    <span>{t('dashboard.parametres.gdpr.legal_notice')}</span>
                    <div className="flex items-center gap-4">
                        <Link to="/privacy" target="_blank" className="inline-flex items-center gap-1 text-[#3f74ff] hover:underline font-medium">
                            {t('dashboard.parametres.gdpr.privacy_policy')}
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                        <Link to="/terms" target="_blank" className="inline-flex items-center gap-1 text-[#3f74ff] hover:underline font-medium">
                            {t('dashboard.parametres.gdpr.cgu')}
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal for Account Deletion */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 animate-fadeIn">
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl p-6 overflow-hidden space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <h3>{t('dashboard.parametres.gdpr.modal_title')}</h3>
                            </div>
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {t('dashboard.parametres.gdpr.modal_warning')}
                        </p>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeleteModalOpen(false)}
                                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                {t('dashboard.parametres.gdpr.modal_cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={deleteAccountMutation.isPending}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {deleteAccountMutation.isPending ? t('dashboard.parametres.gdpr.modal_deleting') : t('dashboard.parametres.gdpr.modal_confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
