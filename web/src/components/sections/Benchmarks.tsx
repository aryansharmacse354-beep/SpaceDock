import { ShieldCheck } from 'lucide-react';
import { fmt } from '../../lib/format';
import type { ModelMetrics } from '../../lib/types';
import { Section, SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';

const baselines = [
  {
    name: 'Static 50 µA endpoint',
    detail: 'Datasheet upper specification limit',
    recall: 22.0,
    fnr: '78.0%',
    mae: '—',
    risk: 'Critical hazard',
    tone: 'text-fail border-fail/20 bg-fail/[0.06]',
    bar: '#ff5f7e',
  },
  {
    name: 'AEC-Q001 PAT + Isolation Forest',
    detail: 'Dynamic part average testing, no drift forecast',
    recall: 88.5,
    fnr: '11.5%',
    mae: '—',
    risk: 'Moderate risk',
    tone: 'text-review border-review/20 bg-review/[0.06]',
    bar: '#ffbf5a',
  },
  {
    name: 'SpaceDock unified drift model',
    detail: '24h forecast + lot-aware PAT + safety slope',
    recall: 100,
    fnr: '0.00%',
    mae: '0.3181 µA',
    risk: 'Flight ready',
    tone: 'text-pass border-pass/25 bg-pass/[0.07]',
    bar: '#45e6a5',
    featured: true,
  },
];

const protocol = [
  {
    step: '01',
    title: 'Deterministic split',
    copy: 'Every fifth die is held out. The same trace index always lands in the same partition — results are reproducible across reloads.',
  },
  {
    step: '02',
    title: 'Gate tuned without leakage',
    copy: 'The safety slope is fixed at 0.016599 µA/h before evaluation. The holdout never informs the threshold or the coefficients.',
  },
  {
    step: '03',
    title: 'Full-fleet replay',
    copy: 'All 2,000 die are re-screened against withheld defect labels. True positives, review load, and escapes are recounted live.',
  },
];

export function Benchmarks({ metrics }: { metrics: ModelMetrics | null }) {
  const liveRecall = metrics ? metrics.recall * 100 : null;
  const liveMae = metrics ? metrics.mae : null;

  return (
    <Section id="validation" className="border-t border-white/[0.05] bg-[#040811]/40">
      <SectionHeading
        index="06"
        kicker="Validation"
        title="Zero escape is the only acceptable number."
        description="A screen is only as good as the defects it stops. The gate was benchmarked against the static endpoint rule and a conventional AEC-Q001 anomaly stack — then replayed against the full fleet."
      />

      <div className="mt-12 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <Reveal className="min-w-0">
          <div className="panel min-w-0 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[1.9fr_1.1fr_1fr_1fr_1.1fr] gap-3 border-b border-white/[0.06] px-5 py-3 font-mono text-[8px] uppercase tracking-[0.14em] text-dim">
                  <span>Architecture</span>
                  <span>Latent recall</span>
                  <span>False negatives</span>
                  <span>168h MAE</span>
                  <span className="text-right">Flight risk</span>
                </div>

                {baselines.map((row) => (
                  <div
                    key={row.name}
                    className={`grid grid-cols-[1.9fr_1.1fr_1fr_1fr_1.1fr] items-center gap-3 border-b border-white/[0.04] px-5 py-5 last:border-0 ${
                      row.featured ? 'bg-accent/[0.035]' : ''
                    }`}
                  >
                    <div>
                      <div className={`text-[13px] ${row.featured ? 'font-medium text-ink' : 'text-muted'}`}>{row.name}</div>
                      <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">{row.detail}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[12px] tnum text-ink">{row.recall.toFixed(1)}%</div>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-full rounded-full" style={{ width: `${row.recall}%`, backgroundColor: row.bar }} />
                      </div>
                    </div>
                    <div className="font-mono text-[12px] tnum text-muted">{row.fnr}</div>
                    <div className="font-mono text-[12px] tnum text-muted">{row.mae}</div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] ${row.tone}`}>
                        {row.risk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                baselines reflect the repository benchmark · synthetic 2,000-die feed
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-accent/70">live replay →</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="min-w-0">
          <div className="panel flex h-full min-w-0 flex-col p-5">
            <div className="flex items-center justify-between">
              <span className="label text-[8.5px]">Live replay</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-pass">
                <span className="h-1.5 w-1.5 rounded-full bg-pass" />
                computed now
              </span>
            </div>

            <div className="mt-6">
              <div className="display text-[64px] leading-none text-pass">{metrics?.falseNegatives ?? '—'}</div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                escaped defects / {metrics?.positives ?? '—'} labeled failures
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">Latent recall</span>
                  <span className="font-mono text-[13px] tnum text-ink">{liveRecall === null ? '—' : `${liveRecall.toFixed(1)}%`}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full bg-pass" style={{ width: `${liveRecall ?? 0}%` }} />
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">Holdout MAE</span>
                  <span className="font-mono text-[13px] tnum text-ink">{liveMae === null ? '—' : `${fmt(liveMae, 3)} µA`}</span>
                </div>
                <div className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                  Published pipeline reference: 0.3181 µA · R² 0.9860.
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">Review load</span>
                  <span className="font-mono text-[13px] tnum text-ink">
                    {metrics ? `${(metrics.reviewLoad * 100).toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                  Ambiguous die only. All labeled defects are hard rejects.
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-4">
              {['MIL-STD-883', 'AEC-Q001', '125 °C ESS', '168 h'].map((tag) => (
                <span key={tag} className="rounded border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {protocol.map((item, index) => (
          <Reveal key={item.step} delay={index * 0.06}>
            <div className="panel h-full p-5">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] tracking-[0.16em] text-accent/70">{item.step}</span>
                <span className="h-px w-6 bg-white/15" />
                <ShieldCheck className="h-3.5 w-3.5 text-pass/70" />
              </div>
              <h3 className="mt-4 text-[14px] font-medium text-ink">{item.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{item.copy}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.12}>
        <p className="mt-5 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.14em] text-dim">
          Validation scope: synthetic 125 °C burn-in telemetry, 20 manufacturing lots. Production deployment requires
          qualification against the target flight lot. The demonstration is a screening aid, not a substitute for ESS.
        </p>
      </Reveal>
    </Section>
  );
}
