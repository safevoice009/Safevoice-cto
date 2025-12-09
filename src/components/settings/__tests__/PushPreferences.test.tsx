import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PushPreferences from '../PushPreferences';
import { useStore } from '../../../lib/store';

// Mock the store
vi.mock('../../../lib/store', () => ({
  useStore: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('PushPreferences', () => {
  const mockUpdateAlertPreference = vi.fn();
  
  const defaultStore = {
    alertPreferences: {
      messages: true,
      mentions: true,
      crisisAlerts: true,
      dailyDigest: false,
    },
    updateAlertPreference: mockUpdateAlertPreference,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useStore as any).mockImplementation((selector: any) => selector(defaultStore));
  });

  it('renders all preference toggles', () => {
    render(<PushPreferences />);
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Mentions')).toBeInTheDocument();
    expect(screen.getByText('Crisis Alerts')).toBeInTheDocument();
    expect(screen.getByText('Daily Digest')).toBeInTheDocument();
  });

  it('toggles preference when clicked', () => {
    render(<PushPreferences />);
    // Find switch for Messages
    const switches = screen.getAllByRole('switch');
    const messagesSwitch = switches[0];
    
    fireEvent.click(messagesSwitch);
    expect(mockUpdateAlertPreference).toHaveBeenCalledWith('messages', false);
  });

  it('shows Enable All when all are disabled', () => {
    const disabledStore = {
      ...defaultStore,
      alertPreferences: {
        messages: false,
        mentions: false,
        crisisAlerts: false,
        dailyDigest: false,
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useStore as any).mockImplementation((selector: any) => selector(disabledStore));
    
    render(<PushPreferences />);
    expect(screen.getByText('Enable All')).toBeInTheDocument();
  });

  it('shows Disable All when some are enabled', () => {
    // defaultStore has some enabled (actually all but dailyDigest)
    // wait, dailyDigest is false in defaultStore.
    // The code says: const allEnabled = preferences.every((p) => alertPreferences[p.key]);
    // If dailyDigest is false, allEnabled is false.
    // So it should show "Enable All" if ANY is disabled?
    // No, logic usually is:
    // If all are enabled -> "Disable All"
    // If some/all are disabled -> "Enable All"?
    // Let's check my implementation.
    
    // const allEnabled = preferences.every((p) => alertPreferences[p.key]);
    // {allEnabled ? 'Disable All' : 'Enable All'}
    
    // If dailyDigest is false (default), allEnabled is false. Text is "Enable All".
    
    // So my default store (dailyDigest: false) should show "Enable All".
    render(<PushPreferences />);
    expect(screen.getByText('Enable All')).toBeInTheDocument();
  });
  
  it('shows Disable All when ALL are enabled', () => {
     const allEnabledStore = {
      ...defaultStore,
      alertPreferences: {
        messages: true,
        mentions: true,
        crisisAlerts: true,
        dailyDigest: true,
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useStore as any).mockImplementation((selector: any) => selector(allEnabledStore));
    
    render(<PushPreferences />);
    expect(screen.getByText('Disable All')).toBeInTheDocument();
  });

  it('toggles all preferences', () => {
    // Default store: dailyDigest is false. So button says "Enable All".
    // Clicking it should set all to true.
    render(<PushPreferences />);
    const toggleAllBtn = screen.getByText('Enable All');
    
    fireEvent.click(toggleAllBtn);
    
    // Should call update for each key with TRUE
    expect(mockUpdateAlertPreference).toHaveBeenCalledTimes(4);
    expect(mockUpdateAlertPreference).toHaveBeenCalledWith('messages', true);
    expect(mockUpdateAlertPreference).toHaveBeenCalledWith('mentions', true);
    expect(mockUpdateAlertPreference).toHaveBeenCalledWith('crisisAlerts', true);
    expect(mockUpdateAlertPreference).toHaveBeenCalledWith('dailyDigest', true);
  });
});
