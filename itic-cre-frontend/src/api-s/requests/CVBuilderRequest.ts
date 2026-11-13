import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';
import type {
    CvCompleteness, CvDraftPayload, CvDraftResponse, CvGeneratedPdf, CvSubmitResponse,
} from '../../types/models/CVBuilder';

/** GET /cv/builder/me — brouillon (prérempli et non enregistré au premier accès) */
export function fetchMyCvDraft(): Promise<CvDraftResponse> {
    return apiClient.get('/cv/builder/me').then((r) => unwrap<CvDraftResponse>(r));
}

/** PUT /cv/builder/me — enregistrer le brouillon (409 si la version est périmée) */
export function saveMyCvDraft(payload: CvDraftPayload): Promise<CvDraftResponse> {
    return apiClient.put('/cv/builder/me', payload).then((r) => unwrap<CvDraftResponse>(r));
}

/**
 * POST /cv/builder/me/reset — contenu prérempli (compte, formation, contrats validés), modèle et langue gardés.
 * Le CV déjà envoyé au conseiller n'est pas touché (409 si la version est périmée).
 */
export function resetMyCvDraft(version: number | null): Promise<CvDraftResponse> {
    return apiClient.post('/cv/builder/me/reset', null, { params: version == null ? {} : { version } })
        .then((r) => unwrap<CvDraftResponse>(r));
}

/** POST /cv/builder/me/preview — HTML exact du modèle (pas d'enveloppe JSON) */
export function previewMyCv(payload: CvDraftPayload, signal?: AbortSignal): Promise<string> {
    return apiClient
        .post('/cv/builder/me/preview', payload, { responseType: 'text', signal })
        .then((r) => r.data as string)
        .catch(parseNonJsonError);
}

/** POST /cv/builder/me/pdf — PDF à télécharger, rien n'est soumis */
export function downloadMyCvPdf(payload: CvDraftPayload): Promise<CvGeneratedPdf> {
    return apiClient.post('/cv/builder/me/pdf', payload, { responseType: 'blob' })
        .then((r) => {
            const disposition: string = r.headers['content-disposition'] ?? '';
            const match = /filename="?([^";]+)"?/i.exec(disposition);
            return {
                blob: r.data as Blob,
                fileName: match?.[1] ?? 'CV.pdf',
                pageCount: Number(r.headers['x-page-count'] ?? 1),
            };
        })
        .catch(parseNonJsonError);
}

/**
 * En responseType blob/text, une erreur arrive sous forme de Blob ou de texte : on la relit en JSON
 * pour que getApiErrorMessage retrouve le message localisé du backend.
 */
export async function parseNonJsonError(err: unknown): Promise<never> {
    const response = (err as { response?: { data?: unknown } })?.response;
    if (response) {
        try {
            const raw = response.data instanceof Blob ? await response.data.text() : response.data;
            if (typeof raw === 'string' && raw.trim().startsWith('{')) {
                response.data = JSON.parse(raw);
            }
        } catch {
            // Corps illisible : on laisse l'erreur telle quelle, le message générique s'affichera.
        }
    }
    throw err;
}

/** POST /cv/builder/me/submit — envoyer au conseiller (remplace le CV actif, statut « En attente ») */
export function submitMyCv(payload: CvDraftPayload): Promise<CvSubmitResponse> {
    return apiClient.post('/cv/builder/me/submit', payload).then((r) => unwrap<CvSubmitResponse>(r));
}

/** GET /cv/builder/me/score — complétude du brouillon enregistré */
export function fetchMyCvScore(): Promise<CvCompleteness> {
    return apiClient.get('/cv/builder/me/score').then((r) => unwrap<CvCompleteness>(r));
}
