import { useRef, useState } from 'react';
import { X, Users, Loader2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useDelayedUnmount } from '../../hooks/useModalClose';
import { useApplicationsForOfferInfinite } from '../../hooks/useJobOffers';
import InfiniteScrollSentinel from './InfiniteScrollSentinel';
import type { JobOffer, JobApplicationJobboard } from '../../types/models/JobOffer';

interface Props {
    offer: JobOffer | null;
    onClose: () => void;
    onViewStudent: (studentId: string) => void;
    loadingStudentId?: string | null;
    /** Une fiche etudiant s'ouvre par-dessus : on masque cette liste (etat et defilement conserves). */
    covered?: boolean;
}

function formatDate(iso: string, locale = 'fr-FR') {
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function JobOfferApplicantsModal({ offer: offerProp, onClose, onViewStudent, loadingStudentId, covered = false }: Props) {
    const { t, i18n } = useTranslation();
    const scrollRef = useRef<HTMLDivElement>(null);
    const { shouldRender, isClosing } = useDelayedUnmount(!!offerProp);
    useLockBodyScroll(scrollRef, shouldRender);
    const [lastOffer, setLastOffer] = useState<JobOffer | null>(null);
    if (offerProp && offerProp !== lastOffer) {
        setLastOffer(offerProp);
    }

    const offer = lastOffer;
    const {
        items: applicants, totalElements, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage,
    } = useApplicationsForOfferInfinite(offerProp?.id ?? null);

    if (!shouldRender || !offer) return null;

    const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR';

    return (
        <div
            className={`fixed inset-0 z-50 ${covered ? 'hidden' : 'flex'} items-end sm:items-center justify-center sm:p-4 bg-black/60 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className={`bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 flex flex-col h-[85vh] sm:h-auto sm:max-h-[80vh] overflow-hidden ${isClosing ? 'animate-scale-down' : 'animate-scale-up'}`}>

                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/30">
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight break-words">
                            {t('dashboard.offres.applicants_modal.title', 'Candidats')}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{offer.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                        </div>
                    ) : applicants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
                            <Users className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-sm">{t('dashboard.offres.applicants_modal.empty', 'Aucun candidat pour cette offre')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(applicants as JobApplicationJobboard[]).map((applicant) => {
                                const loading = loadingStudentId === applicant.studentId;
                                return (
                                    <button
                                        key={applicant.id}
                                        type="button"
                                        onClick={() => onViewStudent(applicant.studentId)}
                                        disabled={loading}
                                        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer disabled:cursor-wait"
                                    >
                                        {applicant.studentProfilePicture ? (
                                            <img
                                                src={applicant.studentProfilePicture}
                                                alt=""
                                                className="h-10 w-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                                {applicant.studentFirstName[0]}{applicant.studentLastName[0]}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {applicant.studentFirstName} {applicant.studentLastName}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{applicant.studentEmail}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs text-slate-400">
                                                {t('dashboard.offres.applicants_modal.applied_at', { date: formatDate(applicant.appliedAt, locale) })}
                                            </p>
                                        </div>
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 text-slate-400 animate-spin shrink-0" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                            <InfiniteScrollSentinel
                                hasMore={hasNextPage}
                                isLoadingMore={isFetchingNextPage}
                                onLoadMore={fetchNextPage}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-center">
                    <p className="text-xs text-slate-400">
                        {t('dashboard.offres.applicants_modal.count', { count: totalElements })}
                    </p>
                </div>
            </div>
        </div>
    );
}
