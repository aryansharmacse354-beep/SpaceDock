export type Verdict = 'pass' | 'review' | 'reject';

export type ReasonState = 'ok' | 'warn' | 'bad';

export type SlotId = 'v0' | 'v24' | 'v96' | 'd024' | 'z24' | 'slope2496' | 'z96';

export interface ModelConfig {
  slots: SlotId[];
  degree: 1 | 2;
  lambda: number;
}

export interface Signals {
  v0: number;
  v24: number;
  v96: number;
}

export interface PartRecord extends Signals {
  lotId: string;
  partId: string;
  v168: number;
  lotMean: number;
  lotSigma: number;
  z24: number;
  slope0_24: number;
  defect: boolean;
}

export interface LotProfile {
  id: string;
  mean: number;
  sigma: number;
}

export interface DriftModel {
  coef: number[];
  config: ModelConfig;
  terms: string[];
}

export interface ParityPoint {
  actual: number;
  predicted: number;
  defect: boolean;
}

export interface ModelMetrics {
  r2: number;
  mae: number;
  rmse: number;
  holdoutSize: number;
  recall: number;
  falseNegatives: number;
  positives: number;
  flagged: number;
  reviewLoad: number;
  parity: ParityPoint[];
  coefficients: number[];
}

export interface ModelReport {
  model: DriftModel;
  metrics: ModelMetrics;
  screened: ScreenedPart[];
}

export interface ScreeningReason {
  state: ReasonState;
  label: string;
  detail: string;
}

export interface ScreeningResult {
  forecast: number;
  slope: number;
  z24: number;
  z96: number;
  margin: number;
  staticFail: boolean;
  driftFail: boolean;
  verdict: Verdict;
  health: number;
  rationale: string;
  reasons: ScreeningReason[];
}

export interface ScreenedPart extends PartRecord {
  screening: ScreeningResult;
}

export interface ConsoleInput extends Signals {
  lotId: string;
  partId?: string;
}
