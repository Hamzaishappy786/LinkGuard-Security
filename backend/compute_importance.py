"""
One-time / offline: compute global feature importance for the stacking model using
sklearn permutation importance, and save it to models/feature_importance.pkl.

The runtime XAI layer (explanation.py) uses this only to RANK the signals it shows;
it falls back to sensible default weights if this file is absent. So running this is
optional -- it just makes the ranking data-driven instead of hand-tuned.

Run from the backend/ directory with the project's venv:
    python compute_importance.py
"""
import os
import joblib
import pandas as pd
from sklearn.inspection import permutation_importance

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(HERE, "models")


def main():
    model = joblib.load(os.path.join(MODEL_DIR, "stacking_model.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    feature_columns = list(joblib.load(os.path.join(MODEL_DIR, "feature_columns.pkl")))

    # The labelled training data ships with the project.
    csv = os.path.join(HERE, "features_extracted.csv")
    if not os.path.exists(csv):
        csv = os.path.join(HERE, "phishing.csv")
    df = pd.read_csv(csv)

    y = df["Result"]
    X = df[feature_columns]
    X_scaled = scaler.transform(X)

    print(f"Computing permutation importance on {len(df)} rows ({len(feature_columns)} features)...")
    result = permutation_importance(
        model, X_scaled, y, n_repeats=10, random_state=42, n_jobs=-1
    )
    importance = {col: float(mean) for col, mean in zip(feature_columns, result.importances_mean)}

    out_path = os.path.join(MODEL_DIR, "feature_importance.pkl")
    joblib.dump(importance, out_path)
    print(f"\nSaved {out_path}\n")

    print("Feature importance (most -> least influential):")
    for col, val in sorted(importance.items(), key=lambda kv: kv[1], reverse=True):
        print(f"  {val:+.5f}  {col}")


if __name__ == "__main__":
    main()
