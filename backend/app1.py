from flask import Flask

# Flask app initialize karne ke baad ye line add karein
app = Flask(__name__)
#CORS(app)  # Ye line add karein
# app.py mein ye changes karein
# from flask_cors import CORS  # Ye line remove karein

# Flask app initialize karne ke baad ye function add karein
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response
from flask import Flask, request, jsonify
import os
import pandas as pd
import joblib
import whois  # ✅ python-whois package use karo
import requests
from urllib.parse import urlparse
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone  # ✅ updated
import base64
import traceback
import time
import hashlib
import json
import urllib.parse
# Try to import compute_dataset_like_features from url_features if exists
try:
    from url_features import compute_dataset_like_features
    HAVE_URL_FEATURES = True
except Exception:
    HAVE_URL_FEATURES = False
# ==============================
# Flask & Firebase Init
# ==============================
app = Flask(__name__)
# ------------------------------
# Load ML artifacts
# ------------------------------
MODEL_DIR = "models"
model, scaler, feature_columns = None, None, []
try:
    model_path = os.path.join(MODEL_DIR, "stacking_model.pkl")
    scaler_path = os.path.join(MODEL_DIR, "scaler.pkl")
    feat_path = os.path.join(MODEL_DIR, "feature_columns.pkl")
    if os.path.exists(model_path):
        model = joblib.load(model_path)
    if os.path.exists(scaler_path):
        scaler = joblib.load(scaler_path)
    if os.path.exists(feat_path):
        feature_columns = joblib.load(feat_path)
    if model:
        print("✅ Stacking model loaded successfully!")
    else:
        print("ℹ️ Model not loaded; ML predictions will be skipped.")
except Exception as e:
    print("❌ Error loading ML artifacts:", e)
    traceback.print_exc()
# ------------------------------
# Firebase Init
# ------------------------------
db = None
try:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "../serviceAccountKey.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase initialized")
    else:
        print("ℹ️ Firebase credentials not found; skipping Firebase")
except Exception as e:
    print("ℹ️ Firebase init skipped:", e)
# ------------------------------
# Fallback URL feature extractor
# ------------------------------
def extract_url_features_local(url: str) -> dict:
    try:
        parsed = urlparse(url)
        features = {}
        features['hostname_length'] = len(parsed.netloc) if parsed.netloc else 0
        features['count_dir'] = parsed.path.count('/') if parsed.path else 0
        features['count-www'] = url.lower().count('www')
        features['url_length'] = len(url)
        try:
            first_dir = parsed.path.split('/')[1]
            features['fd_length'] = len(first_dir)
        except:
            features['fd_length'] = 0
        features['count-'] = url.count('-')
        features['count.'] = url.count('.')
        try:
            tld = parsed.netloc.split('.')[-1]
            features['tld_length'] = len(tld)
        except:
            features['tld_length'] = 0
        features['count-digits'] = sum(c.isdigit() for c in url)
        features['count='] = url.count('=')
        return features
    except Exception:
        return {col: 0 for col in feature_columns}
# ==============================
# External Intelligence (FIXED)
# ==============================
# ==============================
# API Keys & Endpoints (fixed)
# ==============================
GSB_API_KEY = "AIzaSyADlsb9zKp3gJTIRFFC17DeHf7kV261cow"  # ✅ direct key use
SAFE_BROWSING_URL = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GSB_API_KEY}"
VT_API_KEY = "2a9e59c1e4a4bc8929eb6cb4cffccb00b864115cc75a82ee0983a46f8e4d2ff8"  # ✅ direct key use
VT_URL_SCAN = "https://www.virustotal.com/api/v3/urls"
VT_HEADERS = {"x-apikey": VT_API_KEY}
URLHAUS_URL = "https://urlhaus-api.abuse.ch/v1/url/"
URLHAUS_AUTH_KEY = "03d45050c56db9ec30401d6ed89285293b349de99c27304f"  # 🔑 Get this from https://auth.abuse.ch/

# Create a session with SSL verification disabled for URLhaus
session = requests.Session()
session.verify = False  # Disable SSL verification
# ------------------------------
# Google Safe Browsing (final version with better handling)
# ------------------------------
def check_safe_browsing(url: str):
    if not GSB_API_KEY.strip():
        return {"enabled": False, "malicious": False, "note": "GSB key not set"}
    
    try:
        # Create the request body exactly as shown in Google's documentation
        body = {
            "client": {
                "clientId": "phishing-detector",
                "clientVersion": "1.0"
            },
            "threatInfo": {
                "threatTypes": [
                    "MALWARE",
                    "SOCIAL_ENGINEERING",
                    "UNWANTED_SOFTWARE",
                    "POTENTIALLY_HARMFUL_APPLICATION"
                ],
                "platformTypes": [
                    "WINDOWS",
                    "LINUX",
                    "ANDROID",
                    "IOS",
                    "OSX",
                    "CHROME"
                ],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}]
            }
        }
        
        print(f"GSB Request Body: {json.dumps(body, indent=2)}")
        
        # Make the request with explicit headers
        headers = {
            "Content-Type": "application/json"
        }
        
        r = requests.post(
            SAFE_BROWSING_URL,
            json=body,
            headers=headers,
            timeout=10
        )
        
        print(f"GSB Response Status: {r.status_code}")
        print(f"GSB Response Headers: {dict(r.headers)}")
        print(f"GSB Response Text: {r.text}")
        
        if r.status_code != 200:
            return {
                "enabled": True, 
                "malicious": False, 
                "error": f"status_{r.status_code}", 
                "raw": {"status": r.status_code, "text": r.text}
            }
        
        # Parse the response
        response_data = r.json()
        print(f"GSB Response JSON: {json.dumps(response_data, indent=2)}")
        
        # Check if there are any matches
        matches = response_data.get("matches", [])
        malicious = len(matches) > 0
        
        print(f"GSB Malicious: {malicious}")
        
        # Add a note if the response is empty but successful
        if not malicious and not response_data:
            response_data["note"] = "API returned empty response - URL not found in database"
        
        return {
            "enabled": True, 
            "malicious": malicious, 
            "raw": response_data
        }
    except json.JSONDecodeError as e:
        print(f"GSB JSON Decode Error: {str(e)}")
        return {
            "enabled": True, 
            "malicious": False, 
            "error": f"json_decode_error: {str(e)}", 
            "raw": r.text if 'r' in locals() else "no response"
        }
    except Exception as e:
        print(f"GSB Exception: {str(e)}")
        return {
            "enabled": True, 
            "malicious": False, 
            "error": str(e)
        }
# ------------------------------
# URLHaus (fixed - disable SSL verification)
# ------------------------------
def check_urlhaus(url: str):
    if not URLHAUS_AUTH_KEY.strip() or URLHAUS_AUTH_KEY == "YOUR_URLHAUS_AUTH_KEY_HERE":
        return {"enabled": False, "malicious": False, "note": "URLhaus Auth-Key not set"}
    
    try:
        headers = {
            "Auth-Key": URLHAUS_AUTH_KEY
        }
        data = {
            "url": url
        }
        
        # Use the session with SSL verification disabled
        r = session.post(URLHAUS_URL, data=data, headers=headers, timeout=10)
        print(f"URLhaus Response Status: {r.status_code}")
        print(f"URLhaus Response Text: {r.text}")
        
        if r.status_code != 200:
            return {"enabled": True, "error": f"status_{r.status_code}", "raw": r.text}
        
        res = r.json()
        print(f"URLhaus Response JSON: {json.dumps(res, indent=2)}")
        
        # Fixed: Properly check if URL is malicious
        query_status = res.get("query_status")
        malicious = (query_status == "ok")  # "ok" means URL is found in database
        
        print(f"URLhaus Malicious: {malicious}")
        return {"enabled": True, "malicious": malicious, "raw": res}
    except Exception as e:
        print(f"URLhaus Exception: {str(e)}")
        return {"enabled": True, "error": str(e)}
# ------------------------------
# VirusTotal (fixed - improved implementation)
# ------------------------------
def check_virustotal(url: str):
    if not VT_API_KEY.strip():
        return {"enabled": False, "malicious": False, "note": "VT key not set"}
    
    try:
        # First, try to get existing analysis using URL ID
        url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
        print(f"VT URL ID: {url_id}")
        
        # Method 1: Try to get URL report directly
        rep = requests.get(f"https://www.virustotal.com/api/v3/urls/{url_id}", headers=VT_HEADERS, timeout=15)
        print(f"VT Response Status: {rep.status_code}")
        print(f"VT Response Text: {rep.text[:500]}...")  # Truncate for readability
        
        if rep.status_code == 200:
            stats = rep.json().get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            print(f"VT Stats: {json.dumps(stats, indent=2)}")
            
            # Fixed: Properly check if URL is malicious
            malicious = (stats.get("malicious", 0) > 0 or stats.get("suspicious", 0) > 0)
            print(f"VT Malicious: {malicious}")
            return {"enabled": True, "malicious": malicious, "raw": stats}
        
        # Method 2: If URL not found, submit for analysis
        if rep.status_code == 404:
            submit = requests.post(VT_URL_SCAN, headers=VT_HEADERS, data={"url": url}, timeout=15)
            print(f"VT Submit Status: {submit.status_code}")
            print(f"VT Submit Response: {submit.text[:500]}...")  # Truncate for readability
            
            if submit.status_code in (200, 201):
                analysis_id = submit.json().get("data", {}).get("id")
                print(f"VT Analysis ID: {analysis_id}")
                
                if analysis_id:
                    # Wait a bit for analysis to complete
                    time.sleep(5)
                    # Get analysis results
                    rep = requests.get(f"https://www.virustotal.com/api/v3/analyses/{analysis_id}", headers=VT_HEADERS, timeout=15)
                    print(f"VT Analysis Status: {rep.status_code}")
                    print(f"VT Analysis Response: {rep.text[:500]}...")  # Truncate for readability
                    
                    if rep.status_code == 200:
                        attrs = rep.json().get("data", {}).get("attributes", {})
                        stats = attrs.get("stats") or {}
                        print(f"VT Analysis Stats: {json.dumps(stats, indent=2)}")
                        
                        # Fixed: Properly check if URL is malicious
                        malicious = (stats.get("malicious", 0) > 0 or stats.get("suspicious", 0) > 0)
                        print(f"VT Analysis Malicious: {malicious}")
                        return {"enabled": True, "malicious": malicious, "raw": stats}
        
        return {"enabled": True, "error": f"lookup_failed: {rep.status_code}", "raw": rep.text}
    except Exception as e:
        print(f"VT Exception: {str(e)}")
        return {"enabled": True, "error": str(e)}
# ------------------------------
# WHOIS (unchanged - implementation is correct)
# ------------------------------
def get_whois_info(url: str):
    try:
        parsed = urlparse(url)
        domain = parsed.hostname or parsed.netloc
        if not domain:
            return {"error": "invalid_domain"}
        
        w = whois.whois(domain)  # ✅ python-whois
        
        creation = getattr(w, "creation_date", None)
        expiration = getattr(w, "expiration_date", None)
        def norm_date(d):
            if isinstance(d, list):
                return str(d[0])
            return str(d) if d else None
        return {
            "domain_name": domain,
            "registrar": getattr(w, "registrar", None),
            "creation_date": norm_date(creation),
            "expiration_date": norm_date(expiration),
            "country": getattr(w, "country", None),
            "is_registered": bool(getattr(w, "domain_name", False)),
            "raw": str(getattr(w, "text", str(w)))  # ✅ Raw WHOIS text
        }
    except Exception as e:
        return {
            "error": str(e),
            "hint": "Use python-whois (pip uninstall whois && pip install python-whois)"
        }
# ------------------------------
# Health endpoint
# ------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None and scaler is not None,
        "firebase_connected": db is not None,
        # Fixed: Check against placeholders, not actual keys
        "gsb_key_set": bool(GSB_API_KEY) and "YOUR_GSB_API_KEY_HERE" not in GSB_API_KEY,
        "vt_key_set": bool(VT_API_KEY) and "YOUR_VT_API_KEY_HERE" not in VT_API_KEY,
        "urlhaus_key_set": bool(URLHAUS_AUTH_KEY) and "YOUR_URLHAUS_AUTH_KEY_HERE" not in URLHAUS_AUTH_KEY,
        "url_features_available": HAVE_URL_FEATURES,
        "time": datetime.now(timezone.utc).isoformat()  # ✅ fixed
    })
# ------------------------------
# Predict endpoint (fixed - improved external threat detection logic)
# ------------------------------
@app.route("/api/predict", methods=["GET", "POST"])
def predict_url():
    try:
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            url = data.get("url")
        else:
            url = request.args.get("url")
        if not url:
            return jsonify({"error": "No URL provided"}), 400
        if HAVE_URL_FEATURES:
            feats = compute_dataset_like_features(url)
        else:
            feats = extract_url_features_local(url)
        row = {col: feats.get(col, 0) for col in feature_columns} if feature_columns else feats.copy()
        
        # Fixed: Create DataFrame with proper column names to avoid warning
        X = pd.DataFrame([row], columns=feature_columns if feature_columns else list(row.keys()))
        X_scaled, ml_pred, ml_conf = None, None, None
        if scaler is not None:
            try:
                X_scaled = scaler.transform(X)
            except Exception:
                try:
                    X_scaled = scaler.transform(X.values)
                except:
                    X_scaled = None
        if model is not None and X_scaled is not None:
            try:
                ml_pred = int(model.predict(X_scaled)[0])
                ml_conf = float(model.predict_proba(X_scaled)[0][1]) if hasattr(model, "predict_proba") else None
            except Exception:
                ml_pred, ml_conf = None, None
        gsb, uh, vt, whois_info = check_safe_browsing(url), check_urlhaus(url), check_virustotal(url), get_whois_info(url)
        
        # Fixed: Improved external threat detection logic
        gsb_malicious = gsb.get("malicious", False)
        uh_malicious = uh.get("malicious", False)
        vt_malicious = vt.get("malicious", False)
        
        # Debug logging
        print(f"GSB malicious: {gsb_malicious}")
        print(f"URLhaus malicious: {uh_malicious}")
        print(f"VirusTotal malicious: {vt_malicious}")
        
        external_malicious = any([gsb_malicious, uh_malicious, vt_malicious])
        
        if external_malicious:
            final_prediction, reason = 1, "external_threat_intel_hit"
        else:
            final_prediction = ml_pred if ml_pred is not None else 0
            reason = "ml_only" if ml_pred is not None else "no_model_loaded"
            
        response = {
            "url": url,
            "features_used": row,
            "ml": {"prediction": ml_pred, "confidence": ml_conf},
            "intel": {"google_safe_browsing": gsb, "urlhaus": uh, "virustotal": vt, "whois": whois_info},
            "final_prediction": final_prediction,
            "label": "Phishing" if final_prediction == 1 else "Safe",
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat()  # ✅ fixed
        }
        if db and request.headers.get("Authorization"):
            try:
                user_id = request.headers.get("Authorization").replace("Bearer ", "")
                db.collection("url_checks").add({
                    "user_id": user_id,
                    "url": url,
                    "final_prediction": final_prediction,
                    "ml_prediction": ml_pred,
                    "ml_confidence": ml_conf,
                    "gsb_flag": bool(gsb.get("malicious")),
                    "urlhaus_flag": bool(uh.get("malicious")),
                    "virustotal_flag": bool(vt.get("malicious")),
                    "created_at": datetime.now(timezone.utc)  # ✅ fixed
                })
            except Exception as e:
                print("Firebase write skipped:", e)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500
# ------------------------------
# Run App
# ------------------------------
if __name__ == "__main__":
    # Disable SSL warning messages
    requests.packages.urllib3.disable_warnings(requests.packages.urllib3.exceptions.InsecureRequestWarning)
    app.run(host="0.0.0.0", port=5000, debug=True)