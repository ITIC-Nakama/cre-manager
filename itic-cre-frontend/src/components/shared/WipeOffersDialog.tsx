import { useState } from 'react';
import { AlertTriangle, Loader2, X, Building2, Globe, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Scope = 'MANUAL' | 'EXTERNAL' | 'ALL';

interface Props {
    isOpen: boolean;
    loading?: boolean;
    onConfirm: (scope: Scope) => void;
    onClose: () => void;
}

export default function WipeOffersDialog({ isOpen, loading = false, onConfirm, onClose }: Props) {
    const { t } = useTranslation();
    const [scope, setScope] = useState<Scope | null>(null);

    if (!isOpen) return null;

    const options: { value: Scope; icon: React.ReactNode; label: string; description: string }[] = [
        {
            value: 'MANUAL',
            icon: <Building2 className="h-4 w-4" />,
            label: t('dashboard.offres.wipe_dialog.manual_label', 'Offres internes (manuelles)'),
            description: t('dashboard.offres.wipe_dialog.manual_description', 'Supprime uniquement les offres créées manuellement par les conseillers.'),
        },
        {
            value: 'EXTERNAL',
            icon: <Globe className="h-4 w-4" />,
            label: t('dashboard.offres.wipe_dialog.external_label', 'Offres externes'),
            description: t('dashboard.offres.wipe_dialog.external_description', 'Supprime toutes les offres synchronisées (France Travail, Adzuna, La Bonne Alternance).'),
        },
        {
            value: 'ALL',
            icon: <Flame className="h-4 w-4" />,
            label: t('dashboard.offres.wipe_dialog.all_label', 'Tout'),
            description: t('dashboard.offres.wipe_dialog.all_description', 'Supprime absolument toutes les offres, manuelles et externes.'),
        },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-fadeIn">

                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {t('dashboard.offres.wipe_dialog.title', 'Supprimer des offres en masse')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {t('dashboard.offres.wipe_dialog.message', 'Action irréversible. Choisissez ce qui doit être supprimé :')}
                    </p>

                    <div className="flex flex-col gap-2">
                        {options.map((opt) => {
                            const isSelected = scope === opt.value;
                            const isAll = opt.value === 'ALL';
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setScope(opt.value)}
                                    disabled={loading}
                                    className={`w-full text-left rounded-xl border p-3 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                                        isSelected
                                            ? isAll
                                                ? 'border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/30'
                                                : 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30'
                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={isSelected ? (isAll ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400') : 'text-slate-400'}>
                                            {opt.icon}
                                        </span>
                                        <span className={`text-sm font-semibold ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {opt.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                                        {opt.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 pb-5">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {t('common.confirm_dialog.cancel')}
                    </button>
                    <button
                        onClick={() => scope && onConfirm(scope)}
                        disabled={loading || !scope}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t('dashboard.offres.wipe_dialog.confirm', 'Supprimer définitivement')}
                    </button>
                </div>
            </div>
        </div>
    );
}
