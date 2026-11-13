import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Download, FileCheck2, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { copyText, downloadJson, type QaCertificate } from '../lib/certificate';
import { VerdictBadge } from './ui/Verdict';

interface QaDrawerProps {
  open: boolean;
  onClose: () => void;
  certificate: QaCertificate | null;
}

export function QaDrawer({ open, onClose, certificate }: QaDrawerProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const json = certificate ? JSON.stringify(certificate, null, 2) : '';

  const handleCopy = async () => {
    if (!certificate) return;
    await copyText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!certificate) return;
    const id = certificate.component.id.replace(/[^a-z0-9-_]/gi, '').toLowerCase();
    downloadJson(`spacedock-qa-${id}.json`, certificate);
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80]">
          <motion.button
            type="button"
            aria-label="Close QA record"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="QA record"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[600px] flex-col border-l border-white/[0.08] bg-[#050a13] shadow-[-30px_0_80px_-40px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5">
              <div>
                <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-accent/85">
                  <FileCheck2 className="h-3 w-3" />
                  QA record
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted">
                  {certificate ? certificate.certificate_id : 'not resolved'}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-muted transition-colors hover:text-ink"
                aria-label="Close QA record"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {certificate ? (
              <>
                <div className="border-b border-white/[0.06] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="label text-[8px]">Article</div>
                      <div className="mt-1 font-mono text-[13px] text-ink">{certificate.component.trace}</div>
                      <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                        {certificate.component.lot} · {certificate.station}
                      </div>
                    </div>
                    <VerdictBadge verdict={certificate.decision.verdict} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-white/[0.07] bg-white/[0.055]">
                    {[
                      { label: 'Health score', value: `${certificate.decision.health_score}` },
                      { label: '168 h forecast', value: `${certificate.prediction.forecast_168h_uA} µA` },
                      { label: 'Projected slope', value: `${certificate.prediction.projected_slope_uA_per_h} µA/h` },
                      { label: 'USL margin', value: `${certificate.prediction.usl_margin_uA} µA` },
                    ].map((cell) => (
                      <div key={cell.label} className="bg-[#050b15] px-3 py-2">
                        <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-dim">{cell.label}</div>
                        <div className="mt-1 font-mono text-[11px] tnum text-ink">{cell.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {certificate.model.slots.map((slot) => (
                      <span
                        key={slot.id}
                        className="rounded border border-accent/20 bg-accent/[0.05] px-1.5 py-0.5 font-mono text-[7.5px] text-accent"
                      >
                        {slot.label}
                      </span>
                    ))}
                    <span className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[7.5px] text-dim">
                      deg {certificate.model.degree} · {certificate.model.terms.length} terms
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">
                    <span>checksum {certificate.reproducibility.checksum_fnv1a32}</span>
                    <span>config {certificate.reproducibility.config_fingerprint}</span>
                    <span className="inline-flex items-center gap-1 text-pass">
                      <ShieldCheck className="h-3 w-3" />
                      deterministic
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5">
                  <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">
                    JSON payload · schema {certificate.schema}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 rounded border border-white/[0.09] bg-white/[0.025] px-2.5 py-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-accent/30 hover:text-accent"
                    >
                      {copied ? <Check className="h-3 w-3 text-pass" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1.5 rounded border border-accent/30 bg-accent/[0.08] px-2.5 py-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-accent transition-colors hover:bg-accent/[0.14]"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </div>
                </div>

                <pre className="scroll-thin flex-1 overflow-auto bg-black/35 px-4 py-3 font-mono text-[8.5px] leading-[1.6] text-[#a9bdd6]">
                  {json}
                </pre>

                <div className="border-t border-white/[0.06] px-4 py-2.5 font-mono text-[7px] uppercase tracking-[0.1em] text-dim">
                  checksum excludes issued_at · {certificate.reproducibility.checksum_scope} · engine{' '}
                  {certificate.reproducibility.engine}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
                resolving the QA record…
              </div>
            )}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
