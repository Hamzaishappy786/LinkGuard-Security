# download_dataset.py
import pandas as pd

# Load local dataset instead of downloading
df = pd.read_csv("phishing.csv")

# Drop the extra index column if exists
if "index" in df.columns:
    df = df.drop(columns=["index"])

print(f"Dataset loaded with {len(df)} URLs")
print("Columns:", df.columns.tolist())
print("Target distribution:")
print(df["Result"].value_counts())
