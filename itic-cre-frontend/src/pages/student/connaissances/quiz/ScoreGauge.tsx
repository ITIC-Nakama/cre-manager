import { useEffect, useState } from 'react';

interface ScoreGaugeProps {
  score: number;
  passed: boolean;
}

export default function ScoreGauge({ score, passed }: ScoreGaugeProps) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(score));
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;

  return (
    <div className="relative h-36 w-36 flex-shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx={60} cy={60} r={radius} fill="none" strokeWidth={10} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
        <circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={passed ? 'text-emerald-500' : 'text-red-500'}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{score}%</span>
      </div>
    </div>
  );
}
