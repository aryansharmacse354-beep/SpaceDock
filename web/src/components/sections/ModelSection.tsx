import { Check, Cpu, FlaskConical, Plus, RotateCcw, Target } from 'lucide-react';
import { Counter } from '../ui/Counter';
import { ParityPlot } from '../charts/ParityPlot';
import { Section, SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { cn } from '../../lib/cn';
import { equationTerms } from '../../lib/model';
import { DEFAULT_CONFIG, SLOT_LIBRARY } from '../../lib/slots';
import type { DriftModel, ModelConfig, ModelMetrics, SlotId } from '../../lib/types';

const notes = [
  {
    icon: FlaskConical,
    title: 'Why a quadratic?',
    copy: 'Latent runaway is superlinear. Square and interaction terms let the fit bend with the defect physics — without handing the browser a 300-tree forest.',
  },
  {
    icon: Target,
    title: 'Why recall over MAE?',
    copy: 'A sub-microamp average error is irrelevant if a single die escapes. The gate is tuned for zero false negatives, then checked for review load.',
  },
  {
    icon: Cpu,
    title: 'Why locally?',
    copy: 'The feed is parsed, fit, and scored inside this tab. No die telemetry ever leaves the browser, and every number on this page is reproducible.',
  },
];

interface ModelSectionProps {
  metrics: ModelMetrics | null;
  model: DriftModel | null;
  config: ModelConfig;
  onConfigChange: (config: ModelConfig) => void;
}

export function ModelSection({ metrics, model, config, onConfigChange }: ModelSectionProps) {
  const cards = [
    { label: 'Holdout R²', value: metrics?.r2 ?? null, digits: 4, unit: '', sub: 'variance explained' },
    { label: 'Holdout MAE', value: metrics?.mae ?? null, digits: 3, unit: 'µA', sub: 'mean absolute error' },
    { label: 'Holdout RMSE', value: metrics?.rmse ?? null, digits: 3, unit: 'µA', sub: 'root mean squared' },
    {
      label: 'Latent recall',
      value: metrics ? metrics.recall * 100 : null,
      digits: 1,
      unit: '%',
      sub: metrics ? `${metrics.positives} defects · ${metrics.falseNegatives} escapes` : 'validation set',
    },
  ];

  const toggleSlot = (id: SlotId) => {
    const active = config.slots.includes(id);
    if (active && config.slots.length === 1) return;
    const slots = active ? config.slots.filter((slot) => slot !== id) : [...config.slots, id];
    onConfigChange({ ...config, slots });
  };

  const resetSlots = () => onConfigChange({ ...DEFAULT_CONFIG, slots: [...DEFAULT_CONFIG.slots] });

  return (
    <Section id="model" className="border-t border-white/[0.05]">
      <SectionHeading
        index="03"
        kicker="Working model"
        title="A forecaster you can interrogate."
        description="Not a black box and not a static screenshot. This drift model is fit from the SpaceDock telemetry feed every time this page loads — and the validation charts below are computed from that fit."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.0fr_1.0fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Reveal>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.055]">
              {cards.map((card) => (
                <div key={card.label} className="bg-[#050b15] p-5">
                  <div className="label text-[8.5px]">{card.label}</div>
                  <div className="display mt-3 text-[30px] leading-none tnum">
                    {card.value === null ? (
                      <span className="text-dim/60">—</span>
                    ) : (
                      <>
                        <Counter value={card.value} decimals={card.digits} />
                        {card.unit ? (
                          <span className="ml-1 font-sans text-[11px] font-normal tracking-normal text-dim">{card.unit}</span>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">{card.sub}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="panel min-w-0 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="label text-[8.5px]">Model input slots</span>
                  <div className="mt-1 text-[13px] text-ink">Add burn-in signals to the fit</div>
                </div>
                <button
                  type="button"
                  onClick={resetSlots}
                  className="inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-dim transition-colors hover:text-ink"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset to V₀ + V₂₄
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {SLOT_LIBRARY.map((slot) => {
                  const active = config.slots.includes(slot.id);
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => toggleSlot(slot.id)}
                      aria-pressed={active}
                      title={`${slot.title} — ${slot.detail}`}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors',
                        active
                          ? 'border-accent/40 bg-accent/[0.08] text-accent'
                          : 'border-white/[0.08] bg-white/[0.02] text-muted hover:border-accent/25 hover:text-ink',
                      )}
                    >
                      {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {slot.label}
                      <span className={cn('text-[8px] normal-case tracking-normal', active ? 'text-accent/70' : 'text-dim')}>
                        {slot.unit}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                <span>{config.slots.length} active slots</span>
                <span className="h-1 w-1 rounded-full bg-dim/50" />
                <span>{model ? model.terms.length : '—'} regression terms</span>
                <span className="h-1 w-1 rounded-full bg-dim/50" />
                <span className="text-pass">refit on change</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                V₀ + V₂₄ is the default pair. Add V₉₆ or a derived signal and the coefficients, parity plot, fleet
                screen, and console gate all refit in place.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="panel min-w-0 p-5">
              <div className="flex items-center justify-between">
                <span className="label text-[8.5px]">Forecast function</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-pass">
                  <span className="h-1.5 w-1.5 rounded-full bg-pass" />
                  fit in browser
                </span>
              </div>

              <div className="scroll-thin mt-4 min-w-0 overflow-x-auto rounded-lg border border-white/[0.06] bg-black/30 p-4">
                <div className={cn('font-mono text-[11.5px] leading-relaxed text-muted', model && model.terms.length > 6 ? 'whitespace-normal break-words' : 'whitespace-nowrap')}>
                  <span className="text-accent">ŷ₁₆₈</span> ={' '}
                  {model ? (
                    <span>{equationTerms(model)}</span>
                  ) : (
                    <span className="text-dim">resolving coefficients…</span>
                  )}
                </div>
              </div>

              {model ? (
                <div className="scroll-thin mt-4 grid max-h-[188px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                  {model.terms.map((name, index) => (
                    <div key={name} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">{name}</div>
                      <div className="mt-1 font-mono text-[11.5px] tnum text-ink">
                        {model.coef[index].toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-6 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
                  resolving coefficients…
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                <span>ridge λ = 1e-7</span>
                <span className="h-1 w-1 rounded-full bg-dim/50" />
                <span>{model ? model.terms.length : '—'} coefficients</span>
                <span className="h-1 w-1 rounded-full bg-dim/50" />
                <span>{config.slots.length} input slots</span>
                <span className="h-1 w-1 rounded-full bg-dim/50" />
                <span>deterministic</span>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12} className="min-w-0">
          <div className="panel flex h-full flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="label text-[8.5px]">Holdout parity</div>
                <div className="mt-1 text-[13px] text-ink">Actual vs. forecast · 168h leakage</div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-muted">
                n = {metrics?.holdoutSize ?? '—'}
              </span>
            </div>

            <div className="mt-4 flex-1">
              {metrics ? (
                <ParityPlot points={metrics.parity} />
              ) : (
                <div className="flex h-[300px] items-center justify-center rounded-lg border border-white/[0.05] bg-black/20 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                  calibrating on telemetry…
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
              <div className="flex gap-4">
                <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> healthy
                </span>
                <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-fail" /> latent / gross defect
                </span>
              </div>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">80/20 split · refit on all traces</span>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {notes.map((note, index) => {
          const Icon = note.icon;
          return (
            <Reveal key={note.title} delay={index * 0.07}>
              <div className="panel h-full p-5">
                <Icon className="h-4 w-4 text-accent/80" strokeWidth={1.6} />
                <h3 className="mt-4 text-[14px] font-medium text-ink">{note.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{note.copy}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
