from config import app
from email.mime.text import MIMEText
import smtplib
import re
from flask_restful import Resource
from flask import redirect, session, url_for, request
from models import User, UserRole, Space, SpaceStatus
from config import app, db, api
import secrets
import os
import requests
from datetime import timedelta, datetime
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from authlib.integrations.flask_client import OAuth
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import func

oauth = OAuth(app)
auth0 = oauth.register(
    name='auth0',
    client_id=app.config.get('AUTH0_CLIENT_ID'),
    client_secret=app.config.get('AUTH0_CLIENT_SECRET'),
    client_kwargs={
        'scope': 'openid profile email'
    },
    server_metadata_url=f'https://{app.config.get("AUTH0_DOMAIN")}/.well-known/openid-configuration'
)


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
                return {'error': 'Invalid email or password'}, 401
            
            if user.verification_code:
                return {'error': 'Email not yet verified'}, 401
            
            access_token = create_access_token(
                identity=str(user.id),
                additional_claims={'role': user.role.value},
                expires_delta=timedelta(days=1)
            )
                   
            return {
                'access_token': access_token,
                'user_id': user.id,
                'role': user.role.value
            }, 200
            
        except Exception as e:
            return {'error': str(e)}, 500
        
class Auth0Login(Resource):
    def get(self):
        """Redirect to Auth0 login"""
        redirect_uri = url_for('auth0_callback', _external=True)
        return redirect(
            auth0.authorize_redirect(
                redirect_uri=redirect_uri,
                audience=app.config.get('AUTH0_AUDIENCE')
            )
        )

class Auth0Callback(Resource):
    def get(self):
        """Handle Auth0 callback"""
        try:
            # Exchange authorization code for tokens
            token = auth0.authorize_access_token()
            
            # Fetch user info
            user_info = requests.get(
                f'https://{app.config.get("AUTH0_DOMAIN")}/userinfo', 
                headers={'Authorization': f'Bearer {token["access_token"]}'}
            ).json()

            # Extract user details
            email = user_info.get('email')
            name = user_info.get('name', email.split('@')[0])
            auth0_sub = user_info.get('sub')

            if not email:
                return {'error': 'Unable to retrieve user email'}, 400

            # Find or create user
            user = User.query.filter_by(email=email).first()
            
            if not user:
                user = User(
                    email=email,
                    username=name,
                    role=UserRole.CLIENT,
                    verification_code=None,
                    auth0_sub=auth0_sub,
                    is_verified=True
                )
                db.session.add(user)
                db.session.commit()
            else:
                # Update Auth0 sub if not set
                if not user.auth0_sub:
                    user.auth0_sub = auth0_sub
                    db.session.commit()

            # Generate JWT token
            access_token = create_access_token(
                identity=str(user.id),
                additional_claims={
                    'user_type': user.role.value,
                    'auth0_sub': auth0_sub
                },
                expires_delta=timedelta(days=1)
            )

            # Store additional user info in session if needed
            session['auth0_user'] = user_info

            # Return access token and user info
            return {
                'access_token': access_token,
                'user_id': user.id,
                'user_type': user.role.value,
                'email': email,
                'name': name
            }, 200

        except Exception as e:
            app.logger.error(f"Auth0 Callback Error: {str(e)}")
            return {'error': 'Authentication failed'}, 500

class Auth0Logout(Resource):
    @jwt_required()
    def post(self):
        """Logout user from Auth0 and clear session"""
        # Clear local session
        session.clear()

        # Build logout URL
        return {
            'logout_url': f'https://{app.config.get("AUTH0_DOMAIN")}/v2/logout?'
                          f'client_id={app.config.get("AUTH0_CLIENT_ID")}&'
                          f'returnTo={request.host_url}'
        }, 200

class ProfileResource(Resource):
    @jwt_required()
    def get(self):
        """Get current user profile"""
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return {'error': 'User not found'}, 404
        
        return user.to_dict(), 200
    
class SpaceResource(Resource):
    @jwt_required()
    def get(self):
        try:
            # Get query parameters
            status = request.args.get('status')
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            search = request.args.get('search', '')

            # Get current user's type from JWT claims
            current_user_id = get_jwt_identity()  # Ensure this is a string
            current_user = db.session.get(User, current_user_id)
            
            if not current_user:
                return {'error': 'User not found'}, 404

            # Initialize the query object for Space
            query = Space.query

            # Apply status filter
            if current_user.role == UserRole.ADMIN:
                if status:
                    try:
                        space_status = SpaceStatus(status)
                        query = query.filter(Space.status == space_status)
                    except ValueError:
                        return {'error': 'Invalid status value'}, 400
                # If no status specified, show all spaces for admin
            else:
                # Non-admins can only see available spaces
                query = query.filter(Space.status == SpaceStatus.AVAILABLE)

            # Apply search filter if provided
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    db.or_(
                        Space.name.ilike(search_term),
                        Space.description.ilike(search_term)
                    )
                )

            # Execute paginated query
            paginated_spaces = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )

            # Prepare response data
            spaces = []
            for space in paginated_spaces.items:
                space_data = {
                    'id': space.id,
                    'name': space.name,
                    'description': space.description,
                    'address': space.address,
                    'status': space.status.value,
                    'hourly_price': str(space.hourly_price),
                    'daily_price': str(space.daily_price),
                    'capacity': space.capacity,
                    'amenities': space.amenities,
                    'rules': space.rules,
                    'images': [image.image_url for image in space.images]
                }
                spaces.append(space_data)

            return {
                'spaces': spaces,
                'pagination': {
                    'total_items': paginated_spaces.total,
                    'total_pages': paginated_spaces.pages,
                    'current_page': page,
                    'per_page': per_page,
                    'has_next': paginated_spaces.has_next,
                    'has_prev': paginated_spaces.has_prev
                }
            }, 200

        except Exception as e:
            return {'error': str(e)}, 500
        
    @jwt_required()
    def post(self):
        """Create a new space"""
        try:
            current_user_id = get_jwt_identity()
            current_user = db.session.get(User, current_user_id)

            if not current_user:
                return {'error': 'User not found'}, 404
            
            if current_user.role != UserRole.ADMIN or current_user.role != UserRole.OWNER:
                return {'error': 'Only admins can create spaces'}, 403
            
            data = request.get_json()

            required_fields = ['name', 'description', 'address', 'capacity', 'hourly_price', 'daily_price', 'status', 'amenities', 'rules']
            for field in required_fields:
                if field not in data:
                    return {'error': f'{field} is required'}, 400

            new_space = Space(
                owner_id=current_user.id,
                name=data['name'],
                description=data['description'],
                address=data['address'],
                capacity=data['capacity'],
                hourly_price=data['hourly_price'],
                daily_price=data['daily_price'],
                status=SpaceStatus[data['status']],
                amenities=data['amenities'],
                rules=data['rules']
            )
            db.session.add(new_space)
            db.session.commit()

            return {'message': 'Space created successfully', 'space_id': new_space.id}, 201
        
        except IntegrityError as e:
            db.session.rollback()  # In case of an integrity error
            return {'error': 'Database error: Integrity issue'}, 500
        except Exception as e:
            db.session.rollback()  # Rollback in case of other errors
            return {'error': str(e)}, 500
        
    @jwt_required()
    def put(self, space_id):
        """Update a space's details (Admin or Owner only)"""
        try:
            # Get the current user
            current_user_id = get_jwt_identity()
            current_user = db.session.get(User, current_user_id)

            if not current_user:
                return {'error': 'User not found'}, 404

            # Ensure the space exists
            space = db.session.get(Space, space_id)
            if not space:
                return {'error': 'Space not found'}, 404

            # Check if the user is the owner of the space or an admin
            if space.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
                return {'error': 'Permission denied. You must be the owner or an admin to update this space.'}, 403

            # Get data from the request
            data = request.get_json()

            # Update space details
            if 'name' in data:
                space.name = data['name']
            if 'description' in data:
                space.description = data['description']
            if 'address' in data:
                space.address = data['address']
            if 'capacity' in data:
                space.capacity = data['capacity']
            if 'hourly_price' in data:
                space.hourly_price = data['hourly_price']
            if 'daily_price' in data:
                space.daily_price = data['daily_price']
            if 'status' in data:
                space.status = SpaceStatus(data['status'])
            if 'amenities' in data:
                space.amenities = data['amenities']
            if 'rules' in data:
                space.rules = data['rules']

            # Set the updated time
            space.updated_at = func.now()

            # Commit the changes to the database
            db.session.commit()

            return {'message': 'Space updated successfully'}, 200

        except SQLAlchemyError as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
    @jwt_required()
    def delete(self, space_id):
        """Delete a space (Admin or Owner only)"""
        try:
            # Get the current user
            current_user_id = get_jwt_identity()
            current_user = db.session.get(User, current_user_id)

            if not current_user:
                return {'error': 'User not found'}, 404

            # Ensure the space exists
            space = db.session.get(Space, space_id)
            if not space:
                return {'error': 'Space not found'}, 404

            # Check if the user is the owner of the space or an admin
            if space.owner_id!= current_user.id and current_user.role!= UserRole.ADMIN:
                return {'error': 'Permission denied. You must be the owner or an admin to delete this space.'}, 403

            # Delete the space and all its associated images
            db.session.delete(space)
            db.session.commit()

            return {'message': 'Space deleted successfully'}, 200
        
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
    


api.add_resource(SpaceResource, '/spaces', '/spaces/<int:space_id>')
api.add_resource(Auth0Login, '/auth0/login')
api.add_resource(Auth0Callback, '/auth0/callback')
api.add_resource(Auth0Logout, '/auth0/logout')
api.add_resource(ProfileResource, '/profile')
api.add_resource(Login, '/login')
api.add_resource(Register, '/register')
api.add_resource(VerifyEmail, '/verify-email')
api.add_resource(ResendVerification, '/resend-verification')
if __name__ == '__main__':
    app.run(port=5555, debug=True)