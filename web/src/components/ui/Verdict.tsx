import { cn } from '../../lib/cn';
import type { Verdict } from '../../lib/types';

export const verdictMeta: Record<
  Verdict,
  { label: string; text: string; bg: string; border: string; dot: string; hex: string }
> = {
  pass: {
    label: 'PASS',
    text: 'text-pass',
    bg: 'bg-pass/10',
    border: 'border-pass/30',
    dot: 'bg-pass',
    hex: '#45e6a5',
  },
  review: {
    label: 'REVIEW',
    text: 'text-review',
    bg: 'bg-review/10',
    border: 'border-review/30',
    dot: 'bg-review',
    hex: '#ffbf5a',
  },
  reject: {
    label: 'REJECT',
    text: 'text-fail',
    bg: 'bg-fail/10',
    border: 'border-fail/30',
    dot: 'bg-fail',
    hex: '#ff5f7e',
  },
};

export function VerdictBadge({
  verdict,
  className,
  showDot = true,
}: {
  verdict: Verdict;
  className?: string;
  showDot?: boolean;
}) {
  const meta = verdictMeta[verdict];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]',
        meta.bg,
        meta.border,
        meta.text,
        className,
      )}
    >
      {showDot ? <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} /> : null}
      {meta.label}
    </span>
  );
}
