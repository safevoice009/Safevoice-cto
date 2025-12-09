import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { HTMLAttributes } from 'react';
import { useStore } from '../../../lib/store';
import PostMediaGallery from '../PostMediaGallery';
import type { MediaAttachment } from '../../../lib/storage/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: Object.assign(() => undefined, {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock IPFS utilities
vi.mock('../../../lib/ipfs', () => ({
  getIPFSGatewayUrl: vi.fn((cid: string) => `https://ipfs.io/ipfs/${cid}`),
  verifyIPFSContent: vi.fn(),
}));

// Mock IntersectionObserver
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.callback = callback;
    this.options = options;
  }

  observe(element: Element) {
    const entry = {
      target: element,
      isIntersecting: true,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: 1,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    } as IntersectionObserverEntry;

    setTimeout(() => {
      this.callback([entry], this as unknown as IntersectionObserver);
    }, 0);
  }

  disconnect() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  get root() {
    return null;
  }
  get rootMargin() {
    return this.options?.rootMargin || '0px';
  }
  get thresholds() {
    const threshold = this.options?.threshold;
    if (Array.isArray(threshold)) return threshold;
    if (typeof threshold === 'number') return [threshold];
    return [0];
  }
}

// Setup IntersectionObserver mock globally
beforeEach(() => {
  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('PostMediaGallery', () => {
  const mockImageBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
  const mockAudioBlob = new Blob(['fake-audio'], { type: 'audio/mpeg' });
  const mockAudioArrayBuffer = new Uint8Array([0, 1, 2, 3]).buffer;

  describe('Rendering', () => {
    it('renders nothing when mediaAttachments array is empty', () => {
      const { container } = render(<PostMediaGallery mediaAttachments={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders skeleton while loading local image', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-1',
          storage: 'local',
          type: 'image',
        },
      ];

      useStore.setState({
        getMediaLocally: vi.fn().mockImplementation(() => new Promise(() => {})),
      });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      // Wait for intersection observer to trigger and loading state to be set
      await waitFor(() => {
        const container = document.querySelector('.animate-pulse');
        expect(container).toBeInTheDocument();
      });
    });

    it('renders skeleton for audio while loading', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'audio-1',
          storage: 'local',
          type: 'audio',
        },
      ];

      useStore.setState({
        getMediaLocally: vi.fn().mockImplementation(() => new Promise(() => {})),
      });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      // Wait for intersection observer to trigger and loading state to be set
      await waitFor(() => {
        const container = document.querySelector('.animate-pulse');
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Local Storage Media', () => {
    it('loads and displays image from local storage', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-1',
          storage: 'local',
          type: 'image',
        },
      ];

      const getMediaLocallyMock = vi.fn().mockResolvedValue(mockImageBlob);
      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(getMediaLocallyMock).toHaveBeenCalledWith('img-1');
      });

      await waitFor(() => {
        const img = screen.getByAltText('Post attachment');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'blob:mock-url');
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('loads and displays audio from local storage', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'audio-1',
          storage: 'local',
          type: 'audio',
        },
      ];

      const getMediaLocallyMock = vi.fn().mockResolvedValue(mockAudioBlob);
      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(getMediaLocallyMock).toHaveBeenCalledWith('audio-1');
      });

      await waitFor(() => {
        const audio = screen.getByText('Audio attachment');
        expect(audio).toBeInTheDocument();
        const audioElement = document.querySelector('audio');
        expect(audioElement).toBeInTheDocument();
        expect(audioElement).toHaveAttribute('controls');
        expect(audioElement).toHaveAttribute('src', 'blob:mock-url');
      });
    });

    it('shows error message when local storage retrieval fails', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-1',
          storage: 'local',
          type: 'image',
        },
      ];

      const getMediaLocallyMock = vi.fn().mockRejectedValue(new Error('Storage error'));
      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load media')).toBeInTheDocument();
      });
    });
  });

  describe('IPFS Media', () => {
    it('loads and displays image from IPFS', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-ipfs-1',
          storage: 'ipfs',
          type: 'image',
          ipfsCid: 'Qm123abc',
        },
      ];

      const downloadFromIPFSMock = vi.fn().mockResolvedValue(mockAudioArrayBuffer);
      useStore.setState({ downloadFromIPFS: downloadFromIPFSMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(downloadFromIPFSMock).toHaveBeenCalledWith('Qm123abc');
      });

      await waitFor(() => {
        const img = screen.getByAltText('Post attachment');
        expect(img).toBeInTheDocument();
      });
    });

    it('loads and displays audio from IPFS', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'audio-ipfs-1',
          storage: 'ipfs',
          type: 'audio',
          ipfsCid: 'Qm456def',
        },
      ];

      const downloadFromIPFSMock = vi.fn().mockResolvedValue(mockAudioArrayBuffer);
      useStore.setState({ downloadFromIPFS: downloadFromIPFSMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(downloadFromIPFSMock).toHaveBeenCalledWith('Qm456def');
      });

      await waitFor(() => {
        const audio = screen.getByText('Audio attachment');
        expect(audio).toBeInTheDocument();
      });
    });

    it('shows error with IPFS gateway link when IPFS retrieval fails', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-ipfs-1',
          storage: 'ipfs',
          type: 'image',
          ipfsCid: 'Qm789ghi',
        },
      ];

      const downloadFromIPFSMock = vi.fn().mockRejectedValue(new Error('IPFS error'));
      useStore.setState({ downloadFromIPFS: downloadFromIPFSMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load media')).toBeInTheDocument();
        expect(screen.getByText('Open in IPFS Gateway')).toBeInTheDocument();
      });
    });
  });

  describe('Lazy Loading', () => {
    it('uses IntersectionObserver for lazy loading', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-1',
          storage: 'local',
          type: 'image',
        },
      ];

      const getMediaLocallyMock = vi.fn().mockResolvedValue(mockImageBlob);
      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(getMediaLocallyMock).toHaveBeenCalledWith('img-1');
      });
    });

    it('renders multiple media items with lazy loading', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-1',
          storage: 'local',
          type: 'image',
        },
        {
          mediaId: 'audio-1',
          storage: 'local',
          type: 'audio',
        },
      ];

      const getMediaLocallyMock = vi
        .fn()
        .mockImplementation((mediaId: string) =>
          mediaId === 'img-1'
            ? Promise.resolve(mockImageBlob)
            : Promise.resolve(mockAudioBlob)
        );

      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(getMediaLocallyMock).toHaveBeenCalledWith('img-1');
        expect(getMediaLocallyMock).toHaveBeenCalledWith('audio-1');
      });

      await waitFor(() => {
        expect(screen.getByAltText('Post attachment')).toBeInTheDocument();
        expect(screen.getByText('Audio attachment')).toBeInTheDocument();
      });
    });
  });

  describe('Memory Management', () => {
    it('revokes object URLs on unmount', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-1',
          storage: 'local',
          type: 'image',
        },
      ];

      const getMediaLocallyMock = vi.fn().mockResolvedValue(mockImageBlob);
      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      const { unmount } = render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(screen.getByAltText('Post attachment')).toBeInTheDocument();
      });

      unmount();

      // URL.revokeObjectURL should be called on unmount
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Grid Layout', () => {
    it('renders media in grid layout', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-1',
          storage: 'local',
          type: 'image',
        },
        {
          mediaId: 'img-2',
          storage: 'local',
          type: 'image',
        },
      ];

      const getMediaLocallyMock = vi.fn().mockResolvedValue(mockImageBlob);
      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      const { container } = render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        const grid = container.querySelector('.grid');
        expect(grid).toBeInTheDocument();
        expect(grid).toHaveClass('grid-cols-1');
        expect(grid).toHaveClass('tablet:grid-cols-2');
      });
    });
  });

  describe('Audio Controls', () => {
    it('renders audio element with native controls', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'audio-1',
          storage: 'local',
          type: 'audio',
        },
      ];

      const getMediaLocallyMock = vi.fn().mockResolvedValue(mockAudioBlob);
      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        const audioElement = document.querySelector('audio');
        expect(audioElement).toBeInTheDocument();
        expect(audioElement).toHaveAttribute('controls');
        expect(audioElement).toHaveAttribute('preload', 'metadata');
      });
    });

    it('includes fallback text for audio element', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'audio-1',
          storage: 'local',
          type: 'audio',
        },
      ];

      const getMediaLocallyMock = vi.fn().mockResolvedValue(mockAudioBlob);
      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        const audioElement = document.querySelector('audio');
        expect(audioElement?.textContent).toContain('Your browser does not support');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles null blob from getMediaLocally', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-1',
          storage: 'local',
          type: 'image',
        },
      ];

      const getMediaLocallyMock = vi.fn().mockResolvedValue(null);
      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load media')).toBeInTheDocument();
      });
    });

    it('handles missing ipfsCid for IPFS storage', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-ipfs-1',
          storage: 'ipfs',
          type: 'image',
          // Missing ipfsCid
        },
      ];

      useStore.setState({
        downloadFromIPFS: vi.fn(),
      });

      render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load media')).toBeInTheDocument();
      });
    });

    it('does not load media multiple times for the same item', async () => {
      const attachments: MediaAttachment[] = [
        {
          mediaId: 'img-1',
          storage: 'local',
          type: 'image',
        },
      ];

      const getMediaLocallyMock = vi.fn().mockResolvedValue(mockImageBlob);
      useStore.setState({ getMediaLocally: getMediaLocallyMock });

      const { rerender } = render(<PostMediaGallery mediaAttachments={attachments} />);

      await waitFor(() => {
        expect(getMediaLocallyMock).toHaveBeenCalledTimes(1);
      });

      // Rerender with same attachments
      rerender(<PostMediaGallery mediaAttachments={attachments} />);

      // Should not call again
      await waitFor(() => {
        expect(getMediaLocallyMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
