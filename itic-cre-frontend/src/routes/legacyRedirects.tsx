import { Navigate, Route } from 'react-router-dom';

/**
 * Anciennes adresses qui ne doivent pas devenir des liens morts.
 * Lot 10 : les « Demandes d'aide » (réclamations) sont remplacées par la messagerie.
 */
export const STUDENT_LEGACY_REDIRECTS = [{ from: '/student/reclamations', to: '/student/messages' }] as const;
export const STAFF_LEGACY_REDIRECTS = [{ from: '/supervisor/reclamations', to: '/supervisor/conversations' }] as const;

export function legacyRoutes(redirects: readonly { from: string; to: string }[]) {
    return redirects.map((r) => <Route key={r.from} path={r.from} element={<Navigate to={r.to} replace />} />);
}
