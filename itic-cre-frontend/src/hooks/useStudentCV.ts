import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyCv, fetchMyCvComments, uploadMyCv, deleteMyCv } from '../api-s/requests/CVStudentRequest';
import { toast } from 'sonner';

export function useMyCV() {
    return useQuery({
        queryKey: ['my-cv'],
        queryFn: fetchMyCv,
        retry: 1,
    });
}

export function useMyCVComments() {
    return useQuery({
        queryKey: ['my-cv-comments'],
        queryFn: fetchMyCvComments,
        retry: 1,
    });
}

export function useUploadCV() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => uploadMyCv(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-cv'] });
            queryClient.invalidateQueries({ queryKey: ['my-cv-comments'] });
            toast.success('CV téléversé avec succès !');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erreur lors du téléversement du CV');
        },
    });
}

export function useDeleteCV() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteMyCv,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-cv'] });
            queryClient.invalidateQueries({ queryKey: ['my-cv-comments'] });
            toast.success('CV supprimé avec succès.');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erreur lors de la suppression du CV');
        },
    });
}
