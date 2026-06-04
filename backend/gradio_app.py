import gradio as gr
import os
import pandas as pd
import joblib
import whois
import requests
from urllib.parse import urlparse
import base64
import json
from datetime import datetime

# --- Configuration & Model Loading ---

# Try to import the feature computation function from your existing file
try:
    from url_features import compute_dataset_like_features
    HAVE_URL_FEATURES = True
    print("✅ Successfully imported feature extractor from url_features.py")
except Exception as e:
    HAVE_URL_FEATURES = False
    print(f"⚠️ Could not import from url_features.py: {e}. A local fallback will be used.")

# API Keys & Endpoints
GSB_API_KEY = os.getenv("GSB_API_KEY", "AIzaSyAn87pgfFVcCr8M9NBssdLBMo4eGZJ3Q7k") # Use environment variables for safety
SAFE_BROWSING_URL = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GSB_API_KEY}"
VT_API_KEY = os.getenv("VT_API_KEY", "2a9e59c1e4a4bc8929eb6cb4cffccb00b864115cc75a82ee0983a46f8e4d2ff8") # Use environment variables for safety
VT_URL_SCAN = "https://www.virustotal.com/api/v3/urls"
VT_HEADERS = {"x-apikey": VT_API_KEY}
URLHAUS_URL = "https://urlhaus-api.abuse.ch/v1/url/"

# Load ML artifacts
MODEL_DIR = "models"
model, scaler, feature_columns = None, None, []

try:
    model = joblib.load(os.path.join(MODEL_DIR, "stacking_model.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    feature_columns = joblib.load(os.path.join(MODEL_DIR, "feature_columns.pkl"))
    print("✅ Stacking model and artifacts loaded successfully!")
except Exception as e:
    print(f"❌ Error loading ML artifacts: {e}. ML predictions will be disabled.")
    model = None

# --- Helper & External Intelligence Functions ---

def extract_url_features_local(url: str) -> dict:
    return {col: 0 for col in feature_columns} if feature_columns else {}

def check_safe_browsing(url: str):
    body = {"client": {"clientId": "phishing-detector-gradio", "clientVersion": "1.0"},"threatInfo": {"threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "PHISHING"],"platformTypes": ["ANY_PLATFORM"],"threatEntryTypes": ["URL"],"threatEntries": [{"url": url}],},}
    if not GSB_API_KEY: return {"enabled": False, "malicious": False, "error": "API Key not set"}
    try:
        r = requests.post(SAFE_BROWSING_URL, json=body, timeout=5)
        res = r.json()
        return {"enabled": True, "malicious": bool(res.get("matches")), "raw": res}
    except Exception as e: return {"enabled": True, "error": str(e), "malicious": False}

def check_urlhaus(url: str):
    try:
        r = requests.post(URLHAUS_URL, data={"url": url}, timeout=5)
        res = r.json()
        return {"enabled": True, "malicious": (res.get("query_status") == "ok"), "raw": res}
    except Exception as e: return {"enabled": True, "error": str(e), "malicious": False}

def check_virustotal(url: str):
    if not VT_API_KEY: return {"enabled": False, "malicious": False, "error": "API Key not set"}
    try:
        url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
        rep = requests.get(f"https://www.virustotal.com/api/v3/urls/{url_id}", headers=VT_HEADERS, timeout=5)
        if rep.status_code == 200:
            stats = rep.json().get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            malicious = (stats.get("malicious", 0) > 0 or stats.get("suspicious", 0) > 0)
            return {"enabled": True, "malicious": malicious, "raw": stats}
        return {"enabled": True, "error": "No report available", "malicious": False}
    except Exception as e: return {"enabled": True, "error": str(e), "malicious": False}

def get_whois_info(url: str):
    try:
        domain = urlparse(url).netloc
        w = whois.whois(domain)
        if w.domain_name:
            return {
                "Domain": str(w.domain_name), "Registrar": str(w.registrar),
                "Creation Date": str(w.creation_date), "Expiration Date": str(w.expiration_date),
                "Country": str(w.country)
            }
        return {"error": "Domain not registered or WHOIS data unavailable."}
    except Exception as e: return {"error": str(e)}

# --- Core Prediction Logic ---

def analyze_url(url: str):
    """
    Analyzes a URL and returns a dictionary of results for the Gradio UI.
    """
    if not url.strip():
        # Return a dictionary with default values for all outputs
        return {
            output_verdict_box: gr.Textbox(value="⚠️ Please enter a URL to analyze.", visible=True),
            output_tabs: gr.Tabs(visible=False)
        }

    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    # 1. Feature Extraction
    feats = compute_dataset_like_features(url) if HAVE_URL_FEATURES else extract_url_features_local(url)
    row = {col: feats.get(col, 0) for col in feature_columns} if feature_columns else feats.copy()
    X = pd.DataFrame([row])

    # 2. ML Model Prediction
    ml_pred, ml_conf = None, None
    if model and scaler and feature_columns:
        try:
            X_scaled = scaler.transform(X)
            ml_pred = int(model.predict(X_scaled)[0])
            if hasattr(model, "predict_proba"):
                ml_conf = float(model.predict_proba(X_scaled)[0][1])
        except Exception as e:
            print(f"ML Prediction Error: {e}")
            ml_pred, ml_conf = "Error", 0.0

    # 3. External Intelligence
    gsb = check_safe_browsing(url)
    uh = check_urlhaus(url)
    vt = check_virustotal(url)
    whois_info = get_whois_info(url)

    # 4. Final Verdict Logic
    external_malicious = any([gsb.get("malicious"), uh.get("malicious"), vt.get("malicious")])
    final_prediction = 1 if external_malicious else (ml_pred if ml_pred is not None else 0)
    reason = "Threat intelligence hit" if external_malicious else "ML model verdict"

    # 5. Prepare results for Gradio components
    verdict_text = "🔴 PHISHING" if final_prediction == 1 else "🟢 SAFE"
    verdict_bg_color = "bg-red-900/50 border-red-500/80" if final_prediction == 1 else "bg-green-900/50 border-green-500/80"
    
    # Highlighted Text for ML Verdict
    ml_confidence_list = []
    if isinstance(ml_conf, float):
        safe_conf = 1 - ml_conf
        phish_conf = ml_conf
        ml_confidence_list = [
            (f"Safe", f"{safe_conf:.1%}"),
            (f"Phishing", f"{phish_conf:.1%}"),
        ]

    return {
        output_verdict_box: gr.Textbox(value=verdict_text, visible=True, elem_classes=f"verdict-box {verdict_bg_color}"),
        output_tabs: gr.Tabs(visible=True),
        output_url: gr.Textbox(value=url),
        output_reason: gr.Textbox(value=reason),
        output_ml_confidence: gr.HighlightedText(value=ml_confidence_list, color_map={"Phishing": "red", "Safe": "green"}, visible=True if ml_confidence_list else False),
        output_gsb: gr.Label(value="Malicious" if gsb.get("malicious") else "Clean", color="red" if gsb.get("malicious") else "green"),
        output_urlhaus: gr.Label(value="Malicious" if uh.get("malicious") else "Clean", color="red" if uh.get("malicious") else "green"),
        output_virustotal: gr.Label(value="Malicious" if vt.get("malicious") else "Clean", color="red" if vt.get("malicious") else "green"),
        output_whois: gr.JSON(value=whois_info)
    }


# --- Gradio Interface ---

css = """
body { background: linear-gradient(135deg, #1f2937, #111827); color: white; }
.gradio-container { max-width: 960px !important; margin: auto !important; }
footer { display: none !important; }
.verdict-box {
    text-align: center;
    font-size: 2.2rem !important;
    font-weight: bold;
    padding: 20px;
    border-radius: 12px;
    border-width: 2px;
    transition: all 0.3s ease-in-out;
}
#url-input input {
    font-size: 1.1rem;
    padding: 12px;
}
.gradio-tabs { background-color: #1f2937; border-radius: 8px; }
.gradio-accordion { background-color: #374151; }
.gradio-label { color: #d1d5db !important; }
"""

with gr.Blocks(theme=gr.themes.Monochrome(primary_hue="indigo", secondary_hue="blue", neutral_hue="slate"), css=css, title="Phishing Detection Engine") as demo:
    
    # Header
    gr.HTML("""
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 3rem; font-weight: 800; background-image: linear-gradient(to right, #6366f1, #a855f7); -webkit-background-clip: text; color: transparent;">
                Phishing Detection Engine
            </h1>
            <p style="color: #9ca3af; font-size: 1.2rem;">Hybrid analysis using ML and real-time threat intelligence.</p>
        </div>
    """)

    # Input Section
    with gr.Row():
        url_input = gr.Textbox(
            elem_id="url-input",
            label="URL to Analyze",
            placeholder="e.g., google.com or a suspicious link",
            scale=4
        )
        submit_button = gr.Button("Analyze 🛡️", variant="primary", scale=1)

    # Verdict Box (initially hidden)
    output_verdict_box = gr.Textbox(label="Verdict", visible=False, interactive=False)

    # Output Tabs (initially hidden)
    with gr.Tabs(visible=False) as output_tabs:
        with gr.TabItem("📊 Summary"):
            with gr.Row():
                with gr.Column():
                     gr.Markdown("### Analyzed URL")
                     output_url = gr.Textbox(interactive=False)
                with gr.Column():
                     gr.Markdown("### Verdict Reason")
                     output_reason = gr.Textbox(interactive=False)
            
            gr.Markdown("### 🧠 Machine Learning Confidence",)
            output_ml_confidence = gr.HighlightedText(
                label="Model Confidence",
                color_map={"Phishing": "red", "Safe": "green"},
                visible=False
            )

        with gr.TabItem("🔍 Threat Intelligence"):
             gr.Markdown("### Real-time Database Checks")
             with gr.Row():
                output_gsb = gr.Label(label="Google Safe Browsing")
                output_urlhaus = gr.Label(label="URLHaus")
                output_virustotal = gr.Label(label="VirusTotal")

        with gr.TabItem("📜 WHOIS Info"):
            gr.Markdown("### Domain Registration Details")
            output_whois = gr.JSON(label="WHOIS Lookup")

    gr.Examples(
        ["google.com", "github.com", "bankofamerica-secure.com", "http://123.45.67.89/login"],
        inputs=url_input
    )

    # Button click event handler
    submit_button.click(
        fn=analyze_url,
        inputs=url_input,
        outputs=[
            output_verdict_box, output_tabs, output_url, output_reason,
            output_ml_confidence, output_gsb, output_urlhaus,
            output_virustotal, output_whois
        ]
    )

if __name__ == "__main__":
    demo.launch(debug=True)

