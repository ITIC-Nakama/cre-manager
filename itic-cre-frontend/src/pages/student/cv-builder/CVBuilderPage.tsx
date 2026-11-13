import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertCircle, Award, Briefcase, FolderGit2, GraduationCap, Heart, Languages, Quote, RefreshCw, User, Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CV_DRAFT_KEY, useDownloadMyCvPdf, useMyCvDraft, useMyCvScore, useResetMyCvDraft, useSaveMyCvDraft, useSubmitMyCv,
} from '../../../hooks/useCVBuilder';
import { useMyCV, useMyComments } from '../../../hooks/useCV';
import { previewMyCv } from '../../../api-s/requests/CVBuilderRequest';
import { getApiErrorMessage } from '../../../utils/errorHelper';
import {
  CV_SECTIONS, CV_TEMPLATE_SECTIONS, type CvBuilderFormValues, type CvDraftPayload, type CvDraftResponse, type CvFormSectionKey, type CvSectionKey,
} from '../../../types/models/CVBuilder';
import BuilderToolbar, { type SaveStatus } from './components/BuilderToolbar';
import TemplatePicker from './components/TemplatePicker';
import { PreSendChecklist, SubmittedCard, WelcomeCard } from './components/GuidanceCards';
import { preSendChecks, SECTION_TIPS } from './components/guidance';
import { useUserStore } from '../../../store/UserStore';
import SectionCard from './components/SectionCard';
import CVPreview from './components/CVPreview';
import CompletenessPanel from './components/CompletenessPanel';
import CVComments from '../cv/components/CVComments';
import CVReplaceModal from '../cv/components/CVReplaceModal';
import IdentiteSection from './components/sections/IdentiteSection';
import AccrocheSection from './components/sections/AccrocheSection';
import ExperiencesSection from './components/sections/ExperiencesSection';
import FormationsSection from './components/sections/FormationsSection';
import ProjetsSection from './components/sections/ProjetsSection';
import CompetencesSection from './components/sections/CompetencesSection';
import LanguesSection from './components/sections/LanguesSection';
import CertificationsSection from './components/sections/CertificationsSection';
import CentresInteretSection from './components/sections/CentresInteretSection';

const AUTOSAVE_DELAY_MS = 1500;
const PREVIEW_DELAY_MS = 600;

interface SectionDef { title: string; help: string; icon: LucideIcon; Component: ComponentType }

const SECTION_DEFS: Record<CvFormSectionKey, SectionDef> = {
  identite: { title: 'Identité et contact', help: 'Repris de ton compte : vérifie et complète.', icon: User, Component: IdentiteSection },
  accroche: { title: 'Accroche', help: 'Le court paragraphe en tête de CV, lu en premier par le recruteur.', icon: Quote, Component: AccrocheSection },
  experiences: { title: 'Expériences', help: 'Du plus récent au plus ancien : alternance, stages, jobs, bénévolat.', icon: Briefcase, Component: ExperiencesSection },
  formations: { title: 'Formation', help: 'Ta formation ITIC en premier, puis les diplômes précédents.', icon: GraduationCap, Component: FormationsSection },
  projets: { title: 'Projets', help: 'Projets d’école ou personnels qui montrent ce que tu sais faire.', icon: FolderGit2, Component: ProjetsSection },
  competences: { title: 'Compétences', help: 'Des mots-clés précis : ce sont eux que les recruteurs recherchent.', icon: Wrench, Component: CompetencesSection },
  langues: { title: 'Langues', help: 'Indique toujours un niveau.', icon: Languages, Component: LanguesSection },
  certifications: { title: 'Certifications', help: 'TOEIC, Voltaire, PIX, certifications techniques…', icon: Award, Component: CertificationsSection },
  centresInteret: { title: 'Centres d’intérêt', help: 'Facultatif, mais utile pour engager la conversation en entretien.', icon: Heart, Component: CentresInteretSection },
};

/**
 * Garantit des listes présentes même si un ancien brouillon n'a pas tous les champs. Tant que l'étudiant n'a pas
 * réordonné ses sections, le formulaire suit l'ordre du modèle choisi (comme le PDF).
 */
function toFormValues(draft: CvDraftResponse): CvBuilderFormValues {
  const custom = draft.data.ordrePersonnalise === true;
  const templateOrder = CV_TEMPLATE_SECTIONS[draft.templateCode] ?? CV_SECTIONS;
  const order = custom && draft.data.ordreSections?.length ? draft.data.ordreSections : templateOrder;
  return {
    data: {
      ...draft.data, ordreSections: order, ordrePersonnalise: custom, sectionsMasquees: draft.data.sectionsMasquees ?? [],
    },
    templateCode: draft.templateCode,
    accentColor: draft.accentColor,
    cvLang: draft.cvLang,
  };
}

interface BuilderProps {
  /** Appelé après un envoi réussi au conseiller (la page « Mon CV » met à jour sa frise). */
  onSubmitted?: () => void;
}

/**
 * Assistant de CV, affiché dans l'onglet « Créer avec un modèle ITIC » de « Mon CV » :
 * 1. choix du modèle, 2. formulaire à gauche et aperçu à droite.
 */
export default function CVBuilderPage({ onSubmitted }: BuilderProps) {
  const { t } = useTranslation();
  const { data: draft, isLoading, isError, refetch } = useMyCvDraft();
  const [editorKey, setEditorKey] = useState(0);

  const reload = useCallback(async () => {
    await refetch();
    setEditorKey((k) => k + 1);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-fadeIn">
        <div className="h-8 w-64 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-16 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
          <div className="h-96 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !draft) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('studentCvBuilder.error.load', 'Impossible de charger ton brouillon de CV')}
        </p>
        <button onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 text-white text-xs font-semibold cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5" />
          {t('studentCv.error.retry', 'Réessayer')}
        </button>
      </div>
    );
  }

  return (
    <CVBuilderEditor key={editorKey} initial={draft} onReload={reload}
      onResetDone={() => setEditorKey((k) => k + 1)} onSubmitted={onSubmitted} />
  );
}

function CVBuilderEditor({ initial, onReload, onResetDone, onSubmitted }: {
  initial: CvDraftResponse; onReload: () => void; onResetDone: () => void; onSubmitted?: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const methods = useForm<CvBuilderFormValues>({ defaultValues: toFormValues(initial) });
  const { control, getValues, setValue, subscribe } = methods;

  const saveMutation = useSaveMyCvDraft();
  const downloadMutation = useDownloadMyCvPdf();
  const submitMutation = useSubmitMyCv();
  const resetMutation = useResetMyCvDraft();
  const userId = useUserStore((state) => state.user?.id);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const { data: myCv } = useMyCV();
  const { data: comments = [] } = useMyComments(!!myCv);
  const { data: completeness, isFetching: scoreLoading } = useMyCvScore(true);

  // ─── Enregistrement automatique ───────────────────────────────────────
  // Refs lues par les minuteurs et la file d'enregistrement : toujours la dernière version, sans
  // recréer les callbacks (donc sans réabonner subscribe) à chaque rendu.
  const tRef = useRef(t);
  const saveRef = useRef(saveMutation.mutateAsync);
  useEffect(() => {
    tRef.current = t;
    saveRef.current = saveMutation.mutateAsync;
  });
  const initialStatus: SaveStatus = initial.saved ? 'saved' : 'idle';
  const versionRef = useRef<number | null>(initial.version);
  const dirtyRef = useRef(false);
  const statusRef = useRef<SaveStatus>(initialStatus);
  const [saveStatus, setSaveStatusState] = useState<SaveStatus>(initialStatus);
  const [savedAt, setSavedAt] = useState<Date | null>(initial.updatedAt ? new Date(initial.updatedAt) : null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  // File d'attente : jamais deux PUT en parallèle, sinon le second partirait avec une version périmée (409).
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const setSaveStatus = useCallback((status: SaveStatus) => {
    statusRef.current = status;
    setSaveStatusState(status);
  }, []);

  const currentPayload = useCallback((): CvDraftPayload => ({ ...getValues(), version: versionRef.current }), [getValues]);

  const saveNow = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    const run = async () => {
      if (!dirtyRef.current || statusRef.current === 'conflict') return;
      dirtyRef.current = false;
      setSaveStatus('saving');
      try {
        const saved = await saveRef.current(currentPayload());
        versionRef.current = saved.version;
        setSavedAt(saved.updatedAt ? new Date(saved.updatedAt) : new Date());
        setSaveError(null);
        setSaveStatus(dirtyRef.current ? 'dirty' : 'saved');
      } catch (err) {
        dirtyRef.current = true;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409) {
          setSaveStatus('conflict');
        } else if (status === 400) {
          setSaveError(getApiErrorMessage(err, tRef.current('studentCvBuilder.save.invalid', 'Une valeur n’est pas acceptée.')));
          setSaveStatus('invalid');
        } else {
          setSaveStatus('error');
        }
      }
    };
    queue.current = queue.current.then(run);
    return queue.current;
  }, [currentPayload, setSaveStatus]);

  // ─── Aperçu (anti-rebond 600 ms, requête précédente annulée) ──────────
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewTimer = useRef<number | undefined>(undefined);
  const previewAbort = useRef<AbortController | null>(null);

  const refreshPreview = useCallback(async () => {
    previewAbort.current?.abort();
    const controller = new AbortController();
    previewAbort.current = controller;
    setPreviewLoading(true);
    try {
      setPreviewHtml(await previewMyCv(currentPayload(), controller.signal));
      setPreviewError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setPreviewError(getApiErrorMessage(err, tRef.current('studentCvBuilder.preview.error', 'Aperçu indisponible pour le moment.')));
    } finally {
      if (previewAbort.current === controller) setPreviewLoading(false);
    }
  }, [currentPayload]);

  // Premier aperçu dès l'ouverture (hors du corps de l'effet : pas de setState synchrone).
  useEffect(() => {
    const first = window.setTimeout(() => void refreshPreview(), 0);
    return () => {
      window.clearTimeout(first);
      previewAbort.current?.abort();
    };
  }, [refreshPreview]);

  // subscribe (et non watch) : notifié à chaque saisie sans re-rendre toute la page.
  useEffect(() => subscribe({
    formState: { values: true },
    callback: () => {
      dirtyRef.current = true;
      if (statusRef.current !== 'conflict' && statusRef.current !== 'saving') setSaveStatus('dirty');
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
      window.clearTimeout(previewTimer.current);
      previewTimer.current = window.setTimeout(() => void refreshPreview(), PREVIEW_DELAY_MS);
    },
  }), [subscribe, saveNow, refreshPreview, setSaveStatus]);

  // Quitter la page : avertissement du navigateur (onglet fermé / rechargé) et enregistrement
  // immédiat lors d'une navigation interne (BrowserRouter : pas de useBlocker disponible).
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || statusRef.current === 'saving') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.clearTimeout(previewTimer.current);
      if (dirtyRef.current) void saveNow();
    };
  }, [saveNow]);

  // ─── Sections ─────────────────────────────────────────────────────────
  const [openSections, setOpenSections] = useState<Set<CvFormSectionKey>>(() => new Set(['identite']));
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const order = useWatch({ control, name: 'data.ordreSections' });
  const hiddenSections = useWatch({ control, name: 'data.sectionsMasquees' });

  const toggleSection = (key: CvFormSectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    void saveNow();
  };

  const openSection = (key: CvFormSectionKey) => {
    setOpenSections((prev) => new Set(prev).add(key));
    setMobileTab('form');
    window.setTimeout(() => {
      document.getElementById(`cv-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  /**
   * « Corriger » (vérification avant envoi) : ouvre la section, puis place le curseur dans le champ concerné.
   * Un passage [entre crochets] d'un exemple est sélectionné : il suffit de taper pour le remplacer.
   * Délai : la fenêtre se ferme en 180 ms et bloque le défilement de la page jusque-là.
   */
  const focusField = (section: CvFormSectionKey, field: string | null) => {
    setOpenSections((prev) => new Set(prev).add(section));
    setMobileTab('form');
    window.setTimeout(() => {
      const el = field ? document.querySelector<HTMLElement>(`[name="${CSS.escape(field)}"]`) : null;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      (el ?? document.getElementById(`cv-section-${section}`))
        ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: el ? 'center' : 'start' });
      if (!el) return;
      el.focus({ preventScroll: true });
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const placeholder = /\[[^\]]+\]/.exec(el.value);
        try {
          if (placeholder) el.setSelectionRange(placeholder.index, placeholder.index + placeholder[0].length);
          else el.setSelectionRange(el.value.length, el.value.length);
        } catch {
          // Champs e-mail ou mois : pas de sélection possible, le focus suffit.
        }
      }
    }, 260);
  };

  const moveSection = (key: CvSectionKey, direction: -1 | 1) => {
    const next = [...order];
    const from = next.indexOf(key);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]];
    setValue('data.ordreSections', next, { shouldDirty: true });
    setValue('data.ordrePersonnalise', true, { shouldDirty: true });
  };

  const toggleHidden = (key: CvSectionKey) => {
    const next = hiddenSections.includes(key) ? hiddenSections.filter((s) => s !== key) : [...hiddenSections, key];
    setValue('data.sectionsMasquees', next, { shouldDirty: true });
  };

  // ─── Actions ──────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  /** Réinitialiser : contenu prérempli, modèle et langue gardés (le CV déjà envoyé ne change pas). */
  const handleReset = async () => {
    setResetOpen(false);
    window.clearTimeout(saveTimer.current);
    await queue.current;
    try {
      // Les saisies non enregistrées sont abandonnées volontairement : ne pas les renvoyer au démontage.
      dirtyRef.current = false;
      await resetMutation.mutateAsync(versionRef.current);
      toast.success(t('studentCvBuilder.toast.reset', 'Ton CV est revenu au prérempli de ton compte. Ton modèle est gardé.'));
      onResetDone();
    } catch (err) {
      dirtyRef.current = true;
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        setSaveStatus('conflict');
        toast.error(t('studentCvBuilder.toast.conflict', 'Ton CV a été modifié dans un autre onglet : recharge-le avant de continuer.'));
        return;
      }
      toast.error(getApiErrorMessage(err, t('studentCvBuilder.toast.resetError', 'La réinitialisation a échoué, ton brouillon est intact.')));
    }
  };

  const handleDownload = async () => {
    try {
      const pdf = await downloadMutation.mutateAsync(currentPayload());
      const url = URL.createObjectURL(pdf.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdf.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('studentCvBuilder.toast.downloadError', 'Le PDF n’a pas pu être généré.')));
    }
  };

  const handleSubmit = async () => {
    setConfirmOpen(false);
    window.clearTimeout(saveTimer.current);
    await queue.current;
    try {
      const result = await submitMutation.mutateAsync(currentPayload());
      versionRef.current = result.draftVersion;
      dirtyRef.current = false;
      setSaveStatus('saved');
      setSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: CV_DRAFT_KEY });
      toast.success(t('studentCvBuilder.toast.submitted', 'CV envoyé à ton conseiller : il est maintenant « En attente » de relecture.'));
      setJustSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        setSaveStatus('conflict');
        toast.error(t('studentCvBuilder.toast.conflict', 'Ton CV a été modifié dans un autre onglet : recharge-le avant de continuer.'));
        return;
      }
      toast.error(getApiErrorMessage(err, t('studentCvBuilder.toast.submitError', 'L’envoi a échoué, réessaie dans un instant.')));
    }
  };

  const renderSection = (key: CvFormSectionKey) => {
    const def = SECTION_DEFS[key];
    const tip = SECTION_TIPS[key];
    const orderable = key !== 'identite' && key !== 'accroche';
    const index = orderable ? order.indexOf(key as CvSectionKey) : -1;
    return (
      <SectionCard key={key} sectionKey={key}
        title={t(`studentCvBuilder.sections.${key}.title`, def.title)}
        help={t(`studentCvBuilder.sections.${key}.help`, def.help)}
        tip={tip && {
          tip: t(`studentCvBuilder.guide.sections.${key}.tip`, tip.tip),
          example: t(`studentCvBuilder.guide.sections.${key}.example`, tip.example),
        }}
        icon={def.icon}
        open={openSections.has(key)}
        onToggle={() => toggleSection(key)}
        ordering={orderable ? {
          canMoveUp: index > 0,
          canMoveDown: index < order.length - 1,
          onMoveUp: () => moveSection(key as CvSectionKey, -1),
          onMoveDown: () => moveSection(key as CvSectionKey, 1),
        } : undefined}
        hidden={orderable ? {
          value: hiddenSections.includes(key as CvSectionKey),
          onToggle: () => toggleHidden(key as CvSectionKey),
        } : undefined}>
        <def.Component />
      </SectionCard>
    );
  };

  // Les logiciels des recruteurs cherchent le nom et les coordonnées en haut du CV.
  const [prenom, nom, email, telephone] = useWatch({
    control, name: ['data.identite.prenom', 'data.identite.nom', 'data.identite.email', 'data.identite.telephone'],
  });
  const recruiterReady = [prenom, nom, email, telephone].every((v) => !!v?.trim());

  const tab = (active: boolean) =>
    `flex-1 py-2 text-sm font-semibold rounded-lg cursor-pointer ${active ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`;

  return (
    <FormProvider {...methods}>
      <div className="flex flex-col gap-6 animate-fadeIn motion-reduce:animate-none">
        {justSubmitted && <SubmittedCard onClose={() => setJustSubmitted(false)} />}
        {!justSubmitted && <WelcomeCard storageKey={`itic.cvBuilder.welcomeSeen.${userId ?? 'anonyme'}`} />}
        <TemplatePicker />

        <section aria-labelledby="cv-step-fill" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="cv-step-fill" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('studentCvBuilder.steps.fill', '2. Complète ton CV')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
            {t('studentCvBuilder.subtitle', 'Remplis les sections à gauche : l’aperçu à droite est exactement le PDF que recevra ton conseiller.')}
          </p>
        </div>

        <BuilderToolbar
          saveStatus={saveStatus}
          savedAt={savedAt}
          saveError={saveError}
          onReload={onReload}
          onReset={() => setResetOpen(true)}
          onDownload={handleDownload}
          onSubmit={() => setConfirmOpen(true)}
          downloading={downloadMutation.isPending}
          submitting={submitMutation.isPending}
          resetting={resetMutation.isPending}
        />

        <div className="lg:hidden flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button type="button" className={tab(mobileTab === 'form')} onClick={() => setMobileTab('form')}>
            {t('studentCvBuilder.tabs.form', 'Formulaire')}
          </button>
          <button type="button" className={tab(mobileTab === 'preview')} onClick={() => setMobileTab('preview')}>
            {t('studentCvBuilder.tabs.preview', 'Aperçu')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className={`${mobileTab === 'form' ? 'flex' : 'hidden'} lg:flex flex-col gap-3 min-w-0`}>
            <CompletenessPanel completeness={completeness} loading={scoreLoading} onOpenSection={openSection} />
            {comments.length > 0 && <CVComments comments={comments} />}
            {renderSection('identite')}
            {renderSection('accroche')}
            {order.map((key) => renderSection(key))}
          </div>

          <div className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} lg:flex flex-col min-w-0 h-[75vh] lg:h-[calc(100vh-9.5rem)] lg:sticky lg:top-24`}>
            <CVPreview html={previewHtml} loading={previewLoading} error={previewError}
              pageCount={completeness?.pageCount ?? null} recruiterReady={recruiterReady} />
          </div>
        </div>
        </section>

        <CVReplaceModal
          isOpen={confirmOpen}
          fileName=""
          isUploading={submitMutation.isPending}
          onConfirm={handleSubmit}
          onClose={() => setConfirmOpen(false)}
          title={t('studentCvBuilder.submitModal.title', 'Envoyer ton CV à ton conseiller ?')}
          body={(
            <>
              {t('studentCvBuilder.submitModal.body', 'Le PDF généré avec le modèle choisi part en relecture : il sera « En attente » jusqu’à la décision de ton conseiller.')}
              {confirmOpen && (
                <PreSendChecklist checks={preSendChecks(getValues(), completeness?.pageCount ?? null)}
                  onFix={(section, field) => { setConfirmOpen(false); focusField(section, field); }} />
              )}
            </>
          )}
          confirmLabel={t('studentCvBuilder.submitModal.confirm', 'Envoyer')}
          showWarning={!!myCv}
          warningText={t('studentCvBuilder.submitModal.warning', 'Ton CV actuel sera remplacé : son statut de validation repart de zéro et les XP éligibles sont de nouveau en jeu pour ce cycle. Les commentaires de ton conseiller restent visibles.')}
        />

        <CVReplaceModal
          isOpen={resetOpen}
          fileName=""
          isUploading={resetMutation.isPending}
          onConfirm={handleReset}
          onClose={() => setResetOpen(false)}
          title={t('studentCvBuilder.resetModal.title', 'Repartir du prérempli ?')}
          body={t('studentCvBuilder.resetModal.body', 'Ton brouillon sera remplacé par les informations de ton compte (identité, formation ITIC, contrats validés). Tu gardes ton modèle et ta langue. Le CV déjà envoyé à ton conseiller ne change pas.')}
          confirmLabel={t('studentCvBuilder.resetModal.confirm', 'Réinitialiser')}
          showWarning={false}
        />
      </div>
    </FormProvider>
  );
}
