import { useEffect, useState } from 'react';
import { buildLotProfiles } from '../lib/model';
import { parseTelemetry } from '../lib/telemetry';
import type { LotProfile, PartRecord } from '../lib/types';

export interface ScreeningDataState {
  status: 'loading' | 'ready' | 'error';
  records: PartRecord[];
  lots: LotProfile[];
  error: string | null;
}

const initialState: ScreeningDataState = {
  status: 'loading',
  records: [],
  lots: [],
  error: null,
};

export function useScreeningData(): ScreeningDataState {
  const [state, setState] = useState<ScreeningDataState>(initialState);

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
          setState({ status: 'ready', records, lots: buildLotProfiles(records), error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
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

  return state;
}
