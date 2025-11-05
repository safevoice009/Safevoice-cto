import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HTMLAttributes, ButtonHTMLAttributes } from 'react';
import type { StoreState } from '../../../lib/store';
import type { IPFSUploadResult } from '../../../lib/ipfs';
import * as ipfs from '../../../lib/ipfs';
import CreatePost from '../CreatePost';
import { useStore } from '../../../lib/store';

// Mock supporting modules
vi.mock('../../../lib/encryption', () => ({
  encryptContent: vi.fn(async () => ({
    encrypted: 'encrypted-content',
    iv: 'test-iv',
    keyId: 'test-key-id',
    key: {} as JsonWebKey,
  })),
}));

vi.mock('../../../lib/contentModeration', () => ({
  moderateContent: vi.fn(async () => ({
    blocked: false,
    issues: [],
    needsReview: false,
  })),
}));

vi.mock('../../../lib/crisisDetection', () => ({
  detectCrisis: vi.fn(() => false),
  getCrisisSeverity: vi.fn(),
}));

vi.mock('../../../lib/ipfs', () => ({
  uploadToIPFS: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(() => undefined, {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
}));

const uploadToIPFSMock = ipfs.uploadToIPFS as MockedFunction<
  (content: string, userOptedIn?: boolean) => Promise<IPFSUploadResult>
>;

const initialStoreState = useStore.getState();

let addPostMock: StoreState['addPost'];
let addEncryptionKeyMock: StoreState['addEncryptionKey'];
let setPendingPostMock: StoreState['setPendingPost'];
let setShowCrisisModalMock: StoreState['setShowCrisisModal'];

beforeEach(() => {
  addPostMock = vi.fn<StoreState['addPost']>();
  addEncryptionKeyMock = vi.fn<StoreState['addEncryptionKey']>();
  setPendingPostMock = vi.fn<StoreState['setPendingPost']>();
  setShowCrisisModalMock = vi.fn<StoreState['setShowCrisisModal']>();

  useStore.setState({
    studentId: 'Student#1234',
    addPost: addPostMock,
    addEncryptionKey: addEncryptionKeyMock,
    posts: [] as StoreState['posts'],
    setPendingPost: setPendingPostMock,
    setShowCrisisModal: setShowCrisisModalMock,
  });

  uploadToIPFSMock.mockReset();
  uploadToIPFSMock.mockResolvedValue({ success: true, cid: 'default-cid' });
});

afterEach(() => {
  useStore.setState(initialStoreState, true);
});

describe('CreatePost IPFS Integration', () => {
  it('displays the IPFS checkbox when the form expands', async () => {
    const user = userEvent.setup();
    render(<CreatePost />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    await user.click(textarea);

    await waitFor(() => {
      expect(screen.getByLabelText(/store on ipfs/i)).toBeInTheDocument();
    });
  });

  it('keeps the IPFS checkbox unchecked by default', async () => {
    const user = userEvent.setup();
    render(<CreatePost />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    await user.click(textarea);

    const checkbox = await screen.findByLabelText(/store on ipfs/i);
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it('toggles the IPFS checkbox when clicked', async () => {
    const user = userEvent.setup();
    render(<CreatePost />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    await user.click(textarea);

    const checkbox = await screen.findByLabelText(/store on ipfs/i);
    await user.click(checkbox);

    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it('displays contextual info when IPFS storage is enabled', async () => {
    const user = userEvent.setup();
    render(<CreatePost />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    await user.click(textarea);

    const checkbox = await screen.findByLabelText(/store on ipfs/i);
    await user.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText(/decentralized ipfs network/i)).toBeInTheDocument();
    });
  });

  it('uploads to IPFS when the user opts in', async () => {
    const user = userEvent.setup();
    uploadToIPFSMock.mockResolvedValue({ success: true, cid: 'QmSuccess' });

    render(<CreatePost />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    await user.type(textarea, 'Test post content for IPFS storage');

    const checkbox = await screen.findByLabelText(/store on ipfs/i);
    await user.click(checkbox);

    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(uploadToIPFSMock).toHaveBeenCalledWith('Test post content for IPFS storage', true);
    });
  });

  it('does not upload to IPFS when the user does not opt in', async () => {
    const user = userEvent.setup();

    render(<CreatePost />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    await user.type(textarea, 'Test post content without IPFS');

    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(uploadToIPFSMock).not.toHaveBeenCalled();
    });
  });

  it('continues posting even if IPFS upload fails', async () => {
    const user = userEvent.setup();
    uploadToIPFSMock.mockResolvedValue({ success: false, error: 'Network error' });

    render(<CreatePost />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    await user.type(textarea, 'Test post with failing IPFS upload');

    const checkbox = await screen.findByLabelText(/store on ipfs/i);
    await user.click(checkbox);

    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(uploadToIPFSMock).toHaveBeenCalled();
      expect(addPostMock).toHaveBeenCalled();
    });
  });

  it('passes the CID to addPost when IPFS upload succeeds', async () => {
    const user = userEvent.setup();
    const cid = 'QmCID123456';
    uploadToIPFSMock.mockResolvedValue({ success: true, cid });

    render(<CreatePost />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    await user.type(textarea, 'Test post with successful IPFS upload');

    const checkbox = await screen.findByLabelText(/store on ipfs/i);
    await user.click(checkbox);

    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(addPostMock).toHaveBeenCalledWith(
        'Test post with successful IPFS upload',
        undefined,
        '24h',
        undefined,
        false,
        undefined,
        expect.any(Object),
        undefined,
        undefined,
        cid
      );
    });
  });
});
