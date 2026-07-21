import { Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function JobboardBadge() {
    const { t } = useTranslation();
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
            <Globe2 className="h-3 w-3" />
            {t('dashboard.candidatures.student.card.via_jobboard')}
        </span>
    );
}
