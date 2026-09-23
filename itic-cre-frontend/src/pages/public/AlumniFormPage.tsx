import { useMemo, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, Controller } from 'react-hook-form';
import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle, ArrowLeft, ArrowRight, Banknote, Briefcase, Building2, CheckCircle2,
    GraduationCap, Loader2, Mail, Phone, User,
} from 'lucide-react';
import logoDark from '../../assets/itic-paris-logo-dark.svg';
import logoWhite from '../../assets/itic-paris-logo-white.svg';
import AuthControls from '../../components/common/AuthControls';
import CustomSelect from '../../components/basics/CustomSelect';
import YearPicker from '../../components/basics/YearPicker';
import { useSubmitAlumniContact } from '../../hooks/useAlumni';
import { getApiErrorMessage } from '../../utils/errorHelper';
import {
    ALUMNI_STATUSES, isWorkingStatus,
    type AlumniStatus, type CreateAlumniContactPayload,
} from '../../types/models/Alumni';

interface FormValues {
    lastName: string;
    firstName: string;
    email: string;
    phoneNumber: string;
    exitYear: string;
    formation: string;
    currentStatus: AlumniStatus | '';
    company: string;
    jobTitle: string;
    jobInContinuity: 'yes' | 'no' | '';
    continuityFormation: string;
    salaryExpectation: string;
    recontactConsent: boolean;
    gdprConsent: boolean;
    website: string;
}

const inputClass = (hasError: boolean, withIcon = true) =>
    `w-full rounded-xl border-2 bg-slate-50 dark:bg-slate-700/60 ${withIcon ? 'pl-11' : 'pl-4'} pr-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400
    focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:border-[#3f74ff] transition-all duration-200 disabled:opacity-60
    ${hasError ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`;

function Field({ id, label, required = false, error, children }: {
    id: string; label: string; required?: boolean; error?: string; children: ReactNode;
}) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
            {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
    );
}

function IconInput({ icon: Icon, hasError, ...inputProps }: { icon: LucideIcon; hasError: boolean } & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="relative group">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
            <input className={inputClass(hasError)} {...inputProps} />
        </div>
    );
}

function SectionTitle({ children }: { children: ReactNode }) {
    return <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2">{children}</h2>;
}

export default function AlumniFormPage() {
    const { t } = useTranslation();
    const { mutate, isPending } = useSubmitAlumniContact();
    const [submitted, setSubmitted] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);

    const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            lastName: '', firstName: '', email: '', phoneNumber: '', exitYear: '', formation: '',
            currentStatus: '', company: '', jobTitle: '', jobInContinuity: '', continuityFormation: '',
            salaryExpectation: '', recontactConsent: false, gdprConsent: false, website: '',
        },
    });

    const currentStatus = useWatch({ control, name: 'currentStatus' });
    const jobInContinuity = useWatch({ control, name: 'jobInContinuity' });
    const isWorking = currentStatus !== '' && isWorkingStatus(currentStatus);

    const statusOptions = useMemo(() => [
        { value: '', label: t('alumni.form.status_placeholder', 'Choisir votre situation') },
        ...ALUMNI_STATUSES.map((status) => ({ value: status, label: t(`alumni.status.${status}`, status) })),
    ], [t]);

    const onSubmit = (values: FormValues) => {
        setGeneralError(null);
        const working = values.currentStatus !== '' && isWorkingStatus(values.currentStatus);
        const inContinuity = values.jobInContinuity === 'yes';

        const payload: CreateAlumniContactPayload = {
            lastName: values.lastName.trim(),
            firstName: values.firstName.trim(),
            email: values.email.trim(),
            phoneNumber: values.phoneNumber.trim() || undefined,
            exitYear: Number(values.exitYear),
            formation: values.formation.trim(),
            currentStatus: values.currentStatus as AlumniStatus,
            salaryExpectation: values.salaryExpectation.trim() || undefined,
            recontactConsent: values.recontactConsent,
            gdprConsent: values.gdprConsent,
            website: values.website,
            ...(working && {
                company: values.company.trim(),
                jobTitle: values.jobTitle.trim(),
                jobInContinuity: inContinuity,
                continuityFormation: inContinuity ? values.continuityFormation.trim() : undefined,
            }),
        };

        mutate(payload, {
            onSuccess: () => setSubmitted(true),
            onError: (err) => setGeneralError(getApiErrorMessage(err, t('alumni.form.error_generic', 'Une erreur est survenue, réessayez dans un instant.'))),
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020203] px-4 pt-20 pb-10 sm:px-6">
            <AuthControls />

            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <img src={logoDark} alt="ITIC Paris" className="h-10 w-auto dark:hidden" />
                        <img src={logoWhite} alt="ITIC Paris" className="h-10 w-auto hidden dark:block" />
                    </div>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#3f74ff] hover:text-blue-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('alumni.back', 'Retour à la connexion')}
                    </Link>
                </div>

                <div className="bg-white dark:bg-[#15171f] rounded-2xl shadow-xl p-6 sm:p-10">
                    {submitted ? (
                        <div className="flex flex-col items-center text-center gap-4 py-8 max-w-xl mx-auto animate-fadeIn">
                            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                {t('alumni.success.title', "Merci d'avoir partagé votre parcours !")}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-[#9aa0a6] max-w-md">
                                {t('alumni.success.message', "Vos coordonnées ont bien été enregistrées. Nous sommes ravis de vous compter parmi le réseau des anciens étudiants d'ITIC Paris et de garder le lien pour nos futurs échanges et événements.")}
                            </p>
                            <Link to="/login" className="mt-2 font-semibold itic-gradient-blue hover:underline">
                                {t('alumni.success.back', 'Retour à l\'accueil')}
                            </Link>
                        </div>
                    ) : (
                        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)} noValidate>
                            <header className="flex items-start gap-4">
                                <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-[#d95e3e] to-[#fbbb07] flex items-center justify-center shadow-lg shadow-[#d95e3e]/20">
                                    <GraduationCap className="h-6 w-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-[#3f74ff] dark:text-blue-400">
                                        {t('alumni.badge', 'Anciens étudiants')}
                                    </p>
                                    <h1 className="text-3xl font-extrabold itic-gradient-warm">
                                        {t('alumni.form.title', 'Restons en contact')}
                                    </h1>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-[#9aa0a6]">
                                        {t('alumni.form.subtitle', 'Vous êtes passé par ITIC Paris ? Laissez-nous vos coordonnées pour rester en lien avec l\'école.')}
                                    </p>
                                </div>
                            </header>

                            {generalError && (
                                <div className="flex gap-2 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm animate-fade-in-up">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{generalError}</span>
                                </div>
                            )}

                            {/* Champ piege anti-robot : hors ecran, jamais rempli par un humain */}
                            <input
                                type="text"
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                                {...register('website')}
                            />

                            {/* Deux colonnes sur grand ecran pour limiter la hauteur ; une seule colonne sur mobile/tablette */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                                <div className="space-y-5">
                                    <SectionTitle>{t('alumni.form.section_identity', 'Vous')}</SectionTitle>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field id="firstName" label={t('alumni.form.first_name', 'Prénom')} required error={errors.firstName?.message}>
                                            <IconInput
                                                id="firstName" icon={User} hasError={!!errors.firstName} maxLength={100} autoComplete="given-name"
                                                disabled={isPending}
                                                {...register('firstName', { required: t('alumni.form.first_name_required', 'Merci de renseigner votre prénom.') })}
                                            />
                                        </Field>
                                        <Field id="lastName" label={t('alumni.form.last_name', 'Nom')} required error={errors.lastName?.message}>
                                            <IconInput
                                                id="lastName" icon={User} hasError={!!errors.lastName} maxLength={100} autoComplete="family-name"
                                                disabled={isPending}
                                                {...register('lastName', { required: t('alumni.form.last_name_required', 'Merci de renseigner votre nom.') })}
                                            />
                                        </Field>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                                        <Field id="email" label={t('alumni.form.email', 'Email')} required error={errors.email?.message}>
                                            <IconInput
                                                id="email" type="email" icon={Mail} hasError={!!errors.email} maxLength={255} autoComplete="email"
                                                disabled={isPending}
                                                {...register('email', {
                                                    required: t('alumni.form.email_required', 'Merci de renseigner votre email.'),
                                                    pattern: { value: /^\S+@\S+\.\S+$/, message: t('alumni.form.email_invalid', 'Adresse email invalide.') },
                                                })}
                                            />
                                        </Field>
                                        <Field id="phoneNumber" label={t('alumni.form.phone', 'Téléphone (facultatif)')} error={errors.phoneNumber?.message}>
                                            <IconInput
                                                id="phoneNumber" type="tel" icon={Phone} hasError={!!errors.phoneNumber} maxLength={20} autoComplete="tel"
                                                disabled={isPending}
                                                {...register('phoneNumber', {
                                                    pattern: { value: /^$|^\+?[0-9 .()-]{7,20}$/, message: t('alumni.form.phone_invalid', 'Numéro de téléphone invalide.') },
                                                })}
                                            />
                                        </Field>
                                    </div>

                                    <SectionTitle>{t('alumni.form.section_school', 'Votre passage à ITIC Paris')}</SectionTitle>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                                        <Field id="exitYear" label={t('alumni.form.exit_year', 'Année de sortie d\'ITIC Paris')} required error={errors.exitYear?.message}>
                                            <Controller
                                                name="exitYear"
                                                control={control}
                                                rules={{ required: t('alumni.form.exit_year_required', 'Merci de choisir votre année de sortie.') }}
                                                render={({ field }) => (
                                                    <YearPicker
                                                        id="exitYear"
                                                        value={field.value}
                                                        onChange={(val) => field.onChange(val ? String(val) : '')}
                                                        minYear={1990}
                                                        maxYear={new Date().getFullYear() + 1}
                                                        placeholder={t('alumni.form.exit_year_placeholder', 'Choisir une année')}
                                                        disabled={isPending}
                                                        error={!!errors.exitYear}
                                                    />
                                                )}
                                            />
                                        </Field>
                                        <Field id="formation" label={t('alumni.form.formation', 'Formation suivie chez ITIC Paris')} required error={errors.formation?.message}>
                                            <IconInput
                                                id="formation" icon={GraduationCap} hasError={!!errors.formation} maxLength={150}
                                                placeholder={t('alumni.form.formation_placeholder', 'Ex : BTS NDRC, Bachelor RH, Mastère Commerce…')}
                                                disabled={isPending}
                                                {...register('formation', { required: t('alumni.form.formation_required', 'Merci de renseigner votre formation.') })}
                                            />
                                        </Field>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <SectionTitle>{t('alumni.form.section_situation', 'Votre situation actuelle')}</SectionTitle>

                                    <Field id="currentStatus" label={t('alumni.form.current_status', 'Statut actuel')} required error={errors.currentStatus?.message}>
                                        <Controller
                                            name="currentStatus"
                                            control={control}
                                            rules={{ required: t('alumni.form.status_required', 'Merci de choisir votre situation.') }}
                                            render={({ field }) => (
                                                <CustomSelect
                                                    id="currentStatus" value={field.value} options={statusOptions} onChange={field.onChange}
                                                    icon={<Briefcase className="h-4 w-4 text-slate-400" />} className="w-full" disabled={isPending}
                                                />
                                            )}
                                        />
                                    </Field>

                                    {isWorking && (
                                        <div className="space-y-5 animate-fadeIn">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <Field id="company" label={t('alumni.form.company', 'Entreprise actuelle')} required error={errors.company?.message}>
                                                    <IconInput
                                                        id="company" icon={Building2} hasError={!!errors.company} maxLength={150} disabled={isPending}
                                                        {...register('company', { required: t('alumni.form.company_required', 'Merci de renseigner votre entreprise.') })}
                                                    />
                                                </Field>
                                                <Field id="jobTitle" label={t('alumni.form.job_title', 'Poste occupé')} required error={errors.jobTitle?.message}>
                                                    <IconInput
                                                        id="jobTitle" icon={Briefcase} hasError={!!errors.jobTitle} maxLength={150} disabled={isPending}
                                                        {...register('jobTitle', { required: t('alumni.form.job_title_required', 'Merci de renseigner votre poste.') })}
                                                    />
                                                </Field>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {t('alumni.form.continuity_question', 'Ce poste est-il dans la continuité d\'une formation ITIC Paris ?')} <span className="text-rose-500">*</span>
                                                </p>
                                                <div className="flex items-center gap-6">
                                                    {(['yes', 'no'] as const).map((answer) => (
                                                        <label key={answer} className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                            <input
                                                                type="radio" value={answer} disabled={isPending}
                                                                className="h-4 w-4 border-slate-300 text-[#3f74ff] focus:ring-[#3f74ff] dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                                                                {...register('jobInContinuity', { required: t('alumni.form.continuity_required', 'Merci de répondre à cette question.') })}
                                                            />
                                                            {t(`alumni.form.${answer}`, answer === 'yes' ? 'Oui' : 'Non')}
                                                        </label>
                                                    ))}
                                                </div>
                                                {errors.jobInContinuity && <p className="text-red-500 text-xs">{errors.jobInContinuity.message}</p>}
                                            </div>

                                            {jobInContinuity === 'yes' && (
                                                <Field id="continuityFormation" label={t('alumni.form.continuity_formation', 'Quelle formation ITIC Paris ?')} required error={errors.continuityFormation?.message}>
                                                    <IconInput
                                                        id="continuityFormation" icon={GraduationCap} hasError={!!errors.continuityFormation} maxLength={150} disabled={isPending}
                                                        {...register('continuityFormation', { required: t('alumni.form.continuity_formation_required', 'Merci de préciser la formation.') })}
                                                    />
                                                </Field>
                                            )}
                                        </div>
                                    )}

                                    <Field
                                        id="salaryExpectation"
                                        label={isWorking
                                            ? t('alumni.form.salary_current', 'Rémunération actuelle (facultatif)')
                                            : t('alumni.form.salary_expected', 'Prétentions salariales souhaitées (facultatif)')}
                                        error={errors.salaryExpectation?.message}
                                    >
                                        <IconInput
                                            id="salaryExpectation" icon={Banknote} hasError={!!errors.salaryExpectation} maxLength={100} disabled={isPending}
                                            placeholder={isWorking
                                                ? t('alumni.form.salary_current_placeholder', 'Ex : 42 k€ ou 450 €/jour')
                                                : t('alumni.form.salary_expected_placeholder', 'Ex : 35-40 k€')}
                                            {...register('salaryExpectation')}
                                        />
                                    </Field>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                                <SectionTitle>{t('alumni.form.section_consent', 'Consentements')}</SectionTitle>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-3">
                                    <div className="space-y-1.5">
                                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                            <input
                                                type="checkbox" disabled={isPending}
                                                className="h-4 w-4 mt-0.5 shrink-0 rounded border-slate-300 text-[#3f74ff] focus:ring-[#3f74ff] dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                                                {...register('recontactConsent', { required: t('alumni.form.consent_required', 'Cette case est nécessaire pour envoyer le formulaire.') })}
                                            />
                                            <span className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                                                {t('alumni.form.consent_recontact', 'J\'accepte d\'être recontacté(e) pour recommander des alternants à mon entreprise.')}
                                            </span>
                                        </label>
                                        {errors.recontactConsent && <p className="text-red-500 text-xs pl-7">{errors.recontactConsent.message}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                            <input
                                                type="checkbox" disabled={isPending}
                                                className="h-4 w-4 mt-0.5 shrink-0 rounded border-slate-300 text-[#3f74ff] focus:ring-[#3f74ff] dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                                                {...register('gdprConsent', { required: t('alumni.form.consent_required', 'Cette case est nécessaire pour envoyer le formulaire.') })}
                                            />
                                            <span className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                                                {t('alumni.form.consent_gdpr', 'J\'accepte qu\'ITIC Paris conserve ces données et les utilise pour me recontacter, conformément à la')}{' '}
                                                <Link to="/privacy" target="_blank" className="font-semibold itic-gradient-warm hover:underline">
                                                    {t('alumni.form.privacy_link', 'politique de confidentialité')}
                                                </Link>.
                                            </span>
                                        </label>
                                        {errors.gdprConsent && <p className="text-red-500 text-xs pl-7">{errors.gdprConsent.message}</p>}
                                    </div>
                                </div>

                                <div className="flex lg:justify-end pt-2">
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="w-full lg:w-auto lg:px-12 flex items-center justify-center gap-2 btn-itic-primary py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d95e3e]/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {isPending && <Loader2 className="h-4 w-4 text-white animate-spin" />}
                                        <span className="text-white font-bold">
                                            {isPending ? t('alumni.form.submitting', 'Envoi…') : t('alumni.form.submit', 'Envoyer mes coordonnées')}
                                        </span>
                                        {!isPending && <ArrowRight className="h-4 w-4 text-white" />}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
