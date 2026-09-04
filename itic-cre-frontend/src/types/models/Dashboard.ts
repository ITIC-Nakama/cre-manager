import type { AdvisorDirectoryEntry } from './Advisor';

export interface CvByStatut {
  statutId: string;
  statutNom: string;
  couleur: string;
  count: number;
}

export interface AppByStatus {
  statusNom: string;
  couleur: string;
  count: number;
}

export interface DashboardOverview {
  totalStudents: number;
  nonAnonymizedStudents?: number;
  anonymizedStudents?: number;
  totalApplications: number;
  totalCvs: number;
  averageXp: number;
  activeStudents: number;
  inactiveStudents: number;
  studentsWithoutCv: number;
  staleApplicationsCount: number;
  studentsUnderContractCount: number;
  studentsNeedingContractVerificationCount: number;
  recentApplications7d: number;
  applicationsByStatus: AppByStatus[];
  cvsByStatut: CvByStatut[];
  cvsToReview: number;
  inactiveStudentDays?: number;
}

export interface PromotionYearCounts {
  totalStudents: number;
  counts: Record<string, number>;
  unassigned: number;
}

export interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  promotion: { id: string; nom: string } | null;
  advisor: { id: string; firstName: string; lastName: string } | null;
  studyYear?: number | null;
  xpTotal: number;
  grade: { nom: string; icone: string } | null;
  lastActivity: string | null;
  isActive: boolean;
  accountActive: boolean;
  applicationCount: number;
  staleApplicationCount: number;
  hasCv: boolean;
  underContract: boolean;
  contractNeedsVerification: boolean;
  isAnonymized?: boolean;
}

export interface StudentPage {
  content: StudentRow[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface StudentListParams {
  page?: number;
  size?: number;
  search?: string;
  isActive?: boolean;
  hasCv?: boolean;
  hasStale?: boolean;
  promotionId?: string;
  studyYear?: number;
  studyYearMissing?: boolean;
  excludePromotionId?: string;
  advisorId?: string;
  includeAnonymized?: boolean;
  underContract?: boolean;
  sort?: string;
}

export type StudentFilter = 'all' | 'active' | 'inactive' | 'stale' | 'no-cv';

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
  type: 'NO_CV' | 'CV_TO_CORRECT' | 'STALE_APPLICATION' | 'NO_APPLICATION' | 'UPDATE_PROMOTION';
  label: string;
  refId: string | null;
}

export interface RankingEntry {
  firstName: string;
  lastName: string;
  xpTotal: number;
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
  advisor: AdvisorDirectoryEntry | null;
}
