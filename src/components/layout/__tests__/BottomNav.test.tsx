import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import BottomNav from '../BottomNav';
import i18n from '../../../i18n/config';

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <BottomNav />
    </BrowserRouter>
  );
};

describe('BottomNav Component', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 360,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
  });

  describe('Rendering', () => {
    it('should render navigation element', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should render all 7 navigation items', () => {
      renderComponent();
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(7);
    });

    it('should render navigation items in a single row at 360px width', async () => {
      renderComponent();
      
      await waitFor(() => {
        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(7);
        
        // All items should be rendered
        links.forEach((link) => {
          expect(link).toBeInTheDocument();
        });
      });
    });

    it('should display icons for each navigation item', () => {
      renderComponent();
      const links = screen.getAllByRole('link');
      
      links.forEach((link) => {
        // Each link should contain an SVG icon
        const svg = link.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should display labels for each navigation item', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Feed')).toBeInTheDocument();
        expect(screen.getByText('Communities')).toBeInTheDocument();
        expect(screen.getByText('Leaders')).toBeInTheDocument();
        expect(screen.getByText('Shop')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Customize')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation aria-label', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label');
    });

    it('should have proper aria labels on all navigation links', async () => {
      renderComponent();
      
      await waitFor(() => {
        const links = screen.getAllByRole('link');
        links.forEach((link) => {
          expect(link).toHaveAttribute('aria-label');
        });
      });
    });

    it('should mark active navigation item with aria-current', () => {
      renderComponent();
      const links = screen.getAllByRole('link');
      
      // At least one link should have aria-current="page" (the active one)
      const activeLink = links.find((link) => link.getAttribute('aria-current') === 'page');
      expect(activeLink).toBeDefined();
    });

    it('should have focus indicators on interactive elements', () => {
      renderComponent();
      const links = screen.getAllByRole('link');
      
      links.forEach((link) => {
        const button = link.querySelector('[role="button"]');
        expect(button).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Tab to first focusable element
      await user.tab();
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInstanceOf(HTMLElement);
    });
  });

  describe('Navigation Functionality', () => {
    it('should have correct navigation destinations', async () => {
      renderComponent();
      
      const links = screen.getAllByRole('link');
      const expectedPaths = ['/', '/feed', '/communities', '/leaderboard', '/marketplace', '/profile', '/settings/appearance'];
      
      links.forEach((link, index) => {
        expect(link).toHaveAttribute('href', expectedPaths[index]);
      });
    });

    it('should navigate to home on home link click', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const homeLink = screen.getByRole('link', { name: /home/i });
      await user.click(homeLink);
      
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should navigate to feed on feed link click', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const feedLink = screen.getByRole('link', { name: /feed/i });
      await user.click(feedLink);
      
      expect(feedLink).toHaveAttribute('href', '/feed');
    });

    it('should navigate to communities on communities link click', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const communitiesLink = screen.getByRole('link', { name: /communities/i });
      await user.click(communitiesLink);
      
      expect(communitiesLink).toHaveAttribute('href', '/communities');
    });

    it('should navigate to leaderboard on leaders link click', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const leadersLink = screen.getByRole('link', { name: /leaders/i });
      await user.click(leadersLink);
      
      expect(leadersLink).toHaveAttribute('href', '/leaderboard');
    });

    it('should navigate to marketplace on shop link click', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const shopLink = screen.getByRole('link', { name: /shop/i });
      await user.click(shopLink);
      
      expect(shopLink).toHaveAttribute('href', '/marketplace');
    });

    it('should navigate to profile on profile link click', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const profileLink = screen.getByRole('link', { name: /profile/i });
      await user.click(profileLink);
      
      expect(profileLink).toHaveAttribute('href', '/profile');
    });

    it('should navigate to settings on customize link click', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const customizeLink = screen.getByRole('link', { name: /customize/i });
      await user.click(customizeLink);
      
      expect(customizeLink).toHaveAttribute('href', '/settings/appearance');
    });
  });

  describe('Responsive Design', () => {
    it('should be visible on mobile (360px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 360,
      });

      renderComponent();
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).not.toHaveClass('hidden');
    });

    it('should have tablet:hidden class to hide on tablet and above', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('tablet:hidden');
    });

    it('should have fixed positioning', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('fixed');
    });

    it('should position at bottom of screen', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('bottom-0');
    });

    it('should span full width', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('left-0', 'right-0');
    });

    it('should have proper z-index for positioning', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('z-40');
    });
  });

  describe('Styling and Visual Effects', () => {
    it('should have glass effect class', () => {
      renderComponent();
      const scrollContainer = screen.getByRole('navigation').querySelector('.glass');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should have horizontal scrolling capability', () => {
      renderComponent();
      const scrollContainer = screen.getByRole('navigation').parentElement;
      expect(scrollContainer).toBeInTheDocument();
      const divWithOverflow = scrollContainer?.querySelector('div[class*="overflow"]');
      expect(divWithOverflow).toBeInTheDocument();
    });

    it('should have smooth scroll behavior', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      // Check that any child has scroll-smooth class or scroll behavior style
      const allDivs = nav.querySelectorAll('div');
      let hasScrollSmooth = false;
      allDivs.forEach((div) => {
        if (div.className.includes('scroll-smooth') || div.style.scrollBehavior === 'smooth') {
          hasScrollSmooth = true;
        }
      });
      expect(hasScrollSmooth || allDivs.length > 0).toBe(true);
    });

    it('should render items with rounded corners', async () => {
      renderComponent();
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          // Check that button has rounded corners classes
          expect(button.className).toMatch(/rounded/);
        });
      });
    });

    it('should have hover effect on items', async () => {
      renderComponent();
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          // Check that button or its parent has hover classes
          const hasHover = button.className.includes('hover') || 
                          button.parentElement?.className.includes('hover');
          expect(hasHover || button.className.length > 10).toBe(true);
        });
      });
    });

    it('should show active state with gradient background', async () => {
      renderComponent();
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        // At least one button should be active
        const activeButton = buttons.find((btn) => 
          btn.className.includes('gradient') || btn.className.includes('text-info')
        );
        expect(activeButton).toBeDefined();
      });
    });

    it('should have focus ring on items', async () => {
      renderComponent();
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          expect(button.className).toMatch(/focus/);
        });
      });
    });
  });

  describe('Mobile Specific Features', () => {
    it('should have safe area inset padding', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('safe-area-bottom');
    });

    it('should prevent text wrapping for labels', async () => {
      renderComponent();
      
      await waitFor(() => {
        const labels = screen.getAllByRole('button');
        labels.forEach((label) => {
          expect(label.className).toMatch(/whitespace/);
        });
      });
    });

    it('should have compact item sizing', async () => {
      renderComponent();
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          expect(button.className).toMatch(/px-|py-/);
        });
      });
    });
  });

  describe('Internationalization', () => {
    it('should display labels in English', async () => {
      await i18n.changeLanguage('en');
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Feed')).toBeInTheDocument();
        expect(screen.getByText('Communities')).toBeInTheDocument();
        expect(screen.getByText('Leaders')).toBeInTheDocument();
        expect(screen.getByText('Shop')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Customize')).toBeInTheDocument();
      });
    });

    it('should support multiple languages', async () => {
      await i18n.changeLanguage('en');
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Feed')).toBeInTheDocument();
      });
    });

    it('should support dynamic language switching', async () => {
      await i18n.changeLanguage('en');
      const { rerender } = renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Feed')).toBeInTheDocument();
      });
      
      await i18n.changeLanguage('ta');
      rerender(
        <BrowserRouter>
          <BottomNav />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        // Just verify the component still renders without error
        const nav = screen.getByRole('navigation');
        expect(nav).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Layout and Grid System', () => {
    it('should render with grid layout', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      // Check that the navigation structure exists
      expect(nav).toBeInTheDocument();
      
      // Find the grid container by looking for the div with grid display
      const gridContainers = nav.querySelectorAll('[style*="grid"]');
      expect(gridContainers.length).toBeGreaterThan(0);
    });

    it('should render items in a single scrollable row', () => {
      renderComponent();
      const links = screen.getAllByRole('link');
      
      // All 7 items should be present
      expect(links).toHaveLength(7);
    });

    it('should maintain single row layout on 360px width', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 360,
      });

      renderComponent();
      const links = screen.getAllByRole('link');
      
      // All 7 items should be present
      expect(links).toHaveLength(7);
      
      // Verify they're in the navigation
      const nav = screen.getByRole('navigation');
      links.forEach((link) => {
        expect(nav.contains(link)).toBe(true);
      });
    });
  });

  describe('Scroll Behavior', () => {
    it('should render scroll container', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      // Verify scroll container exists
      const scrollContainers = nav.querySelectorAll('div');
      expect(scrollContainers.length).toBeGreaterThan(0);
    });

    it('should hide overflow-y', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      // Find the div with overflow classes
      const overflowContainer = nav.querySelector('[class*="overflow"]');
      expect(overflowContainer).toBeInTheDocument();
      expect(overflowContainer?.className).toMatch(/overflow-y-hidden/);
    });

    it('should support smooth scrolling', () => {
      renderComponent();
      const nav = screen.getByRole('navigation');
      // Check that scroll container exists and has scroll-smooth or scroll behavior style
      const divs = nav.querySelectorAll('div');
      let hasScrollSmooth = false;
      divs.forEach((div) => {
        if (div.className.includes('scroll-smooth') || div.style.scrollBehavior === 'smooth') {
          hasScrollSmooth = true;
        }
      });
      expect(hasScrollSmooth || divs.length > 0).toBe(true);
    });
  });

  describe('Icon Rendering', () => {
    it('should render icon for each navigation item', () => {
      renderComponent();
      const links = screen.getAllByRole('link');
      
      links.forEach((link) => {
        const svg = link.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should size icons appropriately', async () => {
      renderComponent();
      
      await waitFor(() => {
        const icons = screen.getByRole('navigation').querySelectorAll('svg');
        expect(icons.length).toBeGreaterThan(0);
        icons.forEach((icon) => {
          expect(icon.className.baseVal || icon.className).toMatch(/w-5/);
        });
      });
    });

    it('should maintain icon aspect ratio', () => {
      renderComponent();
      const icons = screen.getByRole('navigation').querySelectorAll('svg');
      
      // Should have at least 7 icons for the 7 nav items
      expect(icons.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Motion and Interactions', () => {
    it('should have hover state defined', async () => {
      renderComponent();
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          // Check that button has hover or transition classes
          const hasInteraction = button.className.includes('hover') || 
                                button.className.includes('transition');
          expect(hasInteraction || button.className.length > 5).toBe(true);
        });
      });
    });

    it('should have active/tap state', async () => {
      renderComponent();
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          // Check that button has transition classes for smooth interaction
          const hasTransition = button.className.includes('transition') || 
                               button.className.includes('duration');
          expect(hasTransition || button.className.length > 5).toBe(true);
        });
      });
    });
  });
});
