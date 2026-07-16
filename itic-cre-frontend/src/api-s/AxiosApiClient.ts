import axios from 'axios';
import { useUserStore } from '../store/UserStore';

const apiBaseUrl = import.meta.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  // Nécessaire : envoie les cookies HttpOnly sur chaque requête cross-origin
  withCredentials: true,
});

// ─── Intercepteur requête : Content-Type ────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // Ne pas forcer JSON sur un upload multipart (FormData) — laisser le
    // navigateur poser son propre Content-Type avec le boundary correct.
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    // Transmettre la langue active au backend pour l'internationalisation des messages
    const lang = localStorage.getItem('i18nextLng') || 'fr';
    const cleanLang = lang.split('-')[0]; // ex: "en-US" -> "en"
    config.headers['Accept-Language'] = cleanLang;
    config.headers['x-auth-user-lang'] = cleanLang;

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Intercepteur réponse : refresh automatique sur 401 ──────────────────────

let isRefreshing = false;
let sessionInvalidated = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: any) => void;
}> = [];

// Relance toutes les requêtes en attente après un refresh réussi (ou les rejette si échec)
function processQueue(error: any) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(undefined);
    }
  });
  failedQueue = [];
}

// Vide le store utilisateur et redirige vers /login
function forceLogout() {
  sessionInvalidated = true;
  useUserStore.getState().clearUser();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// À appeler au login pour remettre l'état à zéro (ex : après un logout forcé)
export function resetSessionState() {
  sessionInvalidated = false;
  isRefreshing = false;
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh-token') ||
      url.includes('/auth/register') ||
      url.includes('/auth/logout');

    // Les endpoints auth (ex : mauvais mot de passe) renvoient 401 légitimement
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Session déjà invalidée — ne pas boucler, ne pas retenter
    if (sessionInvalidated) {
      return Promise.reject(error);
    }

    // Refresh en cours — mettre la requête en attente
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => resolve(apiClient(originalRequest)),
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Le navigateur envoie automatiquement le cookie refreshToken HttpOnly
      await axios.post(
        `${apiBaseUrl}/auth/refresh-token`,
        {},
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );

      // Nouveaux cookies posés par le serveur — on relance toutes les requêtes en attente
      processQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh échoué — invalider la session globalement et déconnecter
      sessionInvalidated = true;
      processQueue(refreshError);
      try {
        await axios.post(`${apiBaseUrl}/auth/logout`, {}, { withCredentials: true });
      } catch (_) { /* best-effort */ }
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
