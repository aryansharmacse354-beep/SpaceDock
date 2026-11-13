import { useEffect, useMemo, useRef, useState } from 'react';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { Audit } from './components/sections/Audit';
import { Benchmarks } from './components/sections/Benchmarks';
import { Console } from './components/sections/Console';
import { Mission } from './components/sections/Mission';
import { ModelSection } from './components/sections/ModelSection';
import { Pipeline } from './components/sections/Pipeline';
import { Telemetry } from './components/sections/Telemetry';
import { useScreeningData } from './hooks/useScreeningData';
import { createCertificate, downloadJson, type QaCertificate } from './lib/certificate';
import { screenDie } from './lib/model';
import { DEFAULT_CONFIG } from './lib/slots';
import type { ConsoleInput, LotProfile, ModelConfig, ScreenedPart, SlotId } from './lib/types';

const FALLBACK_INPUT: ConsoleInput = { lotId: 'LOT-001', v0: 10.17, v24: 10.36, v96: 10.72 };
const FALLBACK_LOT: LotProfile = { id: 'LOT-001', mean: 10.1676, sigma: 0.6256 };
const LATE_READ_SLOTS: SlotId[] = ['v96', 'slope2496', 'z96'];

export default function App() {
  const [config, setConfig] = useState<ModelConfig>(() => ({
    ...DEFAULT_CONFIG,
    slots: [...DEFAULT_CONFIG.slots],
  }));
  const data = useScreeningData(config);
  const [inputOverride, setInputOverride] = useState<ConsoleInput | null>(null);
  const [highlight, setHighlight] = useState(false);
  const highlightTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    },
    [],
  );

  const baselineInput = useMemo<ConsoleInput>(() => {
    const preferred =
      data.parts.find((part) => part.lotId === 'LOT-001' && !part.defect) ?? data.parts.find((part) => !part.defect);
    if (!preferred) return FALLBACK_INPUT;
    return {
      lotId: preferred.lotId,
      v0: preferred.v0,
      v24: preferred.v24,
      v96: preferred.v96,
      partId: preferred.partId,
    };
  }, [data.parts]);

  const input = inputOverride ?? baselineInput;

  const lot = useMemo<LotProfile>(() => {
    return data.lots.find((profile) => profile.id === input.lotId) ?? FALLBACK_LOT;
  }, [data.lots, input.lotId]);

  const result = useMemo(() => {
    if (!data.model) return null;
    return screenDie(input, lot, data.model);
  }, [data.model, input, lot]);

  const certificate = useMemo<QaCertificate | null>(() => {
    if (!data.model || !result) return null;
    return createCertificate({ input, lot, result, model: data.model });
  }, [data.model, input, lot, result]);

  const heroSample = useMemo<ScreenedPart | null>(() => {
    if (data.parts.length === 0) return null;
    const latent = data.parts
      .filter((part) => part.defect && part.screening.forecast < 50)
      .sort((a, b) => b.screening.forecast - a.screening.forecast);
    return latent[0] ?? data.parts.find((part) => part.screening.verdict === 'reject') ?? null;
  }, [data.parts]);

  const ticker = useMemo(() => {
    if (data.parts.length === 0) return [];
    const risky = [...data.parts]
      .sort((a, b) => b.screening.forecast - a.screening.forecast)
      .slice(0, 6)
      .map(
        (part) =>
          `${part.lotId} · ${part.partId} · 168h ${part.screening.forecast.toFixed(2)} µA · ${part.screening.verdict.toUpperCase()}`,
      );
    const metrics = data.metrics;
    return [
      ...risky,
      'SAFETY SLOPE 0.016599 µA/h · STATIC USL 50 µA',
      metrics
        ? `LIVE RECALL ${(metrics.recall * 100).toFixed(1)}% · ${metrics.falseNegatives} ESCAPES · ${metrics.positives} DEFECTS`
        : 'ZERO ESCAPE GATE ARMED',
      'EVIDENCE WINDOW 0h + 24h · 144h SAVED',
      'MIL-STD-883 · AEC-Q001 · 125 °C ESS',
    ];
  }, [data.parts, data.metrics]);

  const handleInspect = (part: ScreenedPart) => {
    setInputOverride({
      lotId: part.lotId,
      v0: part.v0,
      v24: part.v24,
      v96: part.v96,
      partId: part.partId,
    });
    setHighlight(true);
    document.getElementById('console')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlight(false), 2200);
  };

  const handleReset = () => {
    setInputOverride({ ...baselineInput, partId: undefined });
  };

  const handleDownload = () => {
    if (!certificate) return;
    const id = certificate.component.id.replace(/[^a-z0-9-_]/gi, '').toLowerCase();
    downloadJson(`spacedock-qa-${id}.json`, certificate);
  };

  return (
    <div className="min-h-screen bg-void">
      <Nav />

      {data.status === 'error' ? (
        <div className="fixed inset-x-0 top-[74px] z-[60] border-b border-fail/25 bg-[#240a11]/95 px-5 py-2.5 backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fail">
              Telemetry feed offline · {data.error}
            </span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-fail/30 px-3 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-fail/90 hover:bg-fail/10"
            >
              Retry feed
            </button>
          </div>
        </div>
      ) : null}

      <main>
        <Hero
          totalDie={data.parts.length || 2000}
          positives={data.metrics?.positives ?? 199}
          recall={data.metrics?.recall ?? 1}
          falseNegatives={data.metrics?.falseNegatives ?? 0}
          r2={data.metrics?.r2 ?? null}
          reviewLoad={data.metrics?.reviewLoad ?? null}
          sample={heroSample}
          ticker={ticker}
        />

        <Mission />
        <Pipeline />
        <ModelSection
          metrics={data.metrics}
          model={data.model}
          config={config}
          onConfigChange={setConfig}
        />

        <Console
          lots={data.lots}
          parts={data.parts}
          input={input}
          onChange={setInputOverride}
          onReset={handleReset}
          lot={lot}
          result={result}
          ready={data.status === 'ready'}
          highlight={highlight}
          showV96={config.slots.some((slot) => LATE_READ_SLOTS.includes(slot))}
          certificateId={certificate?.certificate_id ?? null}
          onDownloadCertificate={handleDownload}
        />

        <Telemetry
          parts={data.parts}
          lots={data.lots}
          missed={data.metrics?.falseNegatives ?? 0}
          onInspect={handleInspect}
        />

        <Benchmarks metrics={data.metrics} />
        <Audit certificate={certificate} result={result} onDownload={handleDownload} />
      </main>

      <Footer />
    </div>
  );
}
