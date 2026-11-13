import { ArrowUpRight, Search, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { fmt } from '../../lib/format';
import type { LotProfile, ScreenedPart, Verdict } from '../../lib/types';
import { FleetScatter } from '../charts/FleetScatter';
import { Section, SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { VerdictBadge, verdictMeta } from '../ui/Verdict';

interface TelemetryProps {
  parts: ScreenedPart[];
  lots: LotProfile[];
  missed: number;
  onInspect: (part: ScreenedPart) => void;
}

const verdictOptions: Array<{ value: 'all' | Verdict; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pass', label: 'Pass' },
  { value: 'review', label: 'Review' },
  { value: 'reject', label: 'Reject' },
];

export function Telemetry({ parts, lots, missed, onInspect }: TelemetryProps) {
  const [lot, setLot] = useState('all');
  const [verdict, setVerdict] = useState<'all' | Verdict>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'forecast' | 'slope'>('forecast');
  const [limit, setLimit] = useState(10);

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
  const flagged = counts.review + counts.reject;
  const passShare = counts.total ? (counts.pass / counts.total) * 100 : 0;
  const reviewShare = counts.total ? (counts.review / counts.total) * 100 : 0;

  return (
    <Section id="telemetry" className="border-t border-white/[0.05]">
      <SectionHeading
        index="05"
        kicker="Module 02 · Batch telemetry database"
        title="2,000 die. One screen."
        description="The full 20-lot burn-in telemetry database, scored by the same engine that powers the screener. Search, filter, and sort the fleet, inspect a die, and send it straight back to the bench."
      />

      {parts.length === 0 ? (
        <Reveal>
          <div className="panel mt-10 flex h-52 items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
            acquiring fleet telemetry…
          </div>
        </Reveal>
      ) : (
        <>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.055] sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Fleet screened', value: counts.total.toLocaleString(), sub: '20 manufacturing lots', icon: ShieldCheck, color: 'text-accent' },
              { label: 'Flagged for action', value: flagged.toLocaleString(), sub: `${((flagged / counts.total) * 100).toFixed(1)}% of fleet`, icon: ShieldAlert, color: 'text-review' },
              { label: 'Hard rejects', value: counts.reject.toLocaleString(), sub: 'drift or static breach', icon: ShieldX, color: 'text-fail' },
              { label: 'Escaped defects', value: missed.toLocaleString(), sub: 'zero-escape gate', icon: ShieldCheck, color: missed === 0 ? 'text-pass' : 'text-fail' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Reveal key={card.label}>
                  <div className="flex h-full items-start justify-between bg-[#050b15] p-5">
                    <div>
                      <div className="label text-[8.5px]">{card.label}</div>
                      <div className="display mt-3 text-[28px] leading-none tnum">{card.value}</div>
                      <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">{card.sub}</div>
                    </div>
                    <Icon className={cn('h-4 w-4', card.color)} strokeWidth={1.6} />
                  </div>
                </Reveal>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
            <Reveal>
              <div className="panel h-full p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="label text-[8.5px]">Risk field</div>
                    <div className="mt-1 text-[13px] text-ink">24h drift vs 168h forecast</div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(['pass', 'review', 'reject'] as Verdict[]).map((key) => (
                      <span key={key} className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: verdictMeta[key].hex }} />
                        {key}
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
                      <span className="h-2 w-2 rounded-full border border-fail/60" />
                      labeled defect
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <FleetScatter parts={parts} />
                </div>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                  defect rings use withheld dataset labels — never visible to the engine
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="panel flex h-full flex-col p-5">
                <div className="label text-[8.5px]">Verdict mix</div>
                <div className="mt-1 text-[13px] text-ink">Across the screened fleet</div>

                <div className="flex flex-1 items-center justify-center gap-6 py-6">
                  <div
                    className="relative h-[148px] w-[148px] rounded-full"
                    style={{
                      background: `conic-gradient(#45e6a5 0% ${passShare}%, #ffbf5a ${passShare}% ${passShare + reviewShare}%, #ff5f7e ${passShare + reviewShare}% 100%)`,
                    }}
                  >
                    <div className="absolute inset-[19%] flex flex-col items-center justify-center rounded-full bg-[#050b15]">
                      <span className="display text-[26px] leading-none tnum">{counts.total.toLocaleString()}</span>
                      <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-dim">die</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'pass' as Verdict, value: counts.pass },
                      { key: 'review' as Verdict, value: counts.review },
                      { key: 'reject' as Verdict, value: counts.reject },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center gap-3">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: verdictMeta[item.key].hex }} />
                        <div>
                          <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted">{item.key}</div>
                          <div className="mt-0.5 flex items-baseline gap-1.5 font-mono text-[12px] tnum text-ink">
                            {item.value.toLocaleString()}
                            <span className="text-[8px] text-dim">
                              {((item.value / counts.total) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                    <span>review load</span>
                    <span className="text-ink">{((counts.review / counts.total) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-review/80" style={{ width: `${reviewShare}%` }} />
                  </div>
                  <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
                    Only the ambiguous middle goes to a human. Every labeled defect lands in reject.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.06}>
            <div className="panel mt-6 overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="label text-[8.5px]">Component ledger</div>
                  <div className="mt-1 text-[13px] text-ink">
                    {filtered.length.toLocaleString()} die match · sorted by {sort === 'forecast' ? 'projected leakage' : 'drift rate'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
                    <input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setLimit(10);
                      }}
                      placeholder="Search part or lot"
                      className="w-[168px] rounded-lg border border-white/[0.09] bg-[#060c17] py-2 pl-8 pr-3 font-mono text-[10px] text-ink placeholder:text-dim/70 focus:border-accent/40"
                      aria-label="Search parts"
                    />
                  </div>

                  <select
                    value={lot}
                    onChange={(event) => {
                      setLot(event.target.value);
                      setLimit(10);
                    }}
                    className="appearance-none rounded-lg border border-white/[0.09] bg-[#060c17] px-3 py-2 font-mono text-[10px] text-muted focus:border-accent/40"
                    aria-label="Filter by lot"
                  >
                    <option value="all">All lots</option>
                    {lots.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.id}
                      </option>
                    ))}
                  </select>

                  <div className="flex rounded-lg border border-white/[0.08] bg-[#060c17] p-0.5">
                    {verdictOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setVerdict(option.value);
                          setLimit(10);
                        }}
                        className={cn(
                          'rounded-md px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] transition-colors',
                          verdict === option.value ? 'bg-white/[0.07] text-ink' : 'text-dim hover:text-muted',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex rounded-lg border border-white/[0.08] bg-[#060c17] p-0.5">
                    {[
                      { value: 'forecast' as const, label: 'Leakage' },
                      { value: 'slope' as const, label: 'Drift' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSort(option.value)}
                        className={cn(
                          'rounded-md px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] transition-colors',
                          sort === option.value ? 'bg-white/[0.07] text-ink' : 'text-dim hover:text-muted',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] font-mono text-[8px] uppercase tracking-[0.14em] text-dim">
                      <th className="px-5 py-3 font-normal">Die / lot</th>
                      <th className="px-3 py-3 text-right font-normal">0h µA</th>
                      <th className="px-3 py-3 text-right font-normal">24h µA</th>
                      <th className="px-3 py-3 text-right font-normal">Δ24</th>
                      <th className="px-3 py-3 text-right font-normal">168h forecast</th>
                      <th className="px-3 py-3 text-right font-normal">actual</th>
                      <th className="px-3 py-3 text-right font-normal">error</th>
                      <th className="px-3 py-3 font-normal">verdict</th>
                      <th className="px-5 py-3 text-right font-normal">action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((part) => {
                      const delta = part.v24 - part.v0;
                      const error = Math.abs(part.screening.forecast - part.v168);
                      return (
                        <tr
                          key={part.partId}
                          className="group border-b border-white/[0.035] transition-colors last:border-0 hover:bg-white/[0.022]"
                        >
                          <td className="px-5 py-3">
                            <div className="font-mono text-[10.5px] tracking-[0.04em] text-ink">{part.partId}</div>
                            <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-dim">{part.lotId}</div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-[10.5px] tnum text-muted">{fmt(part.v0, 2)}</td>
                          <td className="px-3 py-3 text-right font-mono text-[10.5px] tnum text-muted">{fmt(part.v24, 2)}</td>
                          <td className="px-3 py-3 text-right font-mono text-[10.5px] tnum text-muted">{fmt(delta, 2)}</td>
                          <td
                            className="px-3 py-3 text-right font-mono text-[10.5px] tnum"
                            style={{ color: part.screening.verdict === 'reject' ? '#ff8da2' : '#e9effa' }}
                          >
                            {fmt(part.screening.forecast, 2)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-[10.5px] tnum text-dim">{fmt(part.v168, 2)}</td>
                          <td className="px-3 py-3 text-right font-mono text-[10.5px] tnum text-dim">{fmt(error, 2)}</td>
                          <td className="px-3 py-3">
                            <VerdictBadge verdict={part.screening.verdict} />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onInspect(part)}
                              className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent/35 hover:text-accent"
                            >
                              Inspect
                              <ArrowUpRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-14 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
                          no die match this filter
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3.5">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                  showing {rows.length} of {filtered.length.toLocaleString()} · inspect sends the die to the console
                </span>
                {limit < filtered.length ? (
                  <button
                    type="button"
                    onClick={() => setLimit((value) => value + 10)}
                    className="rounded-full border border-white/[0.09] bg-white/[0.02] px-3.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent/30 hover:text-ink"
                  >
                    Load 10 more
                  </button>
                ) : null}
              </div>
            </div>
          </Reveal>
        </>
      )}
    </Section>
  );
}
