interface StaffLike {
    firstName: string;
    lastName: string;
    role?: { name?: string };
}

/** Nom affichable pour un membre du staff dans un picker "conseiller" — distingue un admin auto-assigné. */
export function formatStaffLabel(staff: StaffLike, adminTag: string): string {
    const name = `${staff.firstName} ${staff.lastName}`;
    return staff.role?.name === 'ADMIN' ? `${name} ${adminTag}` : name;
}
