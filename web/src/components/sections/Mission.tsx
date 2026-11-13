import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Section, SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';

const healthy: Array<[number, number]> = [
  [0, 9.3],
  [24, 9.55],
  [96, 10.05],
  [168, 10.4],
];

const latent: Array<[number, number]> = [
  [0, 10.0],
  [24, 11.2],
  [96, 20.2],
  [168, 37.5],
];

const gross: Array<[number, number]> = [
  [0, 34],
  [24, 47],
  [96, 71],
  [168, 104],
];

function smoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  return points.reduce((path, point, index, list) => {
    if (index === 0) return `M ${point[0]} ${point[1]}`;
    const previous = list[index - 1];
    const before = list[index - 2] ?? previous;
    const after = list[index + 1] ?? point;
    const cp1x = previous[0] + (point[0] - before[0]) / 6;
    const cp1y = previous[1] + (point[1] - before[1]) / 6;
    const cp2x = point[0] - (after[0] - previous[0]) / 6;
    const cp2y = point[1] - (after[1] - previous[1]) / 6;
    return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point[0]} ${point[1]}`;
  }, '');
}

function EscapeChart() {
  const reduce = useReducedMotion();
  const width = 600;
  const height = 380;
  const pad = { top: 30, right: 30, bottom: 54, left: 50 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const yMax = 58;
  const x = (hours: number) => pad.left + (hours / 168) * innerW;
  const y = (value: number) => pad.top + innerH - (Math.min(value, yMax) / yMax) * innerH;

  const toScreen = (points: Array<[number, number]>): Array<[number, number]> =>
    points.map(([hours, value]) => [x(hours), y(value)]);

  const paths = [
    { points: toScreen(gross), color: '#ff5f7e', delay: 0.15, label: 'Gross failure' },
    { points: toScreen(latent), color: '#ffbf5a', delay: 0.35, label: 'Latent defect' },
    { points: toScreen(healthy), color: '#45e6a5', delay: 0.55, label: 'Healthy die' },
  ];

  const animateProps = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          whileInView: { pathLength: 1, opacity: 1 },
          viewport: { once: true, margin: '-60px' },
          transition: { duration: 1.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="label text-[8.5px]">Leakage trajectory · 0 → 168h</div>
          <div className="mt-1 text-[13px] text-ink">Static screening only reads the endpoint</div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-fail/25 bg-fail/[0.08] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-fail">
          <AlertTriangle className="h-3 w-3" />
          escape band
        </span>
      </div>

      <div className="p-3 sm:p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Leakage trajectories showing latent defects passing a static limit">
          <defs>
            <clipPath id="missionPlot">
              <rect x={pad.left} y={pad.top} width={innerW} height={innerH} />
            </clipPath>
            <linearGradient id="latentArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffbf5a" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#ffbf5a" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect x={pad.left} y={pad.top} width={innerW} height={y(50) - pad.top} fill="rgba(255,95,126,0.045)" />

          {[0, 20, 40, 58].map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,0.055)" strokeDasharray="3 6" />
              <text x={pad.left - 10} y={y(tick) + 4} textAnchor="end" className="fill-[#6f829b] font-mono text-[10px]">
                {tick}
              </text>
            </g>
          ))}

          {[0, 24, 96, 168].map((hour) => (
            <g key={hour}>
              <line x1={x(hour)} x2={x(hour)} y1={pad.top} y2={height - pad.bottom} stroke="rgba(255,255,255,0.035)" />
              <text x={x(hour)} y={height - pad.bottom + 22} textAnchor="middle" className="fill-[#6f829b] font-mono text-[10px]">
                {hour}h
              </text>
            </g>
          ))}

          <line x1={pad.left} x2={width - pad.right} y1={y(50)} y2={y(50)} stroke="#ff5f7e" strokeOpacity="0.55" strokeDasharray="6 6" />
          <text x={width - pad.right} y={y(50) - 8} textAnchor="end" className="fill-[#ff8da2] font-mono text-[9px] tracking-[0.14em]">
            STATIC USL 50 µA
          </text>

          <line x1={x(24)} x2={x(24)} y1={pad.top} y2={height - pad.bottom} stroke="#4fe3ff" strokeOpacity="0.4" strokeDasharray="2 4" />
          <rect x={x(24) - 34} y={pad.top - 20} width="68" height="17" rx="4" fill="#061622" stroke="rgba(79,227,255,0.3)" />
          <text x={x(24)} y={pad.top - 8} textAnchor="middle" className="fill-[#7ee9ff] font-mono text-[8px] tracking-[0.12em]">
            24h GATE
          </text>

          <g clipPath="url(#missionPlot)">
            {paths.map((path) => (
              <motion.path
                key={path.label}
                d={smoothPath(path.points)}
                fill="none"
                stroke={path.color}
                strokeWidth={path.label === 'Latent defect' ? 2.6 : 1.9}
                strokeLinecap="round"
                strokeDasharray={path.label === 'Gross failure' ? '5 5' : undefined}
                {...animateProps(path.delay)}
              />
            ))}
            <motion.path
              d={`${smoothPath(paths[1].points)} L ${x(168)} ${y(0)} L ${x(0)} ${y(0)} Z`}
              fill="url(#latentArea)"
              {...animateProps(0.6)}
            />
          </g>

          {paths.map((path) => {
            if (path.label === 'Gross failure') return null;
            const last = path.points[path.points.length - 1];
            return (
              <motion.g
                key={`${path.label}-point`}
                initial={reduce ? undefined : { opacity: 0, scale: 0.6 }}
                whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: path.delay + 0.9, duration: 0.4 }}
                style={{ transformOrigin: `${last[0]}px ${last[1]}px` }}
              >
                <circle cx={last[0]} cy={last[1]} r="5" fill="#04101a" stroke={path.color} strokeWidth="2.4" />
                <circle cx={last[0]} cy={last[1]} r="10" fill="none" stroke={path.color} strokeOpacity="0.28" />
              </motion.g>
            );
          })}

          <g className="hidden sm:block">
            <text x={x(166)} y={y(44)} textAnchor="end" className="fill-[#ffcf80] font-mono text-[9px] tracking-[0.12em]">
              LATENT DRIFT · PASSES STATIC
            </text>
            <text x={x(166)} y={y(44) + 13} textAnchor="end" className="fill-[#8ea0b9] font-mono text-[8px] tracking-[0.1em]">
              sub-µA acceleration at 24h
            </text>
          </g>

          <text x={x(150)} y={y(10.4) - 14} textAnchor="middle" className="hidden fill-[#7de8bf] font-mono text-[9px] tracking-[0.14em] sm:block">
            HEALTHY
          </text>
          <text x={x(6)} y={y(56)} className="hidden fill-[#ff9fb2] font-mono text-[9px] tracking-[0.14em] sm:block">
            GROSS FAIL
          </text>

          <text x={pad.left - 30} y={pad.top + innerH / 2} transform={`rotate(-90 ${pad.left - 30} ${pad.top + innerH / 2})`} textAnchor="middle" className="fill-[#8ea0b9] font-mono text-[9px] tracking-[0.18em]">
            I_DDQ (µA)
          </text>
          <text x={width / 2} y={height - 10} textAnchor="middle" className="fill-[#8ea0b9] font-mono text-[9px] tracking-[0.18em]">
            BURN-IN TIME (HOURS)
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3">
        <div className="flex flex-wrap gap-4">
          {paths.map((path) => (
            <span key={path.label} className="flex items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: path.color }} />
              {path.label}
            </span>
          ))}
        </div>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-dim">Illustrative trace</span>
      </div>
    </div>
  );
}

const points = [
  {
    number: '01',
    title: 'Endpoint vs. derivative',
    body: 'A 168-hour pass/fail gate only sees the final reading. SpaceDock scores the slope of the trajectory — the part of the signal that predicts what happens after launch.',
  },
  {
    number: '02',
    title: 'Sub-threshold failure',
    body: 'Latent gate-oxide defects grow from microamps. They can sit below the 50 µA limit at 168 h and still run away in orbit. The slope catches them while they are still cheap to screen.',
  },
  {
    number: '03',
    title: 'Lot context is not optional',
    body: 'A 13 µA reading means different things across wafer lots. Every die is normalized against its own lot mean and sigma before the anomaly gate, eliminating false alarms.',
  },
];

export function Mission() {
  return (
    <Section id="mission">
      <SectionHeading
        index="01"
        kicker="Mission · 125 °C ESS"
        title="Static limits don't catch slow death."
        description="Flight silicon is baked for 168 hours at 125 °C under MIL-STD-883 / AEC-Q001. A static 50 µA limit only sees the final reading, so latent gate-oxide defects that start at 1–12 µA can still escape — SpaceDock forecasts the endpoint from a 24-hour read."
      />

      <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <div className="flex flex-col gap-3">
          {points.map((point, index) => (
            <Reveal key={point.number} delay={index * 0.08}>
              <div className="group flex gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-white/[0.06] hover:bg-white/[0.02]">
                <span className="mt-0.5 font-mono text-[10px] tracking-[0.16em] text-accent/70">{point.number}</span>
                <div>
                  <h3 className="text-[15px] font-medium text-ink">{point.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{point.body}</p>
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal delay={0.24}>
            <div className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.055]">
              {[
                { value: '78%', label: 'escapes under static screen' },
                { value: '2.8 µA', label: 'max safe drift at 168h' },
                { value: '144h', label: 'removed from the loop' },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#050b15] p-4">
                  <div className="display text-[21px] leading-none text-ink">{stat.value}</div>
                  <div className="mt-2 font-mono text-[8px] uppercase leading-relaxed tracking-[0.12em] text-dim">{stat.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <EscapeChart />
        </Reveal>
      </div>
    </Section>
  );
}
