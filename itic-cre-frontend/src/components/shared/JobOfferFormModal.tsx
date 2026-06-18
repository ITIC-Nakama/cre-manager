import { useState } from 'react';
import { X, Loader2, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../basics/CustomSelect';
import { useContractTypes } from '../../hooks/useApplications';
import type { JobOffer } from '../../types/models/JobOffer';
import type { JobOfferPayload } from '../../api-s/requests/JobOfferRequest';

interface Props {
    offer?: JobOffer | null;
    onClose: () => void;
    onSave: (payload: JobOfferPayload) => Promise<void>;
}

export default function JobOfferFormModal({ offer, onClose, onSave }: Props) {
    const { t } = useTranslation();
    const { data: contractTypes } = useContractTypes();
    const [title, setTitle] = useState(offer?.title ?? '');
    const [company, setCompany] = useState(offer?.company ?? '');
    const [description, setDescription] = useState(offer?.description ?? '');
    const [location, setLocation] = useState(offer?.location ?? '');
    const [contractTypeId, setContractTypeId] = useState(offer?.contractType.id ?? '');
    const [externalLink, setExternalLink] = useState(offer?.externalLink ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const contractTypeOptions = (contractTypes ?? []).map((c) => ({ value: c.id, label: c.label }));

    const handleSave = async () => {
        if (!title.trim() || !company.trim() || !description.trim() || !contractTypeId) {
            setError(t('dashboard.offres.form.required_error'));
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await onSave({
                title: title.trim(),
                company: company.trim(),
                description: description.trim(),
                location: location.trim() || undefined,
                contractTypeId,
                externalLink: externalLink.trim() || undefined,
            });
            onClose();
        } catch {
            setError(t('dashboard.offres.form.save_error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 animate-fadeIn max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-indigo-500" />
                        <p className="text-base font-bold text-slate-900 dark:text-white">
                            {offer ? t('dashboard.offres.form.edit_title') : t('dashboard.offres.form.create_title')}
                        </p>
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
                    {error && (
                        <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-xl px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('dashboard.offres.form.title_label')}
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('dashboard.offres.form.company_label')}
                            </label>
                            <input
                                type="text"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('dashboard.offres.form.description_label')}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('dashboard.offres.form.location_label')}
                            </label>
                            <input
                                type="text"
                                value={location ?? ''}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('dashboard.offres.form.contract_label')}
                            </label>
                            <CustomSelect
                                value={contractTypeId}
                                options={contractTypeOptions}
                                onChange={setContractTypeId}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('dashboard.offres.form.link_label')}
                        </label>
                        <input
                            type="text"
                            value={externalLink ?? ''}
                            onChange={(e) => setExternalLink(e.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 pb-5">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {t('dashboard.offres.form.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t('dashboard.offres.form.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
