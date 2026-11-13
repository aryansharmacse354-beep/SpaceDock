import { useReducedMotion } from 'framer-motion';
import { fmt } from '../lib/format';
import type { ScreenedPart } from '../lib/types';
import { HeroScene } from './three/HeroScene';
import { VerdictBadge } from './ui/Verdict';

interface HeroVisualProps {
  sample: ScreenedPart | null;
  r2: number | null;
  reviewLoad: number | null;
}

export function HeroVisual({ sample, r2, reviewLoad }: HeroVisualProps) {
  const reduce = useReducedMotion();
  const verdict = sample?.screening.verdict ?? 'reject';
  const forecast = sample?.screening.forecast ?? 37.46;
  const slope = sample?.screening.slope ?? 0.17399;
  const z = sample?.screening.z24 ?? 4.1;
  const partId = sample?.partId ?? 'COMP_00007';
  const lotId = sample?.lotId ?? 'LOT-007';
  const fit = r2 ?? 0.9657;
  const review = reviewLoad ?? 0.043;

  return (
    <div className="relative isolate mx-auto w-full max-w-[600px]">
      <div className="pointer-events-none absolute inset-[12%] -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(79,227,255,0.16),rgba(60,80,180,0.06),transparent)] blur-2xl" />
      <div className="pointer-events-none absolute inset-[2%] rounded-full border border-white/[0.045]" />
      <div className="pointer-events-none absolute inset-[14%] rounded-full border border-dashed border-white/[0.05] spin-slower" />
      <div className="pointer-events-none absolute inset-[26%] rounded-full border border-white/[0.04] spin-slow" />

      <div className="relative aspect-square w-full">
        <div className="absolute inset-0">
          <HeroScene still={!!reduce} />
        </div>

        <div className="pointer-events-none absolute inset-6 overflow-hidden rounded-full">
          <div className="scan-beam absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-accent/[0.06] to-transparent" />
        </div>

        <div className="pointer-events-none absolute left-2 top-2 font-mono text-[9px] uppercase tracking-[0.22em] text-dim sm:left-3 sm:top-3">
          <span className="text-accent/80">●</span> Orbital bench / 125.0 °C
        </div>
        <div className="pointer-events-none absolute right-2 top-2 hidden font-mono text-[9px] uppercase tracking-[0.22em] text-dim sm:right-3 sm:top-3 sm:block">
          Link 99.98%
        </div>
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[8px] uppercase tracking-[0.3em] text-dim/70">
          live orbital bench
        </div>
      </div>

      <div className="pointer-events-none absolute left-0 top-[12%] hidden w-[172px] sm:block">
        <div className="panel-soft hud-corners bg-[#040a14]/75 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="label text-[8px]">Live fit · R²</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-pass">online</span>
          </div>
          <div className="display mt-2 text-[26px] leading-none tnum">{fit.toFixed(4)}</div>
          <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-dim">holdout accuracy</div>
          <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-electric"
              style={{ width: `${Math.min(100, fit * 100)}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
            <span>1.6k train</span>
            <span>400 test</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-0 top-[2%] w-[186px]">
        <div className="panel-soft hud-corners bg-[#040a14]/80 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="label text-[8px]">Demo trace</span>
            <VerdictBadge verdict={verdict} className="px-2 py-0.5 text-[8px]" />
          </div>
          <div className="mt-2.5 font-mono text-[10px] tracking-[0.08em] text-muted">
            {lotId} <span className="text-dim">/</span> {partId}
          </div>
          <div className="display mt-1 text-[27px] leading-none tnum">
            {fmt(forecast, 2)}
            <span className="ml-1 font-sans text-[10px] font-normal tracking-normal text-dim">µA</span>
          </div>
          <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-dim">forecast @ 168h</div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
            <div>
              slope
              <div className="mt-0.5 text-[10px] tracking-normal text-ink">{fmt(slope, 4)}</div>
            </div>
            <div>
              lot z
              <div className="mt-0.5 text-[10px] tracking-normal text-ink">
                {z >= 0 ? '+' : ''}
                {fmt(z, 2)}σ
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[8%] left-0 hidden w-[178px] md:block">
        <div className="panel-soft bg-[#040a14]/75 p-3.5 backdrop-blur-md">
          <span className="label text-[8px]">Safety slope</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="font-mono text-[15px] tnum text-ink">0.0166</span>
            <span className="font-mono text-[8px] text-dim">µA/h</span>
          </div>
          <div className="relative mt-3 h-[3px] rounded-full bg-white/10">
            <div className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-gradient-to-r from-pass/70 to-review" />
            <span className="absolute top-1/2 h-2.5 w-[1.5px] -translate-y-1/2 bg-review" style={{ left: '38%' }} />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
            <span>safe</span>
            <span>{(review * 100).toFixed(1)}% review</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 right-0 hidden w-[170px] md:block">
        <div className="panel-soft bg-[#040a14]/75 p-3.5 backdrop-blur-md">
          <span className="label text-[8px]">Evidence window</span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="display text-[22px] leading-none text-accent">24h</span>
            <span className="font-mono text-[9px] text-dim line-through">168h</span>
          </div>
          <div className="relative mt-3 h-[3px] overflow-hidden rounded-full bg-white/10">
            <div className="absolute inset-y-0 left-0 w-[14%] rounded-full bg-accent" />
            <div className="absolute inset-y-0 right-0 w-[62%] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.18)_0_2px,transparent_2px_6px)]" />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
            <span>screen</span>
            <span>144h saved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
