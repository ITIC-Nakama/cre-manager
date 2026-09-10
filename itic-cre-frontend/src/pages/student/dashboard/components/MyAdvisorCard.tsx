import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import UserAvatar from '../../../../components/shared/UserAvatar';
import type { AdvisorDirectoryEntry } from '../../../../types/models/Advisor';

interface Props {
  advisor: AdvisorDirectoryEntry | null;
}

export default function MyAdvisorCard({ advisor }: Props) {
  const { t } = useTranslation();

  if (!advisor) return null;

  return (
    <div className="relative overflow-hidden flex items-center gap-2 shrink-0 rounded-xl pl-3 pr-2 py-2.5">
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-[#E2762F] via-indigo-500 to-violet-500" />
      <UserAvatar
        profilePicture={advisor.profilePicture}
        firstName={advisor.firstName}
        lastName={advisor.lastName}
        className="h-8 w-8 shrink-0"
        enlargeOnClick
      />
      <div className="min-w-0">
        <p className="text-xs font-bold leading-tight text-slate-400 dark:text-slate-500">
          {t('dashboard.home.advisor.title', 'Mon conseiller')}
        </p>
        <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-white truncate max-w-[160px]">
          {advisor.firstName} {advisor.lastName}
        </p>
      </div>
      <a
        href={`mailto:${advisor.email}`}
        title={advisor.email}
        className="shrink-0 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
      >
        <Mail className="h-4 w-4" />
      </a>
    </div>
  );
}
