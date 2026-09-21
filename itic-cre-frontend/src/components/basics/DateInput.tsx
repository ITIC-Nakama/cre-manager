import { useRef } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    min?: string;
    max?: string;
    error?: boolean;
    dense?: boolean;
}

/** input[type=date] natif : sur iOS Safari, une fois stylé (background/color forcés en dark mode,
  * voir index.css), il ignore sa propre largeur CSS et déborde de son conteneur en cachant l'icône
  * calendrier native. `appearance-none` désactive ce rendu natif fautif ; l'icône est donc redessinée
  * manuellement ici. Composant unique pour ne pas répéter ce contournement à chaque usage.
  * L'icône native Chromium (::-webkit-calendar-picker-indicator, masquée dans index.css) restait
  * visible par-dessus malgré appearance-none, donnant deux icônes dont une seule cliquable — l'icône
  * redessinée ici prend donc le relais du clic via showPicker(). */
export default function DateInput({ id, value, onChange, disabled, min, max, error, dense }: DateInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative min-w-0">
            <input
                ref={inputRef}
                id={id}
                type="date"
                value={value}
                min={min}
                max={max}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full min-w-0 appearance-none rounded-xl bg-slate-50 dark:bg-slate-950 border text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 ${
                    dense ? 'rounded-lg px-2 py-1.5 pr-7 text-sm' : 'px-3 py-2 pr-9 text-sm'
                } ${error ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'}`}
            />
            <button
                type="button"
                tabIndex={-1}
                disabled={disabled}
                onClick={() => inputRef.current?.showPicker?.()}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 disabled:cursor-not-allowed ${dense ? 'right-2' : 'right-3'} ${disabled ? '' : 'cursor-pointer'}`}
            >
                <Calendar className={dense ? 'h-4 w-4' : 'h-5 w-5'} />
            </button>
        </div>
    );
}
