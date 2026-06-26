import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ShieldAlert, Eye, EyeOff, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useChangePassword } from '../../hooks/useAuth';
import { useUserStore } from '../../store/UserStore';
import { toUserProfileDTO } from '../../types/models/User';
import { getTempPassword } from '../../utils/tempPasswordRelay';

export default function ChangePasswordRequiredPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const logout = useUserStore((state) => state.logout);

  const { mutate: changePassword, isPending } = useChangePassword();

  // Recupere le mot de passe deja saisi sur l'ecran de connexion pour ne pas le redemander.
  // Absent si l'utilisateur arrive ici autrement (rafraichissement, navigation directe) —
  // dans ce cas le champ reste visible en repli.
  const tempPasswordFromLogin = getTempPassword();

  const [currentPassword, setCurrentPassword] = useState(tempPasswordFromLogin ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.mustChangePassword) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    changePassword(
      { currentPassword, newPassword },
      {
        onSuccess: (data: any) => {
          const updatedUser = toUserProfileDTO(data.user ?? data);
          setUser(updatedUser);
          toast.success('Mot de passe mis à jour avec succès !');
          navigate('/dashboard', { replace: true });
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || 'Une erreur est survenue.';
          toast.error(msg);
        },
      }
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Changement de mot de passe requis</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire avant de continuer.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!tempPasswordFromLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mot de passe temporaire actuel <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isPending}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nouveau mot de passe <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={isPending}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Confirmer le nouveau mot de passe <span className="text-rose-500">*</span></label>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              disabled={isPending}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50 mt-2"
          >
            {isPending ? 'Modification...' : 'Changer le mot de passe'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-medium py-2 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
