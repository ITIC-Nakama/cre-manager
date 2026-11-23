import { useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, Loader2, Lock, RotateCcw, Search, Trash2, Unlock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useModalLayer } from '../../../hooks/useModalLayer';
import { fieldClass } from '../../../components/basics/fieldStyles';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import {
    createProgram, deleteProgram, fetchAdminPrograms, fetchPromotionOverview, updateProgram,
} from '../../../api-s/requests/CompanySpaceRequest';
import type { AdminProgram, ProgramForm } from '../../../api-s/requests/CompanySpaceRequest';
import { getApiErrorMessage } from '../../../utils/errorHelper';
import DomainSelect from './DomainSelect';
import ProgramLivePreview from './ProgramLivePreview';
import { PROGRAMS_KEY, PROMOTIONS_OVERVIEW_KEY } from './queryKeys';
import {
    availabilityMonths, baseName, displayName, formatAvailability, LEVEL_LABEL, parseAvailability, proposeLabel,
    proposeSlug, rhythmOptions, similarity, SLUG_RE, yearLabel, type Availability, type Level,
} from './programFormHelpers';

type FieldKey = 'label' | 'level' | 'domain' | 'slug' | 'rhythm' | 'availability' | 'pedagogyUrl' | 'romeCodes';
type Errors = Partial<Record<FieldKey, string>>;

/**
 * Lot 12 : « Modifier la formation » / « Ajouter une formation » de la CVthèque. Peu de saisie, des choix guidés, une
 * phrase d'aide sous chaque champ, l'aperçu de la page publique à côté. Adresse de la page verrouillée après la création
 * (un admin la déverrouille après confirmation). Réglages avancés repliés et réservés aux admins (le serveur refuse aussi).
 */
export default function ProgramEditModal({ program, isAdmin, presetPromotionId, onClose }: {
    program: AdminProgram | null;
    isAdmin: boolean;
    /** Bandeau « promotions orphelines » : promotion à cocher d'office. */
    presetPromotionId?: string;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    useModalLayer();
    const queryClient = useQueryClient();
    const titleId = useId();
    const { data: allPrograms } = useQuery({ queryKey: PROGRAMS_KEY, queryFn: fetchAdminPrograms, staleTime: 5 * 60_000 });
    const { data: promotions } = useQuery({ queryKey: PROMOTIONS_OVERVIEW_KEY, queryFn: fetchPromotionOverview, staleTime: 60_000 });
    const creating = program === null;

    const initialLevel = (program?.level ?? 'BTS') as Level;
    const initialYear = program?.studyYear ?? 0;
    const initialBase = baseName(program?.label ?? '');
    const [form, setForm] = useState({
        level: initialLevel,
        domain: program?.domain ?? '',
        base: initialBase,
        label: program?.label ?? '',
        studyYear: initialYear,
        slug: program?.slug ?? '',
        rhythm: program?.rhythm ?? '',
        availability: parseAvailability(program?.availability),
        visible: program?.visible ?? true,
        // Formation en rattachement automatique (aucune promotion cochée à la main) : les promotions trouvées
        // automatiquement partent cochées, pour qu'en cocher une de plus ne fasse pas disparaître les autres.
        promotionIds: Array.from(new Set([
            ...((program && program.manualPromotions.length === 0 ? program.linkedPromotions : program?.manualPromotions ?? []).map((p) => p.id)),
            ...(presetPromotionId ? [presetPromotionId] : []),
        ])),
        slugConfirmed: program?.slugConfirmed ?? true,
        matchKeywords: program?.matchKeywords ?? '',
        romeCodes: program?.romeCodes ?? '',
        offerKeywords: program?.offerKeywords ?? '',
        pedagogyUrl: program?.pedagogyUrl ?? '',
    });
    // Nom : suit la proposition tant que personne ne l'a modifié à la main (toujours le cas à la création).
    const [labelTouched, setLabelTouched] = useState(!creating);
    // Adresse : modifiable à la création ; ensuite verrouillée, sauf déverrouillage confirmé par un admin.
    const [slugUnlocked, setSlugUnlocked] = useState(creating);
    const [slugTouched, setSlugTouched] = useState(false);
    const [confirmUnlock, setConfirmUnlock] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [serverErrors, setServerErrors] = useState<Errors>({});
    // La liste des promotions n'est envoyée que si elle a été modifiée (sinon le rattachement reste tel quel).
    const [promotionsDirty, setPromotionsDirty] = useState(!!presetPromotionId);
    const autoMode = !!program && program.manualPromotions.length === 0;
    const autoIds = useMemo(() => new Set(autoMode ? program!.linkedPromotions.map((p) => p.id) : []), [autoMode, program]);
    // Erreurs affichées seulement après une saisie dans le champ ou un essai d'enregistrement.
    const [touched, setTouched] = useState<Set<FieldKey>>(new Set());
    const [submitted, setSubmitted] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const slugRef = useRef<HTMLInputElement>(null);
    const touch = (key: FieldKey) => setTouched((s) => (s.has(key) ? s : new Set(s).add(key)));

    const proposed = proposeLabel(form.base, form.level, form.studyYear);
    const takenSlugs = useMemo(() => (allPrograms ?? []).filter((p) => p.id !== program?.id).map((p) => p.slug), [allPrograms, program?.id]);

    const update = (patch: Partial<typeof form>) => { setServerErrors({}); setForm((f) => {
        const next = { ...f, ...patch };
        const nextProposal = proposeLabel(next.base, next.level, next.studyYear);
        if (!labelTouched) next.label = nextProposal;
        if (creating && !slugTouched) next.slug = proposeSlug(next.level, next.base, next.studyYear, takenSlugs);
        return next;
    }); };
    const change = (patch: Partial<typeof form>) => { setServerErrors({}); setForm((f) => ({ ...f, ...patch })); };

    // ─── Validation (avant envoi : aucune sauvegarde tant qu'une erreur reste à l'écran) ────────────────────
    const errors: Errors = useMemo(() => {
        const e: Errors = {};
        if (!form.label.trim()) e.label = t('company_admin.form.err_label', 'Indiquez le nom de la formation.');
        if (!form.domain.trim()) e.domain = t('company_admin.form.err_domain', 'Choisissez un domaine.');
        if (!form.slug.trim()) e.slug = t('company_admin.form.err_slug_required', 'Indiquez l’adresse de la page.');
        else if (!SLUG_RE.test(form.slug)) e.slug = t('company_admin.form.err_slug_format', 'Seulement des minuscules sans accent, des chiffres et des tirets (ex. bts-sio-1a).');
        else {
            const other = (allPrograms ?? []).find((p) => p.slug === form.slug && p.id !== program?.id);
            if (other) e.slug = t('company_admin.form.err_slug_taken', { program: other.displayName, defaultValue: 'Cette adresse est déjà utilisée par la formation « {{program}} ».' });
        }
        if (form.availability.kind === 'other' && form.availability.text.length > 120) e.availability = t('company_admin.form.err_too_long', '120 caractères au maximum.');
        if (form.rhythm.length > 120) e.rhythm = t('company_admin.form.err_too_long', '120 caractères au maximum.');
        if (isAdmin && form.pedagogyUrl.trim() && !/^https:\/\/\S+$/.test(form.pedagogyUrl.trim())) {
            e.pedagogyUrl = t('company_admin.form.err_url', 'Lien en https://, sans espace.');
        }
        if (isAdmin && form.romeCodes.trim() && !/^[A-Za-z]\d{4}(\s*,\s*[A-Za-z]\d{4})*$/.test(form.romeCodes.trim())) {
            e.romeCodes = t('company_admin.form.err_rome', 'Codes ROME séparés par des virgules (ex. M1805, M1810).');
        }
        return { ...e, ...serverErrors };
    }, [form, allPrograms, program?.id, isAdmin, serverErrors, t]);
    const hasErrors = Object.keys(errors).length > 0;
    const shown = (key: FieldKey) => (submitted || touched.has(key) || key in serverErrors ? errors[key] : undefined);
    const advancedError = !!(errors.romeCodes || errors.pedagogyUrl);
    // Une erreur dans les réglages avancés garde la section ouverte : jamais d'erreur cachée qui bloque l'enregistrement.
    const advancedShown = advancedOpen || (advancedError && (submitted || touched.has('romeCodes') || touched.has('pedagogyUrl')));

    const save = useMutation({
        mutationFn: () => {
            const body: ProgramForm = {
                level: form.level, domain: form.domain.trim(), label: form.label.trim(), studyYear: form.studyYear,
                rhythm: form.rhythm.trim(), availability: formatAvailability(form.availability), visible: form.visible,
            };
            if (promotionsDirty) body.promotionIds = form.promotionIds;
            if (isAdmin) body.slugConfirmed = form.slugConfirmed;
            if (creating || form.slug !== program.slug) {
                body.slug = form.slug;
                if (!creating) body.confirmSlugChange = true;
            }
            if (isAdmin) {
                Object.assign(body, {
                    matchKeywords: form.matchKeywords, romeCodes: form.romeCodes, offerKeywords: form.offerKeywords,
                    pedagogyUrl: form.pedagogyUrl.trim(),
                });
            }
            return creating ? createProgram(body) : updateProgram(program.id, body);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-space'] });
            toast.success(t('company_admin.saved', 'Enregistré.'));
            onClose();
        },
        onError: (err) => {
            // Erreur rattachée à un champ (adresse prise, champ obligatoire…) : affichée sous ce champ.
            const data = (err as { response?: { data?: { data?: unknown } } })?.response?.data?.data;
            const message = getApiErrorMessage(err, t('company_admin.save_error', 'La modification n’a pas pu être enregistrée.'));
            const field = Array.isArray(data) ? (data[0] as { field?: string })?.field : (data as { field?: string } | undefined)?.field;
            if (field && ['label', 'level', 'domain', 'slug', 'rhythm', 'availability', 'pedagogyUrl', 'romeCodes'].includes(field)) {
                const text = Array.isArray(data) ? (data[0] as { message?: string }).message ?? message : message;
                setServerErrors({ [field as FieldKey]: text });
            }
            toast.error(message);
        },
    });
    const remove = useMutation({
        mutationFn: () => deleteProgram(program!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-space'] });
            onClose();
        },
    });

        const title = creating
        ? t('company_admin.form.title_add', 'Ajouter une formation')
        : t('company_admin.form.title_edit', { name: program.displayName, defaultValue: 'Modifier la formation : {{name}}' });

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="bg-white dark:bg-slate-900 w-full sm:max-w-6xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] flex flex-col">
                <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
                    <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
                    <button type="button" onClick={onClose} aria-label={t('company_admin.close', 'Fermer')}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-5 w-5" /></button>
                </div>

                <div className="overflow-y-auto grid lg:grid-cols-[minmax(0,1fr)_400px]">
                    <div className="p-5 space-y-6" data-testid="program-form">
                        {/* 1. La formation */}
                        <Section title={t('company_admin.form.section_program', 'La formation')}>
                            <Field label={t('company_admin.form.level', 'Niveau')} required>
                                <select className={fieldClass(false, false)} value={form.level} disabled={!creating && !isAdmin}
                                    aria-label={t('company_admin.form.level', 'Niveau')}
                                    onChange={(e) => update({ level: e.target.value as Level })}>
                                    <option value="BTS">BTS</option><option value="BACHELOR">Bachelor</option><option value="MASTERE">Mastère</option>
                                </select>
                            </Field>
                            <Field label={t('company_admin.form.domain', 'Domaine')} required error={shown('domain')}
                                help={t('company_admin.form.domain_help', 'Sert à regrouper les formations dans la CVthèque.')}>
                                <DomainSelect value={form.domain} domains={(allPrograms ?? []).map((p) => p.domain)}
                                    onChange={(v) => { touch('domain'); update({ domain: v }); }} />
                            </Field>
                            <Field label={t('company_admin.form.base', 'Intitulé court de la formation')}
                                help={t('company_admin.form.base_help', 'Ex. « SIO », « Cybersécurité » : sert seulement à proposer le nom ci-dessous (n’est pas enregistré).')}>
                                <input className={fieldClass(false, false)} value={form.base} maxLength={60}
                                    aria-label={t('company_admin.form.base', 'Intitulé court de la formation')}
                                    onChange={(e) => update({ base: e.target.value })} />
                            </Field>
                            <Field label={t('company_admin.form.year', 'Année d’étude')}
                                help={t('company_admin.form.year_help', 'Laisser « Toutes » si la page regroupe plusieurs années.')}>
                                <select className={fieldClass(false, false)} value={form.studyYear} aria-label={t('company_admin.form.year', 'Année d’étude')}
                                    onChange={(e) => update({ studyYear: Number(e.target.value) })}>
                                    <option value={0}>{t('company_admin.form.all_years', 'Toutes')}</option>
                                    {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{yearLabel(form.level, y)}</option>)}
                                </select>
                            </Field>
                            <Field wide label={t('company_admin.form.label', 'Nom de la formation affiché aux entreprises')} required error={shown('label')}
                                help={t('company_admin.form.label_help', 'Ce que l’entreprise lit en titre de la page.')}>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">{LEVEL_LABEL[form.level]}</span>
                                        <input className={`${fieldClass(!!shown('label'), false)} !pl-[4.75rem]`} value={form.label} maxLength={80}
                                            aria-label={t('company_admin.form.label', 'Nom de la formation affiché aux entreprises')}
                                            onChange={(e) => { setLabelTouched(true); touch('label'); change({ label: e.target.value }); }} />
                                    </div>
                                    {proposed && form.label.trim() !== proposed && (
                                        <button type="button" onClick={() => { setLabelTouched(false); setForm((f) => ({ ...f, label: proposed })); }}
                                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap">
                                            <RotateCcw className="h-4 w-4" /> {creating ? t('company_admin.form.use_proposed', 'Revenir au nom proposé') : t('company_admin.form.use_proposed_edit', 'Utiliser le nom proposé')}
                                        </button>
                                    )}
                                </div>
                                {proposed && form.label.trim() !== proposed && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400" data-testid="proposed-name">
                                        {t('company_admin.form.proposed', { name: displayName(form.level, proposed), defaultValue: 'Nom proposé : {{name}}' })}
                                    </p>
                                )}
                            </Field>
                        </Section>

                        {/* 2. La page publique */}
                        <Section title={t('company_admin.form.section_page', 'La page dans la CVthèque')}>
                            <Field wide label={t('company_admin.form.slug', 'Adresse de la page publique')} required error={shown('slug')}
                                help={creating
                                    ? t('company_admin.form.slug_help_create', 'Proposée automatiquement. Après l’enregistrement, elle sera verrouillée : les liens envoyés aux entreprises en dépendent.')
                                    : t('company_admin.form.slug_help', 'Lien de la page dans la CVthèque. Ne pas modifier : les liens déjà envoyés ne marcheraient plus.')}>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono hidden sm:inline">…/entreprise/candidats/</span>
                                        <input className={`${fieldClass(!!shown('slug'), false)} font-mono sm:!pl-[11.5rem] ${slugUnlocked ? '' : 'opacity-80 cursor-not-allowed'}`}
                                            value={form.slug} maxLength={60} readOnly={!slugUnlocked} aria-readonly={!slugUnlocked}
                                            aria-label={t('company_admin.form.slug', 'Adresse de la page publique')} data-testid="slug-input"
                                            onChange={(e) => { setSlugTouched(true); touch('slug'); change({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }); }} ref={slugRef} />
                                        {!slugUnlocked && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />}
                                    </div>
                                    {!slugUnlocked && isAdmin && (
                                        <button type="button" onClick={() => setConfirmUnlock(true)}
                                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 text-sm font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer whitespace-nowrap">
                                            <Unlock className="h-4 w-4" /> {t('company_admin.form.unlock', 'Déverrouiller')}
                                        </button>
                                    )}
                                </div>
                                {!slugUnlocked && !isAdmin && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                                        <Lock className="h-3 w-3" aria-hidden="true" /> {t('company_admin.form.slug_locked_advisor', 'Verrouillée : seul un administrateur peut la changer.')}
                                    </p>
                                )}
                            </Field>
                            {isAdmin && (
                                <div className="sm:col-span-2 space-y-1">
                                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input type="checkbox" className="accent-[#3f74ff] h-4 w-4" checked={form.slugConfirmed} onChange={(e) => change({ slugConfirmed: e.target.checked })} />
                                        {t('company_admin.form.slug_confirmed', 'Lien court vérifié')}
                                    </label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">
                                        {t('company_admin.form.slug_confirmed_help', 'Cochez quand le lien court (itic.short.gy/…) qui mène à cette page a été vérifié.')}
                                    </p>
                                </div>
                            )}
                            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input type="checkbox" className="accent-[#3f74ff] h-4 w-4" checked={form.visible} onChange={(e) => change({ visible: e.target.checked })} />
                                {t('company_admin.form.visible', 'Afficher cette formation dans la CVthèque')}
                            </label>
                        </Section>

                        {/* 3. Sur les cartes des étudiants */}
                        <Section title={t('company_admin.form.section_cards', 'Sur les cartes des étudiants')}>
                            <Field label={t('company_admin.form.rhythm', 'Rythme de l’alternance')} error={shown('rhythm')}
                                help={t('company_admin.form.cards_help', 'Affiché sur chaque carte d’étudiant.')}>
                                <RhythmPicker value={form.rhythm} existing={(allPrograms ?? []).map((p) => p.rhythm)}
                                    onChange={(v) => { touch('rhythm'); change({ rhythm: v }); }} />
                            </Field>
                            <Field label={t('company_admin.form.availability', 'Disponible à partir de')} error={shown('availability')}
                                help={t('company_admin.form.cards_help', 'Affiché sur chaque carte d’étudiant.')}>
                                <AvailabilityPicker value={form.availability} onChange={(v) => { touch('availability'); change({ availability: v }); }} />
                            </Field>
                        </Section>

                        {/* 4. Promotions */}
                        <Section title={t('company_admin.form.promotions', 'Promotions affichées dans cette formation')}>
                            <div className="sm:col-span-2">
                                <PromotionPicker
                                    selected={form.promotionIds}
                                    promotions={promotions ?? []}
                                    programs={allPrograms ?? []}
                                    currentProgramId={program?.id}
                                    level={form.level}
                                    name={form.base || form.label}
                                    autoIds={autoIds}
                                    onChange={(ids) => { setPromotionsDirty(true); change({ promotionIds: ids }); }}
                                />
                            </div>
                        </Section>

                        {/* 5. Réglages avancés : admins seulement, repliés */}
                        {isAdmin && (
                            <details className="group rounded-2xl border border-slate-200 dark:border-slate-800" data-testid="advanced-settings"
                                open={advancedShown} onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}>
                                <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none text-sm font-bold text-slate-900 dark:text-white">
                                    {t('company_admin.form.advanced', 'Réglages avancés (admin)')}
                                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                                </summary>
                                <div className="px-4 pb-4 space-y-4">
                                    <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl px-3 py-2">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                                        {t('company_admin.form.advanced_warning', 'Ces réglages font fonctionner les alertes et la recherche d’offres. À modifier seulement si vous savez ce que vous faites.')}
                                    </p>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field label={t('company_admin.form.keywords', 'Rattachement automatique (si aucune promotion n’est choisie)')}
                                            help={t('company_admin.form.keywords_help', 'Variantes séparées par « | » ; une promotion est rattachée si son nom contient tous les mots d’une variante (ex. bts sio|bts informatique).')}>
                                            <input className={fieldClass(false, false)} value={form.matchKeywords} maxLength={255} placeholder="bts sio|bts informatique"
                                                aria-label={t('company_admin.form.keywords', 'Rattachement automatique (si aucune promotion n’est choisie)')}
                                                onChange={(e) => change({ matchKeywords: e.target.value })} />
                                        </Field>
                                        <Field label={t('company_admin.form.rome', 'Métiers visés (codes ROME)')} error={shown('romeCodes')}
                                            help={t('company_admin.form.rome_help', 'Sert à aller chercher les offres d’alternance correspondantes. Codes séparés par des virgules, ex. M1805, M1810 (fiches métiers de France Travail).')}>
                                            <input className={`${fieldClass(!!shown('romeCodes'), false)} font-mono`} value={form.romeCodes} maxLength={255} placeholder="M1805, M1810"
                                                aria-label={t('company_admin.form.rome', 'Métiers visés (codes ROME)')}
                                                onChange={(e) => { touch('romeCodes'); change({ romeCodes: e.target.value }); }} />
                                        </Field>
                                        <Field wide label={t('company_admin.form.offer_keywords', 'Mots-clés pour trier les offres')}
                                            help={t('company_admin.form.offer_keywords_help', 'Mots séparés par « | », cherchés dans le titre, le secteur et la description des offres. Sert aux suggestions et au récapitulatif du lundi.')}>
                                            <textarea className={`${fieldClass(false, false)} min-h-20 font-mono text-xs`} value={form.offerKeywords} maxLength={1000}
                                                aria-label={t('company_admin.form.offer_keywords', 'Mots-clés pour trier les offres')}
                                                placeholder="developpeur|web|java" onChange={(e) => change({ offerKeywords: e.target.value })} />
                                        </Field>
                                        <Field wide label={t('company_admin.form.pedagogy_url', 'Lien vers la fiche de la formation')} error={shown('pedagogyUrl')}
                                            help={t('company_admin.form.pedagogy_url_help', 'Bouton « Ma fiche formation » des étudiants.')}>
                                            <input className={fieldClass(!!shown('pedagogyUrl'), false)} value={form.pedagogyUrl} maxLength={500} type="url"
                                                aria-label={t('company_admin.form.pedagogy_url', 'Lien vers la fiche de la formation')}
                                                placeholder="https://…" onChange={(e) => { touch('pedagogyUrl'); change({ pedagogyUrl: e.target.value }); }} />
                                        </Field>
                                    </div>
                                </div>
                            </details>
                        )}
                    </div>

                    {/* Aperçu en direct : à côté sur grand écran, en dessous sur téléphone */}
                    <aside className="border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 p-5 bg-slate-50/60 dark:bg-[#0d0f16] lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(94vh-9rem)] lg:overflow-y-auto">
                        <ProgramLivePreview level={form.level} domain={form.domain} label={form.label}
                            rhythm={form.rhythm} availability={formatAvailability(form.availability)} />
                    </aside>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-t border-slate-100 dark:border-slate-800">
                    {!creating && isAdmin ? (
                        <button type="button" onClick={() => setConfirmDelete(true)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 cursor-pointer">
                            <Trash2 className="h-4 w-4" /> {t('company_admin.form.delete', 'Retirer')}
                        </button>
                    ) : <span />}
                    <div className="flex items-center gap-3">
                        {hasErrors && (
                            <p role="status" className={`text-sm ${submitted || touched.size > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`} data-testid="form-has-errors">
                                {submitted || touched.size > 0
                                    ? t('company_admin.form.fix_errors', 'Corrigez les champs signalés pour enregistrer.')
                                    : t('company_admin.form.fill_required', 'Remplissez les champs marqués * pour enregistrer.')}
                            </p>
                        )}
                        <button type="button" onClick={() => { setSubmitted(true); if (!hasErrors) save.mutate(); }} disabled={save.isPending || (hasErrors && submitted)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3f74ff] text-white text-sm font-semibold hover:bg-[#2f63ee] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t('company_admin.form.save', 'Enregistrer')}
                        </button>
                    </div>
                </div>
            </div>
            <ConfirmDialog isOpen={confirmUnlock} title={t('company_admin.form.unlock_title', 'Changer l’adresse de la page ?')}
                message={t('company_admin.form.unlock_message', 'Les liens déjà envoyés aux entreprises (e-mails, plaquettes, anciens liens courts) ne marcheront plus. Ne la changez que si c’est vraiment nécessaire.')}
                confirmLabel={t('company_admin.form.unlock_confirm', 'Je comprends, déverrouiller')}
                onConfirm={() => { setSlugUnlocked(true); setSlugTouched(true); setConfirmUnlock(false); setTimeout(() => slugRef.current?.focus(), 0); }} onClose={() => setConfirmUnlock(false)} />
            <ConfirmDialog isOpen={confirmDelete} title={t('company_admin.form.delete_title', 'Retirer cette formation ?')}
                message={t('company_admin.form.delete_message', 'Sa page publique ne sera plus accessible. Les CV restent dans le CRE.')}
                confirmLabel={t('company_admin.form.delete', 'Retirer')} loading={remove.isPending}
                onConfirm={() => remove.mutate()} onClose={() => setConfirmDelete(false)} />
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
            <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </section>
    );
}

function Field({ label, help, error, required, wide, children }: {
    label: string; help?: string; error?: string; required?: boolean; wide?: boolean; children: React.ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <div className={`space-y-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {label}
                {required && <span className="text-red-500" aria-label={t('company_admin.form.required', 'obligatoire')}> *</span>}
            </p>
            {children}
            {error && <p className="text-xs font-semibold text-red-600 dark:text-red-400" role="alert">{error}</p>}
            {help && <p className="text-xs text-slate-500 dark:text-slate-400">{help}</p>}
        </div>
    );
}

const OTHER = '__other__';

function RhythmPicker({ value, existing, onChange }: { value: string; existing: (string | null)[]; onChange: (v: string) => void }) {
    const { t } = useTranslation();
    const options = useMemo(() => rhythmOptions(existing), [existing]);
    const [other, setOther] = useState(() => value.trim() !== '' && !options.includes(value.trim()));
    const selectValue = other ? OTHER : options.includes(value) ? value : '';
    return (
        <div className="space-y-2">
            <select className={fieldClass(false, false)} value={selectValue} aria-label={t('company_admin.form.rhythm', 'Rythme de l’alternance')}
                onChange={(e) => {
                    if (e.target.value === OTHER) { setOther(true); onChange(''); } else { setOther(false); onChange(e.target.value); }
                }}>
                <option value="">{t('company_admin.form.rhythm_none', 'Non précisé')}</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
                <option value={OTHER}>{t('company_admin.form.other', 'Autre…')}</option>
            </select>
            {other && (
                <input className={fieldClass(false, false)} value={value} maxLength={120} autoFocus
                    aria-label={t('company_admin.form.rhythm_other', 'Autre rythme')} placeholder={t('company_admin.form.rhythm_other', 'Autre rythme')}
                    onChange={(e) => onChange(e.target.value)} />
            )}
        </div>
    );
}

function AvailabilityPicker({ value, onChange }: { value: Availability; onChange: (v: Availability) => void }) {
    const { t } = useTranslation();
    const months = useMemo(() => {
        const list = availabilityMonths();
        // Une date déjà enregistrée hors de la liste (passée ou lointaine) reste proposée.
        if (value.kind === 'month' && !list.some((m) => m.month === value.month && m.year === value.year)) {
            const label = formatAvailability(value).replace(/^Dès /, '');
            list.unshift({ month: value.month, year: value.year, label: label[0].toUpperCase() + label.slice(1) });
        }
        return list;
    }, [value]);
    const selectValue = value.kind === 'none' ? '' : value.kind === 'now' ? 'now' : value.kind === 'other' ? OTHER : `${value.year}-${value.month}`;
    return (
        <div className="space-y-2">
            <select className={fieldClass(false, false)} value={selectValue} aria-label={t('company_admin.form.availability', 'Disponible à partir de')}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') onChange({ kind: 'none' });
                    else if (v === 'now') onChange({ kind: 'now' });
                    else if (v === OTHER) onChange({ kind: 'other', text: value.kind === 'other' ? value.text : '' });
                    else { const [y, m] = v.split('-').map(Number); onChange({ kind: 'month', month: m, year: y }); }
                }}>
                <option value="">{t('company_admin.form.rhythm_none', 'Non précisé')}</option>
                <option value="now">{t('company_admin.form.now', 'Immédiatement')}</option>
                {months.map((m) => <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{m.label}</option>)}
                <option value={OTHER}>{t('company_admin.form.other', 'Autre…')}</option>
            </select>
            {value.kind === 'other' && (
                <input className={fieldClass(false, false)} value={value.text} maxLength={120} autoFocus
                    aria-label={t('company_admin.form.availability_other', 'Autre disponibilité')}
                    onChange={(e) => onChange({ kind: 'other', text: e.target.value })} />
            )}
            {value.kind !== 'none' && value.kind !== 'other' && (
                <p className="text-xs text-slate-500 dark:text-slate-400" data-testid="availability-text">
                    {t('company_admin.form.shown_as', { text: formatAvailability(value), defaultValue: 'Affiché : « {{text}} »' })}
                </p>
            )}
        </div>
    );
}

function PromotionPicker({ selected, promotions, programs, currentProgramId, level, name, autoIds, onChange }: {
    selected: string[];
    promotions: { id: string; name: string; activeStudents: number; programIds: string[] }[];
    programs: AdminProgram[];
    currentProgramId?: string;
    level: Level;
    name: string;
    autoIds: Set<string>;
    onChange: (ids: string[]) => void;
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    // Tri selon la sélection à l'ouverture : une ligne cochée ne saute pas sous le curseur.
    const [initial] = useState(() => new Set(selected));
    const programName = useMemo(() => new Map(programs.map((p) => [p.id, p.displayName])), [programs]);
    const sorted = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return promotions
            .filter((p) => !needle || p.name.toLowerCase().includes(needle))
            .map((p) => ({ ...p, score: similarity(p.name, level, name), on: selected.includes(p.id), first: initial.has(p.id) }))
            // Cochées à l'ouverture d'abord, puis celles dont le nom ressemble à la formation, puis l'ordre alphabétique.
            .sort((a, b) => Number(b.first) - Number(a.first) || b.score - a.score || a.name.localeCompare(b.name, 'fr'));
    }, [promotions, search, selected, level, name, initial]);
    const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

    return (
        <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('company_admin.form.promotions_help', 'Les étudiants de ces promotions apparaissent sur la page.')}
                {selected.length === 0 && ` ${t('company_admin.form.promotions_auto', 'Aucune promotion cochée : la page affiche les promotions trouvées automatiquement d’après leur nom.')}`}
            </p>
            {autoIds.size > 0 && (
                <p className="flex items-start gap-2 text-xs text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 rounded-lg px-3 py-2" data-testid="auto-mode-note">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                    {t('company_admin.form.auto_mode_note', 'Ces promotions sont trouvées automatiquement d’après leur nom. Si vous cochez ou décochez une promotion, la liste sera figée : les nouvelles promotions ne seront plus ajoutées d’elles-mêmes.')}
                </p>
            )}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input type="search" className={`${fieldClass(false, false)} !pl-9 !py-2`} value={search}
                    placeholder={t('company_admin.form.promotions_search', 'Rechercher une promotion…')}
                    aria-label={t('company_admin.form.promotions_search', 'Rechercher une promotion…')}
                    onChange={(e) => setSearch(e.target.value)} />
            </div>
            <ul className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800" data-testid="promotion-list">
                {sorted.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">{t('company_admin.form.promotions_none', 'Aucune promotion trouvée.')}</li>}
                {sorted.map((p) => {
                    const elsewhere = p.programIds.filter((id) => id !== currentProgramId).map((id) => programName.get(id)).filter(Boolean) as string[];
                    return (
                        <li key={p.id}>
                            <label className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <input type="checkbox" className="accent-[#3f74ff] h-4 w-4 mt-0.5" checked={p.on} onChange={() => toggle(p.id)} />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                                        {t('company_admin.form.students_count', { count: p.activeStudents, defaultValue: '{{count}} étudiant(s)' })}
                                    </span>
                                    {autoIds.has(p.id) && (
                                        <span className="mr-2 inline-flex text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                                            {t('company_admin.form.auto_found', 'trouvée automatiquement')}
                                        </span>
                                    )}
                                    {elsewhere.length > 0 && (
                                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300" data-testid="already-linked">
                                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                            {t('company_admin.form.already_in', { names: elsewhere.join(', '), defaultValue: 'Déjà dans : {{names}}' })}
                                        </span>
                                    )}
                                </span>
                            </label>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
