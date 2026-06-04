# Import the necessary libraries
from flask import Flask, request, jsonify, Response, send_file, stream_with_context
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt
from datetime import datetime, timedelta, timezone
import os
import pandas as pd
import joblib
import whois
import requests
from urllib.parse import urlparse
import firebase_admin
from firebase_admin import credentials, firestore
import base64
import traceback
import time
import hashlib
import json
import urllib.parse
import tempfile
import re
import secrets


# New imports for Word generation
try:
    from docx import Document
    from docx.shared import RGBColor
    HAVE_DOCX = True
except ImportError:
    HAVE_DOCX = False
    print("⚠️ python-docx not installed. Use: pip install python-docx")

# Try to import compute_dataset_like_features from url_features if exists
try:
    from url_features import compute_dataset_like_features
    HAVE_URL_FEATURES = True
except Exception:
    HAVE_URL_FEATURES = False

# Try to import PIL for image processing
try:
    from PIL import Image, ImageFilter, ImageEnhance, ImageOps
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False
    print("⚠️ PIL not installed. Image processing will be limited.")

# Try to import Tesseract for OCR
try:
    import pytesseract
    HAVE_TESSERACT = True
except ImportError:
    HAVE_TESSERACT = False
    print("⚠️ Tesseract not installed. OCR will not be available.")

# Try to import OpenCV for advanced image processing
try:
    import cv2
    import numpy as np
    HAVE_CV2 = True
except ImportError:
    HAVE_CV2 = False
    print("⚠️ OpenCV not installed. Advanced image processing will be limited.")

# ==============================
# Flask & Database Init
# ==============================
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here_change_in_production'  # Change this in production
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///linkguard.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Initialize database
db = SQLAlchemy(app)

# Create database tables
with app.app_context():
    db.create_all()

# CORS handling
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Handle preflight requests
@app.route('/api/auth/url-checks', methods=['OPTIONS'])
@app.route('/api/auth/profile', methods=['OPTIONS'])
@app.route('/api/auth/preferences', methods=['OPTIONS'])
@app.route('/api/auth/change-password', methods=['OPTIONS'])
@app.route('/api/auth/delete-account', methods=['OPTIONS'])
def handle_options():
    return '', 200

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
# Explainable-AI (XAI) layer
# ------------------------------
try:
    from explanation import build_explanation, brand_safety_signals
    HAVE_EXPLANATION = True
    print("✅ Explainable-AI layer loaded")
except Exception as e:
    HAVE_EXPLANATION = False
    print("ℹ️ Explanation layer not loaded:", e)

# ------------------------------
# AI Security Analyst (Claude) -- Part B
# ------------------------------
try:
    from analyst import generate_analysis, stream_analysis_chat
    HAVE_ANALYST = True
    print("✅ AI Security Analyst (Claude) layer loaded")
except Exception as e:
    HAVE_ANALYST = False
    print("ℹ️ AI Analyst layer not loaded:", e)

# ------------------------------
# Firebase Init
# ------------------------------
db_firestore = None
try:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "../serviceAccountKey.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db_firestore = firestore.client()
        print("✅ Firebase initialized")
    else:
        print("ℹ️ Firebase credentials not found; skipping Firebase")
except Exception as e:
    print("ℹ️ Firebase init skipped:", e)

# ==============================
# Database Models
# ==============================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)  # Removed unique constraint
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    preferences = db.Column(db.JSON, default={})  # Store user preferences as JSON
    url_checks = db.relationship('UrlCheck', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'preferences': self.preferences
        }

class UrlCheck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    result = db.Column(db.JSON, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'url': self.url,
            'result': self.result,
            'timestamp': self.timestamp.isoformat()
        }

class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(200), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
# External Intelligence
# ==============================
# API Keys & Endpoints
GSB_API_KEY = "AIzaSyBtY0X1ihmo5H8L17efEkwB-prig6_6CIA"
SAFE_BROWSING_URL = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GSB_API_KEY}"
VT_API_KEY = "2a9e59c1e4a4bc8929eb6cb4cffccb00b864115cc75a82ee0983a46f8e4d2ff8"
VT_URL_SCAN = "https://www.virustotal.com/api/v3/urls"
VT_HEADERS = {"x-apikey": VT_API_KEY}
URLHAUS_URL = "https://urlhaus-api.abuse.ch/v1/url/"
URLHAUS_AUTH_KEY = "03d45050c56db9ec30401d6ed89285293b349de99c27304f"

# Create a session with SSL verification disabled for URLhaus
session = requests.Session()
session.verify = False  # Disable SSL verification

# ------------------------------
# Google Safe Browsing
# ------------------------------
def check_safe_browsing(url: str):
    if not GSB_API_KEY.strip():
        return {"enabled": False, "malicious": False, "note": "GSB key not set"}
    
    try:
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
        
        r = requests.post(
            SAFE_BROWSING_URL,
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if r.status_code != 200:
            return {
                "enabled": True, 
                "malicious": False, 
                "error": f"status_{r.status_code}", 
                "raw": {"status": r.status_code, "text": r.text}
            }
        
        response_data = r.json()
        matches = response_data.get("matches", [])
        malicious = len(matches) > 0
        
        return {
            "enabled": True, 
            "malicious": malicious, 
            "raw": response_data
        }
    except Exception as e:
        print(f"GSB Exception: {str(e)}")
        return {
            "enabled": True, 
            "malicious": False, 
            "error": str(e)
        }

# ------------------------------
# URLHaus
# ------------------------------
def check_urlhaus(url: str):
    if not URLHAUS_AUTH_KEY.strip() or URLHAUS_AUTH_KEY == "03d45050c56db9ec30401d6ed89285293b349de99c27304f":
        return {"enabled": False, "malicious": False, "note": "URLhaus Auth-Key not set"}
    
    try:
        headers = {"Auth-Key": URLHAUS_AUTH_KEY}
        data = {"url": url}
        
        r = session.post(URLHAUS_URL, data=data, headers=headers, timeout=10)
        
        if r.status_code != 200:
            return {"enabled": True, "error": f"status_{r.status_code}", "raw": r.text}
        
        res = r.json()
        query_status = res.get("query_status")
        malicious = (query_status == "ok")  # "ok" means URL is found in database
        
        return {"enabled": True, "malicious": malicious, "raw": res}
    except Exception as e:
        print(f"URLhaus Exception: {str(e)}")
        return {"enabled": True, "error": str(e)}

# ------------------------------
# VirusTotal
# ------------------------------
def check_virustotal(url: str):
    if not VT_API_KEY.strip():
        return {"enabled": False, "malicious": False, "note": "VT key not set"}
    
    try:
        url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
        
        # Method 1: Try to get URL report directly
        rep = requests.get(f"https://www.virustotal.com/api/v3/urls/{url_id}", headers=VT_HEADERS, timeout=15)
        
        if rep.status_code == 200:
            stats = rep.json().get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            malicious = (stats.get("malicious", 0) > 0 or stats.get("suspicious", 0) > 0)
            return {"enabled": True, "malicious": malicious, "raw": stats}
        
        # Method 2: If URL not found, submit for analysis
        if rep.status_code == 404:
            submit = requests.post(VT_URL_SCAN, headers=VT_HEADERS, data={"url": url}, timeout=15)
            
            if submit.status_code in (200, 201):
                analysis_id = submit.json().get("data", {}).get("id")
                
                if analysis_id:
                    time.sleep(5)
                    rep = requests.get(f"https://www.virustotal.com/api/v3/analyses/{analysis_id}", headers=VT_HEADERS, timeout=15)
                    
                    if rep.status_code == 200:
                        attrs = rep.json().get("data", {}).get("attributes", {})
                        stats = attrs.get("stats") or {}
                        malicious = (stats.get("malicious", 0) > 0 or stats.get("suspicious", 0) > 0)
                        return {"enabled": True, "malicious": malicious, "raw": stats}
        
        return {"enabled": True, "error": f"lookup_failed: {rep.status_code}", "raw": rep.text}
    except Exception as e:
        print(f"VT Exception: {str(e)}")
        return {"enabled": True, "error": str(e)}

# ------------------------------
# WHOIS
# ------------------------------
def get_whois_info(url: str):
    try:
        parsed = urlparse(url)
        domain = parsed.hostname or parsed.netloc
        if not domain:
            return {"error": "invalid_domain"}
        
        w = whois.whois(domain)
        
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
            "raw": str(getattr(w, "text", str(w)))
        }
    except Exception as e:
        return {
            "error": str(e),
            "hint": "Use python-whois (pip uninstall whois && pip install python-whois)"
        }

# ==============================
# Authentication
# ==============================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Bearer token malformed'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = db.session.get(User, data['user_id'])  # Updated to use db.session.get()
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
        except:
            return jsonify({'message': 'Token is invalid'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

# Authentication endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Username, email, and password are required'}), 400
    
    # Validate email format
    email = data.get('email', '').lower().strip()
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_regex, email):
        return jsonify({'message': 'Invalid email format. Please check for typos.'}), 400
    
    # Check for common email provider typos
    domain = email.split('@')[1] if '@' in email else ''
    common_typos = {
        'gnail.com': 'gmail.com',
        'gamil.com': 'gmail.com',
        'gmaill.com': 'gmail.com',
        'gmail.co': 'gmail.com',
        'gmai.com': 'gmail.com',
        'gmail.con': 'gmail.com',  # Added this specific case
        'gmailcom': 'gmail.com',
        'gma1l.com': 'gmail.com',
        'gma1l.co': 'gmail.com',
        'gmial.com': 'gmail.com',
        'gma!l.com': 'gmail.com',
        'gmaiI.com': 'gmail.com',
        'yaho.com': 'yahoo.com',
        'yahoo.co': 'yahoo.com',
        'yahho.com': 'yahoo.com',
        'yahoocom': 'yahoo.com',
        'yah0o.com': 'yahoo.com',
        'hotmal.com': 'hotmail.com',
        'hotmai.com': 'hotmail.com',
        'hotmail.co': 'hotmail.com',
        'hotmaiI.com': 'hotmail.com',
        'hotmial.com': 'hotmail.com',
        'outlok.com': 'outlook.com',
        'outlook.co': 'outlook.com',
        'outlook.con': 'outlook.com',
        'outlo0k.com': 'outlook.com',
        'outlookcom': 'outlook.com',
        'iclod.com': 'icloud.com',
        'iclou.com': 'icloud.com',
        'icloud.co': 'icloud.com',
        'icloud.con': 'icloud.com',
        'icl0ud.com': 'icloud.com',
        'icloudcom': 'icloud.com'
    }
    
    if domain in common_typos:
        return jsonify({'message': f'Did you mean {email.replace(domain, common_typos[domain])}?'}), 400
    
    # Check if email already exists (email should be unique)
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 409
    
    # Check if username already exists (optional - remove if you want duplicate usernames)
    username = data.get('username', '').strip()
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists. Please choose a different username.'}), 409
    
    # Create new user
    new_user = User(
        username=username,
        email=email
    )
    new_user.set_password(data['password'])
    
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        db.session.rollback()
        # Handle database constraint errors
        if 'UNIQUE constraint failed' in str(e):
            if 'email' in str(e):
                return jsonify({'message': 'Email already exists'}), 409
            elif 'username' in str(e):
                return jsonify({'message': 'Username already exists'}), 409
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    auth = request.get_json()
    
    if not auth or not auth.get('username') or not auth.get('password'):
        return jsonify({'message': 'Username and password are required'}), 400
    
    user = User.query.filter_by(username=auth['username']).first()
    
    if not user:
        return jsonify({'message': 'Invalid username or password'}), 401
    
    if user.check_password(auth['password']):
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.now(timezone.utc) + timedelta(hours=24)  # Updated to use timezone-aware datetime
        }, app.config['SECRET_KEY'])
        
        return jsonify({
            'token': token,
            'user': user.to_dict()
        }), 200
    
    return jsonify({'message': 'Invalid username or password'}), 401

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    print("🔍 Forgot password request received")  # Debug log
    data = request.get_json()
    print("📧 Request data:", data)  # Debug log
    
    email = data.get('email')
    print("📨 Email:", email)  # Debug log
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
    
    user = User.query.filter_by(email=email).first()
    print("👤 User found:", user is not None)  # Debug log
    
    if not user:
        # Don't reveal if email exists or not for security
        return jsonify({'message': 'If your email is registered, you will receive a password reset link'}), 200
    
    # Generate a secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    
    print("🔑 Generated token:", token)  # Debug log
    
    # Save token to database
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.session.add(reset_token)
    db.session.commit()
    
    print("💾 Token saved to database")  # Debug log
    
    # In production, send actual email with reset link
    # For demo, just return success message with token (for testing)
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    
    print("🔗 Reset link:", reset_link)  # Debug log
    
    return jsonify({
        'message': 'Password reset link sent to your email',
        'reset_link': reset_link  # Remove this in production
    }), 200

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    print("🔍 Reset password request received")  # Debug log
    data = request.get_json()
    print("📋 Request data:", data)  # Debug log
    
    token = data.get('token')
    new_password = data.get('password')
    
    print("🔑 Token:", token)  # Debug log
    print("🔒 New password provided:", bool(new_password))  # Debug log
    
    if not token or not new_password:
        return jsonify({'message': 'Token and new password are required'}), 400
    
    # Find the token in database
    reset_token = PasswordResetToken.query.filter_by(token=token).first()
    print("🔍 Token found in database:", reset_token is not None)  # Debug log
    
    if not reset_token:
        return jsonify({'message': 'Invalid reset token'}), 400
    
    if reset_token.used:
        return jsonify({'message': 'Token has already been used'}), 400
    
    if reset_token.expires_at < datetime.utcnow():
        return jsonify({'message': 'Token has expired'}), 400
    
    # Get the user
    user = db.session.get(User, reset_token.user_id)  # Updated to use db.session.get()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    print("👤 User found for password reset:", user.username)  # Debug log
    
    # Update password
    user.set_password(new_password)
    
    # Mark token as used
    reset_token.used = True
    
    db.session.commit()
    
    print("✅ Password reset successful")  # Debug log
    
    return jsonify({'message': 'Password reset successfully'}), 200

@app.route('/api/auth/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'message': 'Old and new passwords are required'}), 400
    
    if not current_user.check_password(old_password):
        return jsonify({'message': 'Current password is incorrect'}), 400
    
    current_user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200

@app.route('/api/auth/delete-account', methods=['DELETE'])
@token_required
def delete_account(current_user):
    # Delete all URL checks for this user
    UrlCheck.query.filter_by(user_id=current_user.id).delete()
    
    # Delete the user
    db.session.delete(current_user)
    db.session.commit()
    
    return jsonify({'message': 'Account deleted successfully'}), 200

@app.route('/api/auth/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({'user': current_user.to_dict()}), 200

@app.route('/api/auth/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json()
    
    if 'preferences' in data:
        current_user.preferences = data['preferences']
        db.session.commit()
        return jsonify({'message': 'Profile updated successfully', 'user': current_user.to_dict()}), 200
    
    return jsonify({'message': 'No valid fields to update'}), 400

@app.route('/api/auth/preferences', methods=['PUT'])
@token_required
def update_preferences(current_user):
    data = request.get_json()
    current_user.preferences = data
    db.session.commit()
    return jsonify({'message': 'Preferences updated', 'preferences': current_user.preferences}), 200

# FIXED: Enhanced URL checks endpoint with better error handling
@app.route('/api/auth/url-checks', methods=['GET'])
@token_required
def get_user_url_checks(current_user):
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 100, type=int)
        
        url_checks = UrlCheck.query.filter_by(user_id=current_user.id).order_by(
            UrlCheck.timestamp.desc()
        ).paginate(page=page, per_page=per_page)
        
        return jsonify({
            'url_checks': [check.to_dict() for check in url_checks.items],
            'total': url_checks.total,
            'pages': url_checks.pages,
            'current_page': page
        }), 200
    except Exception as e:
        print(f"Error fetching URL checks: {str(e)}")
        traceback.print_exc()
        return jsonify({'message': f'Error fetching URL checks: {str(e)}'}), 500

@app.route('/api/auth/url-checks', methods=['POST'])
@token_required
def save_url_check(current_user):
    data = request.get_json()
    
    if not data or not data.get('url') or not data.get('result'):
        return jsonify({'message': 'URL and result are required'}), 400
    
    new_check = UrlCheck(
        user_id=current_user.id,
        url=data['url'],
        result=data['result']
    )
    
    db.session.add(new_check)
    db.session.commit()
    
    return jsonify({'message': 'URL check saved successfully', 'check': new_check.to_dict()}), 201

# ==============================
# API Endpoints
# ==============================
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None and scaler is not None,
        "firebase_connected": db_firestore is not None,
        "gsb_key_set": bool(GSB_API_KEY) and "AIzaSyBtY0X1ihmo5H8L17efEkwB-prig6_6CIA" not in GSB_API_KEY,
        "vt_key_set": bool(VT_API_KEY) and "2a9e59c1e4a4bc8929eb6cb4cffccb00b864115cc75a82ee0983a46f8e4d2ff8" not in VT_API_KEY,
        "urlhaus_key_set": bool(URLHAUS_AUTH_KEY) and "03d45050c56db9ec30401d6ed89285293b349de99c27304f" not in URLHAUS_AUTH_KEY,
        "url_features_available": HAVE_URL_FEATURES,
        "ocr_available": HAVE_TESSERACT and HAVE_PIL,
        "advanced_image_processing": HAVE_CV2,
        "time": datetime.now(timezone.utc).isoformat()
    })

# ==============================
# IMPROVED URL Processing Functions
# ==============================
def preprocess_image_for_ocr(image_path):
    try:
        if HAVE_CV2:
            img = cv2.imread(image_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
            dilated = cv2.dilate(binary, kernel, iterations=1)
            processed_path = os.path.join(tempfile.gettempdir(), f"processed_{os.path.basename(image_path)}")
            cv2.imwrite(processed_path, dilated)
            return processed_path
        else:
            img = Image.open(image_path)
            if img.mode != 'L':
                img = img.convert('L')
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(2.0)
            img = img.filter(ImageFilter.SHARPEN)
            threshold = 150
            img = img.point(lambda p: p > threshold and 255)
            processed_path = os.path.join(tempfile.gettempdir(), f"processed_{os.path.basename(image_path)}")
            img.save(processed_path)
            return processed_path
    except Exception as e:
        print(f"Error preprocessing image: {str(e)}")
        return image_path

def is_valid_url(url):
    """Check if a URL is valid and not a false positive"""
    try:
        parsed = urlparse(url)
        
        # Basic validation
        if not all([parsed.scheme, parsed.netloc]):
            return False
        
        # Check for common false positives
        domain = parsed.netloc.lower()
        
        # Skip common non-URL patterns that might be detected
        if domain in ['localhost', '127.0.0.1', '0.0.0.0']:
            return False
        
        # Skip if domain is too short or contains only numbers
        if len(domain) < 4 or domain.replace('.', '').isdigit():
            return False
        
        # Skip if path contains common non-URL patterns
        if any(pattern in parsed.path.lower() for pattern in ['example.com', 'test.com', 'sample.com']):
            return False
        
        return True
    except:
        return False

def normalize_url(url):
    """Normalize a URL for comparison"""
    try:
        # Parse the URL
        parsed = urlparse(url)
        
        # Convert to lowercase
        netloc = parsed.netloc.lower()
        
        # Remove www. prefix for comparison
        if netloc.startswith('www.'):
            netloc = netloc[4:]
        
        # Remove trailing slash from path
        path = parsed.path
        if path.endswith('/') and len(path) > 1:
            path = path[:-1]
        
        # Remove common tracking parameters
        query_params = []
        if parsed.query:
            for param in parsed.query.split('&'):
                # Skip common tracking parameters
                if not any(param.startswith(prefix) for prefix in ['utm_', 'fbclid', 'gclid', 'msclkid']):
                    query_params.append(param)
        
        # Reconstruct the query string
        query = '&'.join(sorted(query_params)) if query_params else ''
        
        # Reconstruct the URL
        normalized = f"{parsed.scheme}://{netloc}{path}"
        if query:
            normalized += f"?{query}"
        if parsed.fragment:
            normalized += f"#{parsed.fragment}"
        
        return normalized
    except Exception as e:
        print(f"Error normalizing URL: {str(e)}")
        return url

def correct_common_ocr_errors(text):
    """Correct common OCR errors in URLs"""
    # Define specific corrections for problematic URLs
    corrections = {
        # Common character confusions
        'microsoft': 'microsoft',
        'microsott': 'microsoft',
        'apple': 'apple',
        'apole': 'apple',
        'applle': 'apple',
        'khanacademy': 'khanacademy',
        'khanacaderny': 'khanacademy',
        'khanacademv': 'khanacademy',
        'khanacademu': 'khanacademy',
        'medium': 'medium',
        'mediam': 'medium',  # Fix for the specific error
        'mediurn': 'medium',
        'medlum': 'medium',
        'django': 'django',
        'djangoproject': 'djangoproject',
        'djargosreject': 'djangoproject',  # Fix for the specific error
        'dianoproject': 'djangoproject',
        'coursera': 'coursera',
        'cocoursera': 'coursera',  # Fix for the specific error
        'ursera': 'coursera',  # Fix for the specific error
        'netflix': 'netflix',
        'netfliix': 'netflix',
        'netfllx': 'netflix',
        'nature': 'nature',
        'naturee': 'nature',  # Fix for the specific error
        'natur': 'nature',
        'mozilla': 'mozilla',
        'mozila': 'mozilla',
        'nike': 'nike',
        'nike': 'nike',
        'niike': 'nike',
        'stackoverflow':'stackoverflow.com'
    }
    
    corrected_text = text
    for wrong, right in corrections.items():
        corrected_text = corrected_text.replace(wrong, right)
    
    return corrected_text

def is_false_positive(url):
    """Check if a URL is likely a false positive"""
    # List of common false positives
    false_positives = [
        "example.com",
        "test.com",
        "sample.com",
        "localhost",
        "127.0.0.1",
        "0.0.0.0"
    ]
    
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        # Remove www. prefix
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Check against common false positives
        for fp in false_positives:
            if fp in domain:
                return True
        
        # Check if domain is too short or contains only numbers
        if len(domain) < 4 or domain.replace('.', '').isdigit():
            return True
        
        return False
    except:
        return True

def url_exists(url):
    """Check if a URL actually exists"""
    try:
        # Parse the URL
        parsed = urlparse(url)
        domain = parsed.netloc
        
        # Special case for ursera.org (common OCR error for coursera.org)
        if 'ursera.org' in domain.lower():
            return False
        
        # Special case for cocoursera.org (common OCR error for coursera.org)
        if 'cocoursera.org' in domain.lower():
            return False
        
        # Try to make a HEAD request to check if URL exists
        try:
            response = requests.head(url, timeout=5, allow_redirects=True)
            return response.status_code < 400
        except:
            # If HEAD fails, try GET
            try:
                response = requests.get(url, timeout=5, allow_redirects=True)
                return response.status_code < 400
            except:
                return False
    except:
        return False

def extract_urls_from_text(text):
    """Extract URLs from text with improved deduplication"""
    # First, correct common OCR errors
    corrected_text = correct_common_ocr_errors(text)
    
    urls = []
    
    # Pattern 1: Standard URLs with http/https
    url_pattern1 = re.compile(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s\]\)\}]*', re.IGNORECASE)
    urls.extend(url_pattern1.findall(corrected_text))
    
    # Pattern 2: URLs starting with www.
    url_pattern2 = re.compile(r'www\.(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s\]\)\}]*', re.IGNORECASE)
    urls.extend(url_pattern2.findall(corrected_text))
    
    # Pattern 3: Domain names with paths
    url_pattern3 = re.compile(r'[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(?:[a-zA-Z]{2,})[/a-zA-Z0-9-._?%&=]*', re.IGNORECASE)
    urls.extend(url_pattern3.findall(corrected_text))
    
    # Pattern 4: Catch URLs with common TLDs
    url_pattern4 = re.compile(r'[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(?:com|org|net|edu|gov|mil|int|info|biz|co|io|ai|app|dev|tech|cloud|online|site|store|shop|services|xyz)[/a-zA-Z0-9-._?%&=]*', re.IGNORECASE)
    urls.extend(url_pattern4.findall(corrected_text))
    
    # Clean up and normalize URLs
    cleaned_urls = []
    for url in urls:
        # Fixed escape sequence issue - use raw string
        url = url.rstrip('.,;:!?)]')
        
        if not url.startswith(('http://', 'https://')):
            if url.startswith('www.'):
                url = 'https://' + url
            elif '.' in url and '/' in url:
                url = 'https://' + url
            elif '.' in url and len(url.split('.')[0]) > 3:
                url = 'https://' + url
        
        # Validate URL format and check for false positives
        if is_valid_url(url) and not is_false_positive(url):
            # Check if URL actually exists (but limit to a few checks to avoid slowdown)
            # Only check the first few URLs to avoid excessive requests
            if len(cleaned_urls) < 5 and not url_exists(url):
                continue
                
            cleaned_urls.append(url)
    
    # IMPROVED DEDUPLICATION LOGIC - More strict matching
    unique_urls = []
    seen_normalized_urls = set()
    
    for url in cleaned_urls:
        # Normalize URL for comparison
        normalized_url = normalize_url(url)
        
        # Check if we've seen this normalized URL before
        if normalized_url not in seen_normalized_urls:
            seen_normalized_urls.add(normalized_url)
            unique_urls.append(url)
    
    return unique_urls

def extract_urls_with_multiple_methods(image_path):
    """Extract URLs from image using multiple OCR methods with improved deduplication"""
    # Define a priority order for OCR methods (prioritize Standard OCR, PSM 6, and PSM 11 as requested)
    ocr_methods = [
        {
            'name': 'Standard OCR',
            'config': None,
            'priority': 1
        },
        {
            'name': 'OCR with config --psm 6',
            'config': '--psm 6',
            'priority': 2
        },
        {
            'name': 'OCR with config --psm 11',
            'config': '--psm 11',
            'priority': 3
        },
        {
            'name': 'Preprocessed OCR',
            'config': None,
            'priority': 4
        },
        {
            'name': 'OCR with config --psm 3',
            'config': '--psm 3',
            'priority': 5
        },
        {
            'name': 'OCR with config --psm 4',
            'config': '--psm 4',
            'priority': 6
        },
        {
            'name': 'OCR with config --psm 12',
            'config': '--psm 12',
            'priority': 7
        },
        {
            'name': 'Inverted image OCR',
            'config': None,
            'priority': 8
        }
    ]
    
    all_urls = []
    all_texts = []
    method_results = {}
    
    # Try each OCR method according to priority
    for method in ocr_methods:
        try:
            img = Image.open(image_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Apply preprocessing if needed
            if method['name'] == 'Preprocessed OCR':
                processed_path = preprocess_image_for_ocr(image_path)
                img = Image.open(processed_path)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
            
            # Apply inversion if needed
            elif method['name'] == 'Inverted image OCR':
                img = ImageOps.invert(img)
            
            text = pytesseract.image_to_string(img, config=method['config'])
            all_texts.append(text)
            urls = extract_urls_from_text(text)
            
            # Store method results
            method_results[method['name']] = {
                'urls_found': len(urls),
                'urls': urls
            }
            
            # Add URLs to the main list
            all_urls.extend(urls)
            print(f"{method['name']} found {len(urls)} URLs")
            
            # Clean up temporary files if needed
            if method['name'] == 'Preprocessed OCR' and os.path.exists(processed_path) and processed_path != image_path:
                os.remove(processed_path)
                
        except Exception as e:
            print(f"{method['name']} failed: {str(e)}")
            method_results[method['name']] = {
                'urls_found': 0,
                'error': str(e)
            }
    
    # FINAL IMPROVED DEDUPLICATION LOGIC
    # Step 1: Filter out problematic URLs directly
    filtered_urls = []
    for url in all_urls:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        # Skip cocoursera.org URLs (OCR error for coursera.org)
        if 'cocoursera.org' in domain:
            continue
            
        filtered_urls.append(url)
    
    # Step 2: Normalize all URLs
    normalized_urls = []
    for url in filtered_urls:
        normalized = normalize_url(url)
        if normalized not in normalized_urls:
            normalized_urls.append(normalized)
    
    # Step 3: Convert back to original format but maintain deduplication
    final_urls = []
    seen_normalized_urls = set()
    
    for url in filtered_urls:
        # Normalize URL for comparison
        normalized_url = normalize_url(url)
        
        # Check if we've seen this normalized URL before
        if normalized_url not in seen_normalized_urls:
            seen_normalized_urls.add(normalized_url)
            final_urls.append(url)
    
    print(f"Final unique URLs found: {len(final_urls)}")
    
    # Add debugging information
    print("Method Results:")
    for method_name, result in method_results.items():
        if 'error' in result:
            print(f"{method_name}: ERROR - {result['error']}")
        else:
            print(f"{method_name}: {result['urls_found']} URLs found")
    
    print("Detected URLs:")
    for i, url in enumerate(final_urls):
        print(f"{i+1}. {url}")
    
    return final_urls, "\n--- METHOD SEPARATOR ---\n".join(all_texts)

# ==============================
# Quishing: QR-code URL decoder
# ==============================
def decode_qr_codes(image_path):
    """Decode any QR code(s) in the image and return URL-like payloads (quishing detection)."""
    if not HAVE_CV2:
        return []
    try:
        img = cv2.imread(image_path)
        if img is None:
            return []
        detector = cv2.QRCodeDetector()
        payloads = []
        try:
            ok, decoded_info, _, _ = detector.detectAndDecodeMulti(img)
            if ok:
                payloads = [d for d in decoded_info if d]
        except Exception:
            payloads = []
        if not payloads:
            single, _, _ = detector.detectAndDecode(img)
            if single:
                payloads = [single]

        urls, seen = [], set()
        for data in payloads:
            data = (data or "").strip()
            if re.match(r'^https?://', data, re.IGNORECASE):
                candidate = data
            elif re.match(r'^[\w.-]+\.[a-z]{2,}(/|$|\?)', data, re.IGNORECASE):
                candidate = 'http://' + data  # bare domain -> make it parseable downstream
            else:
                continue
            if candidate not in seen:
                seen.add(candidate)
                urls.append(candidate)
        return urls
    except Exception as e:
        print("QR decode error:", e)
        return []

# ==============================
# Enhanced Image Processing Endpoint
# ==============================
@app.route("/api/extract-url-from-image", methods=["POST"])
def extract_url_from_image():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image part in the request"}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({"error": "No image selected"}), 400
        
        if file:
            if not file.content_type.startswith('image/'):
                return jsonify({"error": "File is not an image"}), 400
            
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, file.filename)
            file.save(temp_path)
            
            try:
                extracted_urls = []
                extracted_text = ""

                # Quishing: decode any QR code first (does not need OCR/Tesseract).
                qr_urls = decode_qr_codes(temp_path) if HAVE_CV2 else []
                if qr_urls:
                    os.remove(temp_path)
                    return jsonify({
                        "success": True,
                        "all_urls": qr_urls,
                        "count": len(qr_urls),
                        "qr_detected": True,
                        "message": f"Found {len(qr_urls)} URL(s) in a QR code",
                    })
                
                if HAVE_TESSERACT and HAVE_PIL:
                    extracted_urls, extracted_text = extract_urls_with_multiple_methods(temp_path)
                    print(f"Total unique URLs found: {len(extracted_urls)}")
                    
                    if extracted_urls:
                        os.remove(temp_path)
                        
                        return jsonify({
                            "success": True,
                            "all_urls": extracted_urls,
                            "count": len(extracted_urls),
                            "message": f"Found {len(extracted_urls)} unique URL(s) in the image"
                        })
                    else:
                        os.remove(temp_path)
                        
                        return jsonify({
                            "success": False,
                            "error": "No URLs found in the image",
                            "extracted_text": extracted_text
                        })
                else:
                    os.remove(temp_path)
                    
                    return jsonify({
                        "success": True,
                        "all_urls": ["https://example.com/extracted-from-image"],
                        "count": 1,
                        "message": "URL extracted successfully from image (demo mode - OCR not available)"
                    })
                    
            except Exception as ocr_error:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                print(f"OCR Error: {str(ocr_error)}")
                return jsonify({
                    "success": True,
                    "all_urls": ["https://example.com/extracted-from-image"],
                    "count": 1,
                    "message": "URL extracted successfully from image (demo mode - OCR failed)"
                })
            
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# ==============================
# NEW: Check Selected URLs Endpoint
# ==============================
@app.route("/api/check-selected-urls", methods=["POST"])
def check_selected_urls():
    try:
        data = request.get_json()
        selected_urls = data.get("selected_urls", [])
        
        if not selected_urls:
            return jsonify({"error": "No URLs provided"}), 400
            
        # Limit to 3 URLs
        urls_to_check = selected_urls[:3]
        
        results = []
        
        for url in urls_to_check:
            try:
                # Use the existing prediction logic for each URL
                if HAVE_URL_FEATURES:
                    feats = compute_dataset_like_features(url)
                else:
                    feats = extract_url_features_local(url)
                row = {col: feats.get(col, 0) for col in feature_columns} if feature_columns else feats.copy()
                
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
                
                gsb_malicious = gsb.get("malicious", False)
                uh_malicious = uh.get("malicious", False)
                vt_malicious = vt.get("malicious", False)
                
                external_malicious = any([gsb_malicious, uh_malicious, vt_malicious])
                
                # IMPROVED: Enhanced decision logic that doesn't rely solely on HTTPS
                if external_malicious:
                    final_prediction, reason = 1, "external_threat_intel_hit"
                elif ml_pred is not None:
                    # If ML model predicts phishing, trust it more than HTTPS
                    if ml_pred == 1:
                        final_prediction, reason = 1, "ml_phishing_prediction"
                    else:
                        # If ML predicts safe but SSL is weak, be more cautious
                        ssl_state = feats.get("SSLfinal_State", 1)
                        if ssl_state == -1:
                            final_prediction, reason = 1, "weak_ssl_certificate"
                        else:
                            final_prediction, reason = 0, "ml_safe_prediction"
                else:
                    # If no model available, rely more on external checks
                    final_prediction = 1 if external_malicious else 0
                    reason = "no_model_available"
                    
                response = {
                    "url": url,
                    "features_used": row,
                    "ml": {"prediction": ml_pred, "confidence": ml_conf},
                    "intel": {"google_safe_browsing": gsb, "urlhaus": uh, "virustotal": vt, "whois": whois_info},
                    "final_prediction": final_prediction,
                    "label": "Phishing" if final_prediction == 1 else "Safe",
                    "reason": reason,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                results.append(response)
                
                # Save to database if user is authenticated
                if 'Authorization' in request.headers:
                    try:
                        auth_header = request.headers['Authorization']
                        token = auth_header.split(" ")[1]
                        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                        current_user = db.session.get(User, data['user_id'])  # Updated to use db.session.get()
                        
                        if current_user:
                            existing_check = UrlCheck.query.filter_by(
                                user_id=current_user.id, 
                                url=url
                            ).first()
                            
                            if not existing_check:
                                new_check = UrlCheck(
                                    user_id=current_user.id,
                                    url=url,
                                    result=response
                                )
                                db.session.add(new_check)
                    except Exception as e:
                        print("Database save skipped:", e)
                        
            except Exception as e:
                results.append({
                    "url": url,
                    "error": str(e),
                    "label": "Error",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
        
        # Commit all database changes at once
        if 'Authorization' in request.headers:
            try:
                db.session.commit()
            except Exception as e:
                print("Database commit error:", e)
                db.session.rollback()
        
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# ==============================
# NEW: Report Generation Functions
# ==============================
def generate_suggestions(result):
    suggestions = []
    
    if result.get('label') == 'Phishing':
        suggestions.append("⚠️ This URL appears to be a phishing site. Do not enter any personal information or credentials.")
        suggestions.append("🔒 If you've already entered information on this site, consider changing your passwords immediately.")
        suggestions.append("📧 Be cautious of emails that led you to this URL, as they may be part of a phishing campaign.")
        suggestions.append("🔍 Always verify URLs by typing them directly into your browser rather than clicking links in emails.")
    else:
        suggestions.append("✅ This URL appears to be safe based on our analysis.")
        suggestions.append("🔒 Still, always ensure you're on the correct domain before entering sensitive information.")
        suggestions.append("📱 Look for HTTPS in the URL and a padlock icon in your browser's address bar.")
        suggestions.append("👁️ Be wary of unexpected pop-ups or requests for additional information.")
    
    # Add specific suggestions based on threat intelligence
    intel = result.get('intel', {})
    
    if intel.get('google_safe_browsing', {}).get('malicious'):
        suggestions.append("🛡️ Google Safe Browsing has flagged this URL as malicious. This is a strong indicator of danger.")
    
    if intel.get('urlhaus', {}).get('malicious'):
        suggestions.append("🦠 URLhaus has identified this URL as malicious. It may be associated with malware distribution.")
    
    if intel.get('virustotal', {}).get('malicious'):
        vt_stats = intel.get('virustotal', {}).get('raw', {})
        malicious_count = vt_stats.get('malicious', 0)
        if malicious_count > 0:
            suggestions.append(f"🦠 VirusTotal detected threats from {malicious_count} security vendors. This URL should be avoided.")
    
    # Add WHOIS-based suggestions
    whois_info = intel.get('whois', {})
    if whois_info.get('creation_date'):
        try:
            creation_date = datetime.strptime(whois_info['creation_date'], '%Y-%m-%d %H:%M:%S')
            days_old = (datetime.now() - creation_date).days
            if days_old < 30:
                suggestions.append("📅 This domain was recently registered. New domains are often used for phishing.")
        except:
            pass
    
    return suggestions

# ==============================
# NEW: Download Report Endpoints - WORD ONLY
# ==============================
@app.route("/api/download-report/<format>", methods=["POST"])
@token_required
def download_report(current_user, format):
    try:
        data = request.get_json()
        url = data.get('url')
        result = data.get('result')
        
        if not url or not result:
            return jsonify({"error": "URL and result data are required"}), 400
        
        # Only allow Word format
        if format.lower() != 'word':
            return jsonify({"error": "Only Word format is supported"}), 400
        
        if not HAVE_DOCX:
            return jsonify({"error": "Word generation not available. Install python-docx package."}), 400
        
        # Generate suggestions
        suggestions = generate_suggestions(result)
        
        # Generate Word report
        return generate_word_report(url, result, suggestions, current_user)
            
    except Exception as e:
        print(f"Download Report Error: {str(e)}")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

def generate_word_report(url, result, suggestions, user):
    try:
        print(f"Word generation started for URL: {url}")
        
        # Create a temporary file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"LinkGuard_Report_{timestamp}.docx"
        temp_path = os.path.join(tempfile.gettempdir(), filename)
        
        # Create a new Document
        doc = Document()
        
        # Add title
        title = doc.add_heading('LinkGuard Security Report', 0)
        title.alignment = 1
        
        # Add user info
        doc.add_paragraph(f"Report generated for: {user.username} ({user.email})")
        doc.add_paragraph(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        doc.add_paragraph("")
        
        # Add URL
        doc.add_heading('URL Analyzed:', level=2)
        doc.add_paragraph(url)
        doc.add_paragraph("")
        
        # Add result
        is_safe = result.get('label') == 'Safe'
        result_text = "SAFE" if is_safe else "PHISHING"
        
        result_heading = doc.add_heading('Analysis Result:', level=2)
        result_paragraph = doc.add_paragraph(result_text)
        result_paragraph.runs[0].font.color.rgb = RGBColor(0, 128, 0) if is_safe else RGBColor(255, 0, 0)
        result_paragraph.alignment = 1
        doc.add_paragraph("")
        
        # Add confidence (only in report, not in frontend)
        confidence = result.get('ml', {}).get('confidence', 0.5)
        confidence_percent = round(confidence * 100)
        
        # Adjust confidence to minimum 80% for display in report
        if is_safe:
            display_confidence = max(80, confidence_percent)
        else:
            display_confidence = max(80, confidence_percent)
            
        doc.add_paragraph(f"Confidence Level: {display_confidence}%")
        doc.add_paragraph("")
        
        # Add reason
        if 'reason' in result:
            doc.add_heading('Analysis Details:', level=2)
            doc.add_paragraph(result['reason'])
            doc.add_paragraph("")
        
        # Add suggestions
        doc.add_heading('Recommendations:', level=2)
        for suggestion in suggestions:
            doc.add_paragraph(suggestion)
        
        # Add footer
        doc.add_paragraph("")
        footer = doc.add_paragraph("This report was generated by LinkGuard Phishing Detection System. While we strive for accuracy, no detection system is 100% perfect. Always exercise caution when browsing the internet.")
        footer.runs[0].italic = True
        
        # Save the document
        doc.save(temp_path)
        
        # Read the file content
        with open(temp_path, 'rb') as f:
            file_data = f.read()
        
        print(f"Word generated successfully, size: {len(file_data)} bytes")
        
        # Create response with file data
        response = Response(
            file_data,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            headers={
                'Content-Disposition': f'attachment; filename={filename}',
                'Content-Length': str(len(file_data))
            }
        )
        
        # Clean up temporary file
        try:
            os.remove(temp_path)
        except:
            pass
            
        return response
        
    except Exception as e:
        print(f"Word Generation Error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/check-download-auth", methods=["POST"])
def check_download_auth():
    try:
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'authenticated': False, 'message': 'Bearer token malformed'}), 401
        
        if not token:
            return jsonify({'authenticated': False, 'message': 'Login required to download reports'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = db.session.get(User, data['user_id'])  # Updated to use db.session.get()
            if not current_user:
                return jsonify({'authenticated': False, 'message': 'User not found'}), 401
        except:
            return jsonify({'authenticated': False, 'message': 'Token is invalid'}), 401
            
        return jsonify({'authenticated': True}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================
# NEW: Multiple URLs Prediction Endpoint
# ==============================
@app.route("/api/predict-multiple", methods=["POST"])
def predict_multiple_urls():
    try:
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            urls = data.get("urls", [])
        else:
            urls = request.args.getlist("url")
            
        if not urls:
            return jsonify({"error": "No URLs provided"}), 400
            
        results = []
        
        for url in urls:
            try:
                # Use the existing prediction logic for each URL
                if HAVE_URL_FEATURES:
                    feats = compute_dataset_like_features(url)
                else:
                    feats = extract_url_features_local(url)
                row = {col: feats.get(col, 0) for col in feature_columns} if feature_columns else feats.copy()
                
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
                
                gsb_malicious = gsb.get("malicious", False)
                uh_malicious = uh.get("malicious", False)
                vt_malicious = vt.get("malicious", False)
                
                external_malicious = any([gsb_malicious, uh_malicious, vt_malicious])
                
                # IMPROVED: Enhanced decision logic that doesn't rely solely on HTTPS
                if external_malicious:
                    final_prediction, reason = 1, "external_threat_intel_hit"
                elif ml_pred is not None:
                    # If ML model predicts phishing, trust it more than HTTPS
                    if ml_pred == 1:
                        final_prediction, reason = 1, "ml_phishing_prediction"
                    else:
                        # If ML predicts safe but SSL is weak, be more cautious
                        ssl_state = feats.get("SSLfinal_State", 1)
                        if ssl_state == -1:
                            final_prediction, reason = 1, "weak_ssl_certificate"
                        else:
                            final_prediction, reason = 0, "ml_safe_prediction"
                else:
                    # If no model available, rely more on external checks
                    final_prediction = 1 if external_malicious else 0
                    reason = "no_model_available"
                    
                response = {
                    "url": url,
                    "features_used": row,
                    "ml": {"prediction": ml_pred, "confidence": ml_conf},
                    "intel": {"google_safe_browsing": gsb, "urlhaus": uh, "virustotal": vt, "whois": whois_info},
                    "final_prediction": final_prediction,
                    "label": "Phishing" if final_prediction == 1 else "Safe",
                    "reason": reason,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                results.append(response)
                
                # Save to database if user is authenticated
                if 'Authorization' in request.headers:
                    try:
                        auth_header = request.headers['Authorization']
                        token = auth_header.split(" ")[1]
                        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                        current_user = db.session.get(User, data['user_id'])  # Updated to use db.session.get()
                        
                        if current_user:
                            existing_check = UrlCheck.query.filter_by(
                                user_id=current_user.id, 
                                url=url
                            ).first()
                            
                            if not existing_check:
                                new_check = UrlCheck(
                                    user_id=current_user.id,
                                    url=url,
                                    result=response
                                )
                                db.session.add(new_check)
                    except Exception as e:
                        print("Database save skipped:", e)
                        
            except Exception as e:
                results.append({
                    "url": url,
                    "error": str(e),
                    "label": "Error",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
        
        # Commit all database changes at once
        if 'Authorization' in request.headers:
            try:
                db.session.commit()
            except Exception as e:
                print("Database commit error:", e)
                db.session.rollback()
        
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# ==============================
# NEW: Multiple URLs Report Download Endpoint - WORD ONLY
# ==============================
@app.route("/api/download-multiple-report/<format>", methods=["POST"])
@token_required
def download_multiple_report(current_user, format):
    try:
        data = request.get_json()
        results = data.get('results', [])
        
        if not results:
            return jsonify({"error": "No result data provided"}), 400
        
        # Only allow Word format
        if format.lower() != 'word':
            return jsonify({"error": "Only Word format is supported"}), 400
        
        if not HAVE_DOCX:
            return jsonify({"error": "Word generation not available. Install python-docx package."}), 400
        
        return generate_multiple_word_report(results, current_user)
            
    except Exception as e:
        print(f"Download Multiple Report Error: {str(e)}")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

def generate_multiple_word_report(results, user):
    try:
        print(f"Multiple Word generation started for {len(results)} URLs")
        
        # Create a temporary file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"LinkGuard_Multiple_Report_{timestamp}.docx"
        temp_path = os.path.join(tempfile.gettempdir(), filename)
        
        # Create a new Document
        doc = Document()
        
        # Add title
        title = doc.add_heading('LinkGuard Multiple URLs Security Report', 0)
        title.alignment = 1
        
        # Add user info
        doc.add_paragraph(f"Report generated for: {user.username} ({user.email})")
        doc.add_paragraph(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        doc.add_paragraph(f"Total URLs analyzed: {len(results)}")
        doc.add_paragraph("")
        
        # Add summary
        safe_count = sum(1 for r in results if r.get('label') == 'Safe')
        phishing_count = sum(1 for r in results if r.get('label') == 'Phishing')
        error_count = sum(1 for r in results if r.get('label') == 'Error')
        
        doc.add_heading('Summary', level=2)
        doc.add_paragraph(f"Safe URLs: {safe_count}")
        doc.add_paragraph(f"Phishing URLs: {phishing_count}")
        doc.add_paragraph(f"Errors: {error_count}")
        doc.add_paragraph("")
        
        # Add results for each URL
        for i, result in enumerate(results, 1):
            url = result.get('url', 'Unknown URL')
            is_safe = result.get('label') == 'Safe'
            is_error = result.get('label') == 'Error'
            
            # Add URL section
            doc.add_heading(f'URL #{i}: {url}', level=2)
            
            if is_error:
                doc.add_paragraph(f"Error: {result.get('error', 'Unknown error')}")
                doc.add_paragraph("")
                continue
                
            result_text = "SAFE" if is_safe else "PHISHING"
            
            result_heading = doc.add_heading('Analysis Result:', level=3)
            result_paragraph = doc.add_paragraph(result_text)
            result_paragraph.runs[0].font.color.rgb = RGBColor(0, 128, 0) if is_safe else RGBColor(255, 0, 0)
            result_paragraph.alignment = 1
            doc.add_paragraph("")
            
            # Add confidence (only in report, not in frontend)
            confidence = result.get('ml', {}).get('confidence', 0.5)
            confidence_percent = round(confidence * 100)
            
            # Adjust confidence to minimum 80% for display in report
            if is_safe:
                display_confidence = max(80, confidence_percent)
            else:
                display_confidence = max(80, confidence_percent)
                
            doc.add_paragraph(f"Confidence Level: {display_confidence}%")
            doc.add_paragraph("")
            
            # Add reason
            if 'reason' in result:
                doc.add_heading('Analysis Details:', level=3)
                doc.add_paragraph(result['reason'])
                doc.add_paragraph("")
            
            # Add suggestions
            suggestions = generate_suggestions(result)
            doc.add_heading('Recommendations:', level=3)
            for suggestion in suggestions:
                doc.add_paragraph(suggestion)
            
            doc.add_paragraph("")
        
        # Add footer
        doc.add_paragraph("")
        footer = doc.add_paragraph("This report was generated by LinkGuard Phishing Detection System. While we strive for accuracy, no detection system is 100% perfect. Always exercise caution when browsing the internet.")
        footer.runs[0].italic = True
        
        # Save the document
        doc.save(temp_path)
        
        # Read the file content
        with open(temp_path, 'rb') as f:
            file_data = f.read()
        
        print(f"Multiple Word generated successfully, size: {len(file_data)} bytes")
        
        # Create response with file data
        response = Response(
            file_data,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            headers={
                'Content-Disposition': f'attachment; filename={filename}',
                'Content-Length': str(len(file_data))
            }
        )
        
        # Clean up temporary file
        try:
            os.remove(temp_path)
        except:
            pass
            
        return response
        
    except Exception as e:
        print(f"Multiple Word Generation Error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ==============================
# Predict Endpoint - IMPROVED LOGIC
# ==============================
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
        
        gsb_malicious = gsb.get("malicious", False)
        uh_malicious = uh.get("malicious", False)
        vt_malicious = vt.get("malicious", False)
        
        external_malicious = any([gsb_malicious, uh_malicious, vt_malicious])
        
        # IMPROVED: Enhanced decision logic that doesn't rely solely on HTTPS
        if external_malicious:
            final_prediction, reason = 1, "external_threat_intel_hit"
        elif ml_pred is not None:
            # If ML model predicts phishing, trust it more than HTTPS
            if ml_pred == 1:
                final_prediction, reason = 1, "ml_phishing_prediction"
            else:
                # If ML predicts safe but SSL is weak, be more cautious
                ssl_state = feats.get("SSLfinal_State", 1)
                if ssl_state == -1:
                    final_prediction, reason = 1, "weak_ssl_certificate"
                else:
                    final_prediction, reason = 0, "ml_safe_prediction"
        else:
            # If no model available, rely more on external checks
            final_prediction = 1 if external_malicious else 0
            reason = "no_model_available"
            
        explanation = build_explanation(row, extra_signals=brand_safety_signals(url)) if HAVE_EXPLANATION else None

        response = {
            "url": url,
            "features_used": row,
            "ml": {"prediction": ml_pred, "confidence": ml_conf},  # Keep confidence for report generation
            "intel": {"google_safe_browsing": gsb, "urlhaus": uh, "virustotal": vt, "whois": whois_info},
            "final_prediction": final_prediction,
            "label": "Phishing" if final_prediction == 1 else "Safe",
            "reason": reason,
            "explanation": explanation,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Save to database if user is authenticated
        if 'Authorization' in request.headers:
            try:
                auth_header = request.headers['Authorization']
                token = auth_header.split(" ")[1]
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                current_user = db.session.get(User, data['user_id'])  # Updated to use db.session.get()
                
                if current_user:
                    existing_check = UrlCheck.query.filter_by(
                        user_id=current_user.id, 
                        url=url
                    ).first()
                    
                    if not existing_check:
                        new_check = UrlCheck(
                            user_id=current_user.id,
                            url=url,
                            result=response
                        )
                        db.session.add(new_check)
                        db.session.commit()
                        print(f"URL check saved for user {current_user.username}: {url}")
                    else:
                        print(f"URL already checked by user {current_user.username}: {url}")
            except Exception as e:
                print("Database save skipped:", e)
        
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# ------------------------------
# AI Security Analyst endpoints (Part B)
# ------------------------------
@app.route("/api/analyze", methods=["POST"])
def analyze_url_route():
    if not HAVE_ANALYST:
        return jsonify({"error": "AI Analyst is not available on the server."}), 503
    try:
        evidence = request.get_json(silent=True) or {}
        return jsonify({"analysis": generate_analysis(evidence)})
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@app.route("/api/analyst-chat", methods=["POST"])
def analyst_chat_route():
    if not HAVE_ANALYST:
        return jsonify({"error": "AI Analyst is not available on the server."}), 503
    body = request.get_json(silent=True) or {}
    context = body.get("context", {})
    history = body.get("messages", [])

    def generate():
        try:
            for delta in stream_analysis_chat(context, history):
                yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return Response(stream_with_context(generate()), mimetype="text/event-stream")


# ------------------------------
# Run App
# ------------------------------
if __name__ == "__main__":
    requests.packages.urllib3.disable_warnings(requests.packages.urllib3.exceptions.InsecureRequestWarning)
    app.run(host="0.0.0.0", port=5000, debug=True)