import { matchPath } from 'react-router-dom';

/**
 * Largeur du contenu des pages (lot 11).
 *   - « default » : comportement d'avant, contenu centré et limité à 1 280 px (pages de lecture, formulaires,
 *     tableaux de bord) ;
 *   - « wide » : toute la largeur disponible à côté de la barre latérale, plafonnée à 1 920 px, pour les pages dont
 *     le contenu principal est un tableau de données (9 colonnes et plus sur Étudiants : à 1 280 px, les noms
 *     passaient sur deux lignes).
 *
 * Le réglage est porté par la définition des routes ci-dessous (et non par chaque page) : les gabarits le lisent
 * dès le premier rendu, sans saut de mise en page. Toute adresse absente de la liste reste en « default ».
 */
export type PageWidth = 'default' | 'wide';

/** Routes en pleine largeur. Même syntaxe que les <Route path> de App.tsx. */
export const WIDE_ROUTES: readonly string[] = [
    // Équipe : tableaux de données
    '/supervisor/etudiants',
    '/supervisor/etudiants/:studentId',
    '/supervisor/candidatures',
    '/supervisor/offres',
    '/supervisor/cv',
    '/admin/conseillers',
    '/admin/promotions',
    '/admin/promotions/:id',
    '/admin/audit',
    // Étudiants : aucune page n'a de grand tableau (« Mes candidatures » est une grille de cartes).
];

export function pageWidthFor(pathname: string): PageWidth {
    return WIDE_ROUTES.some((path) => matchPath({ path, end: true }, pathname)) ? 'wide' : 'default';
}

/** Classe de largeur maximale du contenu, par réglage. */
export const PAGE_WIDTH_CLASS: Record<PageWidth, string> = {
    default: 'max-w-screen-xl',
    wide: 'max-w-[1920px]',
};
