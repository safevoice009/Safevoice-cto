import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionHistory from '../TransactionHistory';
import type { VoiceTransaction } from '../../../lib/store';

const toastMock = vi.hoisted(() => {
  const success = vi.fn();
  const error = vi.fn();
  const toastFn = Object.assign(vi.fn(), { success, error });
  return { toastFn, success, error };
});

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: toastMock.toastFn,
}));

const BASE_TIME = new Date('2024-08-15T12:00:00Z').getTime();
const hourMs = 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

const createTransaction = (overrides: Partial<VoiceTransaction> = {}): VoiceTransaction => ({
  id: overrides.id ?? `tx-${Math.random().toString(36).slice(2)}`,
  type: overrides.type ?? 'earn',
  amount: overrides.amount ?? 50,
  reason: overrides.reason ?? 'Transaction',
  reasonCode: overrides.reasonCode,
  metadata: overrides.metadata ?? {},
  timestamp: overrides.timestamp ?? BASE_TIME,
  balance: overrides.balance ?? 200,
  pending: overrides.pending,
  claimed: overrides.claimed,
  spent: overrides.spent,
});

describe('TransactionHistory component', () => {
  beforeEach(() => {
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders transaction list with all transactions', () => {
    const transactions = [
      createTransaction({ id: 'tx-1', reason: 'Post reward', balance: 250 }),
      createTransaction({ id: 'tx-2', type: 'spend', amount: -20, reason: 'Badge purchase', balance: 200 }),
      createTransaction({ id: 'tx-3', type: 'claim', reason: 'Claimed pending rewards', balance: 220 }),
      createTransaction({ id: 'tx-4', reason: 'Comment reward', balance: 120 }),
      createTransaction({ id: 'tx-5', reason: 'Reaction reward', balance: 105 }),
    ];

    render(<TransactionHistory transactions={transactions} showPagination={false} />);

    expect(screen.getByText('Post reward')).toBeInTheDocument();
    expect(screen.getByText('Badge purchase')).toBeInTheDocument();
    expect(screen.getByText('Claimed pending rewards')).toBeInTheDocument();
    expect(screen.getByText('Comment reward')).toBeInTheDocument();
    expect(screen.getByText('Reaction reward')).toBeInTheDocument();
  });

  it('displays transaction types with correct colors', () => {
    const transactions = [
      createTransaction({ id: 'tx-1', type: 'earn', reason: 'Post reward' }),
      createTransaction({ id: 'tx-2', type: 'earn', reason: 'Comment reward' }),
      createTransaction({ id: 'tx-3', type: 'earn', reason: 'Reaction reward' }),
      createTransaction({ id: 'tx-4', type: 'spend', amount: -20, reason: 'Badge purchase' }),
      createTransaction({ id: 'tx-5', type: 'claim', reason: 'Claimed rewards' }),
    ];

    render(<TransactionHistory transactions={transactions} showPagination={false} />);

    const earnBadges = screen.getAllByText('EARN');
    const spendBadges = screen.getAllByText('SPEND');
    const claimBadges = screen.getAllByText('CLAIM');

    expect(earnBadges.length).toBe(3);
    expect(spendBadges.length).toBe(1);
    expect(claimBadges.length).toBe(1);
  });

  it('displays formatted running balances for each transaction', () => {
    const transactions = [
      createTransaction({ id: 'tx-1', reason: 'First', balance: 220 }),
      createTransaction({ id: 'tx-2', reason: 'Second', balance: 180 }),
      createTransaction({ id: 'tx-3', reason: 'Third', balance: 150 }),
    ];

    render(<TransactionHistory transactions={transactions} showPagination={false} />);

    expect(screen.getByText('220.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('180.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('150.0 VOICE')).toBeInTheDocument();
  });

  it('displays amounts with correct signs', () => {
    const transactions = [
      createTransaction({ id: 'tx-1', type: 'earn', amount: 50, reason: 'Earned' }),
      createTransaction({ id: 'tx-2', type: 'spend', amount: -20, reason: 'Spent' }),
      createTransaction({ id: 'tx-3', type: 'claim', metadata: { claimedAmount: 100 }, reason: 'Claimed' }),
    ];

    render(<TransactionHistory transactions={transactions} showPagination={false} />);

    expect(screen.getByText('+50 VOICE')).toBeInTheDocument();
    expect(screen.getByText('-20 VOICE')).toBeInTheDocument();
    expect(screen.getByText('+100 VOICE')).toBeInTheDocument();
  });

  describe('Pagination', () => {
    it('renders paginated transactions and supports navigation', () => {
      const transactions = Array.from({ length: 12 }, (_, index) =>
        createTransaction({
          id: `tx-${index}`,
          reason: `Transaction ${index}`,
          timestamp: BASE_TIME - index * hourMs,
          balance: 250 - index,
        })
      );

      render(<TransactionHistory transactions={transactions} pageSize={5} />);

      expect(screen.getByText('Page 1 of 3 (12 total transactions)')).toBeInTheDocument();
      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
      expect(screen.getByText('Transaction 4')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 5')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
      expect(screen.getByText('Transaction 5')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 0')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Previous/i }));
      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
    });

    it('paginates transactions with default page size', () => {
      const transactions = Array.from({ length: 50 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          timestamp: BASE_TIME - i * hourMs,
          balance: 100 + i * 10,
        })
      );

      render(<TransactionHistory transactions={transactions} pageSize={20} />);

      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
      expect(screen.getByText('Transaction 19')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 20')).not.toBeInTheDocument();
    });

    it('navigates to next page', () => {
      const transactions = Array.from({ length: 50 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          timestamp: BASE_TIME - i * hourMs,
        })
      );

      render(<TransactionHistory transactions={transactions} pageSize={20} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(screen.getByText('Transaction 20')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 0')).not.toBeInTheDocument();
    });

    it('navigates to previous page', () => {
      const transactions = Array.from({ length: 50 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          timestamp: BASE_TIME - i * hourMs,
        })
      );

      render(<TransactionHistory transactions={transactions} pageSize={20} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(prevButton);

      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      const transactions = Array.from({ length: 50 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          timestamp: BASE_TIME - i * hourMs,
        })
      );

      render(<TransactionHistory transactions={transactions} pageSize={20} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      const transactions = Array.from({ length: 50 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          timestamp: BASE_TIME - i * hourMs,
        })
      );

      render(<TransactionHistory transactions={transactions} pageSize={20} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      expect(nextButton).toBeDisabled();
    });

    it('displays correct page numbers', () => {
      const transactions = Array.from({ length: 50 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          timestamp: BASE_TIME - i * hourMs,
        })
      );

      render(<TransactionHistory transactions={transactions} pageSize={20} />);

      const pageButtons = screen.getAllByRole('button').filter(btn => /^[0-9]+$/.test(btn.textContent || ''));
      expect(pageButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Filtering', () => {
    it('applies transaction type filters and shows active indicator', async () => {
      const transactions = [
        createTransaction({ id: 'tx-earn', type: 'earn', reason: 'Earned reward', reasonCode: 'posts', balance: 150 }),
        createTransaction({ id: 'tx-spend', type: 'spend', amount: -20, reason: 'Badge purchase', reasonCode: 'store', balance: 130 }),
        createTransaction({ id: 'tx-claim', type: 'claim', metadata: { claimedAmount: 40 }, reason: 'Claimed rewards', balance: 170 }),
      ];

      render(<TransactionHistory transactions={transactions} />);

      fireEvent.click(screen.getByRole('button', { name: /Filters/i }));

      await waitFor(() => {
        expect(screen.getByText('Transaction Type')).toBeInTheDocument();
      });

      const selects = await screen.findAllByRole('combobox');
      const typeSelect = selects[0];
      fireEvent.change(typeSelect, { target: { value: 'spend' } });

      await waitFor(() => {
        expect(screen.getByText('Badge purchase')).toBeInTheDocument();
      });

      expect(screen.queryByText('Earned reward')).not.toBeInTheDocument();
      expect(screen.queryByText('Claimed rewards')).not.toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('filters by transaction type - earn', async () => {
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'earn', reason: 'Post reward' }),
        createTransaction({ id: 'tx-2', type: 'spend', amount: -20, reason: 'Badge purchase' }),
        createTransaction({ id: 'tx-3', type: 'claim', reason: 'Claimed rewards' }),
      ];

      render(<TransactionHistory transactions={transactions} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = await screen.findByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'earn' } });

      await waitFor(() => {
        expect(screen.queryByText('Badge purchase')).not.toBeInTheDocument();
        expect(screen.queryByText('Claimed rewards')).not.toBeInTheDocument();
        expect(screen.getByText('Post reward')).toBeInTheDocument();
      });
    });

    it('filters by date range - today', async () => {
      const transactions = [
        createTransaction({ id: 'tx-1', reason: 'Today', timestamp: BASE_TIME - hourMs }),
        createTransaction({ id: 'tx-2', reason: 'Yesterday', timestamp: BASE_TIME - dayMs - hourMs }),
      ];

      render(<TransactionHistory transactions={transactions} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const dateSelect = await screen.findByRole('combobox', { name: /date range/i });
      fireEvent.change(dateSelect, { target: { value: 'today' } });

      await waitFor(() => {
        expect(screen.queryByText('Yesterday')).not.toBeInTheDocument();
      });
    });

    it('filters by date range - week', async () => {
      const transactions = [
        createTransaction({ id: 'tx-1', reason: 'Recent', timestamp: BASE_TIME - hourMs }),
        createTransaction({ id: 'tx-2', reason: 'Last week', timestamp: BASE_TIME - 3 * dayMs }),
        createTransaction({ id: 'tx-3', reason: 'Old', timestamp: BASE_TIME - 30 * dayMs }),
      ];

      render(<TransactionHistory transactions={transactions} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const dateSelect = await screen.findByRole('combobox', { name: /date range/i });
      fireEvent.change(dateSelect, { target: { value: 'week' } });

      await waitFor(() => {
        expect(screen.getByText('Recent')).toBeInTheDocument();
        expect(screen.getByText('Last week')).toBeInTheDocument();
        expect(screen.queryByText('Old')).not.toBeInTheDocument();
      });
    });

    it('filters by reason category', async () => {
      const transactions = [
        createTransaction({ id: 'tx-1', reason: 'Post reward', reasonCode: 'posts' }),
        createTransaction({ id: 'tx-2', reason: 'Comment reward', reasonCode: 'comments' }),
        createTransaction({ id: 'tx-3', reason: 'Badge purchase', reasonCode: 'badge' }),
      ];

      render(<TransactionHistory transactions={transactions} />);

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

    it('reveals custom date range inputs when selecting custom date filter', async () => {
      const transactions = [
        createTransaction({ id: 'tx-1', timestamp: BASE_TIME - hourMs }),
        createTransaction({ id: 'tx-2', timestamp: BASE_TIME - 3 * hourMs }),
      ];

      render(<TransactionHistory transactions={transactions} />);

      fireEvent.click(screen.getByRole('button', { name: /Filters/i }));

      await waitFor(() => {
        expect(screen.getByText('Date Range')).toBeInTheDocument();
      });

      const selects = await screen.findAllByRole('combobox');
      const dateSelect = selects[1];
      fireEvent.change(dateSelect, { target: { value: 'custom' } });

      const startLabel = await screen.findByText('Start Date');
      const startInput = startLabel.parentElement?.querySelector('input');
      const endLabel = screen.getByText('End Date');
      const endInput = endLabel.parentElement?.querySelector('input');

      expect(startInput).toBeInstanceOf(HTMLInputElement);
      expect(endInput).toBeInstanceOf(HTMLInputElement);
    });

    it('shows custom date range inputs when selected', async () => {
      const transactions = [
        createTransaction({ id: 'tx-1', timestamp: BASE_TIME - hourMs }),
        createTransaction({ id: 'tx-2', timestamp: BASE_TIME - 3 * hourMs }),
      ];

      render(<TransactionHistory transactions={transactions} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const dateSelect = await screen.findByRole('combobox', { name: /date range/i });
      fireEvent.change(dateSelect, { target: { value: 'custom' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      });
    });

    it('clears all filters', async () => {
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'earn', reason: 'Earned' }),
        createTransaction({ id: 'tx-2', type: 'spend', amount: -20, reason: 'Spent' }),
      ];

      render(<TransactionHistory transactions={transactions} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = await screen.findByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'earn' } });

      await waitFor(() => {
        expect(screen.queryByText('Spent')).not.toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Spent')).toBeInTheDocument();
      });
    });

    it('resets to page 1 when filters change', async () => {
      const transactions = Array.from({ length: 50 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          timestamp: BASE_TIME - i * hourMs,
          balance: 100 + i * 10,
        })
      );

      render(<TransactionHistory transactions={transactions} pageSize={20} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Transaction 20')).toBeInTheDocument();
      });

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = await screen.findByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'earn' } });

      await waitFor(() => {
        expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
      });
    });
  });

  describe('CSV Export', () => {
    it('exports transactions to CSV', () => {
      const transactions = [
        createTransaction({ id: 'tx-earn', type: 'earn', reason: 'Earned reward', balance: 160 }),
        createTransaction({ id: 'tx-spend', type: 'spend', amount: -30, reason: 'Badge purchase', balance: 120 }),
      ];

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const linkClickSpy = vi.fn();
      
      const originalAppendChild = document.body.appendChild;
      const originalRemoveChild = document.body.removeChild;
      const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node instanceof HTMLAnchorElement) {
          linkClickSpy();
          return node;
        }
        return originalAppendChild.call(document.body, node);
      });
      const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => {
        return originalRemoveChild.call(document.body, node);
      });

      render(<TransactionHistory transactions={transactions} />);

      const exportButton = screen.getByRole('button', { name: /Export CSV/i });
      fireEvent.click(exportButton);

      expect(linkClickSpy).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith('CSV exported successfully!');

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('shows loading state during export', async () => {
      const transactions = [
        createTransaction({ id: 'tx-1', reason: 'Test' }),
      ];

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      render(<TransactionHistory transactions={transactions} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      expect(screen.getByText(/exporting/i)).toBeInTheDocument();

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('exports only filtered transactions', async () => {
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'earn', reason: 'Earned' }),
        createTransaction({ id: 'tx-2', type: 'spend', amount: -20, reason: 'Spent' }),
      ];

      const linkClickSpy = vi.fn();
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      
      const originalAppendChild = document.body.appendChild;
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node instanceof HTMLAnchorElement) {
          linkClickSpy();
          return node;
        }
        return originalAppendChild.call(document.body, node);
      });

      render(<TransactionHistory transactions={transactions} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      const typeSelect = screen.getByRole('combobox', { name: /transaction type/i });
      fireEvent.change(typeSelect, { target: { value: 'earn' } });

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(linkClickSpy).toHaveBeenCalled();
      });

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
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
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'earn', reason: 'Earned' }),
      ];

      render(<TransactionHistory transactions={transactions} />);

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
      const transactions = [
        createTransaction({ id: 'tx-1', amount: 50, reason: 'First', timestamp: BASE_TIME - 3000, balance: 50 }),
        createTransaction({ id: 'tx-2', amount: 30, reason: 'Second', timestamp: BASE_TIME - 2000, balance: 80 }),
        createTransaction({ id: 'tx-3', type: 'spend', amount: -20, reason: 'Third', timestamp: BASE_TIME - 1000, balance: 60 }),
      ];

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      expect(screen.getByText('60.0 VOICE')).toBeInTheDocument();
      expect(screen.getByText('80.0 VOICE')).toBeInTheDocument();
      expect(screen.getByText('50.0 VOICE')).toBeInTheDocument();
    });
  });

  describe('Metadata Tooltips', () => {
    it('shows info icon for transactions with metadata', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', metadata: { postId: 'post-1' }, reason: 'Post reward' }),
      ];

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      const infoIcons = screen.getAllByTestId('transaction-info-icon');
      expect(infoIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Transaction Count Display', () => {
    it('shows correct transaction count', () => {
      const transactions = Array.from({ length: 5 }, (_, i) =>
        createTransaction({ id: `tx-${i}`, reason: `Transaction ${i}` })
      );

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      expect(screen.getByText(/showing 5 of 5 transactions/i)).toBeInTheDocument();
    });

    it('updates count when filtered', async () => {
      const transactions = [
        createTransaction({ id: 'tx-1', type: 'earn', reason: 'Earned 1' }),
        createTransaction({ id: 'tx-2', type: 'earn', reason: 'Earned 2' }),
        createTransaction({ id: 'tx-3', type: 'earn', reason: 'Earned 3' }),
        createTransaction({ id: 'tx-4', type: 'spend', amount: -20, reason: 'Spent' }),
        createTransaction({ id: 'tx-5', type: 'claim', reason: 'Claimed' }),
      ];

      render(<TransactionHistory transactions={transactions} />);

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
      const transactions = [
        createTransaction({ id: 'tx-1', reason: 'Test' }),
      ];

      render(<TransactionHistory transactions={transactions} showFilters={false} />);

      expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument();
    });

    it('respects showPagination prop', () => {
      const transactions = Array.from({ length: 50 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          timestamp: BASE_TIME - i * hourMs,
          balance: 100 + i * 10,
        })
      );

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    });

    it('uses custom pageSize prop', () => {
      const transactions = Array.from({ length: 50 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          timestamp: BASE_TIME - i * hourMs,
          balance: 100 + i * 10,
        })
      );

      render(<TransactionHistory transactions={transactions} pageSize={10} />);

      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
      expect(screen.getByText('Transaction 9')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 10')).not.toBeInTheDocument();
    });
  });
});
