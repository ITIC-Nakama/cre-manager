import type { JobOffer } from '../types/models/JobOffer';

/**
 * Même motif que le backend (ApplicationEmailExtractor.EMAIL_REGEX) : sert à prévenir le staff,
 * dans le formulaire, avant même l'envoi, qu'une offre n'a aucun moyen de postuler.
 */
const APPLICATION_EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/** Comment l'étudiant postule : lien externe, e-mail (mailto), sinon rien (détail de l'offre). */
export type ApplyChannel = 'link' | 'email' | 'none';

export function getApplyChannel(offer: Pick<JobOffer, 'externalLink' | 'emailCandidature'>): ApplyChannel {
    if (offer.externalLink?.trim()) return 'link';
    if (offer.emailCandidature) return 'email';
    return 'none';
}

/** Première adresse e-mail d'un texte, en minuscules (aperçu côté formulaire staff). */
export function findApplicationEmail(text: string): string | null {
    const match = APPLICATION_EMAIL_REGEX.exec(text);
    return match ? match[0].toLowerCase() : null;
}

/**
 * Objet du mail de candidature : « Candidature alternance – [intitulé] – [Prénom Nom] »,
 * « Candidature stage – … », ou « Candidature – … » pour les autres contrats.
 */
export function buildApplicationSubject(offer: Pick<JobOffer, 'title' | 'contractType'>, fullName: string): string {
    const label = offer.contractType?.label?.toLowerCase() ?? '';
    const kind = label.includes('alternance') ? 'Candidature alternance'
        : label.includes('stage') ? 'Candidature stage'
            : 'Candidature';
    return [kind, offer.title.trim(), fullName.trim()].filter(Boolean).join(' – ');
}

export function buildMailtoHref(email: string, subject: string): string {
    return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
