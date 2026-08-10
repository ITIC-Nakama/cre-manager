import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAppConfigurations, updateAppConfiguration } from '../api-s/requests/AppConfigRequest';
import type { UpdateAppConfigPayload } from '../types/models/AppConfig';

/**
 * Hook pour charger la liste des configurations applicatives backend.
 */
export function useAppConfigurations(enabled = true) {
  return useQuery({
    queryKey: ['app-configurations'],
    queryFn: fetchAppConfigurations,
    enabled,
  });
}

/**
 * Hook pour mettre à jour une configuration applicative backend par ID.
 */
export function useUpdateAppConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppConfigPayload }) =>
      updateAppConfiguration(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-configurations'] });
    },
  });
}
