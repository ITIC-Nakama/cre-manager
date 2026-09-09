export interface Reclamation {
  id: string;
  message: string;
  resolved: boolean;
  resolvedAt: string | null;
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

export interface FetchReclamationsParams {
  page?: number;
  size?: number;
}
