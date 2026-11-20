import { useCallback, useMemo, useState } from 'react';
import type { Updater, VisibilityState } from '@tanstack/react-table';

/**
 * Colonnes affichées d'un tableau, mémorisées par utilisateur et par tableau dans le localStorage (lot 11).
 * Clé : itic-cre-columns:<tableau>:<utilisateur>. Si le stockage est indisponible (navigation privée, quota,
 * données illisibles), toutes les colonnes s'affichent et rien ne casse.
 * Les colonnes de `alwaysVisible` (identité de la ligne, sélection) ne peuvent jamais être masquées, même par une
 * valeur ancienne ou modifiée à la main dans le stockage.
 */
export function columnVisibilityKey(tableId: string, userId: string | number | null | undefined): string {
    return `itic-cre-columns:${tableId}:${userId ?? 'anonyme'}`;
}

function readVisibility(key: string): VisibilityState {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).filter(([, v]) => typeof v === 'boolean'),
        ) as VisibilityState;
    } catch {
        return {};
    }
}

function writeVisibility(key: string, value: VisibilityState): void {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* stockage indisponible : le choix vaut pour la session en cours seulement */
    }
}

export function useColumnVisibility(
    tableId: string,
    userId: string | number | null | undefined,
    alwaysVisible: readonly string[] = [],
): [VisibilityState, (updater: Updater<VisibilityState>) => void] {
    const key = columnVisibilityKey(tableId, userId);
    const locked = alwaysVisible.join(',');
    const [state, setState] = useState(() => ({ key, value: readVisibility(key) }));

    // Changement d'utilisateur (ou de tableau) : on relit son propre choix.
    if (state.key !== key) setState({ key, value: readVisibility(key) });

    const clean = useCallback((value: VisibilityState): VisibilityState => {
        if (!locked) return value;
        const out = { ...value };
        for (const id of locked.split(',')) delete out[id];
        return out;
    }, [locked]);

    const setVisibility = useCallback((updater: Updater<VisibilityState>) => {
        setState((prev) => {
            const base = prev.key === key ? prev.value : readVisibility(key);
            const next = clean(typeof updater === 'function' ? updater(base) : updater);
            writeVisibility(key, next);
            return { key, value: next };
        });
    }, [key, clean]);

    const current = state.key === key ? state.value : null;
    const visibility = useMemo(() => clean(current ?? {}), [clean, current]);
    return [visibility, setVisibility];
}
