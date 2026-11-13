import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Reveal } from './Reveal';

interface SectionHeadingProps {
  index: string;
  kicker: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeading({ index, kicker, title, description, className }: SectionHeadingProps) {
  return (
    <Reveal className={className}>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] tracking-[0.18em] text-accent/80">{index}</span>
        <span className="h-px w-8 bg-white/15" />
        <span className="label">{kicker}</span>
      </div>
      <h2 className="display mt-5 max-w-3xl text-balance text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.02]">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>
      ) : null}
    </Reveal>
  );
}

export function Section({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn('relative scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32', className)}>
      <div className="mx-auto w-full max-w-[1240px]">{children}</div>
    </section>
  );
}
