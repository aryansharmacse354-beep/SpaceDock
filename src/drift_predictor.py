"""
Module B - Time-Series Drift Predictor for Semiconductor Burn-In Screening
Takes strictly Value_0h and Value_24h measurements as inputs to forecast Value_168h.
Calculates the physical safety slope:
    Safety Slope S = (Predicted_Value_168h - Value_0h) / 168h  (µA/hour)
Flags components exceeding the safety threshold slope for early 24h rejection.
"""
import os
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, confusion_matrix, precision_recall_fscore_support

class DriftPredictor:
    """
    Early-Stage Time-Series Drift Predictor using XGBoost Regression.
    """
    def __init__(
        self,
        safety_slope_threshold: float = 0.05,  # Max allowed drift slope in µA/h
        drift_delta_threshold: float = 8.0,    # Max allowed 168h total drift in µA
        random_state: int = 42
    ):
        self.safety_slope_threshold = safety_slope_threshold
        self.drift_delta_threshold = drift_delta_threshold
        self.random_state = random_state
        self.model = xgb.XGBRegressor(
            n_estimators=180,
            max_depth=4,
            learning_rate=0.04,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.feature_names = []
        
    def extract_early_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extracts features available strictly at or before 24h burn-in.
        """
        feats = pd.DataFrame(index=df.index)
        feats["value_0h"] = df["value_0h"]
        feats["value_24h"] = df["value_24h"]
        feats["delta_24h_0h"] = df["value_24h"] - df["value_0h"]
        feats["velocity_24h"] = feats["delta_24h_0h"] / 24.0  # µA/hour
        feats["ratio_24h_0h"] = df["value_24h"] / (df["value_0h"] + 1e-6)
        
        # Lot context
        lot_dummies = pd.get_dummies(df["lot_id"], prefix="lot", drop_first=False, dtype=float)
        feats = pd.concat([feats, lot_dummies], axis=1)
        
        return feats

    def train_and_evaluate(
        self,
        df: pd.DataFrame,
        test_size: float = 0.20
    ) -> tuple:
        """
        Trains the XGBoost regressor, evaluates MAE/RMSE on test split, and calculates safety slope flags.
        """
        X = self.extract_early_features(df)
        self.feature_names = list(X.columns)
        y = df["value_168h"].values
        
        stratify = df["is_defect"] if "is_defect" in df.columns else None
        X_train, X_test, y_train, y_test, _, _ = train_test_split(
            X, y, df.index, test_size=test_size, random_state=self.random_state, stratify=stratify
        )
        
        print("[DRIFT PREDICTOR] Training XGBoost Regressor on (Value_0h, Value_24h, Early Velocity)...")
        self.model.fit(X_train, y_train)
        
        # Test evaluation
        y_pred_test = self.model.predict(X_test)
        mae_test = mean_absolute_error(y_test, y_pred_test)
        rmse_test = np.sqrt(mean_squared_error(y_test, y_pred_test))
        r2_test = r2_score(y_test, y_pred_test)
        
        print(f"[DRIFT PREDICTOR] Test Split Evaluation:")
        print(f"  * Mean Absolute Error (MAE) : {mae_test:.4f} µA")
        print(f"  * Root Mean Squared (RMSE)  : {rmse_test:.4f} µA")
        print(f"  * R-squared (R2 Score)      : {r2_test:.4f}")
        
        # Whole population forecast
        y_pred_all = self.model.predict(X)
        
        res = df.copy()
        res["pred_value_168h"] = np.round(y_pred_all, 3)
        res["pred_drift_delta_168h"] = np.round(res["pred_value_168h"] - res["value_0h"], 3)
        
        # Physical Safety Slope Calculation: (Pred_168h - 0h) / 168h
        res["pred_safety_slope"] = np.round(res["pred_drift_delta_168h"] / 168.0, 5)
        
        # Early Rejection Flag at 24h
        res["flag_early_24h_rejection"] = (
            (res["pred_safety_slope"] >= self.safety_slope_threshold) |
            (res["pred_drift_delta_168h"] >= self.drift_delta_threshold)
        ).astype(int)
        
        # Defect Screening Evaluation
        metrics = {
            "MAE_test": float(mae_test),
            "RMSE_test": float(rmse_test),
            "R2_test": float(r2_test),
            "total_early_flagged": int(res["flag_early_24h_rejection"].sum())
        }
        
        if "is_defect" in res.columns:
            y_true = res["is_defect"].values
            y_flag = res["flag_early_24h_rejection"].values
            tn, fp, fn, tp = confusion_matrix(y_true, y_flag).ravel()
            p, r, f1, _ = precision_recall_fscore_support(y_true, y_flag, average="binary", zero_division=0)
            metrics.update({
                "TP": int(tp), "FP": int(fp), "FN": int(fn), "TN": int(tn),
                "Precision": float(p), "Recall": float(r), "F1": float(f1),
                "False_Negative_Rate": float(fn / (tp + fn)) if (tp + fn) > 0 else 0.0
            })
            
        return res, metrics, X_test, y_test, y_pred_test

if __name__ == "__main__":
    from generate_data import generate_burn_in_data
    df = generate_burn_in_data()
    predictor = DriftPredictor()
    res, metrics, _, _, _ = predictor.train_and_evaluate(df)
    
    print("\n" + "=" * 65)
    print("  Module B: Early 24h Drift Predictor Evaluation")
    print("=" * 65)
    print(f"  Test Set MAE               : {metrics['MAE_test']:.4f} µA")
    print(f"  Components Flagged at 24h  : {metrics['total_early_flagged']} / {len(res)}")
    print(f"  True Positives (TP)        : {metrics['TP']}")
    print(f"  False Negatives (FN)       : {metrics['FN']} (FNR: {metrics['False_Negative_Rate']*100:.2f}%)")
    print(f"  Precision: {metrics['Precision']:.4f} | Recall: {metrics['Recall']:.4f} | F1: {metrics['F1']:.4f}")
    print("=" * 65)
