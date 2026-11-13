import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { ArrowUpRight, FileCheck2, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useActiveSection } from '../hooks/useActiveSection';
import { cn } from '../lib/cn';
import { Logo } from './ui/Logo';

const LINKS = [
  { id: 'workbench', label: 'Workbench' },
  { id: 'model-lab', label: 'Model lab' },
  { id: 'fleet', label: 'Fleet' },
  { id: 'validation', label: 'Validation' },
];

const SECTION_IDS = ['top', ...LINKS.map((link) => link.id)];

export function Nav({ onOpenQa }: { onOpenQa: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.div
        className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-accent via-electric to-violet"
        style={{ scaleX: progress }}
      />
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-white/[0.07] bg-[#03060f]/88 backdrop-blur-xl'
            : 'border-b border-transparent bg-[#03060f]/55 backdrop-blur-sm',
        )}
      >
        <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Sections">
            {LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={cn(
                  'relative rounded-md px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.16em] transition-colors duration-200',
                  active === link.id ? 'text-accent' : 'text-muted hover:text-ink',
                )}
              >
                {active === link.id ? (
                  <span className="absolute inset-x-2 bottom-1 h-px bg-accent/80" />
                ) : null}
                <span className="relative">{link.label}</span>
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 xl:flex">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pass" />
              <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted">Engine live</span>
              <span className="h-3 w-px bg-white/10" />
              <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-dim">125.0 °C</span>
            </div>

            <button
              type="button"
              onClick={onOpenQa}
              className="hidden items-center gap-2 rounded-full border border-accent/30 bg-accent/[0.07] px-3.5 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/[0.13] sm:inline-flex"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              QA record
            </button>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ink lg:hidden"
              aria-label={open ? 'Close navigation' : 'Open navigation'}
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-white/[0.07] bg-[#03060f]/97 backdrop-blur-xl lg:hidden"
            >
              <div className="mx-auto grid max-w-[1440px] gap-1 px-4 py-4 sm:px-6">
                {LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-3 font-mono text-[11px] uppercase tracking-[0.16em]',
                      active === link.id ? 'bg-accent/[0.06] text-accent' : 'text-muted',
                    )}
                  >
                    {link.label}
                    <span className="text-dim">↗</span>
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenQa();
                  }}
                  className="mt-2 flex items-center justify-center gap-2 rounded-full border border-accent/30 bg-accent/[0.08] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-accent"
                >
                  <FileCheck2 className="h-4 w-4" />
                  QA record
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
}
