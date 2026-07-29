import { AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatusBadge from '../../../../components/shared/StatusBadge';
import { formatDateTime } from '../types';
import type { ApplicationRow } from '../../../../types/models/Application';

interface Props {
    app: ApplicationRow;
    onBack: () => void;
}

export default function ApplicationDetail({ app, onBack }: Props) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-full">
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-4 cursor-pointer"
            >
                <ArrowLeft className="h-4 w-4" />
                {t('dashboard.candidatures.detail.back')}
            </button>

            <div className={`flex-1 overflow-y-auto space-y-4 rounded-xl border p-4 ${
                app.stale
                    ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
            }`}>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{app.poste}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{app.entreprise}</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge nom={app.status.nom} couleur={app.status.couleur} />
                    {app.stale && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {t('dashboard.candidatures.detail.stale')}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1">{t('dashboard.candidatures.detail.contract')}</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{app.typeContrat?.label ?? '—'}</p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1">{t('dashboard.candidatures.detail.contact')}</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{app.contact || '—'}</p>
                    </div>
                </div>

                {app.lienOffre && (
                    <a
                        href={app.lienOffre}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t('dashboard.candidatures.detail.view_offer')}
                    </a>
                )}

                {app.notes && (
                    <div>
                        <p className="text-xs font-semibold text-slate-400 mb-1">{t('dashboard.candidatures.detail.notes')}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                            {app.notes}
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>{t('dashboard.candidatures.detail.created_at', { date: formatDateTime(app.dateCreation) })}</span>
                    <span>{t('dashboard.candidatures.detail.updated_at', { date: formatDateTime(app.dateModification) })}</span>
                </div>
            </div>
        </div>
    );
}
