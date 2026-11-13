import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Plus,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  X,
  XCircle,
} from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { cn } from '../lib/cn';
import { fmt } from '../lib/format';
import { SAFETY_SLOPE, USL } from '../lib/model';
import { lambdaLabel, SLOT_BY_ID, SLOT_LIBRARY, configLabel } from '../lib/slots';
import type {
  ConsoleInput,
  DriftModel,
  LotProfile,
  ModelMetrics,
  ScreeningResult,
  ScreenedPart,
  Signals,
  SlotId,
} from '../lib/types';
import { HealthGauge } from './charts/HealthGauge';
import { TrajectoryChart } from './charts/TrajectoryChart';
import { HeroScene } from './three/HeroScene';
import { VerdictBadge, verdictMeta } from './ui/Verdict';

interface WorkbenchProps {
  lots: LotProfile[];
  parts: ScreenedPart[];
  input: ConsoleInput;
  onChange: (input: ConsoleInput) => void;
  onReset: () => void;
  lot: LotProfile;
  result: ScreeningResult | null;
  model: DriftModel | null;
  metrics: ModelMetrics | null;
  ready: boolean;
  highlight: boolean;
  certificateId: string | null;
  onOpenQa: () => void;
  onAddSlot: (id: SlotId) => void;
  onRemoveSlot: (id: SlotId) => void;
}

const stateIcon = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
} as const;

const stateColor = {
  ok: 'text-pass',
  warn: 'text-review',
  bad: 'text-fail',
} as const;

const round = (value: number) => Number(value.toFixed(3));

const RANGE_MAX = 130;

export function Workbench({
  lots,
  parts,
  input,
  onChange,
  onReset,
  lot,
  result,
  model,
  metrics,
  ready,
  highlight,
  certificateId,
  onOpenQa,
  onAddSlot,
  onRemoveSlot,
}: WorkbenchProps) {
  const [adding, setAdding] = useState(false);

  const verdictColor = result ? verdictMeta[result.verdict].hex : '#8ea0b9';
  const slopeRatio = result ? Math.min(1, Math.max(0, result.slope / SAFETY_SLOPE)) : 0;
  const slots = model?.config.slots ?? [];
  const unusedSlots = SLOT_LIBRARY.filter((slot) => !slots.includes(slot.id));
  const usesLateRead = slots.some((id) => id === 'v96' || id === 'slope2496' || id === 'z96');

  const setReading = (key: keyof Signals, value: number) => {
    const safe = Number.isFinite(value) ? Math.min(RANGE_MAX, Math.max(0, value)) : 0;
    onChange({ ...input, [key]: safe });
  };

  const selectLot = (lotId: string) => {
    const next = lots.find((profile) => profile.id === lotId) ?? lot;
    onChange({
      lotId,
      v0: round(next.mean + 0.15),
      v24: round(next.mean + 0.34),
      v96: round(next.mean + 0.55),
    });
  };

  const loadPart = (part: ScreenedPart) => {
    onChange({ lotId: part.lotId, v0: part.v0, v24: part.v24, v96: part.v96, partId: part.partId });
  };

  const latentSample = parts
    .filter((part) => part.defect && part.v0 <= USL && part.v24 <= USL && part.v96 <= USL)
    .sort((a, b) => a.v168 - b.v168)[0];
  const grossSample = [...parts].sort((a, b) => b.v0 - a.v0)[0];

  const presets = [
    {
      label: 'Nominal',
      icon: CheckCircle2,
      action: () =>
        onChange({
          lotId: input.lotId,
          v0: round(lot.mean + 0.15),
          v24: round(lot.mean + 0.34),
          v96: round(lot.mean + 0.55),
        }),
    },
    {
      label: 'Latent trace',
      icon: AlertTriangle,
      action: () => latentSample && loadPart(latentSample),
      disabled: !latentSample,
    },
    {
      label: 'Gross fail',
      icon: XCircle,
      action: () => grossSample && loadPart(grossSample),
      disabled: !grossSample,
    },
    {
      label: 'Random die',
      icon: Shuffle,
      action: () => parts.length > 0 && loadPart(parts[Math.floor(Math.random() * parts.length)]),
      disabled: parts.length === 0,
    },
  ];

  const readings: Array<{ key: keyof Signals; label: string; sub: string; limit: boolean }> = [
    { key: 'v0', label: '0 h leakage', sub: 'incoming Iddq', limit: false },
    { key: 'v24', label: '24 h leakage', sub: 'post-soak read', limit: false },
    { key: 'v96', label: '96 h leakage', sub: 'late burn-in read', limit: true },
  ];

  return (
    <section id="workbench" className="scroll-mt-20 pt-5">
      <div
        className={cn(
          'panel overflow-hidden transition-all duration-500',
          highlight && 'ring-1 ring-accent/50 shadow-[0_0_80px_-28px_rgba(79,227,255,0.55)]',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.18em] text-accent/85">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
              Test bench
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span className="font-mono text-[9px] tracking-[0.08em] text-ink">
              {input.partId ?? 'AD-HOC'}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">{input.lotId}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-white/[0.08] bg-white/[0.02] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
              {model ? `${configLabel(model.config)} · ${model.terms.length} terms` : 'model pending'}
            </span>
            {result ? <VerdictBadge verdict={result.verdict} /> : null}
            <button
              type="button"
              onClick={onOpenQa}
              disabled={!result}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] transition-colors',
                result
                  ? 'border-accent/30 bg-accent/[0.07] text-accent hover:bg-accent/[0.13]'
                  : 'cursor-not-allowed border-white/5 text-dim',
              )}
            >
              <FileCheck2 className="h-3 w-3" />
              QA record
            </button>
          </div>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)_minmax(0,1.18fr)]">
          <div className="border-b border-white/[0.06] xl:border-b-0 xl:border-r">
            <div className="relative h-[320px] overflow-hidden bg-[#020610]">
              <div className="pointer-events-none absolute inset-0 z-10 grid-overlay opacity-60" />
              <HeroScene accent={verdictColor} />

              <div className="pointer-events-none absolute left-3 top-3 z-20">
                <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-dim">Article</div>
                <div className="mt-0.5 font-mono text-[10px] text-ink">{input.partId ?? 'AD-HOC DIE'}</div>
              </div>
              <div className="pointer-events-none absolute right-3 top-3 z-20 rounded border border-white/10 bg-black/35 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted backdrop-blur">
                {input.lotId}
              </div>

              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 grid grid-cols-3 gap-px overflow-hidden rounded border border-white/10 bg-white/10">
                {readings.map((reading) => (
                  <div key={reading.key} className="bg-black/45 px-2 py-1.5 backdrop-blur">
                    <div className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-dim">
                      {reading.key === 'v0' ? 'H0' : reading.key === 'v24' ? 'H24' : 'H96'}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] tnum text-ink">{fmt(input[reading.key], 2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div>
                <label
                  htmlFor="lot-select"
                  className="font-mono text-[8px] uppercase tracking-[0.16em] text-muted"
                >
                  Manufacturing lot
                </label>
                <select
                  id="lot-select"
                  value={input.lotId}
                  onChange={(event) => selectLot(event.target.value)}
                  className="mt-1.5 w-full appearance-none rounded-md border border-white/[0.09] bg-[#060c17] px-2.5 py-2 font-mono text-[11px] text-ink transition-colors hover:border-white/20 focus:border-accent/50"
                >
                  {lots.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.id} · μ {profile.mean.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-px overflow-hidden rounded border border-white/[0.07] bg-white/[0.055]">
                {[
                  { label: 'Lot mean', value: fmt(lot.mean, 3) },
                  { label: 'Lot sigma', value: fmt(lot.sigma, 3) },
                  { label: '96h z', value: result ? `${result.z96 >= 0 ? '+' : ''}${fmt(result.z96, 2)}σ` : '—' },
                ].map((cell) => (
                  <div key={cell.label} className="bg-[#050b15] px-2 py-2 text-center">
                    <div className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">{cell.label}</div>
                    <div className="mt-1 font-mono text-[10.5px] tnum text-ink">{cell.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-white/[0.07] bg-white/[0.055]">
                {[
                  { label: 'Static USL', value: `${USL} µA` },
                  { label: 'Safety slope', value: `${SAFETY_SLOPE} µA/h` },
                  { label: 'Review slope', value: '0.010291 µA/h' },
                  { label: 'PAT gate', value: '±3σ @ 24/96 h' },
                ].map((cell) => (
                  <div key={cell.label} className="bg-[#050b15] px-2 py-1.5">
                    <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-dim">{cell.label}</div>
                    <div className="mt-0.5 font-mono text-[9px] tnum text-muted">{cell.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">
                <span>evidence 0 / 24 / 96 h</span>
                <span>{usesLateRead ? '72 h removed' : '144 h removed'}</span>
              </div>

              <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
                <span>{ready ? 'feed synchronized' : 'waiting for feed'}</span>
                <span>client-side</span>
              </div>
            </div>
          </div>

          <div className="border-b border-white/[0.06] p-4 xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between">
              <span className="label text-[8.5px]">Burn-in measurements</span>
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-dim">µA · Iddq</span>
            </div>

            <div className="mt-3 space-y-4">
              {readings.map((reading) => {
                const value = input[reading.key];
                return (
                  <div key={reading.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <label
                          htmlFor={`${reading.key}-range`}
                          className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted"
                        >
                          {reading.label}
                        </label>
                        <div className="mt-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">
                          {reading.sub}
                          {reading.limit ? ` · USL ${USL}` : ''}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 font-mono text-[12px] text-ink">
                        <input
                          type="number"
                          value={Number(value.toFixed(2))}
                          step={0.01}
                          min={0}
                          max={RANGE_MAX}
                          onChange={(event) => setReading(reading.key, Number(event.target.value))}
                          className="w-[66px] rounded border border-white/[0.08] bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] tnum text-ink"
                          aria-label={`${reading.label} value`}
                        />
                        <span className="text-[8px] text-dim">µA</span>
                      </div>
                    </div>
                    <input
                      id={`${reading.key}-range`}
                      type="range"
                      min={0}
                      max={RANGE_MAX}
                      step={0.01}
                      value={value}
                      onChange={(event) => setReading(reading.key, Number(event.target.value))}
                      className="range mt-2"
                      style={{ '--range-progress': `${(value / RANGE_MAX) * 100}%` } as CSSProperties}
                    />
                    <div className="mt-0.5 flex justify-between font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">
                      <span>0</span>
                      <span className={cn(value > USL && 'text-fail')}>USL {USL}</span>
                      <span>{RANGE_MAX}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="label text-[8px]">Load a trace</span>
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-dim transition-colors hover:text-ink"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Reset
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {presets.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={preset.action}
                      disabled={preset.disabled}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-left text-[10.5px] text-muted transition-colors',
                        preset.disabled
                          ? 'cursor-not-allowed opacity-40'
                          : 'hover:border-accent/30 hover:bg-accent/[0.05] hover:text-ink',
                      )}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 border-t border-white/[0.06] pt-3">
              <div className="flex items-center justify-between">
                <span className="label text-[8px]">Model input slots</span>
                <a
                  href="#model-lab"
                  className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-accent/80 transition-colors hover:text-accent"
                >
                  <SlidersHorizontal className="h-2.5 w-2.5" />
                  Model lab
                </a>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {slots.map((id) => (
                  <span
                    key={id}
                    title={SLOT_BY_ID[id].detail}
                    className="inline-flex items-center gap-1 rounded border border-accent/25 bg-accent/[0.06] py-1 pl-2 pr-1 font-mono text-[8.5px] text-accent"
                  >
                    {SLOT_BY_ID[id].label}
                    <button
                      type="button"
                      onClick={() => onRemoveSlot(id)}
                      disabled={slots.length <= 1}
                      aria-label={`Remove ${SLOT_BY_ID[id].title} slot`}
                      className={cn(
                        'rounded p-0.5 transition-colors',
                        slots.length <= 1 ? 'cursor-not-allowed text-accent/25' : 'text-accent/60 hover:bg-accent/10 hover:text-accent',
                      )}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}

                {unusedSlots.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setAdding((value) => !value)}
                    className="inline-flex items-center gap-1 rounded border border-dashed border-white/20 bg-white/[0.02] px-2 py-1 font-mono text-[8.5px] text-muted transition-colors hover:border-accent/40 hover:text-accent"
                    aria-expanded={adding}
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Add slot
                  </button>
                ) : null}
              </div>

              {adding && unusedSlots.length > 0 ? (
                <div className="mt-2 rounded border border-white/[0.08] bg-black/30 p-1.5">
                  <div className="px-1 pb-1.5 font-mono text-[7.5px] uppercase tracking-[0.12em] text-dim">
                    Add an input slot · refits on 2,000 traces
                  </div>
                  <div className="grid gap-1">
                    {unusedSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          onAddSlot(slot.id);
                          setAdding(false);
                        }}
                        className="rounded border border-transparent px-1.5 py-1 text-left transition-colors hover:border-accent/25 hover:bg-accent/[0.05]"
                      >
                        <span className="font-mono text-[9px] text-ink">
                          {slot.label} · {slot.title}
                        </span>
                        <span className="ml-1.5 font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">
                          {slot.kind} · {slot.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">
                <span>{model ? `deg ${model.config.degree}` : '—'}</span>
                <span>λ {model ? lambdaLabel(model.config.lambda) : '—'}</span>
                <span>{model ? `${model.terms.length} terms` : '—'}</span>
                <span className="text-pass">live refit</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col p-4">
            <div
              className="rounded-lg border p-3.5"
              style={{
                borderColor: `${verdictColor}45`,
                background: `linear-gradient(140deg, ${verdictColor}14, rgba(4,10,18,0.6) 60%)`,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="label text-[8px]">Screening verdict</span>
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
                  {result ? `health ${result.health}` : 'pending'}
                </span>
              </div>
              <div className="display mt-2 text-[34px] leading-none" style={{ color: verdictColor }}>
                {result ? verdictMeta[result.verdict].label : '—'}
              </div>
              <p className="mt-1.5 min-h-[32px] text-[11.5px] leading-relaxed text-muted">
                {result ? result.rationale : 'Resolving the drift model and lot baseline…'}
              </p>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/[0.07] bg-[#050b15] p-3">
              <HealthGauge score={result?.health ?? 0} verdict={result?.verdict ?? 'review'} />
              <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5">
                <div>
                  <div className="label text-[7.5px]">168h forecast</div>
                  <div className="display mt-0.5 text-[19px] leading-none tnum">
                    {result ? fmt(result.forecast, 2) : '—'}
                    <span className="ml-1 font-sans text-[8px] font-normal tracking-normal text-dim">µA</span>
                  </div>
                </div>
                <div>
                  <div className="label text-[7.5px]">Drift slope</div>
                  <div
                    className="display mt-0.5 text-[19px] leading-none tnum"
                    style={{ color: result ? (result.driftFail ? '#ff5f7e' : '#45e6a5') : undefined }}
                  >
                    {result ? fmt(result.slope, 4) : '—'}
                  </div>
                </div>
                <div>
                  <div className="label text-[7.5px]">USL margin</div>
                  <div className="display mt-0.5 text-[19px] leading-none tnum">
                    {result ? fmt(result.margin, 2) : '—'}
                  </div>
                </div>
                <div>
                  <div className="label text-[7.5px]">Safety gate</div>
                  <div className="mt-1.5 h-[3px] w-full rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(4, slopeRatio * 100)}%`,
                        backgroundColor: result?.driftFail ? '#ff5f7e' : slopeRatio > 0.62 ? '#ffbf5a' : '#45e6a5',
                      }}
                    />
                  </div>
                  <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-dim">
                    slope / limit
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {result?.reasons.map((reason) => {
                const Icon = stateIcon[reason.state];
                return (
                  <div
                    key={reason.label}
                    className="flex items-start gap-2 rounded border border-white/[0.045] bg-white/[0.012] px-2.5 py-1.5"
                  >
                    <Icon className={cn('mt-0.5 h-3 w-3 shrink-0', stateColor[reason.state])} />
                    <div className="min-w-0">
                      <div className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-muted">
                        {reason.label}
                      </div>
                      <div className="mt-0.5 text-[10.5px] leading-snug text-ink/90">{reason.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto pt-3">
              <button
                type="button"
                onClick={onOpenQa}
                disabled={!result}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-2 rounded border px-3 py-2 text-[11px] font-medium transition-colors',
                  result
                    ? 'border-accent/30 bg-accent/[0.08] text-accent hover:bg-accent/[0.14]'
                    : 'cursor-not-allowed border-white/5 bg-white/[0.02] text-dim',
                )}
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                Inspect QA record
              </button>
              <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">
                <span className="truncate">{certificateId ?? 'checksum generated on export'}</span>
                <span>{metrics ? `${metrics.falseNegatives} escapes` : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid border-t border-white/[0.06] xl:grid-cols-[1fr_280px]">
          <div className="border-b border-white/[0.06] p-4 xl:border-b-0 xl:border-r">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="label text-[8px]">Projected drift trace</div>
                <div className="mt-0.5 text-[11.5px] text-ink">
                  Measured 0–96 h · forecast to the 168 h endpoint
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'measured', color: '#e9effa' },
                  { label: 'projected', color: verdictColor },
                  { label: 'safe trajectory', color: '#45e6a5' },
                  { label: 'USL', color: '#ff5f7e' },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim"
                  >
                    <span className="h-1 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-2">
              {result ? (
                <TrajectoryChart
                  v0={input.v0}
                  v24={input.v24}
                  v96={input.v96}
                  forecast={result.forecast}
                  verdict={result.verdict}
                />
              ) : (
                <div className="flex h-[190px] items-center justify-center rounded border border-white/[0.05] bg-black/20 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
                  waiting for model…
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="label text-[8px]">Active regressor</div>
            <div className="mt-1 text-[11.5px] text-ink">
              {model ? `Degree ${model.config.degree} polynomial` : 'Resolving…'}
            </div>
            <dl className="mt-3 space-y-2">
              {[
                { term: 'Inputs', value: model ? `${model.config.slots.length} slots` : '—' },
                { term: 'Terms', value: model ? `${model.terms.length} coefficients` : '—' },
                { term: 'Ridge λ', value: model ? lambdaLabel(model.config.lambda) : '—' },
                { term: 'Holdout R²', value: metrics ? metrics.r2.toFixed(4) : '—' },
                { term: 'Holdout MAE', value: metrics ? `${metrics.mae.toFixed(3)} µA` : '—' },
                { term: 'Recall', value: metrics ? `${(metrics.recall * 100).toFixed(1)}%` : '—' },
              ].map((row) => (
                <div
                  key={row.term}
                  className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-1.5 last:border-0"
                >
                  <dt className="font-mono text-[8px] uppercase tracking-[0.1em] text-dim">{row.term}</dt>
                  <dd className="font-mono text-[10px] tnum text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[10px] leading-relaxed text-muted">
              Slot changes re-fit the ridge solve and re-screen all 2,000 traces in the browser. No inference
              service is involved.
            </p>
            <a
              href="#model-lab"
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-accent transition-colors hover:text-ink"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Open model lab
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
