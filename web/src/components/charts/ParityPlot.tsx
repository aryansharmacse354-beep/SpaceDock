import { useMemo } from 'react';
import type { ParityPoint } from '../../lib/types';

export function ParityPlot({ points }: { points: ParityPoint[] }) {
  const width = 560;
  const height = 340;
  const pad = { top: 22, right: 24, bottom: 44, left: 50 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const domain = 30;

  const visible = useMemo(
    () => points.filter((point) => point.actual <= domain && point.predicted <= domain),
    [points],
  );
  const clipped = points.length - visible.length;

  const x = (value: number) => pad.left + (value / domain) * innerW;
  const y = (value: number) => pad.top + innerH - (value / domain) * innerH;
  const ticks = [0, 10, 20, 30];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Forecast parity plot">
        <defs>
          <filter id="parityGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,0.055)" />
            <line x1={x(tick)} x2={x(tick)} y1={pad.top} y2={height - pad.bottom} stroke="rgba(255,255,255,0.035)" />
            <text x={pad.left - 12} y={y(tick) + 4} textAnchor="end" className="fill-[#6f829b] font-mono text-[10px]">
              {tick}
            </text>
            <text x={x(tick)} y={height - pad.bottom + 19} textAnchor="middle" className="fill-[#6f829b] font-mono text-[10px]">
              {tick}
            </text>
          </g>
        ))}

        <line x1={x(0)} y1={y(0)} x2={x(domain)} y2={y(domain)} stroke="#4fe3ff" strokeOpacity="0.4" strokeDasharray="5 6" />
        <text x={x(21)} y={y(24)} className="fill-[#4fe3ff] font-mono text-[9px] tracking-[0.14em]" fillOpacity="0.7">
          1:1 PARITY
        </text>

        {visible
          .filter((point) => !point.defect)
          .map((point, index) => (
            <circle
              key={`healthy-${index}`}
              cx={x(point.actual)}
              cy={y(point.predicted)}
              r="2.4"
              fill="#4fe3ff"
              fillOpacity="0.42"
            />
          ))}

        {visible
          .filter((point) => point.defect)
          .map((point, index) => (
            <circle
              key={`defect-${index}`}
              cx={x(point.actual)}
              cy={y(point.predicted)}
              r="3.1"
              fill="#ff5f7e"
              fillOpacity="0.85"
              filter="url(#parityGlow)"
            />
          ))}

        <text x={width / 2} y={height - 8} textAnchor="middle" className="fill-[#8ea0b9] font-mono text-[9px] tracking-[0.2em]">
          ACTUAL 168h LEAKAGE (µA)
        </text>
        <text
          x={14}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${height / 2})`}
          className="fill-[#8ea0b9] font-mono text-[9px] tracking-[0.2em]"
        >
          PREDICTED (µA)
        </text>
      </svg>
      {clipped > 0 ? (
        <p className="mt-1 text-right font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
          {clipped} gross-failure outliers &gt; {domain} µA clipped
        </p>
      ) : null}
    </div>
  );
}
