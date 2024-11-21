from config import app
from email.mime.text import MIMEText
import smtplib
import re
from flask_restful import Resource
from flask import request
from models import User, UserRole
from config import app, db, api
import secrets
import os
from datetime import timedelta
from flask_jwt_extended import create_access_token

def validate_email(email):
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

def validate_password(password):
    # At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    return True

def send_email(recepient, subject, body):
    sender = os.getenv('EMAIL_USER')
    password = os.getenv('EMAIL_PASSWORD')

    if not sender or not password:
        raise ValueError("Email credentials not found in environment variables")

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = recepient

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as smtp:
            smtp.starttls()
            smtp.login(sender, password)
            smtp.send_message(msg)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise e


def send_verification_email(email, verification_code):
    subject = 'Roomsy - Verify your email address'
    body = f'''
    Welcome to Roomsy!
    
    Your verification code is: {verification_code}
    
    Please enter this code in the verification page to activate your account.
    This code will expire in 24 hours.
    
    Best regards,
    Roomsy Team
    '''
    send_email(email, subject, body)


class Register(Resource):
    def post(self):
        try:
            # Get data from request
            data = request.get_json()

            # Validate input fields
            if not data.get('email'):
                return {'error': 'Email is required'}, 400
            if not data.get('username'):
                return {'error': 'Username is required'}, 400
            if not data.get('password'):
                return {'error': 'Password is required'}, 400
            if not data.get('role'):
                data['role'] = UserRole.CLIENT  # Default role

            # Validate email and password
            if not validate_email(data['email']):
                return {'error': 'Invalid email address'}, 400
            if not validate_password(data['password']):
                return {'error': 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number'}, 400
            
            # Validate role
            if data['role'] not in UserRole._value2member_map_:
                return {'error': f"Invalid role. Must be one of {', '.join(UserRole._value2member_map_.keys())}"}, 400

            # Check for existing email or username
            if User.query.filter_by(email=data['email']).first():
                return {'error': 'Email address already exists'}, 409
            if User.query.filter_by(username=data['username']).first():
                return {'error': 'Username already exists'}, 409

            # Generate verification code
            verification_code = secrets.token_hex(3)

            # Create new user
            new_user = User(
                email=data['email'],
                username=data['username'],
                role=data['role'],
                verification_code=verification_code
            )
            new_user.password = data['password']  # Set password hash
            db.session.add(new_user)
            db.session.commit()

            # Send verification email
            try:
                send_verification_email(data['email'], verification_code)
            except Exception as e:
                db.session.rollback()  # Rollback user creation if email fails
                return {'error': f'Error sending verification email: {str(e)}'}, 500

            return {
                'message': 'Registration successful, check your email for a verification code',
                'user_id': new_user.id,
                'user_type': new_user.role.value
            }, 201

        except Exception as e:
            db.session.rollback()  # Rollback any uncommitted changes
            return {'error': f"An error occurred: {str(e)}"}, 500
        
class VerifyEmail(Resource):
    def post(self):
        try:
            data = request.get_json()
            
            if 'email' not in data or 'verification_code' not in data:
                return {'error': 'Email and verification code are required'}, 400
            
            user = User.query.filter_by(email=data['email']).first()
            if not user:
                return {'error': 'User not found'}, 404
            
            if user.verification_code != data['verification_code']:
                return {'error': 'Invalid verification code'}, 400
            
            user.verification_code = None
            db.session.commit()
            
            return {'message': 'Email verified successfully'}, 200
            
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
            

class ResendVerification(Resource):
    def post(self):
        try:
            data = request.get_json()
            
            if 'email' not in data:
                return {'error': 'Email is required'}, 400
            
            user = User.query.filter_by(email=data['email']).first()
            if not user:
                return {'error': 'User not found'}, 404
            
            if not user.verification_code:
                return {'error': 'Email already verified'}, 400
            
            verification_code = secrets.token_hex(3)
            user.verification_code = verification_code
            db.session.commit()
            
            try:
                send_verification_email(user.email, verification_code)
                return {'message': 'Verification email resent'}, 200
            except Exception as e:
                db.session.rollback()
                return {'error': 'Failed to send verification email'}, 500
                
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        

class Login(Resource):
    def post(self):
        try:
            data = request.get_json()

            if not all(key in data for key in ['email', 'password']):
                return {'error': 'Email and password are required'}, 400
            
            user = User.query.filter_by(email=data['email']).first()
            if not user or not user.verify_password(data['password']):
                return {'error': 'User not found'}, 404
            
            if user.verification_code:
                return {'error': 'Email not verified'}, 401
            
            access_token = create_access_token(
                identity=user.id,
                additional_claims={'user_type': user.role.value},
                expires_delta=timedelta(days=1)
            )

            return {
                'access_token': access_token,
                'user_id': user.id,
                'user_type': user.role.value
            }, 200
        
        except Exception as e:
            return {'error': str(e)}, 500


api.add_resource(Login, '/login')
api.add_resource(Register, '/register')
api.add_resource(VerifyEmail, '/verify-email')
api.add_resource(ResendVerification, '/resend-verification')
if __name__ == '__main__':
    app.run(port=5555, debug=True)