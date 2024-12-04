from config import bcrypt, db
from datetime import datetime
from sqlalchemy.orm import validates
from sqlalchemy import Enum, func
import enum


class UserRole(str, enum.Enum):
    ADMIN = 'admin'
    CLIENT = 'client'
    OWNER = 'owner'

class SpaceStatus(str, enum.Enum):
    AVAILABLE = 'available'
    BOOKED = 'booked'
    MAINTENANCE = 'maintenance'

class BookingStatus(str, enum.Enum):
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    CANCELLED = 'cancelled'
    COMPLETED = 'completed'

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    username = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.CLIENT)
    verification_code = db.Column(db.String(255))
    auth0_sub = db.Column(db.String(255), unique=True)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

    # Social auth fields
    social_id = db.Column(db.String(255), unique=True, nullable=True)
    social_provider = db.Column(db.String(50), nullable=True)

    # Relationships
    spaces = db.relationship('Space', backref='owner', lazy=True, cascade='all, delete-orphan')
    bookings = db.relationship('Booking', backref='client', lazy=True, cascade='all, delete-orphan')

    @property
    def password(self):
        return AttributeError('password is not readable')
    
    @password.setter
    def password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def verify_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
    @validates('email')
    def validate_email(self, key, email):
        if not email or '@' not in email:
            raise ValueError('Invalid email address')
        return email
    

class Space(db.Model):
    __tablename__ = 'spaces'

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    address = db.Column(db.String(255), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    hourly_price = db.Column(db.Numeric(10, 2), nullable=False)
    daily_price = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(Enum(SpaceStatus), default=SpaceStatus.AVAILABLE)
    amenities = db.Column(db.JSON) 
    rules = db.Column(db.JSON)
    images = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

     # Relationships
    bookings = db.relationship('Booking', backref='space', lazy=True, cascade='all, delete-orphan')
    
    @validates('hourly_rate', 'daily_rate')
    def validate_rates(self, key, value):
        if value <= 0:
            raise ValueError(f'{key} must be greater than 0')
        return value

class Booking(db.Model):
    __tablename__ = 'bookings'

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    space_id = db.Column(db.Integer, db.ForeignKey('spaces.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    stripe_payment_intent_id = db.Column(db.String(255), nullable=True)
    stripe_charge_id = db.Column(db.String(255), nullable=True)
    stripe_payment_status = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

     # Relationships
    payment = db.relationship('Payment', backref='booking', lazy=True, uselist=False, cascade='all, delete-orphan')
    
    @validates('start_time', 'end_time')
    def validate_booking_times(self, key, value):
        if key == 'end_time' and hasattr(self, 'start_time') and value <= self.start_time:
            raise ValueError('End time must be after start time')
        return value
    

class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    transaction_id = db.Column(db.String(255), unique=True)
    status = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

#Indices for common queries
db.Index('idx_space_status', Space.status)
db.Index('idx_booking_dates', Booking.start_time, Booking.end_time)
db.Index('idx_user_role', User.role)