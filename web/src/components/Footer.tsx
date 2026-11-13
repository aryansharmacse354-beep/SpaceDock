import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { Logo } from './ui/Logo';

const links = [
  { label: 'Workbench', href: '#workbench' },
  { label: 'Model lab', href: '#model-lab' },
  { label: 'Fleet ledger', href: '#fleet' },
  { label: 'Validation', href: '#validation' },
];

const standards = ['MIL-STD-883', 'AEC-Q001', '125 °C ESS', '168 h burn-in', '±3σ PAT'];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#02050c] px-4 pb-6 pt-8 sm:px-6">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="grid gap-7 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-[360px] text-[11.5px] leading-relaxed text-muted">
              Lot-aware Iddq drift screening for 125 °C environmental stress testing. Parsing, fitting, and
              inference run entirely in this browser tab.
            </p>
            <div className="mt-3 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-pass" />
              engine v2.0.0 · deterministic · 2,000 traces / 20 lots
            </div>
          </div>

          <div>
            <div className="label text-[8px]">Station</div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-[11.5px] text-muted transition-colors hover:text-ink">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <a
                href="https://github.com/aryansharmacse354-beep/SpaceDock"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11.5px] text-muted transition-colors hover:text-ink"
              >
                Source repository
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div>
            <div className="label text-[8px]">Standards</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {standards.map((standard) => (
                <span
                  key={standard}
                  className="rounded border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-muted"
                >
                  {standard}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-white/[0.06] pt-4 md:flex-row md:items-center md:justify-between">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
            © 2026 SpaceDock · ESS screening workstation
          </span>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
              Synthetic telemetry · screening aid only · not a flight qualification authority
            </span>
            <a
              href="#top"
              className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
            >
              Top
              <ArrowUp className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
