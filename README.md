# SpaceDock — Space-Grade Burn-In Screening

Mission-control web app for 125 °C environmental stress screening (ESS). It reads early burn-in leakage, forecasts the 168-hour value, and returns a pass / review / reject verdict for every die.

**Live app:** [spacedock-phi.vercel.app](https://spacedock-phi.vercel.app)  
**Web source:** [`web/`](web/)

## What it does

- Reads 0 h and 24 h leakage per die; optional 96 h and derived signals can be added to the model.
- Forecasts 168 h leakage before the full seven-day bake completes.
- Applies a 50 µA static limit, lot-aware ±3σ part average testing, and a 0.016599 µA/h safety-slope gate.
- Holds 100% latent-defect recall with zero escapes on the bundled holdout.
- Runs entirely in the browser — telemetry never leaves the page.

## Web app

The dashboard is organized into connected panels:

- **Mission** — why early screening matters and where static limits fail.
- **Architecture** — the four gates every die passes through.
- **Model** — selectable input slots with holdout metrics, parity plot, and forecast terms.
- **Console** — live single-die screening with adjustable burn-in values, verdict reasons, health score, and projected drift.
- **Telemetry** — searchable fleet ledger, risk scatter, verdict mix, and one-click inspection.
- **Validation** — benchmark comparison for the screening protocol.
- **Audit** — reproducible QA certificate with checksum and JSON export.

Model inputs can be toggled at any time. The fit, fleet screen, console readout, and audit certificate refit immediately.

### Stack

Vite 7 · React 19 · TypeScript · Tailwind CSS v4 · React Three Fiber · Framer Motion · lucide-react

### Run locally

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview the build
```

## Model and validation

- **Target:** 168 h leakage (µA).
- **Default inputs:** V₀ and V₂₄.
- **Optional slots:** V₉₆, Δ₀→₂₄, Z₂₄, S₂₄→₉₆, Z₉₆.
- **Fit:** quadratic ridge regression, λ = 1e-7, deterministic 80/20 holdout, refit on all traces after scoring.
- **Default holdout:** R² 0.968 · MAE 0.632 µA · RMSE 1.487 µA · 100% recall · 0 escapes out of 199 labeled defects.
- **With V₉₆:** 10 regression terms, R² 0.990 · MAE 0.261 µA.

Gate constants: static USL 50 µA, safety slope 0.016599 µA/h, review slope 0.010291 µA/h, ±3σ PAT at 24 h and 96 h. Late-read checks activate only when V₉₆, S₂₄→₉₆, or Z₉₆ is an active slot.

## Dataset

`web/public/data/telemetry.csv` contains 2,000 die across 20 lots:

```text
Lot_ID, Part_ID, Value_0h_uA, Value_24h_uA, Value_96h_uA, Value_168h_uA,
Lot_Mean_uA, Lot_Sigma_uA, Dynamic_Z_*, Slope_*, Static_Limit_Fail, Latent_Defect_Label
```

## Python research pipeline

The original research tooling remains at the repository root.

```bash
pip install -r requirements.txt
python -m streamlit run app.py   # Streamlit research dashboard
python train_models.py           # retrain / validate saved models
```

- `app.py` — Streamlit dashboard for screening, batch telemetry, audit, and parity checks.
- `train_models.py` — training and holdout evaluation.
- `models/` — serialized model artifacts.
- `data/`, `outputs/` — generated datasets and results.

## Repository layout

```text
app.py                  Streamlit research dashboard
train_models.py         model training and validation
web/                    mission-control web app (primary interface)
web/public/data/        bundled 2,000-die telemetry feed
models/                 trained model artifacts
```

## Standards and scope

Built around MIL-STD-883 and AEC-Q001 practice for 125 °C ESS and 168 h burn-in. The bundled telemetry is synthetic and the verdicts are a screening aid, not a flight-qualification authority.

## Deployment

The web app is configured for Vercel under the `ai-experts1` team, project `spacedock`. Every push to `main` that changes `web/` can be redeployed from the Vercel project dashboard.
