import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfileDTO } from '../types/models/User';
import { apiClient } from '../api-s/AxiosApiClient';
import { queryClient } from '../queryClient';

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
            clearUser: () => {
                set({ user: null });
                // Empêche qu'un prochain utilisateur connecté sur le même onglet
                // (poste partagé) ne voie des données mises en cache par le précédent.
                queryClient.clear();
            },
            logout: async () => {
                set({ user: null });
                queryClient.clear();
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