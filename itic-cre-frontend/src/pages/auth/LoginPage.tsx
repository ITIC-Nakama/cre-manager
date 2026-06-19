import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logoDark from '../../assets/itic-paris-logo-dark.svg';
import logoWhite from '../../assets/itic-paris-logo-white.svg';
import Button from '../../components/basics/Button';
import { ArrowRight, AlertTriangle, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useLogin } from '../../hooks/useAuth';
import type { LoginDTO } from '../../types/models/Auth';
import { useForm } from 'react-hook-form';
import { handleApiError } from '../../utils/errorHelper';
import { useUserStore } from '../../store/UserStore';
import { toUserProfileDTO } from '../../types/models/User';

export default function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const { mutate, isPending } = useLogin();
    const { register, handleSubmit, setError, watch, formState: { errors } } = useForm();
    const [generalError, setGeneralError] = useState<React.ReactNode | null>(null);
    const setUser = useUserStore((state) => state.setUser);

    const onSubmit = (data: any) => {
        const email = data.email as string;
        const password = data.password as string;
        mutate({ email, password } as LoginDTO, {
            onSuccess: (data: any) => {
                const user = toUserProfileDTO(data.user ?? data);
                setUser(user);
                navigate('/dashboard');
            },
            onError: (err: any) => {
                const apiError = err?.response?.data;
                if (apiError?.message === 'Email not verified') {
                    setGeneralError(
                        <span>
                            {t('auth.login.email_not_verified')}{' '}
                            <Link to={`/verify-email?email=${encodeURIComponent(email)}`} className="underline font-semibold">
                                {t('auth.login.click_to_activate')}
                            </Link>
                        </span>
                    );
                } else {
                    handleApiError(err, setError, setGeneralError, t('auth.login.invalid_credentials'));
                }
            },
        });
    };

    return (
        <div className="flex-1 flex overflow-hidden">

            {/* ── Left panel ─────────────────────────────────────────── */}
            <div className="hidden lg:flex w-[44%] flex-col relative overflow-hidden
                bg-gradient-to-br from-[#3f74ff] via-[#2e63f0] to-[#1a3fbf]">

                {/* Animated background blobs */}
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/25 blur-xl ring-1 ring-white/20 animate-blob-1 pointer-events-none" />
                <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-white/20 blur-xl ring-1 ring-white/15 animate-blob-2 pointer-events-none" />
                <div className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full bg-white/25 blur-xl ring-1 ring-white/20 animate-blob-3 pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-full p-12">

                    {/* Logo */}
                    <div>
                        <div className="bg-white rounded  px-5 py-4 inline-flex items-center shadow-sm">
                            <img src={logoDark} alt="ITIC Paris" className="h-9 w-auto" />
                        </div>
                        <p className="text-white/60 text-sm mt-3">{t('auth.login.portal_subtitle')}</p>
                    </div>

                    {/* Headline */}
                    <div>
                        <h1 className="text-4xl font-bold text-white leading-tight mb-5">
                            {t('auth.login.hero_title')}
                        </h1>
                        <p className="text-white/75 text-base leading-relaxed max-w-xs">
                            {t('auth.login.hero_description')}
                        </p>
                    </div>

                    {/* Help box */}
                    <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-5">
                        <p className="text-white font-semibold text-sm mb-1">{t('auth.login.help_title')}</p>
                        <p className="text-white/70 text-sm">
                            {t('auth.login.help_contact')}{' '}
                            <a href="mailto:pedagogie@iticparis.com"
                                className="text-white underline underline-offset-2 hover:text-white/80 transition-colors">
                                pedagogie@iticparis.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Right panel ────────────────────────────────────────── */}
            <div className="flex-1 animate-gradient-bg flex flex-col items-center justify-center px-5 py-10 lg:px-8 lg:py-12 overflow-y-auto relative">

                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[#3f74ff]/12 blur-2xl animate-blob-1" />
                    <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-indigo-400/10 blur-2xl animate-blob-2" />
                </div>

                <div className="w-full max-w-xl relative z-10
                    bg-white dark:bg-slate-800
                    rounded-2xl shadow-xl border border-slate-100 dark:border-slate-600/50
                    p-8 lg:p-12">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden justify-center mb-6">
                        <img src={logoDark} alt="ITIC Paris" className="h-9 w-auto dark:hidden" />
                        <img src={logoWhite} alt="ITIC Paris" className="h-9 w-auto hidden dark:block" />
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {t('auth.login.connexion_title')}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {t('auth.login.connexion_subtitle')}
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>

                        {generalError && (
                            <div className="flex gap-2 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm animate-fade-in-up">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{generalError}</span>
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('auth.login.email_label')}
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder={t('auth.login.email_placeholder')}
                                    autoComplete="email"
                                    disabled={isPending}
                                    className={`w-full rounded-xl border-2 bg-slate-50 dark:bg-slate-700/60 pl-11 pr-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-400
                                        focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:border-[#3f74ff]
                                        transition-all duration-200 disabled:opacity-60
                                        ${errors.email ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
                                    {...register('email', {
                                        required: t('auth.verify_email.email_required'),
                                        pattern: { value: /^\S+@\S+$/i, message: t('auth.verify_email.email_invalid') },
                                    })}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-red-500 text-xs">{errors.email.message as string}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('auth.login.password_label')}
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={t('auth.login.password_placeholder')}
                                    autoComplete="current-password"
                                    disabled={isPending}
                                    className={`w-full rounded-xl border-2 bg-slate-50 dark:bg-slate-700/60 pl-11 pr-12 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-400
                                        focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:border-[#3f74ff]
                                        transition-all duration-200 disabled:opacity-60
                                        ${errors.password ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
                                    {...register('password', { required: t('auth.login.password_required') })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isPending}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                                    aria-label={showPassword ? t('auth.login.password_placeholder') : t('auth.login.password_label')}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-red-500 text-xs">{errors.password.message as string}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="w-full flex items-center justify-center gap-2
                                bg-[#3f74ff] hover:bg-[#2a5de5] active:bg-[#1e4fd8]
                                text-white font-semibold py-3 rounded-xl
                                focus:outline-none focus:ring-2 focus:ring-[#3f74ff]/40 focus:ring-offset-2
                                transition-all duration-200 hover:shadow-lg hover:shadow-[#3f74ff]/25
                                disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer mt-2"
                        >
                            <span>{isPending ? t('auth.login.connecting') : t('auth.login.submit_button')}</span>
                            {!isPending && <ArrowRight className="h-4 w-4" />}
                        </Button>

                        {/* Links */}
                        <div className="flex flex-col items-center gap-2 pt-2 text-center">
                            <Link to="/reset-password"
                                className="text-sm text-[#3f74ff] hover:underline font-medium transition-colors">
                                {t('auth.login.forgot_password')}
                            </Link>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t('auth.login.no_account')}{' '}
                                <Link to="/signup" className="text-[#3f74ff] hover:underline font-medium">
                                    {t('auth.login.register_free')}
                                </Link>
                            </p>
                            <Link
                                to={`/verify-email?email=${encodeURIComponent(watch('email') || '')}`}
                                className="text-sm text-slate-400 dark:text-slate-500 hover:text-[#3f74ff] hover:underline transition-colors">
                                {t('auth.login.activate_account')}
                            </Link>
                        </div>

                    </form>
                </div>
            </div>

        </div>
    );
}
