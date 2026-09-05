"""
Complete SpaceDock Synthetic Burn-in Telemetry Dataset Creation & Training Script
"""
import os
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    confusion_matrix,
    precision_recall_fscore_support
)

# Lot parameters corresponding to the 20 lots in the dataset
LOT_PROFILES = {
    "LOT-001": {"mean": 10.1676, "sigma": 0.6256},
    "LOT-002": {"mean": 9.6578, "sigma": 0.7341},
    "LOT-003": {"mean": 9.9961, "sigma": 0.5551},
    "LOT-004": {"mean": 10.0891, "sigma": 0.4968},
    "LOT-005": {"mean": 9.6548, "sigma": 0.7437},
    "LOT-006": {"mean": 9.9958, "sigma": 0.6395},
    "LOT-007": {"mean": 10.6390, "sigma": 0.7207},
    "LOT-008": {"mean": 11.1387, "sigma": 0.7105},
    "LOT-009": {"mean": 9.7689, "sigma": 0.4693},
    "LOT-010": {"mean": 10.8715, "sigma": 0.5992},
    "LOT-011": {"mean": 9.0824, "sigma": 0.6406},
    "LOT-012": {"mean": 9.9075, "sigma": 0.5322},
    "LOT-013": {"mean": 9.3525, "sigma": 0.5182},
    "LOT-014": {"mean": 9.7461, "sigma": 0.5173},
    "LOT-015": {"mean": 9.7940, "sigma": 0.4637},
    "LOT-016": {"mean": 9.9495, "sigma": 0.6160},
    "LOT-017": {"mean": 10.2553, "sigma": 0.5106},
    "LOT-018": {"mean": 9.6842, "sigma": 0.6062},
    "LOT-019": {"mean": 9.7639, "sigma": 0.6465},
    "LOT-020": {"mean": 10.5577, "sigma": 0.7985}
}

def generate_or_load_dataset():
    """
    Generates or loads the full 2,000 components across 20 manufacturing lots.
    """
    csv_file = "synthetic_burnin_telemetry.csv"
    data_csv = "data/synthetic_burnin_telemetry.csv"
    
    # Generate 2,000 components across the 20 lots if not already 2000 rows
    np.random.seed(42)
    records = []
    
    for lot_idx in range(1, 21):
        lot_id = f"LOT-{lot_idx:03d}"
        profile = LOT_PROFILES[lot_id]
        l_mean = profile["mean"]
        l_sigma = profile["sigma"]
        
        for p_idx in range(1, 101):
            part_id = f"L{lot_idx:03d}-P{p_idx:03d}"
            
            # Ground truth latent defect rate ~ 8%, gross static fail ~ 2%
            # Matching the dataset generator parameters
            rand_val = np.random.uniform(0, 1)
            is_static_fail = 1 if rand_val < 0.02 else 0
            is_latent_defect = 1 if (rand_val >= 0.02 and rand_val < 0.10) else 0
            
            # 0h Baseline
            if is_static_fail:
                v0 = np.random.uniform(35.0, 52.0)
                v24 = v0 + np.random.uniform(8.0, 18.0)
                v96 = v24 + np.random.uniform(10.0, 25.0)
                v168 = v96 + np.random.uniform(12.0, 35.0)
            elif is_latent_defect:
                v0 = np.random.normal(l_mean, l_sigma)
                v24 = v0 + np.random.uniform(0.8, 1.8)
                v96 = v24 + np.random.uniform(2.5, 4.5)
                v168 = v96 + np.random.uniform(3.0, 6.5)
            else:
                v0 = np.random.normal(l_mean, l_sigma)
                v24 = v0 + np.random.normal(0.18, 0.08)
                v96 = v24 + np.random.normal(0.25, 0.10)
                v168 = v96 + np.random.normal(0.20, 0.10)
                
            v0 = round(float(v0), 4)
            v24 = round(float(v24), 4)
            v96 = round(float(v96), 4)
            v168 = round(float(v168), 4)
            
            # Dynamic Z-scores against lot parameters
            z0 = round((v0 - l_mean) / l_sigma, 4)
            z24 = round((v24 - l_mean) / l_sigma, 4)
            z96 = round((v96 - l_mean) / l_sigma, 4)
            z168 = round((v168 - l_mean) / l_sigma, 4)
            
            slope_0_24 = round((v24 - v0) / 24.0, 6)
            slope_24_168 = round((v168 - v24) / 144.0, 6)
            
            static_limit_fail = 1 if (v0 > 50.0 or v24 > 50.0 or v96 > 50.0 or v168 > 50.0) else 0
            latent_defect_label = 1 if (is_latent_defect or is_static_fail) else 0
            
            records.append({
                "Lot_ID": lot_id,
                "Part_ID": part_id,
                "Value_0h_uA": v0,
                "Value_24h_uA": v24,
                "Value_96h_uA": v96,
                "Value_168h_uA": v168,
                "Lot_Mean_uA": l_mean,
                "Lot_Sigma_uA": l_sigma,
                "Dynamic_Z_0h": z0,
                "Dynamic_Z_24h": z24,
                "Dynamic_Z_96h": z96,
                "Dynamic_Z_168h": z168,
                "Slope_0_24_uA_per_h": slope_0_24,
                "Slope_24_168_uA_per_h": slope_24_168,
                "Static_Limit_Fail": static_limit_fail,
                "Latent_Defect_Label": latent_defect_label
            })
            
    df = pd.DataFrame(records)
    df.to_csv(csv_file, index=False)
    os.makedirs(os.path.dirname(data_csv), exist_ok=True)
    df.to_csv(data_csv, index=False)
    
    print(f"[DATASET] Prepared {len(df)} components across {df['Lot_ID'].nunique()} lots.")
    print(f"[DATASET] Saved to '{csv_file}' and '{data_csv}'.")
    return df

def train_models(df: pd.DataFrame):
    print("=" * 75)
    print("        SPACEDOCK MACHINE LEARNING MODEL TRAINING PIPELINE")
    print("=" * 75)
    
    # -------------------------------------------------------------
    # MODULE A: Dynamic Outlier Detection (StandardScaler + IsolationForest)
    # -------------------------------------------------------------
    print("\n[MODULE A] Training Dynamic Lot-Relative Anomaly Detector...")
    features_a = [
        "Value_0h_uA", "Value_24h_uA", "Value_96h_uA",
        "Dynamic_Z_0h", "Dynamic_Z_24h", "Dynamic_Z_96h",
        "Slope_0_24_uA_per_h"
    ]
    
    detector = Pipeline([
        ("scale", StandardScaler()),
        ("model", IsolationForest(
            n_estimators=300,
            contamination=0.10,
            random_state=42
        ))
    ])
    
    detector.fit(df[features_a])
    df["Dynamic_Anomaly"] = (detector.predict(df[features_a]) == -1).astype(int)
    df["Anomaly_Score"] = np.round(-detector.decision_function(df[features_a]), 4)
    
    # Evaluate Module A against ground truth
    y_true = df["Latent_Defect_Label"].values
    y_pred_a = df["Dynamic_Anomaly"].values
    cm_a = confusion_matrix(y_true, y_pred_a)
    tn_a, fp_a, fn_a, tp_a = cm_a.ravel()
    p_a, r_a, f1_a, _ = precision_recall_fscore_support(y_true, y_pred_a, average="binary", zero_division=0)
    
    print("\n--- Module A: Dynamic Anomaly Detection Evaluation ---")
    print(f"Total Components Screened  : {len(df)}")
    print(f"Total Components Flagged   : {tp_a + fp_a} ({float(tp_a+fp_a)/len(df)*100:.1f}%)")
    print(f"True Positives (TP)        : {tp_a}")
    print(f"False Positives (FP)       : {fp_a}")
    print(f"False Negatives (FN)       : {fn_a} (FNR: {fn_a / (tp_a + fn_a)*100:.2f}%)")
    print(f"Precision: {p_a:.4f} | Recall: {r_a:.4f} | F1-Score: {f1_a:.4f}")
    
    # -------------------------------------------------------------
    # MODULE B: Time-Series Drift Predictor (Value_0h + Value_24h -> Value_168h)
    # -------------------------------------------------------------
    print("\n[MODULE B] Training Value_168h Regressor (RandomForestRegressor)...")
    X = df[["Value_0h_uA", "Value_24h_uA"]]
    y = df["Value_168h_uA"]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    
    regressor = RandomForestRegressor(
        n_estimators=300,
        max_depth=12,
        random_state=42
    )
    
    regressor.fit(X_train, y_train)
    pred_test = regressor.predict(X_test)
    
    mae_test = mean_absolute_error(y_test, pred_test)
    rmse_test = np.sqrt(mean_squared_error(y_test, pred_test))
    r2_test = r2_score(y_test, pred_test)
    
    print(f"\n--- Module B: Value_168h Holdout Test Set Evaluation ---")
    print(f"Test Set MAE               : {mae_test:.4f} µA")
    print(f"Test Set RMSE              : {rmse_test:.4f} µA")
    print(f"Test Set R2 Score          : {r2_test:.4f}")
    
    # Forecast on whole population
    df["Predicted_Value_168h_uA"] = np.round(regressor.predict(X), 4)
    df["Predicted_Slope_0_168_uA_per_h"] = np.round(
        (df["Predicted_Value_168h_uA"] - df["Value_0h_uA"]) / 168.0, 6
    )
    
    # Apply synthetic safety slope: 0.016599 µA/hour
    safety_slope_threshold = 0.016599
    df["Drift_Flag"] = (df["Predicted_Slope_0_168_uA_per_h"] >= safety_slope_threshold).astype(int)
    
    # Explainability text assignment
    explanations = []
    for _, row in df.iterrows():
        if row["Dynamic_Anomaly"] == 1 and row["Drift_Flag"] == 1:
            explanations.append("Dynamic lot outlier + projected drift above safety slope")
        elif row["Drift_Flag"] == 1:
            explanations.append("Projected 168h drift above safety slope")
        elif row["Dynamic_Anomaly"] == 1:
            explanations.append("Dynamic lot-relative outlier")
        else:
            explanations.append("Within synthetic screening pattern")
    df["Explainability"] = explanations
    
    # Evaluate Drift Flag
    y_pred_b = df["Drift_Flag"].values
    cm_b = confusion_matrix(y_true, y_pred_b)
    tn_b, fp_b, fn_b, tp_b = cm_b.ravel()
    p_b, r_b, f1_b, _ = precision_recall_fscore_support(y_true, y_pred_b, average="binary", zero_division=0)
    
    print(f"\n--- Module B: Early 24h Safety Slope Screening Evaluation ---")
    print(f"Safety Slope Threshold     : {safety_slope_threshold} µA/hour")
    print(f"Total Screened Flags (24h) : {tp_b + fp_b} / {len(df)}")
    print(f"True Positives (TP)        : {tp_b}")
    print(f"False Positives (FP)       : {fp_b}")
    print(f"False Negatives (FN)       : {fn_b} (FNR: {fn_b / (tp_b + fn_b)*100:.2f}%)")
    print(f"Precision: {p_b:.4f} | Recall: {r_b:.4f} | F1-Score: {f1_b:.4f}")
    
    # -------------------------------------------------------------
    # SAVE MODELS & ARTIFACTS
    # -------------------------------------------------------------
    os.makedirs("outputs", exist_ok=True)
    
    joblib.dump(detector, "dynamic_anomaly_detector.joblib")
    joblib.dump(regressor, "value168h_regressor.joblib")
    joblib.dump(detector, "outputs/dynamic_anomaly_detector.joblib")
    joblib.dump(regressor, "outputs/value168h_regressor.joblib")
    
    df.to_csv("synthetic_burnin_telemetry.csv", index=False)
    df.to_csv("outputs/burnin_ml_predictions.csv", index=False)
    
    print("\n[MODEL ARTIFACTS]")
    print("  * dynamic_anomaly_detector.joblib (Saved)")
    print("  * value168h_regressor.joblib (Saved)")
    print("  * outputs/burnin_ml_predictions.csv (Saved)")
    
    # Visual Parity Plot
    plt.figure(figsize=(7, 5))
    plt.scatter(y_test, pred_test, alpha=0.6, color="#2b5c8f", edgecolors="k", s=30, label="Holdout Predictions")
    mn, mx = min(y_test.min(), pred_test.min()), max(y_test.max(), pred_test.max())
    plt.plot([mn, mx], [mn, mx], "r--", linewidth=2, label="1:1 Parity")
    plt.title(f"Value_168h Forecast: Actual vs Predicted (MAE: {mae_test:.4f} µA)", fontsize=11)
    plt.xlabel("Actual Value 168h (µA)", fontsize=10)
    plt.ylabel("Predicted Value 168h (µA)", fontsize=10)
    plt.legend(loc="upper left")
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.tight_layout()
    plt.savefig("outputs/drift_prediction_parity.png", dpi=300)
    plt.close()
    print("  * outputs/drift_prediction_parity.png (Saved)")
    print("=" * 75)
    print("                     TRAINING PIPELINE COMPLETE")
    print("=" * 75)

if __name__ == "__main__":
    df = generate_or_load_dataset()
    train_models(df)
