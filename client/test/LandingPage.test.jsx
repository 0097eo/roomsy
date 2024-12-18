import { screen, render, waitFor, fireEvent, within } from '@testing-library/react'
import {vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import LandingPage from '../src/pages/LandingPage'
import AuthContext from '../src/context/AuthContext'


//mock dependencies
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn()
    }
})

vi.mock('../context/AuthContext', ()=>{
    useAuth: () => ({
        user: { token: 'mock-token' },
        isAuthenticated: true,
        loading: false,
    })
})

//mock fetch
global.fetch = vi.fn()

const mockSpaces = [
    {
        id: '1',
        name: 'Test Space 1',
        description: 'Test Description 1',
        capacity: 10,
        hourly_price: 500,
        images: ['test-image-1.jpg']
      },
      {
        id: '2',
        name: 'Test Space 2',
        description: 'Test Description 2',
        capacity: 20,
        hourly_price: 1000,
        images: []
      }
    ]


    const renderComponent = (authContextValue = {}) => {
        const defaultAuthContext = {
          user: { token: 'mock-token' },
          isAuthenticated: true,
          loading: false,
          ...authContextValue
        };
      
        return render(
          <MemoryRouter initialEntries={['/']}>
            <AuthContext.Provider value={defaultAuthContext}>
              <LandingPage />
            </AuthContext.Provider>
          </MemoryRouter>
        );
      };

describe('LandingPage Component...', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        vi.resetAllMocks();
    
        // Setup mock fetch response
        fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            spaces: mockSpaces,
            pagination: { total_pages: 1 }
          })
        });
      });

      it('renders the component and fetches spaces', async () => {
        renderComponent();
    
        // Wait for spaces to load
        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/spaces?'),
            expect.objectContaining({
              headers: expect.objectContaining({
                Authorization: 'Bearer mock-token'
              })
            })
          );
    
          // Check if space names are rendered
          expect(screen.getByText('Test Space 1')).toBeInTheDocument();
          expect(screen.getByText('Test Space 2')).toBeInTheDocument();
        });
      });

      it('opens and closes the Create Space modal', async () => {
        renderComponent();
    
        // Open modal by clicking the "Create" button
        const createButton = screen.getByRole('button', { name: /create/i });
        fireEvent.click(createButton);
    
        // Assert the modal is visible
        await waitFor(() => {
            expect(screen.getByText(/create new space/i)).toBeInTheDocument();
        });
    
        // Close the modal by clicking the "Close" button
        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);
    
        // Assert the modal is no longer visible
        await waitFor(() => {
            expect(screen.queryByText(/create new space/i)).not.toBeInTheDocument();
        });
    });

    it('handles filtering spaces', async () => {
        renderComponent();
    
        // Wait for initial fetch
        await waitFor(() => {
          expect(screen.getByText('Test Space 1')).toBeInTheDocument();
        });
    
        // Simulate search input
        const searchInput = screen.getByPlaceholderText('Search spaces...');
        fireEvent.change(searchInput, { target: { value: 'Test Space 1' } });
    
        // Verify fetch was called with search parameter
        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/spaces?search=Test+Space+1'),
            expect.anything()
          );
        });
      });
    
      it('validates form before creating space', async () => {
        renderComponent();
    
        // Open modal
        const createButton = screen.getByRole('button', { name: /create/i });
        fireEvent.click(createButton);
    
        // Try to submit without filling required fields
        const submitButton = screen.getByText('Create Space');
        fireEvent.click(submitButton);
    
        // Check for error message
        await waitFor(() => {
          expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
        });
      });

      it('handles image upload', async () => {
        renderComponent();
    
        // Open modal
        const createButton = screen.getByRole('button', { name: /create/i });
        fireEvent.click(createButton);
    
        // Create a mock file
        const file = new File(['test'], 'test.png', { type: 'image/png' });
    
        // Get file input
        const fileInput = screen.getByLabelText('Images (Primary + Additional)');
    
        // Simulate file upload
        await waitFor(() => {
          fireEvent.change(fileInput, { target: { files: [file] } });
        });
    
        // Verify file preview (this might require adjusting the test based on exact implementation)
        await waitFor(() => {
          const imagePreview = screen.getAllByRole('img');
          expect(imagePreview.length).toBeGreaterThan(0);
        });
      });

      it('handles amenities selection', async () => {
        renderComponent();
      
        // Open modal
        const createButton = screen.getByRole('button', { name: /create/i });
        fireEvent.click(createButton);
      
        // Find and click on the specific "WiFi" amenity button within the amenities section
        const amenitiesSection = screen.getByText('Select Amenities').closest('div');
        const wifiAmenityButton = within(amenitiesSection).getByText('WiFi');
        fireEvent.click(wifiAmenityButton);
      
        // Verify amenity is selected (button should change style)
        await waitFor(() => {
          expect(wifiAmenityButton.classList.contains('bg-blue-500')).toBeTruthy();
        });
      });
      
      it('handles pagination', async () => {
        renderComponent();
    
        // Wait for initial fetch
        await waitFor(() => {
          expect(screen.getByText('Test Space 1')).toBeInTheDocument();
        });
    
        // Check initial page
        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    
        // Verify next/previous buttons are disabled
        const previousButton = screen.getByText('Previous');
        const nextButton = screen.getByText('Next');
        
        expect(previousButton).toBeDisabled();
        expect(nextButton).toBeDisabled();
      });

      
})