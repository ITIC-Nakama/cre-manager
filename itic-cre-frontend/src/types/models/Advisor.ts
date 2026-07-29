export interface Advisor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  jobTitle: string | null;
  mustChangePassword: boolean;
  active: boolean;
  createdAt: string;
  role?: {
    id: number;
    name: 'ADMIN' | 'ADVISOR' | 'STUDENT';
    description?: string;
  };
}

