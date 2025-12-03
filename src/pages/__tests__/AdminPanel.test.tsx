import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminPanel from '../AdminPanel';
import { useStore } from '../../lib/store';

vi.mock('../../lib/store', () => ({
  useStore: vi.fn(),
}));

vi.mock('../../lib/crisisQueue', () => ({
  getCrisisQueueService: vi.fn(() => ({
    getSnapshot: vi.fn(() => [
      {
        id: 'crisis-1',
        studentId: 'student-1',
        crisisLevel: 'critical',
        status: 'pending',
        timestamp: Date.now() - 5 * 60 * 1000,
        expiresAt: Date.now() + 10 * 60 * 1000,
        ttl: 15 * 60 * 1000,
      },
      {
        id: 'crisis-2',
        studentId: 'student-2',
        crisisLevel: 'high',
        status: 'resolved',
        timestamp: Date.now() - 30 * 60 * 1000,
        expiresAt: Date.now() + 5 * 60 * 1000,
        ttl: 15 * 60 * 1000,
        metadata: { resolvedAt: Date.now() - 10 * 60 * 1000 },
      },
    ]),
    subscribe: vi.fn(() => vi.fn()),
  })),
}));

const mockUseStore = useStore as unknown as ReturnType<typeof vi.fn>;

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('Access Control', () => {
    it('should show access denied message for non-moderators', () => {
      mockUseStore.mockReturnValue(false);

      renderWithRouter(<AdminPanel />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/moderator privileges/i)).toBeInTheDocument();
    });

    it('should render admin panel for moderators', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector({
            isModerator: true,
            reports: [],
            posts: [],
            communityModerationLogs: [],
            memberStatuses: [],
            banCommunityMember: vi.fn(),
            unbanCommunityMember: vi.fn(),
            warnCommunityMember: vi.fn(),
            reviewReport: vi.fn(),
            communityAnnouncements: [],
            channelMuteStatus: { isMuted: false },
            createCommunityAnnouncement: vi.fn(),
            muteChannel: vi.fn(),
            unmuteChannel: vi.fn(),
          });
        }
        return true;
      });

      renderWithRouter(<AdminPanel />);

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      expect(screen.getByText(/manage moderation/i)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector({
            isModerator: true,
            reports: [],
            posts: [],
            communityModerationLogs: [],
            memberStatuses: [],
            banCommunityMember: vi.fn(),
            unbanCommunityMember: vi.fn(),
            warnCommunityMember: vi.fn(),
            reviewReport: vi.fn(),
            communityAnnouncements: [],
            channelMuteStatus: { isMuted: false },
            createCommunityAnnouncement: vi.fn(),
            muteChannel: vi.fn(),
            unmuteChannel: vi.fn(),
          });
        }
        return true;
      });
    });

    it('should display all tab options', () => {
      renderWithRouter(<AdminPanel />);

      expect(screen.getByText('Moderation')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Crisis Ops')).toBeInTheDocument();
      expect(screen.getByText('Reporting')).toBeInTheDocument();
    });

    it('should switch to Members tab when clicked', async () => {
      renderWithRouter(<AdminPanel />);

      const membersTab = screen.getByText('Members');
      fireEvent.click(membersTab);

      await waitFor(() => {
        expect(screen.getByText('Member Management')).toBeInTheDocument();
      });
    });

    it('should switch to Crisis Ops tab when clicked', async () => {
      renderWithRouter(<AdminPanel />);

      const crisisTab = screen.getByText('Crisis Ops');
      fireEvent.click(crisisTab);

      await waitFor(() => {
        expect(screen.getByText('Crisis Response Operations')).toBeInTheDocument();
      });
    });

    it('should switch to Reporting tab when clicked', async () => {
      renderWithRouter(<AdminPanel />);

      const reportingTab = screen.getByText('Reporting');
      fireEvent.click(reportingTab);

      await waitFor(() => {
        expect(screen.getByText('Reporting & Export')).toBeInTheDocument();
      });
    });
  });

  describe('Member Management', () => {
    const mockBanMember = vi.fn();
    const mockUnbanMember = vi.fn();
    const mockWarnMember = vi.fn();

    beforeEach(() => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector({
            isModerator: true,
            reports: [],
            posts: [],
            communityModerationLogs: [],
            memberStatuses: [
              {
                studentId: 'user-1',
                isBanned: true,
                bannedAt: Date.now() - 60 * 60 * 1000,
                bannedUntil: Date.now() + 23 * 60 * 60 * 1000,
                banReason: 'Spam',
                warnings: [],
              },
              {
                studentId: 'user-2',
                isBanned: false,
                warnings: [
                  {
                    id: 'warn-1',
                    reason: 'Inappropriate content',
                    timestamp: Date.now() - 2 * 60 * 60 * 1000,
                    issuedBy: 'mod-1',
                  },
                ],
              },
            ],
            banCommunityMember: mockBanMember,
            unbanCommunityMember: mockUnbanMember,
            warnCommunityMember: mockWarnMember,
            reviewReport: vi.fn(),
            communityAnnouncements: [],
            channelMuteStatus: { isMuted: false },
            createCommunityAnnouncement: vi.fn(),
            muteChannel: vi.fn(),
            unmuteChannel: vi.fn(),
          });
        }
        return true;
      });
    });

    it('should display member statistics', async () => {
      renderWithRouter(<AdminPanel />);

      const membersTab = screen.getByText('Members');
      fireEvent.click(membersTab);

      await waitFor(() => {
        expect(screen.getByText('Total Members')).toBeInTheDocument();
        expect(screen.getAllByText('Banned').length).toBeGreaterThan(0);
        expect(screen.getByText('Warned')).toBeInTheDocument();
      });
    });

    it('should display banned members', async () => {
      renderWithRouter(<AdminPanel />);

      const membersTab = screen.getByText('Members');
      fireEvent.click(membersTab);

      await waitFor(() => {
        expect(screen.getByText('user-1')).toBeInTheDocument();
        expect(screen.getByText(/spam/i)).toBeInTheDocument();
        expect(screen.getByText('Unban')).toBeInTheDocument();
      });
    });

    it('should call unbanCommunityMember when unban button clicked', async () => {
      renderWithRouter(<AdminPanel />);

      const membersTab = screen.getByText('Members');
      fireEvent.click(membersTab);

      await waitFor(() => {
        const unbanButton = screen.getByText('Unban');
        fireEvent.click(unbanButton);
      });

      expect(mockUnbanMember).toHaveBeenCalledWith('user-1');
    });

    it('should display warned members', async () => {
      renderWithRouter(<AdminPanel />);

      const membersTab = screen.getByText('Members');
      fireEvent.click(membersTab);

      await waitFor(() => {
        expect(screen.getByText('user-2')).toBeInTheDocument();
        expect(screen.getByText(/inappropriate content/i)).toBeInTheDocument();
      });
    });
  });

  describe('Moderation Queue', () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector({
            isModerator: true,
            reports: [
              {
                id: 'report-1',
                postId: 'post-1',
                reportType: 'Harassment',
                description: 'User is being aggressive',
                reporterId: 'user-123',
                reportedAt: Date.now() - 30 * 60 * 1000,
                status: 'pending',
              },
              {
                id: 'report-2',
                postId: 'post-2',
                reportType: 'Spam',
                description: 'Multiple spam posts',
                reporterId: 'user-456',
                reportedAt: Date.now() - 60 * 60 * 1000,
                status: 'valid',
                reviewedBy: 'mod-1',
                reviewedAt: Date.now() - 30 * 60 * 1000,
              },
            ],
            posts: [
              {
                id: 'post-1',
                content: 'This is a reported post',
                studentId: 'user-789',
                reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
                commentCount: 0,
                comments: [],
                createdAt: Date.now(),
                isEdited: false,
                editedAt: null,
                isPinned: false,
                reportCount: 1,
                helpfulCount: 0,
                expiresAt: null,
                lifetime: 'never',
                isEncrypted: false,
                encryptionMeta: null,
              },
            ],
            communityModerationLogs: [],
            memberStatuses: [],
            banCommunityMember: vi.fn(),
            unbanCommunityMember: vi.fn(),
            warnCommunityMember: vi.fn(),
            reviewReport: vi.fn(),
            communityAnnouncements: [],
            channelMuteStatus: { isMuted: false },
            createCommunityAnnouncement: vi.fn(),
            muteChannel: vi.fn(),
            unmuteChannel: vi.fn(),
          });
        }
        return true;
      });
    });

    it('should display moderation section', async () => {
      renderWithRouter(<AdminPanel />);

      // The moderation tab is selected by default
      // Check for the content moderation section
      await waitFor(() => {
        expect(screen.getByText('Content Moderation')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should render moderation tab content', async () => {
      renderWithRouter(<AdminPanel />);

      // Check that we're on the moderation tab by default
      // The AdminPanel itself should render with moderation content
      await waitFor(() => {
        const moderationTab = screen.getByText('Moderation');
        expect(moderationTab).toBeInTheDocument();
        // Check that the Content Moderation header is present
        expect(screen.getByText('Content Moderation')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Crisis Analytics', () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector({
            isModerator: true,
            reports: [],
            posts: [],
            communityModerationLogs: [],
            memberStatuses: [],
            banCommunityMember: vi.fn(),
            unbanCommunityMember: vi.fn(),
            warnCommunityMember: vi.fn(),
            reviewReport: vi.fn(),
            communityAnnouncements: [],
            channelMuteStatus: { isMuted: false },
            createCommunityAnnouncement: vi.fn(),
            muteChannel: vi.fn(),
            unmuteChannel: vi.fn(),
          });
        }
        return true;
      });
    });

    it('should render crisis analytics when Crisis Ops tab is selected', async () => {
      renderWithRouter(<AdminPanel />);

      const crisisTab = screen.getByText('Crisis Ops');
      fireEvent.click(crisisTab);

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument();
        expect(screen.getByText('Timeline')).toBeInTheDocument();
      });
    });

    it('should display crisis metrics', async () => {
      renderWithRouter(<AdminPanel />);

      const crisisTab = screen.getByText('Crisis Ops');
      fireEvent.click(crisisTab);

      await waitFor(() => {
        // Check for KPI cards
        expect(screen.getByText('Requests')).toBeInTheDocument();
        expect(screen.getByText('Awaiting Response')).toBeInTheDocument();
      });
    });
  });

  describe('Reporting and Export', () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector({
            isModerator: true,
            reports: [],
            posts: [],
            communityModerationLogs: [],
            memberStatuses: [],
            banCommunityMember: vi.fn(),
            unbanCommunityMember: vi.fn(),
            warnCommunityMember: vi.fn(),
            reviewReport: vi.fn(),
            communityAnnouncements: [],
            channelMuteStatus: { isMuted: false },
            createCommunityAnnouncement: vi.fn(),
            muteChannel: vi.fn(),
            unmuteChannel: vi.fn(),
          });
        }
        return true;
      });
    });

    it('should render export options when Reporting tab is selected', async () => {
      renderWithRouter(<AdminPanel />);

      const reportingTab = screen.getByText('Reporting');
      fireEvent.click(reportingTab);

      await waitFor(() => {
        expect(screen.getByText('Moderation Logs')).toBeInTheDocument();
        expect(screen.getByText('User Reports')).toBeInTheDocument();
        expect(screen.getByText('Member Statuses')).toBeInTheDocument();
        expect(screen.getByText('Combined Export')).toBeInTheDocument();
      });
    });

    it('should display export configuration options', async () => {
      renderWithRouter(<AdminPanel />);

      const reportingTab = screen.getByText('Reporting');
      fireEvent.click(reportingTab);

      await waitFor(() => {
        expect(screen.getByText('Export Configuration')).toBeInTheDocument();
        expect(screen.getByText('Format')).toBeInTheDocument();
        expect(screen.getByText('Date Range')).toBeInTheDocument();
      });
    });
  });
});
