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

describe('TransactionHistory Edge Cases & CSV Export', () => {
  beforeEach(() => {
    toastMock.success.mockReset();
    toastMock.error.mockReset();

    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CSV Export Edge Cases', () => {
    it('handles empty transaction list', async () => {
      render(
        <TransactionHistory transactions={[]} showExport={true} />
      );

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await Promise.resolve();
      expect(toastMock.error).not.toHaveBeenCalled();
    });

    it('handles transactions with special characters in reason', async () => {
      const transactions = [
        createTransaction({
          reason: 'Test, with "quotes" and, commas',
          amount: 50,
        }),
        createTransaction({
          reason: 'Line\nbreak in reason',
          amount: 30,
        }),
        createTransaction({
          reason: "Apostrophe's test",
          amount: 20,
        }),
      ];

      render(<TransactionHistory transactions={transactions} showExport={true} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalled();
      });
    });

    it('handles transactions with undefined reasonCode', async () => {
      const transactions = [
        createTransaction({
          reason: 'Test transaction',
          reasonCode: undefined,
          amount: 50,
        }),
      ];

      render(<TransactionHistory transactions={transactions} showExport={true} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalled();
      });
    });

    it('handles transactions with null metadata fields', async () => {
      const transactions = [
        createTransaction({
          reason: 'Test',
          metadata: { claimedAmount: null },
          type: 'claim',
        }),
      ];

      render(<TransactionHistory transactions={transactions} showExport={true} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalled();
      });
    });

    it('handles very large transaction lists', async () => {
      const transactions = Array.from({ length: 1000 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          amount: i * 10,
          timestamp: BASE_TIME - i * 1000,
        })
      );

      render(<TransactionHistory transactions={transactions} showExport={true} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalled();
      });
    });

    it('handles transactions with very large amounts', async () => {
      const transactions = [
        createTransaction({
          amount: Number.MAX_SAFE_INTEGER,
          balance: Number.MAX_SAFE_INTEGER,
        }),
      ];

      render(<TransactionHistory transactions={transactions} showExport={true} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalled();
      });
    });

    it('handles transactions with negative amounts', async () => {
      const transactions = [
        createTransaction({
          type: 'spend',
          amount: -100,
          reason: 'Spent tokens',
        }),
      ];

      render(<TransactionHistory transactions={transactions} showExport={true} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalled();
      });
    });

    it('handles transactions with zero amounts', async () => {
      const transactions = [
        createTransaction({
          amount: 0,
          reason: 'Zero amount transaction',
        }),
      ];

      render(<TransactionHistory transactions={transactions} showExport={true} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalled();
      });
    });

    it('handles claim transactions with claimedAmount in metadata', async () => {
      const transactions = [
        createTransaction({
          type: 'claim',
          amount: 100,
          metadata: { claimedAmount: 150 },
          reason: 'Claimed rewards',
        }),
      ];

      render(<TransactionHistory transactions={transactions} showExport={true} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalled();
      });
    });

    it('handles CSV export with unicode characters', async () => {
      const transactions = [
        createTransaction({
          reason: 'Reward 🎉 emoji test',
          amount: 50,
        }),
        createTransaction({
          reason: '中文字符测试',
          amount: 30,
        }),
      ];

      render(<TransactionHistory transactions={transactions} showExport={true} />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalled();
      });
    });
  });

  describe('Date Filtering Edge Cases', () => {
    const now = Date.now();
    const transactions = [
      createTransaction({ id: 'tx-today', reason: 'Today', timestamp: now }),
      createTransaction({ id: 'tx-week', reason: 'Within week', timestamp: now - 3 * 24 * 60 * 60 * 1000 }),
      createTransaction({ id: 'tx-month', reason: 'Within month', timestamp: now - 20 * 24 * 60 * 60 * 1000 }),
      createTransaction({ id: 'tx-old', reason: 'Old', timestamp: now - 60 * 24 * 60 * 60 * 1000 }),
    ];

    it('renders without crashing when filters are visible', () => {
      render(<TransactionHistory transactions={transactions} showFilters={true} showPagination={false} />);
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Within week')).toBeInTheDocument();
      expect(screen.getByText('Within month')).toBeInTheDocument();
      expect(screen.getByText('Old')).toBeInTheDocument();
    });
  });

  describe('Display Edge Cases', () => {
    it('handles transaction with very long reason text', () => {
      const longReason = 'A'.repeat(500);
      const transactions = [
        createTransaction({ reason: longReason }),
      ];

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      expect(screen.getByText(longReason)).toBeInTheDocument();
    });

    it('handles transaction with empty reason', () => {
      const transactions = [
        createTransaction({ reason: '' }),
      ];

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      expect(screen.getByText('EARN')).toBeInTheDocument();
    });

    it('handles zero balance transactions', () => {
      const transactions = [
        createTransaction({ balance: 0, amount: 0 }),
      ];

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      expect(screen.getByText('0.0 VOICE')).toBeInTheDocument();
    });

    it('handles negative balance', () => {
      const transactions = [
        createTransaction({ balance: -100, amount: -150 }),
      ];

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      expect(screen.getByText('-100.0 VOICE')).toBeInTheDocument();
    });

    it('handles custom date range with valid dates', () => {
      const withinRange = new Date('2024-06-15').getTime();
      const outsideRange = new Date('2023-12-31').getTime();

      const transactions = [
        createTransaction({ id: 'tx-within', timestamp: withinRange, reason: 'Within range' }),
        createTransaction({ id: 'tx-outside', timestamp: outsideRange, reason: 'Outside range' }),
      ];

      render(<TransactionHistory transactions={transactions} showFilters={true} showPagination={false} />);

      expect(screen.getByText('Within range')).toBeInTheDocument();
      expect(screen.getByText('Outside range')).toBeInTheDocument();
    });

    it('handles empty custom date range', () => {
      const transactions = [
        createTransaction({ reason: 'Test transaction' }),
      ];

      render(<TransactionHistory transactions={transactions} showFilters={true} />);

      expect(screen.getByText('Test transaction')).toBeInTheDocument();
    });

    it('handles date at end of day boundary (23:59:59)', () => {
      const endOfDay = new Date().setHours(23, 59, 59, 999);

      const transactions = [
        createTransaction({ timestamp: endOfDay, reason: 'End of day' }),
      ];

      render(<TransactionHistory transactions={transactions} showFilters={true} showPagination={false} />);

      expect(screen.getByText('End of day')).toBeInTheDocument();
    });

    it('displays correct stats for empty transaction list', () => {
      render(<TransactionHistory transactions={[]} />);

      expect(screen.getByText(/0 of 0 transactions/i)).toBeInTheDocument();
    });

    it('handles visibleCount prop correctly', () => {
      const transactions = Array.from({ length: 20 }, (_, i) =>
        createTransaction({ id: `tx-${i}`, reason: `Transaction ${i}` })
      );

      render(
        <TransactionHistory
          transactions={transactions}
          showPagination={false}
          visibleCount={5}
        />
      );

      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
      expect(screen.getByText('Transaction 4')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 5')).not.toBeInTheDocument();
    });
  });

  describe('Transaction Sorting Edge Cases', () => {
    it('sorts transactions by timestamp descending', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', timestamp: BASE_TIME, reason: 'Middle' }),
        createTransaction({ id: 'tx-2', timestamp: BASE_TIME + 1000, reason: 'Latest' }),
        createTransaction({ id: 'tx-3', timestamp: BASE_TIME - 1000, reason: 'Oldest' }),
      ];

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      const reasons = screen.getAllByText(/Middle|Latest|Oldest/);
      expect(reasons[0]).toHaveTextContent('Latest');
      expect(reasons[2]).toHaveTextContent('Oldest');
    });

    it('handles transactions with same timestamp', () => {
      const sameTime = BASE_TIME;
      const transactions = [
        createTransaction({ id: 'tx-1', timestamp: sameTime, reason: 'First' }),
        createTransaction({ id: 'tx-2', timestamp: sameTime, reason: 'Second' }),
        createTransaction({ id: 'tx-3', timestamp: sameTime, reason: 'Third' }),
      ];

      render(<TransactionHistory transactions={transactions} showPagination={false} />);

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  describe('Filter Panel Edge Cases', () => {
    it('renders transactions with various types and categories', () => {
      const transactions = [
        createTransaction({ type: 'earn', reasonCode: 'posts', reason: 'Earn transaction' }),
        createTransaction({ type: 'spend', reasonCode: 'purchases', reason: 'Spend transaction' }),
        createTransaction({ type: 'claim', reasonCode: 'claims', reason: 'Claim transaction' }),
      ];

      render(<TransactionHistory transactions={transactions} showFilters={true} showPagination={false} />);

      expect(screen.getByText('Earn transaction')).toBeInTheDocument();
      expect(screen.getByText('Spend transaction')).toBeInTheDocument();
      expect(screen.getByText('Claim transaction')).toBeInTheDocument();
    });

    it('displays transactions with different timestamps correctly', () => {
      const now = Date.now();
      const transactions = [
        createTransaction({
          type: 'earn',
          reasonCode: 'posts',
          timestamp: now,
          reason: 'Recent post reward',
        }),
        createTransaction({
          type: 'spend',
          reasonCode: 'purchases',
          timestamp: now - 30 * 24 * 60 * 60 * 1000,
          reason: 'Old purchase',
        }),
      ];

      render(<TransactionHistory transactions={transactions} showFilters={true} showPagination={false} />);

      expect(screen.getByText('Recent post reward')).toBeInTheDocument();
      expect(screen.getByText('Old purchase')).toBeInTheDocument();
    });

    it('handles pagination with many transactions', () => {
      const transactions = Array.from({ length: 50 }, (_, i) =>
        createTransaction({
          id: `tx-${i}`,
          reason: `Transaction ${i}`,
          type: i % 2 === 0 ? 'earn' : 'spend',
        })
      );

      render(<TransactionHistory transactions={transactions} pageSize={10} showPagination={true} />);

      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 10')).not.toBeInTheDocument();
    });
  });
});
