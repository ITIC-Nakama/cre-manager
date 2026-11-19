import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDeployedBuildId, isEditing, startVersionWatcher, type VersionWatcher } from './versionWatcher';

const json = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);

function memoryStorage() {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
}

let watcher: VersionWatcher | undefined;
afterEach(() => { watcher?.stop(); watcher = undefined; document.body.innerHTML = ''; vi.useRealTimers(); });

function setup(deployed: string | null, opts: { busy?: boolean; storage?: ReturnType<typeof memoryStorage>; registration?: Partial<ServiceWorkerRegistration> } = {}) {
    const fetchImpl = vi.fn(() => (deployed === null ? Promise.reject(new Error('hors ligne')) : json({ buildId: deployed })));
    const reload = vi.fn();
    const hardReset = vi.fn(() => Promise.resolve());
    const storage = opts.storage ?? memoryStorage();
    watcher = startVersionWatcher({
        currentBuildId: 'build-ancien', fetchImpl: fetchImpl as unknown as typeof fetch, reload, hardReset, storage,
        isBusy: () => !!opts.busy, getRegistration: () => opts.registration as ServiceWorkerRegistration | undefined,
    });
    return { fetchImpl, reload, hardReset, storage };
}

describe('rechargement automatique quand une autre version est en ligne', () => {
    it('même version : rien ne se passe', async () => {
        const { reload } = setup('build-ancien');
        expect(await watcher!.check()).toBe('same');
        expect(reload).not.toHaveBeenCalled();
    });

    it('nouvelle version : le service worker est mis à jour, puis la page est rechargée', async () => {
        const update = vi.fn(() => Promise.resolve());
        const { reload, fetchImpl } = setup('build-nouveau', { registration: { update } as unknown as ServiceWorkerRegistration });
        expect(await watcher!.check()).toBe('reload');
        expect(update).toHaveBeenCalledOnce();
        expect(reload).toHaveBeenCalledOnce();
        // Jamais servi par un cache : paramètre unique et cache: 'no-store'.
        const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toMatch(/^\/version\.json\?t=\d+$/);
        expect(init.cache).toBe('no-store');
    });

    it('version remise après un retour arrière (plus ancienne) : rechargée aussi', async () => {
        const { reload } = setup('build-precedent');
        expect(await watcher!.check()).toBe('reload');
        expect(reload).toHaveBeenCalledOnce();
    });

    it('saisie en cours : pas de rechargement ni de mise à jour du service worker, nouvel essai quand on quitte le champ', async () => {
        const update = vi.fn(() => Promise.resolve());
        const state = { busy: true };
        const reload = vi.fn();
        watcher = startVersionWatcher({
            currentBuildId: 'build-ancien', fetchImpl: (() => json({ buildId: 'build-nouveau' })) as unknown as typeof fetch,
            reload, hardReset: () => Promise.resolve(), storage: memoryStorage(), isBusy: () => state.busy,
            getRegistration: () => ({ update } as unknown as ServiceWorkerRegistration),
        });
        expect(await watcher.check()).toBe('deferred');
        expect(update).not.toHaveBeenCalled();
        expect(reload).not.toHaveBeenCalled();
        state.busy = false;
        document.dispatchEvent(new FocusEvent('focusout'));
        await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce());
    });

    it('toujours l’ancienne version après un rechargement : caches vidés, dernier rechargement, puis plus rien (pas de boucle)', async () => {
        const storage = memoryStorage();
        const first = setup('build-nouveau', { storage });
        expect(await watcher!.check()).toBe('reload');
        watcher!.stop();
        // La page rechargée est toujours l'ancienne (service worker bloqué).
        const second = setup('build-nouveau', { storage });
        expect(await watcher!.check()).toBe('hard-reload');
        expect(second.hardReset).toHaveBeenCalledOnce();
        expect(second.reload).toHaveBeenCalledOnce();
        watcher!.stop();
        const third = setup('build-nouveau', { storage });
        expect(await watcher!.check()).toBe('gave-up');
        expect(third.reload).not.toHaveBeenCalled();
        expect(first.reload).toHaveBeenCalledOnce();
    });

    it('hors ligne ou fichier illisible : rien ne se passe', async () => {
        const { reload } = setup(null);
        expect(await watcher!.check()).toBe('unknown');
        expect(await fetchDeployedBuildId((() => json({}, false)) as unknown as typeof fetch)).toBeNull();
        expect(await fetchDeployedBuildId((() => json({ autre: 1 })) as unknown as typeof fetch)).toBeNull();
        expect(reload).not.toHaveBeenCalled();
    });

    it('vérifie au retour sur l’onglet et quand un morceau de l’application ne se charge plus', async () => {
        const { fetchImpl, reload } = setup('build-ancien');
        window.dispatchEvent(new Event('focus'));
        await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
        await watcher!.check(); // fin de la vérification en cours (partagée)
        const preload = new Event('vite:preloadError', { cancelable: true });
        window.dispatchEvent(preload);
        expect(preload.defaultPrevented).toBe(true);
        await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
        expect(reload).not.toHaveBeenCalled();
    });

    it('vérifie toutes les 5 minutes', async () => {
        vi.useFakeTimers();
        const { fetchImpl } = setup('build-ancien');
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('« en train d’écrire » : champ texte, zone de texte ou liste actifs ; pas un bouton ni une case', () => {
        document.body.innerHTML = '<input id="t" type="text"><textarea id="a"></textarea><button id="b">ok</button><input id="c" type="checkbox">';
        const focus = (id: string) => (document.getElementById(id) as HTMLElement).focus();
        focus('t'); expect(isEditing()).toBe(true);
        focus('a'); expect(isEditing()).toBe(true);
        focus('b'); expect(isEditing()).toBe(false);
        focus('c'); expect(isEditing()).toBe(false);
    });
});
