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
    options: {
        enabled?: boolean;
        /**
         * Cle unique d'un element (ex: studentId). Si fournie, un element renvoye sur deux pages (ordre
         * du serveur qui a bouge entre deux requetes) n'est affiche qu'une fois. Optionnelle : les listes
         * n'ont pas toutes la meme cle. Doit etre une reference STABLE (fonction definie hors composant),
         * sinon la liste est recalculee a chaque rendu (cf. le freeze d'infinite scroll deja corrige ici).
         */
        getItemKey?: (item: T) => string;
    } = {},
) {
    const query = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) => fetchPage({ ...params, page: pageParam as number }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined),
        enabled: options.enabled,
    });

    const { getItemKey } = options;
    const items = useMemo(() => {
        const all = query.data?.pages.flatMap((p) => p.content ?? []) ?? [];
        if (!getItemKey) return all;
        return Array.from(new Map(all.map((item) => [getItemKey(item), item] as const)).values());
    }, [query.data, getItemKey]);
    const totalElements = query.data?.pages[0]?.totalElements ?? 0;

    return { ...query, items, totalElements };
}
