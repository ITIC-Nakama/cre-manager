import axios from 'axios';
import { useUserStore } from '../store/UserStore';

const apiBaseUrl = import.meta.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  // Required: tells the browser to send cookies (HttpOnly) with every cross-origin request
  withCredentials: true,
});

// ─── Request interceptor: set Content-Type ───────────────────────────────────
// No manual token reading needed — the browser attaches the HttpOnly cookie automatically.
apiClient.interceptors.request.use(
  (config) => {
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Response interceptor: auto-refresh on 401 ──────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: any) => void;
}> = [];

/**
 * Process queued requests that were waiting for the token refresh.
 */
function processQueue(error: any) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(undefined); // requests will retry — the cookie is already updated by the server
    }
  });
  failedQueue = [];
}

/**
 * Clear user state and redirect to login.
 * The server already cleared the HttpOnly cookies via the /auth/logout endpoint.
 */
function forceLogout() {
  useUserStore.getState().clearUser();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 (Unauthorized) errors
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't intercept auth endpoints — avoid infinite loops
    const url = originalRequest.url || '';
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/refresh-token') ||
      url.includes('/auth/register') ||
      url.includes('/auth/logout')
    ) {
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => resolve(apiClient(originalRequest)),
          reject,
        });
      });
    }

    // Mark as refreshing and attempt token renewal
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // No body needed — the browser sends the refreshToken HttpOnly cookie automatically
      await axios.post(
        `${apiBaseUrl}/auth/refresh-token`,
        {},
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );

      // The server has now set fresh HttpOnly cookies.
      // Retry all queued requests — they will automatically use the new cookie.
      processQueue(null);

      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed — clear user state and redirect to login
      processQueue(refreshError);
      // Ask the server to clear the cookies too
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
