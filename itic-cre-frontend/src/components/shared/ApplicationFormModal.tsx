import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useContractTypes } from '../../hooks/useApplications';
import type { ApplicationRow } from '../../types/models/Application';
import type { ApplicationFormData } from '../../api-s/requests/ApplicationRequest';

interface Props {
    application?: ApplicationRow | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ApplicationFormData) => Promise<void>;
    saving: boolean;
}

export default function ApplicationFormModal({ application, isOpen, onClose, onSubmit, saving }: Props) {
    const { t } = useTranslation();
    const { data: contractTypes, isLoading: loadingContracts } = useContractTypes();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<ApplicationFormData>();

    useEffect(() => {
        if (isOpen) {
            if (application) {
                reset({
                    entreprise: application.entreprise,
                    poste: application.poste,
                    typeContratId: application.typeContrat?.id || '',
                    lienOffre: application.lienOffre || '',
                    contact: application.contact || '',
                    notes: application.notes || ''
                });
            } else {
                reset({
                    entreprise: '',
                    poste: '',
                    typeContratId: '',
                    lienOffre: '',
                    contact: '',
                    notes: ''
                });
            }
        }
    }, [isOpen, application, reset]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 animate-fadeIn flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {application ? t('dashboard.candidatures.form.edit_title', 'Modifier la candidature') : t('dashboard.candidatures.form.create_title', 'Nouvelle candidature')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-4">
                    
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('dashboard.candidatures.form.entreprise', 'Entreprise')} *
                        </label>
                        <input
                            type="text"
                            {...register('entreprise', { required: t('dashboard.candidatures.form.required', 'Ce champ est requis') })}
                            className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border ${errors.entreprise ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white`}
                        />
                        {errors.entreprise && <p className="text-xs text-red-500">{errors.entreprise.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('dashboard.candidatures.form.poste', 'Poste')} *
                        </label>
                        <input
                            type="text"
                            {...register('poste', { required: t('dashboard.candidatures.form.required', 'Ce champ est requis') })}
                            className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border ${errors.poste ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white`}
                        />
                        {errors.poste && <p className="text-xs text-red-500">{errors.poste.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('dashboard.candidatures.form.contract_type', 'Type de contrat')}
                        </label>
                        <select
                            {...register('typeContratId')}
                            disabled={loadingContracts}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white"
                        >
                            <option value="">Sélectionner un contrat</option>
                            {contractTypes?.map((c) => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('dashboard.candidatures.form.link', 'Lien de l\'offre')}
                        </label>
                        <input
                            type="url"
                            {...register('lienOffre')}
                            placeholder="https://"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('dashboard.candidatures.form.contact', 'Contact RH / Manager')}
                        </label>
                        <input
                            type="text"
                            {...register('contact')}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('dashboard.candidatures.form.notes', 'Notes / Commentaires')}
                        </label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white resize-none"
                        ></textarea>
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
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {application ? t('common.save', 'Enregistrer') : t('common.create', 'Créer')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
