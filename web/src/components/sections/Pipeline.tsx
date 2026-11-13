import { ChevronRight, Database, FileCheck2, ScanLine, TrendingUp } from 'lucide-react';
import { Section, SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';

const stages = [
  {
    id: '01',
    title: 'Ingest',
    icon: Database,
    copy: 'Two snapshots per die — 0 h and 24 h — joined with lot identity and baseline statistics. Normalized before it touches a model.',
    tags: ['0h', '24h', 'lot σ', 'CSV / API'],
  },
  {
    id: '02',
    title: 'Detect',
    icon: ScanLine,
    copy: 'Lot-relative robust z-scores and a ±3σ PAT gate isolate the outlier before it dissolves into batch-level averages.',
    tags: ['PAT z-score', 'robust σ', '±3σ gate'],
  },
  {
    id: '03',
    title: 'Forecast',
    icon: TrendingUp,
    copy: 'A six-term drift model projects 168 h leakage from the 24 h snapshot — with slope, margin, and a quantified health score.',
    tags: ['168h projection', 'R² 0.98', '< 16 ms'],
  },
  {
    id: '04',
    title: 'Certify',
    icon: FileCheck2,
    copy: 'Every verdict is sealed with its inputs, coefficients, reasons, and an integrity checksum. Exportable as an auditable QA record.',
    tags: ['QA JSON', 'FNV-1a', 'MIL-STD-883'],
  },
];

const layers = [
  {
    id: 'A',
    label: 'Presentation',
    title: 'React 19 · TypeScript · Tailwind v4',
    copy: 'Strict typed components, a tokenized design system, and motion that respects reduced-motion preferences.',
  },
  {
    id: 'B',
    label: 'Inference',
    title: 'Ridge-stabilized OLS in the browser',
    copy: 'The 2,000-trace telemetry feed is fetched once, fit locally with a six-term normal equation, and kept in memory.',
  },
  {
    id: 'C',
    label: 'Visualization',
    title: 'Three.js · React Three Fiber',
    copy: 'A procedural die texture, orbital mechanics, and bloom post-processing rendered on a single GPU canvas.',
  },
];

export function Pipeline() {
  return (
    <Section id="architecture" className="border-t border-white/[0.05] bg-[#040811]/40">
      <SectionHeading
        index="02"
        kicker="System architecture"
        title="Four gates. One telemetry trace."
        description="A deterministic screening pipeline that runs end-to-end in the browser. No ticket queue, no external inference service, no unaudited verdicts."
      />

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <Reveal key={stage.id} delay={index * 0.07}>
              <div className="relative">
                {index < stages.length - 1 ? (
                  <span className="absolute -right-[13px] top-10 z-10 hidden text-dim/60 lg:block">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                ) : null}
                <div className="panel hud-corners group h-full p-5 transition-colors duration-300 hover:border-accent/25">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-accent transition-colors group-hover:border-accent/30 group-hover:bg-accent/[0.06]">
                      <Icon className="h-4 w-4" strokeWidth={1.6} />
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.16em] text-dim">{stage.id}</span>
                  </div>
                  <h3 className="display mt-6 text-[19px]">{stage.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{stage.copy}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-4">
                    {stage.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-dim"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.2}>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.055] lg:grid-cols-3">
          {layers.map((layer) => (
            <div key={layer.id} className="bg-[#050b15] p-6">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] tracking-[0.16em] text-accent/70">{layer.id}</span>
                <span className="h-px w-6 bg-white/15" />
                <span className="label text-[8.5px]">{layer.label}</span>
              </div>
              <h3 className="mt-4 text-[14px] font-medium text-ink">{layer.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{layer.copy}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.24}>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#050b15]/70 px-5 py-3.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
            24h snapshot → PAT gate → drift fit → sealed verdict
          </span>
          <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pass" />
            Pipeline deterministic · zero network inference
          </span>
        </div>
      </Reveal>
    </Section>
  );
}
