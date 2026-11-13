import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ActionProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'quiet';
  className?: string;
  ariaLabel?: string;
}

const variants = {
  primary:
    'bg-accent text-[#03131a] shadow-[0_0_34px_-8px_rgba(79,227,255,0.75)] hover:bg-[#8df0ff] hover:shadow-[0_0_44px_-6px_rgba(79,227,255,0.9)]',
  ghost:
    'border border-white/12 bg-white/[0.03] text-ink hover:border-accent/45 hover:bg-white/[0.06]',
  quiet: 'text-muted hover:text-ink',
};

export function Action({ children, href, onClick, variant = 'primary', className, ariaLabel }: ActionProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-medium transition-all duration-200',
    variants[variant],
    className,
  );

  if (href) {
    return (
      <a href={href} className={classes} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
