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
                set({ user: null });
                try {
                    await apiClient.post('/auth/logout', {});
                } catch (error) {
                    console.error("Failed to log out from server:", error);
                }
            },
        }),
        {
            name: 'itic-cre-user',
        }
    )
)