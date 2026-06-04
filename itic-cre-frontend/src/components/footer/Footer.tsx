export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-xs text-slate-400 dark:text-slate-600">
          © {new Date().getFullYear()} ITIC CRE — Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
