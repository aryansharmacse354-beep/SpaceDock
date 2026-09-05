"""
Generate Fresh New Mathematical Telemetry Dataset for Semiconductor Burn-In Screening
Generates 1,000 fresh components across 10 new manufacturing lots (LOT-021 to LOT-030).
"""
import os
import numpy as np
import pandas as pd

np.random.seed(2026)

lots = [f"LOT-{i:03d}" for i in range(21, 31)]
lot_means = {
    "LOT-021": 9.85, "LOT-022": 10.45, "LOT-023": 9.20, "LOT-024": 11.10, "LOT-025": 10.05,
    "LOT-026": 9.60, "LOT-027": 10.80, "LOT-028": 8.95, "LOT-029": 10.25, "LOT-030": 9.50
}
lot_sigmas = {
    "LOT-021": 0.55, "LOT-022": 0.68, "LOT-023": 0.48, "LOT-024": 0.72, "LOT-025": 0.52,
    "LOT-026": 0.58, "LOT-027": 0.65, "LOT-028": 0.45, "LOT-029": 0.60, "LOT-030": 0.50
}

num_parts_per_lot = 100
records = []

for lot_id in lots:
    l_mean = lot_means[lot_id]
    l_sigma = lot_sigmas[lot_id]
    
    for p_idx in range(1, num_parts_per_lot + 1):
        part_id = f"{lot_id.replace('-', '')}-P{p_idx:03d}"
        
        # Categorization: 90% Healthy, 8% Latent Defect, 2% Gross Failure
        rand_draw = np.random.uniform(0, 1)
        
        if rand_draw < 0.02:
            # Gross Static Failure (> 50 µA)
            v0 = np.random.uniform(40.0, 54.0)
            v24 = v0 + np.random.uniform(10.0, 20.0)
            v96 = v24 + np.random.uniform(15.0, 30.0)
            v168 = v96 + np.random.uniform(20.0, 40.0)
            label = 1
        elif rand_draw < 0.10:
            # Latent Defect (Passes 50 µA limit, accelerates exponentially between 24h & 168h)
            v0 = np.random.normal(l_mean, l_sigma)
            v24 = v0 + np.random.uniform(0.95, 1.85)  # Subtle 24h drift
            v96 = v24 + np.random.uniform(3.5, 6.0)   # Non-linear acceleration
            v168 = v96 + np.random.uniform(4.5, 9.0)  # Thermal runaway
            label = 1
        else:
            # Healthy In-Spec Component (Normal stabilizing thermal drift)
            v0 = np.random.normal(l_mean, l_sigma)
            v24 = v0 + np.random.normal(0.18, 0.06)
            v96 = v24 + np.random.normal(0.24, 0.08)
            v168 = v96 + np.random.normal(0.20, 0.08)
            label = 0
            
        v0 = round(float(v0), 4)
        v24 = round(float(v24), 4)
        v96 = round(float(v96), 4)
        v168 = round(float(v168), 4)
        
        z0 = round((v0 - l_mean) / l_sigma, 4)
        z24 = round((v24 - l_mean) / l_sigma, 4)
        z96 = round((v96 - l_mean) / l_sigma, 4)
        z168 = round((v168 - l_mean) / l_sigma, 4)
        
        slope_0_24 = round((v24 - v0) / 24.0, 6)
        slope_24_168 = round((v168 - v24) / 144.0, 6)
        static_fail = 1 if (v0 > 50.0 or v24 > 50.0 or v96 > 50.0 or v168 > 50.0) else 0
        
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
            "Static_Limit_Fail": static_fail,
            "Latent_Defect_Label": label
        })

df_new = pd.DataFrame(records)
out_file = "new_burnin_telemetry_batch.csv"
data_out = "data/new_burnin_telemetry_batch.csv"

df_new.to_csv(out_file, index=False)
os.makedirs("data", exist_ok=True)
df_new.to_csv(data_out, index=False)

print(f"[SUCCESS] Generated {len(df_new)} new mathematical records across {df_new['Lot_ID'].nunique()} lots.")
print(f"          Saved to '{out_file}' and '{data_out}'.")
print(f"          Total Defective Units: {df_new['Latent_Defect_Label'].sum()} ({df_new['Latent_Defect_Label'].mean()*100:.1f}%)")
