import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';

/** Code postal des étudiants et carte de l'équipe (seul le département est affiché sur la carte). */

export interface StudentLocation { postalCode: string | null; department: string | null; departmentName: string | null }
export interface DepartmentCount { code: string; name: string; ileDeFrance: boolean; count: number }
export interface StudentMapSummary { departments: DepartmentCount[]; located: number; withoutPostalCode: number }
export interface MapStudent { id: string; firstName: string; lastName: string; formation: string | null; promotion: string | null; underContract: boolean }
export type ContractFilter = 'ALL' | 'WITH' | 'WITHOUT';
export interface MapFilters { promotionId?: string; programId?: string; contract: ContractFilter }

const params = (f: MapFilters) => ({
    contract: f.contract,
    ...(f.promotionId ? { promotionId: f.promotionId } : {}),
    ...(f.programId ? { programId: f.programId } : {}),
});

export const fetchMyLocation = () => apiClient.get('/me/postal-code').then((r) => unwrap<StudentLocation>(r));
export const updateMyPostalCode = (postalCode: string) =>
    apiClient.put('/me/postal-code', { postalCode }).then((r) => unwrap<StudentLocation>(r));
export const updateStudentPostalCode = (studentId: string, postalCode: string) =>
    apiClient.put(`/dashboard/students/${studentId}/postal-code`, { postalCode }).then((r) => unwrap<StudentLocation>(r));
export const fetchStudentMap = (f: MapFilters) =>
    apiClient.get('/dashboard/students/map', { params: params(f) }).then((r) => unwrap<StudentMapSummary>(r));
export const fetchDepartmentStudents = (department: string, f: MapFilters) =>
    apiClient.get(`/dashboard/students/map/departments/${encodeURIComponent(department)}`, { params: params(f) })
        .then((r) => unwrap<MapStudent[]>(r));
