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
    onSave?: (payload: JobOfferPayload) => Promise<void>;
    isReadOnly?: boolean;
}

const LIMITS = {
    title: { min: 5, max: 200 },
    company: { min: 2, max: 100 },
    description: { min: 1, max: 5000 },
    location: { max: 500 },
    externalLink: { max: 2048 },
};

export default function JobOfferFormModal({ offer, onClose, onSave, isReadOnly = false }: Props) {
    const { t } = useTranslation();
    const { data: contractTypes } = useContractTypes();
    const [title, setTitle] = useState(offer?.title ?? '');
    const [company, setCompany] = useState(offer?.company ?? '');
    const [description, setDescription] = useState(offer?.description ?? '');
    const [location, setLocation] = useState(offer?.location ?? '');
    const [contractTypeId, setContractTypeId] = useState(offer?.contractType.id ?? '');
    const [externalLink, setExternalLink] = useState(offer?.externalLink ?? '');
    const [saving, setSaving] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const contractTypeOptions = (contractTypes ?? []).map((c) => ({ value: c.id, label: c.label }));

    const validate = (): Record<string, string> => {
        const errors: Record<string, string> = {};
        if (title.trim().length < LIMITS.title.min || title.trim().length > LIMITS.title.max) {
            errors.title = t('dashboard.offres.form.length_error', LIMITS.title);
        }
        if (company.trim().length < LIMITS.company.min || company.trim().length > LIMITS.company.max) {
            errors.company = t('dashboard.offres.form.length_error', LIMITS.company);
        }
        if (description.trim().length < LIMITS.description.min) {
            errors.description = t('dashboard.offres.form.required_field_error');
        }
        if (!contractTypeId) {
            errors.contractTypeId = t('dashboard.offres.form.required_field_error');
        }
        return errors;
    };

    const handleSave = async () => {
        if (isReadOnly || !onSave) return;
        const errors = validate();
        setFieldErrors(errors);
        setGeneralError(null);
        if (Object.keys(errors).length > 0) {
            return;
        }

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
        } catch (err: any) {
            const serverFieldErrors = err?.response?.data?.data;
            if (serverFieldErrors && typeof serverFieldErrors === 'object' && !Array.isArray(serverFieldErrors)) {
                setFieldErrors(serverFieldErrors);
            } else {
                setGeneralError(t('dashboard.offres.form.save_error'));
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-indigo-500" />
                        <p className="text-base font-bold text-slate-900 dark:text-white">
                            {isReadOnly
                                ? t('dashboard.offres.form.details_title', "Détails de l'offre")
                                : (offer ? t('dashboard.offres.form.edit_title') : t('dashboard.offres.form.create_title'))}
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
                    {generalError && (
                        <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-xl px-3 py-2">
                            {generalError}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {t('dashboard.offres.form.title_label')}
                                </label>
                                {!isReadOnly && <span className="text-xs text-slate-400">{title.length}/{LIMITS.title.max}</span>}
                            </div>
                             <input
                                type="text"
                                value={title}
                                disabled={isReadOnly}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={LIMITS.title.max}
                                className={`w-full rounded-xl bg-slate-50 dark:bg-slate-950 border px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 disabled:bg-slate-100/50 dark:disabled:bg-slate-950/50 ${
                                    fieldErrors.title ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                                }`}
                            />
                            {fieldErrors.title && <p className="text-xs text-rose-500">{fieldErrors.title}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {t('dashboard.offres.form.company_label')}
                                </label>
                                {!isReadOnly && <span className="text-xs text-slate-400">{company.length}/{LIMITS.company.max}</span>}
                            </div>
                             <input
                                type="text"
                                value={company}
                                disabled={isReadOnly}
                                onChange={(e) => setCompany(e.target.value)}
                                maxLength={LIMITS.company.max}
                                className={`w-full rounded-xl bg-slate-50 dark:bg-slate-950 border px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 disabled:bg-slate-100/50 dark:disabled:bg-slate-950/50 ${
                                    fieldErrors.company ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                                }`}
                            />
                            {fieldErrors.company && <p className="text-xs text-rose-500">{fieldErrors.company}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                             <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('dashboard.offres.form.description_label')}
                            </label>
                            {!isReadOnly && <span className="text-xs text-slate-400">{description.length}/{LIMITS.description.max}</span>}
                        </div>
                         <textarea
                            value={description}
                            disabled={isReadOnly}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={LIMITS.description.max}
                            rows={6}
                            className={`w-full rounded-xl bg-slate-50 dark:bg-slate-950 border px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-70 disabled:bg-slate-100/50 dark:disabled:bg-slate-950/50 ${
                                fieldErrors.description ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                            }`}
                        />
                        {fieldErrors.description && <p className="text-xs text-rose-500">{fieldErrors.description}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {t('dashboard.offres.form.location_label')}
                                </label>
                                {!isReadOnly && <span className="text-xs text-slate-400">{(location ?? '').length}/{LIMITS.location.max}</span>}
                            </div>
                             <input
                                type="text"
                                value={location ?? ''}
                                disabled={isReadOnly}
                                onChange={(e) => setLocation(e.target.value)}
                                maxLength={LIMITS.location.max}
                                className={`w-full rounded-xl bg-slate-50 dark:bg-slate-950 border px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 disabled:bg-slate-100/50 dark:disabled:bg-slate-950/50 ${
                                    fieldErrors.location ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                                }`}
                            />
                            {fieldErrors.location && <p className="text-xs text-rose-500">{fieldErrors.location}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('dashboard.offres.form.contract_label')}
                            </label>
                             <CustomSelect
                                value={contractTypeId}
                                options={contractTypeOptions}
                                onChange={setContractTypeId}
                                disabled={isReadOnly}
                                className="w-full animate-none"
                            />
                            {fieldErrors.contractTypeId && <p className="text-xs text-rose-500">{fieldErrors.contractTypeId}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {t('dashboard.offres.form.link_label')}
                                </label>
                                {!isReadOnly && <span className="text-xs text-slate-400">{(externalLink ?? '').length}/{LIMITS.externalLink.max}</span>}
                        </div>
                         <input
                            type="text"
                            value={externalLink ?? ''}
                            disabled={isReadOnly}
                            onChange={(e) => setExternalLink(e.target.value)}
                            maxLength={LIMITS.externalLink.max}
                            placeholder="https://..."
                            className={`w-full rounded-xl bg-slate-50 dark:bg-slate-950 border px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 disabled:bg-slate-100/50 dark:disabled:bg-slate-950/50 ${
                                fieldErrors.externalLink ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                            }`}
                        />
                        {fieldErrors.externalLink && <p className="text-xs text-rose-500">{fieldErrors.externalLink}</p>}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 pb-5">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {isReadOnly ? t('dashboard.offres.form.close', 'Fermer') : t('dashboard.offres.form.cancel')}
                    </button>
                    {!isReadOnly && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('dashboard.offres.form.save')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
