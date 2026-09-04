import { useRef, useState } from 'react';
import { X, Loader2, Handshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLockBodyScroll } from '../../../../hooks/useLockBodyScroll';

interface Props {
    saving: boolean;
    onClose: () => void;
    onConfirm: (startDate: string, endDate?: string) => Promise<void>;
}

/** Bloque le passage à un statut "sous contrat" (ex: Offre reçue) tant qu'une date de début
  * n'est pas renseignée — sans elle, la candidature ne remonterait jamais comme sous contrat
  * dans les filtres/stats conseiller (voir StudentSpecification.underContractPredicate). */
export default function ContractDateGateModal({ saving, onClose, onConfirm }: Props) {
    const { t } = useTranslation();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    useLockBodyScroll(panelRef, true);

    const handleConfirm = async () => {
        if (!startDate) {
            setError(t('dashboard.candidatures.student.contract_gate.start_date_required', 'La date de début est requise'));
            return;
        }
        if (endDate && endDate < startDate) {
            setError(t('dashboard.candidatures.student.form.invalid_dates', 'La date de fin doit être postérieure à la date de début'));
            return;
        }
        setError(null);
        await onConfirm(startDate, endDate || undefined);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60">
            <div ref={panelRef} className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-fadeIn">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Handshake className="h-4 w-4 text-emerald-500" />
                        <p className="text-base font-bold text-slate-900 dark:text-white">
                            {t('dashboard.candidatures.student.contract_gate.title', 'Confirmer la réception de l\'offre')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('dashboard.candidatures.student.contract_gate.explanation', 'Précisez la date de début (et de fin si connue) de ce contrat pour qu\'il apparaisse correctement dans votre suivi.')}
                    </p>

                    {error && (
                        <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-xl px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('dashboard.candidatures.student.form.start_date_label', 'Date de début du contrat')} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                disabled={saving}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('dashboard.candidatures.student.form.end_date_label', 'Date de fin du contrat')}
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                disabled={saving}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {t('dashboard.candidatures.student.form.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={saving || !startDate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('dashboard.candidatures.student.contract_gate.confirm', 'Confirmer')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
