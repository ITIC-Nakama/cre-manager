import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/itic-paris-logo-white.svg';
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
        defaultValues: {
            email: '',
            code: '',
            newPassword: '',
            confirmPassword: ''
        }
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
                setError('confirmPassword', {
                    type: 'manual',
                    message: t('auth.reset_password.error_mismatch')
                });
                return;
            }

            confirmReset({
                email: data.email,
                code: data.code,
                newPassword: data.newPassword
            }, {
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
        if (!watchedEmail) {
            setGeneralError("L'adresse email est manquante.");
            return;
        }
        handleSendOtp(watchedEmail);
    };

    return (
        <div className="flex flex-col gap-6 max-w-md mx-auto w-full items-center justify-center min-h-[85vh] px-4 py-8">
            {/* Header / Logo */}
            <div className="gap-3 mb-2 items-center flex flex-col text-center">
                <img src={logo} alt="Reset Password" className="h-10 w-auto drop-shadow-sm" />
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {t('auth.reset_password.title')}
                </h1>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {step === 1
                        ? t('auth.reset_password.subtitle')
                        : t('auth.reset_password.subtitle_step2')
                    }
                </span>
            </div>

            {/* Reset Card */}
            <div className="shadow-xl rounded-xl w-full bg-white p-8 border border-slate-100 dark:border-slate-800/40 dark:bg-slate-900 dark:shadow-slate-950/40">
                <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                    {generalError && (
                        <div className="flex gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <span>{generalError}</span>
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t('auth.reset_password.email_label')}
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <Mail className="h-4 w-4" />
                            </span>
                            <input
                                id="email"
                                type="email"
                                placeholder={t('auth.reset_password.email_placeholder')}
                                disabled={step === 2 || isRequesting || isConfirming}
                                className={`w-full rounded-lg border pl-10 pr-3.5 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 transition-all duration-150 disabled:opacity-60 ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-slate-200'}`}
                                {...register("email", {
                                    required: "L'adresse email est requise.",
                                    pattern: {
                                        value: /^\S+@\S+$/i,
                                        message: "Veuillez entrer une adresse e-mail valide."
                                    }
                                })}
                            />
                        </div>
                        {errors.email && (
                            <span className="text-red-500 text-xs mt-1 block">
                                {errors.email.message as string}
                            </span>
                        )}
                    </div>

                    {step === 2 && (
                        <>
                            {/* OTP Code Input */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {t('auth.reset_password.code_label')}
                                    </label>

                                    {/* Resend button with countdown */}
                                    <button
                                        type="button"
                                        disabled={resendCooldown > 0 || isRequesting || isConfirming}
                                        onClick={handleResend}
                                        className="text-xs text-primary hover:text-primary-dark dark:text-primary-400 font-medium transition-colors disabled:text-slate-400 disabled:cursor-not-allowed hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <RefreshCw className={`h-3 w-3 ${isRequesting ? 'animate-spin' : ''}`} />
                                        {resendCooldown > 0
                                            ? t('auth.reset_password.resend_cooldown', { seconds: resendCooldown })
                                            : t('auth.reset_password.resend_code')
                                        }
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <KeyRound className="h-4 w-4" />
                                    </span>
                                    <input
                                        id="code"
                                        type="text"
                                        placeholder={t('auth.reset_password.code_placeholder')}
                                        maxLength={6}
                                        autoComplete="one-time-code"
                                        disabled={isConfirming || isRequesting}
                                        className={`w-full rounded-lg border pl-10 pr-3.5 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all duration-150 disabled:opacity-60 ${errors.code ? 'border-red-500 focus:ring-red-200' : 'border-slate-200'}`}
                                        {...register("code", {
                                            required: "Le code est requis.",
                                            pattern: {
                                                value: /^[0-9]{6}$/,
                                                message: "Le code doit être composé de 6 chiffres."
                                            }
                                        })}
                                    />
                                </div>
                                {errors.code && (
                                    <span className="text-red-500 text-xs mt-1 block">
                                        {errors.code.message as string}
                                    </span>
                                )}
                            </div>

                            {/* New Password Input */}
                            <div className="space-y-1.5">
                                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('auth.reset_password.new_password_label')}
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Lock className="h-4 w-4" />
                                    </span>
                                    <input
                                        id="newPassword"
                                        type="password"
                                        placeholder={t('auth.reset_password.new_password_placeholder')}
                                        disabled={isConfirming || isRequesting}
                                        className={`w-full rounded-lg border pl-10 pr-3.5 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all duration-150 disabled:opacity-60 ${errors.newPassword ? 'border-red-500 focus:ring-red-200' : 'border-slate-200'}`}
                                        {...register("newPassword", {
                                            required: "Le nouveau mot de passe est requis.",
                                            minLength: {
                                                value: 8,
                                                message: "Le mot de passe doit contenir au moins 8 caractères."
                                            }
                                        })}
                                    />
                                </div>
                                {errors.newPassword && (
                                    <span className="text-red-500 text-xs mt-1 block">
                                        {errors.newPassword.message as string}
                                    </span>
                                )}
                            </div>

                            {/* Confirm Password Input */}
                            <div className="space-y-1.5">
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('auth.reset_password.confirm_password_label')}
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Lock className="h-4 w-4" />
                                    </span>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder={t('auth.reset_password.confirm_password_placeholder')}
                                        disabled={isConfirming || isRequesting}
                                        className={`w-full rounded-lg border pl-10 pr-3.5 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all duration-150 disabled:opacity-60 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-200' : 'border-slate-200'}`}
                                        {...register("confirmPassword", {
                                            required: "Veuillez confirmer le nouveau mot de passe."
                                        })}
                                    />
                                </div>
                                {errors.confirmPassword && (
                                    <span className="text-red-500 text-xs mt-1 block">
                                        {errors.confirmPassword.message as string}
                                    </span>
                                )}
                            </div>
                        </>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isRequesting || isConfirming}
                        className="bg-primary hover:bg-primary-dark text-white py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer justify-center font-medium mt-2 w-full flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <span>
                            {step === 1
                                ? (isRequesting ? "Envoi..." : t('auth.reset_password.submit_button'))
                                : (isConfirming ? "Réinitialisation..." : t('auth.reset_password.submit_confirm_button'))
                            }
                        </span>
                        {!(isRequesting || isConfirming) && <ArrowRight className="h-4 w-4" />}
                    </Button>

                    {/* Links */}
                    <div className="flex flex-col items-center gap-2 pt-2 text-center">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            <Link to="/login" className="text-primary dark:text-primary-400 hover:underline cursor-pointer font-medium">
                                {t('auth.reset_password.back_to_login')}
                            </Link>
                        </span>
                    </div>
                </form>
            </div>

            {/* Disclaimer / Warning Banner at the bottom */}
            <div className="w-full p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/80 dark:border-amber-900/20 flex gap-3 text-left">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs md:text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong className="font-semibold text-amber-900 dark:text-amber-200">{t('cta.warning_title')}</strong>{" "}
                    {t('cta.warning_text')}
                </p>
            </div>
        </div>
    );
}
