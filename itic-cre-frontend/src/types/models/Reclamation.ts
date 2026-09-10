export type ReclamationStatus = 'PENDING' | 'RESOLVED' | 'REFUSED';

export interface Reclamation {
  id: string;
  message: string;
  status: ReclamationStatus;
  closedAt: string | null;
  dateCreation: string;
}

export interface ReclamationPage {
  content: Reclamation[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface CreateReclamationPayload {
  message: string;
  phoneNumber?: string;
}

export interface ReclamationFormContext {
  hasAdvisor: boolean;
  phoneNumber: string | null;
}

export interface FetchReclamationsParams {
  page?: number;
  size?: number;
}

export interface AdvisorReclamation {
  id: string;
  message: string;
  status: ReclamationStatus;
  closedAt: string | null;
  dateCreation: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  studentPhoneNumber: string | null;
  studentPromotionName: string | null;
  assignedAdvisorName: string | null;
}

export interface AdvisorReclamationPage {
  content: AdvisorReclamation[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface FetchAdvisorReclamationsParams {
  page?: number;
  size?: number;
  status?: ReclamationStatus;
}
