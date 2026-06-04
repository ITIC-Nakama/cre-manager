import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/itic-paris-logo-white.svg';
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
        defaultValues: {
            email: emailFromUrl,
            code: ''
        }
    });

    const [generalError, setGeneralError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Clear general error when user types or changes fields
    useEffect(() => {
        const subscription = watch(() => {
            setGeneralError(null);
        });
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
        if (!email) {
            setGeneralError(t('auth.verify_email.error_enter_email'));
            return;
        }

        sendOtp({ email }, {
            onSuccess: () => {
                toast.success(t('auth.verify_email.success_code_sent'));
                setGeneralError(null);
                setResendCooldown(60); // Cooldown of 60 seconds
            },
            onError: (err: any) => {
                handleApiError(err, setError, setGeneralError, t('auth.verify_email.error_resend_failed'));
            }
        });
    };

    return (
        <div className="flex flex-col gap-6 max-w-md mx-auto w-full items-center justify-center min-h-[85vh] px-4 py-8">
            {/* Header / Logo */}
            <div className="gap-3 mb-2 items-center flex flex-col text-center">
                <img src={logo} alt={t('auth.verify_email.title')} className="h-10 w-auto drop-shadow-sm" />
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {t('auth.verify_email.title')}
                </h1>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('auth.verify_email.subtitle')}
                </span>
            </div>

            {/* Verification Card */}
            <div className="shadow-xl rounded-xl w-full bg-white p-8 border border-slate-100 dark:border-slate-800/40 dark:bg-slate-900 dark:shadow-slate-950/40">
                <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                    {generalError && (
                        <div className="flex gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <span>{generalError}</span>
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t('auth.verify_email.email_label')}
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder={t('auth.login.email_placeholder')}
                            disabled={isValidating || isResending}
                            className={`w-full rounded-lg border px-3.5 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 transition-all duration-150 disabled:opacity-60 ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-slate-200'}`}
                            {...register("email", {
                                required: t('auth.verify_email.email_required'),
                                pattern: {
                                    value: /^\S+@\S+$/i,
                                    message: t('auth.verify_email.email_invalid')
                                }
                            })}
                        />
                        {errors.email && (
                            <span className="text-red-500 text-xs mt-1 block">
                                {errors.email.message as string}
                            </span>
                        )}
                    </div>

                    {/* OTP Code Input */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline">
                            <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('auth.verify_email.code_label')}
                            </label>

                            {/* Resend button with countdown */}
                            <button
                                type="button"
                                disabled={resendCooldown > 0 || isResending || isValidating}
                                onClick={() => handleResend(getValues('email'))}
                                className="text-xs text-primary dark:text-primary-500 font-medium transition-colors disabled:text-slate-400 disabled:cursor-not-allowed hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                                {resendCooldown > 0
                                    ? t('auth.verify_email.resend_cooldown', { seconds: resendCooldown })
                                    : t('auth.verify_email.resend_code')
                                }
                            </button>
                        </div>

                        <input
                            id="code"
                            type="text"
                            placeholder="123456"
                            maxLength={6}
                            autoComplete="one-time-code"
                            disabled={isValidating || isResending}
                            className={`w-full rounded-lg  border text-center tracking-[0.2em] font-semibold text-lg px-3.5 py-2 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all duration-150 disabled:opacity-60 ${errors.code ? 'border-red-500 focus:ring-red-200' : 'border-slate-200'}`}
                            {...register("code", {
                                required: t('auth.verify_email.code_required'),
                                pattern: {
                                    value: /^[0-9]{6}$/,
                                    message: t('auth.verify_email.code_pattern')
                                }
                            })}
                        />
                        {errors.code && (
                            <span className="text-red-500 text-xs mt-1 block text-left">
                                {errors.code.message as string}
                            </span>
                        )}
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isValidating || isResending}
                        className="bg-primary hover:bg-primary-dark text-white py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer justify-center font-medium mt-2 disabled:opacity-60 disabled:cursor-not-allowed w-full flex items-center gap-2"
                    >
                        <span>{isValidating ? t('auth.verify_email.submitting_button') : t('auth.verify_email.submit_button')}</span>
                        {!isValidating && <ArrowRight className="h-4 w-4" />}
                    </Button>

                    {/* Back link */}
                    <div className="flex flex-col items-center gap-2 pt-2 text-center">
                        <Link to="/login" className="text-sm text-primary dark:text-primary-500  hover:underline cursor-pointer font-medium">
                            {t('auth.verify_email.back_to_login')}
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
