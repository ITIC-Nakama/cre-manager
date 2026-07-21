import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Camera, Medal, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import { useUpdateProfile, useUploadProfilePicture } from '../../../hooks/useAuth';
import { useMyDashboardSummary } from '../../../hooks/useStudentDashboard';
import UserAvatar from '../../shared/UserAvatar';

export default function ProfileCard() {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const updateProfileMutation = useUpdateProfile();
  const uploadPictureMutation = useUploadProfilePicture();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStudent = user?.role === Role.STUDENT;
  const { data: dashboardSummary } = useMyDashboardSummary(isStudent);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '');
  const [uploadingPicture, setUploadingPicture] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setJobTitle(user?.jobTitle ?? '');
  }, [user]);

  if (!user) return null;

  const isAdvisor = user.role === Role.ADVISOR;
  const hasChanges = firstName !== user.firstName || lastName !== user.lastName || (isAdvisor && jobTitle !== (user.jobTitle ?? ''));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateProfileMutation.mutateAsync({
        firstName,
        lastName,
        jobTitle: isAdvisor ? jobTitle : undefined,
      });
      setUser({ ...user, firstName: updated.firstName, lastName: updated.lastName, jobTitle: updated.jobTitle ?? user.jobTitle });
      toast.success(t('dashboard.parametres.profile.toast_updated'));
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.parametres.profile.toast_update_error'));
    }
  };

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPicture(true);
    try {
      const { profilePictureUrl } = await uploadPictureMutation.mutateAsync(file);
      setUser({ ...user, profilePicture: profilePictureUrl });
      toast.success(t('dashboard.parametres.profile.toast_picture_updated'));
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.parametres.profile.toast_picture_error'));
    } finally {
      setUploadingPicture(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('dashboard.parametres.profile.title')}</h2>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col gap-5">
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
    </div>
  );
}
