# models.py
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import re

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)  # Removed unique constraint
    email = db.Column(db.String(120), unique=True, nullable=False)  # Keep email unique
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

def validate_email(email):
    """Validate email format and check for common typos"""
    # Basic email format validation
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False
    
    # Check for common email provider typos
    domain = email.split('@')[1].lower()
    common_domains = {
        'gmail.com': ['gnail.com', 'gamil.com', 'gmaill.com', 'gmail.co', 'gmai.com'],
        'yahoo.com': ['yaho.com', 'yahoo.co', 'yahho.com'],
        'hotmail.com': ['hotmal.com', 'hotmai.com', 'hotmail.co'],
        'outlook.com': ['outlok.com', 'outlook.co', 'outlook.co'],
        'icloud.com': ['iclod.com', 'iclou.com', 'icloud.co']
    }
    
    for correct_domain, typos in common_domains.items():
        if domain in typos:
            return False
    
    return True