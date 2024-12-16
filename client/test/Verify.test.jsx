import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyEmailPage from '../src/pages/VerifyEmail';

// Mock the navigate function
const mockedUsedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedUsedNavigate
  };
});

describe('VerifyEmailPage Component', () => {
  const testEmail = 'test@example.com';

  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/verify']}>
        <Routes>
          <Route path="/verify" element={<VerifyEmailPage />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders the verify email form correctly', () => {
    // Set email in session storage
    sessionStorage.setItem('registrationEmail', testEmail);

    renderComponent();

    // Check for form elements
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify email/i })).toBeInTheDocument();
  });

  it('populates email from session storage', () => {
    // Set email in session storage
    sessionStorage.setItem('registrationEmail', testEmail);

    renderComponent();

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveValue(testEmail);
    expect(emailInput).toHaveAttribute('readOnly');
  });

  it('allows input in verification code field', () => {
    // Set email in session storage
    sessionStorage.setItem('registrationEmail', testEmail);

    renderComponent();

    const verificationCodeInput = screen.getByLabelText(/verification code/i);
    fireEvent.change(verificationCodeInput, { target: { value: '123456' } });

    expect(verificationCodeInput).toHaveValue('123456');
  });

  it('handles successful email verification', async () => {
    // Set email in session storage
    sessionStorage.setItem('registrationEmail', testEmail);

    // Mock successful fetch response
    global.fetch = vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Email verified successfully' })
      })
    );

    renderComponent();

    // Fill out verification code
    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: '123456' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));

    // Wait for navigation and verify session storage cleared
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('api/verify-email', expect.any(Object));
      expect(mockedUsedNavigate).toHaveBeenCalledWith('/login');
      expect(sessionStorage.getItem('registrationEmail')).toBeNull();
    });
  });

  it('handles verification error', async () => {
    // Set email in session storage
    sessionStorage.setItem('registrationEmail', testEmail);

    // Mock error fetch response
    global.fetch = vi.fn(() => 
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid verification code' })
      })
    );

    renderComponent();

    // Fill out verification code
    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: '123456' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument();
    });
  });

  it('handles network error', async () => {
    // Set email in session storage
    sessionStorage.setItem('registrationEmail', testEmail);

    // Mock network error
    global.fetch = vi.fn(() => 
      Promise.reject(new Error('Network error'))
    );

    renderComponent();

    // Fill out verification code
    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: '123456' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));

    // Wait for network error message
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('disables submit button during loading', async () => {
    // Set email in session storage
    sessionStorage.setItem('registrationEmail', testEmail);

    // Mock fetch to simulate slow network
    global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves to keep loading state

    renderComponent();

    // Fill out verification code
    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: '123456' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));

    // Check button state
    const submitButton = screen.getByRole('button', { name: /verifying.../i });
    expect(submitButton).toBeDisabled();
  });

  it('shows resend code button', () => {
    // Set email in session storage
    sessionStorage.setItem('registrationEmail', testEmail);

    // Spy on window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderComponent();

    // Find and click resend code button
    const resendButton = screen.getByRole('button', { name: /resend code/i });
    expect(resendButton).toBeInTheDocument();

    fireEvent.click(resendButton);

    // Verify alert was called
    expect(alertSpy).toHaveBeenCalledWith('Resend functionality to be implemented');

    // Restore alert
    alertSpy.mockRestore();
  });
});
