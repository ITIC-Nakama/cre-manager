import type { ComponentProps, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Déclencheur commun des filtres de barre d'outils (lot 11) : même hauteur, bordure, arrondi, icône à gauche,
 * chevron et état « actif » pour tous les filtres d'une barre (statut, note, formations, panneau « Filtres »,
 * « Colonnes »). Modèle : la pastille de CustomSelect, la plus répandue.
 *
 * Les propriétés restantes (onClick, aria-expanded, ref…) sont transmises au bouton : il s'utilise tel quel ou
 * comme enfant d'un déclencheur Radix (`asChild`).
 */
export interface FilterTriggerButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
    label: ReactNode;
    icon?: ReactNode;
    /** Un filtre est appliqué (valeur différente de « tous ») : bordure et teinte orange. */
    active?: boolean;
    /** Liste ouverte : le chevron pointe vers le haut. */
    open?: boolean;
}

const BASE = 'inline-flex w-full items-center justify-between gap-2 rounded-full border px-4 py-2 text-sm font-medium transition '
    + 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer';
const IDLE = 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 '
    + 'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800';
// Pas de classes bg-slate-*/border-slate-* ici : en mode sombre, index.css les force (avec !important) au gris des cartes.
const ACTIVE = 'border-[#E2762F] bg-[#E2762F]/10 text-[#b4521c] hover:bg-[#E2762F]/15 '
    + 'dark:bg-[#E2762F]/15 dark:text-[#f0a066] dark:hover:bg-[#E2762F]/25 [&_svg]:text-current';

export default function FilterTriggerButton({
    label, icon, active = false, open = false, className = '', type = 'button', ...rest
}: FilterTriggerButtonProps) {
    return (
        <button
            type={type}
            data-filter-trigger=""
            data-active={active ? 'true' : undefined}
            className={`${BASE} ${active ? ACTIVE : IDLE} ${className}`}
            {...rest}
        >
            <span className="flex min-w-0 items-center gap-2">
                {icon && <span className="flex shrink-0 items-center" aria-hidden="true">{icon}</span>}
                <span className="truncate">{label}</span>
            </span>
            <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${open ? 'rotate-180' : ''}`}
            />
        </button>
    );
}
