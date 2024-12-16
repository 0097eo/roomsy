import { describe, it, vi, expect}  from 'vitest'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SignUpPage from '../src/pages/Signup'
import VerifyEmailPage from '../src/pages/VerifyEmail'

//mock the footer component
vi.mock('../src/components/footer', () => ({
    default: () => <div data-testid="footer-mock">Footer</div>
}))

//mock react-router-dom hooks
const mockedUseNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
       ...actual,
        useNavigate: () => mockedUseNavigate,
    };
})

describe("Signup page component", () => {
    const renderComponent = () => {
        return render(
            <MemoryRouter initialEntries={['/signup']}>
                <Routes>
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route path="/verify" element={<VerifyEmailPage />} />
                </Routes>
            </MemoryRouter>
        )
    }
    it('renders the signup for correctly', ()=>{
        renderComponent()
        //check form elements
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    })

    it('allows input in form fields', () => {
        renderComponent()
        const usernameInput = screen.getByLabelText(/username/i);
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    })

    it('toggles password visibility', () => {
        renderComponent();
    
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
        const passwordToggleButtons = screen.getAllByRole('button', { name: '' });
        
        // Toggle password visibility
        fireEvent.click(passwordToggleButtons[0]);
        expect(passwordInput).toHaveAttribute('type', 'text');
    
        fireEvent.click(passwordToggleButtons[1]);
        expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    
        // Toggle back
        fireEvent.click(passwordToggleButtons[0]);
        expect(passwordInput).toHaveAttribute('type', 'password');
    
        fireEvent.click(passwordToggleButtons[1]);
        expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      });

      it('shows link to login page', () => {
        renderComponent()
        const loginLink = screen.getByRole('link', { name: /log in/i });
        expect(loginLink).toBeInTheDocument();
        expect(loginLink).toHaveAttribute('href', '/login');
      })

      it('handles successful registration', async ()=>{
        renderComponent()
        // mock fetch function
        vi.spyOn(window, 'fetch').mockResolvedValueOnce({ ok: true, json: () => ({ message: 'Registration successful' }) });

        const usernameInput = screen.getByLabelText(/username/i);
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

        //submit the form
        fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

        // Wait for loading state and navigation
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('api/register', expect.any(Object));
            expect(mockedUseNavigate).toHaveBeenCalledWith('/verify');
            expect(sessionStorage.getItem('registrationEmail')).toBe('test@example.com');
        });
      })

      it('handles registration error', async()=>{
        renderComponent()
        // mock fetch function
        vi.spyOn(window, 'fetch').mockResolvedValueOnce({ ok: false, json: () => ({ message: 'Registration failed' }) });

        const usernameInput = screen.getByLabelText(/username/i);
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

        // Wait for network error message
        await waitFor(() => {
            expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
        });
      })

      it('disables submit button during loading', async () => {
        // Mock fetch to simulate slow network
        global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves to keep loading state
    
        renderComponent();
    
        // Fill out the form
        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
    
        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    
        // Check button state
        const submitButton = screen.getByRole('button', { name: /signing up.../i });
        expect(submitButton).toBeDisabled();
      });

})
