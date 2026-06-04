import { Role } from "./Auth";

export interface UserProfileDTO {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
}

// Converts the raw API user into the frontend-friendly DTO
export function toUserProfileDTO(apiUser: any): UserProfileDTO {
    let role: Role = Role.STUDENT;

    if (apiUser.roles && Array.isArray(apiUser.roles) && apiUser.roles.length > 0) {
        role = (apiUser.roles[0].id ?? apiUser.roles[0]) as Role;
    }

    return {
        id: apiUser.id,
        email: apiUser.email,
        firstName: apiUser.firstName,
        lastName: apiUser.lastName,
        role,
    };
}
