import { ArrowUpRight, Braces, Check, Copy, Download, Fingerprint, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/cn';
import type { QaCertificate } from '../../lib/certificate';
import type { ScreeningResult } from '../../lib/types';
import { Section, SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';

interface AuditProps {
  certificate: QaCertificate | null;
  result: ScreeningResult | null;
  onDownload: () => void;
}

const guarantees = [
  {
    icon: Fingerprint,
    title: 'Deterministic replay',
    copy: 'Same inputs, same coefficients, same verdict. The model is refit from the same 2,000 traces on every load.',
  },
  {
    icon: LockKeyhole,
    title: 'Sealed inputs',
    copy: 'The certificate records both measurements, the lot baseline, and the exact z-score used at the gate.',
  },
  {
    icon: Braces,
    title: 'Machine-readable',
    copy: 'A versioned JSON schema that drops into a QA ledger, MES, or supplier review without re-keying.',
  },
];

export function Audit({ certificate, result, onDownload }: AuditProps) {
  const [copied, setCopied] = useState(false);
  const json = certificate ? JSON.stringify(certificate, null, 2) : null;
  const lines = json ? json.split('\n') : [];

  const copyCertificate = async () => {
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
    } catch {
      const area = document.createElement('textarea');
      area.value = json;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      setCopied(ok);
    }
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Section id="audit" className="border-t border-white/[0.05]">
      <SectionHeading
        index="07"
        kicker="Audit & handoff"
        title="Every verdict ships with evidence."
        description="A screening decision is only useful if it can be defended six months later. The console issues a complete QA record with every verdict — inputs, model, reasons, and checksum."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex min-w-0 flex-col gap-3">
          {guarantees.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={index * 0.06}>
                <div className="flex gap-4 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-accent">
                    <Icon className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                  <div>
                    <h3 className="text-[13.5px] font-medium text-ink">{item.title}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.copy}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}

          <Reveal delay={0.2}>
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onDownload}
                disabled={!certificate}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-medium transition-colors',
                  certificate
                    ? 'bg-accent text-[#03131a] hover:bg-[#8df0ff]'
                    : 'cursor-not-allowed border border-white/5 bg-white/[0.02] text-dim',
                )}
              >
                <Download className="h-3.5 w-3.5" />
                Download certificate
              </button>
              <button
                type="button"
                onClick={copyCertificate}
                disabled={!certificate}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] text-ink transition-colors hover:border-accent/35 disabled:cursor-not-allowed disabled:text-dim"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-pass" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
              <a
                href="#console"
                className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
              >
                Re-run in console
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.24}>
            <p className="mt-2 max-w-md text-[11px] leading-relaxed text-dim">
              Certificate integrity uses an FNV-1a checksum over the canonical record. It is a tamper-evident
              demonstration, not a cryptographic flight-authority signature.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="min-w-0">
          <div className="panel min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-fail/60" />
                  <span className="h-2 w-2 rounded-full bg-review/60" />
                  <span className="h-2 w-2 rounded-full bg-pass/60" />
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  spacedock-qa-certificate.json
                </span>
              </div>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.14em]',
                  result
                    ? result.verdict === 'reject'
                      ? 'border-fail/25 bg-fail/[0.08] text-fail'
                      : result.verdict === 'review'
                        ? 'border-review/25 bg-review/[0.08] text-review'
                        : 'border-pass/25 bg-pass/[0.08] text-pass'
                    : 'border-white/10 bg-white/[0.03] text-dim',
                )}
              >
                {result ? `verdict · ${result.verdict}` : 'awaiting verdict'}
              </span>
            </div>

            <div className="scroll-thin max-h-[480px] overflow-auto bg-[#03070d]">
              {certificate ? (
                <div className="min-w-[520px] py-4 font-mono text-[10px] leading-[1.75]">
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-[42px_1fr] gap-3 px-3 hover:bg-white/[0.02]">
                      <span className="select-none pr-1 text-right text-[9px] text-dim/40">{String(index + 1).padStart(2, '0')}</span>
                      <span className="whitespace-pre text-[#a9bdd6]">{line}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[360px] items-center justify-center font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                  issue a verdict in the console…
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                <span className="h-1.5 w-1.5 rounded-full bg-pass" />
                {certificate ? certificate.certificate_id : 'checksum pending'}
              </div>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                fnv-1a · {certificate ? certificate.reproducibility.checksum_fnv1a32 : '—'}
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
