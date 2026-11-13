/** Assistant de creation de CV — miroir des DTO backend (cv/model/dtos/builder). */

export type CvTemplateCode = 'LINEAIRE' | 'CLASSIQUE' | 'MODERNE' | 'BANDEAU';
export type CvLang = 'fr' | 'en';
export type CvLinkType = 'LINKEDIN' | 'GITHUB' | 'PORTFOLIO' | 'AUTRE';
export type CvLanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIF';
export type CvSectionKey =
    | 'experiences' | 'formations' | 'projets' | 'competences' | 'langues' | 'certifications' | 'centresInteret';
/** Sections du formulaire : les sections ordonnables + l'en-tete (identite, accroche). */
export type CvFormSectionKey = 'identite' | 'accroche' | CvSectionKey;

/** Listes fermees, identiques a CvBuilderOptions cote serveur. */
export const CV_TEMPLATES: CvTemplateCode[] = ['LINEAIRE', 'CLASSIQUE', 'MODERNE', 'BANDEAU'];
/** Nom affiche par defaut (avant traduction) : les 4 modeles sont lisibles par les logiciels des recruteurs. */
export const CV_TEMPLATE_LABELS: Record<CvTemplateCode, string> = {
    LINEAIRE: 'Linéaire (optimisé ATS)', CLASSIQUE: 'Classique (optimisé ATS)',
    MODERNE: 'Moderne (optimisé ATS)', BANDEAU: 'Bandeau (optimisé ATS)',
};
/**
 * Ordre des sections propre a chaque modele (CvTemplate.defaultSections cote serveur) : applique tant que
 * l'etudiant n'a pas reordonne lui-meme ses sections (ordrePersonnalise).
 */
export const CV_TEMPLATE_SECTIONS: Record<CvTemplateCode, CvSectionKey[]> = {
    LINEAIRE: ['experiences', 'formations', 'certifications', 'competences', 'langues', 'projets', 'centresInteret'],
    CLASSIQUE: ['formations', 'experiences', 'projets', 'competences', 'langues', 'certifications', 'centresInteret'],
    MODERNE: ['experiences', 'formations', 'projets', 'competences', 'langues', 'certifications', 'centresInteret'],
    BANDEAU: ['formations', 'experiences', 'projets', 'competences', 'langues', 'certifications', 'centresInteret'],
};
export const CV_LINK_TYPES: CvLinkType[] = ['LINKEDIN', 'GITHUB', 'PORTFOLIO', 'AUTRE'];
export const CV_LANGUAGE_LEVELS: CvLanguageLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIF'];
export const CV_SECTIONS: CvSectionKey[] = [
    'experiences', 'formations', 'projets', 'competences', 'langues', 'certifications', 'centresInteret',
];

/** Limites de validation serveur (CvDraftValidator) reprises dans le formulaire. */
export const CV_LIMITS = {
    experiences: 15,
    formations: 10,
    projets: 10,
    points: 6,
    formationPoints: 4,
    pointLength: 200,
    summaryLength: 400,
    shortText: 150,
    description: 500,
    links: 5,
    langues: 10,
    certifications: 15,
    tags: 30,
    tagLength: 60,
} as const;

export interface CvLink { type: CvLinkType; url: string }

export interface CvIdentite {
    prenom: string;
    nom: string;
    titre: string;
    email: string;
    telephone: string;
    ville: string;
    mobilite: string;
    liens: CvLink[];
    afficherPhoto: boolean;
}

export interface CvExperience {
    id: string;
    poste: string;
    entreprise: string;
    ville: string;
    typeContrat: string;
    debut: string;
    fin: string | null;
    enCours: boolean;
    /** Presentation facultative de l'entreprise : « CA 3 M€ – effectif 35 collaborateurs (secteur) ». */
    chiffreAffaires?: string;
    effectif?: string;
    secteur?: string;
    /** Puces de realisations ; « **texte** » met en gras. */
    points: string[];
    /** Proposee depuis une candidature au contrat valide : a confirmer par l'etudiant. */
    aConfirmer: boolean;
}

export interface CvFormation {
    id: string;
    diplome: string;
    etablissement: string;
    ville: string;
    debut: string;
    fin: string;
    enCours: boolean;
    mention: string;
    /** Puces facultatives (4 au plus) ; « **texte** » met en gras. */
    points?: string[];
}

export interface CvProjet {
    id: string;
    nom: string;
    lien: string;
    description: string;
    technos: string[];
}

export interface CvCompetences { techniques: string[]; outils: string[]; savoirEtre: string[] }
export interface CvLangue { langue: string; niveau: CvLanguageLevel | '' }
export interface CvCertification { nom: string; organisme: string; date: string }

export interface CvDraftData {
    identite: CvIdentite;
    accroche: string;
    experiences: CvExperience[];
    formations: CvFormation[];
    projets: CvProjet[];
    competences: CvCompetences;
    langues: CvLangue[];
    certifications: CvCertification[];
    centresInteret: string[];
    ordreSections: CvSectionKey[];
    /** false : l'ordre par defaut du modele s'applique ; passe a true des que l'etudiant reordonne. */
    ordrePersonnalise?: boolean;
    sectionsMasquees: CvSectionKey[];
}

/**
 * Photo du CV (CvPhotoInfo cote serveur) : CV = photo propre au CV, PROFILE = photo de profil du compte reprise
 * telle quelle, NONE = aucune. key change a chaque nouvelle photo (rafraichir la vignette).
 */
export type CvPhotoSource = 'CV' | 'PROFILE' | 'NONE';
export interface CvPhotoInfo {
    source: CvPhotoSource;
    profilePhotoAvailable: boolean;
    key: string | null;
}
/** Emplacement photo des 4 modeles : portrait 5:6 ; fichier envoye 5 Mo au plus (JPEG ou PNG). */
export const CV_PHOTO = {
    ratioWidth: 5,
    ratioHeight: 6,
    outputWidth: 480,
    outputHeight: 576,
    maxBytes: 5 * 1024 * 1024,
    types: ['image/jpeg', 'image/png'],
} as const;

/** Reponse de GET / PUT /cv/builder/me. */
export interface CvDraftResponse {
    data: CvDraftData;
    templateCode: CvTemplateCode;
    accentColor: string;
    cvLang: CvLang;
    /** null tant que le brouillon n'a jamais ete enregistre (prerempli). */
    version: number | null;
    saved: boolean;
    updatedAt: string | null;
    lastSubmittedAt: string | null;
    /** Absente des tres anciennes reponses : traiter comme NONE. */
    photo?: CvPhotoInfo;
}

/** Corps de PUT, preview, pdf et submit : le brouillon courant. */
export interface CvDraftPayload {
    data: CvDraftData;
    templateCode: CvTemplateCode;
    accentColor: string;
    cvLang: CvLang;
    version: number | null;
}

/** Valeurs du formulaire : contenu + options de rendu (la version est geree a part). */
export interface CvBuilderFormValues {
    data: CvDraftData;
    templateCode: CvTemplateCode;
    accentColor: string;
    cvLang: CvLang;
}

export interface CvCompletenessTip {
    code: string;
    section: CvFormSectionKey | null;
    params: Record<string, unknown>;
}

export interface CvCompleteness {
    score: number;
    pageCount: number;
    tips: CvCompletenessTip[];
}

export interface CvGeneratedPdf {
    blob: Blob;
    fileName: string;
    pageCount: number;
}

export interface CvSubmitResponse {
    id: string;
    pageCount: number;
    draftVersion: number;
}
