/**
 * Accompagnement de l'étudiant dans l'assistant de CV : conseils par section, exemples prêts à adapter,
 * verbes d'action et vérifications avant l'envoi. Textes par défaut en français (traduits via
 * studentCvBuilder.guide.* dans fr.json / en.json) ; exemples pensés pour un étudiant en alternance.
 */
import type { CvBuilderFormValues, CvCompleteness, CvFormSectionKey } from '../../../../types/models/CVBuilder';

/** Conseil court + exemple concret, affichés en tête de chaque section ouverte. */
export const SECTION_TIPS: Partial<Record<CvFormSectionKey, { tip: string; example: string }>> = {
  identite: {
    tip: 'Le titre, c’est le poste que tu vises : c’est la première chose que lit le recruteur.',
    example: '« Chargé(e) de clientèle en alternance — rythme 3 semaines / 1 semaine »',
  },
  accroche: {
    tip: 'Dis en 2 ou 3 phrases ce que tu prépares, ce que tu cherches (contrat, durée, rythme, date) et ce que tu apportes.',
    example: '« En Bachelor RH à ITIC Paris, je cherche une alternance de 12 mois dès septembre. »',
  },
  experiences: {
    tip: 'Une ligne = une réalisation. Commence par un verbe d’action et ajoute un chiffre quand tu peux.',
    example: 'Remplace « j’ai aidé à l’accueil » par « Accueillir et conseiller 30 clients par jour ».',
  },
  formations: {
    tip: 'Ta formation ITIC en premier, puis le diplôme précédent. Un point clé suffit pour te démarquer.',
    example: '« Projet de fin d’année : application de réservation, note de 17/20 »',
  },
  projets: {
    tip: 'Un projet montre ce que tu sais faire, même sans expérience : dis ce que tu as fait et avec quels outils.',
    example: '« Site vitrine pour une association : 5 pages, WordPress, mis en ligne en 3 semaines »',
  },
  competences: {
    tip: 'Reprends les mots des offres qui t’intéressent : ce sont eux que les logiciels des recruteurs recherchent.',
    example: 'Techniques : prospection, CRM HubSpot · Outils : Excel, Canva · Savoir-être : organisation',
  },
  langues: {
    tip: 'Indique toujours un niveau : « Anglais » seul ne dit rien au recruteur.',
    example: 'Anglais — B2 (TOEIC 785) · Espagnol — A2',
  },
  certifications: {
    tip: 'TOEIC, Voltaire, PIX, certification Google… : une ligne avec le nom, l’organisme et la date.',
    example: '« Projet Voltaire — niveau Affaires, 2025 »',
  },
  centresInteret: {
    tip: 'Deux ou trois centres d’intérêt précis : ils lancent souvent la conversation en entretien.',
    example: '« Basket en club (capitaine) », plutôt que « Sport »',
  },
};

/** Exemples d'accroche : à insérer en un clic, les passages entre crochets sont à personnaliser. */
export const SUMMARY_EXAMPLES: string[] = [
  'Étudiant(e) en [formation] à ITIC Paris, je recherche une alternance de [durée] en [métier visé] à partir de [mois], rythme [rythme]. [Qualité] et [qualité], je souhaite mettre mes compétences en [domaine] au service de votre équipe.',
  'Après [expérience ou diplôme précédent], je prépare un [diplôme] à ITIC Paris. Je cherche une alternance en [métier visé] pour [objectif concret], dès [mois], au rythme [rythme].',
  'À l’aise avec [outil ou compétence] et [outil ou compétence], je cherche une alternance de [durée] en [métier visé]. Mes atouts : [qualité], [qualité] et l’envie d’apprendre vite.',
];

/** Exemples de réalisations chiffrées (alternance, stage, job étudiant). */
export const BULLET_EXAMPLES: string[] = [
  'Accueillir et conseiller **30 clients** par jour en boutique',
  'Relancer les prospects par téléphone : **+15 %** de rendez-vous en 3 mois',
  'Animer la page LinkedIn de l’entreprise : **+300 abonnés** en 6 mois',
  'Préparer les dossiers de **20 nouveaux salariés** (contrats, mutuelle, accueil)',
  'Développer **6 pages** web accessibles avec React',
];

/** Verbes d'action proposés au moment d'écrire une réalisation (infinitif, comme l'exemple de CV de Jules). */
export const ACTION_VERBS: string[] = [
  'Accompagner', 'Animer', 'Analyser', 'Concevoir', 'Développer', 'Gérer', 'Négocier', 'Organiser', 'Piloter', 'Prospecter',
];

/** Débuts de phrase peu parlants : on propose alors un verbe plus fort. */
const WEAK_STARTS = /^(j['’]ai (aidé|fait|participé|été)|aider|aide |participer|participation|faire |divers|tâches)/i;

export function isWeakStart(point: string): boolean {
  return WEAK_STARTS.test(point.trim());
}

/** Points gagnés en suivant chaque conseil du score (barème de CvCompletenessService). */
const TIP_GAINS: Record<string, number> = {
  NAME_MISSING: 10, EXPERIENCE_MISSING: 15, SUMMARY_MISSING: 10, EDUCATION_MISSING: 10, SKILLS_MISSING: 10,
  TITLE_MISSING: 8, CONTACT_MISSING: 7, SUMMARY_TOO_SHORT: 5, EXPERIENCE_POINTS: 5, SKILLS_FEW: 5,
  LANGUAGES_MISSING: 5, LANGUAGE_LEVELS: 5, PROJECTS_MISSING: 5, INTERESTS_MISSING: 5, TOO_LONG: 5,
  CITY_MISSING: 3, LINKS_MISSING: 2, EXPERIENCE_TO_CONFIRM: 0,
};

/** Prochaine action la plus utile : le conseil qui rapporte le plus (à égalité, l'ordre du serveur). */
export function nextBestTip(completeness: CvCompleteness | undefined) {
  if (!completeness || completeness.tips.length === 0) return null;
  let best = completeness.tips[0];
  for (const tip of completeness.tips) {
    if ((TIP_GAINS[tip.code] ?? 0) > (TIP_GAINS[best.code] ?? 0)) best = tip;
  }
  return { tip: best, gain: TIP_GAINS[best.code] ?? 0 };
}

export type CheckStatus = 'ok' | 'warn';
export interface PreSendCheck { key: string; status: CheckStatus; label: string; section: CvFormSectionKey | null }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PLACEHOLDER = /\[[^\]]{2,}\]/;

/**
 * Vérification avant l'envoi (jamais bloquante) : coordonnées, une expérience, une réalisation chiffrée,
 * une page, et les erreurs de format faciles à corriger. Libellés par défaut en français (clés guide.check.*).
 */
export function preSendChecks(values: CvBuilderFormValues, pageCount: number | null): PreSendCheck[] {
  const { identite, experiences, formations, accroche } = values.data;
  const checks: PreSendCheck[] = [];
  const add = (key: string, ok: boolean, label: string, section: CvFormSectionKey | null) =>
    checks.push({ key, status: ok ? 'ok' : 'warn', label, section });

  const contactOk = !!(identite.prenom.trim() && identite.nom.trim() && identite.email.trim() && identite.telephone.trim());
  add('contact', contactOk, 'Coordonnées complètes (prénom, nom, e-mail, téléphone)', 'identite');
  add('experience', experiences.length > 0, 'Au moins une expérience (alternance, stage, job, bénévolat)', 'experiences');
  const figure = experiences.some((e) => e.points.some((p) => /\d/.test(p)));
  add('figure', figure, 'Au moins une réalisation avec un chiffre (+15 %, 30 clients…)', 'experiences');
  add('onePage', pageCount === null || pageCount <= 1, 'Une page maximum', 'experiences');

  const formatProblems: string[] = [];
  if (identite.email.trim() && !EMAIL.test(identite.email.trim())) formatProblems.push('email');
  if (identite.telephone.trim() && identite.telephone.replace(/\D/g, '').length < 10) formatProblems.push('phone');
  const datesReversed = [...experiences, ...formations].some((e) => !e.enCours && e.debut && e.fin && e.fin < e.debut);
  if (datesReversed) formatProblems.push('dates');
  const texts = [accroche, ...experiences.flatMap((e) => e.points), ...formations.flatMap((f) => f.points ?? [])];
  if (texts.some((text) => PLACEHOLDER.test(text ?? ''))) formatProblems.push('placeholder');
  add('format', formatProblems.length === 0, 'Pas d’erreur de format (e-mail, téléphone, dates) ni de [passage entre crochets] d’un exemple',
    formatProblems.includes('email') || formatProblems.includes('phone') ? 'identite'
      : formatProblems.includes('placeholder') && PLACEHOLDER.test(accroche ?? '') ? 'accroche' : 'experiences');
  add('toConfirm', !experiences.some((e) => e.aConfirmer), 'Expériences proposées automatiquement : vérifiées et confirmées', 'experiences');
  return checks;
}
