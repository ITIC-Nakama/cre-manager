import { NavLink } from 'react-router-dom';
import type { NavItem } from '../head/Sidebar';

interface BottomNavProps {
  navItems: NavItem[];
}

// Barre de navigation mobile fixée en bas — remplace le burger/drawer sur mobile
export default function BottomNav({ navItems }: BottomNavProps) {
  // On affiche au max 5 items pour éviter un affichage trop serré
  const visible = navItems.slice(0, 5);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {visible.map(({ label, icon: Icon, to }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex items-center justify-center h-7 w-7 rounded-xl transition-colors ${
                  isActive ? 'bg-primary/10 dark:bg-primary/20' : ''
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="truncate max-w-[56px]">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
