import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import { ResponsiveLayoutContext, type LayoutContextValue } from '../../responsive/ResponsiveLayoutContext';

vi.mock('../NotificationDropdown', () => ({
  default: () => <div>NotificationDropdown</div>,
}));

vi.mock('../../wallet/ConnectWalletButton', () => ({
  default: () => <div>ConnectWalletButton</div>,
}));

vi.mock('../LanguageSwitcher', () => ({
  default: () => <div>LanguageSwitcher</div>,
}));

vi.mock('../ThemeSwitcher', () => ({
  default: () => <div>ThemeSwitcher</div>,
}));

vi.mock('../FontSwitcher', () => ({
  default: () => <div>FontSwitcher</div>,
}));

const toggleModeratorMode = vi.fn();
const setShowCrisisModal = vi.fn();

vi.mock('../../../lib/store', () => ({
  useStore: () => ({
    studentId: 'test-student',
    isModerator: true,
    toggleModeratorMode,
    setShowCrisisModal,
  }),
}));

const baseLayout: LayoutContextValue = {
  breakpoint: 'desktop',
  orientation: 'landscape',
  width: 1440,
  height: 900,
};

const renderNavbar = (initialEntries: string[] = ['/feed'], layoutOverrides: Partial<LayoutContextValue> = {}) => {
  const layoutValue = { ...baseLayout, ...layoutOverrides };
  return render(
    <ResponsiveLayoutContext.Provider value={layoutValue}>
      <MemoryRouter initialEntries={initialEntries}>
        <Navbar />
      </MemoryRouter>
    </ResponsiveLayoutContext.Provider>
  );
};

describe('Navbar navigation behavior', () => {
  it('highlights the active route in the desktop navigation bar', async () => {
    renderNavbar(['/communities']);

    const communitiesLink = await screen.findByRole('link', { name: /communities/i });
    expect(communitiesLink).toHaveAttribute('aria-current', 'page');

    const textNode = within(communitiesLink).getByText(/communities/i);
    expect(textNode.className).toContain('text-info');
  });

  it('toggles the navigation drawer from the hamburger button', async () => {
    const user = userEvent.setup();
    renderNavbar(['/feed']);

    const openButton = screen.getByRole('button', { name: /open menu/i });
    await user.click(openButton);

    const drawer = await screen.findByRole('dialog', { name: /main navigation/i });
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: /feed/i })).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close menu/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /main navigation/i })).not.toBeInTheDocument();
    });
  });
});
