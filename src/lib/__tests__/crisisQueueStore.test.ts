import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore, type Post, type CrisisQueueEntry } from '../store';

const createLocalStorage = () => {
  const store: Record<string, string> = {};
  const failingKeys = new Set<string>();
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: vi.fn((key: string, value: string) => {
      if (failingKeys.has(key)) {
        throw new Error('Quota exceeded');
      }
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    __setFailingKeys: (keys: string[]) => {
      failingKeys.clear();
      keys.forEach((key) => failingKeys.add(key));
    },
  };
};

let uuidCounter = 0;

const createPost = (overrides: Partial<Post> = {}): Post => ({
  id: `post-${uuidCounter++}`,
  studentId: 'student-1',
  content: 'This is a crisis post that requires attention',
  reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
  commentCount: 0,
  comments: [],
  createdAt: Date.now(),
  isEdited: false,
  editedAt: null,
  isPinned: false,
  isViral: false,
  viralAwardedAt: null,
  reportCount: 0,
  helpfulCount: 0,
  expiresAt: null,
  lifetime: 'never',
  customLifetimeHours: null,
  isEncrypted: false,
  encryptionMeta: null,
  imageUrl: null,
  warningShown: false,
  reports: [],
  moderationIssues: [],
  needsReview: false,
  contentBlurred: false,
  blurReason: null,
  isCrisisFlagged: false,
  crisisLevel: 'high',
  supportOffered: false,
  flaggedAt: null,
  flaggedForSupport: false,
  pinnedAt: null,
  isHighlighted: false,
  highlightedAt: null,
  highlightedUntil: null,
  extendedLifetimeHours: 0,
  crossCampusBoostedAt: null,
  crossCampusUntil: null,
  crossCampusBoosts: [],
  isCommunityPinned: false,
  communityPinnedAt: null,
  communityPinnedBy: null,
  communityId: null,
  channelId: null,
  visibility: undefined,
  isAnonymous: false,
  archived: false,
  archivedAt: null,
  emotionAnalysis: undefined,
  ipfsCid: null,
  ...overrides,
});

const createQueueEntry = (overrides: Partial<CrisisQueueEntry> = {}): CrisisQueueEntry => ({
  id: `entry-${uuidCounter++}`,
  postId: 'post-ref',
  authorId: 'student-1',
  detectedAt: Date.now(),
  severity: 'high',
  status: 'pending',
  source: 'automatic',
  broadcastAttempts: 0,
  lastBroadcastAt: null,
  lastError: null,
  message: null,
  metadata: null,
  ipfsCid: null,
  communityId: null,
  channelId: null,
  postPreview: 'preview',
  fallbackUsed: false,
  fallbackReason: null,
  acknowledgedBy: null,
  acknowledgedAt: null,
  resolvedBy: null,
  resolvedAt: null,
  resolutionNote: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  uuidCounter = 0;

  const localStorageMock = createLocalStorage();

  const CustomEventMock = class<T = unknown> {
    type: string;
    detail?: T;
    constructor(type: string, options?: { detail?: T }) {
      this.type = type;
      this.detail = options?.detail;
    }
  } as unknown as typeof CustomEvent;

  Object.defineProperty(global, 'CustomEvent', {
    value: CustomEventMock,
    configurable: true,
  });

  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(global, 'window', {
    value: {
      localStorage: localStorageMock,
      setTimeout: vi.fn((fn: () => void) => {
        fn();
        return 1;
      }),
      clearTimeout: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      CustomEvent: CustomEventMock,
      crypto: global.crypto,
    },
    configurable: true,
  });

  Object.defineProperty(global, 'navigator', {
    value: { vibrate: vi.fn() },
    configurable: true,
  });

  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(() => `uuid-${uuidCounter++}`),
    },
    configurable: true,
  });

  useStore.setState({
    studentId: 'student-test',
    posts: [],
    crisisQueue: [],
    crisisBroadcastStatus: 'idle',
    crisisBroadcastError: null,
    crisisBroadcastMetrics: {
      successCount: 0,
      failureCount: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastSyncAt: null,
    },
  });
});

describe('crisis queue store integration', () => {
  it('queues crisis event and records fallback broadcast success', async () => {
    const post = createPost();
    useStore.setState({ posts: [post] });

    await useStore.getState().enqueueCrisisEvent({
      post,
      severity: 'high',
      source: 'automatic',
      message: 'auto-detected',
    });

    const queue = useStore.getState().crisisQueue;
    expect(queue).toHaveLength(1);
    const [entry] = queue;
    expect(entry.status).toBe('broadcasted');
    expect(entry.broadcastAttempts).toBe(1);
    expect(entry.lastError).toBeNull();
    expect(entry.fallbackUsed).toBe(true);
    expect(useStore.getState().crisisBroadcastStatus).toBe('idle');
    expect(useStore.getState().crisisBroadcastMetrics.successCount).toBe(1);
    expect(useStore.getState().crisisBroadcastMetrics.failureCount).toBe(0);
  });

  it('surfaces broadcast errors when fallback storage fails', async () => {
    const post = createPost();
    useStore.setState({ posts: [post] });

    (localStorage as unknown as ReturnType<typeof createLocalStorage>).__setFailingKeys([
      'safevoice_crisis_broadcast_shadow',
    ]);

    await useStore.getState().enqueueCrisisEvent({ post, severity: 'high', source: 'automatic' });

    const state = useStore.getState();
    expect(state.crisisBroadcastStatus).toBe('error');
    expect(state.crisisBroadcastError).toContain('Quota exceeded');
    expect(state.crisisBroadcastMetrics.failureCount).toBe(1);
    expect(state.crisisQueue[0]?.lastError).toContain('Quota exceeded');

    (localStorage as unknown as ReturnType<typeof createLocalStorage>).__setFailingKeys([]);
  });

  it('acknowledges crisis events and clears error state', () => {
    const entry = createQueueEntry({
      id: 'entry-ack',
      postId: 'post-ack',
      lastError: 'Network failure',
      status: 'pending',
    });

    useStore.setState({
      crisisQueue: [entry],
      crisisBroadcastStatus: 'error',
      crisisBroadcastError: 'Network failure',
      crisisBroadcastMetrics: {
        successCount: 0,
        failureCount: 1,
        lastSuccessAt: null,
        lastFailureAt: Date.now() - 5000,
        lastSyncAt: Date.now() - 5000,
      },
    });

    useStore.getState().acknowledgeCrisisEvent('entry-ack', 'moderator-1');

    const state = useStore.getState();
    expect(state.crisisQueue).toHaveLength(1);
    const updated = state.crisisQueue[0];
    expect(updated.status).toBe('acknowledged');
    expect(updated.acknowledgedBy).toBe('moderator-1');
    expect(updated.lastError).toBeNull();
    expect(state.crisisBroadcastStatus).toBe('idle');
    expect(state.crisisBroadcastError).toBeNull();
    expect(state.crisisBroadcastMetrics.lastSyncAt).not.toBeNull();
  });

  it('retries pending crisis broadcasts and resets status', async () => {
    const entry: CrisisQueueEntry = createQueueEntry({
      id: 'entry-retry',
      postId: 'post-retry',
      status: 'pending',
      broadcastAttempts: 2,
      lastError: 'Previous failure',
    });

    useStore.setState({
      crisisQueue: [entry],
      crisisBroadcastStatus: 'error',
      crisisBroadcastError: 'Previous failure',
      crisisBroadcastMetrics: {
        successCount: 0,
        failureCount: 1,
        lastSuccessAt: null,
        lastFailureAt: Date.now() - 10000,
        lastSyncAt: Date.now() - 10000,
      },
    });

    await useStore.getState().retryCrisisBroadcast();

    const state = useStore.getState();
    expect(state.crisisQueue).toHaveLength(1);
    const updated = state.crisisQueue[0];
    expect(updated.status).toBe('broadcasted');
    expect(updated.broadcastAttempts).toBe(entry.broadcastAttempts + 1);
    expect(updated.lastError).toBeNull();
    expect(state.crisisBroadcastStatus).toBe('idle');
    expect(state.crisisBroadcastError).toBeNull();
    expect(state.crisisBroadcastMetrics.successCount).toBe(1);
  });
});
