"""
Build the full SpaceDock 20-lot synthetic burnin telemetry dataset provided by user.
"""
import os
import pandas as pd
import numpy as np

# We also copy to root and data/
output_root = "synthetic_burnin_telemetry.csv"
output_data = "data/synthetic_burnin_telemetry.csv"

# Load existing chunk
if os.path.exists(output_data):
    df_existing = pd.read_csv(output_data)
else:
    df_existing = None

print(f"Existing rows: {len(df_existing) if df_existing is not None else 0}")
