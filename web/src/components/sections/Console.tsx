import { AlertTriangle, CheckCircle2, Download, FileCheck2, RotateCcw, Shuffle, XCircle } from 'lucide-react';
import type { CSSProperties } from 'react';
import { cn } from '../../lib/cn';
import { fmt } from '../../lib/format';
import { SAFETY_SLOPE, USL } from '../../lib/model';
import type { ConsoleInput, LotProfile, ScreeningResult, ScreenedPart } from '../../lib/types';
import { HealthGauge } from '../charts/HealthGauge';
import { TrajectoryChart } from '../charts/TrajectoryChart';
import { Section, SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { VerdictBadge, verdictMeta } from '../ui/Verdict';

interface ConsoleProps {
  lots: LotProfile[];
  parts: ScreenedPart[];
  input: ConsoleInput;
  onChange: (input: ConsoleInput) => void;
  onReset: () => void;
  lot: LotProfile;
  result: ScreeningResult | null;
  ready: boolean;
  highlight: boolean;
  showV96: boolean;
  certificateId: string | null;
  onDownloadCertificate: () => void;
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

export function Console({
  lots,
  parts,
  input,
  onChange,
  onReset,
  lot,
  result,
  ready,
  highlight,
  showV96,
  certificateId,
  onDownloadCertificate,
}: ConsoleProps) {
  const setPrimary = (v0: number) =>
    onChange({ lotId: input.lotId, v0, v24: input.v24, v96: input.v96 });
  const setSecondary = (v24: number) =>
    onChange({ lotId: input.lotId, v0: input.v0, v24, v96: input.v96 });
  const setLateRead = (v96: number) =>
    onChange({ lotId: input.lotId, v0: input.v0, v24: input.v24, v96 });

  const selectLot = (lotId: string) => {
    const next = lots.find((profile) => profile.id === lotId) ?? lot;
    onChange({
      lotId,
      v0: round(next.mean + 0.15),
      v24: round(next.mean + 0.34),
      v96: round(next.mean + 0.71),
    });
  };

  const presets = [
    {
      label: 'Healthy die',
      action: () =>
        onChange({
          lotId: input.lotId,
          v0: round(lot.mean + 0.15),
          v24: round(lot.mean + 0.34),
          v96: round(lot.mean + 0.71),
        }),
    },
    {
      label: 'Latent drift',
      action: () =>
        onChange({
          lotId: input.lotId,
          v0: round(lot.mean),
          v24: round(lot.mean + 1.15),
          v96: round(lot.mean + 3.3),
        }),
    },
    {
      label: 'Gross fail',
      action: () => onChange({ lotId: input.lotId, v0: 48.5, v24: 57.5, v96: 66.5 }),
    },
    {
      label: 'Random die',
      action: () => {
        if (parts.length === 0) return;
        const part = parts[Math.floor(Math.random() * parts.length)];
        onChange({
          lotId: part.lotId,
          v0: part.v0,
          v24: part.v24,
          v96: part.v96,
          partId: part.partId,
        });
      },
    },
  ];

  const verdictColor = result ? verdictMeta[result.verdict].hex : '#8ea0b9';
  const slopeRatio = result ? Math.min(1, Math.max(0, result.slope / SAFETY_SLOPE)) : 0;

  return (
    <Section id="console" className="border-t border-white/[0.05] bg-[#040811]/40">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          index="04"
          kicker="Live inference"
          title="Put a die on the bench."
          description={
            showV96
              ? 'Three measurements in, a full qualification readout out. Adjust the burn-in snapshot and watch the drift model, lot gate, and verdict respond in real time.'
              : 'Two measurements in, a full qualification readout out. Adjust the burn-in snapshot and watch the drift model, lot gate, and verdict respond in real time.'
          }
          className="max-w-3xl"
        />
        <Reveal delay={0.1}>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2">
            <span className={cn('pulse-dot h-1.5 w-1.5 rounded-full', ready ? 'bg-pass' : 'bg-amber')} />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
              {ready ? 'Engine live · client-side' : 'Calibrating engine'}
            </span>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.08}>
        <div
          className={cn(
            'panel mt-10 overflow-hidden transition-all duration-500',
            highlight && 'ring-1 ring-accent/50 shadow-[0_0_80px_-28px_rgba(79,227,255,0.55)]',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-accent/85">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
                Screening engine
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-dim">v1.0.0</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[8px] uppercase tracking-[0.14em] text-dim">
              <span>USL 50 µA</span>
              <span>safety slope 0.016599</span>
              <span>±3σ PAT</span>
              <span className="text-pass">deterministic</span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-white/[0.06] p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between">
                <span className="label text-[8.5px]">Burn-in snapshot</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
                  {input.partId ? `trace ${input.partId}` : 'ad-hoc die'}
                </span>
              </div>

              <div className="mt-5">
                <label htmlFor="lot-select" className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                  Manufacturing lot
                </label>
                <select
                  id="lot-select"
                  value={input.lotId}
                  onChange={(event) => selectLot(event.target.value)}
                  className="mt-2 w-full appearance-none rounded-lg border border-white/[0.09] bg-[#060c17] px-3 py-2.5 font-mono text-[12px] text-ink transition-colors hover:border-white/20 focus:border-accent/50"
                >
                  {lots.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="v0-range" className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                      0 h leakage
                    </label>
                    <div className="flex items-baseline gap-1 font-mono text-[11px] text-ink">
                      <input
                        type="number"
                        value={Number(input.v0.toFixed(2))}
                        step={0.01}
                        min={1}
                        max={60}
                        onChange={(event) => setPrimary(Math.min(60, Math.max(1, Number(event.target.value))))}
                        className="w-16 rounded border border-white/[0.08] bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] text-ink tnum"
                        aria-label="0 hour leakage value"
                      />
                      <span className="text-[9px] text-dim">µA</span>
                    </div>
                  </div>
                  <input
                    id="v0-range"
                    type="range"
                    min={1}
                    max={60}
                    step={0.01}
                    value={input.v0}
                    onChange={(event) => setPrimary(Number(event.target.value))}
                    className="range mt-2"
                    style={{ '--range-progress': `${((input.v0 - 1) / 59) * 100}%` } as CSSProperties}
                  />
                  <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                    <span>1 µA</span>
                    <span>USL 50</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="v24-range" className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                      24 h leakage
                    </label>
                    <div className="flex items-baseline gap-1 font-mono text-[11px] text-ink">
                      <input
                        type="number"
                        value={Number(input.v24.toFixed(2))}
                        step={0.01}
                        min={1}
                        max={80}
                        onChange={(event) => setSecondary(Math.min(80, Math.max(1, Number(event.target.value))))}
                        className="w-16 rounded border border-white/[0.08] bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] text-ink tnum"
                        aria-label="24 hour leakage value"
                      />
                      <span className="text-[9px] text-dim">µA</span>
                    </div>
                  </div>
                  <input
                    id="v24-range"
                    type="range"
                    min={1}
                    max={80}
                    step={0.01}
                    value={input.v24}
                    onChange={(event) => setSecondary(Number(event.target.value))}
                    className="range mt-2"
                    style={{ '--range-progress': `${((input.v24 - 1) / 79) * 100}%` } as CSSProperties}
                  />
                  <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                    <span>1 µA</span>
                    <span>80 µA</span>
                  </div>
                </div>

                {showV96 ? (
                  <div>
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="v96-range" className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                        96 h leakage
                      </label>
                      <div className="flex items-baseline gap-1 font-mono text-[11px] text-ink">
                        <input
                          type="number"
                          value={Number(input.v96.toFixed(2))}
                          step={0.01}
                          min={1}
                          max={90}
                          onChange={(event) => setLateRead(Math.min(90, Math.max(1, Number(event.target.value))))}
                          className="w-16 rounded border border-white/[0.08] bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] text-ink tnum"
                          aria-label="96 hour leakage value"
                        />
                        <span className="text-[9px] text-dim">µA</span>
                      </div>
                    </div>
                    <input
                      id="v96-range"
                      type="range"
                      min={1}
                      max={90}
                      step={0.01}
                      value={input.v96}
                      onChange={(event) => setLateRead(Number(event.target.value))}
                      className="range mt-2"
                      style={{ '--range-progress': `${((input.v96 - 1) / 89) * 100}%` } as CSSProperties}
                    />
                    <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                      <span>1 µA</span>
                      <span>90 µA</span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className={cn(
                  'mt-5 grid gap-px overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.055]',
                  showV96 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3',
                )}
              >
                {[
                  { label: 'Lot mean', value: fmt(lot.mean, 3) },
                  { label: 'Lot sigma', value: fmt(lot.sigma, 3) },
                  { label: '24h z', value: result ? `${result.z24 >= 0 ? '+' : ''}${fmt(result.z24, 2)}` : '—' },
                  ...(showV96
                    ? [
                        {
                          label: '96h z',
                          value: result ? `${result.z96 >= 0 ? '+' : ''}${fmt(result.z96, 2)}` : '—',
                        },
                      ]
                    : []),
                ].map((cell) => (
                  <div key={cell.label} className="bg-[#050b15] px-3 py-2.5 text-center">
                    <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">{cell.label}</div>
                    <div className="mt-1 font-mono text-[11px] tnum text-ink">{cell.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <span className="label text-[8px]">Load a scenario</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={preset.action}
                      className={cn(
                        'rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-left text-[11.5px] text-muted transition-colors hover:border-accent/30 hover:bg-accent/[0.05] hover:text-ink',
                        preset.label === 'Random die' && 'flex items-center gap-2',
                      )}
                    >
                      {preset.label === 'Random die' ? <Shuffle className="h-3 w-3" /> : null}
                      {preset.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onReset}
                  className="mt-3 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-dim transition-colors hover:text-ink"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset to lot baseline
                </button>
              </div>
            </div>

            <div className="flex flex-col p-5 sm:p-6">
              <div
                className="rounded-xl border p-5"
                style={{
                  borderColor: `${verdictColor}45`,
                  background: `linear-gradient(140deg, ${verdictColor}14, rgba(4,10,18,0.6) 60%)`,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="label text-[8.5px]">Screening verdict</span>
                  {result ? <VerdictBadge verdict={result.verdict} /> : null}
                </div>
                <div className="display mt-3 text-[42px] leading-none" style={{ color: verdictColor }}>
                  {result ? verdictMeta[result.verdict].label : '—'}
                </div>
                <p className="mt-2 min-h-[38px] text-[12.5px] leading-relaxed text-muted">
                  {result ? result.rationale : 'Resolving the drift model and lot baseline…'}
                </p>
              </div>

              <div className="mt-4 flex flex-col items-center gap-4 rounded-xl border border-white/[0.07] bg-[#050b15] p-4 sm:flex-row">
                <HealthGauge score={result?.health ?? 0} verdict={result?.verdict ?? 'review'} />
                <div className="grid w-full grid-cols-2 gap-3">
                  <div>
                    <div className="label text-[8px]">168h forecast</div>
                    <div className="display mt-1 text-[22px] leading-none tnum">
                      {result ? fmt(result.forecast, 2) : '—'}
                      <span className="ml-1 font-sans text-[9px] font-normal tracking-normal text-dim">µA</span>
                    </div>
                    <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">vs 50 µA limit</div>
                  </div>
                  <div>
                    <div className="label text-[8px]">Drift slope</div>
                    <div
                      className="display mt-1 text-[22px] leading-none tnum"
                      style={{ color: result ? (result.driftFail ? '#ff5f7e' : '#45e6a5') : undefined }}
                    >
                      {result ? fmt(result.slope, 4) : '—'}
                    </div>
                    <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">µA/h projected</div>
                  </div>
                  <div>
                    <div className="label text-[8px]">USL margin</div>
                    <div className="display mt-1 text-[22px] leading-none tnum">
                      {result ? fmt(result.margin, 2) : '—'}
                      <span className="ml-1 font-sans text-[9px] font-normal tracking-normal text-dim">µA</span>
                    </div>
                    <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">at 168 hours</div>
                  </div>
                  <div>
                    <div className="label text-[8px]">Safety gate</div>
                    <div className="mt-1 h-[3px] w-full rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(4, slopeRatio * 100)}%`,
                          backgroundColor: result?.driftFail ? '#ff5f7e' : slopeRatio > 0.62 ? '#ffbf5a' : '#45e6a5',
                        }}
                      />
                    </div>
                    <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
                      slope / limit
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {result?.reasons.map((reason) => {
                  const Icon = stateIcon[reason.state];
                  return (
                    <div
                      key={reason.label}
                      className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2.5"
                    >
                      <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', stateColor[reason.state])} />
                      <div>
                        <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted">{reason.label}</div>
                        <div className="mt-0.5 text-[11.5px] text-ink/90">{reason.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-5">
                <button
                  type="button"
                  onClick={onDownloadCertificate}
                  disabled={!result}
                  className={cn(
                    'inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-[12px] font-medium transition-colors',
                    result
                      ? 'border-accent/30 bg-accent/[0.08] text-accent hover:bg-accent/[0.14]'
                      : 'cursor-not-allowed border-white/5 bg-white/[0.02] text-dim',
                  )}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download QA certificate
                </button>
                <div className="mt-2 flex items-center justify-center gap-2 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
                  <FileCheck2 className="h-3 w-3" />
                  {certificateId ?? 'checksum generated on export'}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="label text-[8.5px]">Projected drift trace</div>
                <div className="mt-1 text-[13px] text-ink">
                  Measured 0–{showV96 ? '96' : '24'}h · forecast through 168h
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {[
                  { label: 'measured', color: '#e9effa' },
                  { label: 'projected', color: verdictColor },
                  { label: 'safe trajectory', color: '#45e6a5' },
                  { label: 'USL', color: '#ff5f7e' },
                ].map((item) => (
                  <span key={item.label} className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                    <span className="h-1 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3">
              {result ? (
                <TrajectoryChart
                  v0={input.v0}
                  v24={input.v24}
                  v96={input.v96}
                  showV96={showV96}
                  forecast={result.forecast}
                  verdict={result.verdict}
                />
              ) : (
                <div className="flex h-[220px] items-center justify-center rounded-lg border border-white/[0.05] bg-black/20 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                  waiting for model…
                </div>
              )}
            </div>
            <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
              deterministic re-fit · safety slope {SAFETY_SLOPE} µA/h · USL {USL} µA · no data leaves this browser
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
