import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfileDTO } from '../types/models/User';
import { apiClient } from '../api-s/AxiosApiClient';

type UserStore = {
    user: UserProfileDTO | null;
    setUser: (user: UserProfileDTO) => void;
    clearUser: () => void;
    logout: () => Promise<void>;
}

export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            user: null,
            setUser: (user) => set({ user }),
            clearUser: () => set({ user: null }),
            logout: async () => {
                try {
                    // Ask the server to clear the HttpOnly cookies
                    await apiClient.post('/auth/logout', {});
                    // Only clear local state if the request is successful
                    set({ user: null });
                } catch (error) {
                    console.error("Failed to log out from server:", error);
                    throw error;
                }
            },
        }),
        {
            name: 'itic-cre-user',
        }
    )
)