import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { useActiveSection } from '../hooks/useActiveSection';
import { Logo } from './ui/Logo';

const LINKS = [
  { id: 'mission', label: 'Mission' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'model', label: 'Model' },
  { id: 'console', label: 'Console' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'validation', label: 'Validation' },
];

const SECTION_IDS = ['top', ...LINKS.map((link) => link.id), 'audit'];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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
            ? 'border-b border-white/[0.06] bg-[#03060f]/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-[74px] w-full max-w-[1280px] items-center justify-between gap-6 px-5 sm:px-8">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
            {LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={cn(
                  'relative rounded-full px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-200',
                  active === link.id ? 'text-accent' : 'text-muted hover:text-ink',
                )}
              >
                {active === link.id ? (
                  <span className="absolute inset-0 rounded-full border border-accent/20 bg-accent/[0.06]" />
                ) : null}
                <span className="relative">{link.label}</span>
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 xl:flex">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pass" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Engine online</span>
              <span className="h-3 w-px bg-white/10" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">125.0 °C</span>
            </div>

            <a
              href="#console"
              className="hidden items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12px] font-semibold text-[#03131a] transition-colors hover:bg-[#8df0ff] sm:inline-flex"
            >
              Launch console
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ink lg:hidden"
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
              className="overflow-hidden border-t border-white/[0.06] bg-[#03060f]/96 backdrop-blur-xl lg:hidden"
            >
              <div className="mx-auto grid max-w-[1280px] gap-1 px-5 py-4 sm:px-8">
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
                <a
                  href="#console"
                  onClick={() => setOpen(false)}
                  className="mt-2 flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-[13px] font-semibold text-[#03131a]"
                >
                  Launch console
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
}
