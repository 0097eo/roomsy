import { useState, useEffect } from 'react';
import { User as UserIcon, Home as HomeIcon, Calendar as CalendarIcon, LogOut as LogOutIcon, Menu as MenuIcon, X as CloseIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/NavBar';
import Footer from '../components/Footer';

const ProfilePage = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !user.token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setProfile(data);
        setLoading(false);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const renderProfileDetails = () => (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        <UserIcon className="mr-3 text-blue-600" /> Profile Details
      </h2>
      {profile && (
        <div className="space-y-4">
          {['username', 'email', 'role', 'created_at'].map(field => (
            <div key={field}>
              <label className="font-semibold text-gray-600 block">
                {field === 'created_at' ? 'Member Since' : field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <p className="text-lg">
                {field === 'created_at' 
                  ? new Date(profile[field]).toLocaleDateString() 
                  : profile[field]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSpaces = () => (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        <HomeIcon className="mr-3 text-green-600" /> My Spaces
      </h2>
      {profile?.spaces?.length > 0 ? (
        <div className="space-y-4">
          {profile.spaces.map(space => (
            <div key={space.id} className="border-b pb-4 last:border-b-0">
              <h3 className="text-xl font-semibold">{space.name}</h3>
              <p className="text-gray-600 mb-2">{space.description}</p>
              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500 space-y-2 sm:space-y-0">
                <span>Hourly Rate: ${space.hourly_price}</span>
                <span>Daily Rate: ${space.daily_price}</span>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Created: {new Date(space.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No spaces listed</p>
      )}
    </div>
  );

  const renderBookings = () => (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        <CalendarIcon className="mr-3 text-purple-600" /> My Bookings
      </h2>
      {profile?.bookings?.length > 0 ? (
        <div className="space-y-4">
          {profile.bookings.map(booking => (
            <div key={booking.id} className="border-b pb-4 last:border-b-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="mb-2 sm:mb-0">
                  <h3 className="text-xl font-semibold">{booking.space_name}</h3>
                  <p className="text-sm text-gray-600 flex flex-col sm:flex-row">
                    <span>
                      <strong>From </strong>{new Date(booking.start_time).toLocaleString()}
                    </span>
                    <span className="hidden sm:inline mx-2">-</span>
                    <span>
                      <strong>To </strong>{new Date(booking.end_time).toLocaleString()}
                    </span>
                  </p>
                </div>
                <span className={`
                  px-3 py-1 rounded-full text-xs font-semibold mt-2 sm:mt-0
                  ${booking.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    booking.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                    booking.status === 'cancelled'? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'}
                `}>
                  {booking.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No bookings found</p>
      )}
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-red-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <Navbar />
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Mobile Menu Toggle */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-white shadow-md">
        <button 
          onClick={toggleMobileMenu}
          className="w-full p-4 flex justify-between items-center"
        >
          {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Sidebar - Mobile & Desktop */}
      <div className={`
        fixed left-0 top-0 bottom-0 w-64 bg-white shadow-md overflow-y-auto 
        transition-transform duration-300 z-30
        ${isMobileMenuOpen ? 'translate-x-0 top-16' : '-translate-x-full'}
        md:translate-x-0 md:top-16 md:block
      `}>
        <div className="p-6 border-b flex items-center">
          <h1 className="text-xl font-bold text-gray-800">Hello, {user?.username}</h1>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {[
              { section: 'profile', icon: UserIcon, label: 'Profile Details' },
              { section: 'spaces', icon: HomeIcon, label: 'My Spaces' },
              { section: 'bookings', icon: CalendarIcon, label: 'My Bookings' }
            ].map(({ section, icon: Icon, label }) => (
              <li key={section}>
                <button 
                  onClick={() => {
                    setActiveSection(section);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center p-3 rounded-lg transition-colors 
                    ${activeSection === section ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}
                  `}
                >
                  <Icon className="mr-3" /> {label}
                </button>
              </li>
            ))}
            <li>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center p-3 rounded-lg hover:bg-red-100 hover:text-red-800"
              >
                <LogOutIcon className="mr-3" /> Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content Area - Responsive Layout */}
      <div className="flex-1 md:ml-64 p-4 md:p-10 mt-16 md:mt-0 overflow-y-auto">
        {activeSection === 'profile' && renderProfileDetails()}
        {activeSection === 'spaces' && renderSpaces()}
        {activeSection === 'bookings' && renderBookings()}
      </div>
    </div>
    <Footer/>
    </>
  );
};

export default ProfilePage;