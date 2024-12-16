import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { AuthProvider } from '../src/context/AuthContext';
import LoginPage from '../src/pages/Login';


//mock useAuth hook
const mockLogin = vi.fn()
vi.mock('../src/context/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
    }),
    AuthProvider: ({ children }) => <>{children}</>
}))

//mock useNavigate
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

//helper function to render the component with necessary providers
const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

describe('Login Component', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
      });

    it('renders login page correctly', () => {
        renderLoginPage();
        // Check for key elements
        expect(screen.getByText('Log In to Roomsy')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
        expect(screen.getByText('Sign up')).toBeInTheDocument();
    })

    it('handles input changes', () => {
        renderLoginPage();
        const emailInput = screen.getByLabelText('Email');
        const passwordInput = screen.getByLabelText('Password');

        fireEvent.change(emailInput, { target: { value: 'testuser@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        expect(emailInput.value).toBe('testuser@example.com');
        expect(passwordInput.value).toBe('testpassword');
    })

    it('validates password length', async () => {
        renderLoginPage();
    
        const emailInput = screen.getByLabelText('Email');
        const passwordInput = screen.getByLabelText('Password');
        const submitButton = screen.getByRole('button', { name: 'Log In' });
    
        // Short password
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'short' } });
        fireEvent.click(submitButton);
    
        await waitFor(() => {
          expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
        });
      });

      it('handles successful login', async () => {
        // Mock successful login
        mockLogin.mockResolvedValue(true);
    
        renderLoginPage();
    
        const emailInput = screen.getByLabelText('Email');
        const passwordInput = screen.getByLabelText('Password');
        const submitButton = screen.getByRole('button', { name: 'Log In' });
    
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
    
        await waitFor(() => {
          // Check that login was called with correct credentials
          expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
          
          // Check that navigation occurred
          expect(mockedNavigate).toHaveBeenCalledWith('/spaces');
        });
      });

      it('handles login failure', async () => {
        // Mock login failure
        mockLogin.mockResolvedValue(false);
    
        renderLoginPage();
    
        const emailInput = screen.getByLabelText('Email');
        const passwordInput = screen.getByLabelText('Password');
        const submitButton = screen.getByRole('button', { name: 'Log In' });
    
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
    
        await waitFor(() => {
          expect(screen.getByText('Login failed. Please check your credentials.')).toBeInTheDocument();
        });
      });

      it('handles network errors', async () => {
        // Mock network error
        mockLogin.mockRejectedValue(new Error('Network error'));
      })

      it("toggle password visibility", () => {
        renderLoginPage();
        const passwordInput = screen.getByLabelText('Password');
        const toggleButton = screen.getByRole('button', { name: /Show password|Hide password/i });
    
        // Initially password should be hidden
        expect(passwordInput.getAttribute('type')).toBe('password');
    
        // Click to show password
        fireEvent.click(toggleButton);
        expect(passwordInput.getAttribute('type')).toBe('text');
    
        // Click to hide password again
        fireEvent.click(toggleButton);
        expect(passwordInput.getAttribute('type')).toBe('password');
      });
})