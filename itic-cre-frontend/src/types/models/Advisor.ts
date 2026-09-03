export interface Advisor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  jobTitle: string | null;
  publicProfilePicture?: string | null;
  mustChangePassword: boolean;
  active: boolean;
  createdAt: string;
  role?: {
    id: number;
    name: 'ADMIN' | 'ADVISOR' | 'STUDENT';
    description?: string;
  };
}

export interface AdvisorPage {
  content: Advisor[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface AdvisorListParams {
  page?: number;
  size?: number;
  search?: string;
  role?: 'ADVISOR' | 'ADMIN';
  sort?: string;
}

export interface CreateAdvisorData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: 'ADVISOR' | 'ADMIN';
  phoneNumber?: string;
  jobTitle?: string;
  lang?: string;
}

export interface UpdateAdvisorData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  jobTitle?: string;
  password?: string;
}

export interface DeleteOrDeactivateResult {
  deleted: boolean;
  user: Advisor | null;
}

export interface AdvisorDirectoryEntry {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  email: string;
  profilePicture: string | null;
}
