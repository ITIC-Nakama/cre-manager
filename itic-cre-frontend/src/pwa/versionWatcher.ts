/**
 * Rechargement automatique quand une autre version de l'application est en ligne.
 *
 * Incident du 19/11 : après les déploiements du matin, un poste est resté sur l'ancienne version, servie par le
 * service worker depuis son cache. Le navigateur ne cherche une nouvelle version du service worker qu'à la navigation,
 * et un simple rechargement pouvait resservir l'ancienne page en cache.
 *
 * Principe : chaque build publie /version.json (identifiant du build, jamais mis en cache). L'onglet le relit toutes
 * les 5 minutes, au retour sur l'onglet et quand un morceau de l'application ne se charge plus. S'il diffère de
 * l'identifiant de la page (version plus récente, ou version remise après un retour arrière), on :
 *   1. si l'utilisateur est en train d'écrire, on attend qu'il quitte le champ, pour ne jamais faire perdre une saisie ;
 *   2. on demande au service worker de se mettre à jour, on attend qu'il prenne la main (10 s au plus), puis on recharge ;
 *   3. si, une fois rechargée, la page est toujours l'ancienne (service worker bloqué), on désinscrit le service
 *      worker et on vide ses caches, puis on recharge une dernière fois. Jamais de boucle : une seule tentative de
 *      chaque sorte par version.
 */

export const VERSION_URL = '/version.json';
export const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const SW_TAKEOVER_TIMEOUT_MS = 10_000;
const BUSY_RETRY_MS = 10_000;
const RELOADED_FOR = 'cre-reloaded-for';
const HARD_RELOADED_FOR = 'cre-hard-reloaded-for';

export interface VersionWatcherDeps {
    currentBuildId: string;
    fetchImpl?: typeof fetch;
    getRegistration?: () => ServiceWorkerRegistration | undefined;
    reload?: () => void;
    storage?: Pick<Storage, 'getItem' | 'setItem'>;
    /** Vrai si l'utilisateur est en train d'écrire (champ de saisie actif) : on ne recharge pas sous ses doigts. */
    isBusy?: () => boolean;
    /** Désinscrit les service workers et vide les caches (dernier recours). */
    hardReset?: () => Promise<void>;
    intervalMs?: number;
    win?: Window;
    doc?: Document;
}

/** Identifiant du build en ligne, ou null (hors ligne, fichier absent, réponse inattendue : on ne fait rien). */
export async function fetchDeployedBuildId(fetchImpl: typeof fetch = fetch): Promise<string | null> {
    try {
        const response = await fetchImpl(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return null;
        const body: unknown = await response.json();
        const id = body && typeof body === 'object' ? (body as { buildId?: unknown }).buildId : null;
        return typeof id === 'string' && id.trim() ? id : null;
    } catch {
        return null;
    }
}

export function isEditing(doc: Document = document): boolean {
    const el = doc.activeElement as HTMLElement | null;
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag !== 'INPUT') return false;
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color'].includes(type);
}

async function defaultHardReset(): Promise<void> {
    try {
        const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
        await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    } catch { /* rien à faire */ }
    try {
        const keys = (await globalThis.caches?.keys?.()) ?? [];
        await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* rien à faire */ }
}

/** Met à jour le service worker et attend qu'il contrôle la page (10 s au plus). */
async function updateServiceWorker(registration: ServiceWorkerRegistration | undefined, win: Window): Promise<void> {
    if (!registration) return;
    try { await registration.update(); } catch { /* hors ligne : on recharge quand même */ }
    const sw = (win.navigator as Navigator).serviceWorker;
    const pending = registration.installing ?? registration.waiting;
    if (!pending || !sw) return;
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    await new Promise<void>((resolve) => {
        const done = () => { sw.removeEventListener('controllerchange', done); resolve(); };
        sw.addEventListener('controllerchange', done);
        setTimeout(done, SW_TAKEOVER_TIMEOUT_MS);
    });
}

export interface VersionWatcher {
    /** Vérifie tout de suite ; renvoie l'action menée (utile aux tests). */
    check: () => Promise<'same' | 'unknown' | 'reload' | 'hard-reload' | 'deferred' | 'gave-up'>;
    stop: () => void;
}

export function startVersionWatcher(deps: VersionWatcherDeps): VersionWatcher {
    const win = deps.win ?? window;
    const doc = deps.doc ?? document;
    const fetchImpl = deps.fetchImpl ?? win.fetch.bind(win);
    const reload = deps.reload ?? (() => win.location.reload());
    const storage = deps.storage ?? win.sessionStorage;
    const isBusy = deps.isBusy ?? (() => isEditing(doc));
    const hardReset = deps.hardReset ?? defaultHardReset;
    const current = deps.currentBuildId;
    let inflight: ReturnType<VersionWatcher['check']> | null = null;
    let deferTimer: ReturnType<typeof setTimeout> | undefined;

    const read = (k: string) => { try { return storage.getItem(k); } catch { return null; } };
    const write = (k: string, v: string) => { try { storage.setItem(k, v); } catch { /* navigation privée */ } };

    // Une seule vérification à la fois : un appel pendant qu'une vérification tourne en partage le résultat.
    const check: VersionWatcher['check'] = () => {
        if (!inflight) inflight = runCheck().finally(() => { inflight = null; });
        return inflight;
    };

    const runCheck = async (): ReturnType<VersionWatcher['check']> => {
        const deployed = await fetchDeployedBuildId(fetchImpl);
        if (!deployed) return 'unknown';
        if (deployed === current) return 'same';

        if (read(HARD_RELOADED_FOR) === deployed) return 'gave-up';
        if (doc.visibilityState === 'visible' && isBusy()) {
            // Saisie en cours : on réessaie quand l'utilisateur quitte le champ (ou dans 10 s). Rien n'est mis à jour
            // avant : en mode autoUpdate, le service worker recharge lui-même la page dès qu'il prend la main.
            clearTimeout(deferTimer);
            deferTimer = setTimeout(() => { void check(); }, BUSY_RETRY_MS);
            return 'deferred';
        }
        const alreadyReloaded = read(RELOADED_FOR) === deployed;
        if (!alreadyReloaded) {
            await updateServiceWorker(deps.getRegistration?.(), win);
        }
        if (alreadyReloaded) {
            // Déjà rechargée pour cette version et toujours l'ancienne : le service worker sert un cache périmé.
            write(HARD_RELOADED_FOR, deployed);
            await hardReset();
            reload();
            return 'hard-reload';
        }
        write(RELOADED_FOR, deployed);
        reload();
        return 'reload';
    };

    const onVisible = () => { if (doc.visibilityState === 'visible') void check(); };
    const onFocusOut = () => { if (deferTimer) { clearTimeout(deferTimer); deferTimer = undefined; setTimeout(() => { void check(); }, 0); } };
    // Un morceau de l'application (import dynamique) introuvable : signe classique d'une version remplacée.
    const onPreloadError = (event: Event) => { event.preventDefault(); void check(); };

    const interval = setInterval(() => { if (win.navigator.onLine !== false) void check(); }, deps.intervalMs ?? CHECK_INTERVAL_MS);
    doc.addEventListener('visibilitychange', onVisible);
    win.addEventListener('focus', onVisible);
    doc.addEventListener('focusout', onFocusOut);
    win.addEventListener('vite:preloadError', onPreloadError);

    return {
        check,
        stop: () => {
            clearInterval(interval);
            clearTimeout(deferTimer);
            doc.removeEventListener('visibilitychange', onVisible);
            win.removeEventListener('focus', onVisible);
            doc.removeEventListener('focusout', onFocusOut);
            win.removeEventListener('vite:preloadError', onPreloadError);
        },
    };
}
