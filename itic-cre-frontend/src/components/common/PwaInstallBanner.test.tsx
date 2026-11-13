/**
 * Bannière « Installer l'application » : elle ne doit cacher ni une fenêtre ni un bouton fixe (13/11/2026).
 * Elle s'efface tant qu'une fenêtre est ouverte ou qu'un bandeau du bas (cookies) est affiché, et réserve sa
 * hauteur en bas des pages (variable CSS --pwa-banner-space, lue par les mises en page et le bouton d'aide).
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PwaInstallBanner from './PwaInstallBanner';
import CookieBanner from './CookieBanner';
import { CookieConsentStorageKey } from '../../types/storage-keys';

const space = () => document.documentElement.style.getPropertyValue('--pwa-banner-space');
const installButton = () => screen.queryByRole('button', { name: 'Installer' });

beforeEach(() => {
  localStorage.setItem(CookieConsentStorageKey, 'true');
  document.documentElement.style.removeProperty('--pwa-banner-space');
});

describe('Bannière « Installer l’application »', () => {
  it('affichée seule : elle réserve sa place en bas des pages', async () => {
    render(<PwaInstallBanner />);
    await waitFor(() => expect(installButton()).not.toBeNull());
    expect(parseFloat(space())).toBeGreaterThan(0);
  });

  it('une fenêtre s’ouvre : la bannière s’efface (plus rien à cacher) puis revient à la fermeture', async () => {
    render(<PwaInstallBanner />);
    await waitFor(() => expect(installButton()).not.toBeNull());

    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 z-50';
    act(() => { document.body.appendChild(dialog); });
    await waitFor(() => expect(installButton()).toBeNull());
    expect(space()).toBe('0px');

    act(() => { dialog.remove(); });
    await waitFor(() => expect(installButton()).not.toBeNull());
  });

  it('bandeau cookies affiché : la bannière attend qu’il soit fermé', async () => {
    localStorage.removeItem(CookieConsentStorageKey);
    render(<MemoryRouter><CookieBanner /><PwaInstallBanner /></MemoryRouter>);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(installButton()).toBeNull();
  });
});
