"""
Advanced training pipeline with improved SSL certificate validation:
- Loads phishing.csv (expects target column 'Result')
- Label normalisation (maps -1 => phishing (1), 1 => legitimate (0))
- SMOTE oversampling, feature selection (ExtraTrees), stacking ensemble (RF, SVM, GB) -> LogisticRegression
- Enhanced SSL certificate validation to prevent HTTPS-only phishing detection
- Saves models to models/
"""

import os
import joblib
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd

from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.feature_selection import SelectFromModel

try:
    from imblearn.over_sampling import SMOTE
    from imblearn.pipeline import Pipeline as ImbPipeline
except Exception as e:
    raise SystemExit("imblearn is required. Install with: pip install imbalanced-learn")

# ------------------------
# Config
# ------------------------
DATA_PATH = os.getenv("DATA_PATH", "phishing.csv")
TARGET = "Result"
MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

# ------------------------
# Load dataset
# ------------------------
df = pd.read_csv(DATA_PATH)
if "index" in df.columns:
    df = df.drop(columns=["index"])

if TARGET not in df.columns:
    raise ValueError(f"Target column '{TARGET}' not found. Available: {df.columns.tolist()}")

# Map labels to binary: phishing=1, safe=0
label_map = {-1: 1, 1: 0, 0: 0, 2: 1}
df[TARGET] = df[TARGET].map(label_map)
df = df.dropna(subset=[TARGET])  # ensure no null targets

X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)
feature_columns = X.columns.tolist()

print("Dataset shape:", df.shape)
print("Positive (phishing) count:", y.sum(), "Negative (safe):", (y == 0).sum())

# ------------------------
# Pipeline components
# ------------------------
scaler = StandardScaler()

fs_estimator = ExtraTreesClassifier(n_estimators=300, random_state=42, class_weight="balanced")
selector = SelectFromModel(fs_estimator, threshold="median", prefit=False)

# Adjusted Random Forest with reduced emphasis on SSL feature
rf = RandomForestClassifier(
    n_estimators=300,
    min_samples_split=4,
    min_samples_leaf=2,
    class_weight="balanced_subsample",
    random_state=42,
    n_jobs=-1,
    max_features='sqrt',  # Reduced to prevent over-reliance on single features
)

# SVM with RBF kernel
svm = SVC(kernel="rbf", C=2.0, gamma="scale", probability=True, class_weight="balanced", random_state=42)

# Gradient Boosting with limited depth to prevent overfitting
gb = GradientBoostingClassifier(
    random_state=42,
    max_depth=3,  # Limited depth to prevent overfitting
    learning_rate=0.1
)

# Logistic Regression with L2 regularization
logreg = LogisticRegression(
    max_iter=1000, 
    class_weight="balanced",
    penalty='l2',
    C=0.1  # Stronger regularization
)

# Stacking classifier with the above models
from sklearn.ensemble import StackingClassifier
estimators = [("rf", rf), ("svm", svm), ("gb", gb)]
stack = StackingClassifier(
    estimators=estimators, 
    final_estimator=logreg, 
    passthrough=False, 
    n_jobs=-1
)

# Pipeline with SMOTE for handling class imbalance
pipe = ImbPipeline(
    steps=[
        ("smote", SMOTE(random_state=42, k_neighbors=5)),
        ("scaler", scaler),
        ("feature_select", selector),
        ("stack", stack),
    ]
)

# ------------------------
# Train / Evaluate
# ------------------------
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print("Training ...")
pipe.fit(X_train, y_train)

# Evaluation on test
y_pred = pipe.predict(X_test)
y_prob = pipe.predict_proba(X_test)[:, 1]

print("\n📊 Classification Report (Test):")
print(classification_report(y_test, y_pred, digits=4))
print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))
try:
    print(f"ROC-AUC: {roc_auc_score(y_test, y_prob):.4f}")
except Exception:
    pass

# Cross-validation ROC-AUC
cv = StratifiedKFold(n_splits=10, shuffle=True, random_state=42)
print("\nRunning 10-fold CV (this may take a while)...")
cv_scores = cross_val_score(pipe, X, y, cv=cv, scoring="roc_auc", n_jobs=-1)
print(f"✅ 10-fold CV ROC-AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ------------------------
# Save artifacts
# ------------------------
joblib.dump(pipe, os.path.join(MODEL_DIR, "stacking_model.pkl"))
joblib.dump(feature_columns, os.path.join(MODEL_DIR, "feature_columns.pkl"))
# Save a standard scaler fitted to full X (compatibility)
joblib.dump(StandardScaler().fit(X), os.path.join(MODEL_DIR, "scaler.pkl"))

# Save SSL validation function for use in prediction
ssl_validation_code = '''
import ssl
import socket
from urllib.parse import urlparse

def validate_ssl_certificate(url):
    """
    Validates SSL certificate for a URL to determine if it's legitimate
    Returns 1 for valid SSL, 0 for suspicious/invalid SSL, -1 for no SSL
    """
    if not url.startswith('https://'):
        return -1  # Not HTTPS
    
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        port = parsed.port or 443
        
        # List of common free certificate authorities often used by phishers
        suspicious_issuers = {
            "Let's Encrypt", "cPanel, Inc.", "COMODO CA Limited", "Sectigo Limited"
        }
        
        # Create SSL context
        context = ssl.create_default_context()
        
        # Get certificate information
        with socket.create_connection((hostname, port), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                
                # Check if certificate is self-signed
                if cert.get('issuer') and cert.get('subject'):
                    issuer = cert['issuer'][0][0][1]
                    
                    # Check for suspicious certificate issuers
                    if issuer in suspicious_issuers:
                        return 0  # Neutral, not fully trusted
                    
                    # Check if domain matches certificate
                    subject_alt_names = cert.get('subjectAltName', [])
                    domain_matches = False
                    
                    # Check common name
                    if cert.get('subject'):
                        common_name = cert['subject'][0][0][1]
                        if common_name == hostname or common_name.startswith('*.'):
                            domain_matches = True
                    
                    # Check subject alternative names
                    for entry in subject_alt_names:
                        if entry[0] == 'DNS' and (entry[1] == hostname or entry[1].startswith('*.')):
                            domain_matches = True
                            break
                    
                    if not domain_matches:
                        return -1  # Domain doesn't match certificate
                    
                    # Check certificate validity period
                    not_before = datetime.strptime(cert['notBefore'], '%b %d %H:%M:%S %Y %Z')
                    not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    now = datetime.now()
                    
                    if now < not_before or now > not_after:
                        return -1  # Certificate is not valid yet or expired
                    
                    # If all checks pass, certificate is valid
                    return 1
        
        return -1  # Default to unsafe if we can't validate
    except Exception as e:
        print(f"SSL validation error: {str(e)}")
        return -1  # Default to unsafe if validation fails
'''

with open(os.path.join(MODEL_DIR, "ssl_validation.py"), "w") as f:
    f.write(ssl_validation_code)

print("\n✅ Saved models to 'models/'")
print("✅ Saved SSL validation function to 'models/ssl_validation.py'")