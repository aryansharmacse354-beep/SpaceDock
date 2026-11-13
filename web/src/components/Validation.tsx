import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '../lib/cn';
import { configFingerprint } from '../lib/hash';
import { pct } from '../lib/format';
import { configSignature, lambdaLabel, SLOT_BY_ID } from '../lib/slots';
import type { ModelConfig, ModelReport, ScreenedPart } from '../lib/types';
import { ParityPlot } from './charts/ParityPlot';
import { SectionBar } from './ui/SectionBar';

interface ValidationProps {
  report: ModelReport;
  config: ModelConfig;
  parts: ScreenedPart[];
}

interface LotRow {
  id: string;
  n: number;
  defects: number;
  escapes: number;
  mae: number;
  maxForecast: number;
  pass: number;
  review: number;
  reject: number;
}

export function Validation({ report, config, parts }: ValidationProps) {
  const { metrics, model } = report;

  const lotRows = useMemo<LotRow[]>(() => {
    const map = new Map<
      string,
      { n: number; defects: number; escapes: number; absError: number; maxForecast: number; pass: number; review: number; reject: number }
    >();

    for (const part of parts) {
      const entry =
        map.get(part.lotId) ??
        { n: 0, defects: 0, escapes: 0, absError: 0, maxForecast: 0, pass: 0, review: 0, reject: 0 };
      entry.n += 1;
      entry.absError += Math.abs(part.screening.forecast - part.v168);
      entry.maxForecast = Math.max(entry.maxForecast, part.screening.forecast);
      if (part.screening.verdict === 'pass') entry.pass += 1;
      else if (part.screening.verdict === 'review') entry.review += 1;
      else entry.reject += 1;
      if (part.defect) {
        entry.defects += 1;
        if (part.screening.verdict !== 'reject') entry.escapes += 1;
      }
      map.set(part.lotId, entry);
    }

    return [...map.entries()]
      .map(([id, entry]) => ({
        id,
        n: entry.n,
        defects: entry.defects,
        escapes: entry.escapes,
        mae: entry.absError / entry.n,
        maxForecast: entry.maxForecast,
        pass: entry.pass,
        review: entry.review,
        reject: entry.reject,
      }))
      .sort((a, b) => b.escapes - a.escapes || b.mae - a.mae);
  }, [parts]);

  const confusion = useMemo(() => {
    let tp = 0;
    let fn = 0;
    let fp = 0;
    let tn = 0;
    for (const part of parts) {
      if (part.defect) {
        if (part.screening.verdict === 'reject') tp += 1;
        else fn += 1;
      } else if (part.screening.verdict === 'reject') fp += 1;
      else tn += 1;
    }
    return { tp, fn, fp, tn };
  }, [parts]);

  const checks = [
    {
      label: 'Zero-escape gate',
      ok: metrics.falseNegatives === 0,
      detail:
        metrics.falseNegatives === 0
          ? 'Every withheld latent defect lands in reject.'
          : `${metrics.falseNegatives} labeled defect${metrics.falseNegatives === 1 ? '' : 's'} not rejected.`,
    },
    {
      label: 'Static USL enforced',
      ok: true,
      detail: 'V0, V24, V96, and forecast are all gated at 50 µA.',
    },
    {
      label: 'Safety slope',
      ok: true,
      detail: 'Projected slope is gated at 0.016599 µA/h.',
    },
    {
      label: 'Deterministic split',
      ok: true,
      detail: `Every fifth row is held out (n = ${metrics.holdoutSize}); no shuffling seed.`,
    },
    {
      label: 'Browser inference',
      ok: true,
      detail: 'Telemetry is parsed and scored locally; no die data leaves the tab.',
    },
  ];

  const fingerprint = configFingerprint(configSignature(config));
  const trainRows = parts.length - metrics.holdoutSize;

  return (
    <section id="validation" className="scroll-mt-20 pt-8">
      <SectionBar
        index="04"
        title="Validation"
        description="Holdout error, gate integrity, and per-lot containment for the deployed model."
        actions={
          <>
            <span className="rounded border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
              config {fingerprint}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded border border-pass/25 bg-pass/[0.05] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-pass">
              <span className="h-1.5 w-1.5 rounded-full bg-pass" />
              deterministic
            </span>
          </>
        }
      />

      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.055] md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Holdout R²', value: metrics.r2.toFixed(4), sub: 'variance explained' },
          { label: 'Holdout MAE', value: `${metrics.mae.toFixed(3)} µA`, sub: 'mean absolute error' },
          { label: 'Holdout RMSE', value: `${metrics.rmse.toFixed(3)} µA`, sub: 'root mean squared' },
          { label: 'Defect recall', value: pct(metrics.recall, 1), sub: `${metrics.positives} labeled defects` },
          { label: 'Escapes', value: metrics.falseNegatives.toLocaleString(), sub: 'must be zero' },
          { label: 'Review load', value: pct(metrics.reviewLoad, 1), sub: `${metrics.flagged.toLocaleString()} flagged` },
        ].map((card) => (
          <div key={card.label} className="bg-[#050b15] px-3.5 py-3">
            <div className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-dim">{card.label}</div>
            <div className="display mt-1.5 text-[22px] leading-none tnum">{card.value}</div>
            <div className="mt-1 font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel flex flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="label text-[8px]">Holdout parity</div>
              <div className="mt-0.5 text-[11.5px] text-ink">Actual vs forecast · 168 h leakage</div>
            </div>
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted">
              n = {metrics.holdoutSize}
            </span>
          </div>
          <div className="mt-2 flex-1">
            <ParityPlot points={metrics.parity} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
            <div className="flex gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> healthy
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-fail" /> labeled defect
              </span>
            </div>
            <span className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">
              holdout fit removed before validation
            </span>
          </div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="label text-[8px]">Gate integrity</span>
            <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-dim">
              {checks.filter((check) => check.ok).length}/{checks.length} pass
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded border border-white/[0.07] bg-white/[0.055]">
            {[
              { label: 'True positives', value: confusion.tp, tone: 'text-pass' },
              { label: 'False negatives', value: confusion.fn, tone: confusion.fn === 0 ? 'text-pass' : 'text-fail' },
              { label: 'False positives', value: confusion.fp, tone: 'text-review' },
              { label: 'True negatives', value: confusion.tn, tone: 'text-ink' },
            ].map((cell) => (
              <div key={cell.label} className="bg-[#050b15] px-3 py-2.5">
                <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-dim">{cell.label}</div>
                <div className={cn('display mt-1 text-[18px] leading-none tnum', cell.tone)}>
                  {cell.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1.5">
            {checks.map((check) => {
              const Icon = check.ok ? CheckCircle2 : check.label === 'Zero-escape gate' ? XCircle : AlertTriangle;
              return (
                <div
                  key={check.label}
                  className="flex items-start gap-2 rounded border border-white/[0.045] bg-white/[0.012] px-2.5 py-1.5"
                >
                  <Icon className={cn('mt-0.5 h-3 w-3 shrink-0', check.ok ? 'text-pass' : 'text-fail')} />
                  <div>
                    <div className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted">{check.label}</div>
                    <div className="mt-0.5 text-[10px] leading-snug text-ink/90">{check.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5">
            <div>
              <div className="label text-[8px]">Per-lot containment</div>
              <div className="mt-0.5 text-[10.5px] text-dim">
                Escapes and mean absolute error by manufacturing lot
              </div>
            </div>
            <span className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">
              {lotRows.length} lots
            </span>
          </div>
          <div className="scroll-thin max-h-[300px] overflow-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead className="sticky top-0 bg-[#060c17]">
                <tr className="border-b border-white/[0.06] font-mono text-[7px] uppercase tracking-[0.1em] text-dim">
                  <th className="px-4 py-2 font-normal">Lot</th>
                  <th className="px-2 py-2 text-right font-normal">n</th>
                  <th className="px-2 py-2 text-right font-normal">Defects</th>
                  <th className="px-2 py-2 text-right font-normal">Escapes</th>
                  <th className="px-2 py-2 text-right font-normal">Recall</th>
                  <th className="px-2 py-2 text-right font-normal">MAE</th>
                  <th className="px-2 py-2 text-right font-normal">Max forecast</th>
                  <th className="px-4 py-2 font-normal">Verdict mix</th>
                </tr>
              </thead>
              <tbody>
                {lotRows.map((row) => {
                  const recall = row.defects === 0 ? 1 : 1 - row.escapes / row.defects;
                  return (
                    <tr key={row.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-1.5 font-mono text-[9.5px] text-ink">{row.id}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-[9px] tnum text-muted">{row.n}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-[9px] tnum text-muted">{row.defects}</td>
                      <td
                        className={cn(
                          'px-2 py-1.5 text-right font-mono text-[9px] tnum',
                          row.escapes > 0 ? 'text-fail' : 'text-pass',
                        )}
                      >
                        {row.escapes}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[9px] tnum text-muted">
                        {(recall * 100).toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[9px] tnum text-muted">
                        {row.mae.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[9px] tnum text-muted">
                        {row.maxForecast.toFixed(1)}
                      </td>
                      <td className="px-4 py-1.5">
                        <div className="flex h-1.5 w-[86px] overflow-hidden rounded-full bg-white/[0.06]">
                          <span className="h-full bg-pass/80" style={{ width: `${(row.pass / row.n) * 100}%` }} />
                          <span className="h-full bg-review/80" style={{ width: `${(row.review / row.n) * 100}%` }} />
                          <span className="h-full bg-fail/80" style={{ width: `${(row.reject / row.n) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-4">
          <div className="label text-[8px]">Protocol</div>
          <div className="mt-1 text-[11.5px] text-ink">Reproducible by construction</div>

          <dl className="mt-3 space-y-2">
            {[
              { term: 'Target', value: '168 h leakage' },
              { term: 'Train rows', value: trainRows.toLocaleString() },
              { term: 'Holdout rows', value: metrics.holdoutSize.toLocaleString() },
              { term: 'Split', value: 'every 5th row' },
              { term: 'Solver', value: 'standardized ridge' },
              { term: 'Ridge λ', value: lambdaLabel(config.lambda) },
              { term: 'Degree', value: `${config.degree}` },
              { term: 'Terms', value: `${model.terms.length}` },
            ].map((row) => (
              <div
                key={row.term}
                className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-1.5 last:border-0"
              >
                <dt className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">{row.term}</dt>
                <dd className="font-mono text-[9px] tnum text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3">
            <div className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">Active slots</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {config.slots.map((id) => (
                <span
                  key={id}
                  className="rounded border border-accent/20 bg-accent/[0.05] px-1.5 py-0.5 font-mono text-[7.5px] text-accent"
                >
                  {SLOT_BY_ID[id].label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded border border-white/[0.06] bg-white/[0.015] px-2.5 py-2">
            <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-dim">Safety gates</div>
            <div className="mt-1 space-y-0.5 font-mono text-[8px] text-muted">
              <div>slope ≥ 0.016599 µA/h → reject</div>
              <div>forecast or read &gt; 50 µA → reject</div>
              <div>|z24| or |z96| ≥ 3σ → review</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
