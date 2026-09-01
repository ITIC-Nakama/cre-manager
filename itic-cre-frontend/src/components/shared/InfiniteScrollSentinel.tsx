import { Loader2 } from 'lucide-react';
import { useInfiniteScrollTrigger } from '../../hooks/useInfiniteScrollTrigger';

interface Props {
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
}

/**
 * A poser juste apres une liste/grille/table paginee en infinite scroll. Le declenchement se
 * fait tot (voir useInfiniteScrollTrigger) donc isLoadingMore n'est visible que brievement,
 * le temps que le lot suivant arrive.
 */
export default function InfiniteScrollSentinel({ onLoadMore, hasMore, isLoadingMore }: Props) {
    const sentinelRef = useInfiniteScrollTrigger(onLoadMore, hasMore && !isLoadingMore);

    if (!hasMore) return null;

    return (
        <div ref={sentinelRef} className="flex items-center justify-center py-6">
            {isLoadingMore && (
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin animate-fadeIn" />
            )}
        </div>
    );
}
