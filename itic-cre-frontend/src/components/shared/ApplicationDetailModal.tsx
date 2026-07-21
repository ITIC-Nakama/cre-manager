import { X, ExternalLink, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';
import type { ApplicationRow } from '../../types/models/Application';

interface Props {
    application: ApplicationRow;
    onClose: () => void;
}

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function ApplicationDetailModal({ application, onClose }: Props) {
    const { t } = useTranslation();

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 animate-fadeIn max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <p className="text-base font-bold text-slate-900 dark:text-white">
                            {application.poste}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{application.entreprise}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">

                    <div className="flex items-center justify-between">
                        <StatusBadge nom={application.status.nom} couleur={application.status.couleur} />
                        {application.stale && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {t('dashboard.candidatures.detail.stale')}
                            </span>
                        )}
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            {t('dashboard.candidatures.detail.student')}
                        </p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {application.student.firstName} {application.student.lastName}
                        </p>
                        <p className="text-xs text-slate-400">{application.student.email}</p>
                        {application.student.promotion && (
                            <p className="text-xs text-slate-400 mt-0.5">{application.student.promotion.nom}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {t('dashboard.candidatures.detail.contract')}
                            </p>
                            <p className="text-slate-700 dark:text-slate-300">{application.typeContrat?.label ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {t('dashboard.candidatures.detail.contact')}
                            </p>
                            <p className="text-slate-700 dark:text-slate-300">{application.contact || '—'}</p>
                        </div>
                    </div>

                    {application.lienOffre && (
                        <a
                            href={application.lienOffre}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t('dashboard.candidatures.detail.view_offer')}
                        </a>
                    )}

                    {application.notes && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                {t('dashboard.candidatures.detail.notes')}
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3">
                                {application.notes}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>{t('dashboard.candidatures.detail.created_at', { date: formatDateTime(application.dateCreation) })}</span>
                        <span>{t('dashboard.candidatures.detail.updated_at', { date: formatDateTime(application.dateModification) })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
