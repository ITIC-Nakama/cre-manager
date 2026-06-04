import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ThemeStorageKey } from '../../types/storage-keys'

export default function ToggleDarkMode() {
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
          ? 'bg-slate-900 border-slate-700'
          : 'bg-slate-100 border-slate-300'
        }
      `}
    >
      {/* Track icons */}
      <span className="absolute left-2.5 flex items-center justify-center w-5 h-5">
        <Sun className={`h-4 w-4 transition-opacity duration-200 ${isDark ? 'opacity-30 text-slate-400' : 'opacity-100 text-amber-500'}`} />
      </span>
      <span className="absolute right-2.5 flex items-center justify-center w-5 h-5">
        <Moon className={`h-4 w-4 transition-opacity duration-200 ${isDark ? 'opacity-100 text-blue-300' : 'opacity-30 text-slate-400'}`} />
      </span>

      {/* Sliding knob */}
      <span
        className={`
          relative z-10 flex items-center justify-center
          h-8 w-8 rounded-full shadow-md
          transition-all duration-300 ease-in-out
          ${isDark
            ? 'translate-x-10 bg-slate-700 text-blue-300'
            : 'translate-x-0 bg-white text-amber-500'
          }
        `}
      >
        {isDark
          ? <Moon className="h-4 w-4" />
          : <Sun className="h-4 w-4" />
        }
      </span>
    </button>
  )
}

