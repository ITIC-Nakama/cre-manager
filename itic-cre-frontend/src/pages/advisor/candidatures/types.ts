import type { ApplicationRow } from '../../../types/models/Application';

export interface StudentGroup {
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string | null;
    promotion: { id: string; nom: string } | null;
    applications: ApplicationRow[];
    staleCount: number;
}

export function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

export function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
