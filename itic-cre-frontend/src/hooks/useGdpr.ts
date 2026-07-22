import { useMutation } from '@tanstack/react-query';
import { exportGdprData, deleteGdprAccount } from '../api-s/requests/GdprRequest';

export function useExportGdprData() {
  return useMutation({
    mutationFn: exportGdprData,
  });
}

export function useDeleteGdprAccount() {
  return useMutation({
    mutationFn: deleteGdprAccount,
  });
}
