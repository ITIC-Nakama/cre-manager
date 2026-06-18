interface Props {
    nom: string;
    couleur?: string | null;
    className?: string;
}

export default function StatusBadge({ nom, couleur, className = '' }: Props) {
    const color = couleur || '#9CA3AF';
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${className}`}
            style={{ backgroundColor: `${color}1A`, color }}
        >
            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {nom}
        </span>
    );
}
