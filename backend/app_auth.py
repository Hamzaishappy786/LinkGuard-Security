# app_auth.py
from flask import Flask, request, jsonify, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt
import datetime
import os
from models import db, User, UrlCheck, validate_email  # Import validate_email

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here'  # Change this in production
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///linkguard.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)
CORS(app)

# Create database tables
with app.app_context():
    db.create_all()

# JWT token required decorator
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
            current_user = User.query.get(data['user_id'])
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
    if not validate_email(data['email']):
        return jsonify({'message': 'Invalid email format. Please check for typos.'}), 400
    
    # Check if email already exists (email should be unique)
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists'}), 409
    
    # Create new user (username can be duplicate)
    new_user = User(
        username=data['username'],
        email=data['email']
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

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
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        
        return jsonify({
            'token': token,
            'user': user.to_dict()
        }), 200
    
    return jsonify({'message': 'Invalid username or password'}), 401

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

@app.route('/api/auth/url-checks', methods=['GET'])
@token_required
def get_user_url_checks(current_user):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    url_checks = UrlCheck.query.filter_by(user_id=current_user.id).order_by(
        UrlCheck.timestamp.desc()
    ).paginate(page=page, per_page=per_page)
    
    return jsonify({
        'url_checks': [check.to_dict() for check in url_checks.items],
        'total': url_checks.total,
        'pages': url_checks.pages,
        'current_page': page
    }), 200

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

# Import your existing predict endpoint and modify it to save to database
from app1 import predict_url  # Assuming your original predict function is in app1.py

@app.route('/api/predict', methods=['GET', 'POST'])
@token_required
def predict_url_authenticated(current_user):
    # Get the prediction result from your existing function
    result = predict_url()
    
    # Save the URL check to the database
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        url = data.get("url")
    else:
        url = request.args.get("url")
    
    if url:
        new_check = UrlCheck(
            user_id=current_user.id,
            url=url,
            result=result.get_json()
        )
        db.session.add(new_check)
        db.session.commit()
    
    return result

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)