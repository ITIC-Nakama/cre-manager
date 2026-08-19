import { useTranslation } from 'react-i18next';
import { Briefcase, Loader2, Mail, Users } from 'lucide-react';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { useAdvisorDirectory } from '../../../hooks/useAdvisors';
import UserAvatar from '../../../components/shared/UserAvatar';

export default function ConseillersPage() {
  const { t } = useTranslation();
  const { data: advisors, isLoading } = useAdvisorDirectory();

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Users className="h-7 w-7 text-[#E2762F] shrink-0" />
          {renderTitleWithGradient(t('dashboard.conseillers_directory.title', 'Conseillers'), 'itic-gradient-blue')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t('dashboard.conseillers_directory.subtitle', "Retrouvez l'ensemble des conseillers de la plateforme et leurs coordonnées.")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      ) : !advisors || advisors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <Users className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {t('dashboard.conseillers_directory.empty', 'Aucun conseiller disponible pour le moment.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {advisors.map((advisor) => (
            <div
              key={advisor.id}
              className="relative overflow-hidden bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/50 rounded-2xl p-5 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-950/40 transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col gap-3.5"
            >
              {/* Top gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E2762F] via-indigo-500 to-violet-500" />

              {/* Background subtle radiant sheen */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-violet-500/[0.02] pointer-events-none" />

              {/* Header with avatar */}
              <div className="flex items-center gap-3 relative z-10">
                <UserAvatar
                  profilePicture={advisor.profilePicture}
                  firstName={advisor.firstName}
                  lastName={advisor.lastName}
                  className="h-12 w-12 shrink-0"
                  enlargeOnClick
                />
                <div className="min-w-0">
                  <p className="font-bold text-indigo-600 dark:text-indigo-400 text-base line-clamp-1 leading-snug">
                    {advisor.firstName} {advisor.lastName}
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {t('dashboard.conseillers_directory.role_badge', 'Conseiller')}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {advisor.jobTitle && (
                <div className="flex flex-wrap items-center gap-2 relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100/80 dark:border-indigo-900/30">
                    <Briefcase className="h-3 w-3" />{advisor.jobTitle}
                  </span>
                </div>
              )}

              {/* Contact CTA */}
              <a
                href={`mailto:${advisor.email}`}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/25 active:scale-[0.98] text-white relative z-10"
              >
                <Mail className="h-4 w-4" />
                <span className="truncate">{advisor.email}</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
