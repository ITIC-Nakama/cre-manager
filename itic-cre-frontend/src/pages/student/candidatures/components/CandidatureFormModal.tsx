import { useRef, useState } from 'react';
import { X, Loader2, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../../../../components/basics/CustomSelect';
import DateInput from '../../../../components/basics/DateInput';
import { useContractTypes } from '../../../../hooks/useApplications';
import { useLockBodyScroll } from '../../../../hooks/useLockBodyScroll';
import { useModalClose } from '../../../../hooks/useModalClose';
import { getApiErrorMessage } from '../../../../utils/errorHelper';
import type { Candidature, CandidaturePayload } from '../../../../types/models/Application';

interface Props {
    candidature?: Candidature | null;
    saving: boolean;
    onClose: () => void;
    onSave: (payload: CandidaturePayload) => Promise<void>;
}

const LIMITS = {
    entreprise: { min: 1, max: 100 },
    poste: { min: 1, max: 200 },
    lienOffre: { max: 500 },
    contact: { max: 200 },
};

export default function CandidatureFormModal({ candidature, saving, onClose, onSave }: Props) {
    const { t } = useTranslation();
    const { data: contractTypes } = useContractTypes();
    const [entreprise, setEntreprise] = useState(candidature?.entreprise ?? '');
    const [poste, setPoste] = useState(candidature?.poste ?? '');
    const [typeContratId, setTypeContratId] = useState(candidature?.typeContrat?.id ?? '');
    const [lienOffre, setLienOffre] = useState(candidature?.lienOffre ?? '');
    const [contact, setContact] = useState(candidature?.contact ?? '');
    const [notes, setNotes] = useState(candidature?.notes ?? '');
    const [startDate, setStartDate] = useState(candidature?.startDate ?? '');
    const [endDate, setEndDate] = useState(candidature?.endDate ?? '');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLFormElement>(null);
    useLockBodyScroll(scrollRef, true);
    const { isClosing, handleClose } = useModalClose(onClose);

    const contractTypeOptions = [
        { value: '', label: t('dashboard.candidatures.student.form.no_contract_type') },
        ...(contractTypes ?? []).map((c) => ({ value: c.id, label: c.label })),
    ];

    const validate = (): Record<string, string> => {
        const errors: Record<string, string> = {};
        if (entreprise.trim().length < LIMITS.entreprise.min || entreprise.trim().length > LIMITS.entreprise.max) {
            errors.entreprise = t('dashboard.candidatures.student.form.length_error', LIMITS.entreprise);
        }
        if (poste.trim().length < LIMITS.poste.min || poste.trim().length > LIMITS.poste.max) {
            errors.poste = t('dashboard.candidatures.student.form.length_error', LIMITS.poste);
        }
        if (startDate && endDate && endDate < startDate) {
            errors.endDate = t('dashboard.candidatures.student.form.invalid_dates', 'La date de fin doit être postérieure à la date de début');
        }
        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validate();
        setFieldErrors(errors);
        setGeneralError(null);
        if (Object.keys(errors).length > 0) return;

        try {
            await onSave({
                entreprise: entreprise.trim(),
                poste: poste.trim(),
                typeContratId: typeContratId || undefined,
                lienOffre: lienOffre.trim() || undefined,
                contact: contact.trim() || undefined,
                notes: notes.trim() || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });
        } catch (err: unknown) {
            const serverFieldErrors = (err as { response?: { data?: { data?: unknown } } })?.response?.data?.data;
            if (serverFieldErrors && typeof serverFieldErrors === 'object' && !Array.isArray(serverFieldErrors)) {
                setFieldErrors(serverFieldErrors as Record<string, string>);
            } else {
                setGeneralError(getApiErrorMessage(err, t('dashboard.candidatures.student.form.save_error')));
            }
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
            <div ref={panelRef} className={`bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden ${isClosing ? 'animate-scale-down' : 'animate-scale-up'}`}>

                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-indigo-500" />
                        <p className="text-base font-bold text-slate-900 dark:text-white">
                            {candidature ? t('dashboard.candidatures.student.form.edit_title') : t('dashboard.candidatures.student.form.create_title')}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={saving}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form ref={scrollRef} onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1 min-w-0">
                    {generalError && (
                        <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-xl px-3 py-2">
                            {generalError}
                        </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('dashboard.candidatures.student.form.entreprise_label')} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={entreprise}
                                disabled={saving}
                                onChange={(e) => setEntreprise(e.target.value)}
                                maxLength={LIMITS.entreprise.max}
                                placeholder={t('dashboard.candidatures.student.form.entreprise_placeholder', 'Ex : Décathlon')}
                                className={`w-full rounded-xl bg-slate-50 dark:bg-slate-950 border px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 ${
                                    fieldErrors.entreprise ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                                }`}
                            />
                            {fieldErrors.entreprise && <p className="text-xs text-rose-500">{fieldErrors.entreprise}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('dashboard.candidatures.student.form.poste_label')} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={poste}
                                disabled={saving}
                                onChange={(e) => setPoste(e.target.value)}
                                maxLength={LIMITS.poste.max}
                                placeholder={t('dashboard.candidatures.student.form.poste_placeholder', 'Ex : Développeur web')}
                                className={`w-full rounded-xl bg-slate-50 dark:bg-slate-950 border px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 ${
                                    fieldErrors.poste ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                                }`}
                            />
                            {fieldErrors.poste && <p className="text-xs text-rose-500">{fieldErrors.poste}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('dashboard.candidatures.student.form.contract_label')}
                        </label>
                        <CustomSelect
                            value={typeContratId}
                            options={contractTypeOptions}
                            onChange={setTypeContratId}
                            disabled={saving}
                            className="w-full"
                        />
                        {fieldErrors.typeContratId && <p className="text-xs text-rose-500">{fieldErrors.typeContratId}</p>}
                    </div>

                    {/* Affiché une fois l'offre reçue (candidature déjà avancée jusque-là). Pour
                        déclarer directement un contrat déjà obtenu, voir DeclareContractModal. */}
                    {candidature && candidature.status.ordre >= 5 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 min-w-0">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {t('dashboard.candidatures.student.form.start_date_label', 'Date de début du contrat')}
                                </label>
                                <DateInput value={startDate} onChange={setStartDate} disabled={saving} error={!!fieldErrors.startDate} />
                                {fieldErrors.startDate && <p className="text-xs text-rose-500">{fieldErrors.startDate}</p>}
                            </div>
                            <div className="space-y-1.5 min-w-0">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {t('dashboard.candidatures.student.form.end_date_label', 'Date de fin du contrat')}
                                </label>
                                <DateInput value={endDate} onChange={setEndDate} disabled={saving} error={!!fieldErrors.endDate} />
                                {fieldErrors.endDate && <p className="text-xs text-rose-500">{fieldErrors.endDate}</p>}
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('dashboard.candidatures.student.form.link_label')}
                        </label>
                        <input
                            type="text"
                            value={lienOffre}
                            disabled={saving}
                            onChange={(e) => setLienOffre(e.target.value)}
                            maxLength={LIMITS.lienOffre.max}
                            placeholder="https://..."
                            className={`w-full rounded-xl bg-slate-50 dark:bg-slate-950 border px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 ${
                                fieldErrors.lienOffre ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                            }`}
                        />
                        {fieldErrors.lienOffre && <p className="text-xs text-rose-500">{fieldErrors.lienOffre}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('dashboard.candidatures.student.form.contact_label')}
                        </label>
                        <input
                            type="text"
                            value={contact}
                            disabled={saving}
                            onChange={(e) => setContact(e.target.value)}
                            maxLength={LIMITS.contact.max}
                            placeholder={t('dashboard.candidatures.student.form.contact_placeholder', 'Nom, email ou téléphone du recruteur')}
                            className={`w-full rounded-xl bg-slate-50 dark:bg-slate-950 border px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 ${
                                fieldErrors.contact ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                            }`}
                        />
                        {fieldErrors.contact && <p className="text-xs text-rose-500">{fieldErrors.contact}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('dashboard.candidatures.student.form.notes_label')}
                        </label>
                        <textarea
                            value={notes}
                            disabled={saving}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder={t('dashboard.candidatures.student.form.notes_placeholder', 'Notes personnelles (optionnel)')}
                            className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-70"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {t('dashboard.candidatures.student.form.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('dashboard.candidatures.student.form.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
