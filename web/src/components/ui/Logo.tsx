import { cn } from '../../lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn('h-9 w-9', className)} aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" rx="12" fill="#06101d" stroke="rgba(255,255,255,0.09)" />
      <ellipse
        cx="24"
        cy="24"
        rx="17"
        ry="6.5"
        stroke="#4fe3ff"
        strokeWidth="1.3"
        opacity="0.5"
        transform="rotate(-26 24 24)"
      />
      <ellipse
        cx="24"
        cy="24"
        rx="17"
        ry="6.5"
        stroke="#9a7bff"
        strokeWidth="1"
        opacity="0.4"
        transform="rotate(38 24 24)"
      />
      <rect x="17.5" y="17.5" width="13" height="13" rx="2.5" fill="#091a2b" stroke="#4fe3ff" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="2.6" fill="#4fe3ff" />
      <circle cx="38.5" cy="14.5" r="1.8" fill="#9a7bff" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a href="#top" className="group flex items-center gap-3" aria-label="SpaceDock mission control home">
      <LogoMark className="transition-transform duration-500 group-hover:rotate-[8deg]" />
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="display text-[17px] font-semibold tracking-[-0.02em]">
            SPACE<span className="text-accent">DOCK</span>
          </span>
          <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.3em] text-dim">
            Mission Control
          </span>
        </span>
      ) : null}
    </a>
  );
}
