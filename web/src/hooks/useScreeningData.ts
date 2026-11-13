import { useEffect, useMemo, useState } from 'react';
import { buildLotProfiles, buildModelReport } from '../lib/model';
import { parseTelemetry } from '../lib/telemetry';
import type { DriftModel, LotProfile, ModelConfig, ModelMetrics, PartRecord, ScreenedPart } from '../lib/types';

export interface ScreeningDataState {
  status: 'loading' | 'ready' | 'error';
  records: PartRecord[];
  parts: ScreenedPart[];
  lots: LotProfile[];
  metrics: ModelMetrics | null;
  model: DriftModel | null;
  error: string | null;
}

interface FeedState {
  status: 'loading' | 'ready' | 'error';
  records: PartRecord[];
  lots: LotProfile[];
  error: string | null;
}

const initialFeed: FeedState = {
  status: 'loading',
  records: [],
  lots: [],
  error: null,
};

export function useScreeningData(config: ModelConfig): ScreeningDataState {
  const [feed, setFeed] = useState<FeedState>(initialFeed);

  useEffect(() => {
    let cancelled = false;

    fetch(`${import.meta.env.BASE_URL}data/telemetry.csv`)
      .then((response) => {
        if (!response.ok) throw new Error(`Telemetry feed returned ${response.status}`);
        return response.text();
      })
      .then((text) => {
        const records = parseTelemetry(text);
        if (records.length === 0) throw new Error('Telemetry feed contained no die records.');
        if (!cancelled) {
          setFeed({ status: 'ready', records, lots: buildLotProfiles(records), error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFeed({
            status: 'error',
            records: [],
            lots: [],
            error: error instanceof Error ? error.message : 'Unable to load the telemetry feed.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const report = useMemo(() => {
    if (feed.records.length === 0) return null;
    return buildModelReport(feed.records, config);
  }, [feed.records, config]);

  return {
    status: feed.status,
    records: feed.records,
    parts: report?.screened ?? [],
    lots: feed.lots,
    metrics: report?.metrics ?? null,
    model: report?.model ?? null,
    error: feed.error,
  };
}
