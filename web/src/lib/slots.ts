import type { LotProfile, ModelConfig, Signals, SlotId } from './types';

export interface SlotDefinition {
  id: SlotId;
  label: string;
  title: string;
  unit: string;
  kind: 'measured' | 'derived' | 'statistical';
  detail: string;
}

export const SLOT_LIBRARY: SlotDefinition[] = [
  {
    id: 'v0',
    label: 'V₀',
    title: '0 h leakage',
    unit: 'µA',
    kind: 'measured',
    detail: 'Incoming Iddq at time zero. Anchors the projected drift slope.',
  },
  {
    id: 'v24',
    label: 'V₂₄',
    title: '24 h leakage',
    unit: 'µA',
    kind: 'measured',
    detail: 'Post-stabilisation burn-in read taken after the first ESS soak.',
  },
  {
    id: 'v96',
    label: 'V₉₆',
    title: '96 h leakage',
    unit: 'µA',
    kind: 'measured',
    detail: 'Late burn-in read. Strongest single predictor of the 168 h endpoint.',
  },
  {
    id: 'd024',
    label: 'Δ₀→₂₄',
    title: 'Early delta',
    unit: 'µA',
    kind: 'derived',
    detail: 'V₂₄ − V₀. Removes die-to-die offset and isolates early movement.',
  },
  {
    id: 'z24',
    label: 'Z₂₄',
    title: 'Lot z-score at 24 h',
    unit: 'σ',
    kind: 'statistical',
    detail: 'Part-average-test deviation from the lot mean at 24 h.',
  },
  {
    id: 'slope2496',
    label: 'S₂₄→₉₆',
    title: 'Late slope',
    unit: 'µA/h',
    kind: 'derived',
    detail: '(V₉₆ − V₂₄) / 72. Captures acceleration between burn-in reads.',
  },
  {
    id: 'z96',
    label: 'Z₉₆',
    title: 'Lot z-score at 96 h',
    unit: 'σ',
    kind: 'statistical',
    detail: 'Part-average-test deviation from the lot mean at 96 h.',
  },
];

export const SLOT_BY_ID: Record<SlotId, SlotDefinition> = Object.fromEntries(
  SLOT_LIBRARY.map((slot) => [slot.id, slot]),
) as Record<SlotId, SlotDefinition>;

export const DEFAULT_CONFIG: ModelConfig = {
  slots: ['v0', 'v24'],
  degree: 2,
  lambda: 1e-7,
};

export const MIN_LAMBDA = 1e-12;
export const MAX_LAMBDA = 1;

export function slotValue(id: SlotId, signals: Signals, lot: LotProfile): number {
  const sigma = Math.max(lot.sigma, 0.05);
  switch (id) {
    case 'v0':
      return signals.v0;
    case 'v24':
      return signals.v24;
    case 'v96':
      return signals.v96;
    case 'd024':
      return signals.v24 - signals.v0;
    case 'z24':
      return (signals.v24 - lot.mean) / sigma;
    case 'slope2496':
      return (signals.v96 - signals.v24) / 72;
    case 'z96':
      return (signals.v96 - lot.mean) / sigma;
  }
}

export function clampLambda(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_CONFIG.lambda;
  return Math.min(MAX_LAMBDA, Math.max(MIN_LAMBDA, value));
}

export function normalizeConfig(config: ModelConfig): ModelConfig {
  const unique = [...new Set(config.slots)].filter((id): id is SlotId => id in SLOT_BY_ID);
  return {
    slots: unique.length > 0 ? unique : [...DEFAULT_CONFIG.slots],
    degree: config.degree === 1 ? 1 : 2,
    lambda: clampLambda(config.lambda),
  };
}

export function configSignature(config: ModelConfig): string {
  const normalized = normalizeConfig(config);
  return `${normalized.slots.join('+')}|deg${normalized.degree}|lambda:${normalized.lambda.toExponential(3)}`;
}

export function configLabel(config: ModelConfig): string {
  return `${config.slots.length} slot${config.slots.length === 1 ? '' : 's'} · deg ${config.degree}`;
}

export function lambdaLabel(value: number): string {
  if (value >= 1e-2) return value.toFixed(3);
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / 10 ** exponent;
  return `${mantissa.toFixed(1)}e${exponent}`;
}
