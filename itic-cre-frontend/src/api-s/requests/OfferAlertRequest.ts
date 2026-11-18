import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';
import type { JobOffer } from '../../types/models/JobOffer';

/** Lot 8 : alertes « nouvelle offre pour ta formation », vue par formation et carte des offres (équipe). */

export interface FormationOverview {
    id: string;
    level: 'BTS' | 'BACHELOR' | 'MASTERE';
    formation: string;
    slug: string;
    activeOffers: number;
    newOffers7d: number;
    activeStudents: number;
    studentsUnderContract: number;
    alertsEnabled: boolean;
    lastAlertAt: string | null;
}

export interface AlertRecipient {
    studentId: string;
    firstName: string;
    lastName: string;
    promotion: string | null;
    formation: string;
    alreadyAlerted: boolean;
}

export interface AlertRecipientsPreview {
    /** Alertes activées sur le serveur (APP_MAILING_INSTANT_OFFERS_ENABLED). */
    alertsEnabled: boolean;
    count: number;
    recipients: AlertRecipient[];
    /** Formations de l'offre dont les alertes sont coupées. */
    disabledFormations: string[];
}

export interface AlertJournalRow {
    offerId: string;
    offerTitle: string | null;
    company: string | null;
    programId: string | null;
    formation: string | null;
    recipients: number;
    sent: number;
    failed: number;
    grouped: number;
    evening: number;
    pending: number;
    lastAt: string | null;
}

export interface AlertJournalPage { content: AlertJournalRow[]; totalElements: number; totalPages: number }
export interface AlertSettings { enabled: boolean; windowMinutes: number; dailyCap: number }

export interface OfferMapDepartment { code: string; name: string; ileDeFrance: boolean; count: number; companies: number }
export interface OfferMapSummary { departments: OfferMapDepartment[]; located: number; notLocated: number; companies: number }
export interface MapOffer { id: string; title: string; contractType: string | null; source: string; createdAt: string | null }
export interface MapCompany { company: string; offers: number; items: MapOffer[] }
export interface OfferMapFilters { programIds?: string[]; contractTypeId?: string; source?: string }

/** Listes d'identifiants : « a,b,c » (Spring lit une liste séparée par des virgules). */
export const idList = (ids?: string[]) => (ids && ids.length > 0 ? ids.join(',') : undefined);

const mapParams = (f: OfferMapFilters) => ({
    ...(f.programIds?.length ? { programIds: idList(f.programIds) } : {}),
    ...(f.contractTypeId ? { contractTypeId: f.contractTypeId } : {}),
    ...(f.source ? { source: f.source } : {}),
});

export const fetchFormationsOverview = () => apiClient.get('/jobboard/formations').then((r) => unwrap<FormationOverview[]>(r));
export const toggleFormationAlerts = (programId: string, enabled: boolean) =>
    apiClient.put(`/jobboard/formations/${programId}/alerts`, { enabled }).then((r) => unwrap<FormationOverview>(r));
export const fetchAlertRecipients = (offerId: string) =>
    apiClient.get(`/jobboard/offers/${offerId}/alert-recipients`).then((r) => unwrap<AlertRecipientsPreview>(r));
export const fetchAlertJournal = (page = 0, size = 20) =>
    apiClient.get('/jobboard/alerts/journal', { params: { page, size } }).then((r) => unwrap<AlertJournalPage>(r));
export const fetchAlertSettings = () => apiClient.get('/jobboard/alerts/settings').then((r) => unwrap<AlertSettings>(r));
export const attachOfferProgram = (offerId: string, programId: string) =>
    apiClient.post(`/jobboard/offers/${offerId}/programs/${programId}`).then((r) => unwrap<JobOffer>(r));
export const detachOfferProgram = (offerId: string, programId: string) =>
    apiClient.delete(`/jobboard/offers/${offerId}/programs/${programId}`).then((r) => unwrap<JobOffer>(r));
export const fetchOffersMap = (f: OfferMapFilters) =>
    apiClient.get('/dashboard/offers/map', { params: mapParams(f) }).then((r) => unwrap<OfferMapSummary>(r));
export const fetchOffersMapDepartment = (department: string, f: OfferMapFilters) =>
    apiClient.get(`/dashboard/offers/map/departments/${encodeURIComponent(department)}`, { params: mapParams(f) })
        .then((r) => unwrap<MapCompany[]>(r));
