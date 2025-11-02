import { describe, it, expect, beforeEach, vi } from 'vitest';
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
});
