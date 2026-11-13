import { useMemo } from 'react';
import { SAFETY_SLOPE, USL } from '../../lib/model';
import type { ScreenedPart } from '../../lib/types';
import { verdictMeta } from '../ui/Verdict';

export function FleetScatter({ parts }: { parts: ScreenedPart[] }) {
  const width = 620;
  const height = 330;
  const pad = { top: 22, right: 24, bottom: 46, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const xMax = 90;
  const yMax = 70;

  const x = (slopeMilli: number) => pad.left + (Math.min(slopeMilli, xMax) / xMax) * innerW;
  const y = (value: number) => pad.top + innerH - (Math.min(value, yMax) / yMax) * innerH;

  const dots = useMemo(
    () =>
      parts.map((part) => ({
        id: part.partId,
        cx: x(part.slope0_24 * 1000),
        cy: y(part.screening.forecast),
        color: verdictMeta[part.screening.verdict].hex,
        opacity: part.screening.verdict === 'pass' ? 0.4 : 0.85,
        defect: part.defect,
        radius: part.screening.verdict === 'pass' ? 1.8 : 2.4,
      })),
    [parts],
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Fleet screening scatter">
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
        <g key={fraction}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + innerH * fraction}
            y2={pad.top + innerH * fraction}
            stroke="rgba(255,255,255,0.055)"
          />
          <text
            x={pad.left - 12}
            y={pad.top + innerH * fraction + 4}
            textAnchor="end"
            className="fill-[#6f829b] font-mono text-[10px]"
          >
            {Math.round(yMax * (1 - fraction))}
          </text>
        </g>
      ))}

      {[0, 30, 60, 90].map((tick) => (
        <g key={tick}>
          <line x1={x(tick)} x2={x(tick)} y1={pad.top} y2={height - pad.bottom} stroke="rgba(255,255,255,0.035)" />
          <text x={x(tick)} y={height - pad.bottom + 19} textAnchor="middle" className="fill-[#6f829b] font-mono text-[10px]">
            {tick}
          </text>
        </g>
      ))}

      <line x1={x(SAFETY_SLOPE * 1000)} x2={x(SAFETY_SLOPE * 1000)} y1={pad.top} y2={height - pad.bottom} stroke="#ffbf5a" strokeOpacity="0.4" strokeDasharray="4 5" />
      <text x={x(SAFETY_SLOPE * 1000) + 6} y={pad.top + 12} className="fill-[#ffbf5a] font-mono text-[9px] tracking-[0.12em]" fillOpacity="0.8">
        SAFETY SLOPE
      </text>

      <line x1={pad.left} x2={width - pad.right} y1={y(USL)} y2={y(USL)} stroke="#ff5f7e" strokeOpacity="0.4" strokeDasharray="4 5" />
      <text x={width - pad.right} y={y(USL) - 6} textAnchor="end" className="fill-[#ff8da2] font-mono text-[9px] tracking-[0.12em]" fillOpacity="0.8">
        USL 50 µA
      </text>

      {dots.map((dot) => (
        <circle
          key={dot.id}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.radius}
          fill={dot.color}
          fillOpacity={dot.opacity}
        />
      ))}

      {dots
        .filter((dot) => dot.defect)
        .map((dot) => (
          <circle
            key={`ring-${dot.id}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.radius + 2}
            fill="none"
            stroke="#ff5f7e"
            strokeOpacity="0.45"
            strokeWidth="0.8"
          />
        ))}

      <text x={width / 2} y={height - 8} textAnchor="middle" className="fill-[#8ea0b9] font-mono text-[9px] tracking-[0.18em]">
        24h LEAKAGE DRIFT (×10⁻³ µA/h)
      </text>
      <text
        x={14}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90 14 ${height / 2})`}
        className="fill-[#8ea0b9] font-mono text-[9px] tracking-[0.18em]"
      >
        168h FORECAST (µA)
      </text>
    </svg>
  );
}
