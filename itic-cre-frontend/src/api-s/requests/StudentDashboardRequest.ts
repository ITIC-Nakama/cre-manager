import { apiClient } from '../AxiosApiClient';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export interface GradeInfo {
    id: string | null;
    nom: string;
    xpMinimum: number;
    ordre: number;
    icone: string | null;
}

export interface GamificationSummary {
    xpTotal: number;
    grade: GradeInfo;
    gradeNext: GradeInfo | null;
    xpProgress: number;
}

export interface CvSummary {
    hasCv: boolean;
    statut: string | null;
    couleur: string | null;
}

export interface StatusCount {
    nom: string;
    couleur: string | null;
    count: number;
}

export interface RecentApplication {
    id: string;
    entreprise: string;
    poste: string;
    statusNom: string;
    statusCouleur: string | null;
    stale: boolean;
    dateModification: string;
}

export interface ApplicationStats {
    total: number;
    parStatut: StatusCount[];
    recentes: RecentApplication[];
}

export interface Task {
    type: 'NO_CV' | 'CV_TO_CORRECT' | 'STALE_APPLICATION' | 'NO_APPLICATION';
    label: string;
    refId: string | null;
}

export interface RankingEntry {
    firstName: string;
    lastName: string;
    xpTotal: number;
    // Serialise comme "me" cote backend (Jackson retire le prefixe "is" des booleens)
    me: boolean;
}

export interface Ranking {
    rank: number;
    totalStudents: number;
    scopedToPromotion: boolean;
    top3: RankingEntry[];
}

export interface StudentDashboardSummary {
    gamification: GamificationSummary;
    cv: CvSummary;
    candidatures: ApplicationStats;
    afaireAujourdhui: Task[];
    ranking: Ranking;
}

export function fetchMyDashboardSummary(): Promise<StudentDashboardSummary> {
    return apiClient.get('/api/me/dashboard/summary').then((response) => unwrap<StudentDashboardSummary>(response));
}
