/**
 * Lot 11 (C) : bouton « Colonnes » réutilisable et mémorisation par utilisateur et par tableau.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import ColumnsMenu from './ColumnsMenu';
import { columnVisibilityKey, useColumnVisibility } from './useColumnVisibility';

type Row = { id: string; nom: string; ville: string; note: number };
const col = createColumnHelper<Row>();
const columns = [
    col.display({ id: 'select', header: 'Sélection', enableHiding: false }),
    col.accessor('nom', { id: 'name', header: 'Étudiant', enableHiding: false }),
    col.accessor('ville', { header: 'Ville' }),
    col.accessor('note', { header: 'Note' }),
];

function Harness({ userId, tableId = 'essai' }: { userId: string; tableId?: string }) {
    const [columnVisibility, setColumnVisibility] = useColumnVisibility(tableId, userId, ['select', 'name']);
    const table = useReactTable({
        data: [{ id: '1', nom: 'Marie-Charlotte DUPONT-LEFEBVRE', ville: 'Paris', note: 4 }],
        columns,
        state: { columnVisibility },
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
    });
    return (
        <>
            <ColumnsMenu table={table} />
            <p data-testid="visibles">{table.getVisibleLeafColumns().map((c) => c.id).join(',')}</p>
        </>
    );
}

const visibles = () => screen.getByTestId('visibles').textContent;
const openMenu = () => fireEvent.click(screen.getByTestId('columns-menu-trigger'));
const box = (name: string) => within(screen.getByRole('dialog')).getByRole('checkbox', { name: new RegExp(name) });

afterEach(() => { vi.restoreAllMocks(); });

describe('bouton « Colonnes »', () => {
    it('masque et réaffiche une colonne ; « Tout afficher » remet tout', () => {
        render(<Harness userId="u1" />);
        expect(visibles()).toBe('select,name,ville,note');
        openMenu();
        fireEvent.click(box('Ville'));
        expect(visibles()).toBe('select,name,note');
        // Le bouton indique qu'une colonne est masquée, avec l'état « actif » des filtres.
        expect(screen.getByTestId('columns-menu-trigger').textContent).toContain('1 masquée');
        expect(screen.getByTestId('columns-menu-trigger').getAttribute('data-active')).toBe('true');
        fireEvent.click(box('Note'));
        expect(visibles()).toBe('select,name');
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tout afficher' }));
        expect(visibles()).toBe('select,name,ville,note');
    });

    it('la colonne « Étudiant » ne peut pas être masquée ; la sélection n’est pas proposée', () => {
        render(<Harness userId="u1" />);
        openMenu();
        const etudiant = box('Étudiant');
        expect((etudiant as HTMLInputElement).disabled).toBe(true);
        expect((etudiant as HTMLInputElement).checked).toBe(true);
        expect(within(screen.getByRole('dialog')).getByText('toujours affichée')).toBeTruthy();
        fireEvent.click(etudiant);
        expect(visibles()).toContain('name');
        expect(within(screen.getByRole('dialog')).queryByRole('checkbox', { name: /Sélection/ })).toBeNull();
    });

    it('le choix est mémorisé par utilisateur et par tableau', () => {
        const first = render(<Harness userId="u1" />);
        openMenu();
        fireEvent.click(box('Ville'));
        expect(JSON.parse(localStorage.getItem(columnVisibilityKey('essai', 'u1'))!)).toEqual({ ville: false });
        first.unmount();

        // Même utilisateur : choix retrouvé.
        const again = render(<Harness userId="u1" />);
        expect(visibles()).toBe('select,name,note');
        again.unmount();
        // Autre utilisateur, ou autre tableau : toutes les colonnes.
        const other = render(<Harness userId="u2" />);
        expect(visibles()).toBe('select,name,ville,note');
        other.unmount();
        render(<Harness userId="u1" tableId="autre" />);
        expect(visibles()).toBe('select,name,ville,note');
    });

    it('stockage indisponible (lecture et écriture refusées) : toutes les colonnes, et le menu marche pour la session', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
        render(<Harness userId="u1" />);
        expect(visibles()).toBe('select,name,ville,note');
        openMenu();
        fireEvent.click(box('Ville'));
        expect(visibles()).toBe('select,name,note');
    });

    it('valeur illisible ou forcée dans le stockage : ignorée, et « Étudiant » reste affichée', () => {
        localStorage.setItem(columnVisibilityKey('essai', 'u1'), '{pas du json');
        const { result, unmount } = renderHook(() => useColumnVisibility('essai', 'u1', ['select', 'name']));
        expect(result.current[0]).toEqual({});
        unmount();
        localStorage.setItem(columnVisibilityKey('essai', 'u1'), JSON.stringify({ name: false, select: false, ville: false, note: 'non' }));
        const hook = renderHook(() => useColumnVisibility('essai', 'u1', ['select', 'name']));
        expect(hook.result.current[0]).toEqual({ ville: false });
        act(() => hook.result.current[1]({ name: false, note: false }));
        expect(hook.result.current[0]).toEqual({ note: false });
    });
});
