import { useEffect, useState } from 'react';
import { Check, Copy, Mail, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { EmailApplyTarget } from '../../hooks/useJobOfferApplyActions';

interface Props {
    target: EmailApplyTarget | null;
    onClose: () => void;
}

function CopyField({ label, value }: { label: string; value: string }) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t('dashboard.offres.email_dialog.copy_error', 'Copie impossible : sélectionne le texte à la main.'));
        }
    };

    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            <div className="flex items-center gap-2">
                <span className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 break-all select-all">
                    {value}
                </span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? t('dashboard.offres.email_dialog.copied', 'Copié') : t('dashboard.offres.email_dialog.copy', 'Copier')}
                </button>
            </div>
        </div>
    );
}

/**
 * Candidature par e-mail : la messagerie s'ouvre (mailto) avec l'objet rempli ; cette fenêtre
 * reprend l'adresse et l'objet, à copier si la messagerie ne s'ouvre pas.
 */
export default function EmailApplyDialog({ target, onClose }: Props) {
    const { t } = useTranslation();

    useEffect(() => {
        if (!target) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [target, onClose]);

    if (!target) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 animate-fadeIn"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="email-apply-title"
                className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-scale-up"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 id="email-apply-title" className="text-base font-bold text-slate-900 dark:text-white">
                                {t('dashboard.offres.email_dialog.title', 'Postuler par e-mail')}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{target.title}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label={t('dashboard.offres.email_dialog.close', 'Fermer')}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t('dashboard.offres.email_dialog.intro', 'Ta messagerie devrait s’ouvrir avec l’objet déjà rempli. Si rien ne s’ouvre, copie l’adresse et l’objet ci-dessous.')}
                </p>

                <CopyField label={t('dashboard.offres.email_dialog.address', 'Adresse')} value={target.email} />
                <CopyField label={t('dashboard.offres.email_dialog.subject', 'Objet')} value={target.subject} />

                <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        {t('dashboard.offres.email_dialog.close', 'Fermer')}
                    </button>
                    <a
                        href={target.mailtoHref}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                    >
                        <Mail className="h-4 w-4" />
                        {t('dashboard.offres.email_dialog.open_mail', 'Ouvrir ma messagerie')}
                    </a>
                </div>
            </div>
        </div>
    );
}
