import { Check, Minus, Play, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../lib/cn';
import { equationTerms, buildModelReport } from '../lib/model';
import {
  configSignature,
  DEFAULT_CONFIG,
  lambdaLabel,
  normalizeConfig,
  SLOT_BY_ID,
  SLOT_LIBRARY,
} from '../lib/slots';
import type { ModelConfig, ModelReport, PartRecord } from '../lib/types';
import { ParityPlot } from './charts/ParityPlot';
import { SectionBar } from './ui/SectionBar';

interface ModelLabProps {
  records: PartRecord[];
  active: ModelReport;
  activeConfig: ModelConfig;
  onDeploy: (config: ModelConfig) => void;
}

interface MetricRow {
  label: string;
  value: string;
  live: string;
  delta: string | null;
  improved: boolean | null;
}

function buildRows(candidate: ModelReport, active: ModelReport): MetricRow[] {
  const c = candidate.metrics;
  const a = active.metrics;
  const rows: Array<{
    label: string;
    next: number;
    live: number;
    format: (value: number) => string;
    scale: number;
    digits: number;
    suffix: string;
    higherIsBetter: boolean;
  }> = [
    { label: 'Holdout R²', next: c.r2, live: a.r2, format: (v) => v.toFixed(4), scale: 1, digits: 4, suffix: '', higherIsBetter: true },
    { label: 'Holdout MAE', next: c.mae, live: a.mae, format: (v) => `${v.toFixed(3)} µA`, scale: 1, digits: 3, suffix: ' µA', higherIsBetter: false },
    { label: 'Holdout RMSE', next: c.rmse, live: a.rmse, format: (v) => `${v.toFixed(3)} µA`, scale: 1, digits: 3, suffix: ' µA', higherIsBetter: false },
    { label: 'Defect recall', next: c.recall, live: a.recall, format: (v) => `${(v * 100).toFixed(1)}%`, scale: 100, digits: 1, suffix: ' pp', higherIsBetter: true },
    { label: 'Escapes', next: c.falseNegatives, live: a.falseNegatives, format: (v) => v.toLocaleString(), scale: 1, digits: 0, suffix: '', higherIsBetter: false },
    { label: 'Review load', next: c.reviewLoad, live: a.reviewLoad, format: (v) => `${(v * 100).toFixed(1)}%`, scale: 100, digits: 1, suffix: ' pp', higherIsBetter: false },
  ];

  return rows.map((row) => {
    const delta = (row.next - row.live) * row.scale;
    const improved = Math.abs(delta) < 1e-9 ? null : row.higherIsBetter ? delta > 0 : delta < 0;
    return {
      label: row.label,
      value: row.format(row.next),
      live: row.format(row.live),
      delta: Math.abs(delta) < 1e-9 ? null : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(row.digits)}${row.suffix}`,
      improved,
    };
  });
}

export function ModelLab({ records, active, activeConfig, onDeploy }: ModelLabProps) {
  const [draft, setDraft] = useState<ModelConfig>(activeConfig);
  const [showSlots, setShowSlots] = useState(false);

  const activeSignature = configSignature(activeConfig);

  useEffect(() => {
    setDraft(activeConfig);
  }, [activeSignature]);

  const normalized = useMemo(() => normalizeConfig(draft), [draft]);
  const dirty = configSignature(normalized) !== activeSignature;
  const candidate = useMemo(() => buildModelReport(records, normalized), [records, normalized]);
  const rows = useMemo(() => buildRows(candidate, active), [candidate, active]);

  const toggleSlot = (id: ModelConfig['slots'][number]) => {
    setDraft((current) => {
      const normalizedCurrent = normalizeConfig(current);
      if (normalizedCurrent.slots.includes(id)) {
        if (normalizedCurrent.slots.length <= 1) return normalizedCurrent;
        return { ...normalizedCurrent, slots: normalizedCurrent.slots.filter((slot) => slot !== id) };
      }
      return { ...normalizedCurrent, slots: [...normalizedCurrent.slots, id] };
    });
  };

  const deploy = () => {
    if (!dirty) return;
    onDeploy(normalized);
  };

  return (
    <section id="model-lab" className="scroll-mt-20 pt-8">
      <SectionBar
        index="02"
        title="Model lab"
        description="Add or remove input slots, change the polynomial degree, tune the ridge penalty, then deploy."
        actions={
          <>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em]',
                dirty ? 'border-review/30 bg-review/[0.06] text-review' : 'border-pass/25 bg-pass/[0.05] text-pass',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', dirty ? 'bg-review' : 'bg-pass')} />
              {dirty ? 'candidate not deployed' : 'candidate matches live'}
            </span>
            <button
              type="button"
              onClick={deploy}
              disabled={!dirty}
              className={cn(
                'inline-flex items-center gap-1.5 rounded px-3 py-2 font-mono text-[8.5px] uppercase tracking-[0.1em] transition-colors',
                dirty
                  ? 'bg-accent text-[#03131a] hover:bg-[#8df0ff]'
                  : 'cursor-not-allowed border border-white/[0.07] bg-white/[0.02] text-dim',
              )}
            >
              <Play className="h-3 w-3" />
              Deploy to workbench
            </button>
          </>
        }
      />

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
        <div className="panel min-w-0 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="label text-[8.5px]">Feature configuration</span>
            <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">
              {normalized.slots.length} / {SLOT_LIBRARY.length} slots
            </span>
          </div>

          <div className="mt-2.5 space-y-1">
            {SLOT_LIBRARY.map((slot) => {
              const included = normalized.slots.includes(slot.id);
              const locked = included && normalized.slots.length <= 1;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => toggleSlot(slot.id)}
                  disabled={locked}
                  className={cn(
                    'w-full rounded border px-2.5 py-2 text-left transition-colors',
                    included
                      ? 'border-accent/30 bg-accent/[0.06]'
                      : 'border-white/[0.07] bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.035]',
                    locked && 'cursor-not-allowed',
                  )}
                  aria-pressed={included}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className={cn('font-mono text-[9.5px]', included ? 'text-accent' : 'text-ink')}>
                        {slot.label}
                      </span>
                      <span className="min-w-0 truncate text-[10px] text-muted">{slot.title}</span>
                      <span className="rounded border border-white/[0.07] px-1 font-mono text-[6.5px] uppercase tracking-[0.08em] text-dim">
                        {slot.kind}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        included
                          ? 'border-accent/40 bg-accent/15 text-accent'
                          : 'border-white/15 text-dim',
                      )}
                    >
                      {included ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[9px] leading-snug text-dim">{slot.detail}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">Polynomial degree</span>
              <div className="flex rounded border border-white/[0.08] bg-[#060c17] p-0.5">
                {([1, 2] as const).map((degree) => (
                  <button
                    key={degree}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...normalizeConfig(current), degree }))}
                    className={cn(
                      'rounded px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.08em] transition-colors',
                      normalized.degree === degree ? 'bg-white/[0.08] text-ink' : 'text-dim hover:text-muted',
                    )}
                  >
                    deg {degree}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">Ridge λ</span>
                <span className="font-mono text-[9.5px] tnum text-ink">{lambdaLabel(normalized.lambda)}</span>
              </div>
              <input
                type="range"
                min={-12}
                max={0}
                step={0.1}
                value={Math.log10(normalized.lambda)}
                onChange={(event) => {
                  const lambda = Number((10 ** Number(event.target.value)).toPrecision(3));
                  setDraft((current) => ({ ...normalizeConfig(current), lambda }));
                }}
                className="range mt-1.5"
                aria-label="Ridge lambda exponent"
              />
              <div className="mt-0.5 flex justify-between font-mono text-[7px] uppercase tracking-[0.08em] text-dim">
                <span>1e-12 · no shrink</span>
                <span>1e0 · heavy</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setDraft(DEFAULT_CONFIG)}
                className="inline-flex items-center justify-center gap-1.5 rounded border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-muted transition-colors hover:border-accent/30 hover:text-ink"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                Default
              </button>
              <button
                type="button"
                onClick={() => setDraft(activeConfig)}
                disabled={!dirty}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 font-mono text-[8px] uppercase tracking-[0.08em] transition-colors',
                  dirty
                    ? 'border-white/[0.08] bg-white/[0.02] text-muted hover:border-accent/30 hover:text-ink'
                    : 'cursor-not-allowed border-white/5 text-dim',
                )}
              >
                <Minus className="h-2.5 w-2.5" />
                Revert
              </button>
            </div>

            <div className="mt-3 rounded border border-white/[0.06] bg-white/[0.015] px-2.5 py-2">
              <div className="flex items-center justify-between font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">
                <span>live config</span>
                <span className="text-ink">
                  {activeConfig.slots.length} slots · deg {activeConfig.degree}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {activeConfig.slots.map((id) => (
                  <span
                    key={id}
                    className="rounded border border-pass/20 bg-pass/[0.06] px-1.5 py-0.5 font-mono text-[7.5px] text-pass"
                  >
                    {SLOT_BY_ID[id].label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="label text-[8.5px]">Candidate validation</span>
              <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">
                every-5th-row holdout · n = {candidate.metrics.holdoutSize}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-px overflow-hidden rounded border border-white/[0.07] bg-white/[0.055] md:grid-cols-3 xl:grid-cols-6">
              {rows.map((row) => (
                <div key={row.label} className="bg-[#050b15] px-3 py-2.5">
                  <div className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">{row.label}</div>
                  <div className="mt-1 font-mono text-[14px] tnum text-ink">{row.value}</div>
                  <div className="mt-0.5 flex items-center justify-between gap-1 font-mono text-[7px] uppercase tracking-[0.06em]">
                    <span className="text-dim">live {row.live}</span>
                    {row.delta ? (
                      <span className={row.improved === null ? 'text-dim' : row.improved ? 'text-pass' : 'text-fail'}>
                        {row.delta}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="panel flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="label text-[8px]">Candidate parity</div>
                  <div className="mt-0.5 text-[11px] text-muted">Actual vs forecast · 168 h leakage</div>
                </div>
                <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted">
                  n = {candidate.metrics.holdoutSize}
                </span>
              </div>
              <div className="mt-2 flex-1">
                <ParityPlot points={candidate.metrics.parity} />
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
                  refit on all traces after holdout
                </span>
              </div>
            </div>

            <div className="panel flex flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="label text-[8px]">Coefficients</span>
                <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">
                  {candidate.model.terms.length} terms
                </span>
              </div>
              <div className="scroll-thin mt-2 max-h-[230px] flex-1 overflow-auto rounded border border-white/[0.06] bg-black/25">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-[#060c17]">
                    <tr className="font-mono text-[7px] uppercase tracking-[0.1em] text-dim">
                      <th className="px-2 py-1.5 font-normal">Term</th>
                      <th className="px-2 py-1.5 text-right font-normal">Coefficient</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidate.model.terms.map((term, index) => (
                      <tr key={term} className="border-t border-white/[0.035]">
                        <td className="px-2 py-1 font-mono text-[8.5px] text-muted">{term}</td>
                        <td className="px-2 py-1 text-right font-mono text-[8.5px] tnum text-ink">
                          {(candidate.model.coef[index] ?? 0).toExponential(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 font-mono text-[7px] uppercase tracking-[0.08em] text-dim">
                standardized ridge solve · converted to raw units
              </div>
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="label text-[8px]">Candidate forecast function</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-pass">
                <span className="h-1.5 w-1.5 rounded-full bg-pass" />
                fit in browser
              </span>
            </div>
            <div className="scroll-thin mt-2 overflow-x-auto rounded border border-white/[0.06] bg-black/30 px-3 py-2.5">
              <div className="whitespace-nowrap font-mono text-[10.5px] leading-relaxed text-muted">
                <span className="text-accent">ŷ₁₆₈</span> = {equationTerms(candidate.model)}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">
              <span>{normalized.slots.length} input slots</span>
              <span className="h-1 w-1 rounded-full bg-dim/50" />
              <span>{candidate.model.terms.length} coefficients</span>
              <span className="h-1 w-1 rounded-full bg-dim/50" />
              <span>degree {normalized.degree}</span>
              <span className="h-1 w-1 rounded-full bg-dim/50" />
              <span>λ {lambdaLabel(normalized.lambda)}</span>
              <span className="h-1 w-1 rounded-full bg-dim/50" />
              <span>deterministic split</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setShowSlots((value) => !value)}
          className="inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-dim transition-colors hover:text-muted"
          aria-expanded={showSlots}
        >
          <SlidersHorizontal className="h-3 w-3" />
          {showSlots ? 'hide' : 'show'} slot reference
        </button>
      </div>
      {showSlots ? (
        <div className="panel mt-2 grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {SLOT_LIBRARY.map((slot) => (
            <div key={slot.id} className="rounded border border-white/[0.06] bg-white/[0.015] p-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[9px] text-ink">{SLOT_BY_ID[slot.id].label}</span>
                <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-dim">{slot.unit}</span>
              </div>
              <div className="mt-1 text-[9.5px] leading-snug text-muted">{slot.detail}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
