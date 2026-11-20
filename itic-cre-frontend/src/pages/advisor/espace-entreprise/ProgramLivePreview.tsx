import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProgramView from '../../../components/company/ProgramView';
import { fetchCompanySpaceSettings, type CompanyProgramPage } from '../../../api-s/requests/CompanySpaceRequest';
import { SETTINGS_KEY } from './queryKeys';
import { displayName, type Level } from './programFormHelpers';

/** Deux étudiants fictifs : l'aperçu ne montre jamais de vraies données. */
const FAKE_STUDENTS = [
    { id: 'apercu-1', firstName: 'Camille', lastName: 'EXEMPLE' },
    { id: 'apercu-2', firstName: 'Yanis', lastName: 'MODÈLE' },
];

/**
 * Lot 12 : aperçu en direct de l'en-tête de la page publique et des cartes, tels que l'entreprise les verra, mis à jour
 * pendant la saisie. Mêmes textes que la vraie page (réglages de l'espace), boutons désactivés.
 */
export default function ProgramLivePreview({ level, domain, label, rhythm, availability }: {
    level: Level; domain: string; label: string; rhythm: string; availability: string;
}) {
    const { t } = useTranslation();
    const { data: settings } = useQuery({ queryKey: SETTINGS_KEY, queryFn: fetchCompanySpaceSettings, staleTime: 5 * 60_000 });
    const name = displayName(level, label || t('company_admin.preview.no_name', 'Nom de la formation'));
    const page: CompanyProgramPage = {
        texts: {
            homeTitle: settings?.homeTitle ?? '', homeIntro: null, contactTitle: settings?.contactTitle ?? '', contactText: null,
            address: null, phone: null, warningText: settings?.warningText ?? null,
        },
        slug: 'apercu', level, domain: domain || t('company_admin.preview.no_domain', 'Domaine'), label, displayName: name,
        intro: (settings?.promotionIntro ?? 'Vous pouvez retrouver ici l’ensemble des CV de nos étudiants en {formation}.').replace('{formation}', name),
        candidates: FAKE_STUDENTS.map((s) => ({
            ...s, formation: name, promotion: t('company_admin.preview.promotion', 'Promotion 2025-2027'),
            rhythm: rhythm.trim() || null, availability: availability.trim() || null, cvToken: '',
        })),
        linksExpireAt: new Date().toISOString(),
    };
    return (
        <div className="space-y-3" data-testid="live-preview">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Eye className="h-4 w-4" aria-hidden="true" /> {t('company_admin.preview.title', 'Aperçu : ce que voit l’entreprise')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('company_admin.preview.fake', 'Étudiants fictifs, pour l’exemple.')}</p>
            {/* Mise en page du vrai composant, resserrée : une carte par ligne dans la colonne d'aperçu. */}
            <div className="select-none [&_ul]:!grid-cols-1 [&_h1]:!text-xl" inert>
                <ProgramView page={page} preview />
            </div>
        </div>
    );
}
