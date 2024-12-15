import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import Navbar from '../src/components/NavBar';

// Mock useNavigate
const mockedUsedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedUsedNavigate,
  };
});

// Wrapper component to provide necessary context
const TestWrapper = ({ children, authContextValue }) => (
  <BrowserRouter>
    <AuthProvider value={authContextValue}>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Navbar Component', () => {
  let mockAuthContext;

  beforeEach(() => {
    mockedUsedNavigate.mockReset();
    mockAuthContext = {
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
    };
  });

  const renderNavbar = (overrideContext = {}) => {
    const contextValue = { ...mockAuthContext, ...overrideContext };
    return render(
      <TestWrapper authContextValue={contextValue}>
        <Navbar />
      </TestWrapper>
    );
  };

  it('renders the logo', () => {
    renderNavbar();
    const logo = screen.getByText(/Room/i);
    expect(logo).toBeInTheDocument();
  });

  it('displays nav links for unauthenticated user', () => {
    renderNavbar();
    expect(screen.getByText(/Explore Spaces/i)).toBeInTheDocument();
    expect(screen.getByText(/About/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('displays nav links for authenticated user', () => {
    renderNavbar({
      user: { username: 'testuser' },
      isAuthenticated: true,
    });
  
    // Check visible nav links
    expect(screen.getByText(/Explore Spaces/i)).toBeInTheDocument();
    expect(screen.getByText(/About/i)).toBeInTheDocument();
  
  });
  

  it('toggles mobile menu', () => {
    renderNavbar();
  
    // Target the mobile menu toggle button using its accessible name
    const menuToggle = screen.getByRole('button', { name: /open menu/i });
  
    // Open the menu
    fireEvent.click(menuToggle);
    expect(screen.getByText(/Explore Spaces/i)).toBeInTheDocument();
  
    // Close the menu
    fireEvent.click(menuToggle);
    expect(screen.queryByText(/Explore Spaces/i)).not.toBeInTheDocument();
  });
  
  

  it('handles logout for authenticated user', () => {
    const logoutMock = vi.fn();
    renderNavbar({
      user: { username: 'testuser' },
      isAuthenticated: true,
      logout: logoutMock,
    });

    const logoutButton = screen.getByText(/Logout/i);
    fireEvent.click(logoutButton);
    expect(logoutMock).toHaveBeenCalled();
    expect(mockedUsedNavigate).toHaveBeenCalledWith('/login');
  });

  it('displays login button for unauthenticated user', () => {
    renderNavbar();
    const loginButton = screen.getByRole('button', { name: /Login/i });
    expect(loginButton).toBeInTheDocument();
  });

  it('renders responsive layout', () => {
    renderNavbar();
    const desktopLinks = screen.queryByText(/Explore Spaces/i);
    
    expect(desktopLinks).toBeInTheDocument()
  });
});
