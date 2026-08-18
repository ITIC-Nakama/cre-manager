import { useEffect } from 'react';
import {
    X, Briefcase, Building2, MapPin, FileSignature, Layers,
    Calendar, ExternalLink, CheckCircle2, UserMinus, Loader2,
    Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { JobOffer } from '../../types/models/JobOffer';

interface Props {
    offer: JobOffer | null;
    onClose: () => void;
    isApplied?: boolean;
    onApply?: (offerId: string) => Promise<void> | void;
    onWithdraw?: (offer: JobOffer) => void;
    isApplying?: boolean;
    onEdit?: (offer: JobOffer) => void;
    showAdminActions?: boolean;
}

function formatDate(iso: string | null | undefined, locale = 'fr-FR') {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export default function JobOfferDetailModal({
    offer,
    onClose,
    isApplied = false,
    onApply,
    onWithdraw,
    isApplying = false,
    onEdit,
    showAdminActions = false,
}: Props) {
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!offer) return null;

    const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/30">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400 shadow-xs">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight break-words">
                                {offer.title}
                            </h2>
                            <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                <span>{offer.company}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer shrink-0"
                        title={t('dashboard.offres.detail_modal.close', 'Fermer')}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200">
                    
                    {/* Status banner if applied */}
                    {isApplied && (
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-sm">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="flex-1">
                                <p className="font-semibold">{t('dashboard.offres.detail_modal.status_applied', 'Vous avez déjà postulé à cette offre')}</p>
                            </div>
                        </div>
                    )}

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30 shadow-2xs">
                            <FileSignature className="h-3.5 w-3.5" />
                            {offer.contractType.label}
                        </span>
                        {offer.sector && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/30 shadow-2xs">
                                <Layers className="h-3.5 w-3.5" />
                                {offer.sector.label}
                            </span>
                        )}
                        {offer.location && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 shadow-2xs">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                {offer.location}
                            </span>
                        )}
                        {offer.createdAt && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 shadow-2xs">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {t('dashboard.offres.detail_modal.published_at', { date: formatDate(offer.createdAt, locale) })}
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <Briefcase className="h-4 w-4 text-indigo-500" />
                            <h3>{t('dashboard.offres.detail_modal.description_title', 'Description du poste')}</h3>
                        </div>
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-sm sm:text-base leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300 break-words">
                            {offer.description}
                        </div>
                    </div>

                    {/* External Link Notice (le lien d'action equivalent est dans le footer, toujours visible sans scroll) */}
                    {offer.externalLink && (
                        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5">
                            <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                                    {t('dashboard.offres.detail_modal.external_link_notice', "Cette offre redirige vers une plateforme externe pour candidater.")}
                                </p>
                                <p className="text-xs text-indigo-700/80 dark:text-indigo-300/70 truncate max-w-md mt-0.5">
                                    {offer.externalLink}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        {offer.externalLink && (
                            <a
                                href={offer.externalLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 active:scale-95 text-sm font-medium transition-all"
                            >
                                <ExternalLink className="h-4 w-4 text-slate-400" />
                                {t('dashboard.offres.actions.view_link', "Voir l'offre originale")}
                            </a>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer"
                        >
                            {t('dashboard.offres.detail_modal.close', 'Fermer')}
                        </button>

                        {/* Advisor Edit Button */}
                        {showAdminActions && onEdit && (
                            <button
                                onClick={() => {
                                    onClose();
                                    onEdit(offer);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/25 active:scale-[0.98] text-white text-sm font-semibold transition-all shadow-xs cursor-pointer"
                            >
                                {t('dashboard.offres.actions.edit', 'Modifier')}
                            </button>
                        )}

                        {/* Student Apply / Withdraw Buttons */}
                        {onApply && !isApplied && (
                            <button
                                onClick={() => onApply(offer.id)}
                                disabled={isApplying}
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/25 active:scale-[0.98] text-white text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isApplying ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                )}
                                {t('dashboard.offres.apply_button', 'Marquer comme posté')}
                            </button>
                        )}

                        {onWithdraw && isApplied && (
                            <button
                                onClick={() => onWithdraw(offer)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:border-rose-300 dark:hover:border-rose-800 active:scale-[0.98] text-rose-600 dark:text-rose-400 text-sm font-semibold transition-all cursor-pointer"
                            >
                                <UserMinus className="h-4 w-4" />
                                {t('dashboard.offres.withdraw_confirm_button', 'Retirer')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
