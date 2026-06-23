export interface Advisor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  jobTitle: string | null;
  mustChangePassword: boolean;
  createdAt: string;
}
