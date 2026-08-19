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
    <div className="flex items-center gap-2.5 shrink-0">
      <UserAvatar
        profilePicture={advisor.profilePicture}
        firstName={advisor.firstName}
        lastName={advisor.lastName}
        className="h-10 w-10"
        enlargeOnClick
      />
      <div className="min-w-0 text-right">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t('dashboard.home.advisor.title', 'Mon conseiller')}
        </p>
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
          {advisor.firstName} {advisor.lastName}
        </p>
        <a
          href={`mailto:${advisor.email}`}
          className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors truncate"
        >
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{advisor.email}</span>
        </a>
      </div>
    </div>
  );
}
