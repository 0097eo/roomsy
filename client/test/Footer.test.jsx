import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Footer from '../src/components/Footer';

// Mock lucide-react icons to simplify testing
vi.mock('lucide-react', () => ({
  Facebook: () => <svg data-testid="facebook-icon" />,
  Twitter: () => <svg data-testid="twitter-icon" />,
  Instagram: () => <svg data-testid="instagram-icon" />,
  Linkedin: () => <svg data-testid="linkedin-icon" />,
}));

describe('Footer Component', () => {
  beforeEach(() => {
    render(<Footer />);
  });

  // Content Sections Tests
  it('renders the About section with correct text', () => {
    const aboutTitle = screen.getByText('About Roomsy');
    const aboutDescription = screen.getByText(/A platform that connects people to unique spaces/);
    
    expect(aboutTitle).toBeInTheDocument();
    expect(aboutDescription).toBeInTheDocument();
  });

  it('renders Quick Links section with correct links', () => {
    const links = [
      { text: 'About Us', href: '/about' },
      { text: 'Spaces', href: '/spaces' },
      { text: 'Contact', href: '/contact' },
      { text: 'Terms & Conditions', href: '/terms' }
    ];

    links.forEach(link => {
      const linkElement = screen.getByText(link.text);
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', link.href);
    });
  });

  it('renders Connect With Us section', () => {
    const connectTitle = screen.getByText('Connect With Us');
    const emailLink = screen.getByText('support@roomsy.com');
    
    expect(connectTitle).toBeInTheDocument();
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:support@roomsy.com');
  });

  // Social Media Icons Tests
  it('renders all social media icons', () => {
    const socialIcons = [
      'facebook-icon', 
      'twitter-icon', 
      'instagram-icon', 
      'linkedin-icon'
    ];

    socialIcons.forEach(iconTestId => {
      const icon = screen.getByTestId(iconTestId);
      expect(icon).toBeInTheDocument();
    });
  });

  // Social Media Links Tests
  it('renders social media links with correct attributes', () => {
    const socialLinks = [
      { name: 'Facebook', href: 'https://facebook.com' },
      { name: 'Twitter', href: 'https://twitter.com' },
      { name: 'Instagram', href: 'https://instagram.com' },
      { name: 'LinkedIn', href: 'https://linkedin.com' }
    ];

    socialLinks.forEach(social => {
      const link = screen.getByLabelText(social.name);
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', social.href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // Copyright Notice Test
  it('renders copyright notice with current year', () => {
    const currentYear = new Date().getFullYear();
    const copyrightText = screen.getByText(`© ${currentYear} RoomSy`);
    
    expect(copyrightText).toBeInTheDocument();
  });
});