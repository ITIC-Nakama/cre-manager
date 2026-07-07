import { useState, useEffect } from 'react';
import { X, Loader2, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApplicationStatuses } from '../../hooks/useApplications';
import type { ApplicationRow } from '../../types/models/Application';

interface Props {
    application?: ApplicationRow | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (statusId: string) => Promise<void>;
    saving: boolean;
}

export default function ChangeStatusModal({ application, isOpen, onClose, onSubmit, saving }: Props) {
    const { t } = useTranslation();
    const { data: statuses, isLoading: loadingStatuses } = useApplicationStatuses();
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    useEffect(() => {
        if (isOpen && application) {
            setSelectedStatus(application.status.id);
        }
    }, [isOpen, application]);

    if (!isOpen || !application) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedStatus) {
            onSubmit(selectedStatus);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800 animate-fadeIn flex flex-col">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {t('dashboard.candidatures.status.change_title', 'Changer le statut')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('dashboard.candidatures.status.select_label', 'Nouveau statut')}
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            disabled={loadingStatuses}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white"
                        >
                            <option value="">Sélectionner un statut</option>
                            {statuses?.map((s) => (
                                <option key={s.id} value={s.id}>{s.nom}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                            {t('common.cancel', 'Annuler')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !selectedStatus || selectedStatus === application.status.id}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('common.save', 'Enregistrer')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
