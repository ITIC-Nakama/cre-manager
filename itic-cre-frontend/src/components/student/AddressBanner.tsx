import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchMyAddress, MY_ADDRESS_KEY } from '../../api-s/requests/StudentAddressRequest';

/**
 * Lot 10 : bandeau du tableau de bord et du profil tant que l'adresse est incomplète (étudiants inscrits avant qu'elle
 * soit demandée). Ne bloque rien ; disparaît dès que l'adresse est enregistrée.
 */
export default function AddressBanner() {
    const { t } = useTranslation();
    const { data } = useQuery({ queryKey: MY_ADDRESS_KEY, queryFn: fetchMyAddress, staleTime: 5 * 60_000 });
    if (!data || data.complete) return null;

    return (
        <div role="status" className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm">
            <span className="flex items-center gap-3 flex-1">
                <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-amber-900 dark:text-amber-200">
                    {t('address.banner', 'Complète ton adresse : elle est maintenant demandée pour ton dossier.')}
                </span>
            </span>
            <Link to="/student/parametres#adresse"
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shrink-0">
                {t('address.banner_button', 'Compléter mon adresse')}
            </Link>
        </div>
    );
}
