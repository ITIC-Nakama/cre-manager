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
  totalApplications: number;
  totalCvs: number;
  averageXp: number;
  activeStudents: number;
  inactiveStudents: number;
  studentsWithoutCv: number;
  staleApplicationsCount: number;
  recentApplications7d: number;
  applicationsByStatus: AppByStatus[];
  cvsByStatut: CvByStatut[];
  cvsToReview: number;
}

export interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  promotion: { id: string; nom: string } | null;
  xpTotal: number;
  grade: { nom: string; icone: string } | null;
  lastActivity: string | null;
  isActive: boolean;
  accountActive: boolean;
  applicationCount: number;
  staleApplicationCount: number;
  hasCv: boolean;
}

export type StudentFilter = 'all' | 'active' | 'inactive' | 'stale' | 'no-cv';
