import { Construction } from 'lucide-react';

export default function ComingSoonPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
            <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Construction className="h-10 w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">En cours de développement</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                Cette fonctionnalité sera disponible prochainement.
            </p>
        </div>
    );
}
