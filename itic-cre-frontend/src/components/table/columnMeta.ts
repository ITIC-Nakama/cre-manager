import type { CSSProperties } from 'react';
import type { Column, RowData } from '@tanstack/react-table';

/*
 * Réglages d'affichage portés par la définition des colonnes TanStack (lot 11), lus par les tableaux de données
 * (DataTableFrame) : libellé du menu « Colonnes », colonnes figées à gauche, classes des cellules.
 */
declare module '@tanstack/react-table' {
    // Les paramètres de type sont imposés par la déclaration d'origine (fusion d'interfaces).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        /** Libellé dans le menu « Colonnes » (sinon l'en-tête, s'il est un texte). */
        label?: string;
        /** Colonne figée à gauche pendant le défilement horizontal : décalage depuis le bord gauche, en px. */
        stickyLeft?: number;
        /** Dernière colonne figée : porte l'ombre qui signale que le tableau défile. */
        stickyEdge?: boolean;
        /** Classes ajoutées aux cellules de la colonne (en-tête et corps). */
        className?: string;
    }
}

/** Largeur fixe de la colonne de sélection (case à cocher + marges) : sert de décalage à la colonne figée suivante. */
export const SELECT_COLUMN_WIDTH = 48;

export function columnLabel<T>(column: Column<T, unknown>): string {
    const meta = column.columnDef.meta;
    if (meta?.label) return meta.label;
    const header = column.columnDef.header;
    return typeof header === 'string' ? header : column.id;
}

/** Classes et style d'une cellule (en-tête ou corps) selon les réglages de sa colonne. */
export function columnCellProps<T>(column: Column<T, unknown>): { className: string; style?: CSSProperties } {
    const meta = column.columnDef.meta;
    const sticky = meta?.stickyLeft !== undefined;
    const className = [sticky && 'dt-sticky', meta?.stickyEdge && 'dt-sticky-edge', meta?.className]
        .filter(Boolean)
        .join(' ');
    return { className, style: sticky ? { left: meta!.stickyLeft } : undefined };
}

export function isStickyColumn<T>(column: Column<T, unknown>): boolean {
    return column.columnDef.meta?.stickyLeft !== undefined;
}
