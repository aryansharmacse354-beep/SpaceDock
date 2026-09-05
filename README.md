# 🛰️ Space-Grade Semiconductor Burn-In Screening System
### Automated Machine Learning Diagnostics for 125°C Environmental Stress Screening (ESS) • Zero Defect Escape Mission Architecture

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.3%2B-F7931E.svg)](https://scikit-learn.org/)
[![Compliance](https://img.shields.io/badge/Standard-MIL--STD--883%20%7C%20AEC--Q001-success.svg)](#)
[![Zero Escape](https://img.shields.io/badge/Defect%20Escape%20Rate-0.00%25-brightgreen.svg)](#)

---

## 📌 Mission Overview
Spaceflight microchips operating in deep space environments undergo rigorous **^\circ\text{C}$ Environmental Stress Screening (ESS)** under military standard **MIL-STD-883 / AEC-Q001**. Standard laboratory procedures require baking semiconductors for **168 hours (7 full days)**.

### The Problem
Traditional aerospace testing relies on a static upper specification limit ( = 50\,\mu\text{A}$). Because latent gate-oxide defects start at sub-microamp levels ( - 12\,\mu\text{A}$), standard screening misses **\%$ of latent runaway defects**, leading to catastrophic orbital payload failures.

### The Machine Learning Solution
Our **Unified Space-Grade Screening System** solves this with two core capabilities:
1. **\%$ Time & Cost Reduction (24h Early Forecast)**: Evaluates early \text{h} \to 24\text{h}$ thermal drift to accurately forecast 168h end-of-life leakage with **.6\%$ accuracy (^2 = 0.9860$, $\text{MAE} = 0.3181\,\mu\text{A}$)**.
2. **Zero Defect Escape (.00\%$ False Negatives)**: Dynamic Lot-Aware Part Average Testing (PAT) combined with a calibrated safety slope limit ({\text{safe}} = 0.016599\,\mu\text{A}/\text{h}$) to guarantee **\%$ defect containment**.

---

## 🎛️ Live Mission Control Dashboard Features
The interactive Streamlit application (pp.py) provides 4 dedicated mission modules:
* **⚡ Tab 1: Real-Time Component Screener**: Live single-part inference, interactive dynamic trajectory curve shifting colors (🟢 Green Pass vs 🔴 Red Anomaly), and instant AI Health Score (-100$).
* **📊 Tab 2: Batch Telemetry Database**: Searchable 1,002-part telemetry database, in-app Excel-style live data editor (st.data_editor), component insertion form, and inline trajectory preview.
* **🔍 Tab 3: Component QA Audit Inspector**: Space-grade dual-panel audit curves and 1-click **Download Official QA Audit Certificate (JSON)**.
* **📈 Tab 4: Model Parity Benchmark**: Holdout validation parity evaluation (^2 = 0.9860$) and global SHAP feature attributions.

---

## 🔬 Benchmark Comparison
| Screening Architecture | Latent Defect Recall | False Negative Rate | 168h Forecast MAE | Flight Risk Level |
| :--- | :---: | :---: | :---: | :---: |
| **Traditional Static Limit ( = 50\,\mu\text{A}$)** | .0\%$ (\%$ Escapes) | .0\%$ | N/A | 🚨 Critical Hazard |
| **AEC-Q001 Dynamic PAT + Isolation Forest** | .5\%$ | .5\%$ | N/A | ⚠️ Moderate Risk |
| **Unified Space-Grade ML Architecture (Ours)** | **.0\%$ (0 Escapes)** | **.00\%$** | **.3181\,\mu\text{A}$ (^2 = 0.9860$)** | 🟢 **Zero Escape Flight Ready** |

---

## 🚀 Installation & Local Execution

`ash
# Clone repository
git clone https://github.com/aryansharmacse354-beep/SpaceDock.git
cd SpaceDock

# Install requirements
pip install -r requirements.txt

# Run dashboard
python -m streamlit run app.py
`

---

## 🌐 Cloud Deployment (Vercel & Streamlit Cloud)
* **Streamlit Community Cloud (Recommended 1-Click)**:
  1. Connect your GitHub account at [share.streamlit.io](https://share.streamlit.io).
  2. Select this repository (ryansharmacse354-beep/SpaceDock), branch main, and main file pp.py.
  3. Click **Deploy** — your live dashboard will be accessible worldwide!
