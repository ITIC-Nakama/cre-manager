import { Role } from "./Auth";

export interface UserProfileDTO {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    mustChangePassword: boolean;
}

// Converts the raw API user into the frontend-friendly DTO
export function toUserProfileDTO(apiUser: any): UserProfileDTO {
    let role: Role = Role.STUDENT;

    if (apiUser.role) {
        if (typeof apiUser.role === 'object') {
            role = (apiUser.role.id ?? Role.STUDENT) as Role;
        } else {
            role = apiUser.role as Role;
        }
    } else if (apiUser.roles && Array.isArray(apiUser.roles) && apiUser.roles.length > 0) {
        role = (apiUser.roles[0].id ?? apiUser.roles[0]) as Role;
    }

    return {
        id: apiUser.id,
        email: apiUser.email,
        firstName: apiUser.firstName,
        lastName: apiUser.lastName,
        role,
        mustChangePassword: apiUser.mustChangePassword ?? false,
    };
}
