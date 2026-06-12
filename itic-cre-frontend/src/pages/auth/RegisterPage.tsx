import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/itic-paris-logo-white.svg';
import Button from '../../components/basics/Button';
import { ArrowRight, AlertTriangle, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRegister } from '../../hooks/useAuth';
import { type RegisterDTO, Role } from '../../types/models/Auth';
import { handleApiError } from '../../utils/errorHelper';
import { getBrowserLang } from '../../utils/browserSettings';
import { toast } from 'sonner';

export default function RegisterPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const { mutate, isPending } = useRegister();
    const { register, handleSubmit, setError, formState: { errors } } = useForm();
    const [generalError, setGeneralError] = useState<string | null>(null);

    const onSubmit = (data: any) => {
        const registerDto: RegisterDTO = {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            password: data.password,
            roleId: Role.STUDENT,
            lang: getBrowserLang(),
        };

        mutate(registerDto, {
            onSuccess: () => {
                toast.success(t('auth.register.success_created'));
                navigate(`/verify-email?email=${encodeURIComponent(registerDto.email)}`);
            },
            onError: (err: any) => {
                handleApiError(err, setError, setGeneralError, t('auth.register.error_generic'));
            },
        });
    };

    return (
        <div className="flex-1 flex min-h-screen overflow-hidden">

            {/* ── Left panel ─────────────────────────────────────────── */}
            <div className="hidden lg:flex w-[44%] flex-col relative overflow-hidden
                bg-gradient-to-br from-[#3f74ff] via-[#2e63f0] to-[#1a3fbf]">

                {/* Animated background blobs */}
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/35 blur-xl ring-1 ring-white/40 animate-blob-1 pointer-events-none" />
                <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-white/30 blur-xl ring-1 ring-white/35 animate-blob-2 pointer-events-none" />
                <div className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full bg-white/35 blur-xl ring-1 ring-white/40 animate-blob-3 pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-full p-12">

                    {/* Logo */}
                    <div>
                        <div className="bg-white rounded-2xl px-5 py-4 inline-flex items-center shadow-sm">
                            <img src={logo} alt="ITIC Paris" className="h-9 w-auto" />
                        </div>
                        <p className="text-white/60 text-sm mt-3">{t('auth.register.portal_subtitle')}</p>
                    </div>

                    {/* Headline */}
                    <div>
                        <h1 className="text-4xl font-bold text-white leading-tight mb-5">
                            {t('auth.register.hero_title')}
                        </h1>
                        <p className="text-white/75 text-base leading-relaxed max-w-xs">
                            {t('auth.register.hero_description')}
                        </p>
                    </div>

                    {/* Help box */}
                    <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-5">
                        <p className="text-white font-semibold text-sm mb-1">{t('auth.register.help_title')}</p>
                        <p className="text-white/70 text-sm">
                            {t('auth.register.help_contact')}{' '}
                            <a href="mailto:rp-info@iticparis.fr"
                                className="text-white underline underline-offset-2 hover:text-white/80 transition-colors">
                                rp-info@iticparis.fr
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

                <div className="w-full max-w-xl relative z-10 animate-fade-in-up anim-delay-100
                    bg-white
                    rounded-2xl shadow-xl border border-slate-100
                    p-8 lg:p-12">

                    {/* Mobile logo — plain, no wrapper */}
                    <div className="flex lg:hidden justify-center mb-6">
                        <img src={logo} alt="ITIC Paris" className="h-9 w-auto" />
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            {t('auth.register.register_title')}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            {t('auth.register.register_subtitle')}
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>

                        {generalError && (
                            <div className="flex gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm animate-fade-in-up">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{generalError}</span>
                            </div>
                        )}

                        {/* First name + Last name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">
                                    {t('auth.register.first_name_label')}
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
                                    <input
                                        id="firstName"
                                        type="text"
                                        placeholder={t('auth.register.first_name_placeholder')}
                                        disabled={isPending}
                                        className={`w-full rounded-xl border-2 bg-slate-50 pl-11 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400
                                            focus:bg-white focus:outline-none focus:border-[#3f74ff]
                                            transition-all duration-200 disabled:opacity-60
                                            ${errors.firstName ? 'border-red-400 bg-red-50' : 'border-slate-100 hover:border-slate-200'}`}
                                        {...register('firstName', {
                                            required: t('auth.register.first_name_required'),
                                            minLength: { value: 2, message: t('auth.register.first_name_min') },
                                        })}
                                    />
                                </div>
                                {errors.firstName && (
                                    <p className="text-red-500 text-xs">{errors.firstName.message as string}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">
                                    {t('auth.register.last_name_label')}
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
                                    <input
                                        id="lastName"
                                        type="text"
                                        placeholder={t('auth.register.last_name_placeholder')}
                                        disabled={isPending}
                                        className={`w-full rounded-xl border-2 bg-slate-50 pl-11 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400
                                            focus:bg-white focus:outline-none focus:border-[#3f74ff]
                                            transition-all duration-200 disabled:opacity-60
                                            ${errors.lastName ? 'border-red-400 bg-red-50' : 'border-slate-100 hover:border-slate-200'}`}
                                        {...register('lastName', {
                                            required: t('auth.register.last_name_required'),
                                            minLength: { value: 2, message: t('auth.register.last_name_min') },
                                        })}
                                    />
                                </div>
                                {errors.lastName && (
                                    <p className="text-red-500 text-xs">{errors.lastName.message as string}</p>
                                )}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                {t('auth.register.email_label')}
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder={t('auth.register.email_placeholder')}
                                    autoComplete="email"
                                    disabled={isPending}
                                    className={`w-full rounded-xl border-2 bg-slate-50 pl-11 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400
                                        focus:bg-white focus:outline-none focus:border-[#3f74ff]
                                        transition-all duration-200 disabled:opacity-60
                                        ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-100 hover:border-slate-200'}`}
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
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                {t('auth.register.password_label')}
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3f74ff] transition-colors pointer-events-none" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={t('auth.register.password_placeholder')}
                                    autoComplete="new-password"
                                    disabled={isPending}
                                    className={`w-full rounded-xl border-2 bg-slate-50 pl-11 pr-12 py-3 text-sm text-slate-800 placeholder-slate-400
                                        focus:bg-white focus:outline-none focus:border-[#3f74ff]
                                        transition-all duration-200 disabled:opacity-60
                                        ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-100 hover:border-slate-200'}`}
                                    {...register('password', {
                                        required: t('auth.login.invalid_credentials'),
                                        minLength: { value: 8, message: 'Le mot de passe doit comporter au moins 8 caractères.' },
                                    })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isPending}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
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
                            <span>{isPending ? t('auth.register.creating') : t('auth.register.submit_button')}</span>
                            {!isPending && <ArrowRight className="h-4 w-4" />}
                        </Button>

                        {/* Links */}
                        <div className="flex flex-col items-center gap-2 pt-2 text-center">
                            <p className="text-sm text-slate-500">
                                {t('auth.register.have_account')}{' '}
                                <Link to="/login" className="text-[#3f74ff] hover:underline font-medium">
                                    {t('auth.register.login_link')}
                                </Link>
                            </p>
                        </div>

                    </form>
                </div>
            </div>

        </div>
    );
}
