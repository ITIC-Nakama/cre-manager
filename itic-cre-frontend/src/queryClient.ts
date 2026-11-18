import { QueryClient } from '@tanstack/react-query'

/**
 * Leçon de l'incident des CV (lot 9) : une erreur 4xx (404, 403, 409…) ne changera pas en réessayant. Ne relancer que
 * les erreurs réseau et 5xx, 3 fois au plus. Avant, toutes les requêtes réessayaient 3 fois, y compris un 404 d'état vide.
 */
export function retryUnlessClientErrorGlobal(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status !== undefined && status >= 400 && status < 500) return false
  return failureCount < 3
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: retryUnlessClientErrorGlobal,
      staleTime: 30 * 1000,
    },
  },
})
