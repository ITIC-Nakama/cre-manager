import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logoDark from '../../assets/itic-paris-logo-dark.svg';
import logoWhite from '../../assets/itic-paris-logo-white.svg';
import Button from '../../components/basics/Button';
import { ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useSendOtp, useValidateOtp } from '../../hooks/useAuth';
import { handleApiError } from '../../utils/errorHelper';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const emailFromUrl = searchParams.get('email') || '';

    const { mutate: validateOtp, isPending: isValidating } = useValidateOtp();
    const { mutate: sendOtp, isPending: isResending } = useSendOtp();

    const { register, handleSubmit, setError, getValues, watch, formState: { errors } } = useForm({
        defaultValues: { email: emailFromUrl, code: '' }
    });

    const [generalError, setGeneralError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        const subscription = watch(() => setGeneralError(null));
        return () => subscription.unsubscribe();
    }, [watch]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const onSubmit = (data: any) => {
        validateOtp({ email: data.email, code: data.code }, {
            onSuccess: () => {
                toast.success(t('auth.verify_email.success_verified'));
                navigate('/login');
            },
            onError: (err: any) => {
                handleApiError(err, setError, setGeneralError, t('auth.verify_email.error_invalid_otp'));
            }
        });
    };

    const handleResend = (email: string) => {
        if (!email) { setGeneralError(t('auth.verify_email.error_enter_email')); return; }
        sendOtp({ email }, {
            onSuccess: () => {
                toast.success(t('auth.verify_email.success_code_sent'));
                setGeneralError(null);
                setResendCooldown(60);
            },
            onError: (err: any) => {
                handleApiError(err, setError, setGeneralError, t('auth.verify_email.error_resend_failed'));
            }
        });
    };

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
                            {t('auth.verify_email.title')}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                            {t('auth.verify_email.subtitle')}
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
                                {t('auth.verify_email.email_label')}
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder={t('auth.login.email_placeholder')}
                                disabled={isValidating || isResending}
                                className={`w-full rounded-xl border-2 bg-slate-50 dark:bg-slate-700/60 px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-400
                                    focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:border-[#3f74ff]
                                    transition-all duration-200 disabled:opacity-60
                                    ${errors.email ? 'border-red-400' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
                                {...register('email', {
                                    required: t('auth.verify_email.email_required'),
                                    pattern: { value: /^\S+@\S+$/i, message: t('auth.verify_email.email_invalid') },
                                })}
                            />
                            {errors.email && <p className="text-red-500 text-xs">{errors.email.message as string}</p>}
                        </div>

                        {/* OTP Code */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('auth.verify_email.code_label')}
                                </label>
                                <button
                                    type="button"
                                    disabled={resendCooldown > 0 || isResending || isValidating}
                                    onClick={() => handleResend(getValues('email'))}
                                    className="text-xs text-[#3f74ff] font-medium transition-colors disabled:text-slate-400 disabled:cursor-not-allowed hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                                    {resendCooldown > 0
                                        ? t('auth.verify_email.resend_cooldown', { seconds: resendCooldown })
                                        : t('auth.verify_email.resend_code')}
                                </button>
                            </div>
                            <input
                                id="code"
                                type="text"
                                placeholder="123456"
                                maxLength={6}
                                autoComplete="one-time-code"
                                disabled={isValidating || isResending}
                                className={`w-full rounded-xl border-2 bg-slate-50 dark:bg-slate-700/60 text-center tracking-[0.2em] font-semibold text-lg px-4 py-3 text-slate-800 dark:text-white placeholder-slate-400
                                    focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:border-[#3f74ff]
                                    transition-all duration-200 disabled:opacity-60
                                    ${errors.code ? 'border-red-400' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
                                {...register('code', {
                                    required: t('auth.verify_email.code_required'),
                                    pattern: { value: /^[0-9]{6}$/, message: t('auth.verify_email.code_pattern') },
                                })}
                            />
                            {errors.code && <p className="text-red-500 text-xs">{errors.code.message as string}</p>}
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isValidating || isResending}
                            className="w-full flex items-center justify-center gap-2
                                bg-[#3f74ff] hover:bg-[#2a5de5] active:bg-[#1e4fd8]
                                text-white font-semibold py-3 rounded-xl
                                focus:outline-none focus:ring-2 focus:ring-[#3f74ff]/40 focus:ring-offset-2
                                transition-all duration-200 hover:shadow-lg hover:shadow-[#3f74ff]/25
                                disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer mt-2"
                        >
                            <span>{isValidating ? t('auth.verify_email.submitting_button') : t('auth.verify_email.submit_button')}</span>
                            {!isValidating && <ArrowRight className="h-4 w-4" />}
                        </Button>

                        <div className="flex flex-col items-center pt-2 text-center">
                            <Link to="/login" className="text-sm text-[#3f74ff] hover:underline font-medium">
                                {t('auth.verify_email.back_to_login')}
                            </Link>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
