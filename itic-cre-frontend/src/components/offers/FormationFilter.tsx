import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BookMarked } from 'lucide-react';
import MultiSelectReference from '../basics/MultiSelectReference';
import { usePrograms } from '../../hooks/usePrograms';

/**
 * Filtre multi-formations (lot 8) : valeur = identifiants séparés par des virgules, comme dans l'URL (?formations=)
 * et dans l'appel au serveur (programIds).
 *
 * Lot 11 : même déclencheur que les autres filtres de la barre (pastille, icône, chevron, état actif), libellé
 * « Formations (2) » quand plusieurs formations sont choisies. Le choix multiple et la recherche ne changent pas.
 * `appearance="field"` : habillage des champs de formulaire voisins (onglet Carte des offres).
 */
export default function FormationFilter({ value, onChange, className = 'min-w-48', appearance = 'filter' }: {
    value: string;
    onChange: (csv: string) => void;
    className?: string;
    appearance?: 'filter' | 'field';
}) {
    const { t } = useTranslation();
    const { data: programs, isLoading } = usePrograms();
    const options = useMemo(() => (programs ?? []).map((p) => ({ value: p.id, label: p.displayName })), [programs]);
    return (
        <div className={className} data-testid="formation-filter">
            <MultiSelectReference
                variant={appearance}
                icon={<BookMarked className="h-4 w-4 text-slate-400" />}
                options={options}
                loading={isLoading}
                value={value}
                onChange={onChange}
                ariaLabel={t('formations.filter_aria', 'Filtrer par formation')}
                allLabel={t('formations.filter_all', 'Toutes les formations')}
                searchPlaceholder={t('formations.filter_search', 'Rechercher une formation…')}
                noResultsLabel={t('formations.filter_none', 'Aucune formation')}
                closeLabel={t('formations.filter_close', 'Fermer')}
                selectedCountLabel={(count) => t('formations.filter_count', '{{count}} formations', { count })}
                activeCountLabel={(count) => t('formations.filter_active', 'Formations ({{count}})', { count })}
            />
        </div>
    );
}
