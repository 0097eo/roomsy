from faker import Faker
import random
from datetime import datetime, timedelta
from decimal import Decimal
from models import db, User, Space, SpaceImage, Booking, Payment, UserRole, SpaceStatus, BookingStatus
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
import os
import requests
from io import BytesIO
from config import app

# Load environment variables
load_dotenv()

fake = Faker()

# Sample image URLs for spaces
SAMPLE_IMAGE_IDS = [
    "https://images.unsplash.com/photo-1495521939206-a217db9df264?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1462826303086-329426d1aef5?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://plus.unsplash.com/premium_photo-1661389625547-e4977d5727a6?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1463421585849-6b0acf2c9257?q=80&w=1973&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://plus.unsplash.com/premium_photo-1683880731785-e5b632e0ea13?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1552664688-cf412ec27db2?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1605125626499-e2c7efbd1ab3?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",  
    "https://images.unsplash.com/photo-1510531704581-5b2870972060?q=80&w=2073&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",  
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"   
]

def generate_image_url():
    """Upload image to Cloudinary from Unsplash URL"""
    try:
        base_url = random.choice(SAMPLE_IMAGE_IDS)
        full_url = f"{base_url}?q=80&w=800&auto=format&fit=crop"
        
        response = requests.get(full_url)
        if response.status_code != 200:
            raise Exception(f"Failed to download image: {response.status_code}")
        
        result = cloudinary.uploader.upload(
            BytesIO(response.content),
            folder="spaces",
            transformation={
                'width': 800,
                'height': 600,
                'crop': 'fill',
                'quality': 'auto:good'
            }
        )
        
        return result['secure_url']
    except Exception as e:
        print(f"Error uploading image: {str(e)}")
        return None

def clear_database():
    """Clear all existing data from the database"""
    print("🗑️ Clearing existing database data...")
    try:
        db.drop_all()
        db.create_all()
        print("✨ Database cleared successfully!")
    except Exception as e:
        print(f"❌ Error clearing database: {str(e)}")
        raise

def create_users(num_users=20):
    """Create sample users with different roles"""
    print("👥 Creating users...")
    users = []
    
    # Create admin user
    admin = User(
        email='admin@example.com',
        username='admin',
        password='adminpassword',
        role=UserRole.ADMIN
    )
    users.append(admin)
    
    # Create space owners (30% of users)
    num_owners = max(int(num_users * 0.3), 1)
    for i in range(num_owners):
        owner = User(
            email=fake.email(),
            username=fake.user_name(),
            password='ownerpassword',
            role=UserRole.OWNER
        )
        users.append(owner)
    
    # Create regular clients
    for i in range(num_users - num_owners - 1):
        client = User(
            email=fake.email(),
            username=fake.user_name(),
            password='clientpassword',
            role=UserRole.CLIENT
        )
        users.append(client)
    
    db.session.add_all(users)
    db.session.commit()
    print(f"✅ Created {len(users)} users")
    return users

def create_spaces(users, num_spaces=30):
    """Create sample spaces"""
    print("🏢 Creating spaces...")
    spaces = []
    owners = [user for user in users if user.role == UserRole.OWNER]
    
    amenities_options = [
        'WiFi', 'Projector', 'Whiteboard', 'Coffee Machine', 'Air Conditioning',
        'Kitchen', 'Parking', 'TV/Monitor', 'Standing Desk', 'Printer',
        'High-Speed Internet', 'Video Conferencing', 'Sound System', 'Microphone',
        'Ergonomic Chairs', 'Natural Lighting', 'Outdoor Area', 'Security System'
    ]
    
    space_types = ['Office', 'Studio', 'Conference Room', 'Workshop Space', 
                   'Event Space', 'Meeting Room', 'Classroom', 'Coworking Space']
    
    for i in range(num_spaces):
        owner = random.choice(owners)
        amenities = random.sample(amenities_options, random.randint(4, 10))
        space_type = random.choice(space_types)
        
        space = Space(
            owner_id=owner.id,
            name=f"{fake.company()} {space_type}",
            description=fake.paragraph(nb_sentences=3),
            address=fake.address(),
            capacity=random.randint(2, 50),
            hourly_price=Decimal(str(random.uniform(10.0, 100.0))).quantize(Decimal('0.01')),
            daily_price=Decimal(str(random.uniform(80.0, 800.0))).quantize(Decimal('0.01')),
            status=random.choice(list(SpaceStatus)),
            amenities=amenities,
            rules="\n".join(fake.sentences(nb=3))
        )
        spaces.append(space)
    
    db.session.add_all(spaces)
    db.session.commit()
    print(f"✅ Created {len(spaces)} spaces")
    return spaces

def create_space_images(spaces):
    """Create sample images for each space"""
    print("🖼️ Creating space images...")
    images = []
    
    for space in spaces:
        num_images = random.randint(3, 5)
        for i in range(num_images):
            image_url = generate_image_url()
            if image_url:
                image = SpaceImage(
                    space_id=space.id,
                    image_url=image_url,
                    is_primary=(i == 0)
                )
                images.append(image)
    
    db.session.add_all(images)
    db.session.commit()
    print(f"✅ Created {len(images)} space images")
    return images

def create_bookings(users, spaces, num_bookings=100):
    """Create sample bookings and payments"""
    print("📅 Creating bookings and payments...")
    bookings = []
    payments = []
    clients = [user for user in users if user.role == UserRole.CLIENT]
    
    start_date = datetime.now() - timedelta(days=30)
    payment_methods = ['credit_card', 'debit_card', 'paypal', 'bank_transfer']
    
    for i in range(num_bookings):
        client = random.choice(clients)
        space = random.choice(spaces)
        
        # Generate random booking duration
        duration_hours = random.randint(1, 72)
        booking_start = start_date + timedelta(
            days=random.randint(-30, 30),
            hours=random.randint(8, 18)
        )
        booking_end = booking_start + timedelta(hours=duration_hours)
        
        # Calculate total price
        if duration_hours >= 24:
            days = duration_hours // 24
            total_price = space.daily_price * Decimal(str(days))
            remaining_hours = duration_hours % 24
            total_price += space.hourly_price * Decimal(str(remaining_hours))
        else:
            total_price = space.hourly_price * Decimal(str(duration_hours))
        
        booking = Booking(
            client_id=client.id,
            space_id=space.id,
            start_time=booking_start,
            end_time=booking_end,
            total_price=total_price,
            status=random.choice(list(BookingStatus))
        )
        bookings.append(booking)
        
        # Create payment for confirmed or completed bookings
        if booking.status in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED]:
            payment = Payment(
                booking=booking,
                amount=total_price,
                payment_method=random.choice(payment_methods),
                transaction_id=fake.uuid4(),
                status='completed'
            )
            payments.append(payment)
    
    db.session.add_all(bookings)
    db.session.add_all(payments)
    db.session.commit()
    print(f"✅ Created {len(bookings)} bookings and {len(payments)} payments")
    return bookings, payments

def seed_database():
    """Main function to seed the database"""
    try:
        # Configure Cloudinary with environment variables
        cloudinary.config(
            cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
            api_key=os.getenv('CLOUDINARY_API_KEY'),
            api_secret=os.getenv('CLOUDINARY_API_SECRET')
        )
        
        # Clear existing data
        clear_database()
        
        # Create data in the correct order
        users = create_users(num_users=20)
        spaces = create_spaces(users, num_spaces=30)
        images = create_space_images(spaces)
        bookings, payments = create_bookings(users, spaces, num_bookings=100)
        
        print("🌟 Database seeding completed successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {str(e)}")
        db.session.rollback()
        raise

if __name__ == '__main__':
    with app.app_context():
        seed_database()