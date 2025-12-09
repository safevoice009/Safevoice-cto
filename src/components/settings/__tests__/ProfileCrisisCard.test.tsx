import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProfileCrisisCard from '../ProfileCrisisCard';
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

describe('ProfileCrisisCard', () => {
  const mockSetTrustedContact = vi.fn();
  const mockContact = { name: 'John Doe', phone: '1234567890', email: 'john@example.com' };
  
  const defaultStore = {
    trustedContacts: [mockContact],
    setTrustedContact: mockSetTrustedContact,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useStore as any).mockImplementation((selector: any) => selector(defaultStore));
  });

  it('renders primary contact details', () => {
    render(<ProfileCrisisCard />);
    expect(screen.getByText('Trusted Contact')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows empty state when no contact', () => {
    const emptyStore = { ...defaultStore, trustedContacts: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useStore as any).mockImplementation((selector: any) => selector(emptyStore));
    
    render(<ProfileCrisisCard />);
    expect(screen.getByText('No trusted contact set')).toBeInTheDocument();
    expect(screen.getByText('Add Contact')).toBeInTheDocument();
  });

  it('enters edit mode on click', () => {
    render(<ProfileCrisisCard />);
    const editBtn = screen.getByLabelText('Edit contact');
    fireEvent.click(editBtn);
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
  });

  it('validates required fields', () => {
    render(<ProfileCrisisCard />);
    fireEvent.click(screen.getByLabelText('Edit contact'));
    
    const nameInput = screen.getByPlaceholderText('Contact Name');
    fireEvent.change(nameInput, { target: { value: '' } }); // clear name
    
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(mockSetTrustedContact).not.toHaveBeenCalled();
  });

  it('saves changes', () => {
    render(<ProfileCrisisCard />);
    fireEvent.click(screen.getByLabelText('Edit contact'));
    
    const nameInput = screen.getByPlaceholderText('Contact Name');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    
    fireEvent.click(screen.getByText('Save'));
    expect(mockSetTrustedContact).toHaveBeenCalledWith({
      name: 'Jane Doe',
      phone: '1234567890',
      email: 'john@example.com',
    });
  });

  it('cancels edit', () => {
    render(<ProfileCrisisCard />);
    fireEvent.click(screen.getByLabelText('Edit contact'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Contact Name')).not.toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
