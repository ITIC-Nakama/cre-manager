/**
 * Brouillons des formulaires (PROPOSITIONS-JULES §2, option 1) : enregistrement automatique dans le navigateur,
 * « Reprendre votre brouillon ? » à la réouverture, effacement à l'envoi et à la déconnexion.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFormDraft } from './useFormDraft';
import { clearAllFormDrafts } from '../utils/formDrafts';
import { useUserStore } from '../store/UserStore';

const stored = () => Object.keys(localStorage).filter((k) => k.startsWith('cre-draft:'));

beforeEach(() => {
  localStorage.clear();
  useUserStore.setState({ user: { id: 'u1' } as never });
  vi.useFakeTimers();
});

describe('Brouillons de formulaire', () => {
  it('enregistre après une pause de frappe, propose le brouillon à la réouverture, l’efface à l’envoi', () => {
    const { rerender, unmount } = renderHook(({ value }) => useFormDraft('offre:nouvelle', value, ''), { initialProps: { value: '' } });
    rerender({ value: 'Alternance développeur' });
    act(() => { vi.advanceTimersByTime(900); });
    expect(stored()).toEqual(['cre-draft:u1:offre:nouvelle']);
    unmount();

    const reopened = renderHook(() => useFormDraft('offre:nouvelle', '', ''));
    expect(reopened.result.current.pending?.value).toBe('Alternance développeur');
    let restored: string | null = null;
    act(() => { restored = reopened.result.current.restore(); });
    expect(restored).toBe('Alternance développeur');
    act(() => { reopened.result.current.clear(); });
    expect(stored()).toEqual([]);
  });

  it('formulaire revenu à ses valeurs de départ : pas de brouillon, pas « modifié »', () => {
    const { result, rerender } = renderHook(({ value }) => useFormDraft('note:s1', value, ''), { initialProps: { value: 'x' } });
    expect(result.current.dirty).toBe(true);
    rerender({ value: '' });
    act(() => { vi.advanceTimersByTime(900); });
    expect(result.current.dirty).toBe(false);
    expect(stored()).toEqual([]);
  });

  it('propre à chaque personne, et effacé à la déconnexion', () => {
    localStorage.setItem('cre-draft:u2:offre:nouvelle', JSON.stringify({ value: 'brouillon d’un autre', savedAt: new Date().toISOString() }));
    const { result } = renderHook(() => useFormDraft('offre:nouvelle', '', ''));
    expect(result.current.pending).toBeNull();

    localStorage.setItem('autre-cle', 'garde');
    clearAllFormDrafts();
    expect(stored()).toEqual([]);
    expect(localStorage.getItem('autre-cle')).toBe('garde');
  });
});
