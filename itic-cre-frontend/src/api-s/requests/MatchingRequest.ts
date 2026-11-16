import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';

/** Rapprochement explicable offres / étudiants (score et raisons calculés par le serveur, sans IA externe). */

export type ReasonType = 'FORMATION' | 'CONTRACT' | 'LEVEL' | 'NEAR' | 'IDF' | 'REMOTE' | 'CV';
export interface MatchReason { type: ReasonType; values: string[] }

export interface RecommendedOffer {
    id: string;
    title: string;
    company: string;
    location: string | null;
    contractType: string | null;
    publishedAt: string | null;
    score: number;
    reasons: MatchReason[];
}

export interface Recommendations { hasFormation: boolean; offers: RecommendedOffer[] }

export interface SuggestedCandidate {
    studentId: string;
    firstName: string;
    lastName: string;
    promotion: string;
    formation: string;
    department: string | null;
    score: number;
    reasons: MatchReason[];
}

export const fetchRecommendations = () => apiClient.get('/jobboard/recommendations').then((r) => unwrap<Recommendations>(r));
export const fetchSuggestedCandidates = (offerId: string) =>
    apiClient.get(`/jobboard/offers/${offerId}/suggested-candidates`).then((r) => unwrap<SuggestedCandidate[]>(r));
