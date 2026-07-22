import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Camera, Medal, Star, Zap, Mail, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import {
  useUpdateProfile,
  useUploadProfilePicture,
  useConfirmEmailChange,
  useCancelEmailChange,
  useResendEmailChangeOtp
} from '../../../hooks/useAuth';
import { useMyDashboardSummary } from '../../../hooks/useStudentDashboard';
import UserAvatar from '../../shared/UserAvatar';

export default function ProfileCard() {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const updateProfileMutation = useUpdateProfile();
  const uploadPictureMutation = useUploadProfilePicture();
  const confirmEmailChangeMutation = useConfirmEmailChange();
  const cancelEmailChangeMutation = useCancelEmailChange();
  const resendOtpMutation = useResendEmailChangeOtp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStudent = user?.role === Role.STUDENT;
  const { data: dashboardSummary } = useMyDashboardSummary(isStudent);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '');
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setEmail(user?.email ?? '');
    setJobTitle(user?.jobTitle ?? '');
  }, [user]);

  if (!user) return null;

  const isAdvisor = user.role === Role.ADVISOR;
  const hasChanges = firstName !== user.firstName || lastName !== user.lastName || email !== user.email || (isAdvisor && jobTitle !== (user.jobTitle ?? ''));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateProfileMutation.mutateAsync({
        firstName,
        lastName,
        email,
        jobTitle: isAdvisor ? jobTitle : undefined,
      });
      setUser({
        ...user,
        firstName: updated.firstName ?? firstName,
        lastName: updated.lastName ?? lastName,
        email: updated.email ?? email,
        profilePicture: updated.profilePicture ?? user.profilePicture,
        jobTitle: updated.jobTitle ?? user.jobTitle,
        pendingEmail: updated.pendingEmail ?? null,
      });
      if (updated.pendingEmail) {
        setShowOtpModal(true);
        toast.info(t('dashboard.parametres.profile.toast_otp_sent', `Un code OTP a été envoyé à ${updated.pendingEmail}.`));
      } else {
        toast.success(t('dashboard.parametres.profile.toast_updated', 'Profil mis à jour avec succès !'));
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.messageKey === 'email-already-in-use') {
        toast.error(t('auth.register.email_exists', 'Cet e-mail est déjà utilisé.'));
      } else {
        toast.error(t('dashboard.parametres.profile.toast_update_error', 'Erreur lors de la mise à jour du profil.'));
      }
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) return;
    try {
      const updated = await confirmEmailChangeMutation.mutateAsync(otpCode);
      setUser({
        ...user,
        email: updated.email,
        pendingEmail: null,
      });
      setEmail(updated.email);
      setShowOtpModal(false);
      setOtpCode('');
      toast.success(t('dashboard.parametres.profile.toast_email_confirmed', 'Adresse e-mail mise à jour avec succès !'));
    } catch (err: any) {
      console.error(err);
      toast.error(t('auth.otp.invalid', 'Code OTP invalide ou expiré.'));
    }
  };

  const handleCancelPending = async () => {
    try {
      await cancelEmailChangeMutation.mutateAsync();
      setUser({
        ...user,
        pendingEmail: null,
      });
      setEmail(user.email);
      setShowOtpModal(false);
      setOtpCode('');
      toast.info(t('dashboard.parametres.profile.toast_email_change_cancelled', 'Demande de modification annulée.'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendOtpMutation.mutateAsync();
      toast.success(t('auth.otp.resent', 'Un nouveau code OTP a été envoyé.'));
    } catch (err) {
      console.error(err);
      toast.error(t('auth.otp.resend_failed', 'Échec de l\'envoi du code.'));
    }
  };

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPicture(true);
    try {
      const { profilePictureUrl } = await uploadPictureMutation.mutateAsync(file);
      setUser({ ...user, profilePicture: profilePictureUrl });
      toast.success(t('dashboard.parametres.profile.toast_picture_updated', 'Photo de profil mise à jour avec succès !'));
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.parametres.profile.toast_picture_error', 'Erreur lors de la mise à jour de la photo de profil.'));
    } finally {
      setUploadingPicture(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('dashboard.parametres.profile.title')}</h2>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col gap-5">
        {user.pendingEmail && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {t('dashboard.parametres.profile.pending_email_title', 'Changement d\'adresse e-mail en attente')}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {t('dashboard.parametres.profile.pending_email_desc', 'Un code OTP a été envoyé à')} <span className="font-bold underline">{user.pendingEmail}</span>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowOtpModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                {t('dashboard.parametres.profile.btn_enter_otp', 'Saisir le code')}
              </button>
              <button
                type="button"
                onClick={handleCancelPending}
                disabled={cancelEmailChangeMutation.isPending}
                className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs font-medium transition-colors cursor-pointer"
              >
                {t('dashboard.parametres.profile.btn_cancel', 'Annuler')}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative">
            <UserAvatar onClick={() => fileInputRef.current?.click()}  profilePicture={user.profilePicture} firstName={user.firstName} lastName={user.lastName} className="h-16 w-16" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPicture}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              title={t('dashboard.parametres.profile.change_picture')}
            >
              {uploadingPicture ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePictureChange}
              className="hidden"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
            {isStudent && dashboardSummary && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* Grade */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-100 dark:border-amber-900/40">
                  <Medal className="h-3 w-3" />
                  {dashboardSummary.gamification.grade.nom}
                </span>
                {/* XP Total */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-100 dark:border-indigo-900/40">
                  <Zap className="h-3 w-3" />
                  {dashboardSummary.gamification.xpTotal} XP
                </span>
                {/* Rang */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/40">
                  <Star className="h-3 w-3" />
                  {t('dashboard.parametres.profile.rank', { rank: dashboardSummary.ranking.rank, total: dashboardSummary.ranking.totalStudents })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.parametres.profile.label_first_name')} <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              maxLength={50}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.parametres.profile.label_last_name')} <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              maxLength={50}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.parametres.profile.label_email', 'Adresse email')} <span className="text-rose-500">*</span></label>
          <input
            type="email"
            required
            maxLength={100}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
          />
        </div>

        {isAdvisor && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.parametres.profile.label_job_title')}</label>
            <input
              type="text"
              maxLength={120}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={t('dashboard.parametres.profile.placeholder_job_title')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
            />
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!hasChanges || updateProfileMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('dashboard.parametres.profile.btn_save')}
          </button>
        </div>
      </form>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-500" />
                {t('dashboard.parametres.profile.modal_otp_title', 'Confirmation de l\'adresse e-mail')}
              </h3>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('dashboard.parametres.profile.modal_otp_desc', 'Veuillez saisir le code à 6 chiffres envoyé à')} <span className="font-semibold text-slate-900 dark:text-white">{user.pendingEmail}</span>.
            </p>

            <form onSubmit={handleConfirmOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.trim())}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.5em] font-mono text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={otpCode.length < 6 || confirmEmailChangeMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {confirmEmailChangeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('dashboard.parametres.profile.btn_confirm_otp', 'Valider le code')}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendOtpMutation.isPending}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
                >
                  {resendOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.otp.resend_btn', 'Renvoyer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
