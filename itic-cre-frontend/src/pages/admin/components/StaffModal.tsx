import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { X, Loader2, Copy, Check, RefreshCw, Camera } from 'lucide-react';
import type { Advisor } from '../../../types/models/Advisor';
import { generatePassword } from '../../../utils/passwordGenerator';
import { copyToClipboard } from '../../../utils/clipboard';
import { useUploadAdvisorPublicPicture } from '../../../hooks/useAdvisors';
import UserAvatar from '../../../components/shared/UserAvatar';

interface StaffModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  advisor?: Advisor;
  targetRole?: 'ADVISOR' | 'ADMIN';
  saving: boolean;
  onClose: () => void;
  onSave: (data: { email: string; firstName: string; lastName: string; password: string; phoneNumber: string; jobTitle: string }) => void;
}

export default function StaffModal({ isOpen, mode, advisor, targetRole = 'ADVISOR', saving, onClose, onSave }: StaffModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPictureMutation = useUploadAdvisorPublicPicture();

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && advisor) {
        setEmail(advisor.email);
        setFirstName(advisor.firstName);
        setLastName(advisor.lastName);
        setPassword('');
        setPhoneNumber(advisor.phoneNumber || '');
        setJobTitle(advisor.jobTitle || '');
      } else {
        setEmail('');
        setFirstName('');
        setLastName('');
        setPassword(generatePassword());
        setPhoneNumber('');
        setJobTitle('');
      }
      setCopied(false);
      setPreviewUrl(null);
    }
    // Depend on advisor?.id (not the advisor object itself) — a background refetch
    // (e.g. after uploading the public picture) hands us a new object reference for
    // the same advisor, which would otherwise re-run this effect and wipe out the
    // just-uploaded preview at the exact moment it should appear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, advisor?.id]);

  const handleRegeneratePassword = () => {
    setPassword(generatePassword());
    setCopied(false);
  };

  const handlePictureSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !advisor) return;

    setPreviewUrl(URL.createObjectURL(file));
    try {
      await uploadPictureMutation.mutateAsync({ advisorId: advisor.id, file });
      toast.success(t('dashboard.conseillers.toast_picture_updated', 'Photo mise à jour avec succès !'));
    } catch {
      setPreviewUrl(null);
      toast.error(t('dashboard.conseillers.toast_picture_error', 'Erreur lors de la mise à jour de la photo.'));
    }
  };

  const handleCopyPassword = async () => {
    const success = await copyToClipboard(password);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error(t('dashboard.conseillers.toast_copy_error'));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    onSave({ email, firstName, lastName, password, phoneNumber, jobTitle });
  };

  const getTitle = () => {
    if (mode === 'edit') return t('dashboard.conseillers.modal_edit');
    return targetRole === 'ADMIN'
      ? t('dashboard.conseillers.modal_create_admin')
      : t('dashboard.conseillers.modal_create_advisor');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {getTitle()}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_first_name')} <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_last_name')} <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_email')} <span className="text-rose-500">*</span></label>
            <input
              type="email"
              required
              disabled={mode === 'edit'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@iticparis.com"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {mode === 'create' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('dashboard.conseillers.label_password')} <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegeneratePassword}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t('dashboard.conseillers.btn_regenerate')}
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full font-mono tracking-wider pr-10 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title={t('dashboard.conseillers.btn_copy')}
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_phone')}</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_job_title')}</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={targetRole === 'ADMIN' ? 'Directeur Pédagogique' : 'Responsable Relations Entreprises'}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {mode === 'edit' && targetRole === 'ADVISOR' && advisor && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {t('dashboard.conseillers.label_public_picture', 'Photo publique (visible par les étudiants)')}
              </label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <UserAvatar
                    profilePicture={previewUrl ?? advisor.publicProfilePicture}
                    firstName={advisor.firstName}
                    lastName={advisor.lastName}
                    className="h-14 w-14"
                    onClick={() => fileInputRef.current?.click()}
                  />
                  {uploadPictureMutation.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadPictureMutation.isPending}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {t('dashboard.conseillers.btn_change_picture', 'Changer la photo')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePictureSelected}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {t('dashboard.conseillers.hint_public_picture', "Optionnel — si absente, la photo de compte du conseiller est utilisée à la place.")}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('dashboard.conseillers.btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'create' ? t('dashboard.conseillers.btn_create') : t('dashboard.conseillers.btn_save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
