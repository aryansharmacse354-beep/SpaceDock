"""
Module A - Dynamic Outlier Detector for Semiconductor Burn-In Screening
Demonstrates why static limits fail and implements:
1. Traditional Static Limit Baseline (Datasheet USL = 50.0 µA)
2. Robust Dynamic Lot-Aware Part Average Testing (AEC-Q001 / PAT)
3. Multi-Hour Time-Series Trajectory Isolation Forest
4. High-Reliability Ensemble (Optimized for Zero False Negatives)
"""
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support

STATIC_USL = 50.0  # Datasheet limit in µA

class DynamicOutlierDetector:
    """
    Lot-Aware Dynamic Outlier Detection System using Robust Part Average Testing (PAT).
    """
    def __init__(
        self,
        z_score_threshold: float = 3.0,
        contamination: float = 0.10,
        random_state: int = 42
    ):
        self.z_score_threshold = z_score_threshold
        self.contamination = contamination
        self.random_state = random_state
        self.lot_profiles = {}
        self.iso_forest = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=150
        )
        
    def fit_predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Executes Static Limit, Robust Dynamic PAT, and Time-Series Isolation Forest screening.
        """
        res = df.copy()
        
        # 1. Traditional Static Limit Checker (Pass/Fail against 50 µA)
        res["flag_static_limit"] = (
            (res["value_0h"] > STATIC_USL) |
            (res["value_24h"] > STATIC_USL) |
            (res["value_96h"] > STATIC_USL) |
            (res["value_168h"] > STATIC_USL)
        ).astype(int)
        
        # 2. Derive Multi-Hour Trajectory and Drift Features
        res["delta_24h"] = res["value_24h"] - res["value_0h"]
        res["delta_96h"] = res["value_96h"] - res["value_0h"]
        res["delta_168h"] = res["value_168h"] - res["value_0h"]
        res["delta_late"] = res["value_168h"] - res["value_96h"]
        res["drift_acceleration"] = (res["value_168h"] - res["value_96h"]) - (res["value_96h"] - res["value_24h"])
        
        # 3. Robust Dynamic Lot-Aware Part Average Testing (PAT)
        # Using Robust Median & Median Absolute Deviation (MAD) on in-spec population to avoid inflation from gross outliers
        print("[OUTLIER DETECTOR] Computing Robust Dynamic Lot-Aware Baselines (Median, MAD, PAT limits)...")
        lots = res["lot_id"].unique()
        metric_cols = ["value_0h", "value_24h", "value_96h", "value_168h", "delta_24h", "delta_168h", "delta_late"]
        
        for lot in lots:
            # Filter to in-spec parts to calculate clean healthy lot distribution parameters
            lot_clean = res[(res["lot_id"] == lot) & (res["flag_static_limit"] == 0)]
            self.lot_profiles[lot] = {"medians": {}, "mads": {}}
            for col in metric_cols:
                med = lot_clean[col].median()
                # Normal consistency constant for MAD = 1.4826
                mad = 1.4826 * np.median(np.abs(lot_clean[col] - med))
                mad = max(mad, 0.1)  # Safeguard against zero variance
                self.lot_profiles[lot]["medians"][col] = med
                self.lot_profiles[lot]["mads"][col] = mad
            
        # Compute robust relative Z-scores against specific lot median and MAD
        z_cols = []
        for col in ["value_168h", "delta_24h", "delta_168h", "delta_late"]:
            z_name = f"z_{col}"
            z_cols.append(z_name)
            res[z_name] = 0.0
            for lot in lots:
                mask = res["lot_id"] == lot
                m = self.lot_profiles[lot]["medians"][col]
                s = self.lot_profiles[lot]["mads"][col]
                res.loc[mask, z_name] = (res.loc[mask, col] - m) / s
                
        res["max_lot_zscore"] = res[z_cols].max(axis=1)
        res["flag_dynamic_pat"] = (
            (res["max_lot_zscore"] >= self.z_score_threshold) |
            (res["flag_static_limit"] == 1)
        ).astype(int)
        
        # 4. Multi-Hour Time-Series Trajectory Isolation Forest
        print("[OUTLIER DETECTOR] Fitting Multi-Hour Time-Series Isolation Forest...")
        feature_matrix = res[[
            "value_0h", "value_24h", "value_96h", "value_168h",
            "delta_24h", "delta_96h", "delta_168h", "delta_late", "drift_acceleration"
        ]].values
        
        iso_preds = self.iso_forest.fit_predict(feature_matrix)
        res["iso_forest_score"] = self.iso_forest.decision_function(feature_matrix)
        res["flag_isolation_forest"] = (iso_preds == -1).astype(int)
        
        # 5. Dynamic High-Reliability Ensemble (Catches any statistical PAT or ML anomaly)
        res["flag_dynamic_ensemble"] = (
            (res["flag_dynamic_pat"] == 1) | (res["flag_isolation_forest"] == 1)
        ).astype(int)
        
        return res

def evaluate_screening_methods(df: pd.DataFrame) -> dict:
    """
    Evaluates and compares Static Limits vs Dynamic PAT vs Isolation Forest vs Ensemble.
    """
    y_true = df["is_defect"].values
    
    methods = {
        "Static Datasheet Limit (50µA)": "flag_static_limit",
        "Dynamic Lot-Aware PAT (Z-Score)": "flag_dynamic_pat",
        "Isolation Forest (Trajectory)": "flag_isolation_forest",
        "Dynamic Ensemble (PAT + IsoForest)": "flag_dynamic_ensemble"
    }
    
    summary = {}
    print("\n" + "=" * 80)
    print("      MODULE A: COMPARATIVE ANOMALY SCREENING BENCHMARK")
    print("=" * 80)
    
    for label, col in methods.items():
        y_pred = df[col].values
        cm = confusion_matrix(y_true, y_pred)
        tn, fp, fn, tp = cm.ravel()
        p, r, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
        fnr = fn / (tp + fn) if (tp + fn) > 0 else 0.0
        
        summary[label] = {
            "Total_Flagged": int(tp + fp),
            "True_Positives": int(tp),
            "False_Positives": int(fp),
            "False_Negatives (Escaped Defects)": int(fn),
            "False_Negative_Rate (%)": float(fnr * 100),
            "Precision": float(p),
            "Recall": float(r),
            "F1_Score": float(f1)
        }
        
        print(f"Method: {label}")
        print(f"  Total Flagged: {tp + fp} | TP: {tp} | FP: {fp} | FN (Escaped Defects): {fn} (FNR: {fnr*100:.2f}%)")
        print(f"  Precision: {p:.4f} | Recall: {r:.4f} | F1-Score: {f1:.4f}")
        print("-" * 80)
        
    return summary
