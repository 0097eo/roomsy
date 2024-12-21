import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import SpaceDetailsPage from '../src/pages/SpaceDetails';
import { AuthProvider } from '../src/context/AuthContext';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock dependencies
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      token: 'fake-token',
      name: 'Test User',
      email: 'test@example.com'
    },
    isAuthenticated: true,
    loading: false
  }),
  AuthProvider: ({ children }) => children
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({
    elements: vi.fn(),
    createPaymentMethod: vi.fn(),
    confirmCardPayment: vi.fn()
  }))
}));

// Mock Slick Carousel
vi.mock('react-slick', () => {
  return {
    default: ({ children }) => <div data-testid="slick-carousel">{children}</div>
  };
});

// Mock components that might cause issues in tests
vi.mock('../components/NavBar', () => ({
  default: () => <div data-testid="navbar">NavBar</div>
}));

vi.mock('../components/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.share and clipboard
const mockNavigatorShare = vi.fn();
const mockClipboardWrite = vi.fn();
Object.defineProperty(navigator, 'share', {
  value: mockNavigatorShare,
  configurable: true
});
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockClipboardWrite },
  configurable: true
});

// Mock window.alert
const mockAlert = vi.fn();
global.alert = mockAlert;

// Mock window.open
const mockWindowOpen = vi.fn();
global.open = mockWindowOpen;

describe('SpaceDetailsPage', () => {
  const mockSpace = {
    id: '1',
    name: 'Test Space',
    description: 'A fantastic space for events',
    hourly_price: 500,
    status: 'Available',
    capacity: '50 people',
    address: '123 Test Street',
    images: ['/test-image1.jpg', '/test-image2.jpg'],
    rules: ['No smoking', 'No outside food'],
    amenities: ['WiFi', 'Projector']
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup successful fetch mock
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/spaces/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSpace)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          stripe_client_secret: 'test-secret'
        })
      });
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/spaces/1']}>
        <Routes>
          <Route 
            path="/spaces/:id" 
            element={
              <AuthProvider>
                <Elements stripe={loadStripe('test-key')}>
                  <SpaceDetailsPage />
                </Elements>
              </AuthProvider>
            } 
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    renderComponent();
    expect(screen.getByText('Loading spaces...')).toBeInTheDocument();
  });

  it('renders space details correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Space')).toBeInTheDocument();
    });

    // Check basic details
    expect(screen.getByText('A fantastic space for events')).toBeInTheDocument();
    expect(screen.getByText('KES 500/hr')).toBeInTheDocument();
    expect(screen.getByText('50 people')).toBeInTheDocument();
    expect(screen.getByText('123 Test Street')).toBeInTheDocument();

    // Check amenities and rules
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Projector')).toBeInTheDocument();
    expect(screen.getByText('No smoking')).toBeInTheDocument();
    expect(screen.getByText('No outside food')).toBeInTheDocument();
  });

  it('handles image carousel and modal interaction', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('slick-carousel')).toBeInTheDocument();
    });

    // Find and click first image
    const images = screen.getAllByRole('img');
    fireEvent.click(images[0]);

    // Check modal is open
    expect(screen.getByAltText('Full-size')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    // Verify modal is closed
    expect(screen.queryByAltText('Full-size')).not.toBeInTheDocument();
  });

  it('handles booking flow correctly', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for component to load and click Book Now
    await waitFor(() => {
      const bookButton = screen.getByText('Book Now');
      expect(bookButton).toBeInTheDocument();
      fireEvent.click(bookButton);
    });

    // Check if booking modal is open
    expect(screen.getByText('Book Space')).toBeInTheDocument();

    // Fill booking form
    const dateInput = screen.getByLabelText('Date');
    const timeInput = screen.getByLabelText('Time');
    const durationInput = screen.getByLabelText('Duration (hours)');

    await user.type(dateInput, '2024-12-25');
    await user.type(timeInput, '14:00');
    await user.type(durationInput, '2');

    // Submit booking
    const submitButton = screen.getByText('Check Availability');
    await user.click(submitButton);

    // Verify payment form appears
    await waitFor(() => {
      expect(screen.getByText('Payment Details')).toBeInTheDocument();
    });
  });

  it('handles share functionality', async () => {
    renderComponent();

    await waitFor(() => {
      const shareButton = screen.getByLabelText('Share space');
      fireEvent.click(shareButton);
    });

    // Check share options
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Copy Link')).toBeInTheDocument();

    // Test copy link
    fireEvent.click(screen.getByText('Copy Link'));
    expect(mockClipboardWrite).toHaveBeenCalledWith(window.location.href);
    expect(mockAlert).toHaveBeenCalledWith('Link copied to clipboard');

    // Test social share buttons
    fireEvent.click(screen.getByText('Twitter'));
    expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('twitter.com'), '_blank');
  });

  it('handles unavailable space status', async () => {
    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          ...mockSpace,
          status: 'Booked'
        })
      })
    );

    renderComponent();

    await waitFor(() => {
      const unavailableButton = screen.getByText('Unavailable');
      expect(unavailableButton).toBeInTheDocument();
      expect(unavailableButton).toBeDisabled();
    });
  });

  it('handles fetch error', async () => {
    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch space details' })
      })
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch space details')).toBeInTheDocument();
    });
  });

  it('handles booking validation', async () => {
    renderComponent();

    await waitFor(() => {
      fireEvent.click(screen.getByText('Book Now'));
    });

    // Try to submit without filling required fields
    const submitButton = screen.getByText('Check Availability');
    fireEvent.click(submitButton);

    // Check if form validation prevents submission
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('handles closing of booking modal', async () => {
    renderComponent();

    await waitFor(() => {
      fireEvent.click(screen.getByText('Book Now'));
    });

    // Close modal using X button
    const closeButton = screen.getByRole('button', { name: /×/i });
    fireEvent.click(closeButton);

    // Verify modal is closed
    expect(screen.queryByText('Book Space')).not.toBeInTheDocument();
  });
});