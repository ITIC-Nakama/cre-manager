import { useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, CheckCircle2, Loader2, Mail, Phone, User, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useModalLayer } from '../../hooks/useModalLayer';
import { fieldClass } from '../basics/fieldStyles';
import { submitCompanyRequest } from '../../api-s/requests/CompanySpaceRequest';
import type { CompanyCandidate } from '../../api-s/requests/CompanySpaceRequest';
import { getApiErrorMessage } from '../../utils/errorHelper';

interface Props {
    /** Profil choisi (« Ce profil m'intéresse ») ; absent : « Contactez-nous ». */
    candidate?: CompanyCandidate | null;
    slug?: string | null;
    onClose: () => void;
}

/** Demande d'une entreprise (vouvoiement). Champ « website » caché : piège à robots, jamais vu par une personne. */
export default function CompanyRequestModal({ candidate, slug, onClose }: Props) {
    const { t } = useTranslation();
    useModalLayer();
    const [company, setCompany] = useState('');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState(candidate
        ? t('company.request.default_message', 'Bonjour, le profil de {{name}} ({{formation}}) nous intéresse. Pouvez-vous nous mettre en relation ?',
            { name: `${candidate.firstName} ${candidate.lastName}`, formation: candidate.formation })
        : '');
    const [website, setWebsite] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const valid = company.trim() && contactName.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && message.trim();

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!valid || sending) return;
        setSending(true);
        setError(null);
        try {
            await submitCompanyRequest({
                slug: slug ?? null, candidateId: candidate?.id ?? null, company, contactName, email,
                phone: phone || undefined, message, website,
            });
            setSent(true);
        } catch (err) {
            setError(getApiErrorMessage(err, t('company.request.error', 'Votre demande n’a pas pu être envoyée. Merci de réessayer.')));
        } finally {
            setSending(false);
        }
    };

    const title = candidate
        ? t('company.request.title_candidate', 'Ce profil m’intéresse')
        : t('company.request.title_contact', 'Contactez-nous');

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 animate-fadeIn"
            role="dialog" aria-modal="true" aria-label={title}>
            <div className="bg-white dark:bg-[#15171f] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto animate-scale-up">
                <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
                        {candidate && (
                            <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5">
                                {candidate.firstName} {candidate.lastName} · {candidate.formation}
                            </p>
                        )}
                    </div>
                    <button type="button" onClick={onClose} aria-label={t('company.request.close', 'Fermer')}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {sent ? (
                    <div className="flex flex-col items-center text-center gap-3 p-8">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                        <p className="text-base font-bold text-slate-900 dark:text-white">{t('company.request.sent_title', 'Merci, votre demande est envoyée')}</p>
                        <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                            {t('company.request.sent_text', 'L’équipe du Pôle Entreprises vous recontacte rapidement.')}
                        </p>
                        <button type="button" onClick={onClose}
                            className="mt-2 px-5 py-2.5 rounded-xl bg-[#3f74ff] text-white text-sm font-semibold hover:bg-[#2f63ee] cursor-pointer">
                            {t('company.request.close', 'Fermer')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={submit} className="p-5 space-y-4" noValidate>
                        <Field label={t('company.request.company', 'Entreprise')} required>
                            <IconField icon={<Building2 className="h-4 w-4" />}>
                                <input className={fieldClass(false)} value={company} onChange={(e) => setCompany(e.target.value)} maxLength={150} autoComplete="organization" required />
                            </IconField>
                        </Field>
                        <Field label={t('company.request.name', 'Nom')} required>
                            <IconField icon={<User className="h-4 w-4" />}>
                                <input className={fieldClass(false)} value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={150} autoComplete="name" required />
                            </IconField>
                        </Field>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label={t('company.request.email', 'E-mail')} required>
                                <IconField icon={<Mail className="h-4 w-4" />}>
                                    <input type="email" className={fieldClass(false)} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" required />
                                </IconField>
                            </Field>
                            <Field label={t('company.request.phone', 'Téléphone (facultatif)')}>
                                <IconField icon={<Phone className="h-4 w-4" />}>
                                    <input type="tel" className={fieldClass(false)} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} autoComplete="tel" />
                                </IconField>
                            </Field>
                        </div>
                        <Field label={t('company.request.message', 'Message')} required>
                            <textarea className={`${fieldClass(false, false)} min-h-28 resize-y`} value={message}
                                onChange={(e) => setMessage(e.target.value)} maxLength={2000} required />
                        </Field>
                        {/* Piège à robots : invisible et hors du parcours clavier. */}
                        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0">
                            <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {t('company.request.privacy', 'Vos coordonnées servent uniquement à vous recontacter. Elles sont supprimées un an après votre demande.')}
                        </p>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <button type="submit" disabled={!valid || sending}
                            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#3f74ff] text-white text-sm font-semibold hover:bg-[#2f63ee] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('company.request.submit', 'Envoyer ma demande')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {label} {required && <span className="text-rose-500">*</span>}
            </span>
            {children}
        </label>
    );
}

function IconField({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3f74ff] pointer-events-none">{icon}</span>
            {children}
        </div>
    );
}
