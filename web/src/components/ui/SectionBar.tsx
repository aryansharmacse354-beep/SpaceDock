import type { ReactNode } from 'react';

interface SectionBarProps {
  index: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function SectionBar({ index, title, description, actions }: SectionBarProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.07] pb-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] tracking-[0.2em] text-accent/80">{index}</span>
        <h2 className="display text-[19px] leading-none text-ink">{title}</h2>
        {description ? (
          <span className="text-[11.5px] leading-relaxed text-muted">{description}</span>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
