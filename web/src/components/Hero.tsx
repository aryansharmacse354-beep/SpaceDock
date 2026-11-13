import { ArrowDown, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { ScreenedPart } from '../lib/types';
import { HeroVisual } from './HeroVisual';
import { Counter } from './ui/Counter';
import { Action } from './ui/Action';

interface HeroProps {
  totalDie: number;
  positives: number;
  recall: number;
  falseNegatives: number;
  r2: number | null;
  reviewLoad: number | null;
  sample: ScreenedPart | null;
  ticker: string[];
}

const FALLBACK_TICKER = [
  'SAFETY SLOPE 0.016599 µA/h',
  'STATIC USL 50 µA',
  'LOT-007 · 168h FORECAST 37.46 µA · REJECT',
  'LOT-012 · 168h FORECAST 10.41 µA · PASS',
  'EVIDENCE WINDOW 0h + 24h',
  'MIL-STD-883 · AEC-Q001',
  'ZERO ESCAPE GATE ARMED',
];

export function Hero({
  totalDie,
  positives,
  recall,
  falseNegatives,
  r2,
  reviewLoad,
  sample,
  ticker,
}: HeroProps) {
  const items = ticker.length > 0 ? ticker : FALLBACK_TICKER;
  const recallPct = recall * 100;

  return (
    <section id="top" className="bg-space relative overflow-hidden pb-0 pt-28 lg:pt-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-overlay absolute inset-0 opacity-70" />
        <div className="absolute -top-56 left-1/2 h-[720px] w-[1100px] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(79,227,255,0.10),transparent)] blur-3xl" />
        <div className="absolute -right-40 top-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(154,123,255,0.10),transparent)] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void to-transparent" />
      </div>

      <div className="pointer-events-none absolute left-6 top-1/2 hidden xl:block">
        <span className="vertical-rail font-mono text-[9px] uppercase tracking-[0.4em] text-dim/70 [writing-mode:vertical-rl]">
          Orbital screening platform / SD-24
        </span>
      </div>
      <div className="pointer-events-none absolute right-6 top-1/3 hidden xl:block">
        <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-dim/70 [writing-mode:vertical-rl]">
          Sync 99.98 / chain verified
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-5 sm:px-8">
        <div className="grid items-center gap-14 pb-16 lg:grid-cols-[1.03fr_0.97fr] lg:gap-10 lg:pb-20">
          <div>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/20 bg-accent/[0.05] py-1.5 pl-2 pr-3.5">
              <span className="pulse-dot ml-1 h-1.5 w-1.5 rounded-full bg-pass" />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent/90">
                Space-grade silicon screening
              </span>
              <span className="h-3 w-px bg-white/15" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">125 °C ESS</span>
            </div>

            <h1 className="display mt-7 text-[clamp(2.85rem,7vw,5.35rem)] font-medium leading-[0.93] tracking-[-0.045em]">
              Zero defect escape.
              <span className="mt-1 block text-gradient">144 hours earlier.</span>
            </h1>

            <p className="mt-7 max-w-[540px] text-[15.5px] leading-relaxed text-muted">
              SpaceDock reads the first 24 hours of burn-in and forecasts 168-hour leakage before the clock
              runs out — lot-aware anomaly detection, a live drift model, and a signed verdict for every die.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Action href="#console">
                Open live console
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Action>
              <Action href="#model" variant="ghost">
                Inspect the model
                <ArrowDown className="h-3.5 w-3.5" />
              </Action>
            </div>

            <p className="mt-5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
              <ShieldCheck className="h-3.5 w-3.5 text-pass/80" />
              2,000 burn-in traces fit locally · nothing leaves your browser
            </p>

            <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.055] sm:grid-cols-4">
              {[
                { value: totalDie, decimals: 0, suffix: '', label: 'Fleet screened', sub: '20 lot groups' },
                { value: recallPct, decimals: 1, suffix: '%', label: 'Latent recall', sub: `${positives} known defects` },
                { value: falseNegatives, decimals: 0, suffix: '', label: 'Escaped defects', sub: 'zero-escape gate' },
                { value: 144, decimals: 0, suffix: 'h', label: 'Burn-in removed', sub: 'vs 168h ESS' },
              ].map((metric) => (
                <div key={metric.label} className="bg-[#050b15] px-4 py-4">
                  <div className="display text-[25px] leading-none tnum">
                    <Counter value={metric.value} decimals={metric.decimals} suffix={metric.suffix} />
                  </div>
                  <div className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted">{metric.label}</div>
                  <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">{metric.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <HeroVisual sample={sample} r2={r2} reviewLoad={reviewLoad} />
        </div>
      </div>

      <div className="marquee mask-fade-x relative border-y border-white/[0.06] bg-[#040a14]/70">
        <div className="mx-auto flex w-full max-w-[1440px] items-center">
          <div className="hidden shrink-0 items-center gap-2 border-r border-white/[0.06] px-5 py-3.5 sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">Live feed</span>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="marquee-track">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
                  {items.map((item, index) => (
                    <div key={`${copy}-${index}`} className="flex shrink-0 items-center gap-4 px-6 py-3.5">
                      <span className="h-1 w-1 rotate-45 bg-accent/50" />
                      <span className="whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
