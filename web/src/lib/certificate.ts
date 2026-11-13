import { configFingerprint, fnv1a32 } from './hash';
import { SAFETY_SLOPE, USL } from './model';
import { configSignature, SLOT_BY_ID } from './slots';
import type { ConsoleInput, DriftModel, LotProfile, ScreeningResult, Verdict } from './types';

export interface CertificateTerm {
  term: string;
  coefficient: number;
}

export interface QaCertificate {
  schema: string;
  certificate_id: string;
  issued_at: string;
  station: string;
  standards: string[];
  component: {
    id: string;
    trace: string;
    lot: string;
    measurements_uA: { h0: number; h24: number; h96: number };
  };
  lot_baseline: {
    mean_uA: number;
    sigma_uA: number;
    z_24h: number;
    z_96h: number;
  };
  model: {
    architecture: string;
    slots: Array<{ id: string; label: string; kind: string; unit: string }>;
    degree: number;
    lambda: number;
    terms: CertificateTerm[];
    safety_slope_uA_per_h: number;
    usl_uA: number;
  };
  prediction: {
    forecast_168h_uA: number;
    projected_slope_uA_per_h: number;
    usl_margin_uA: number;
  };
  decision: {
    verdict: Verdict;
    health_score: number;
    rationale: string;
    reasons: ScreeningResult['reasons'];
  };
  evidence_window: string;
  reproducibility: {
    engine: string;
    deterministic: boolean;
    checksum_fnv1a32: string;
    checksum_scope: string;
    config_fingerprint: string;
  };
}

interface CertificateContext {
  input: ConsoleInput;
  lot: LotProfile;
  result: ScreeningResult;
  model: DriftModel;
}

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

export function createCertificate({ input, lot, result, model }: CertificateContext): QaCertificate {
  const trace = input.partId ?? `ADHOC-${input.lotId}`;
  const usesLateRead = model.config.slots.some((id) => id === 'v96' || id === 'slope2496' || id === 'z96');

  const body = {
    schema: 'spacedock.qa-record/v2',
    issued_at: new Date().toISOString(),
    station: 'SPACEDOCK ESS-01 · CLIENT-SIDE INFERENCE',
    standards: ['MIL-STD-883', 'AEC-Q001', '125 °C ESS', '168 h burn-in'],
    component: {
      id: trace,
      trace,
      lot: input.lotId,
      measurements_uA: { h0: round(input.v0), h24: round(input.v24), h96: round(input.v96) },
    },
    lot_baseline: {
      mean_uA: round(lot.mean),
      sigma_uA: round(lot.sigma),
      z_24h: round(result.z24, 3),
      z_96h: round(result.z96, 3),
    },
    model: {
      architecture: `standardized polynomial ridge OLS · degree ${model.config.degree}`,
      slots: model.config.slots.map((id) => {
        const slot = SLOT_BY_ID[id];
        return { id, label: slot.label, kind: slot.kind, unit: slot.unit };
      }),
      degree: model.config.degree,
      lambda: model.config.lambda,
      terms: model.terms.map((term, index) => ({
        term,
        coefficient: round(model.coef[index] ?? 0, 8),
      })),
      safety_slope_uA_per_h: SAFETY_SLOPE,
      usl_uA: USL,
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
      ? '0 h + 24 h + 96 h measurements · 72 h removed from the ESS loop'
      : '0 h + 24 h measurements · 144 h removed from the ESS loop',
  };

  const checksum = fnv1a32(JSON.stringify(body, (key, value) => (key === 'issued_at' ? undefined : value)));

  return {
    ...body,
    certificate_id: `SD-${input.lotId}-${checksum.toUpperCase()}`,
    reproducibility: {
      engine: 'spacedock-web/2.0.0',
      deterministic: true,
      checksum_fnv1a32: checksum,
      checksum_scope: 'payload excluding issued_at',
      config_fingerprint: configFingerprint(configSignature(model.config)),
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

export async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
}
