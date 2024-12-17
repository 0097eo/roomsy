import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../src/pages/Profile';
import AuthContext from '../src/context/AuthContext';
import { Facebook, PartyPopper } from 'lucide-react';

//mock dependencies
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useParams: () => ({ id: 'test-user-id' }),
    };
})

//mock lucide react icons to prevent rerendering
vi.mock('lucide-react', () => ({
    User: () => null,
    Home: () => null,
    Calendar: () => null,
    LogOut: () => null,
    Menu: () => null,
    X: () => null,
    Settings: () => null,
    Eye: () => null,
    EyeOff: () => null,
    PartyPopper: () => null,
    Facebook: () => null,
    Twitter: () => null,
    Instagram: () => null,
    Linkedin: () => null,
    Trash2: () => null,
  }));

//mock components
vi.mock('../components/NavBar', () => ({
    default: () => <div data-testid="navbar">Navbar</div>
  }));
  
  vi.mock('../components/Footer', () => ({
    default: () => <div data-testid="footer">Footer</div>
  }));

  const mockProfile = {
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    created_at: '2023-01-01T00:00:00Z',
    spaces: [
      {
        id: '1',
        name: 'Test Space',
        description: 'A test space',
        hourly_price: 10,
        daily_price: 50,
        created_at: '2023-02-01T00:00:00Z'
      }
    ],
    bookings: [
      {
        id: '1',
        space_name: 'Test Booking Space',
        start_time: '2023-03-01T10:00:00Z',
        end_time: '2023-03-01T12:00:00Z',
        status: 'completed'
      }
    ]
  };

  const renderComponent = (
    authContextValue = {
      user: { token: 'test-token', username: 'testuser' },
      logout: vi.fn(),
      isAuthenticated: true,
      loading: false
    }
  ) => {
    // Mock global fetch
    global.fetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProfile)
      })
    );
  
    return render(
      <MemoryRouter>
        <AuthContext.Provider value={authContextValue}>
          <ProfilePage />
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  describe('ProfilePage',  () => {
    beforeEach(() => {
        vi.clearAllMocks();
      });

      it('renders loading state initially', async () => {
        renderComponent({
          user: { token: 'test-token', username: 'testuser' },
          logout: vi.fn(),
          isAuthenticated: true,
          loading: true
        });
    
        expect(screen.getByText(/loading.../i)).toBeInTheDocument();
      });

      it('navigates between sections', async () => {
        renderComponent();
    
        await waitFor(() => {
          // Click on Spaces section
          const spacesButton = screen.getByText('My Spaces');
          fireEvent.click(spacesButton);
          expect(screen.getByText('Test Space')).toBeInTheDocument();
    
          // Click on Bookings section
          const bookingsButton = screen.getByText('My Bookings');
          fireEvent.click(bookingsButton);
          expect(screen.getByText('Test Booking Space')).toBeInTheDocument();
    
          // Click on Settings section
          const settingsButton = screen.getByText('Account Settings');
          fireEvent.click(settingsButton);
          expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        });
      });

      it('renders profile details after loading', async () => {
        renderComponent();
      
        // Wait for profile details to load
        await waitFor(() => {
          const profileDetailsElements = screen.getAllByText('Profile Details');
          expect(profileDetailsElements.length).toBeGreaterThan(0);
          expect(profileDetailsElements[0]).toBeInTheDocument();
        
          const userNameElements = screen.getAllByText('testuser');
          expect(userNameElements.length).toBeGreaterThan(0);
          expect(userNameElements[0]).toBeInTheDocument();

          const emailElements = screen.getAllByText('test@example.com');
          expect(emailElements.length).toBeGreaterThan(0);
          expect(emailElements[0]).toBeInTheDocument();
        });
      });
    
      it('handles profile update', async () => {
        // Mock the fetch for profile update
        global.fetch = vi.fn().mockImplementation((url, options) => {
          if (options.method === 'PUT') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ message: 'Profile updated successfully' })
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfile)
          });
        });
    
        renderComponent();
    
        await waitFor(() => {
          // Navigate to settings
          const settingsButtons = screen.getAllByText('Account Settings');
          fireEvent.click(settingsButtons[0]);
          
          // Fill out form
          const usernameInput = screen.getAllByLabelText(/username/i);
          const emailInput = screen.getAllByLabelText(/email/i);
          const currentPasswordInput = screen.getAllByLabelText(/current password/i);
          const newPasswordInput = screen.getAllByLabelText(/new password/i);
          const confirmPasswordInput = screen.getAllByLabelText(/confirm new password/i);
    
          fireEvent.change(usernameInput[0], { target: { value: 'newusername' } });
          fireEvent.change(emailInput[0], { target: { value: 'newemail@example.com' } });
          fireEvent.change(currentPasswordInput[0], { target: { value: 'oldpassword' } });
          fireEvent.change(newPasswordInput[0], { target: { value: 'newpassword' } });
          fireEvent.change(confirmPasswordInput[0], { target: { value: 'newpassword' } });
    
          const updateButton = screen.getByText('Update Profile');
          fireEvent.click(updateButton);
        });
      });

      it('handles profile delete', async () => {
        // Mock logout and window.location
        const mockLogout = vi.fn();
        const mockWindowLocation = vi.fn();
        Object.defineProperty(window, 'location', {
          value: { href: mockWindowLocation },
          writable: true
        });
    
        renderComponent({
          user: { token: 'test-token', username: 'testuser' },
          logout: mockLogout,
          isAuthenticated: true,
          loading: false
        });
    
        await waitFor(() => {
          // Navigate to settings
          const settingsButton = screen.getByText('Account Settings');
          fireEvent.click(settingsButton);
    
          // Open delete confirmation
          const deleteButton = screen.getByText('Delete Profile');
          fireEvent.click(deleteButton);
    
          // Confirm delete
          const confirmDeleteButton = screen.getByText('Confirm Delete');
          fireEvent.click(confirmDeleteButton);
        });

        expect(mockLogout).toBeCalled();
      });

      it('handles logout', async () => {
        // Mock logout and window.location
        const mockLogout = vi.fn();
        const mockWindowLocation = vi.fn();
        Object.defineProperty(window, 'location', {
          value: { href: mockWindowLocation },
          writable: true
        });
    
        renderComponent({
          user: { token: 'test-token', username: 'testuser' },
          logout: mockLogout,
          isAuthenticated: true,
          loading: false
        });
    
        await waitFor(() => {
          // Find and click logout button
          const logoutButtons = screen.getAllByText('Logout');
          fireEvent.click(logoutButtons[0]);
        
          expect(mockLogout).toHaveBeenCalled();
        });
      });

      
  })