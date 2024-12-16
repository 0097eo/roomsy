import { describe, vi, it, expect } from "vitest";
import {render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AboutPage from "../src/pages/About";

//mock the navbar to avoid rendering its dependencies
vi.mock('../src/components/NavBar', ()=> ({
    default: () => <div data-testid="navbar-mock">NavBar</div>
}))

//mock react router with useNavigate
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe("AboutPage Component", () => {
    const renderComponent = () => {
        return render(
            <MemoryRouter initialEntries={['/about']}>
                <Routes>
                    <Route path="/about" element={<AboutPage />} />
                </Routes>
            </MemoryRouter>
        )
    }
    it('renders the page title', ()=> {
        renderComponent();
        const pageTitle = screen.getByText('About Roomsy');
        expect(pageTitle).toBeInTheDocument();
    })

    it("renders the mission statement", () => {
        renderComponent();
        const missionStatement = screen.getByText(/At Roomsy, we strive to connect like-minded individuals passionate about sharing experiences in unique spaces./i);
        expect(missionStatement).toBeInTheDocument();
    })

    it("renders the problem solving staement", () => {
        renderComponent();
        const problemSolvingStatement = screen.getByText(/We make it simple to discover and book spaces online./i);
        expect(problemSolvingStatement).toBeInTheDocument();
    })

    it("renders the feature section", () => {
        renderComponent()
        //check for feature headings
        expect(screen.getByText('Global Reach')).toBeInTheDocument();
        expect(screen.getByText('Community Building')).toBeInTheDocument();
        expect(screen.getByText('Monetization for Owners')).toBeInTheDocument();

    })

    it('renders call to action section', () => {
        renderComponent();
        
        expect(screen.getByText('Join Our Community')).toBeInTheDocument();
        expect(screen.getByText('Explore Spaces')).toBeInTheDocument();
        expect(screen.getByText('List Your Space')).toBeInTheDocument();
      });

    it('navigates to spaces page when "Explore Spaces" is clicked', ()=>{
        renderComponent()
        const exploreButton = screen.getByText('Explore Spaces');
        expect(exploreButton).toBeInTheDocument();
        fireEvent.click(exploreButton);
        expect(mockedNavigate).toBeCalledWith('/spaces');
    })

    it('navigates to spaces page when "List Your Space" is clicked', ()=>{
        renderComponent()
        const listButton = screen.getByText('List Your Space');
        expect(listButton).toBeInTheDocument();
        fireEvent.click(listButton);
        expect(mockedNavigate).toBeCalledWith('/spaces');
    })

    it('renders the navbar component', () => {
        renderComponent()
        const navbar = screen.getByTestId('navbar-mock');
        expect(navbar).toBeInTheDocument();
    })
})