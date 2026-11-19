import NotAvailablePage from '../../../components/shared/NotAvailablePage';
import { usePublicConfig } from '../../../hooks/usePublicConfig';

/**
 * Lot 10 (C) : pages publiques de l'Espace entreprise (vitrine des CV, formations, contact). Masqué : page neutre
 * « Page non disponible » (le serveur répond 404 de son côté) ; affiché : la page demandée.
 */
export default function CompanySpaceGate({ children }: { children: React.ReactNode }) {
    const { companySpaceEnabled, isPending } = usePublicConfig();
    if (isPending) return null;
    if (!companySpaceEnabled) return <NotAvailablePage />;
    return <>{children}</>;
}
