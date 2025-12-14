import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TributeCard from '../TributeCard';
import { useStore, type MemorialTribute } from '../../../lib/store';

vi.mock('../../../lib/store', () => ({
  useStore: vi.fn(),
}));

describe('TributeCard', () => {
  const mockLightCandle = vi.fn();
  const mockOnCosignClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as jest.Mock).mockImplementation(
      (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          lightCandle: mockLightCandle,
        };
        if (selector) {
          return selector(state as Record<string, unknown>);
        }
        return state;
      }
    );
  });

  const createMockTribute = (overrides?: Partial<MemorialTribute>): MemorialTribute => ({
    id: 'tribute-1',
    createdBy: 'Student#1234',
    createdAt: Date.now() - 86400000,
    personName: 'John Doe',
    message: 'In loving memory of a wonderful friend who touched many lives.',
    candles: [],
    milestoneRewardAwarded: false,
    status: 'draft',
    cosigners: [],
    auditTrail: [
      { action: 'draft_created', timestamp: Date.now() - 86400000, actor: 'Student#1234' }
    ],
    honoreeHash: 'hash123',
    ...overrides,
  });

  describe('Status Indicators', () => {
    it('should display draft status badge', () => {
      const tribute = createMockTribute({ status: 'draft' });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('should display published status badge', () => {
      const tribute = createMockTribute({ status: 'published' });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText('Published')).toBeInTheDocument();
    });

    it('should display pending review status badge', () => {
      const tribute = createMockTribute({ status: 'pending_review' });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
    });

    it('should display rejected status badge', () => {
      const tribute = createMockTribute({ status: 'rejected' });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  describe('Cosigner Information', () => {
    it('should display cosigner count for drafts', () => {
      const tribute = createMockTribute({
        status: 'draft',
        cosigners: [
          { peerId: 'peer1', signature: 'sig1', signedAt: Date.now(), publicKey: 'key1' }
        ]
      });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText(/Consensus: 1\/3 cosigners/i)).toBeInTheDocument();
      expect(screen.getByText(/2 more signatures needed/i)).toBeInTheDocument();
    });

    it('should show consensus reached message when 3+ cosigners', () => {
      const tribute = createMockTribute({
        status: 'draft',
        cosigners: [
          { peerId: 'peer1', signature: 'sig1', signedAt: Date.now(), publicKey: 'key1' },
          { peerId: 'peer2', signature: 'sig2', signedAt: Date.now(), publicKey: 'key2' },
          { peerId: 'peer3', signature: 'sig3', signedAt: Date.now(), publicKey: 'key3' },
        ]
      });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText('Consensus reached!')).toBeInTheDocument();
      expect(screen.getByText(/This tribute has 3 cosigner signatures/i)).toBeInTheDocument();
    });

    it('should display cosigner button for drafts needing signatures', () => {
      const tribute = createMockTribute({
        status: 'draft',
        cosigners: []
      });
      render(<TributeCard tribute={tribute} onCosignClick={mockOnCosignClick} />);
      
      const cosignButton = screen.getByRole('button', { name: /Cosign Tribute/i });
      expect(cosignButton).toBeInTheDocument();
    });
  });

  describe('College and Date Display', () => {
    it('should display college affiliation when present', () => {
      const tribute = createMockTribute({ college: 'MIT' });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText('MIT')).toBeInTheDocument();
    });

    it('should display date of remembrance when present', () => {
      const tribute = createMockTribute({ dateOfRemembrance: '2024-01-15' });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText(/Remembering/i)).toBeInTheDocument();
    });
  });

  describe('Moderator Decision', () => {
    it('should display moderator approval decision', () => {
      const tribute = createMockTribute({
        status: 'published',
        moderatorDecision: {
          moderatorId: 'Mod#1',
          decision: 'approved',
          reason: 'Verified and appropriate',
          timestamp: Date.now()
        }
      });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText(/Moderator Approved/i)).toBeInTheDocument();
      expect(screen.getByText('Verified and appropriate')).toBeInTheDocument();
    });

    it('should display moderator rejection decision', () => {
      const tribute = createMockTribute({
        status: 'rejected',
        moderatorDecision: {
          moderatorId: 'Mod#1',
          decision: 'rejected',
          reason: 'Inappropriate content',
          timestamp: Date.now()
        }
      });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText(/Moderator Rejected/i)).toBeInTheDocument();
      expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
    });
  });

  describe('Audit Trail', () => {
    it('should display audit trail toggle', () => {
      const tribute = createMockTribute({
        auditTrail: [
          { action: 'draft_created', timestamp: Date.now(), actor: 'Student#1234' },
          { action: 'cosigner_added', timestamp: Date.now(), actor: 'peer1' }
        ]
      });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText(/Audit Trail \(2 events\)/i)).toBeInTheDocument();
    });

    it('should expand audit trail when clicked', async () => {
      const user = userEvent.setup();
      const tribute = createMockTribute({
        auditTrail: [
          { action: 'draft_created', timestamp: Date.now(), actor: 'Student#1234' }
        ]
      });
      render(<TributeCard tribute={tribute} />);
      
      const toggleButton = screen.getByText(/Audit Trail \(1 events\)/i);
      await user.click(toggleButton);
      
      expect(screen.getByText('draft_created')).toBeInTheDocument();
      expect(screen.getByText(/by Student#1234/i)).toBeInTheDocument();
    });
  });

  describe('Published Tribute Features', () => {
    it('should display candle count for published tributes', () => {
      const tribute = createMockTribute({
        status: 'published',
        candles: [
          { id: 'c1', tributeId: 'tribute-1', lightedBy: 'User1', lightedAt: Date.now() },
          { id: 'c2', tributeId: 'tribute-1', lightedBy: 'User2', lightedAt: Date.now() }
        ]
      });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText('2 candles lit')).toBeInTheDocument();
    });

    it('should display light candle button for published tributes', () => {
      const tribute = createMockTribute({ status: 'published' });
      render(<TributeCard tribute={tribute} />);
      
      const lightButton = screen.getByRole('button', { name: /Light Candle/i });
      expect(lightButton).toBeInTheDocument();
    });

    it('should call lightCandle when button clicked', async () => {
      const user = userEvent.setup();
      const tribute = createMockTribute({ status: 'published' });
      render(<TributeCard tribute={tribute} />);
      
      const lightButton = screen.getByRole('button', { name: /Light Candle/i });
      await user.click(lightButton);
      
      expect(mockLightCandle).toHaveBeenCalledWith('tribute-1');
    });

    it('should display milestone badge when achieved', () => {
      const tribute = createMockTribute({
        status: 'published',
        milestoneRewardAwarded: true
      });
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText('Milestone')).toBeInTheDocument();
    });
  });

  describe('Cosigner Interaction', () => {
    it('should call onCosignClick when cosign button clicked', async () => {
      const user = userEvent.setup();
      const tribute = createMockTribute({
        status: 'draft',
        cosigners: []
      });
      render(<TributeCard tribute={tribute} onCosignClick={mockOnCosignClick} />);
      
      const cosignButton = screen.getByRole('button', { name: /Cosign Tribute/i });
      await user.click(cosignButton);
      
      expect(mockOnCosignClick).toHaveBeenCalledWith('tribute-1');
    });

    it('should not show cosign button for published tributes', () => {
      const tribute = createMockTribute({ status: 'published' });
      render(<TributeCard tribute={tribute} onCosignClick={mockOnCosignClick} />);
      
      expect(screen.queryByRole('button', { name: /Cosign Tribute/i })).not.toBeInTheDocument();
    });
  });

  describe('Tribute Content', () => {
    it('should display person name', () => {
      const tribute = createMockTribute();
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display tribute message', () => {
      const tribute = createMockTribute();
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText(/In loving memory of a wonderful friend/i)).toBeInTheDocument();
    });

    it('should display creation date', () => {
      const tribute = createMockTribute();
      render(<TributeCard tribute={tribute} />);
      
      expect(screen.getByText(/Honored on/i)).toBeInTheDocument();
    });
  });
});
