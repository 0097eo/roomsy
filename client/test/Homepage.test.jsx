import {vi, describe, expect, it} from 'vitest'
import {render, screen} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Homepage from '../src/pages/Homepage'



vi.mock('../src/components/Footer', ()=>({
    default: () => <div data-testid="footer-mock">Footer</div>
}))

describe('Homepage Component', () => {
    const renderComponent = () => {
        return render(
            <MemoryRouter initialEntries={['/']}>
                <Homepage />
            </MemoryRouter>
        )
    }

    it('renders the main heading', () => {
        renderComponent()
        const heading = screen.getByText(/Welcome to Roomsy/i)
        expect(heading).toBeInTheDocument()
    })

    it("renders the subheading", () => {
        renderComponent()
        const subheading = screen.getByText(/Discover, book, and manage rooms effortlessly with our modern and intuitive platform./i)
        expect(subheading).toBeInTheDocument()
    })

    it('renders the Get Started button', () => {
        renderComponent()
        const button = screen.getByText(/Get Started/i)
        expect(button).toBeInTheDocument()
    })

    it('renders the Login link', () => {
        renderComponent()
        const loginLink = screen.getByText('Log In')
        expect(loginLink).toBeInTheDocument()
        expect(loginLink).toHaveAttribute('href', '/login')
    })

    it("renders the support link", () => {
        renderComponent()
        const supportLink = screen.getByText('Support Center');
        expect(supportLink).toBeInTheDocument();
        expect(supportLink).toHaveAttribute('href', '/support');
    })

    it("renders the footer", () => {
        renderComponent()
        const footer = screen.getByTestId('footer-mock');
        expect(footer).toBeInTheDocument();
    })

    it('renders the hero image', () => {
        renderComponent()
        const heroImage = screen.getByAltText('Homepage illustration');
        expect(heroImage).toBeInTheDocument();
        expect(heroImage).toHaveClass('object-cover h-screen w-full')
    })

    it('has correct layout', () => {
        renderComponent()
        const sections = screen.getAllByRole('generic').filter(el=>
            el.classList.contains('w-1/2')
        )
        expect(sections).toHaveLength(2)
    })
})