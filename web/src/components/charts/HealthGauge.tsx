import type { Verdict } from '../../lib/types';
import { verdictMeta } from '../ui/Verdict';

export function HealthGauge({ score, verdict }: { score: number; verdict: Verdict }) {
  const color = verdictMeta[verdict].hex;

  return (
    <div className="relative flex h-[142px] w-[142px] items-center justify-center">
      <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full">
        <circle
          cx="80"
          cy="80"
          r="64"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="7"
          pathLength={100}
          strokeDasharray="75 25"
          strokeLinecap="round"
          transform="rotate(135 80 80)"
        />
        <circle
          cx="80"
          cy="80"
          r="64"
          fill="none"
          stroke={color}
          strokeWidth="7"
          pathLength={100}
          strokeDasharray={`${Math.max(1, score * 0.75)} 100`}
          strokeLinecap="round"
          transform="rotate(135 80 80)"
          style={{ filter: `drop-shadow(0 0 6px ${color}66)`, transition: 'stroke-dasharray 600ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className="display text-[34px] leading-none tnum" style={{ color }}>
          {score}
        </span>
        <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-dim">AI health score</span>
      </div>
    </div>
  );
}
