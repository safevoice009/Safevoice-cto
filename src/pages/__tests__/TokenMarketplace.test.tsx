import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import TokenMarketplace from '../TokenMarketplace';
import { useStore } from '../../lib/store';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn();
  const success = vi.fn();
  const error = vi.fn();
  Object.assign(toastFn, { success, error });
  return {
    __esModule: true,
    default: toastFn,
    success,
    error,
  };
});

const toastMock = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const initialStoreState = useStore.getState();

type StoreSnapshot = ReturnType<typeof useStore.getState>;

const createMockPost = (id: string, content: string) => ({
  id,
  studentId: 'student_123',
  content,
  category: 'general',
  reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
  commentCount: 0,
  comments: [],
  createdAt: Date.now(),
  isEdited: false,
  editedAt: null,
  expiresAt: Date.now() + 86400000,
  lifetime: '24h' as const,
  isEncrypted: false,
  encryptionMeta: null,
  isPinned: false,
  pinnedAt: null,
  reportCount: 0,
  helpfulCount: 0,
  crossCampusBoosts: [],
  crossCampusBoostedAt: null,
  crossCampusUntil: null,
});

const setupStore = (overrides: Partial<StoreSnapshot> = {}) => {
  const defaultPosts = [
    createMockPost('post-1', 'First post content for marketplace testing'),
    createMockPost('post-2', 'Another test post for boost testing'),
  ];

  const activatePremium = overrides.activatePremium ?? vi.fn(async () => true);
  const purchaseNFTBadge = overrides.purchaseNFTBadge ?? vi.fn();
  const isPremiumActive = overrides.isPremiumActive ?? vi.fn(() => false);
  const hasNFTBadge = overrides.hasNFTBadge ?? vi.fn(() => false);
  const tipUser = overrides.tipUser ?? vi.fn();
  const sendAnonymousGift = overrides.sendAnonymousGift ?? vi.fn();
  const sponsorHelpline = overrides.sponsorHelpline ?? vi.fn();
  const pinPost = overrides.pinPost ?? vi.fn();
  const highlightPost = overrides.highlightPost ?? vi.fn();
  const boostToCampuses = overrides.boostToCampuses ?? vi.fn();
  const extendPostLifetime = overrides.extendPostLifetime ?? vi.fn();
  const changeStudentId = overrides.changeStudentId ?? vi.fn(() => true);
  const downloadDataBackup = overrides.downloadDataBackup ?? vi.fn();
  const spendVoice = overrides.spendVoice ?? vi.fn();

  const stateUpdate: Partial<StoreSnapshot> = {
    voiceBalance: overrides.voiceBalance ?? 1500,
    studentId: overrides.studentId ?? 'student_123',
    posts: overrides.posts ?? defaultPosts,
    activatePremium,
    purchaseNFTBadge,
    isPremiumActive,
    hasNFTBadge,
    tipUser,
    sendAnonymousGift,
    sponsorHelpline,
    pinPost,
    highlightPost,
    boostToCampuses,
    extendPostLifetime,
    changeStudentId,
    downloadDataBackup,
    spendVoice,
  };

  act(() => {
    useStore.setState((state) => ({
      ...state,
      ...stateUpdate,
    }));
  });

  return {
    activatePremium,
    purchaseNFTBadge,
    isPremiumActive,
    hasNFTBadge,
    tipUser,
    sendAnonymousGift,
    sponsorHelpline,
    pinPost,
    highlightPost,
    boostToCampuses,
    extendPostLifetime,
    changeStudentId,
    downloadDataBackup,
    spendVoice,
  };
};

const renderMarketplace = () =>
  render(
    <MemoryRouter>
      <TokenMarketplace />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
});

afterEach(() => {
  act(() => {
    useStore.setState(initialStoreState, true);
  });
  vi.clearAllMocks();
});

describe('TokenMarketplace component', () => {
  it('renders core sections and feature tiles', () => {
    setupStore();
    renderMarketplace();

    expect(screen.getByText('Token Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Premium Features')).toBeInTheDocument();
    expect(screen.getByText('Post Boosts')).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByText('NFT Badges')).toBeInTheDocument();
    expect(screen.getByText('Special Utilities')).toBeInTheDocument();

    expect(screen.getByText('Verified Badge')).toBeInTheDocument();
    expect(screen.getByText('Pin Post')).toBeInTheDocument();
    expect(screen.getByText('Send Tip')).toBeInTheDocument();
    expect(screen.getByText(/Bronze Badge/)).toBeInTheDocument();
    expect(screen.getByText('Change Student ID')).toBeInTheDocument();

    expect(screen.getByText('1.5K VOICE')).toBeInTheDocument();
  });

  it('shows low balance alert when balance is below threshold', () => {
    setupStore({ voiceBalance: 20 });
    renderMarketplace();

    expect(screen.getByText('Low Balance')).toBeInTheDocument();
  });

  it('activates premium feature and toggles loading state', async () => {
    let resolvePurchase: (() => void) | undefined;
    const { activatePremium } = setupStore({
      activatePremium: vi.fn(() => new Promise<boolean>((resolve) => {
        resolvePurchase = () => resolve(true);
      })),
    });

    renderMarketplace();

    const card = screen.getByText('Verified Badge').closest('div') as HTMLElement;
    const button = within(card).getByRole('button', { name: /purchase/i });

    fireEvent.click(button);

    expect(activatePremium).toHaveBeenCalledWith('verified_badge');
    expect(button).toBeDisabled();

    act(() => {
      resolvePurchase?.();
    });

    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('validates pin post action and executes when criteria met', async () => {
    const { pinPost } = setupStore();
    renderMarketplace();

    const postSelect = screen.getByRole('combobox');
    fireEvent.change(postSelect, { target: { value: 'post-1' } });

    const pinCard = screen.getByText('Pin Post').closest('div') as HTMLElement;
    const pinButton = within(pinCard).getByRole('button', { name: /purchase/i });

    fireEvent.click(pinButton);

    await waitFor(() => expect(pinPost).toHaveBeenCalledWith('post-1'), { timeout: 500 });
  });

  it('processes tip workflow with provided inputs', async () => {
    const { tipUser } = setupStore();
    renderMarketplace();

    const postSelect = screen.getByRole('combobox');
    fireEvent.change(postSelect, { target: { value: 'post-2' } });

    const recipientInput = screen.getByPlaceholderText('student_123');
    fireEvent.change(recipientInput, { target: { value: 'student_984' } });

    const amountInput = screen.getByPlaceholderText('5');
    fireEvent.change(amountInput, { target: { value: '15' } });

    const tipCard = screen.getByText('Send Tip').closest('div') as HTMLElement;
    const tipButton = within(tipCard).getByRole('button', { name: /purchase/i });

    fireEvent.click(tipButton);

    await waitFor(() => expect(tipUser).toHaveBeenCalledWith('student_984', 'post-2', 15));
  });

  it('spends voice when unlocking custom theme studio', () => {
    const { spendVoice } = setupStore();
    renderMarketplace();

    const themeCard = screen.getByText('Custom Theme Studio').closest('div') as HTMLElement;
    const themeButton = within(themeCard).getByRole('button', { name: /purchase/i });

    fireEvent.click(themeButton);

    expect(spendVoice).toHaveBeenCalledWith(50, 'Unlocked Custom Theme Studio', { action: 'custom_theme_studio' });
  });

  it('purchases bronze NFT badge', async () => {
    const { purchaseNFTBadge } = setupStore();
    renderMarketplace();

    const bronzeCard = screen.getByText(/Bronze Badge/).closest('div') as HTMLElement;
    const purchaseButton = within(bronzeCard).getByRole('button', { name: /purchase/i });

    fireEvent.click(purchaseButton);

    await waitFor(() => expect(purchaseNFTBadge).toHaveBeenCalledWith('bronze', 500));
  });

  it('updates student id via special utilities', async () => {
    const { changeStudentId } = setupStore();
    renderMarketplace();

    const input = screen.getByPlaceholderText('Enter new ID (min 3 chars)');
    fireEvent.change(input, { target: { value: 'new_student_id' } });

    const utilitiesCard = screen.getByText('Change Student ID').closest('div') as HTMLElement;
    const purchaseButton = within(utilitiesCard).getByRole('button', { name: /purchase/i });

    fireEvent.click(purchaseButton);

    await waitFor(() => expect(changeStudentId).toHaveBeenCalledWith('new_student_id'));
  });

  it('downloads data backup for free utility', async () => {
    const { downloadDataBackup } = setupStore();
    renderMarketplace();

    const backupCard = screen.getByText('Download Backup').closest('div') as HTMLElement;
    const downloadButton = within(backupCard).getByRole('button', { name: /download/i });

    await act(async () => {
      fireEvent.click(downloadButton);
    });

    expect(downloadDataBackup).toHaveBeenCalled();
  });

  it('disables purchase buttons when balance is insufficient', () => {
    setupStore({ voiceBalance: 10 });
    renderMarketplace();

    const verifiedBadgeCard = screen.getByText('Verified Badge').closest('div') as HTMLElement;
    const purchaseButton = within(verifiedBadgeCard).getByRole('button');
    
    expect(purchaseButton).toBeDisabled();
  });

  it('shows active state for already purchased premium features', () => {
    setupStore({
      isPremiumActive: vi.fn((id) => id === 'analytics'),
    });
    renderMarketplace();

    const analyticsCard = screen.getByText('Advanced Analytics').closest('div') as HTMLElement;
    expect(within(analyticsCard).getAllByText(/active/i).length).toBeGreaterThan(0);
  });

  it('handles highlight post action with valid inputs', async () => {
    const { highlightPost } = setupStore();
    renderMarketplace();

    const postSelect = screen.getByRole('combobox');
    fireEvent.change(postSelect, { target: { value: 'post-1' } });

    const highlightCard = screen.getByText('Highlight Post').closest('div') as HTMLElement;
    const highlightButton = within(highlightCard).getByRole('button', { name: /purchase/i });

    fireEvent.click(highlightButton);

    await waitFor(() => expect(highlightPost).toHaveBeenCalledWith('post-1'), { timeout: 500 });
  });

  it('handles extend lifetime with custom hours', async () => {
    const { extendPostLifetime } = setupStore();
    renderMarketplace();

    const postSelect = screen.getByRole('combobox');
    fireEvent.change(postSelect, { target: { value: 'post-2' } });

    const hoursInput = screen.getByPlaceholderText('24');
    fireEvent.change(hoursInput, { target: { value: '48' } });

    const extendCard = screen.getByText('Extend Lifetime').closest('div') as HTMLElement;
    const extendButton = within(extendCard).getByRole('button', { name: /purchase/i });

    fireEvent.click(extendButton);

    await waitFor(() => expect(extendPostLifetime).toHaveBeenCalledWith('post-2', 48), { timeout: 500 });
  });

  it('handles cross-campus boost with campus IDs', async () => {
    const { boostToCampuses } = setupStore();
    renderMarketplace();

    const postSelect = screen.getByRole('combobox');
    fireEvent.change(postSelect, { target: { value: 'post-1' } });

    const campusInput = screen.getByPlaceholderText('campus1, campus2');
    fireEvent.change(campusInput, { target: { value: 'campus_x, campus_y, campus_z' } });

    const boostCard = screen.getByText('Cross-Campus Boost').closest('div') as HTMLElement;
    const boostButton = within(boostCard).getByRole('button', { name: /purchase/i });

    fireEvent.click(boostButton);

    await waitFor(() => {
      expect(boostToCampuses).toHaveBeenCalledWith('post-1', ['campus_x', 'campus_y', 'campus_z']);
    }, { timeout: 500 });
  });

  it('sends anonymous gift to recipient', async () => {
    const { sendAnonymousGift } = setupStore();
    renderMarketplace();

    const recipientInput = screen.getByPlaceholderText('student_123');
    fireEvent.change(recipientInput, { target: { value: 'student_999' } });

    const giftCard = screen.getByText('Anonymous Gift').closest('div') as HTMLElement;
    const giftButton = within(giftCard).getByRole('button', { name: /purchase/i });

    fireEvent.click(giftButton);

    await waitFor(() => expect(sendAnonymousGift).toHaveBeenCalledWith('student_999', 10), { timeout: 500 });
  });

  it('sponsors helpline with correct amount', async () => {
    const { sponsorHelpline } = setupStore();
    renderMarketplace();

    const helplineCard = screen.getByText('Sponsor Helpline').closest('div') as HTMLElement;
    const sponsorButton = within(helplineCard).getByRole('button', { name: /purchase/i });

    fireEvent.click(sponsorButton);

    await waitFor(() => expect(sponsorHelpline).toHaveBeenCalledWith(100), { timeout: 500 });
  });

  it('purchases all NFT badge tiers', async () => {
    const { purchaseNFTBadge } = setupStore({ voiceBalance: 100000 });
    renderMarketplace();

    const silverCard = screen.getByText(/Silver Badge/).closest('div') as HTMLElement;
    const silverButton = within(silverCard).getByRole('button', { name: /purchase/i });
    fireEvent.click(silverButton);

    await waitFor(() => expect(purchaseNFTBadge).toHaveBeenCalledWith('silver', 2000));

    const goldCard = screen.getByText(/Gold Badge/).closest('div') as HTMLElement;
    const goldButton = within(goldCard).getByRole('button', { name: /purchase/i });
    fireEvent.click(goldButton);

    await waitFor(() => expect(purchaseNFTBadge).toHaveBeenCalledWith('gold', 10000));
  });

  it('renders info box with earning tips', () => {
    setupStore();
    renderMarketplace();

    expect(screen.getByText('How to Earn More VOICE')).toBeInTheDocument();
    expect(screen.getByText(/Create posts and share your thoughts/i)).toBeInTheDocument();
    expect(screen.getByText(/Engage with others through reactions/i)).toBeInTheDocument();
  });
});
