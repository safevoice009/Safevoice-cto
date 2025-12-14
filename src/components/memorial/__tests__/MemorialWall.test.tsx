import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MemorialWall from '../MemorialWall';
import { useStore, type MemorialTribute } from '../../../lib/store';

vi.mock('../../../lib/store', () => ({
  useStore: vi.fn(),
}));

describe('MemorialWall', () => {
  const mockLoadMemorialData = vi.fn();
  
  const createMockTribute = (id: string, overrides?: Partial<MemorialTribute>): MemorialTribute => ({
    id,
    createdBy: 'Student#1234',
    createdAt: Date.now() - 86400000,
    personName: `Person ${id}`,
    message: `Memorial message for ${id}`,
    candles: [],
    milestoneRewardAwarded: false,
    status: 'published',
    cosigners: [],
    auditTrail: [],
    honoreeHash: `hash-${id}`,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    
    (useStore as unknown as jest.Mock).mockImplementation(
      (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          memorialTributes: [],
          loadMemorialData: mockLoadMemorialData,
        };
        if (selector) {
          return selector(state as Record<string, unknown>);
        }
        return state;
      }
    );
  });

  describe('Initial Render', () => {
    it('should render memorial wall title', () => {
      render(<MemorialWall />);
      
      expect(screen.getByText('Memorial Wall')).toBeInTheDocument();
    });

    it('should display create tribute button', () => {
      render(<MemorialWall />);
      
      expect(screen.getByRole('button', { name: /Create Tribute/i })).toBeInTheDocument();
    });

    it('should call loadMemorialData on mount', () => {
      render(<MemorialWall />);
      
      expect(mockLoadMemorialData).toHaveBeenCalled();
    });

    it('should show welcome message on first visit', () => {
      render(<MemorialWall />);
      
      expect(screen.getByText('Welcome to the Memorial Wall')).toBeInTheDocument();
      expect(screen.getByText(/privacy-safe space/i)).toBeInTheDocument();
    });

    it('should not show welcome message on subsequent visits', () => {
      sessionStorage.setItem('safevoice_memorial_wall_visited', 'true');
      render(<MemorialWall />);
      
      expect(screen.queryByText('Welcome to the Memorial Wall')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no tributes exist', () => {
      render(<MemorialWall />);
      
      expect(screen.getByText('No tributes yet')).toBeInTheDocument();
      expect(screen.getByText(/Be the first to create a tribute/i)).toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    beforeEach(() => {
      const mockTributes = [
        createMockTribute('1'),
        createMockTribute('2'),
      ];

      (useStore as unknown as jest.Mock).mockImplementation(
        (selector: (state: Record<string, unknown>) => unknown) => {
          const state = {
            memorialTributes: mockTributes,
            loadMemorialData: mockLoadMemorialData,
          };
          if (selector) {
            return selector(state as Record<string, unknown>);
          }
          return state;
        }
      );
    });

    it('should default to grid view', () => {
      render(<MemorialWall />);
      
      const gridButton = screen.getByTitle('Grid view');
      expect(gridButton).toHaveClass('bg-primary');
    });

    it('should switch to timeline view when clicked', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const timelineButton = screen.getByTitle('Timeline view');
      await user.click(timelineButton);
      
      expect(timelineButton).toHaveClass('bg-primary');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      const mockTributes = [
        createMockTribute('1', { personName: 'John Doe', message: 'Loving memory' }),
        createMockTribute('2', { personName: 'Jane Smith', message: 'Forever remembered' }),
      ];

      (useStore as unknown as jest.Mock).mockImplementation(
        (selector: (state: Record<string, unknown>) => unknown) => {
          const state = {
            memorialTributes: mockTributes,
            loadMemorialData: mockLoadMemorialData,
          };
          if (selector) {
            return selector(state as Record<string, unknown>);
          }
          return state;
        }
      );
    });

    it('should filter tributes by person name', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const searchInput = screen.getByPlaceholderText(/Search by name or message/i);
      await user.type(searchInput, 'John');
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('should filter tributes by message content', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const searchInput = screen.getByPlaceholderText(/Search by name or message/i);
      await user.type(searchInput, 'Loving');
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should show no results message when search returns empty', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const searchInput = screen.getByPlaceholderText(/Search by name or message/i);
      await user.type(searchInput, 'NonexistentName');
      
      expect(screen.getByText('No tributes match your filters')).toBeInTheDocument();
    });
  });

  describe('College Filter', () => {
    beforeEach(() => {
      const mockTributes = [
        createMockTribute('1', { personName: 'Student A', college: 'MIT' }),
        createMockTribute('2', { personName: 'Student B', college: 'Stanford' }),
        createMockTribute('3', { personName: 'Student C', college: 'MIT' }),
      ];

      (useStore as unknown as jest.Mock).mockImplementation(
        (selector: (state: Record<string, unknown>) => unknown) => {
          const state = {
            memorialTributes: mockTributes,
            loadMemorialData: mockLoadMemorialData,
          };
          if (selector) {
            return selector(state as Record<string, unknown>);
          }
          return state;
        }
      );
    });

    it('should show filter button', () => {
      render(<MemorialWall />);
      
      expect(screen.getByRole('button', { name: /Filters/i })).toBeInTheDocument();
    });

    it('should expand filters when clicked', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/College/i)).toBeInTheDocument();
      });
    });

    it('should list available colleges in filter dropdown', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);
      
      await waitFor(() => {
        const collegeSelect = screen.getByLabelText(/College/i);
        expect(collegeSelect).toBeInTheDocument();
        
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(3);
        expect(screen.getByRole('option', { name: 'MIT' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Stanford' })).toBeInTheDocument();
      });
    });

    it('should filter tributes by selected college', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/College/i)).toBeInTheDocument();
      });
      
      const collegeSelect = screen.getByLabelText(/College/i);
      await user.selectOptions(collegeSelect, 'MIT');
      
      await waitFor(() => {
        expect(screen.getByText('Student A')).toBeInTheDocument();
        expect(screen.getByText('Student C')).toBeInTheDocument();
        expect(screen.queryByText('Student B')).not.toBeInTheDocument();
      });
    });

    it('should show active filter indicator', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/College/i)).toBeInTheDocument();
      });
      
      const collegeSelect = screen.getByLabelText(/College/i);
      await user.selectOptions(collegeSelect, 'MIT');
      
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should show result count when filters are active', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/College/i)).toBeInTheDocument();
      });
      
      const collegeSelect = screen.getByLabelText(/College/i);
      await user.selectOptions(collegeSelect, 'MIT');
      
      await waitFor(() => {
        expect(screen.getByText(/\(2 results\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Clear Filters', () => {
    beforeEach(() => {
      const mockTributes = [
        createMockTribute('1', { personName: 'Student A', college: 'MIT' }),
        createMockTribute('2', { personName: 'Student B', college: 'Stanford' }),
      ];

      (useStore as unknown as jest.Mock).mockImplementation(
        (selector: (state: Record<string, unknown>) => unknown) => {
          const state = {
            memorialTributes: mockTributes,
            loadMemorialData: mockLoadMemorialData,
          };
          if (selector) {
            return selector(state as Record<string, unknown>);
          }
          return state;
        }
      );
    });

    it('should show clear filters button when filters are active', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const searchInput = screen.getByPlaceholderText(/Search by name or message/i);
      await user.type(searchInput, 'Student');
      
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);
      
      expect(screen.getByRole('button', { name: /Clear all filters/i })).toBeInTheDocument();
    });

    it('should reset all filters when clear button clicked', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const searchInput = screen.getByPlaceholderText(/Search by name or message/i);
      await user.type(searchInput, 'Student A');
      
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);
      
      const clearButton = screen.getByRole('button', { name: /Clear all filters/i });
      await user.click(clearButton);
      
      await waitFor(() => {
        expect(screen.getByText('Student A')).toBeInTheDocument();
        expect(screen.getByText('Student B')).toBeInTheDocument();
      });
    });
  });

  describe('Create Tribute Modal', () => {
    it('should open modal when create button clicked', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const createButton = screen.getByRole('button', { name: /^Create Tribute$/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Name of the person/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Tribute Display', () => {
    beforeEach(() => {
      const mockTributes = [
        createMockTribute('1', { createdAt: Date.now() - 86400000 * 2 }),
        createMockTribute('2', { createdAt: Date.now() - 86400000 }),
      ];

      (useStore as unknown as jest.Mock).mockImplementation(
        (selector: (state: Record<string, unknown>) => unknown) => {
          const state = {
            memorialTributes: mockTributes,
            loadMemorialData: mockLoadMemorialData,
          };
          if (selector) {
            return selector(state as Record<string, unknown>);
          }
          return state;
        }
      );
    });

    it('should display tributes sorted by creation date (newest first)', () => {
      render(<MemorialWall />);
      
      const tributeCards = screen.getAllByText(/Person \d/);
      expect(tributeCards[0]).toHaveTextContent('Person 2');
      expect(tributeCards[1]).toHaveTextContent('Person 1');
    });

    it('should display all tributes in grid view', () => {
      render(<MemorialWall />);
      
      expect(screen.getByText('Person 1')).toBeInTheDocument();
      expect(screen.getByText('Person 2')).toBeInTheDocument();
    });
  });

  describe('Welcome Message Dismissal', () => {
    it('should dismiss welcome message when X button clicked', async () => {
      const user = userEvent.setup();
      render(<MemorialWall />);
      
      const welcomeHeading = screen.getByRole('heading', { name: /Welcome to the Memorial Wall/i });
      expect(welcomeHeading).toBeInTheDocument();
      
      const allButtons = screen.getAllByRole('button');
      const xButtons = allButtons.filter(btn => {
        return btn.className.includes('p-1') && btn.className.includes('rounded');
      });
      
      if (xButtons.length > 0) {
        const dismissButton = xButtons[xButtons.length - 1];
        await user.click(dismissButton);
        
        await waitFor(() => {
          expect(screen.queryByRole('heading', { name: /Welcome to the Memorial Wall/i })).not.toBeInTheDocument();
        }, { timeout: 3000 });
      }
    });
  });
});
