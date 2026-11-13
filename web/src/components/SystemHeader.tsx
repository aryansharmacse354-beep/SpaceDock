import { Activity, ShieldCheck } from 'lucide-react';
import { pct } from '../lib/format';
import type { ModelMetrics, ModelConfig } from '../lib/types';
import { configLabel } from '../lib/slots';
import { cn } from '../lib/cn';

interface SystemHeaderProps {
  total: number;
  lots: number;
  metrics: ModelMetrics | null;
  config: ModelConfig;
  ready: boolean;
}

export function SystemHeader({ total, lots, metrics, config, ready }: SystemHeaderProps) {
  const cells = [
    {
      label: 'Fleet screened',
      value: total.toLocaleString(),
      sub: `${lots} manufacturing lots`,
      tone: 'text-ink',
    },
    {
      label: 'Latent defects',
      value: metrics ? metrics.positives.toLocaleString() : '—',
      sub: 'withheld labels',
      tone: 'text-ink',
    },
    {
      label: 'Defect recall',
      value: metrics ? pct(metrics.recall, 1) : '—',
      sub: metrics ? `${metrics.falseNegatives} escapes` : 'holdout gate',
      tone: metrics && metrics.recall >= 0.999 ? 'text-pass' : 'text-review',
    },
    {
      label: 'Review load',
      value: metrics ? pct(metrics.reviewLoad, 1) : '—',
      sub: metrics ? `${metrics.flagged.toLocaleString()} flagged` : 'human hold',
      tone: 'text-ink',
    },
  ];

  return (
    <div id="top" className="pt-[84px]">
      <div className="flex flex-wrap items-end justify-between gap-4 py-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.2em] text-accent/85">
            <Activity className="h-3 w-3" />
            SPACEDOCK · ESS-01 / PRODUCTION SCREENING
          </div>
          <h1 className="display mt-2 text-[clamp(1.5rem,2.6vw,2.1rem)] leading-none">
            Iddq drift screening station
          </h1>
          <p className="mt-2 max-w-2xl text-[11.5px] leading-relaxed text-muted">
            Lot-aware 24 h snapshot, 168 h forecast, and a gate verdict for every die. Change the model input
            slots and the entire station re-fits in place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.13em] text-muted">
            <span className={cn('h-1.5 w-1.5 rounded-full', ready ? 'bg-pass' : 'bg-amber')} />
            {ready ? 'engine live' : 'loading feed'}
          </span>
          <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.13em] text-muted">
            model · {configLabel(config)}
          </span>
          <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.13em] text-muted">
            125.0 °C · 168 h
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-pass/25 bg-pass/[0.06] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.13em] text-pass">
            <ShieldCheck className="h-3 w-3" />
            MIL-STD-883
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.055] lg:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.label} className="bg-[#050b15] px-4 py-3">
            <div className="font-mono text-[8px] uppercase tracking-[0.15em] text-dim">{cell.label}</div>
            <div className={cn('display mt-1.5 text-[24px] leading-none tnum', cell.tone)}>{cell.value}</div>
            <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">{cell.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
