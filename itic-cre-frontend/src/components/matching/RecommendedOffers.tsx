import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchRecommendations } from '../../api-s/requests/MatchingRequest';
import { reasonTexts } from './matchReasons';

/** « Recommandées pour toi » : 10 offres au plus, chacune avec « Pourquoi : … » (tutoiement). */
export default function RecommendedOffers({ onOpen }: { onOpen: (offerId: string) => void }) {
    const { t } = useTranslation();
    const { data } = useQuery({ queryKey: ['jobboard', 'recommendations'], queryFn: fetchRecommendations, staleTime: 5 * 60_000 });
    if (!data || data.offers.length === 0) return null;

    return (
        <section className="space-y-3" aria-labelledby="recommended-title">
            <h2 id="recommended-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-[#3f74ff]" /> {t('matching.recommended_title', 'Recommandées pour toi')}
            </h2>
            <ul className="flex gap-3 overflow-x-auto pb-2 snap-x">
                {data.offers.map((o) => (
                    <li key={o.id} className="snap-start shrink-0 w-72">
                        <button type="button" onClick={() => onOpen(o.id)}
                            className="w-full h-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 hover:border-[#3f74ff] transition-colors cursor-pointer">
                            <p className="font-semibold text-slate-900 dark:text-white line-clamp-2">{o.title}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Building2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{o.company}</span>
                            </p>
                            {o.location && (
                                <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{o.location}</span>
                                </p>
                            )}
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                <span className="font-semibold text-[#3f74ff]">{t('matching.why', 'Pourquoi :')}</span>{' '}
                                {reasonTexts(o.reasons, 'student', t).join(' · ')}
                            </p>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
