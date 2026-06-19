import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logoDark from '../../assets/itic-paris-logo-dark.svg';
import logoWhite from '../../assets/itic-paris-logo-white.svg';
import Button from '../../components/basics/Button';
import { ArrowRight, AlertTriangle, RefreshCw, KeyRound, Lock, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useResetPassword, useResetPasswordConfirm } from '../../hooks/useAuth';
import { handleApiError } from '../../utils/errorHelper';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [step, setStep] = useState<1 | 2>(1);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    const { mutate: requestReset, isPending: isRequesting } = useResetPassword();
    const { mutate: confirmReset, isPending: isConfirming } = useResetPasswordConfirm();

    const { register, handleSubmit, setError, watch, formState: { errors } } = useForm({
        defaultValues: { email: '', code: '', newPassword: '', confirmPassword: '' }
    });

    const watchedEmail = watch('email');

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleSendOtp = (email: string) => {
        requestReset(email, {
            onSuccess: () => {
                toast.success(t('auth.reset_password.success_email_sent'));
                setStep(2);
                setResendCooldown(60);
            },
            onError: (err: any) => {
                handleApiError(err, setError, setGeneralError, "Impossible de demander la réinitialisation du mot de passe.");
            }
        });
    };

    const onSubmit = (data: any) => {
        if (step === 1) {
            handleSendOtp(data.email);
        } else {
            if (data.newPassword !== data.confirmPassword) {
                setError('confirmPassword', { type: 'manual', message: t('auth.reset_password.error_mismatch') });
                return;
            }
            confirmReset({ email: data.email, code: data.code, newPassword: data.newPassword }, {
                onSuccess: () => {
                    toast.success(t('auth.reset_password.success_password_reset'));
                    navigate('/login');
                },
                onError: (err: any) => {
                    handleApiError(err, setError, setGeneralError, "Le code de vérification est invalide ou a expiré.");
                }
            });
        }
    };

    const handleResend = () => {
        if (!watchedEmail) { setGeneralError("L'adresse email est manquante."); return; }
        handleSendOtp(watchedEmail);
    };

    const inputBase = (hasError: boolean) =>
        `w-full rounded-xl border-2 bg-slate-50 dark:bg-slate-700/60 pl-11 pr-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-400
        focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:border-[#3f74ff]
        transition-all duration-200 disabled:opacity-60
        ${hasError ? 'border-red-400' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`;

    return (
        <div className="flex-1 animate-gradient-bg flex flex-col items-center justify-center px-5 py-10 overflow-y-auto relative">

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[#3f74ff]/12 blur-2xl animate-blob-1" />
                <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-indigo-400/10 blur-2xl animate-blob-2" />
            </div>

            <div className="flex flex-col gap-10 max-w-md w-full relative z-10">

                {/* Logo + heading */}
                <div className="flex flex-col items-center gap-5 text-center">
                    <img src={logoDark} alt="ITIC Paris" className="h-12 w-auto dark:hidden" />
                    <img src={logoWhite} alt="ITIC Paris" className="h-12 w-auto hidden dark:block" />
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {t('auth.reset_password.title')}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                            {step === 1 ? t('auth.reset_password.subtitle') : t('auth.reset_password.subtitle_step2')}
                        </p>
                    </div>
                </div>

                {/* Card */}
                <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-600/50 p-10">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>

                        {generalError && (
                            <div className="flex gap-2 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{generalError}</span>
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('auth.reset_password.email_label')}
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder={t('auth.reset_password.email_placeholder')}
                                    disabled={step === 2 || isRequesting || isConfirming}
                                    className={inputBase(!!errors.email)}
                                    {...register('email', {
                                        required: t('auth.verify_email.email_required'),
                                        pattern: { value: /^\S+@\S+$/i, message: t('auth.verify_email.email_invalid') },
                                    })}
                                />
                            </div>
                            {errors.email && <p className="text-red-500 text-xs">{errors.email.message as string}</p>}
                        </div>

                        {step === 2 && (
                            <>
                                {/* OTP Code */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-baseline">
                                        <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {t('auth.reset_password.code_label')}
                                        </label>
                                        <button
                                            type="button"
                                            disabled={resendCooldown > 0 || isRequesting || isConfirming}
                                            onClick={handleResend}
                                            className="text-xs text-[#3f74ff] font-medium transition-colors disabled:text-slate-400 disabled:cursor-not-allowed hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <RefreshCw className={`h-3 w-3 ${isRequesting ? 'animate-spin' : ''}`} />
                                            {resendCooldown > 0
                                                ? t('auth.reset_password.resend_cooldown', { seconds: resendCooldown })
                                                : t('auth.reset_password.resend_code')}
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
                                        <input
                                            id="code"
                                            type="text"
                                            placeholder={t('auth.reset_password.code_placeholder')}
                                            maxLength={6}
                                            autoComplete="one-time-code"
                                            disabled={isConfirming || isRequesting}
                                            className={inputBase(!!errors.code)}
                                            {...register('code', {
                                                required: t('auth.verify_email.code_required'),
                                                pattern: { value: /^[0-9]{6}$/, message: t('auth.verify_email.code_pattern') },
                                            })}
                                        />
                                    </div>
                                    {errors.code && <p className="text-red-500 text-xs">{errors.code.message as string}</p>}
                                </div>

                                {/* New Password */}
                                <div className="space-y-2">
                                    <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {t('auth.reset_password.new_password_label')}
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
                                        <input
                                            id="newPassword"
                                            type="password"
                                            placeholder={t('auth.reset_password.new_password_placeholder')}
                                            disabled={isConfirming || isRequesting}
                                            className={inputBase(!!errors.newPassword)}
                                            {...register('newPassword', {
                                                required: t('auth.login.password_required'),
                                                minLength: { value: 8, message: 'Le mot de passe doit contenir au moins 8 caractères.' },
                                            })}
                                        />
                                    </div>
                                    {errors.newPassword && <p className="text-red-500 text-xs">{errors.newPassword.message as string}</p>}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {t('auth.reset_password.confirm_password_label')}
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
                                        <input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder={t('auth.reset_password.confirm_password_placeholder')}
                                            disabled={isConfirming || isRequesting}
                                            className={inputBase(!!errors.confirmPassword)}
                                            {...register('confirmPassword', {
                                                required: t('auth.login.password_required'),
                                            })}
                                        />
                                    </div>
                                    {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword.message as string}</p>}
                                </div>
                            </>
                        )}

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isRequesting || isConfirming}
                            className="w-full flex items-center justify-center gap-2
                                bg-[#3f74ff] hover:bg-[#2a5de5] active:bg-[#1e4fd8]
                                text-white font-semibold py-3 rounded-xl
                                focus:outline-none focus:ring-2 focus:ring-[#3f74ff]/40 focus:ring-offset-2
                                transition-all duration-200 hover:shadow-lg hover:shadow-[#3f74ff]/25
                                disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer mt-2"
                        >
                            <span>
                                {step === 1
                                    ? (isRequesting ? t('auth.verify_email.submitting_button') : t('auth.reset_password.submit_button'))
                                    : (isConfirming ? t('auth.verify_email.submitting_button') : t('auth.reset_password.submit_confirm_button'))}
                            </span>
                            {!(isRequesting || isConfirming) && <ArrowRight className="h-4 w-4" />}
                        </Button>

                        <div className="flex flex-col items-center pt-2 text-center">
                            <Link to="/login" className="text-sm text-[#3f74ff] hover:underline font-medium">
                                {t('auth.reset_password.back_to_login')}
                            </Link>
                        </div>

                    </form>
                </div>

                {/* Warning banner */}
                <div className="w-full p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/80 dark:border-amber-900/20 flex gap-3 text-left">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs md:text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                        <strong className="font-semibold text-amber-900 dark:text-amber-200">{t('cta.warning_title')}</strong>{' '}
                        {t('cta.warning_text')}
                    </p>
                </div>

            </div>
        </div>
    );
}
