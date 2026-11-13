import type { ConsoleInput, DriftModel, LotProfile, ScreeningReason, ScreeningResult, Verdict } from './types';

interface CertificateBody {
  schema: string;
  issued_at: string;
  facility: string;
  standards: string[];
  component: {
    id: string;
    lot: string;
    measurements_uA: { h0: number; h24: number; h96?: number };
  };
  lot_baseline: { mean_uA: number; sigma_uA: number; z_24h: number; z_96h?: number };
  model: {
    architecture: string;
    features: string[];
    coefficients: number[];
    safety_slope_uA_per_h: number;
    usl_uA: number;
  };
  prediction: { forecast_168h_uA: number; projected_slope_uA_per_h: number; usl_margin_uA: number };
  decision: { verdict: Verdict; health_score: number; rationale: string; reasons: ScreeningReason[] };
  evidence_window: string;
}

export type QaCertificate = CertificateBody & {
  certificate_id: string;
  reproducibility: { engine: string; deterministic: boolean; checksum_fnv1a32: string };
};

export interface CertificateContext {
  input: ConsoleInput;
  lot: LotProfile;
  result: ScreeningResult;
  model: DriftModel;
}

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createCertificate({ input, lot, result, model }: CertificateContext): QaCertificate {
  const usesLateRead = model.config.slots.some((slot) => slot === 'v96' || slot === 'slope2496' || slot === 'z96');
  const body: CertificateBody = {
    schema: 'spacedock.qa-certificate/v1',
    issued_at: new Date().toISOString(),
    facility: 'SPACEDOCK MISSION CONTROL · CLIENT-SIDE',
    standards: ['MIL-STD-883', 'AEC-Q001', '125 °C ESS'],
    component: {
      id: input.partId ?? `ADHOC-${input.lotId}`,
      lot: input.lotId,
      measurements_uA: {
        h0: round(input.v0),
        h24: round(input.v24),
        ...(usesLateRead ? { h96: round(input.v96) } : {}),
      },
    },
    lot_baseline: {
      mean_uA: round(lot.mean),
      sigma_uA: round(lot.sigma),
      z_24h: round(result.z24, 3),
      ...(usesLateRead ? { z_96h: round(result.z96, 3) } : {}),
    },
    model: {
      architecture: `degree-${model.config.degree} drift regressor · ridge-stabilized OLS`,
      features: model.terms.slice(1),
      coefficients: model.coef.map((value) => round(value, 6)),
      safety_slope_uA_per_h: 0.016599,
      usl_uA: 50,
    },
    prediction: {
      forecast_168h_uA: round(result.forecast, 3),
      projected_slope_uA_per_h: round(result.slope, 6),
      usl_margin_uA: round(result.margin, 3),
    },
    decision: {
      verdict: result.verdict,
      health_score: result.health,
      rationale: result.rationale,
      reasons: result.reasons,
    },
    evidence_window: usesLateRead
      ? '0 h + 24 h + 96 h measurements · 72 h removed from ESS loop'
      : '0 h + 24 h measurements · 144 h removed from ESS loop',
  };

  const checksum = fnv1a(JSON.stringify(body));

  return {
    ...body,
    certificate_id: `SD-${input.lotId}-${checksum.toUpperCase()}`,
    reproducibility: {
      engine: 'spacedock-web/1.0.0',
      deterministic: true,
      checksum_fnv1a32: checksum,
    },
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
