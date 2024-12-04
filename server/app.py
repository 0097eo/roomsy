from config import app
from email.mime.text import MIMEText
import smtplib
import re
from flask_restful import Resource
from flask import redirect, session, url_for, request, current_app
from models import User, UserRole, Space, SpaceStatus, Booking, BookingStatus
from config import app, db, api
import secrets
import os
import requests
from datetime import timedelta, datetime
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from authlib.integrations.flask_client import OAuth
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import func, and_, or_
from decimal import Decimal
import stripe
import cloudinary
from cloudinary.utils import cloudinary_url
from cloudinary.uploader import upload
from functools import wraps
import json
import decimal


stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

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

def configure_cloudinary():
    """Configure Cloudinary with environment variables"""
    try:
        cloudinary.config(
            cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
            api_key=os.getenv('CLOUDINARY_API_KEY'),
            api_secret=os.getenv('CLOUDINARY_API_SECRET')
        )
    except Exception as e:
        print(f"Error configuring Cloudinary: {str(e)}")
        raise

def require_cloudinary(f):
    """Decorator to ensure Cloudinary is configured before upload"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not all([
            cloudinary.config().cloud_name,
            cloudinary.config().api_key,
            cloudinary.config().api_secret
        ]):
            configure_cloudinary()
        return f(*args, **kwargs)
    return decorated_function

@require_cloudinary
def upload_image_to_cloudinary(image_file):
    """
    Upload image to Cloudinary with error handling and retry logic
    
    Args:
        image_file: File object from request.files
    Returns:
        str: Cloudinary secure URL of the uploaded image
    Raises:
        Exception: If upload fails after retries
    """
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            result = cloudinary.uploader.upload(
                image_file,
                folder="charity_stories",
                transformation={
                    'width': 800,
                    'height': 600,
                    'crop': 'fill',
                    'quality': 'auto:good'
                }
            )
            return result['secure_url']
        except Exception as e:
            retry_count += 1
            if retry_count == max_retries:
                print(f"Failed to upload image after {max_retries} attempts: {str(e)}")
                raise Exception("Failed to upload image to Cloudinary")
            print(f"Upload attempt {retry_count} failed, retrying...")


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
                'role': user.role.value,
                'username': user.username
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
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    
    def allowed_file(self, filename):
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.ALLOWED_EXTENSIONS

    def validate_file_size(self, file):
        file.seek(0, 2)  # Seek to end of file
        size = file.tell()  # Get current position (size)
        file.seek(0)  # Reset file position
        return size <= self.MAX_FILE_SIZE
    

    @jwt_required()
    def get(self, space_id=None):
        try:
            # If space_id is provided, fetch a single space
            if space_id:
                space = Space.query.get(space_id)
                if not space:
                    return {'error': 'Space not found'}, 404
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
                    'images': space.images or []  # Use the JSON images list directly
                }
                return space_data, 200

            # Get query parameters
            status = request.args.get('status')
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 8, type=int)
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
                    'images': space.images or []  # Use the JSON images list directly
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
            
            if current_user.role not in [UserRole.ADMIN, UserRole.OWNER]:
                return {'error': 'Only admins and owners can create spaces'}, 403
            
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()

            required_fields = ['name', 'description', 'address', 'capacity', 'hourly_price', 'daily_price', 'status', 'amenities', 'rules']
            for field in required_fields:
                if field not in data:
                    return {'error': f'{field} is required'}, 400
                
            # Handling multiple image uploads
            space_images = []
            if 'images' in request.files:
                for img in request.files.getlist('images'):
                    if img and self.allowed_file(img.filename) and self.validate_file_size(img):
                        try:
                            img_url = upload_image_to_cloudinary(img)
                            space_images.append(img_url)
                        except Exception as e:
                            # Log the error but continue processing other images
                            current_app.logger.error(f"Image upload failed: {str(e)}")
            
            # Handle single image upload for backwards compatibility
            if 'image' in request.files:
                image_file = request.files['image']
                if image_file.filename != '':
                    if not self.allowed_file(image_file.filename):
                        return {
                            'error': f'Invalid file type. Allowed types: {", ".join(self.ALLOWED_EXTENSIONS)}'
                        }, 400
                    
                    if not self.validate_file_size(image_file):
                        return {
                            'error': f'File size exceeds maximum limit of {self.MAX_FILE_SIZE/1024/1024}MB'
                        }, 400
                    
                    try:
                        image_url = upload_image_to_cloudinary(image_file)
                        space_images.append(image_url)
                    except Exception as e:
                        return {"error": f"Image upload failed: {str(e)}"}, 500

            try:
                amenities = json.loads(data['amenities']) if isinstance(data['amenities'], str) else data['amenities']
                rules = json.loads(data['rules']) if isinstance(data['rules'], str) else data['rules']
            except json.JSONDecodeError:
                return {'error': 'Invalid JSON for amenities or rules'}, 400

            new_space = Space(
                owner_id=current_user.id,
                name=data['name'],
                description=data['description'],
                address=data['address'],
                capacity=int(data['capacity']),
                hourly_price=decimal.Decimal(data['hourly_price']),
                daily_price=decimal.Decimal(data['daily_price']),
                status=SpaceStatus[data['status']],
                amenities=amenities,
                rules=rules,
                images=space_images  # Store the list of image URLs
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
    
class ClientSpaceResource(Resource):
    """Resource for client-specific space operations"""
    
    def get(self):
        """
        Get a list of available spaces with basic information
        Supports pagination and search functionality
        """
        try:
            # Get query parameters
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            search = request.args.get('search', '')
            
            # Base query - only show available spaces to clients
            query = Space.query.filter(Space.status == SpaceStatus.AVAILABLE)
            
            # Apply search if provided
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    db.or_(
                        Space.name.ilike(search_term),
                        Space.description.ilike(search_term),
                        Space.address.ilike(search_term)
                    )
                )
            
            # Execute paginated query
            paginated_spaces = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
            
            # Prepare response with basic information
            spaces = [{
                'id': space.id,
                'name': space.name,
                'address': space.address,
                'hourly_price': str(space.hourly_price),
                'daily_price': str(space.daily_price),
                'capacity': space.capacity,
                'thumbnail': space.images[0].image_url if space.images else None
            } for space in paginated_spaces.items]
            
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
            
    def get(self, space_id):
        """
        Get detailed information about a specific space
        Including all images, amenities, rules, and availability
        """
        try:
            space = Space.query.get(space_id)
            
            if not space:
                return {'error': 'Space not found'}, 404
                
            if space.status != SpaceStatus.AVAILABLE:
                return {'error': 'This space is not currently available'}, 400
                
            # Prepare detailed space information
            space_details = {
                'id': space.id,
                'name': space.name,
                'description': space.description,
                'address': space.address,
                'hourly_price': str(space.hourly_price),
                'daily_price': str(space.daily_price),
                'capacity': space.capacity,
                'amenities': space.amenities,
                'rules': space.rules,
                'images': [image.image_url for image in space.images],
                'created_at': space.created_at.isoformat(),
                'updated_at': space.updated_at.isoformat() if space.updated_at else None,
            }
            
            return space_details, 200
            
        except Exception as e:
            return {'error': str(e)}, 500
        

class BookingResource(Resource):
    @jwt_required()
    def put(self, booking_id):
        """Cancel an existing booking"""
        try:
            # Get the booking
            booking = db.session.get(Booking, booking_id)
            if not booking:
                return {'error': 'Booking not found'}, 404
            
            # Check if booking can be cancelled
            if booking.status == BookingStatus.CANCELLED:
                return {'error': 'Booking is already cancelled'}, 400
            
            if booking.status == BookingStatus.COMPLETED:
                return {'error': 'Cannot cancel a completed booking'}, 400
            
            # Check cancellation time policy (at least 24 hours notice)
            if booking.start_time <= datetime.now() + timedelta(hours=24):
                return {
                    'error': 'Bookings must be cancelled at least 24 hours in advance'
                }, 400
            
            # Get associated space
            space = booking.space
            if space:
                # Reset space status to available if this was the current booking
                if space.status == SpaceStatus.BOOKED:
                    space.status = SpaceStatus.AVAILABLE
            
            # Update booking status
            booking.status = BookingStatus.CANCELLED
            booking.updated_at = datetime.now()
            
            # Attempt to refund the Stripe payment if it exists
            if booking.stripe_payment_intent_id:
                try:
                    # Refund the payment if it was already charged
                    if booking.stripe_charge_id:
                        stripe.Refund.create(
                            charge=booking.stripe_charge_id,
                            reason='requested_by_customer'
                        )
                    else:
                        # If payment intent hasn't been confirmed, cancel it
                        stripe.PaymentIntent.cancel(booking.stripe_payment_intent_id)
                except stripe.error.StripeError as e:
                    # Log the error, but don't prevent cancellation
                    print(f"Stripe refund error: {str(e)}")
            
            # Save changes
            db.session.commit()
            
            return {
                'message': 'Booking cancelled successfully',
                'booking_id': booking.id,
                'status': BookingStatus.CANCELLED.value
            }, 200
            
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

    @jwt_required()
    def post(self, space_id):
        """Create a new booking for a space with Stripe payment integration"""
        try:
            # Get current user
            current_user_id = get_jwt_identity()
            
            # Validate request data
            data = request.get_json()
            if not all(key in data for key in ['start_time', 'end_time']):
                return {'error': 'Start time and end time are required'}, 400
            
            # Parse datetime strings
            try:
                start_time = datetime.fromisoformat(data['start_time'])
                end_time = datetime.fromisoformat(data['end_time'])
            except ValueError:
                return {'error': 'Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}, 400
            
            # Validate booking time
            if start_time >= end_time:
                return {'error': 'End time must be after start time'}, 400
            
            if start_time < datetime.now():
                return {'error': 'Cannot book in the past'}, 400
            
            # Get the space
            space = db.session.get(Space, space_id)
            if not space:
                return {'error': 'Space not found'}, 404
            
            if space.status != SpaceStatus.AVAILABLE:
                return {'error': 'Space is not available for booking'}, 400
            
            # Check for conflicting bookings
            conflicting_booking = Booking.query.filter(
                and_(
                    Booking.space_id == space_id,
                    Booking.status != BookingStatus.CANCELLED,
                    or_(
                        and_(
                            Booking.start_time <= start_time,
                            Booking.end_time > start_time
                        ),
                        and_(
                            Booking.start_time < end_time,
                            Booking.end_time >= end_time
                        ),
                        and_(
                            Booking.start_time >= start_time,
                            Booking.end_time <= end_time
                        )
                    )
                )
            ).first()
            
            if conflicting_booking:
                return {'error': 'Space is already booked for this time period'}, 409
            
            # Calculate duration and amount
            duration = end_time - start_time
            hours = duration.total_seconds() / 3600
            days = duration.days
            
            # Calculate total amount based on duration
            total_price = Decimal('0.0')
            if days >= 1:
                # Calculate full days
                total_price += Decimal(str(space.daily_price)) * Decimal(str(days))
                # Calculate remaining hours
                remaining_hours = (duration.total_seconds() % 86400) / 3600  # 86400 seconds in a day
                if remaining_hours > 0:
                    total_price += Decimal(str(space.hourly_price)) * Decimal(str(remaining_hours))
            else:
                # Calculate hourly rate
                total_price = Decimal(str(space.hourly_price)) * Decimal(str(hours))
            
            # Convert total price to cents for Stripe
            amount_in_cents = int(total_price * 100)
            
            # Create Stripe Payment Intent
            try:
                payment_intent = stripe.PaymentIntent.create(
                    amount=amount_in_cents,
                    currency='usd',
                    payment_method_types=['card'],
                    metadata={
                        'space_id': space_id,
                        'client_id': current_user_id,
                        'start_time': start_time.isoformat(),
                        'end_time': end_time.isoformat()
                    }
                )
            except stripe.error.StripeError as e:
                return {'error': f'Payment processing error: {str(e)}'}, 402
            
            # Create booking
            new_booking = Booking(
                client_id=current_user_id,
                space_id=space_id,
                start_time=start_time,
                end_time=end_time,
                total_price=total_price,
                status=BookingStatus.PENDING,
                stripe_payment_intent_id=payment_intent.id
            )
            
            # Update space status
            space.status = SpaceStatus.BOOKED
            
            # Save to database
            db.session.add(new_booking)
            db.session.commit()
            
            return {
                'message': 'Booking initiated. Complete payment to confirm.',
                'booking_id': new_booking.id,
                'total_price': str(total_price),
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'duration': {
                    'days': days,
                    'hours': hours % 24,
                    'total_hours': hours
                },
                'status': new_booking.status.value,
                'stripe_client_secret': payment_intent.client_secret
            }, 201
            
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

    @jwt_required()
    def get(self, booking_id=None):
        """Get booking details or list of user's bookings"""
        try:
            current_user_id = get_jwt_identity()
            
            if booking_id:
                # Get specific booking
                booking = Booking.query.filter_by(
                    id=booking_id,
                    client_id=current_user_id
                ).first()
                
                if not booking:
                    return {'error': 'Booking not found'}, 404
                
                return {
                    'id': booking.id,
                    'space_id': booking.space_id,
                    'start_time': booking.start_time.isoformat(),
                    'end_time': booking.end_time.isoformat(),
                    'total_price': str(booking.total_price),
                    'status': booking.status.value,
                    'space_name': booking.space.name,
                    'space_address': booking.space.address,
                    'payment_status': booking.stripe_payment_status
                }, 200
            
            else:
                # List all user's bookings with pagination
                page = request.args.get('page', 1, type=int)
                per_page = request.args.get('per_page', 10, type=int)
                
                bookings = Booking.query.filter_by(client_id=current_user_id)\
                    .order_by(Booking.created_at.desc())\
                    .paginate(page=page, per_page=per_page, error_out=False)
                
                return {
                    'bookings': [{
                        'id': b.id,
                        'space_id': b.space_id,
                        'space_name': b.space.name,
                        'start_time': b.start_time.isoformat(),
                        'end_time': b.end_time.isoformat(),
                        'total_price': str(b.total_price),
                        'status': b.status.value,
                        'payment_status': b.stripe_payment_status
                    } for b in bookings.items],
                    'pagination': {
                        'total_items': bookings.total,
                        'total_pages': bookings.pages,
                        'current_page': page,
                        'per_page': per_page,
                        'has_next': bookings.has_next,
                        'has_prev': bookings.has_prev
                    }
                }, 200
                
        except Exception as e:
            return {'error': str(e)}, 500

# Webhook endpoint to handle Stripe events
class StripeWebhookResource(Resource):
    def post(self):
        """Handle Stripe webhook events"""
        payload = request.get_data()
        sig_header = request.headers.get('Stripe-Signature')

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
            )
        except ValueError:
            # Invalid payload
            return {'error': 'Invalid payload'}, 400
        except stripe.error.SignatureVerificationError:
            # Invalid signature
            return {'error': 'Invalid signature'}, 400

        # Handle different event types
        if event.type == 'payment_intent.succeeded':
            payment_intent = event.data.object
            
            # Find the booking associated with this payment intent
            booking = Booking.query.filter_by(
                stripe_payment_intent_id=payment_intent.id
            ).first()
            
            if booking:
                # Update booking status
                booking.status = BookingStatus.CONFIRMED
                booking.stripe_charge_id = payment_intent.charges.data[0].id
                
                # Ensure the space remains booked
                if booking.space:
                    booking.space.status = SpaceStatus.BOOKED
                
                db.session.commit()

        elif event.type == 'payment_intent.payment_failed':
            payment_intent = event.data.object
            
            # Find the booking associated with this payment intent
            booking = Booking.query.filter_by(
                stripe_payment_intent_id=payment_intent.id
            ).first()
            
            if booking:
                # Update booking status
                booking.status = BookingStatus.CANCELLED
                
                # Release the space
                if booking.space:
                    booking.space.status = SpaceStatus.AVAILABLE
                
                db.session.commit()

        return {'received': True}, 200

# Add resources to API
api.add_resource(BookingResource, '/spaces/<int:space_id>/book', '/bookings', '/bookings/<int:booking_id>', '/bookings/<int:booking_id>/cancel')
api.add_resource(StripeWebhookResource, '/stripe-webhook')
api.add_resource(ClientSpaceResource,'/client/spaces', '/client/spaces/<int:space_id>')
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