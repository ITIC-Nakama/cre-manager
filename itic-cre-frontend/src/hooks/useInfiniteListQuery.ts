import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { QueryKey } from '@tanstack/react-query';

interface PageLike<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
}

/**
 * Enveloppe useInfiniteQuery pour les endpoints Spring Data Page — tous suivent la meme forme
 * {content, totalElements, totalPages, number}, ce qui permet une seule implementation generique
 * au lieu de dupliquer la logique de pagination infinie dans chaque hook de liste.
 */
export function useInfiniteListQuery<T, P extends { page?: number }>(
    queryKey: QueryKey,
    fetchPage: (params: P) => Promise<PageLike<T>>,
    params: P,
    options: { enabled?: boolean } = {},
) {
    const query = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) => fetchPage({ ...params, page: pageParam as number }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined),
        enabled: options.enabled,
    });

    const items = useMemo(
        () => query.data?.pages.flatMap((p) => p.content ?? []) ?? [],
        [query.data]
    );
    const totalElements = query.data?.pages[0]?.totalElements ?? 0;

    return { ...query, items, totalElements };
}
