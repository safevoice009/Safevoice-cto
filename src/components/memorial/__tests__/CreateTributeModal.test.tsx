import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateTributeModal from '../CreateTributeModal';
import { useStore } from '../../../lib/store';

vi.mock('../../../lib/store', () => ({
  useStore: vi.fn(),
}));

describe('CreateTributeModal', () => {
  const mockCreateTribute = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTribute.mockReturnValue(true);
    
    (useStore as unknown as jest.Mock).mockImplementation(
      (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          createTribute: mockCreateTribute,
        };
        if (selector) {
          return selector(state as Record<string, unknown>);
        }
        return state;
      }
    );
  });

  describe('Modal Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<CreateTributeModal isOpen={false} onClose={mockOnClose} />);
      
      expect(screen.queryByRole('heading', { name: /Create Tribute/i })).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByRole('heading', { name: /Create Tribute/i })).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('should display all required fields', () => {
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByLabelText(/Name of the person/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tribute message/i)).toBeInTheDocument();
    });

    it('should display optional fields', () => {
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByLabelText(/Date of remembrance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/College affiliation/i)).toBeInTheDocument();
    });

    it('should show character counter for name field', () => {
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('0/100 characters')).toBeInTheDocument();
    });

    it('should show character counter for message field', () => {
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText(/0\/600 characters \(min\. 10\)/i)).toBeInTheDocument();
    });

    it('should update character counter as user types', async () => {
      const user = userEvent.setup();
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/Name of the person/i);
      await user.type(nameInput, 'John');
      
      await waitFor(() => {
        expect(screen.getByText('4/100 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('should disable submit button when fields are empty', () => {
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const submitButton = screen.getByRole('button', { name: /Create Tribute/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when required fields are filled', async () => {
      const user = userEvent.setup();
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/Name of the person/i);
      const messageInput = screen.getByLabelText(/Tribute message/i);
      
      await user.type(nameInput, 'John Doe');
      await user.type(messageInput, 'A heartfelt tribute message');
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /^Create Tribute$/i });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should show error for message under 10 characters', async () => {
      const user = userEvent.setup();
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/Name of the person/i);
      const messageInput = screen.getByLabelText(/Tribute message/i);
      
      await user.type(nameInput, 'John Doe');
      await user.type(messageInput, 'Short');
      
      const submitButton = screen.getByRole('button', { name: /^Create Tribute$/i });
      await user.click(submitButton);
      
      expect(await screen.findByText('Message must be at least 10 characters')).toBeInTheDocument();
    });

    it('should show error when name is empty', async () => {
      const user = userEvent.setup();
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const messageInput = screen.getByLabelText(/Tribute message/i);
      await user.type(messageInput, 'A heartfelt tribute message');
      
      const submitButton = screen.getByRole('button', { name: /^Create Tribute$/i });
      await user.click(submitButton);
      
      expect(await screen.findByText('Person name is required')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call createTribute with correct parameters', async () => {
      const user = userEvent.setup();
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/Name of the person/i);
      const messageInput = screen.getByLabelText(/Tribute message/i);
      
      await user.type(nameInput, 'John Doe');
      await user.type(messageInput, 'A heartfelt tribute message');
      
      const submitButton = screen.getByRole('button', { name: /^Create Tribute$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateTribute).toHaveBeenCalledWith(
          'John Doe',
          'A heartfelt tribute message',
          undefined,
          undefined
        );
      });
    });

    it('should include optional fields when provided', async () => {
      const user = userEvent.setup();
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/Name of the person/i);
      const messageInput = screen.getByLabelText(/Tribute message/i);
      const dateInput = screen.getByLabelText(/Date of remembrance/i);
      const collegeInput = screen.getByLabelText(/College affiliation/i);
      
      await user.type(nameInput, 'John Doe');
      await user.type(messageInput, 'A heartfelt tribute message');
      await user.type(dateInput, '2024-01-15');
      await user.type(collegeInput, 'MIT');
      
      const submitButton = screen.getByRole('button', { name: /^Create Tribute$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateTribute).toHaveBeenCalledWith(
          'John Doe',
          'A heartfelt tribute message',
          '2024-01-15',
          'MIT'
        );
      });
    });

    it('should close modal after successful submission', async () => {
      const user = userEvent.setup();
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/Name of the person/i);
      const messageInput = screen.getByLabelText(/Tribute message/i);
      
      await user.type(nameInput, 'John Doe');
      await user.type(messageInput, 'A heartfelt tribute message');
      
      const submitButton = screen.getByRole('button', { name: /^Create Tribute$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/Name of the person/i) as HTMLInputElement;
      const messageInput = screen.getByLabelText(/Tribute message/i) as HTMLTextAreaElement;
      
      await user.type(nameInput, 'John Doe');
      await user.type(messageInput, 'A heartfelt tribute message');
      
      const submitButton = screen.getByRole('button', { name: /^Create Tribute$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(nameInput.value).toBe('');
        expect(messageInput.value).toBe('');
      });
    });
  });

  describe('Edit Warning', () => {
    it('should show edit warning when tribute has cosigners', () => {
      const tributeToEdit = {
        id: 'tribute-1',
        personName: 'John Doe',
        message: 'Original message',
        cosigners: [
          { peerId: 'peer1' }
        ]
      };
      
      render(
        <CreateTributeModal 
          isOpen={true} 
          onClose={mockOnClose}
          tributeToEdit={tributeToEdit}
        />
      );
      
      expect(screen.getByText('Editing will clear signatures')).toBeInTheDocument();
      expect(screen.getByText(/This tribute has cosigner signatures/i)).toBeInTheDocument();
    });

    it('should not show edit warning when tribute has no cosigners', () => {
      const tributeToEdit = {
        id: 'tribute-1',
        personName: 'John Doe',
        message: 'Original message',
        cosigners: []
      };
      
      render(
        <CreateTributeModal 
          isOpen={true} 
          onClose={mockOnClose}
          tributeToEdit={tributeToEdit}
        />
      );
      
      expect(screen.queryByText('Editing will clear signatures')).not.toBeInTheDocument();
    });

    it('should populate form with existing tribute data', () => {
      const tributeToEdit = {
        id: 'tribute-1',
        personName: 'John Doe',
        message: 'Original message',
        dateOfRemembrance: '2024-01-15',
        college: 'MIT'
      };
      
      render(
        <CreateTributeModal 
          isOpen={true} 
          onClose={mockOnClose}
          tributeToEdit={tributeToEdit}
        />
      );
      
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Original message')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('MIT')).toBeInTheDocument();
    });
  });

  describe('Consensus Information', () => {
    it('should display consensus requirement information', () => {
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('🕊️ Consensus Required')).toBeInTheDocument();
      expect(screen.getByText(/3 cosigner signatures/i)).toBeInTheDocument();
      expect(screen.getByText(/\+20 VOICE/i)).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateTributeModal isOpen={true} onClose={mockOnClose} />);
      
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('svg'));
      
      if (xButton) {
        await user.click(xButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});
