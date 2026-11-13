import { useEffect, useMemo, useRef, useState } from 'react';
import { Footer } from './components/Footer';
import { Fleet } from './components/Fleet';
import { ModelLab } from './components/ModelLab';
import { Nav } from './components/Nav';
import { QaDrawer } from './components/QaDrawer';
import { SystemHeader } from './components/SystemHeader';
import { Validation } from './components/Validation';
import { Workbench } from './components/Workbench';
import { useScreeningData } from './hooks/useScreeningData';
import { createCertificate, type QaCertificate } from './lib/certificate';
import { buildModelReport, screenDie } from './lib/model';
import { DEFAULT_CONFIG, normalizeConfig } from './lib/slots';
import type { ConsoleInput, LotProfile, ModelConfig, ScreenedPart, SlotId } from './lib/types';

const FALLBACK_INPUT: ConsoleInput = { lotId: 'LOT-001', v0: 10.17, v24: 10.36, v96: 10.62 };
const FALLBACK_LOT: LotProfile = { id: 'LOT-001', mean: 10.1676, sigma: 0.6256 };

export default function App() {
  const data = useScreeningData();
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [inputOverride, setInputOverride] = useState<ConsoleInput | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const highlightTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    },
    [],
  );

  const report = useMemo(() => {
    if (data.records.length === 0) return null;
    return buildModelReport(data.records, config);
  }, [data.records, config]);

  const baselineInput = useMemo<ConsoleInput>(() => {
    const preferred =
      data.records.find((part) => part.lotId === 'LOT-001' && !part.defect) ??
      data.records.find((part) => !part.defect);
    if (!preferred) return FALLBACK_INPUT;
    return {
      lotId: preferred.lotId,
      v0: preferred.v0,
      v24: preferred.v24,
      v96: preferred.v96,
      partId: preferred.partId,
    };
  }, [data.records]);

  const input = inputOverride ?? baselineInput;

  const lot = useMemo<LotProfile>(() => {
    return data.lots.find((profile) => profile.id === input.lotId) ?? FALLBACK_LOT;
  }, [data.lots, input.lotId]);

  const result = useMemo(() => {
    if (!report) return null;
    return screenDie(input, lot, report.model);
  }, [report, input, lot]);

  const certificate = useMemo<QaCertificate | null>(() => {
    if (!report || !result) return null;
    return createCertificate({ input, lot, result, model: report.model });
  }, [report, input, lot, result]);

  const handleAddSlot = (id: SlotId) => {
    setConfig((current) =>
      current.slots.includes(id)
        ? current
        : normalizeConfig({ ...current, slots: [...current.slots, id] }),
    );
  };

  const handleRemoveSlot = (id: SlotId) => {
    setConfig((current) =>
      current.slots.length <= 1
        ? current
        : normalizeConfig({ ...current, slots: current.slots.filter((slot) => slot !== id) }),
    );
  };

  const handleDeploy = (next: ModelConfig) => {
    setConfig(normalizeConfig(next));
  };

  const handleInspect = (part: ScreenedPart) => {
    setInputOverride({
      lotId: part.lotId,
      v0: part.v0,
      v24: part.v24,
      v96: part.v96,
      partId: part.partId,
    });
    setHighlight(true);
    document.getElementById('workbench')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlight(false), 2200);
  };

  const handleReset = () => {
    setInputOverride({ ...baselineInput, partId: undefined });
  };

  return (
    <div className="min-h-screen bg-void">
      <Nav onOpenQa={() => setQaOpen(true)} />

      {data.status === 'error' ? (
        <div className="fixed inset-x-0 top-[68px] z-[60] border-b border-fail/25 bg-[#240a11]/95 px-4 py-2.5 backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-fail">
              Telemetry feed offline · {data.error}
            </span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded border border-fail/30 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-fail/90 hover:bg-fail/10"
            >
              Retry feed
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6">
        <SystemHeader
          total={data.records.length || 2000}
          lots={data.lots.length || 20}
          metrics={report?.metrics ?? null}
          config={report?.model.config ?? config}
          ready={data.status === 'ready'}
        />

        <Workbench
          lots={data.lots}
          parts={report?.screened ?? []}
          input={input}
          onChange={setInputOverride}
          onReset={handleReset}
          lot={lot}
          result={result}
          model={report?.model ?? null}
          metrics={report?.metrics ?? null}
          ready={data.status === 'ready'}
          highlight={highlight}
          certificateId={certificate?.certificate_id ?? null}
          onOpenQa={() => setQaOpen(true)}
          onAddSlot={handleAddSlot}
          onRemoveSlot={handleRemoveSlot}
        />

        {report ? (
          <>
            <ModelLab
              records={data.records}
              active={report}
              activeConfig={report.model.config}
              onDeploy={handleDeploy}
            />
            <Fleet
              parts={report.screened}
              lots={data.lots}
              metrics={report.metrics}
              onInspect={handleInspect}
            />
            <Validation report={report} config={report.model.config} parts={report.screened} />
          </>
        ) : (
          <div className="panel mt-8 flex h-40 items-center justify-center font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
            {data.status === 'error' ? 'model unavailable until the feed recovers' : 'compiling the drift model…'}
          </div>
        )}
      </main>

      <Footer />
      <QaDrawer open={qaOpen} onClose={() => setQaOpen(false)} certificate={certificate} />
    </div>
  );
}
