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
import { setTempPassword } from '../../utils/tempPasswordRelay';

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
                setTempPassword(password);
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
                bg-gradient-to-br from-[#0d0f16] via-[#15171f] to-[#020203] border-r border-[#333a51]">

                {/* Animated background blobs (Optimized radial glow, zero CPU blur overhead) */}
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(217,94,62,0.25)_0%,transparent_70%)] animate-blob-1 pointer-events-none" />
                <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(251,187,7,0.2)_0%,transparent_70%)] animate-blob-2 pointer-events-none" />
                <div className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(255,181,226,0.22)_0%,transparent_70%)] animate-blob-3 pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-full p-12">

                    {/* Logo */}
                    <div>
                        <div className="bg-[#15171f] border border-[#333a51] rounded px-5 py-4 inline-flex items-center shadow-sm">
                            <img src={logoWhite} alt="ITIC Paris" className="h-9 w-auto" />
                        </div>
                        <p className="text-[#9aa0a6] text-sm mt-3">{t('auth.login.portal_subtitle')}</p>
                    </div>

                    {/* Headline */}
                    <div>
                        <h1 className="text-4xl font-extrabold leading-tight mb-5 itic-gradient-blue">
                            {t('auth.login.hero_title')}
                        </h1>
                        <p className="text-[#9aa0a6] text-base leading-relaxed max-w-xs">
                            {t('auth.login.hero_description')}
                        </p>
                    </div>

                    {/* Help box */}
                    <div className="rounded-2xl bg-[#15171f]/80 border border-[#333a51] p-5">
                        <p className="text-white font-semibold text-sm mb-1">{t('auth.login.help_title')}</p>
                        <p className="text-[#9aa0a6] text-sm">
                            {t('auth.login.help_contact')}{' '}
                            <a href="mailto:pedagogie@iticparis.com"
                                className="text-[#D7C4FF] underline underline-offset-2 hover:opacity-80 transition-opacity">
                                pedagogie@iticparis.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Right panel ────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 lg:px-8 lg:py-12 overflow-y-auto relative bg-[#020203]">

                <div className="w-full max-w-xl relative z-10
                    bg-white dark:bg-[#15171f]
                    rounded-2xl shadow-xl border border-slate-100 dark:border-[#333a51]
                    p-8 lg:p-12">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden justify-center mb-10">
                        <img src={logoDark} alt="ITIC Paris" className="h-9 w-auto dark:hidden" />
                        <img src={logoWhite} alt="ITIC Paris" className="h-9 w-auto hidden dark:block" />
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold itic-gradient-warm mb-2">
                            {t('auth.login.connexion_title')}
                        </h2>
                        <p className="text-slate-500 dark:text-[#9aa0a6] text-sm">
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
                                {t('auth.login.email_label')} <span className="text-rose-500">*</span>
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
                                {t('auth.login.password_label')} <span className="text-rose-500">*</span>
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
                                btn-itic-primary py-3 rounded-xl
                                focus:outline-none focus:ring-2 focus:ring-[#d95e3e]/40
                                transition-all duration-200
                                disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer mt-2"
                        >
                            <span className="text-white font-bold">{isPending ? t('auth.login.connecting') : t('auth.login.submit_button')}</span>
                            {!isPending && <ArrowRight className="h-4 w-4 text-white" />}
                        </Button>

                        {/* Links */}
                        <div className="flex flex-col items-center gap-2 pt-2 text-center">
                            <Link to="/reset-password"
                                className="text-sm font-semibold itic-gradient-warm hover:underline transition-colors">
                                {t('auth.login.forgot_password')}
                            </Link>
                            <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                                {t('auth.login.no_account')}{' '}
                                <Link to="/signup" className="font-semibold itic-gradient-blue hover:underline">
                                    {t('auth.login.register_free')}
                                </Link>
                            </p>
                            <Link
                                to={`/verify-email?email=${encodeURIComponent(watch('email') || '')}`}
                                className="text-sm font-semibold itic-gradient-warm hover:underline transition-colors">
                                {t('auth.login.activate_account')}
                            </Link>
                        </div>

                    </form>
                </div>
            </div>

        </div>
    );
}
