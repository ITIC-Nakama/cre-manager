export const ALUMNI_STATUSES = [
  'CDI', 'CDD', 'ALTERNANCE', 'STAGE', 'FREELANCE', 'JOB_SEARCH', 'TRAINING', 'OTHER',
] as const;

export type AlumniStatus = (typeof ALUMNI_STATUSES)[number];

const WORKING_STATUSES: readonly AlumniStatus[] = ['CDI', 'CDD', 'ALTERNANCE', 'STAGE', 'FREELANCE'];

/** En activite : entreprise, poste et continuite de formation sont alors demandes (miroir du backend). */
export function isWorkingStatus(status: string): status is AlumniStatus {
  return WORKING_STATUSES.includes(status as AlumniStatus);
}

/** Annees de sortie proposables, de la plus recente (annee suivante incluse : promo en cours) a la plus ancienne. */
export function alumniExitYears(): number[] {
  const latest = new Date().getFullYear() + 1;
  const earliest = 1990;
  return Array.from({ length: latest - earliest + 1 }, (_, i) => latest - i);
}

export interface CreateAlumniContactPayload {
  lastName: string;
  firstName: string;
  email: string;
  phoneNumber?: string;
  exitYear: number;
  formation: string;
  currentStatus: AlumniStatus;
  company?: string;
  jobTitle?: string;
  jobInContinuity?: boolean;
  continuityFormation?: string;
  salaryExpectation?: string;
  recontactConsent: boolean;
  gdprConsent: boolean;
  /** Champ piege anti-robot : toujours vide pour un humain. */
  website?: string;
}

export interface AlumniContact {
  id: string;
  lastName: string;
  firstName: string;
  email: string;
  phoneNumber: string | null;
  exitYear: number;
  formation: string;
  currentStatus: AlumniStatus;
  company: string | null;
  jobTitle: string | null;
  jobInContinuity: boolean | null;
  continuityFormation: string | null;
  salaryExpectation: string | null;
  createdAt: string;
}

export interface AlumniContactPage {
  content: AlumniContact[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface FetchAlumniParams {
  page?: number;
  size?: number;
  search?: string;
  exitYear?: number;
  status?: AlumniStatus;
}
