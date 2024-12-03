import pytest
from flask_jwt_extended import create_access_token
from app import app, db
from models import User, UserRole, Space, SpaceStatus
import json
from unittest.mock import patch

@pytest.fixture
def client():
    """Configure Flask test client"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

@pytest.fixture
def admin_user():
    """Create and return an admin user"""
    user = User(
        email='admin@example.com',
        username='admin',
        role=UserRole.ADMIN,
        verification_code=None
    )
    user.password = 'Admin123!'
    db.session.add(user)
    db.session.commit()
    return user

@pytest.fixture
def admin_token(admin_user):
    """Create and return an admin JWT token"""
    return create_access_token(identity=str(admin_user.id))

@pytest.fixture
def admin_headers(admin_token):
    """Return headers with admin JWT token"""
    return {
        'Authorization': f'Bearer {admin_token}',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def sample_space(admin_user):
    """Create and return a sample space"""
    space = Space(
        owner_id=admin_user.id,
        name='Test Space',
        description='A test space',
        address='123 Test St',
        capacity=10,
        hourly_price=50.00,
        daily_price=300.00,
        status=SpaceStatus.AVAILABLE,
        amenities=['wifi', 'parking'],
        rules=['no smoking']
    )
    db.session.add(space)
    db.session.commit()
    return space

# Authentication Tests
class TestAuthentication:
    def test_register_success(self, client):
        """Test successful user registration"""
        with patch('app.send_verification_email') as mock_send_email:
            data = {
                'email': 'test@example.com',
                'username': 'testuser',
                'password': 'Test123!',
                'role': 'client'
            }
            response = client.post('/register', 
                                 json=data,
                                 content_type='application/json')
            
            assert response.status_code == 201
            json_data = json.loads(response.data)
            assert 'message' in json_data
            assert 'user_id' in json_data
            mock_send_email.assert_called_once()

    @pytest.mark.parametrize("invalid_data,expected_error", [
        (
            {
                'email': 'invalid-email',
                'username': 'testuser',
                'password': 'Test123!',
                'role': 'CLIENT'
            },
            'Invalid email address'
        ),
        (
            {
                'email': 'test@example.com',
                'username': 'testuser',
                'password': 'weak',
                'role': 'CLIENT'
            },
            'Password must be'
        ),
        (
            {
                'username': 'testuser',
                'password': 'Test123!',
                'role': 'CLIENT'
            },
            'Email is required'
        )
    ])
    def test_register_validation(self, client, invalid_data, expected_error):
        """Test registration validation with various invalid inputs"""
        response = client.post('/register',
                             json=invalid_data,
                             content_type='application/json')
        
        assert response.status_code == 400
        assert expected_error in response.get_data(as_text=True)

    def test_login_success(self, client):
        """Test successful login"""
        # Create verified user
        user = User(
            email='test@example.com',
            username='testuser',
            role=UserRole.CLIENT,
            verification_code=None
        )
        user.password = 'Test123!'
        db.session.add(user)
        db.session.commit()

        data = {
            'email': 'test@example.com',
            'password': 'Test123!'
        }
        response = client.post('/login',
                             json=data,
                             content_type='application/json')
        
        assert response.status_code == 200
        json_data = json.loads(response.data)
        assert 'access_token' in json_data
        assert 'user_id' in json_data

    def test_verify_email_success(self, client):
        """Test successful email verification"""
        user = User(
            email='test@example.com',
            username='testuser',
            role=UserRole.CLIENT,
            verification_code='123456'
        )
        user.password = 'Test123!'
        db.session.add(user)
        db.session.commit()

        data = {
            'email': 'test@example.com',
            'verification_code': '123456'
        }
        response = client.post('/verify-email',
                             json=data,
                             content_type='application/json')
        
        assert response.status_code == 200
        assert 'Email verified successfully' in response.get_data(as_text=True)

# Space Management Tests
class TestSpaces:
    def test_create_space_success(self, client):
        """Test creating a space without login fails"""
        data = {
            'name': 'Test Space',
            'description': 'A test space',
            'address': '123 Test St',
            'capacity': 10,
            'hourly_price': 50.00,
            'daily_price': 300.00,
            'status': 'AVAILABLE',
            'amenities': ['wifi', 'parking'],
            'rules': ['no smoking']
        }
        response = client.post('/spaces',
                               json=data,
                               content_type='application/json')
        
        assert response.status_code == 401
        assert 'Missing Authorization Header' in response.get_data(as_text=True)

    def test_get_spaces_pagination(self, client, admin_headers, sample_space):
        """Test getting list of spaces with pagination"""
        response = client.get('/spaces?page=1&per_page=8', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        json_data = json.loads(response.data)
        assert 'spaces' in json_data
        assert 'pagination' in json_data
        assert len(json_data['spaces']) == 1
        
        # Verify pagination info
        pagination = json_data['pagination']
        assert pagination['current_page'] == 1
        assert pagination['per_page'] == 8
        assert pagination['total_items'] == 1

    def test_update_space(self, client, admin_headers, sample_space):
        """Test updating a space"""
        update_data = {
            'name': 'Updated Space',
            'description': 'An updated space'
        }
        response = client.put(f'/spaces/{sample_space.id}',
                            json=update_data,
                            headers=admin_headers)
        
        assert response.status_code == 200
        assert 'Space updated successfully' in response.get_data(as_text=True)
        
        # Verify the update in database
        updated_space = db.session.get(Space, sample_space.id)
        assert updated_space.name == 'Updated Space'
        assert updated_space.description == 'An updated space'

    def test_delete_space(self, client, admin_headers, sample_space):
        """Test deleting a space"""
        response = client.delete(f'/spaces/{sample_space.id}',
                               headers=admin_headers)
        
        assert response.status_code == 200
        assert 'Space deleted successfully' in response.get_data(as_text=True)
        
        # Verify space is deleted
        assert db.session.get(Space,sample_space.id) is None

    def test_search_spaces(self, client, admin_headers, sample_space):
        """Test searching spaces"""
        # Test with matching search term
        response = client.get('/spaces?search=Test Space', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        json_data = json.loads(response.data)
        assert len(json_data['spaces']) == 1
        
        # Test with non-matching search term
        response = client.get('/spaces?search=NonExistent', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        json_data = json.loads(response.data)
        assert len(json_data['spaces']) == 0

    def test_filter_spaces_by_status(self, client, admin_headers, sample_space):
        """Test filtering spaces by status"""
        response = client.get('/spaces?status=available', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        json_data = json.loads(response.data)
        assert len(json_data['spaces']) == 1
        assert json_data['spaces'][0]['status'] == 'available'

    @pytest.mark.parametrize("missing_field", [
        'name', 'description', 'address', 'capacity', 
        'hourly_price', 'daily_price', 'status'
    ])
    

    def test_create_space_validation(self, client, admin_headers, missing_field):
        """Test space creation validation"""
    data = {
        'name': 'Test Space',
        'description': 'A test space',
        'address': '123 Test St',
        'capacity': 10,
        'hourly_price': 50.00,
        'daily_price': 300.00,
        'status': 'available',
        'amenities': ['wifi', 'parking'],
        'rules': ['no smoking']
    }

    