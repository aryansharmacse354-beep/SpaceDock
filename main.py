"""
Main Pipeline Orchestrator for Space-Grade Semiconductor Burn-In Screening System
Executes end-to-end workflow and generates comparative benchmark report against traditional static testing.
"""
import os
import sys
import runpy

# If executed by Streamlit (e.g. on Streamlit Cloud with main.py as entrypoint), dispatch directly to app.py
if "streamlit" in sys.modules or os.environ.get("STREAMLIT_SERVER_PORT") or any("streamlit" in arg.lower() for arg in sys.argv):
    app_path = os.path.join(os.path.dirname(__file__), "app.py")
    if os.path.exists(app_path):
        runpy.run_path(app_path, run_name="__main__")
        sys.exit(0)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

try:
    import pandas as pd
    import numpy as np
    from generate_data import generate_burn_in_data
    from outlier_detection import DynamicOutlierDetector, evaluate_screening_methods
    from drift_predictor import DriftPredictor
    from explainability import ExplainabilityDashboard
except Exception as e:
    pass


def run_pipeline():
    print("=" * 85)
    print("      SPACE-GRADE SEMICONDUCTOR BURN-IN SCREENING SYSTEM (125°C ESS)")
    print("=" * 85)
    
    for folder in ["data", "src", "outputs"]:
        os.makedirs(folder, exist_ok=True)
        
    data_path = os.path.join("data", "burn_in_data.csv")
    outputs_dir = "outputs"
    
    # -------------------------------------------------------------
    # Step 1: Synthetic Parametric Data Generation
    # -------------------------------------------------------------
    print("\n[STEP 1/5] Simulating 2,000 Components with Iddq Parametric Leakage Currents...")
    df_raw = generate_burn_in_data(
        num_components=2000,
        defect_rate=0.08,
        gross_fail_rate=0.02,
        output_path=data_path,
        random_seed=42
    )
    
    # -------------------------------------------------------------
    # Step 2: Module A - Dynamic Lot-Aware Outlier Detection
    # -------------------------------------------------------------
    print("\n[STEP 2/5] Running Module A: Static vs Dynamic Lot-Aware Outlier Detection...")
    outlier_detector = DynamicOutlierDetector(
        z_score_threshold=3.0,
        contamination=0.10,
        random_state=42
    )
    df_outliers = outlier_detector.fit_predict(df_raw)
    outlier_benchmark = evaluate_screening_methods(df_outliers)
    
    # -------------------------------------------------------------
    # Step 3: Module B - Early 24h Time-Series Drift Predictor
    # -------------------------------------------------------------
    print("\n[STEP 3/5] Running Module B: Early 24h Drift Forecasting & Safety Slope Screening...")
    drift_predictor = DriftPredictor(
        safety_slope_threshold=0.05,
        drift_delta_threshold=8.0,
        random_state=42
    )
    df_screened, drift_metrics, X_test, y_test, _ = drift_predictor.train_and_evaluate(df_outliers)
    
    # -------------------------------------------------------------
    # Step 4: Explainability Dashboard & QA Inspector Audit Card
    # -------------------------------------------------------------
    print("\n[STEP 4/5] Generating Global SHAP Visuals and QA Component Audit Card...")
    dashboard = ExplainabilityDashboard(
        model=drift_predictor.model,
        feature_names=drift_predictor.feature_names
    )
    ranked_features = dashboard.generate_global_explanations(X_test, output_dir=outputs_dir)
    
    X_full = drift_predictor.extract_early_features(df_screened)
    qa_audit = dashboard.generate_qa_component_audit(df_screened, X_full, output_dir=outputs_dir)
    
    # -------------------------------------------------------------
    # Step 5: Save Master Screened Results & Benchmark Report
    # -------------------------------------------------------------
    print("\n[STEP 5/5] Consolidating Full Screening Database and Executive Report...")
    
    # Master Screening Flag: Combined Early Rejection + Dynamic Trajectory Screening
    df_screened["flag_master_screened"] = (
        (df_screened["flag_early_24h_rejection"] == 1) |
        (df_screened["flag_dynamic_ensemble"] == 1)
    ).astype(int)
    
    out_csv = os.path.join(outputs_dir, "burn_in_screened_results.csv")
    df_screened.to_csv(out_csv, index=False)
    print(f"[PIPELINE] Saved master screening results -> {out_csv}")
    
    from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
    y_true = df_screened["is_defect"].values
    
    # Master Metrics
    y_master = df_screened["flag_master_screened"].values
    tn_m, fp_m, fn_m, tp_m = confusion_matrix(y_true, y_master).ravel()
    p_m, r_m, f1_m, _ = precision_recall_fscore_support(y_true, y_master, average="binary", zero_division=0)
    
    # Print Comprehensive Executive Summary
    print("\n" + "=" * 85)
    print("          EXECUTIVE EVALUATION REPORT: SPACE-GRADE BURN-IN SCREENING")
    print("=" * 85)
    print(f"Total Semiconductor Components Tested : {len(df_screened)}")
    print(f"Total True Defective Components       : {y_true.sum()} ({y_true.sum()/len(df_screened)*100:.1f}%)")
    print(f"  - Latent Parametric Defects         : 160 (8.0%) [Passes static 50 µA limit]")
    print(f"  - Gross Static Limit Failures       : 40  (2.0%) [Exceeds static 50 µA limit]")
    print("-" * 85)
    
    print("1. PREDICTIVE MODEL ACCURACY (MODULE B - XGBOOST ON 0h & 24h DATA)")
    print(f"   * 168h Drift Forecast Test MAE : {drift_metrics['MAE_test']:.4f} µA")
    print(f"   * 168h Drift Forecast Test RMSE: {drift_metrics['RMSE_test']:.4f} µA")
    print(f"   * 168h Drift Forecast Test R2  : {drift_metrics['R2_test']:.4f}")
    print("-" * 85)
    
    print("2. SCREENING BENCHMARK: TRADITIONAL STATIC LIMITS VS AI DYNAMIC DEFENSE")
    print(f"{'Method / Screening Architecture':<38} | {'Flagged':<7} | {'TP':<4} | {'FN (Missed)':<11} | {'Recall':<6} | {'Precision'}")
    print("-" * 85)
    
    benchmarks = [
        ("Traditional Static Limit (50 µA)", outlier_benchmark["Static Datasheet Limit (50µA)"]),
        ("Module A: Dynamic PAT (Z-Score)", outlier_benchmark["Dynamic Lot-Aware PAT (Z-Score)"]),
        ("Module A: Trajectory IsoForest", outlier_benchmark["Isolation Forest (Trajectory)"]),
        ("Module B: Early 24h Drift Predictor", {
            "Total_Flagged": drift_metrics["total_early_flagged"],
            "True_Positives": drift_metrics["TP"],
            "False_Negatives (Escaped Defects)": drift_metrics["FN"],
            "Recall": drift_metrics["Recall"],
            "Precision": drift_metrics["Precision"]
        }),
        ("Master AI Combined Defense", {
            "Total_Flagged": tp_m + fp_m,
            "True_Positives": tp_m,
            "False_Negatives (Escaped Defects)": fn_m,
            "Recall": r_m,
            "Precision": p_m
        })
    ]
    
    for name, m in benchmarks:
        print(f"{name:<38} | {m['Total_Flagged']:<7} | {m['True_Positives']:<4} | {m['False_Negatives (Escaped Defects)']:<11} | {m['Recall']*100:<5.1f}% | {m['Precision']:.4f}")
        
    print("-" * 85)
    print("3. EXPLAINABILITY & QA ARTIFACTS GENERATED")
    print("   * outputs/shap_summary.png           : Global SHAP Beeswarm summary plot")
    print("   * outputs/feature_importance.png     : Global feature importance ranking")
    print("   * outputs/qa_component_audit.png     : Component-level QA audit inspection card")
    print("   * outputs/qa_inspection_report.json  : Machine-readable QA justification report")
    print("   * outputs/burn_in_screened_results.csv: Full screened dataset with all anomaly flags")
    print("=" * 85)
    print("                      PIPELINE EXECUTION COMPLETED")
    print("=" * 85)

if __name__ == "__main__":
    run_pipeline()
