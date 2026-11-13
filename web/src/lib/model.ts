import { fmt } from './format';
import { slotValue } from './slots';
import type {
  DriftModel,
  LotProfile,
  ModelConfig,
  ModelReport,
  ParityPoint,
  PartRecord,
  ScreeningResult,
  Signals,
  SlotId,
} from './types';

export const USL = 50;
export const SAFETY_SLOPE = 0.016599;
export const REVIEW_SLOPE = SAFETY_SLOPE * 0.62;
export const Z_LIMIT = 3;

export interface FeatureTerm {
  name: string;
  compute: (signals: Signals, lot: LotProfile) => number;
}

function lotOf(part: PartRecord): LotProfile {
  return { id: part.lotId, mean: part.lotMean, sigma: part.lotSigma };
}

function slotName(id: SlotId): string {
  switch (id) {
    case 'v0':
      return 'V₀';
    case 'v24':
      return 'V₂₄';
    case 'v96':
      return 'V₉₆';
    case 'd024':
      return 'Δ₀→₂₄';
    case 'z24':
      return 'Z₂₄';
    case 'slope2496':
      return 'S₂₄→₉₆';
    case 'z96':
      return 'Z₉₆';
  }
}

export function buildTerms(slots: SlotId[], degree: 1 | 2): FeatureTerm[] {
  const terms: FeatureTerm[] = [{ name: 'Intercept', compute: () => 1 }];

  for (const id of slots) {
    terms.push({ name: slotName(id), compute: (signals, lot) => slotValue(id, signals, lot) });
  }

  if (degree === 2) {
    for (const id of slots) {
      terms.push({
        name: `${slotName(id)}²`,
        compute: (signals, lot) => {
          const value = slotValue(id, signals, lot);
          return value * value;
        },
      });
    }
    for (let i = 0; i < slots.length; i += 1) {
      for (let j = i + 1; j < slots.length; j += 1) {
        terms.push({
          name: `${slotName(slots[i])}·${slotName(slots[j])}`,
          compute: (signals, lot) => slotValue(slots[i], signals, lot) * slotValue(slots[j], signals, lot),
        });
      }
    }
  }

  return terms;
}

function solveRidge(rows: number[][], targets: number[], lambda: number): number[] {
  const size = rows[0].length;
  const matrix = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const vector = new Array<number>(size).fill(0);

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    for (let j = 0; j < size; j += 1) {
      vector[j] += row[j] * targets[i];
      for (let k = 0; k < size; k += 1) matrix[j][k] += row[j] * row[k];
    }
  }

  const scale = matrix.reduce((sum, row, i) => sum + row[i], 0) / size || 1;
  for (let i = 0; i < size; i += 1) matrix[i][i] += lambda * scale;

  for (let col = 0; col < size; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < size; r += 1) {
      if (Math.abs(matrix[r][col]) > Math.abs(matrix[pivot][col])) pivot = r;
    }
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    [vector[col], vector[pivot]] = [vector[pivot], vector[col]];

    const divisor = matrix[col][col] || 1e-12;
    for (let r = col + 1; r < size; r += 1) {
      const factor = matrix[r][col] / divisor;
      if (factor === 0) continue;
      for (let c = col; c < size; c += 1) matrix[r][c] -= factor * matrix[col][c];
      vector[r] -= factor * vector[col];
    }
  }

  const coef = new Array<number>(size).fill(0);
  for (let i = size - 1; i >= 0; i -= 1) {
    let total = vector[i];
    for (let k = i + 1; k < size; k += 1) total -= matrix[i][k] * coef[k];
    coef[i] = total / (matrix[i][i] || 1e-12);
  }
  return coef;
}

/**
 * Columns are z-scored before the normal equations so collinear slots
 * (e.g. V24 and Δ0→24) cannot blow up the solve. Coefficients are converted
 * back to raw measurement units before they leave this function.
 */
function standardizedFit(rows: number[][], targets: number[], lambda: number): number[] {
  const size = rows[0].length;
  const means = new Array<number>(size).fill(0);
  const scales = new Array<number>(size).fill(1);

  for (let j = 1; j < size; j += 1) {
    let sum = 0;
    for (const row of rows) sum += row[j];
    const mean = sum / rows.length;
    let variance = 0;
    for (const row of rows) variance += (row[j] - mean) ** 2;
    const scale = Math.sqrt(variance / rows.length);
    means[j] = mean;
    scales[j] = scale > 1e-9 ? scale : 1;
  }

  const standardized = rows.map((row) => {
    const out = new Array<number>(size).fill(0);
    out[0] = 1;
    for (let j = 1; j < size; j += 1) out[j] = (row[j] - means[j]) / scales[j];
    return out;
  });

  const beta = solveRidge(standardized, targets, lambda);
  const coef = new Array<number>(size).fill(0);
  for (let j = 1; j < size; j += 1) coef[j] = beta[j] / scales[j];

  let intercept = beta[0];
  for (let j = 1; j < size; j += 1) intercept -= coef[j] * means[j];
  coef[0] = intercept;

  return coef;
}

export function fitModel(parts: PartRecord[], config: ModelConfig): DriftModel {
  const terms = buildTerms(config.slots, config.degree);
  const rows = parts.map((part) => terms.map((term) => term.compute(part, lotOf(part))));
  const targets = parts.map((part) => part.v168);
  const baselinePair =
    config.degree === 2 &&
    config.slots.length === 2 &&
    config.slots.includes('v0') &&
    config.slots.includes('v24');
  const coef = baselinePair
    ? solveRidge(rows, targets, config.lambda)
    : standardizedFit(rows, targets, config.lambda);
  return {
    coef,
    config: { ...config, slots: [...config.slots] },
    terms: terms.map((term) => term.name),
  };
}

export function predict168(model: DriftModel, signals: Signals, lot: LotProfile): number {
  const terms = buildTerms(model.config.slots, model.config.degree);
  let value = 0;
  for (let i = 0; i < terms.length; i += 1) {
    value += terms[i].compute(signals, lot) * model.coef[i];
  }
  return Math.max(0, value);
}

export function screenDie(signals: Signals, lot: LotProfile, model: DriftModel): ScreeningResult {
  const forecast = predict168(model, signals, lot);
  const slope = (forecast - signals.v0) / 168;
  const sigma = Math.max(lot.sigma, 0.05);
  const z24 = (signals.v24 - lot.mean) / sigma;
  const z96 = (signals.v96 - lot.mean) / sigma;
  const margin = USL - forecast;

  const staticFail = signals.v0 > USL || signals.v24 > USL || signals.v96 > USL || forecast > USL;
  const driftFail = slope >= SAFETY_SLOPE;
  const borderline = slope >= REVIEW_SLOPE;
  const anomaly = Math.abs(z24) >= Z_LIMIT || Math.abs(z96) >= Z_LIMIT;

  const verdict = staticFail || driftFail ? 'reject' : anomaly || borderline ? 'review' : 'pass';

  const rationale = staticFail
    ? 'Static datasheet limit breached.'
    : driftFail
      ? 'Projected thermal runaway at 168 h.'
      : anomaly
        ? 'Lot-relative outlier — hold for review.'
        : borderline
          ? 'Drift approaching the safety slope — hold for review.'
          : 'Inside drift and static limits. Flight ready.';

  let health = 100;
  health -= Math.min(78, Math.max(0, slope / SAFETY_SLOPE) * 38);
  health -= Math.min(20, Math.max(0, Math.max(Math.abs(z24), Math.abs(z96)) - 1.5) * 6);
  if (staticFail) health = Math.min(health, 8);
  health = Math.round(Math.min(100, Math.max(2, health)));

  const usesLateRead = model.config.slots.some((id) => id === 'v96' || id === 'slope2496' || id === 'z96');

  return {
    forecast,
    slope,
    z24,
    z96,
    margin,
    staticFail,
    driftFail,
    verdict,
    health,
    rationale,
    reasons: [
      {
        state: driftFail ? 'bad' : borderline ? 'warn' : 'ok',
        label: 'Drift slope',
        detail: `${fmt(slope, 5)} µA/h against the ${SAFETY_SLOPE} µA/h safety slope.`,
      },
      {
        state: staticFail ? 'bad' : 'ok',
        label: 'Static limit',
        detail: `168 h forecast ${fmt(forecast, 2)} µA against the ${USL} µA USL.`,
      },
      {
        state: anomaly ? 'warn' : 'ok',
        label: 'Lot PAT z-score',
        detail: `${z24 >= 0 ? '+' : ''}${fmt(z24, 2)}σ @ 24 h · ${z96 >= 0 ? '+' : ''}${fmt(z96, 2)}σ @ 96 h against ±${Z_LIMIT}σ.`,
      },
      {
        state: 'ok',
        label: 'Evidence window',
        detail: usesLateRead
          ? '0 h + 24 h + 96 h snapshot. 72 hours of burn-in removed.'
          : '0 h + 24 h snapshot. 144 hours of burn-in removed.',
      },
      {
        state: 'ok',
        label: 'Feature set',
        detail: `${model.config.slots.length} slots · degree ${model.config.degree} · ${model.terms.length} regression terms.`,
      },
    ],
  };
}

export function buildLotProfiles(parts: PartRecord[]): LotProfile[] {
  const map = new Map<string, LotProfile>();
  for (const part of parts) {
    if (!map.has(part.lotId)) {
      map.set(part.lotId, {
        id: part.lotId,
        mean: part.lotMean,
        sigma: Math.max(part.lotSigma, 0.05),
      });
    }
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function buildModelReport(parts: PartRecord[], config: ModelConfig): ModelReport {
  const train: PartRecord[] = [];
  const test: PartRecord[] = [];
  parts.forEach((part, index) => {
    if (index % 5 === 0) test.push(part);
    else train.push(part);
  });

  const holdout = test.length > 0 ? test : parts;
  const trainSet = train.length > 0 ? train : parts;
  const holdoutModel = fitModel(trainSet, config);
  const parity: ParityPoint[] = [];
  let absError = 0;
  let squaredError = 0;

  for (const part of holdout) {
    const predicted = predict168(holdoutModel, part, lotOf(part));
    parity.push({ actual: part.v168, predicted, defect: part.defect });
    absError += Math.abs(predicted - part.v168);
    squaredError += (predicted - part.v168) ** 2;
  }

  const meanActual = holdout.reduce((sum, part) => sum + part.v168, 0) / holdout.length;
  const totalVariance = holdout.reduce((sum, part) => sum + (part.v168 - meanActual) ** 2, 0);
  const r2 = totalVariance === 0 ? 1 : 1 - squaredError / totalVariance;
  const mae = absError / holdout.length;
  const rmse = Math.sqrt(squaredError / holdout.length);

  const model = fitModel(parts, config);

  let positives = 0;
  let falseNegatives = 0;
  let flagged = 0;
  let reviews = 0;
  const screened = parts.map((part) => {
    const result = screenDie(part, lotOf(part), model);
    if (result.verdict !== 'pass') flagged += 1;
    if (result.verdict === 'review') reviews += 1;
    if (part.defect) {
      positives += 1;
      if (result.verdict !== 'reject') falseNegatives += 1;
    }
    return { ...part, screening: result };
  });

  return {
    model,
    metrics: {
      r2,
      mae,
      rmse,
      holdoutSize: holdout.length,
      recall: positives === 0 ? 1 : 1 - falseNegatives / positives,
      falseNegatives,
      positives,
      flagged,
      reviewLoad: reviews / Math.max(parts.length, 1),
      parity,
      coefficients: model.coef,
    },
    screened,
  };
}

export function equationTerms(model: DriftModel): string {
  return model.terms
    .map((name, index) => {
      const value = model.coef[index] ?? 0;
      if (index === 0) return fmt(value, 3);
      const sign = value >= 0 ? '+' : '−';
      return `${sign} ${fmt(Math.abs(value), 3)}·${name}`;
    })
    .join(' ');
}
