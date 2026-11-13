import { ArrowUpRight, Download, Search, ShieldCheck, ShieldX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '../lib/cn';
import { fmt } from '../lib/format';
import type { LotProfile, ModelMetrics, ScreenedPart, Verdict } from '../lib/types';
import { FleetScatter } from './charts/FleetScatter';
import { SectionBar } from './ui/SectionBar';
import { VerdictBadge, verdictMeta } from './ui/Verdict';

interface FleetProps {
  parts: ScreenedPart[];
  lots: LotProfile[];
  metrics: ModelMetrics | null;
  onInspect: (part: ScreenedPart) => void;
}

const verdictOptions: Array<{ value: 'all' | Verdict; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pass', label: 'Pass' },
  { value: 'review', label: 'Review' },
  { value: 'reject', label: 'Reject' },
];

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCsv(parts: ScreenedPart[]) {
  const header = [
    'part_id',
    'lot_id',
    'value_0h_uA',
    'value_24h_uA',
    'value_96h_uA',
    'forecast_168h_uA',
    'actual_168h_uA',
    'projected_slope_uA_per_h',
    'z_24h',
    'z_96h',
    'verdict',
    'latent_label',
  ];
  const lines = [header.join(',')];
  for (const part of parts) {
    lines.push(
      [
        part.partId,
        part.lotId,
        part.v0.toFixed(3),
        part.v24.toFixed(3),
        part.v96.toFixed(3),
        part.screening.forecast.toFixed(3),
        part.v168.toFixed(3),
        part.screening.slope.toFixed(6),
        part.screening.z24.toFixed(3),
        part.screening.z96.toFixed(3),
        part.screening.verdict,
        part.defect ? 1 : 0,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'spacedock-screened-fleet.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function Fleet({ parts, lots, metrics, onInspect }: FleetProps) {
  const [lot, setLot] = useState('all');
  const [verdict, setVerdict] = useState<'all' | Verdict>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'forecast' | 'slope'>('forecast');
  const [limit, setLimit] = useState(12);

  const counts = useMemo(() => {
    let pass = 0;
    let review = 0;
    let reject = 0;
    for (const part of parts) {
      if (part.screening.verdict === 'pass') pass += 1;
      else if (part.screening.verdict === 'review') review += 1;
      else reject += 1;
    }
    return { pass, review, reject, total: parts.length };
  }, [parts]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return parts
      .filter((part) => (lot === 'all' ? true : part.lotId === lot))
      .filter((part) => (verdict === 'all' ? true : part.screening.verdict === verdict))
      .filter(
        (part) =>
          needle.length === 0 ||
          part.partId.toLowerCase().includes(needle) ||
          part.lotId.toLowerCase().includes(needle),
      )
      .sort((a, b) =>
        sort === 'forecast'
          ? b.screening.forecast - a.screening.forecast
          : b.screening.slope - a.screening.slope,
      );
  }, [parts, lot, verdict, query, sort]);

  const rows = filtered.slice(0, limit);
  const passShare = counts.total ? (counts.pass / counts.total) * 100 : 0;
  const reviewShare = counts.total ? (counts.review / counts.total) * 100 : 0;
  const escapeCount = metrics?.falseNegatives ?? 0;

  return (
    <section id="fleet" className="scroll-mt-20 pt-8">
      <SectionBar
        index="03"
        title="Fleet ledger"
        description="Every trace scored by the deployed model. Filter, sort, export, or send a die back to the bench."
        actions={
          <>
            <span className="hidden rounded border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-dim sm:inline-flex">
              {counts.total.toLocaleString()} screened · {counts.review + counts.reject} flagged
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em]',
                escapeCount === 0
                  ? 'border-pass/25 bg-pass/[0.05] text-pass'
                  : 'border-fail/30 bg-fail/[0.06] text-fail',
              )}
            >
              {escapeCount === 0 ? <ShieldCheck className="h-3 w-3" /> : <ShieldX className="h-3 w-3" />}
              {escapeCount} escapes
            </span>
            <button
              type="button"
              onClick={() => exportCsv(filtered)}
              className="inline-flex items-center gap-1.5 rounded border border-white/[0.09] bg-white/[0.025] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-accent/30 hover:text-accent"
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
          </>
        }
      />

      {parts.length === 0 ? (
        <div className="panel mt-3 flex h-52 items-center justify-center font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
          acquiring fleet telemetry…
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-3 xl:grid-cols-[1.55fr_1fr]">
            <div className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="label text-[8px]">Risk field</div>
                  <div className="mt-0.5 text-[11.5px] text-ink">24 h drift vs 168 h forecast</div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(['pass', 'review', 'reject'] as Verdict[]).map((key) => (
                    <span
                      key={key}
                      className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: verdictMeta[key].hex }} />
                      {key}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted">
                    <span className="h-2 w-2 rounded-full border border-fail/60" />
                    label
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <FleetScatter parts={parts} />
              </div>
              <p className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-dim">
                defect rings use withheld labels · forecast axis clipped at 70 µA
              </p>
            </div>

            <div className="panel flex flex-col p-4">
              <div className="label text-[8px]">Verdict mix</div>
              <div className="mt-0.5 text-[11.5px] text-ink">Across the deployed screen</div>

              <div className="flex flex-1 items-center justify-center gap-5 py-4">
                <div
                  className="relative h-[132px] w-[132px] rounded-full"
                  style={{
                    background: `conic-gradient(#45e6a5 0% ${passShare}%, #ffbf5a ${passShare}% ${
                      passShare + reviewShare
                    }%, #ff5f7e ${passShare + reviewShare}% 100%)`,
                  }}
                >
                  <div className="absolute inset-[19%] flex flex-col items-center justify-center rounded-full bg-[#050b15]">
                    <span className="display text-[24px] leading-none tnum">{counts.total.toLocaleString()}</span>
                    <span className="mt-1 font-mono text-[7px] uppercase tracking-[0.14em] text-dim">die</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: 'pass' as Verdict, value: counts.pass },
                    { key: 'review' as Verdict, value: counts.review },
                    { key: 'reject' as Verdict, value: counts.reject },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center gap-2.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: verdictMeta[item.key].hex }}
                      />
                      <div>
                        <div className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-muted">
                          {item.key}
                        </div>
                        <div className="mt-0.5 flex items-baseline gap-1.5 font-mono text-[11px] tnum text-ink">
                          {item.value.toLocaleString()}
                          <span className="text-[7px] text-dim">
                            {((item.value / counts.total) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
                <div className="flex items-center justify-between font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">
                  <span>review load</span>
                  <span className="text-ink">{((counts.review / counts.total) * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-review/80" style={{ width: `${reviewShare}%` }} />
                </div>
                <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted">
                  Ambiguous die route to human review. Labeled defects are required to land in reject.
                </p>
              </div>
            </div>
          </div>

          <div className="panel mt-3 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] p-3.5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="label text-[8px]">Component ledger</div>
                <div className="mt-0.5 text-[11px] text-ink">
                  {filtered.length.toLocaleString()} die match · sorted by{' '}
                  {sort === 'forecast' ? 'projected leakage' : 'drift rate'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-dim" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setLimit(12);
                    }}
                    placeholder="Search part or lot"
                    className="w-[152px] rounded border border-white/[0.09] bg-[#060c17] py-1.5 pl-7 pr-2 font-mono text-[9.5px] text-ink placeholder:text-dim/70 focus:border-accent/40"
                    aria-label="Search parts"
                  />
                </div>

                <select
                  value={lot}
                  onChange={(event) => {
                    setLot(event.target.value);
                    setLimit(12);
                  }}
                  className="appearance-none rounded border border-white/[0.09] bg-[#060c17] px-2 py-1.5 font-mono text-[9.5px] text-muted focus:border-accent/40"
                  aria-label="Filter by lot"
                >
                  <option value="all">All lots</option>
                  {lots.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.id}
                    </option>
                  ))}
                </select>

                <div className="flex rounded border border-white/[0.08] bg-[#060c17] p-0.5">
                  {verdictOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setVerdict(option.value);
                        setLimit(12);
                      }}
                      className={cn(
                        'rounded px-2 py-1 font-mono text-[7.5px] uppercase tracking-[0.08em] transition-colors',
                        verdict === option.value ? 'bg-white/[0.08] text-ink' : 'text-dim hover:text-muted',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="flex rounded border border-white/[0.08] bg-[#060c17] p-0.5">
                  {[
                    { value: 'forecast' as const, label: 'Leakage' },
                    { value: 'slope' as const, label: 'Drift' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSort(option.value)}
                      className={cn(
                        'rounded px-2 py-1 font-mono text-[7.5px] uppercase tracking-[0.08em] transition-colors',
                        sort === option.value ? 'bg-white/[0.08] text-ink' : 'text-dim hover:text-muted',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] font-mono text-[7.5px] uppercase tracking-[0.12em] text-dim">
                    <th className="px-4 py-2.5 font-normal">Die / lot</th>
                    <th className="px-2.5 py-2.5 text-right font-normal">V0</th>
                    <th className="px-2.5 py-2.5 text-right font-normal">V24</th>
                    <th className="px-2.5 py-2.5 text-right font-normal">V96</th>
                    <th className="px-2.5 py-2.5 text-right font-normal">168h forecast</th>
                    <th className="px-2.5 py-2.5 text-right font-normal">actual</th>
                    <th className="px-2.5 py-2.5 text-right font-normal">error</th>
                    <th className="px-2.5 py-2.5 text-right font-normal">z24</th>
                    <th className="px-2.5 py-2.5 font-normal">verdict</th>
                    <th className="px-4 py-2.5 text-right font-normal">action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((part) => {
                    const error = Math.abs(part.screening.forecast - part.v168);
                    return (
                      <tr
                        key={part.partId}
                        className="group border-b border-white/[0.03] transition-colors last:border-0 hover:bg-white/[0.022]"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] tracking-[0.03em] text-ink">{part.partId}</span>
                            {part.defect ? (
                              <span
                                title="withheld latent-defect label"
                                className="h-1.5 w-1.5 rounded-full bg-fail/80"
                              />
                            ) : null}
                          </div>
                          <div className="mt-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">
                            {part.lotId}
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-mono text-[10px] tnum text-muted">
                          {fmt(part.v0, 2)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-mono text-[10px] tnum text-muted">
                          {fmt(part.v24, 2)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-mono text-[10px] tnum text-muted">
                          {fmt(part.v96, 2)}
                        </td>
                        <td
                          className="px-2.5 py-2.5 text-right font-mono text-[10px] tnum"
                          style={{ color: part.screening.verdict === 'reject' ? '#ff8da2' : '#e9effa' }}
                        >
                          {fmt(part.screening.forecast, 2)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-mono text-[10px] tnum text-dim">
                          {fmt(part.v168, 2)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-mono text-[10px] tnum text-dim">
                          {fmt(error, 2)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-mono text-[10px] tnum text-dim">
                          {part.screening.z24 >= 0 ? '+' : ''}
                          {fmt(part.screening.z24, 2)}
                        </td>
                        <td className="px-2.5 py-2.5">
                          <VerdictBadge verdict={part.screening.verdict} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => onInspect(part)}
                            className="inline-flex items-center gap-1 rounded border border-white/[0.08] px-2 py-1 font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-accent/35 hover:text-accent"
                          >
                            Inspect
                            <ArrowUpRight className="h-2.5 w-2.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-12 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-dim"
                      >
                        no die match this filter
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-2.5">
              <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-dim">
                showing {rows.length} of {filtered.length.toLocaleString()} · inspect sends the die to the bench
              </span>
              {limit < filtered.length ? (
                <button
                  type="button"
                  onClick={() => setLimit((value) => value + 12)}
                  className="rounded border border-white/[0.09] bg-white/[0.02] px-3 py-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-accent/30 hover:text-ink"
                >
                  Load 12 more
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
