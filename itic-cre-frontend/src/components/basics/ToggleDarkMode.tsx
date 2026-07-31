// import { useState } from 'react'
// import { Sun, Moon } from 'lucide-react'
// import { useTranslation } from 'react-i18next'
// import { ThemeStorageKey } from '../../types/storage-keys'

export default function ToggleDarkMode() {
  // Mode sombre forcé par défaut sur l'application ITIC CRE — Toggle désactivé
  return null;

  /* 
  const { t } = useTranslation()
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )

  const isDark = theme === 'dark'

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    window.localStorage.setItem(ThemeStorageKey, next)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('dashboard.pages.parametres.theme_toggle_light', 'Passer en mode clair') : t('dashboard.pages.parametres.theme_toggle_dark', 'Passer en mode sombre')}
      title={isDark ? t('dashboard.pages.parametres.theme_toggle_light', 'Passer en mode clair') : t('dashboard.pages.parametres.theme_toggle_dark', 'Passer en mode sombre')}
      className={`
        relative flex items-center w-20 h-10 rounded-full p-1 cursor-pointer
        transition-all duration-300 ease-in-out focus:outline-none
        border
        ${isDark
          ? 'bg-[#15171f] border-[#333a51]'
          : 'bg-slate-100 border-slate-300'
        }
      `}
    >
      <span className="absolute left-2.5 flex items-center justify-center w-5 h-5">
        <Sun className={`h-4 w-4 transition-opacity duration-200 ${isDark ? 'opacity-30 text-slate-500' : 'opacity-100 text-amber-500'}`} />
      </span>
      <span className="absolute right-2.5 flex items-center justify-center w-5 h-5">
        <Moon className={`h-4 w-4 transition-opacity duration-200 ${isDark ? 'opacity-100 text-[#00D9F6]' : 'opacity-30 text-slate-400'}`} />
      </span>

      <span
        className={`
          relative z-10 flex items-center justify-center
          h-8 w-8 rounded-full shadow-md
          transition-all duration-300 ease-in-out
          ${isDark
            ? 'translate-x-10 bg-[#0d0f16] border border-[#333a51] text-[#00F5A0]'
            : 'translate-x-0 bg-[#3f74ff] text-[#00F5A0]'
          }
        `}
      >
        {isDark
          ? <Moon className="h-4 w-4 text-[#00D9F6]" />
          : <Sun className="h-4 w-4" />
        }
      </span>
    </button>
  )
  */
}
