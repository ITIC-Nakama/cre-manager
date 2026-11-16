import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfileDTO } from '../types/models/User';
import { LogoutRequest } from '../api-s/requests/AuthRequest';
import { registerForceLogoutHandler } from '../api-s/AxiosApiClient';
import { queryClient } from '../queryClient';
import { clearAllFormDrafts } from '../utils/formDrafts';

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
                // Brouillons des formulaires (navigateur) : effacés à la déconnexion.
                clearAllFormDrafts();
                try {
                    await LogoutRequest();
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

registerForceLogoutHandler(() => useUserStore.getState().clearUser());
