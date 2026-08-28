import { Building2, FileSignature, Layers, MapPin, CheckCircle2, ExternalLink, UserMinus, ArrowUpRight, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { JobOffer } from '../../types/models/JobOffer';

const SOURCE_BADGE_STYLES: Record<string, string> = {
    FRANCE_TRAVAIL: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
    BONNE_ALTERNANCE: 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400',
    ADZUNA: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
};

const SOURCE_LOGO_STYLES: Record<string, string> = {
    FRANCE_TRAVAIL: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
    BONNE_ALTERNANCE: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400',
    ADZUNA: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400',
};

function companyInitials(company: string): string {
    return company
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

function sourceLabel(t: TFunction, source: string): string {
    return t(`dashboard.offres.external.sources.${source}`);
}

interface Props {
    offer: JobOffer;
    isApplied: boolean;
    applicationId: string | undefined;
    isApplying: boolean;
    onSelect: () => void;
    onApply: (offerId: string) => void;
    onWithdraw: (applicationId: string, title: string) => void;
    animationDelayMs?: number;
}

/**
 * Carte offre partagee entre les onglets ITIC et externe (dashboard etudiant) — meme structure,
 * accent de couleur derive de offer.source (MANUAL = ITIC) pour distinguer visuellement les deux
 * sans dupliquer le markup.
 */
export default function OfferCard({
    offer, isApplied, applicationId, isApplying, onSelect, onApply, onWithdraw, animationDelayMs = 0,
}: Props) {
    const { t } = useTranslation();
    const isItic = offer.source === 'MANUAL';

    return (
        <div
            onClick={onSelect}
            style={{ animationDelay: `${animationDelayMs}ms` }}
            className={`group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl flex flex-col gap-3.5 cursor-pointer animate-fade-in-up ${
                isItic
                    ? 'border border-indigo-200/60 dark:border-indigo-900/50 hover:shadow-indigo-500/10 dark:hover:shadow-indigo-950/40'
                    : 'border border-[#1E51FF]/25 dark:border-[#1E51FF]/30 hover:shadow-[#1E51FF]/10 dark:hover:shadow-[#1E51FF]/20'
            }`}
        >
            {/* Top gradient accent — orange/indigo/violet pour ITIC, bleu/lavande (la meme
                charte que .itic-gradient-blue, deja utilisee pour le titre de la page) pour
                l'externe. */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${
                isItic ? 'from-[#E2762F] via-indigo-500 to-violet-500' : 'from-[#4D84FF] to-[#D7C4FF]'
            }`} />

            {/* Background subtle sheen */}
            <div className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${
                isItic ? 'from-indigo-500/[0.03] via-transparent to-violet-500/[0.02]' : 'from-[#4D84FF]/[0.04] via-transparent to-[#D7C4FF]/[0.04]'
            }`} />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-start gap-3 min-w-0">
                    {isItic ? (
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                            <Building2 className="h-5 w-5" />
                        </div>
                    ) : offer.companyLogoUrl ? (
                        <img
                            src={offer.companyLogoUrl}
                            alt={offer.company}
                            className="h-10 w-10 rounded-xl object-contain border border-slate-200 dark:border-slate-800 bg-white shrink-0"
                        />
                    ) : (
                        <span
                            className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                                SOURCE_LOGO_STYLES[offer.source] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            {companyInitials(offer.company)}
                        </span>
                    )}
                    <div className="min-w-0">
                        <p className={`font-bold text-base line-clamp-1 leading-snug ${
                            isItic ? 'text-indigo-600 dark:text-white' : 'text-slate-900 dark:text-white'
                        }`}>
                            {offer.title}
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {offer.company}
                        </p>
                    </div>
                </div>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-12 ${
                    isItic
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'bg-[#1E51FF]/10 dark:bg-[#1E51FF]/20 text-[#1E51FF] dark:text-[#7B9FFF]'
                }`}>
                    <ArrowUpRight className="h-4 w-4" />
                </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 relative z-10">
                {!isItic && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        SOURCE_BADGE_STYLES[offer.source] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                        <Globe className="h-3 w-3" />{sourceLabel(t, offer.source)}
                    </span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    isItic
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-100/80 dark:border-indigo-900/30'
                        : 'bg-[#1E51FF]/10 dark:bg-[#1E51FF]/20 text-[#1E51FF] dark:text-[#7B9FFF] border-[#1E51FF]/15 dark:border-[#1E51FF]/25'
                }`}>
                    <FileSignature className="h-3 w-3" />{offer.contractType.label}
                </span>
                {offer.sector && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-100/80 dark:border-violet-900/30">
                        <Layers className="h-3 w-3" />{offer.sector.label}
                    </span>
                )}
                {offer.location && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                        <MapPin className="h-3 w-3 text-slate-400" />{offer.location}
                    </span>
                )}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed flex-1 relative z-10">
                {offer.description}
            </p>

            {/* Actions Footer */}
            <div
                className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-auto relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {isApplied ? (
                    <>
                        <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                            <CheckCircle2 className="h-4 w-4" />{t('dashboard.offres.already_applied')}
                        </span>
                        <button
                            onClick={() => applicationId && onWithdraw(applicationId, offer.title)}
                            title={t('dashboard.offres.withdraw_hint')}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-800 transition-all duration-200 active:scale-95 cursor-pointer"
                        >
                            <UserMinus className="h-4 w-4" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => onApply(offer.id)}
                        disabled={isApplying}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98] text-white disabled:opacity-60 bg-[#1E51FF] hover:bg-[#1541D6] hover:shadow-md hover:shadow-[#1E51FF]/25"
                    >
                        {t('dashboard.offres.apply_button')}
                    </button>
                )}
                {offer.externalLink && (
                    <a
                        href={offer.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 active:scale-95"
                        title={t('dashboard.offres.actions.view_link')}
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                )}
            </div>
        </div>
    );
}
