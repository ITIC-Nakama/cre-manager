import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
    downloadMyCvPdf, fetchMyCvDraft, fetchMyCvPhoto, fetchMyCvScore, removeMyCvPhoto, resetMyCvDraft, saveMyCvDraft,
    submitMyCv, uploadMyCvPhoto,
} from '../api-s/requests/CVBuilderRequest';
import type { CvDraftPayload } from '../types/models/CVBuilder';

export const CV_DRAFT_KEY = ['cv-builder', 'draft'] as const;
export const CV_SCORE_KEY = ['cv-builder', 'score'] as const;

export function useMyCvDraft() {
    return useQuery({
        queryKey: CV_DRAFT_KEY,
        queryFn: fetchMyCvDraft,
        // Une fois chargé, le formulaire devient la source de vérité : pas de rechargement
        // en arrière-plan qui écraserait la saisie en cours.
        staleTime: Infinity,
        // ...mais rechargé à chaque ouverture de l'assistant : un brouillon en cache aurait une version périmée.
        gcTime: 0,
        refetchOnWindowFocus: false,
    });
}

export function useMyCvScore(enabled: boolean) {
    return useQuery({
        queryKey: CV_SCORE_KEY,
        queryFn: fetchMyCvScore,
        enabled,
        refetchOnWindowFocus: false,
    });
}

export function useSaveMyCvDraft() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CvDraftPayload) => saveMyCvDraft(payload),
        onSuccess: (saved) => {
            queryClient.setQueryData(CV_DRAFT_KEY, saved);
            queryClient.invalidateQueries({ queryKey: CV_SCORE_KEY });
        },
    });
}

export function useResetMyCvDraft() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (version: number | null) => resetMyCvDraft(version),
        onSuccess: (draft) => {
            queryClient.setQueryData(CV_DRAFT_KEY, draft);
            queryClient.invalidateQueries({ queryKey: CV_SCORE_KEY });
        },
    });
}

/**
 * Vignette de la photo du CV (adresse locale du JPEG privé), rechargée quand la clé de la photo change.
 * null sans photo.
 */
export function useMyCvPhotoUrl(key: string | null | undefined) {
    const { data: blob } = useQuery({
        queryKey: ['cv-builder', 'photo', key],
        queryFn: fetchMyCvPhoto,
        enabled: !!key,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });
    const url = useMemo(() => (key && blob ? URL.createObjectURL(blob) : null), [key, blob]);
    useEffect(() => () => {
        if (url) URL.revokeObjectURL(url);
    }, [url]);
    return url;
}

export function useUploadMyCvPhoto() {
    return useMutation({ mutationFn: (photo: Blob) => uploadMyCvPhoto(photo) });
}

export function useRemoveMyCvPhoto() {
    return useMutation({ mutationFn: () => removeMyCvPhoto() });
}

export function useDownloadMyCvPdf() {
    return useMutation({ mutationFn: (payload: CvDraftPayload) => downloadMyCvPdf(payload) });
}

export function useSubmitMyCv() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CvDraftPayload) => submitMyCv(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-cv'] });
            queryClient.invalidateQueries({ queryKey: ['my-cv-comments'] });
            queryClient.invalidateQueries({ queryKey: CV_SCORE_KEY });
        },
    });
}
