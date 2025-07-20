import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# --- load inventory ----------------------------------------------------
path = r"C:\Users\macdo\OneDrive\Desktop\Vertical Lift Loading\Tray_Optimizer_Inventory_python.xlsx"
df = pd.read_excel(path)

# --- date range --------------------------------------------------------
start_date = datetime(2024, 1, 1)
end_date   = datetime(2024, 12, 31)
days       = (end_date - start_date).days + 1
dates      = [start_date + timedelta(days=i) for i in range(days)]

# --- RNG ---------------------------------------------------------------
rng = np.random.default_rng(42)
rows = []

# --- generate daily sales with exact annual total ----------------------
for _, row in df.iterrows():
    sku           = row["SKU"]
    annual_sales  = int(row["Annual Sales"])
    
    # Multinomial split: 365 categories with equal probability
    daily_sales = rng.multinomial(annual_sales, np.full(days, 1/days))
    
    rows.extend(
        {"date": d.date(), "sku": sku, "units_sold": int(q)}
        for d, q in zip(dates, daily_sales)
    )

daily_df = pd.DataFrame(rows)
out_path = r"C:\Users\macdo\OneDrive\Desktop\Vertical Lift Loading\fake_daily_sales_2024.csv"
daily_df.to_csv(out_path, index=False)

# Verify every SKU matches its annual target
check = (
    daily_df.groupby("sku")["units_sold"].sum()
    .rename("sim_total")
    .reset_index()
    .merge(df[["SKU","Annual Sales"]], left_on="sku", right_on="SKU")
)
assert (check["sim_total"] == check["Annual Sales"]).all(), "Totals mismatch!"

print("✓ Daily data written to:", out_path)
print(daily_df.head())
