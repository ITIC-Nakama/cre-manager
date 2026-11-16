import { useMemo } from 'react';
import { IDF_DEPARTMENTS } from './idfDepartments';

type Ring = number[][];

/** Anneaux extérieurs d'un Polygon ou d'un MultiPolygon. */
function outerRings(type: string, coordinates: unknown): Ring[] {
    return type === 'Polygon' ? [(coordinates as Ring[])[0]] : (coordinates as Ring[][]).map((poly) => poly[0]);
}

const WIDTH = 560;
const COS_LAT = Math.cos((48.7 * Math.PI) / 180);

/**
 * Carte SVG des 8 départements d'Île-de-France (contours intégrés, aucune tuile externe). Couleur selon le nombre
 * d'étudiants ; un clic (ou Entrée) sélectionne le département.
 */
export default function IdfMap({ counts, selected, onSelect, label }: {
    counts: Record<string, number>;
    selected: string | null;
    onSelect: (code: string) => void;
    label: (code: string, name: string, count: number) => string;
}) {
    const shapes = useMemo(() => {
        const all = IDF_DEPARTMENTS.flatMap((d) => outerRings(d.type, d.coordinates)).flat();
        const minLon = Math.min(...all.map((p) => p[0]));
        const maxLon = Math.max(...all.map((p) => p[0]));
        const minLat = Math.min(...all.map((p) => p[1]));
        const maxLat = Math.max(...all.map((p) => p[1]));
        const scale = WIDTH / ((maxLon - minLon) * COS_LAT);
        const project = (p: number[]) => [(p[0] - minLon) * COS_LAT * scale, (maxLat - p[1]) * scale];
        const height = (maxLat - minLat) * scale;
        return {
            height,
            departments: IDF_DEPARTMENTS.map((d) => {
                const rings = outerRings(d.type, d.coordinates).map((r) => r.map(project));
                const path = rings.map((r) => `M${r.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}Z`).join('');
                const main = rings.reduce((a, b) => (b.length > a.length ? b : a));
                const cx = main.reduce((s, p) => s + p[0], 0) / main.length;
                const cy = main.reduce((s, p) => s + p[1], 0) / main.length;
                return { code: d.code, name: d.name, path, cx, cy };
            }),
        };
    }, []);
    const max = Math.max(1, ...Object.values(counts));

    return (
        <svg viewBox={`-10 -10 ${WIDTH + 20} ${shapes.height + 20}`} className="w-full h-auto" role="group"
            aria-label="Île-de-France">
            {shapes.departments.map((d) => {
                const count = counts[d.code] ?? 0;
                const intensity = count === 0 ? 0 : 0.18 + 0.72 * (count / max);
                const isSelected = selected === d.code;
                return (
                    <g key={d.code} role="button" tabIndex={0} aria-pressed={isSelected} aria-label={label(d.code, d.name, count)}
                        className="cursor-pointer focus:outline-none group"
                        onClick={() => onSelect(d.code)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(d.code); } }}>
                        <title>{label(d.code, d.name, count)}</title>
                        <path d={d.path}
                            className={`${count === 0 ? 'fill-slate-100 dark:fill-slate-800' : 'fill-[#3f74ff]'} stroke-white dark:stroke-slate-950 group-hover:brightness-110 group-focus-visible:stroke-amber-400`}
                            fillOpacity={count === 0 ? 1 : intensity} strokeWidth={isSelected ? 4 : 1.5}
                            style={isSelected ? { stroke: '#f59e0b' } : undefined} />
                        {d.code !== '75' && (
                            <text x={d.cx} y={d.cy} textAnchor="middle" className="pointer-events-none select-none">
                                <tspan x={d.cx} dy="-0.2em" className="fill-slate-700 dark:fill-slate-200 text-[15px] font-bold">{d.code}</tspan>
                                <tspan x={d.cx} dy="1.2em" className="fill-slate-600 dark:fill-slate-300 text-[13px]">{count}</tspan>
                            </text>
                        )}
                    </g>
                );
            })}
            {/* Paris est trop petit pour son étiquette : elle est placée à côté, reliée par un trait. */}
            {(() => {
                const paris = shapes.departments.find((d) => d.code === '75');
                if (!paris) return null;
                return (
                    <g className="pointer-events-none select-none">
                        <line x1={paris.cx} y1={paris.cy} x2={paris.cx - 58} y2={paris.cy - 40} className="stroke-slate-400" strokeWidth={1} />
                        <text x={paris.cx - 62} y={paris.cy - 44} textAnchor="end" className="fill-slate-700 dark:fill-slate-200 text-[14px] font-bold">
                            75 · {counts['75'] ?? 0}
                        </text>
                    </g>
                );
            })()}
        </svg>
    );
}
