import { fmt } from '../../lib/format';
import { SAFETY_SLOPE, USL } from '../../lib/model';
import { verdictMeta } from '../ui/Verdict';
import type { Verdict } from '../../lib/types';

interface TrajectoryChartProps {
  v0: number;
  v24: number;
  v96?: number;
  showV96?: boolean;
  forecast: number;
  verdict: Verdict;
}

export function TrajectoryChart({
  v0,
  v24,
  v96 = v24,
  showV96 = false,
  forecast,
  verdict,
}: TrajectoryChartProps) {
  const width = 560;
  const height = 300;
  const pad = { top: 26, right: 26, bottom: 40, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const yMax = Math.max(55, forecast * 1.12, v0 * 1.2, showV96 ? v96 * 1.1 : 0);
  const x = (hours: number) => pad.left + (hours / 168) * innerW;
  const y = (value: number) => pad.top + innerH - (Math.min(value, yMax) / yMax) * innerH;
  const color = verdictMeta[verdict].hex;

  const startHour = showV96 ? 96 : 24;
  const startValue = showV96 ? v96 : v24;
  const span = 168 - startHour;

  const projection: Array<[number, number]> = [];
  for (let step = 0; step <= 32; step += 1) {
    const t = startHour + (step / 32) * span;
    const eased = ((t - startHour) / span) ** (showV96 ? 1.35 : 1.7);
    projection.push([t, startValue + (forecast - startValue) * eased]);
  }

  const projectionPath = projection.map(([h, value], i) => `${i === 0 ? 'M' : 'L'}${x(h)},${y(value)}`).join(' ');
  const areaPath = `${projectionPath} L${x(168)},${y(0)} L${x(startHour)},${y(0)} Z`;
  const safeEnd = v0 + SAFETY_SLOPE * 168;
  const ticks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Projected leakage trajectory">
      <defs>
        <linearGradient id="trajArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="trajGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 5"
          />
          <text x={pad.left - 12} y={y(tick) + 4} textAnchor="end" className="fill-[#6f829b] font-mono text-[10px]">
            {fmt(tick, 0)}
          </text>
        </g>
      ))}

      {[0, 24, 96, 168].map((hour) => (
        <g key={hour}>
          <line x1={x(hour)} x2={x(hour)} y1={pad.top} y2={height - pad.bottom} stroke="rgba(255,255,255,0.04)" />
          <text x={x(hour)} y={height - pad.bottom + 20} textAnchor="middle" className="fill-[#6f829b] font-mono text-[10px]">
            {hour}h
          </text>
        </g>
      ))}

      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={y(USL)}
        y2={y(USL)}
        stroke="#ff5f7e"
        strokeOpacity="0.55"
        strokeDasharray="6 6"
      />
      <text x={width - pad.right} y={y(USL) - 8} textAnchor="end" className="fill-[#ff8da2] font-mono text-[9px] tracking-[0.16em]">
        STATIC USL 50 µA
      </text>

      {safeEnd < yMax ? (
        <>
          <line
            x1={x(0)}
            x2={x(168)}
            y1={y(v0)}
            y2={y(safeEnd)}
            stroke="#45e6a5"
            strokeOpacity="0.35"
            strokeDasharray="2 6"
          />
          <text x={x(168)} y={y(safeEnd) - 8} textAnchor="end" className="fill-[#6de0b4] font-mono text-[9px] tracking-[0.14em]">
            SAFE TRAJECTORY
          </text>
        </>
      ) : null}

      <path d={areaPath} fill="url(#trajArea)" />
      <path d={projectionPath} fill="none" stroke={color} strokeWidth="1.8" strokeDasharray="5 6" strokeOpacity="0.9" />

      <line x1={x(0)} y1={y(v0)} x2={x(24)} y2={y(v24)} stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      {showV96 ? (
        <line x1={x(24)} y1={y(v24)} x2={x(96)} y2={y(v96)} stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      ) : null}
      <circle cx={x(0)} cy={y(v0)} r="4.5" fill="#04121a" stroke={color} strokeWidth="2" />
      <circle cx={x(24)} cy={y(v24)} r="4.5" fill="#04121a" stroke={color} strokeWidth="2" />
      {showV96 ? (
        <circle cx={x(96)} cy={y(v96)} r="4.5" fill="#04121a" stroke={color} strokeWidth="2" />
      ) : (
        <circle cx={x(96)} cy={y(v24 + (forecast - v24) * 0.5 ** 1.7)} r="3" fill={color} fillOpacity="0.55" />
      )}
      <circle cx={x(168)} cy={y(forecast)} r="6" fill={color} filter="url(#trajGlow)" />
      <circle cx={x(168)} cy={y(forecast)} r="12" fill="none" stroke={color} strokeOpacity="0.3" />

      <text x={x(6)} y={y(Math.max(v0, v24)) - 14} className="fill-[#a9bdd6] font-mono text-[9px] tracking-[0.14em]">
        MEASURED
      </text>
      <text x={x(102)} y={y(forecast) - 18} textAnchor="middle" fill={color} className="font-mono text-[9px] tracking-[0.14em]">
        {fmt(forecast, 2)} µA FORECAST
      </text>
      <text x={x(168)} y={y(forecast) + 24} textAnchor="end" className="fill-[#8ea0b9] font-mono text-[9px] tracking-[0.14em]">
        168h
      </text>
    </svg>
  );
}
