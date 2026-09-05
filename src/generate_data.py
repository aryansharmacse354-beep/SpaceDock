"""
Synthetic Data Generator for Semiconductor Burn-In Screening System
Simulates 2,000 space-grade semiconductor components undergoing 125°C Burn-In testing.
Generates Standby Current (Iddq / Leakage Current in µA) across 0h, 24h, 96h, and 168h.
Explicitly models:
1. Healthy components (stable thermal settling)
2. Latent defect components (subtle early drift, severe non-linear runaway that passes static 50 µA limit)
3. Gross failure components (> 50 µA static datasheet limit)
"""
import os
import numpy as np
import pandas as pd

# Global Datasheet Specification Limit
STATIC_DATASHEET_USL = 50.0  # Upper Specification Limit in µA

def generate_burn_in_data(
    num_components: int = 2000,
    defect_rate: float = 0.08,
    gross_fail_rate: float = 0.02,
    output_path: str = "data/burn_in_data.csv",
    random_seed: int = 42
) -> pd.DataFrame:
    """
    Generates synthetic parametric burn-in test dataset for Iddq leakage current.
    
    Parameters:
    -----------
    num_components : int
        Total component population (default: 2000).
    defect_rate : float
        Proportion of latent defect components (default: 0.08).
    gross_fail_rate : float
        Proportion of gross static limit failures (default: 0.02).
    output_path : str
        Filepath for the generated CSV dataset.
    random_seed : int
        Reproducibility seed.
        
    Returns:
    --------
    pd.DataFrame
        DataFrame with parametric time-series measurements and defect ground-truth.
    """
    np.random.seed(random_seed)
    
    lots = ["Lot_A", "Lot_B", "Lot_C"]
    lot_probs = [0.35, 0.35, 0.30]
    
    # Lot baseline parameters (mean and std in µA)
    lot_specs = {
        "Lot_A": {"mean": 8.5, "std": 0.8},
        "Lot_B": {"mean": 13.0, "std": 1.1},
        "Lot_C": {"mean": 10.0, "std": 0.9}
    }
    
    lot_assignments = np.random.choice(lots, size=num_components, p=lot_probs)
    component_ids = [f"COMP_{i+1:05d}" for i in range(num_components)]
    
    # Class assignments: 0: Healthy, 1: Latent Defect, 2: Gross Static Failure
    num_latent = int(num_components * defect_rate)
    num_gross = int(num_components * gross_fail_rate)
    num_healthy = num_components - num_latent - num_gross
    
    class_labels = np.array([0] * num_healthy + [1] * num_latent + [2] * num_gross)
    np.random.shuffle(class_labels)
    
    # Arrays for time points
    val_0h = np.zeros(num_components)
    val_24h = np.zeros(num_components)
    val_96h = np.zeros(num_components)
    val_168h = np.zeros(num_components)
    
    for i in range(num_components):
        lot = lot_assignments[i]
        c_type = class_labels[i]
        l_mean = lot_specs[lot]["mean"]
        l_std = lot_specs[lot]["std"]
        
        # 0h Baseline
        v0 = np.random.normal(loc=l_mean, scale=l_std)
        val_0h[i] = max(1.0, v0)
        
        if c_type == 0:
            # HEALTHY PART: Normal thermal settling drift at 125°C
            d24 = np.random.normal(loc=0.25, scale=0.08)
            d96 = np.random.normal(loc=0.45, scale=0.12)
            d168 = np.random.normal(loc=0.35, scale=0.10)
            
            val_24h[i] = val_0h[i] + d24
            val_96h[i] = val_24h[i] + d96
            val_168h[i] = val_96h[i] + d168
            
        elif c_type == 1:
            # LATENT DEFECT: Subtle early acceleration, non-linear runaway between 24h & 168h
            # Crucial feature: stays under static limit (50 µA) at 168h (e.g., 32 - 48 µA)
            # but represents a huge 300-400% drift from its lot mean!
            d24 = np.random.normal(loc=1.20, scale=0.20)
            d96 = np.random.normal(loc=9.50, scale=1.50)
            d168 = np.random.normal(loc=18.00, scale=2.50)
            
            val_24h[i] = val_0h[i] + d24
            val_96h[i] = val_24h[i] + d96
            val_168h[i] = val_96h[i] + d168
            
            # Cap latent defect below 49.5 µA to strictly simulate parts that pass static 50 µA limit
            if val_168h[i] >= STATIC_DATASHEET_USL:
                val_168h[i] = np.random.uniform(44.0, 49.2)
                
        else:
            # GROSS FAILURE: Obvious catastrophic breakdown exceeding static 50 µA limit
            d24 = np.random.normal(loc=15.0, scale=3.0)
            d96 = np.random.normal(loc=35.0, scale=5.0)
            d168 = np.random.normal(loc=60.0, scale=8.0)
            
            val_24h[i] = val_0h[i] + d24
            val_96h[i] = val_24h[i] + d96
            val_168h[i] = val_96h[i] + d168
            
    # Binary defect label: 1 if Latent Defect or Gross Failure, 0 if Healthy
    is_defect = (class_labels > 0).astype(int)
    defect_type_str = np.where(class_labels == 0, "Healthy", np.where(class_labels == 1, "Latent Defect", "Gross Failure"))
    
    df = pd.DataFrame({
        "component_id": component_ids,
        "lot_id": lot_assignments,
        "value_0h": np.round(val_0h, 3),
        "value_24h": np.round(val_24h, 3),
        "value_96h": np.round(val_96h, 3),
        "value_168h": np.round(val_168h, 3),
        "defect_type": defect_type_str,
        "is_defect": is_defect
    })
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    
    print(f"[DATA GENERATOR] Generated {num_components} components:")
    print(f"  - Healthy Components : {num_healthy} ({num_healthy/num_components*100:.1f}%)")
    print(f"  - Latent Defects     : {num_latent} ({defect_rate*100:.1f}%) [Passes static 50 µA limit]")
    print(f"  - Gross Failures     : {num_gross} ({gross_fail_rate*100:.1f}%) [Exceeds static 50 µA limit]")
    print(f"[DATA GENERATOR] Saved to {output_path}")
    
    return df

if __name__ == "__main__":
    df = generate_burn_in_data()
    print("\nSample Data:")
    print(df.sample(8, random_state=42))
