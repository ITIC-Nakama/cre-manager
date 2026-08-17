import { Role } from "./Auth";

export interface UserProfileDTO {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    mustChangePassword: boolean;
    profilePicture?: string | null;
    jobTitle?: string | null;
    lang?: string;
    pendingEmail?: string | null;
    promotion?: {
        id: string;
        name: string;
        year?: string;
        hasYears?: boolean;
        availableYears?: number[];
    } | null;
    studyYear?: number | null;
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
        mustChangePassword: Boolean(apiUser.mustChangePassword),
        profilePicture: apiUser.profilePicture,
        jobTitle: apiUser.jobTitle,
        lang: apiUser.lang,
        pendingEmail: apiUser.pendingEmail,
        promotion: apiUser.promotion
            ? {
                  id: apiUser.promotion.id,
                  name: apiUser.promotion.name ?? apiUser.promotion.nom,
                  year: apiUser.promotion.year,
                  hasYears: apiUser.promotion.hasYears,
                  availableYears: apiUser.promotion.availableYears,
              }
            : null,
        studyYear: apiUser.studyYear ?? null,
    };
}
