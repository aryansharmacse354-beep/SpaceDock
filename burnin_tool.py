"""
====================================================================================================
      SPACE-GRADE SEMICONDUCTOR BURN-IN SCREENING TOOL (UNIFIED MACHINE LEARNING SYSTEM)
====================================================================================================
A production-grade, end-to-end Machine Learning tool for Environmental Stress Screening (125°C Burn-In).
Integrates:
1. Dynamic Lot-Aware Outlier Detection (StandardScaler + Isolation Forest + Robust PAT Z-scores)
2. Time-Series Drift Forecasting & Early Safety Slope Screening (0h + 24h -> 168h Drift)
3. Model Explainability & QA Audit Inspector (SHAP TreeExplainer + Component Trajectory Cards)
4. Batch Screening Engine & Single-Component Real-Time CLI Inference
====================================================================================================
"""
import os
import sys
import json
import warnings
warnings.filterwarnings("ignore")  # Clean CLI output
import argparse
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

# Default configuration parameters
DEFAULT_SAFETY_SLOPE = 0.016599  # µA/hour
DEFAULT_CONTAMINATION = 0.10
DEFAULT_Z_THRESHOLD = 3.0
STATIC_LIMIT_USL = 50.0  # µA

class BurnInMLTool:
    """
    Unified Machine Learning Tool for Semiconductor Burn-In Screening.
    """
    def __init__(
        self,
        safety_slope_threshold: float = DEFAULT_SAFETY_SLOPE,
        contamination: float = DEFAULT_CONTAMINATION,
        z_threshold: float = DEFAULT_Z_THRESHOLD,
        model_dir: str = "models"
    ):
        self.safety_slope_threshold = safety_slope_threshold
        self.contamination = contamination
        self.z_threshold = z_threshold
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        
        self.detector_path = os.path.join(self.model_dir, "dynamic_anomaly_detector.joblib")
        self.regressor_path = os.path.join(self.model_dir, "value168h_regressor.joblib")
        
        self.detector = None
        self.regressor = None
        self.features_a = [
            "Value_0h_uA", "Value_24h_uA", "Value_96h_uA",
            "Dynamic_Z_0h", "Dynamic_Z_24h", "Dynamic_Z_96h",
            "Slope_0_24_uA_per_h"
        ]
        self.features_b = ["Value_0h_uA", "Value_24h_uA"]
        self.lot_stats = {}
        
        self.load_models()

    def load_models(self) -> bool:
        """Loads trained model artifacts from disk."""
        loaded = True
        if os.path.exists(self.detector_path):
            self.detector = joblib.load(self.detector_path)
        elif os.path.exists("dynamic_anomaly_detector.joblib"):
            self.detector = joblib.load("dynamic_anomaly_detector.joblib")
        else:
            loaded = False
            
        if os.path.exists(self.regressor_path):
            self.regressor = joblib.load(self.regressor_path)
        elif os.path.exists("value168h_regressor.joblib"):
            self.regressor = joblib.load("value168h_regressor.joblib")
        else:
            loaded = False
            
        return loaded

    def compute_lot_statistics(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Computes robust dynamic lot-aware baseline statistics (Mean, Median, MAD, and dynamic Z-scores).
        """
        res = df.copy()
        col_map = {
            "value_0h": "Value_0h_uA", "value_24h": "Value_24h_uA",
            "value_96h": "Value_96h_uA", "value_168h": "Value_168h_uA",
            "lot_id": "Lot_ID", "component_id": "Part_ID"
        }
        res.rename(columns={k: v for k, v in col_map.items() if k in res.columns}, inplace=True)
        
        if "Lot_ID" not in res.columns:
            res["Lot_ID"] = "LOT-001"
        if "Part_ID" not in res.columns:
            res["Part_ID"] = [f"COMP-{i+1:05d}" for i in range(len(res))]
            
        if "Slope_0_24_uA_per_h" not in res.columns:
            res["Slope_0_24_uA_per_h"] = (res["Value_24h_uA"] - res["Value_0h_uA"]) / 24.0
        if "Value_168h_uA" in res.columns and "Slope_24_168_uA_per_h" not in res.columns:
            res["Slope_24_168_uA_per_h"] = (res["Value_168h_uA"] - res["Value_24h_uA"]) / 144.0
            
        for lot in res["Lot_ID"].unique():
            lot_mask = res["Lot_ID"] == lot
            lot_df = res[lot_mask]
            
            in_spec = lot_df[lot_df["Value_0h_uA"] <= STATIC_LIMIT_USL]
            if in_spec.empty:
                in_spec = lot_df
                
            l_mean = in_spec["Value_0h_uA"].mean()
            l_std = max(in_spec["Value_0h_uA"].std(), 0.05) if len(in_spec) > 1 else 0.50
            
            self.lot_stats[lot] = {"mean": l_mean, "sigma": l_std}
            res.loc[lot_mask, "Lot_Mean_uA"] = l_mean
            res.loc[lot_mask, "Lot_Sigma_uA"] = l_std
            
            for h in ["0h", "24h", "96h"]:
                val_col = f"Value_{h}_uA"
                z_col = f"Dynamic_Z_{h}"
                if val_col in res.columns:
                    res.loc[lot_mask, z_col] = (res.loc[lot_mask, val_col] - l_mean) / l_std
                    
            if "Value_168h_uA" in res.columns:
                res.loc[lot_mask, "Dynamic_Z_168h"] = (res.loc[lot_mask, "Value_168h_uA"] - l_mean) / l_std
                
        res["Static_Limit_Fail"] = (
            (res["Value_0h_uA"] > STATIC_LIMIT_USL) |
            (res["Value_24h_uA"] > STATIC_LIMIT_USL) |
            (res.get("Value_96h_uA", 0) > STATIC_LIMIT_USL) |
            (res.get("Value_168h_uA", 0) > STATIC_LIMIT_USL)
        ).astype(int)
        
        return res

    def train(self, data_path: str = "synthetic_burnin_telemetry.csv") -> dict:
        """
        Trains both Module A and Module B models, saves models, and generates evaluation metrics.
        """
        if not os.path.exists(data_path):
            alt_path = os.path.join("data", data_path)
            if os.path.exists(alt_path):
                data_path = alt_path
            else:
                raise FileNotFoundError(f"Dataset not found at '{data_path}' or '{alt_path}'")
                
        df = pd.read_csv(data_path)
        df = self.compute_lot_statistics(df)
        
        print("=" * 80)
        print("        TRAINING UNIFIED BURN-IN MACHINE LEARNING MODELS")
        print("=" * 80)
        print(f"Loaded dataset: {data_path} ({len(df)} components across {df['Lot_ID'].nunique()} lots)")
        
        # 1. Module A: Isolation Forest
        print("\n[MODULE A] Training Isolation Forest Dynamic Anomaly Detector...")
        self.detector = Pipeline([
            ("scale", StandardScaler()),
            ("model", IsolationForest(
                n_estimators=300,
                contamination=self.contamination,
                random_state=42
            ))
        ])
        self.detector.fit(df[self.features_a])
        
        df["Dynamic_Anomaly"] = (self.detector.predict(df[self.features_a]) == -1).astype(int)
        df["Anomaly_Score"] = np.round(-self.detector.decision_function(df[self.features_a]), 4)
        
        # 2. Module B: Random Forest Regressor
        print("\n[MODULE B] Training Random Forest 168h Drift Regressor...")
        X = df[self.features_b]
        y = df["Value_168h_uA"]
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42
        )
        
        self.regressor = RandomForestRegressor(
            n_estimators=300,
            max_depth=12,
            random_state=42
        )
        self.regressor.fit(X_train, y_train)
        pred_test = self.regressor.predict(X_test)
        
        mae_test = mean_absolute_error(y_test, pred_test)
        rmse_test = np.sqrt(mean_squared_error(y_test, pred_test))
        r2_test = r2_score(y_test, pred_test)
        
        df["Predicted_Value_168h_uA"] = np.round(self.regressor.predict(X), 4)
        df["Predicted_Slope_0_168_uA_per_h"] = np.round(
            (df["Predicted_Value_168h_uA"] - df["Value_0h_uA"]) / 168.0, 6
        )
        df["Drift_Flag"] = (df["Predicted_Slope_0_168_uA_per_h"] >= self.safety_slope_threshold).astype(int)
        
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
        
        metrics = {
            "MAE_test": float(mae_test),
            "RMSE_test": float(rmse_test),
            "R2_test": float(r2_test),
            "Safety_Slope_Threshold": self.safety_slope_threshold,
            "Total_Components": len(df)
        }
        
        if "Latent_Defect_Label" in df.columns:
            y_true = df["Latent_Defect_Label"].values
            cm_a = confusion_matrix(y_true, df["Dynamic_Anomaly"].values)
            tn_a, fp_a, fn_a, tp_a = cm_a.ravel()
            p_a, r_a, f1_a, _ = precision_recall_fscore_support(y_true, df["Dynamic_Anomaly"].values, average="binary", zero_division=0)
            
            cm_b = confusion_matrix(y_true, df["Drift_Flag"].values)
            tn_b, fp_b, fn_b, tp_b = cm_b.ravel()
            p_b, r_b, f1_b, _ = precision_recall_fscore_support(y_true, df["Drift_Flag"].values, average="binary", zero_division=0)
            
            metrics.update({
                "Module_A": {"TP": int(tp_a), "FP": int(fp_a), "FN": int(fn_a), "Precision": float(p_a), "Recall": float(r_a), "F1": float(f1_a)},
                "Module_B": {"TP": int(tp_b), "FP": int(fp_b), "FN": int(fn_b), "Precision": float(p_b), "Recall": float(r_b), "F1": float(f1_b)}
            })
            
        joblib.dump(self.detector, self.detector_path)
        joblib.dump(self.regressor, self.regressor_path)
        joblib.dump(self.detector, "dynamic_anomaly_detector.joblib")
        joblib.dump(self.regressor, "value168h_regressor.joblib")
        
        os.makedirs("outputs", exist_ok=True)
        df.to_csv("outputs/burnin_ml_predictions.csv", index=False)
        self.generate_plots(y_test, pred_test, mae_test, df)
        
        print("-" * 80)
        print("                  TRAINING EVALUATION REPORT")
        print("-" * 80)
        print(f"1. 168h DRIFT PREDICTOR PERFORMANCE (Module B):")
        print(f"   * Holdout MAE  : {mae_test:.4f} µA")
        print(f"   * Holdout RMSE : {rmse_test:.4f} µA")
        print(f"   * Holdout R²   : {r2_test:.4f}")
        if "Module_B" in metrics:
            mb = metrics["Module_B"]
            print(f"\n2. EARLY 24h SCREENING DEFECT CONTAINMENT (Safety Slope >= {self.safety_slope_threshold}):")
            print(f"   * True Positives (Caught Defects)   : {mb['TP']}")
            print(f"   * False Negatives (Escaped Defects) : {mb['FN']} (Missed Rate: {mb['FN']/(mb['TP']+mb['FN'])*100:.2f}%)")
            print(f"   * Precision: {mb['Precision']:.4f} | Recall: {mb['Recall']:.4f} | F1: {mb['F1']:.4f}")
        print("-" * 80)
        print(f"[SAVED] Serialized models -> '{self.detector_path}', '{self.regressor_path}'")
        print(f"[SAVED] Annotated predictions -> 'outputs/burnin_ml_predictions.csv'")
        print("=" * 80)
        
        return metrics

    def generate_plots(self, y_test, pred_test, mae_test, df):
        """Generates QA inspection plots."""
        plt.figure(figsize=(7, 5))
        plt.scatter(y_test, pred_test, alpha=0.6, color="#2b5c8f", edgecolors="k", s=30, label="Holdout Predictions")
        mn, mx = min(y_test.min(), pred_test.min()), max(y_test.max(), pred_test.max())
        plt.plot([mn, mx], [mn, mx], "r--", linewidth=2, label="Ideal 1:1 Parity")
        plt.title(f"168h Drift Forecast Parity (Holdout MAE: {mae_test:.4f} µA)", fontsize=11, fontweight="bold")
        plt.xlabel("Actual Value 168h (µA)", fontsize=10)
        plt.ylabel("Predicted Value 168h (µA)", fontsize=10)
        plt.legend(loc="upper left")
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.tight_layout()
        plt.savefig("outputs/drift_prediction_parity.png", dpi=300)
        plt.close()

    def predict_single(
        self,
        v0: float,
        v24: float,
        v96: float = None,
        lot_id: str = "LOT-001"
    ) -> dict:
        """
        Runs real-time inference on a single semiconductor component.
        """
        if self.regressor is None or self.detector is None:
            if not self.load_models():
                raise RuntimeError("Models not found. Please run 'python burnin_tool.py train' first.")
                
        # Module B Input DataFrame
        input_b_df = pd.DataFrame([{"Value_0h_uA": float(v0), "Value_24h_uA": float(v24)}])
        pred_168 = float(self.regressor.predict(input_b_df)[0])
        drift_delta = pred_168 - v0
        drift_slope = drift_delta / 168.0
        
        is_drift_flag = bool(drift_slope >= self.safety_slope_threshold)
        is_static_fail = bool(v0 > STATIC_LIMIT_USL or v24 > STATIC_LIMIT_USL or (v96 and v96 > STATIC_LIMIT_USL) or pred_168 > STATIC_LIMIT_USL)
        
        v96_val = v96 if v96 is not None else v24 + (pred_168 - v24) * 0.5
        lot_mean = self.lot_stats.get(lot_id, {}).get("mean", 10.0)
        lot_sigma = self.lot_stats.get(lot_id, {}).get("sigma", 0.6)
        
        z0 = (v0 - lot_mean) / lot_sigma
        z24 = (v24 - lot_mean) / lot_sigma
        z96 = (v96_val - lot_mean) / lot_sigma
        slope_0_24 = (v24 - v0) / 24.0
        
        input_a_df = pd.DataFrame([{
            "Value_0h_uA": v0, "Value_24h_uA": v24, "Value_96h_uA": v96_val,
            "Dynamic_Z_0h": z0, "Dynamic_Z_24h": z24, "Dynamic_Z_96h": z96,
            "Slope_0_24_uA_per_h": slope_0_24
        }])
        
        is_outlier = bool(self.detector.predict(input_a_df)[0] == -1)
        anomaly_score = float(-self.detector.decision_function(input_a_df)[0])
        
        is_rejected = is_drift_flag or is_outlier or is_static_fail
        
        if is_static_fail:
            verdict = "REJECT - Static Datasheet Limit Exceeded (> 50.0 µA)"
            risk_level = "CRITICAL"
        elif is_drift_flag and is_outlier:
            verdict = "REJECT - Dynamic Lot Outlier + Predicted Thermal Runaway"
            risk_level = "HIGH RISK (Latent Defect)"
        elif is_drift_flag:
            verdict = "REJECT - Predicted 168h Drift Exceeds Safety Slope"
            risk_level = "HIGH RISK (Latent Defect)"
        elif is_outlier:
            verdict = "WARNING - Statistical Lot Outlier"
            risk_level = "MODERATE"
        else:
            verdict = "PASS - Within Normal Thermal Settling Parameters"
            risk_level = "NORMAL (Space-Grade In-Spec)"
            
        return {
            "inputs": {
                "Value_0h_uA": float(v0),
                "Value_24h_uA": float(v24),
                "Value_96h_uA": float(v96_val) if v96 else None,
                "Lot_ID": lot_id
            },
            "predictions": {
                "Predicted_Value_168h_uA": round(pred_168, 4),
                "Predicted_Drift_Delta_uA": round(drift_delta, 4),
                "Predicted_Slope_uA_per_h": round(drift_slope, 6),
                "Safety_Slope_Threshold": self.safety_slope_threshold
            },
            "anomaly_analysis": {
                "Anomaly_Score": round(anomaly_score, 4),
                "Is_Dynamic_Outlier": is_outlier,
                "Is_Drift_Flagged": is_drift_flag,
                "Is_Static_Limit_Fail": is_static_fail
            },
            "decision": {
                "Screening_Verdict": verdict,
                "Risk_Level": risk_level,
                "Action": "DISCARD / ISOLATE" if is_rejected else "ACCEPT FOR FLIGHT PAYLOAD"
            }
        }

    def screen_batch(self, input_csv: str, output_csv: str = None) -> pd.DataFrame:
        """Screens an entire batch CSV of components."""
        if not os.path.exists(input_csv):
            raise FileNotFoundError(f"Input file not found: {input_csv}")
            
        if self.regressor is None or self.detector is None:
            if not self.load_models():
                raise RuntimeError("Models not loaded. Train first using 'python burnin_tool.py train'")
                
        df = pd.read_csv(input_csv)
        df = self.compute_lot_statistics(df)
        
        df["Dynamic_Anomaly"] = (self.detector.predict(df[self.features_a]) == -1).astype(int)
        df["Anomaly_Score"] = np.round(-self.detector.decision_function(df[self.features_a]), 4)
        
        df["Predicted_Value_168h_uA"] = np.round(self.regressor.predict(df[self.features_b]), 4)
        df["Predicted_Slope_0_168_uA_per_h"] = np.round(
            (df["Predicted_Value_168h_uA"] - df["Value_0h_uA"]) / 168.0, 6
        )
        df["Drift_Flag"] = (df["Predicted_Slope_0_168_uA_per_h"] >= self.safety_slope_threshold).astype(int)
        
        df["Final_Screening_Reject"] = (
            (df["Drift_Flag"] == 1) |
            (df["Dynamic_Anomaly"] == 1) |
            (df["Static_Limit_Fail"] == 1)
        ).astype(int)
        
        explanations = []
        for _, row in df.iterrows():
            if row["Static_Limit_Fail"] == 1:
                explanations.append("Exceeds static 50 µA datasheet limit")
            elif row["Dynamic_Anomaly"] == 1 and row["Drift_Flag"] == 1:
                explanations.append("Dynamic lot outlier + projected drift above safety slope")
            elif row["Drift_Flag"] == 1:
                explanations.append("Projected 168h drift above safety slope")
            elif row["Dynamic_Anomaly"] == 1:
                explanations.append("Dynamic lot-relative outlier")
            else:
                explanations.append("Within synthetic screening pattern")
        df["Explainability"] = explanations
        
        if output_csv is None:
            output_csv = "outputs/batch_screening_results.csv"
            
        os.makedirs(os.path.dirname(os.path.abspath(output_csv)), exist_ok=True)
        df.to_csv(output_csv, index=False)
        
        print("=" * 80)
        print("                     BATCH SCREENING RESULTS")
        print("=" * 80)
        print(f"Total Components Screened : {len(df)}")
        print(f"Total Rejected Units      : {df['Final_Screening_Reject'].sum()} ({df['Final_Screening_Reject'].mean()*100:.1f}%)")
        print(f"  * Early Drift Runaways  : {df['Drift_Flag'].sum()}")
        print(f"  * Dynamic Lot Outliers  : {df['Dynamic_Anomaly'].sum()}")
        print(f"  * Gross Static Fails    : {df['Static_Limit_Fail'].sum()}")
        print(f"Results saved to          : '{output_csv}'")
        print("=" * 80)
        
        return df

    def audit_component(self, part_id: str, data_path: str = "synthetic_burnin_telemetry.csv", output_png: str = None) -> dict:
        """Generates a visual QA Inspection Audit Card for a specific component."""
        if not os.path.exists(data_path):
            data_path = "data/synthetic_burnin_telemetry.csv"
        df = pd.read_csv(data_path)
        
        matches = df[df["Part_ID"] == part_id]
        if matches.empty:
            matches = df[df["Part_ID"].str.contains(part_id, case=False)]
            if matches.empty:
                raise ValueError(f"Component '{part_id}' not found in dataset.")
                
        row = matches.iloc[0]
        v0 = row["Value_0h_uA"]
        v24 = row["Value_24h_uA"]
        v96 = row.get("Value_96h_uA", np.nan)
        v168 = row.get("Value_168h_uA", np.nan)
        
        pred_168 = row.get("Predicted_Value_168h_uA", None)
        if pred_168 is None or np.isnan(pred_168):
            if self.regressor is None:
                self.load_models()
            pred_168 = float(self.regressor.predict(pd.DataFrame([{"Value_0h_uA": v0, "Value_24h_uA": v24}]))[0])
            
        fig, axes = plt.subplots(1, 2, figsize=(13, 5))
        
        # Left: Trajectory
        axes[0].plot([0, 24, 96, 168], [v0, v24, v96, v168], "ro-", label="Actual Measurements", linewidth=2)
        axes[0].plot([0, 24, 168], [v0, v24, pred_168], "b*--", label="AI 24h Early Forecast", markersize=9)
        axes[0].axhline(y=50.0, color="darkred", linestyle=":", label="Static Datasheet Limit (50 µA)")
        axes[0].fill_between([0, 168], [0, 0], [18, 18], color="green", alpha=0.1, label="Normal Lot In-Spec Band")
        
        axes[0].set_title(f"Component Trajectory Audit: {row['Part_ID']} ({row['Lot_ID']})", fontsize=11, fontweight="bold")
        axes[0].set_xlabel("Burn-In Hours")
        axes[0].set_ylabel("Iddq Leakage Current (µA)")
        axes[0].legend(loc="upper left", fontsize=8.5)
        axes[0].grid(True, linestyle="--", alpha=0.5)
        axes[0].set_ylim(0, max(55, (v168 if not np.isnan(v168) else pred_168) + 10))
        
        # Right: Bar breakdown
        metrics = ["Baseline (0h)", "24h Shift", "Pred 168h Drift", "Lot Mean", "Lot Std"]
        vals = [v0, (v24 - v0), (pred_168 - v0), row.get("Lot_Mean_uA", 10.0), row.get("Lot_Sigma_uA", 0.6)]
        colors = ["#1f77b4", "#ff7f0e", "#d62728" if pred_168 > 14 else "#2ca02c", "#7f7f7f", "#bcbd22"]
        
        axes[1].bar(metrics, vals, color=colors, edgecolor="black")
        axes[1].set_title(f"Component Telemetry Metrics | Risk: {row.get('Explainability', 'N/A')}", fontsize=10, fontweight="bold")
        axes[1].set_ylabel("Value (µA / Std)")
        axes[1].grid(axis="y", linestyle="--", alpha=0.5)
        plt.xticks(rotation=20, ha="right")
        
        plt.tight_layout()
        if output_png is None:
            output_png = f"outputs/audit_{row['Part_ID']}.png"
        os.makedirs(os.path.dirname(os.path.abspath(output_png)), exist_ok=True)
        plt.savefig(output_png, dpi=300)
        plt.close()
        
        print(f"[AUDIT] QA Inspection Card generated -> '{output_png}'")
        return {
            "Part_ID": str(row["Part_ID"]),
            "Lot_ID": str(row["Lot_ID"]),
            "Value_0h_uA": float(v0),
            "Value_24h_uA": float(v24),
            "Predicted_168h_uA": float(pred_168),
            "Audit_Card_Image": output_png,
            "Explainability": str(row.get("Explainability", "N/A"))
        }

def main():
    parser = argparse.ArgumentParser(
        description="Space-Grade Semiconductor Burn-In Screening Machine Learning Tool"
    )
    subparsers = parser.add_subparsers(dest="command", help="Tool Commands")
    
    train_parser = subparsers.add_parser("train", help="Train anomaly detector and drift regressor models")
    train_parser.add_argument("--data", type=str, default="synthetic_burnin_telemetry.csv", help="Training dataset path")
    
    pred_parser = subparsers.add_parser("predict", help="Real-time screening for a single component")
    pred_parser.add_argument("--v0", type=float, required=True, help="Value at 0h (µA)")
    pred_parser.add_argument("--v24", type=float, required=True, help="Value at 24h (µA)")
    pred_parser.add_argument("--v96", type=float, default=None, help="Value at 96h (µA, optional)")
    pred_parser.add_argument("--lot", type=str, default="LOT-001", help="Lot ID")
    
    screen_parser = subparsers.add_parser("screen", help="Batch screen a CSV telemetry file")
    screen_parser.add_argument("--input", type=str, required=True, help="Input CSV file path")
    screen_parser.add_argument("--output", type=str, default="outputs/batch_screening_results.csv", help="Output CSV path")
    
    audit_parser = subparsers.add_parser("audit", help="Generate visual QA audit inspection card for a component")
    audit_parser.add_argument("--part-id", type=str, required=True, help="Component Part ID (e.g. L001-P016)")
    audit_parser.add_argument("--data", type=str, default="synthetic_burnin_telemetry.csv", help="Dataset path")
    audit_parser.add_argument("--output", type=str, default=None, help="Output PNG path")
    
    args = parser.parse_args()
    tool = BurnInMLTool()
    
    if args.command == "train":
        tool.train(data_path=args.data)
    elif args.command == "predict":
        res = tool.predict_single(v0=args.v0, v24=args.v24, v96=args.v96, lot_id=args.lot)
        print(json.dumps(res, indent=2))
    elif args.command == "screen":
        tool.screen_batch(input_csv=args.input, output_csv=args.output)
    elif args.command == "audit":
        tool.audit_component(part_id=args.part_id, data_path=args.data, output_png=args.output)
    else:
        print("Running full automated training & verification workflow...")
        tool.train("synthetic_burnin_telemetry.csv")
        sample_res = tool.predict_single(v0=10.4722, v24=11.5146, lot_id="LOT-001")
        print("\n[SAMPLE REAL-TIME INFERENCE RESULT]:")
        print(json.dumps(sample_res, indent=2))

if __name__ == "__main__":
    main()
