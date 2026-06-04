# features_extraction.py
import pandas as pd

# Load dataset
df = pd.read_csv("phishing.csv")

# Target column
target_col = "Result"

# Automatically detect features (exclude target)
feature_cols = [col for col in df.columns if col != target_col]

# Filter dataset safely
if target_col not in df.columns:
    raise ValueError(f"❌ Target column '{target_col}' not found in dataset! Available columns: {df.columns.tolist()}")

df = df[feature_cols + [target_col]]

# Save processed dataset
df.to_csv("features_extracted.csv", index=False)

print("✅ Features extracted and saved to features_extracted.csv")
print("Shape:", df.shape)
print("Columns:", df.columns.tolist())
print("Target distribution:")
print(df[target_col].value_counts())
