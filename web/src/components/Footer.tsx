import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { Logo } from './ui/Logo';

const platformLinks = [
  { label: 'Mission', href: '#mission' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Working model', href: '#model' },
  { label: 'Live console', href: '#console' },
  { label: 'Fleet telemetry', href: '#telemetry' },
  { label: 'Validation', href: '#validation' },
];

const standards = ['MIL-STD-883', 'AEC-Q001', '125 °C ESS', '168 h burn-in', 'Zero-escape gate'];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-[#02050c] px-5 pb-8 pt-20 sm:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-overlay absolute inset-0 opacity-40" />
        <div className="absolute -bottom-56 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(79,227,255,0.08),transparent)] blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1240px]">
        <div className="panel relative overflow-hidden p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(154,123,255,0.16),transparent)]" />
          <div className="relative grid items-end gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-accent/80">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pass" />
                Ready for the next lot
              </div>
              <h2 className="display mt-5 text-[clamp(2rem,4.6vw,3.5rem)] leading-[0.98]">
                Clear the fleet
                <span className="block text-gradient">before it ships.</span>
              </h2>
              <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-muted">
                One 24-hour snapshot. One deterministic model. A verdict for every die — and the evidence to defend it.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <a
                href="#console"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[13px] font-medium text-[#03131a] shadow-[0_0_34px_-8px_rgba(79,227,255,0.75)] transition-colors hover:bg-[#8df0ff]"
              >
                Open live console
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href="#telemetry"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-5 py-3 text-[13px] text-ink transition-colors hover:border-accent/40"
              >
                Explore telemetry
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[300px] text-[12px] leading-relaxed text-muted">
              Space-grade semiconductor screening for 125 °C environmental stress testing. Built on the SpaceDock
              research pipeline: lot-aware anomaly detection plus early drift forecasting.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-pass" />
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-dim">
                Engine online · browser inference
              </span>
            </div>
          </div>

          <div>
            <h3 className="label text-[8.5px]">Platform</h3>
            <ul className="mt-4 space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-[12px] text-muted transition-colors hover:text-ink">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="label text-[8.5px]">Standards</h3>
            <ul className="mt-4 space-y-2.5">
              {standards.map((standard) => (
                <li key={standard} className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted">
                  {standard}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="label text-[8.5px]">Source</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href="https://github.com/aryansharmacse354-beep/SpaceDock"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink"
                >
                  GitHub repository
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="#model" className="text-[12px] text-muted transition-colors hover:text-ink">
                  Model card
                </a>
              </li>
              <li>
                <a href="#audit" className="text-[12px] text-muted transition-colors hover:text-ink">
                  QA certificate
                </a>
              </li>
              <li>
                <a href="#top" className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink">
                  Return to orbit
                  <ArrowUp className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-5 md:flex-row md:items-center md:justify-between">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
            © 2026 SpaceDock · mission control demonstration
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
            Synthetic 20-lot telemetry · screening aid only · not a flight qualification authority
          </span>
        </div>
      </div>
    </footer>
  );
}
