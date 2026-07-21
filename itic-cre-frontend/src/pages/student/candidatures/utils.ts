import type { TFunction } from 'i18next';
import type { ApplicationStatus, Candidature } from '../../../types/models/Application';

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

export function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export function daysSince(iso: string): number {
    const diffMs = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function daysAgoLabel(iso: string, t: TFunction, stale: boolean): string {
    const days = daysSince(iso);
    if (days === 0) {
        return t('dashboard.candidatures.student.card.today');
    }
    return stale
        ? t('dashboard.candidatures.student.card.stale_days', { count: days })
        : t('dashboard.candidatures.student.card.days_ago', { count: days });
}

/** Statut atteint le plus avancé (ordre 1 à 5) — sert de base à la mini barre de progression. */
export function highestReachedOrdre(candidature: Candidature, statuses: ApplicationStatus[]): number {
    const reachedOrdres = statuses
        .filter((s) => s.ordre <= 5 && candidature.reachedStatusIds.includes(s.id))
        .map((s) => s.ordre);
    return Math.max(0, candidature.status.ordre <= 5 ? candidature.status.ordre : 0, ...reachedOrdres);
}

export function isCompleted(candidature: Candidature): boolean {
    return candidature.status.ordre >= 5;
}
