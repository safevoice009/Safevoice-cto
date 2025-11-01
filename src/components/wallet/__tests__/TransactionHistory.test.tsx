import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock, MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionHistory from '../TransactionHistory';
import type { VoiceTransaction } from '../../../lib/store';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => {
  const success = vi.fn();
  const error = vi.fn();
  const toastFn = Object.assign(vi.fn(), { success, error });
  return {
    __esModule: true,
    default: toastFn,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TransactionHistory', () => {
  let mockTransactions: VoiceTransaction[];
  const now = Date.now();

  beforeEach(() => {
    mockTransactions = [
      {
        id: 'tx-1',
        type: 'earn',
        amount: 50,
        reason: 'Post reward',
        reasonCode: 'posts',
        metadata: { postId: 'post-1' },
        timestamp: now - 3600000, // 1 hour ago
        balance: 250,
        pending: 30,
      },
      {
        id: 'tx-2',
        type: 'spend',
        amount: -20,
        reason: 'Badge purchase',
        reasonCode: 'badge',
        metadata: { badgeId: 'badge-1' },
        timestamp: now - 7200000, // 2 hours ago
        balance: 200,
        spent: 20,
      },
      {
        id: 'tx-3',
        type: 'claim',
        amount: 0,
        reason: 'Claimed pending rewards',
        reasonCode: 'claim_rewards',
        metadata: { claimedAmount: 100 },
        timestamp: now - 86400000, // 1 day ago
        balance: 220,
        claimed: 100,
      },
      {
        id: 'tx-4',
        type: 'earn',
        amount: 15,
        reason: 'Comment reward',
        reasonCode: 'comments',
        metadata: { commentId: 'comment-1' },
        timestamp: now - 172800000, // 2 days ago
        balance: 120,
        pending: 15,
      },
      {
        id: 'tx-5',
        type: 'earn',
        amount: 10,
        reason: 'Reaction reward',
        reasonCode: 'reactions',
        metadata: { reactionType: 'heart' },
        timestamp: now - 259200000, // 3 days ago
        balance: 105,
        pending: 10,
      },
    ];
  });

  it('renders transaction list with all transactions', () => {
    render(<TransactionHistory transactions={mockTransactions} showPagination={false} />);

    expect(screen.getByText('Post reward')).toBeInTheDocument();
    expect(screen.getByText('Badge purchase')).toBeInTheDocument();
    expect(screen.getByText('Claimed pending rewards')).toBeInTheDocument();
    expect(screen.getByText('Comment reward')).toBeInTheDocument();
    expect(screen.getByText('Reaction reward')).toBeInTheDocument();
  });

  it('displays transaction types with correct colors', () => {
    render(<TransactionHistory transactions={mockTransactions} showPagination={false} />);

    const earnBadges = screen.getAllByText('EARN');
    const spendBadges = screen.getAllByText('SPEND');
    const claimBadges = screen.getAllByText('CLAIM');

    expect(earnBadges.length).toBe(3);
    expect(spendBadges.length).toBe(1);
    expect(claimBadges.length).toBe(1);
  });

  it('shows running balance for each transaction', () => {
    render(<TransactionHistory transactions={mockTransactions} showPagination={false} />);

    expect(screen.getByText('250.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('200.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('220.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('120.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('105.0 VOICE')).toBeInTheDocument();
  });

  it('displays amounts with correct signs', () => {
    render(<TransactionHistory transactions={mockTransactions} showPagination={false} />);

    // Earn transactions should have + sign
    const earnAmounts = screen.getAllByText(/\+50 VOICE|\+15 VOICE|\+10 VOICE/);
    expect(earnAmounts.length).toBeGreaterThan(0);

    // Spend transactions should have - sign
    expect(screen.getByText('-20 VOICE')).toBeInTheDocument();

    // Claim transactions should show claimed amount
    expect(screen.getByText('+100 VOICE')).toBeInTheDocument();
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Create many transactions for pagination testing
      mockTransactions = Array.from({ length: 50 }, (_, i) => ({
        id: `tx-${i}`,
        type: 'earn' as const,
        amount: 10,
        reason: `Transaction ${i}`,
        reasonCode: 'posts',
        metadata: {},
        timestamp: now - i * 3600000,
        balance: 100 + i * 10,
      }));
    });

    it('paginates transactions with default page size', () => {
      render(<TransactionHistory transactions={mockTransactions} pageSize={20} />);

      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
      expect(screen.getByText('Transaction 19')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 20')).not.toBeInTheDocument();
    });

    it('navigates to next page', () => {
      render(<TransactionHistory transactions={mockTransactions} pageSize={20} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(screen.getByText('Transaction 20')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 0')).not.toBeInTheDocument();
    });

    it('navigates to previous page', () => {
      render(<TransactionHistory transactions={mockTransactions} pageSize={20} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(prevButton);

      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      render(<TransactionHistory transactions={mockTransactions} pageSize={20} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(<TransactionHistory transactions={mockTransactions} pageSize={20} />);

      // Navigate to last page (page 3)
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      expect(nextButton).toBeDisabled();
    });

    it('displays correct page numbers', () => {
      render(<TransactionHistory transactions={mockTransactions} pageSize={20} />);

      const pageButtons = screen.getAllByRole('button').filter(btn => /^[0-9]+$/.test(btn.textContent || ''));
      expect(pageButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Filtering', () => {
    it('filters by transaction type - earn', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = await screen.findByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'earn' } });

      await waitFor(() => {
        expect(screen.queryByText('Badge purchase')).not.toBeInTheDocument();
        expect(screen.queryByText('Claimed pending rewards')).not.toBeInTheDocument();
        expect(screen.getByText('Post reward')).toBeInTheDocument();
      });
    });

    it('filters by transaction type - spend', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = await screen.findByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'spend' } });

      await waitFor(() => {
        expect(screen.getByText('Badge purchase')).toBeInTheDocument();
        expect(screen.queryByText('Post reward')).not.toBeInTheDocument();
      });
    });

    it('filters by date range - today', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const dateSelect = await screen.findByRole('combobox', { name: /date range/i });
      fireEvent.change(dateSelect, { target: { value: 'today' } });

      await waitFor(() => {
        // Transactions older than today should not be visible
        expect(screen.queryByText('Claimed pending rewards')).not.toBeInTheDocument();
      });
    });

    it('filters by date range - week', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const dateSelect = await screen.findByRole('combobox', { name: /date range/i });
      fireEvent.change(dateSelect, { target: { value: 'week' } });

      await waitFor(() => {
        // Transactions within last week should be visible
        expect(screen.getByText('Post reward')).toBeInTheDocument();
        expect(screen.getByText('Badge purchase')).toBeInTheDocument();
        expect(screen.getByText('Claimed pending rewards')).toBeInTheDocument();
      });
    });

    it('filters by reason category', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const categorySelect = await screen.findByRole('combobox', { name: /category/i });
      fireEvent.change(categorySelect, { target: { value: 'posts' } });

      await waitFor(() => {
        expect(screen.getByText('Post reward')).toBeInTheDocument();
        expect(screen.queryByText('Badge purchase')).not.toBeInTheDocument();
        expect(screen.queryByText('Comment reward')).not.toBeInTheDocument();
      });
    });

    it('shows active filter indicator', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = await screen.findByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'earn' } });

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('clears all filters', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = await screen.findByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'earn' } });

      await waitFor(() => {
        expect(screen.queryByText('Badge purchase')).not.toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Badge purchase')).toBeInTheDocument();
      });
    });

    it('shows custom date range inputs when selected', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const dateSelect = await screen.findByRole('combobox', { name: /date range/i });
      fireEvent.change(dateSelect, { target: { value: 'custom' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      });
    });

    it('resets to page 1 when filters change', async () => {
      // Create enough transactions to have multiple pages
      const manyTransactions = Array.from({ length: 50 }, (_, i) => ({
        id: `tx-${i}`,
        type: 'earn' as const,
        amount: 10,
        reason: `Transaction ${i}`,
        reasonCode: 'posts',
        metadata: {},
        timestamp: now - i * 3600000,
        balance: 100 + i * 10,
      }));

      render(<TransactionHistory transactions={manyTransactions} pageSize={20} />);

      // Go to page 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Transaction 20')).toBeInTheDocument();
      });

      // Apply filter
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = await screen.findByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'earn' } });

      // Should be back on page 1
      await waitFor(() => {
        expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
      });
    });
  });

  describe('CSV Export', () => {
    let createElementSpy: MockInstance;
    let createObjectURLSpy: MockInstance;
    let revokeObjectURLSpy: MockInstance;
    let linkClickSpy: Mock;

    beforeEach(() => {
      linkClickSpy = vi.fn();
      const originalCreateElement = document.createElement.bind(document) as (
        tagName: string,
        options?: ElementCreationOptions
      ) => HTMLElement;

      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(
        (tagName: string, options?: ElementCreationOptions) => {
          const element = originalCreateElement(tagName, options);
          if (tagName === 'a') {
            Object.defineProperty(element, 'click', {
              value: linkClickSpy,
              writable: true,
            });
          }
          return element;
        }
      );

      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      createElementSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('exports transactions to CSV', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 3)} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(linkClickSpy).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('CSV exported successfully!');
      });
    });

    it('shows loading state during export', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 3)} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      expect(screen.getByText(/exporting/i)).toBeInTheDocument();
    });

    it('exports only filtered transactions', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = screen.getByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'earn' } });

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(linkClickSpy).toHaveBeenCalled();
      });
    });

    it('disables export when no transactions', () => {
      render(<TransactionHistory transactions={[]} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no transactions', () => {
      render(<TransactionHistory transactions={[]} />);

      expect(screen.getByText('No transactions found')).toBeInTheDocument();
      expect(screen.getByText(/start earning voice/i)).toBeInTheDocument();
    });

    it('shows filter-specific empty state', () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 3)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = screen.getByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'spend' } });

      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      fireEvent.change(categorySelect, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No transactions found')).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
    });
  });

  describe('Running Balance Calculations', () => {
    it('displays correct running balance after each transaction', () => {
      const transactions: VoiceTransaction[] = [
        {
          id: 'tx-1',
          type: 'earn',
          amount: 50,
          reason: 'First transaction',
          metadata: {},
          timestamp: now - 3000,
          balance: 50,
        },
        {
          id: 'tx-2',
          type: 'earn',
          amount: 30,
          reason: 'Second transaction',
          metadata: {},
          timestamp: now - 2000,
          balance: 80,
        },
        {
          id: 'tx-3',
          type: 'spend',
          amount: -20,
          reason: 'Third transaction',
          metadata: {},
          timestamp: now - 1000,
          balance: 60,
        },
      ];

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      expect(screen.getByText('60.0 VOICE')).toBeInTheDocument();
      expect(screen.getByText('80.0 VOICE')).toBeInTheDocument();
      expect(screen.getByText('50.0 VOICE')).toBeInTheDocument();
    });
  });

  describe('Metadata Tooltips', () => {
    it('shows info icon for transactions with metadata', () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 1)} showPagination={false} />);

      const infoIcons = screen.getAllByTestId('transaction-info-icon');
      expect(infoIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Transaction Count Display', () => {
    it('shows correct transaction count', () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} showPagination={false} />);

      expect(screen.getByText(/showing 5 of 5 transactions/i)).toBeInTheDocument();
    });

    it('updates count when filtered', async () => {
      render(<TransactionHistory transactions={mockTransactions.slice(0, 5)} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = await screen.findByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'earn' } });

      await waitFor(() => {
        expect(screen.getByText(/showing 3 of 3 transactions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Component Props', () => {
    it('respects showFilters prop', () => {
      render(<TransactionHistory transactions={mockTransactions} showFilters={false} />);

      expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument();
    });

    it('respects showPagination prop', () => {
      const manyTransactions = Array.from({ length: 50 }, (_, i) => ({
        id: `tx-${i}`,
        type: 'earn' as const,
        amount: 10,
        reason: `Transaction ${i}`,
        metadata: {},
        timestamp: now - i * 3600000,
        balance: 100 + i * 10,
      }));

      render(<TransactionHistory transactions={manyTransactions} showPagination={false} />);

      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    });

    it('uses custom pageSize prop', () => {
      const manyTransactions = Array.from({ length: 50 }, (_, i) => ({
        id: `tx-${i}`,
        type: 'earn' as const,
        amount: 10,
        reason: `Transaction ${i}`,
        metadata: {},
        timestamp: now - i * 3600000,
        balance: 100 + i * 10,
      }));

      render(<TransactionHistory transactions={manyTransactions} pageSize={10} />);

      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
      expect(screen.getByText('Transaction 9')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 10')).not.toBeInTheDocument();
    });
  });
});
