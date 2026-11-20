import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';

/** Espace entreprise : annuaire public des CV (sans connexion) et back-office de l'équipe. */

export interface CompanySpaceTexts {
    homeTitle: string;
    homeIntro: string | null;
    contactTitle: string;
    contactText: string | null;
    address: string | null;
    phone: string | null;
    warningText: string | null;
}

export interface DirectoryProgram { slug: string; label: string; displayName: string; cvCount: number }
export interface DirectoryDomain { domain: string; programs: DirectoryProgram[] }
export interface DirectoryLevel { level: 'BTS' | 'BACHELOR' | 'MASTERE'; domains: DirectoryDomain[] }
export interface CompanyDirectory { texts: CompanySpaceTexts; levels: DirectoryLevel[] }

export interface CompanyCandidate {
    id: string;
    firstName: string;
    lastName: string;
    formation: string;
    promotion: string | null;
    rhythm: string | null;
    availability: string | null;
    cvToken: string;
}

export interface CompanyProgramPage {
    texts: CompanySpaceTexts;
    slug: string;
    level: string;
    domain: string;
    label: string;
    displayName: string;
    intro: string;
    candidates: CompanyCandidate[];
    linksExpireAt: string;
}

export interface CompanyRequestForm {
    slug?: string | null;
    candidateId?: string | null;
    company: string;
    contactName: string;
    email: string;
    phone?: string;
    message: string;
    website?: string;
}

// ─── Clé du lien privé ──────────────────────────────────────────────────────────────
// Reçue dans l'adresse (?cle=…), gardée pour la session de navigation : les liens internes n'ont pas à la répéter.
const KEY_STORAGE = 'cre-company-space-key';

export function rememberCompanySpaceKey(fromUrl: string | null) {
    try {
        if (fromUrl) sessionStorage.setItem(KEY_STORAGE, fromUrl);
    } catch {
        // stockage indisponible : la clé reste dans l'adresse
    }
}

function companySpaceKey(): string | undefined {
    try {
        return sessionStorage.getItem(KEY_STORAGE) ?? undefined;
    } catch {
        return undefined;
    }
}

const keyParams = () => {
    const cle = companySpaceKey();
    return cle ? { cle } : {};
};

// ─── Public ─────────────────────────────────────────────────────────────────────────

export function fetchCompanyDirectory(): Promise<CompanyDirectory> {
    return apiClient.get('/public/entreprise/annuaire', { params: keyParams() }).then((r) => unwrap<CompanyDirectory>(r));
}

export function fetchCompanyProgram(slug: string): Promise<CompanyProgramPage> {
    return apiClient.get(`/public/entreprise/formations/${encodeURIComponent(slug)}`, { params: keyParams() })
        .then((r) => unwrap<CompanyProgramPage>(r));
}

/** Chemin d'API du PDF d'un CV (lien signé valable 15 minutes), lu en mémoire par la visionneuse du CRE. */
export function companyCvPath(token: string): string {
    const cle = companySpaceKey();
    return `/public/entreprise/cv/${token}${cle ? `?cle=${encodeURIComponent(cle)}` : ''}`;
}

export function submitCompanyRequest(form: CompanyRequestForm): Promise<void> {
    return apiClient.post('/public/entreprise/demandes', form, { params: keyParams() }).then(() => undefined);
}

// ─── Back-office ────────────────────────────────────────────────────────────────────

export interface PromotionRef { id: string; name: string }

export interface AdminProgram {
    id: string;
    level: 'BTS' | 'BACHELOR' | 'MASTERE';
    domain: string;
    label: string;
    displayName: string;
    slug: string;
    slugConfirmed: boolean;
    legacyUrl: string | null;
    matchKeywords: string | null;
    studyYear: number | null;
    romeCodes: string | null;
    offerKeywords: string | null;
    pedagogyUrl: string | null;
    rhythm: string | null;
    availability: string | null;
    visible: boolean;
    sortOrder: number;
    manualPromotions: PromotionRef[];
    linkedPromotions: PromotionRef[];
    cvCount: number;
    pageViews30d: number;
    cvViews30d: number;
    requests30d: number;
}

export interface ProgramForm {
    level?: string;
    domain?: string;
    label?: string;
    slug?: string;
    slugConfirmed?: boolean;
    matchKeywords?: string;
    studyYear?: number;
    romeCodes?: string;
    offerKeywords?: string;
    pedagogyUrl?: string;
    rhythm?: string;
    availability?: string;
    visible?: boolean;
    sortOrder?: number;
    promotionIds?: string[];
    /** Lot 12 : l'admin a confirmé le changement d'adresse de la page (les anciens liens ne marcheront plus). */
    confirmSlugChange?: boolean;
}

/** Lot 12 : une promotion, ses étudiants actifs et les formations qui l'affichent. */
export interface PromotionOverview {
    id: string;
    name: string;
    activeStudents: number;
    programIds: string[];
}

export interface AdminCompanyRequest {
    id: string;
    status: 'NEW' | 'HANDLED';
    createdAt: string;
    company: string;
    contactName: string;
    email: string;
    phone: string | null;
    message: string;
    studentId: string | null;
    studentName: string | null;
    programName: string | null;
    programSlug: string | null;
    handledBy: string | null;
    handledAt: string | null;
}

export interface CompanyRequestPage { content: AdminCompanyRequest[]; totalElements: number; totalPages: number; newCount: number }

export interface CompanySpaceStats {
    cvCount: number;
    pageViews30d: number;
    cvViews30d: number;
    requests30d: number;
    newRequests: number;
    hiddenStudents: number;
}

export interface CompanySpaceSettings {
    homeTitle: string;
    homeIntro: string | null;
    contactTitle: string;
    contactText: string | null;
    address: string | null;
    phone: string | null;
    promotionIntro: string;
    warningText: string | null;
    notificationEmail: string | null;
    privateAccess: boolean;
    accessKey: string;
}

export const fetchAdminPrograms = () => apiClient.get('/company-space/programs').then((r) => unwrap<AdminProgram[]>(r));
export const createProgram = (form: ProgramForm) => apiClient.post('/company-space/programs', form).then(() => undefined);
export const updateProgram = (id: string, form: ProgramForm) => apiClient.put(`/company-space/programs/${id}`, form).then(() => undefined);
export const deleteProgram = (id: string) => apiClient.delete(`/company-space/programs/${id}`).then(() => undefined);
export const fetchPromotionOverview = () => apiClient.get('/company-space/promotions').then((r) => unwrap<PromotionOverview[]>(r));
export const fetchProgramPreview = (id: string) =>
    apiClient.get(`/company-space/programs/${id}/preview`).then((r) => unwrap<CompanyProgramPage>(r));
export const fetchCompanyRequests = (status: string, page: number) =>
    apiClient.get('/company-space/requests', { params: { status, page, size: 20 } }).then((r) => unwrap<CompanyRequestPage>(r));
export const fetchNewCompanyRequestCount = () =>
    apiClient.get('/company-space/requests/new-count').then((r) => unwrap<{ count: number }>(r).count);
export const setCompanyRequestHandled = (id: string, handled: boolean) =>
    apiClient.patch(`/company-space/requests/${id}`, { handled }).then((r) => unwrap<AdminCompanyRequest>(r));
export const fetchCompanySpaceStats = () => apiClient.get('/company-space/stats').then((r) => unwrap<CompanySpaceStats>(r));
export const fetchCompanySpaceSettings = () => apiClient.get('/company-space/settings').then((r) => unwrap<CompanySpaceSettings>(r));
export const updateCompanySpaceSettings = (form: Partial<CompanySpaceSettings>) =>
    apiClient.put('/company-space/settings', form).then((r) => unwrap<CompanySpaceSettings>(r));
export const regenerateCompanySpaceKey = () =>
    apiClient.post('/company-space/settings/regenerate-key').then((r) => unwrap<CompanySpaceSettings>(r));

/** Adresse publique d'une formation (avec la clé si l'accès par lien privé est activé). */
export function companyProgramUrl(slug: string, settings?: Pick<CompanySpaceSettings, 'privateAccess' | 'accessKey'> | null) {
    const base = `${window.location.origin}/entreprise/candidats/${slug}`;
    return settings?.privateAccess ? `${base}?cle=${encodeURIComponent(settings.accessKey)}` : base;
}

// ─── Étudiant ───────────────────────────────────────────────────────────────────────

export const fetchMyCompanySpace = () => apiClient.get('/me/company-space').then((r) => unwrap<{ visible: boolean }>(r));
export const updateMyCompanySpace = (visible: boolean) =>
    apiClient.put('/me/company-space', { visible }).then((r) => unwrap<{ visible: boolean }>(r));
