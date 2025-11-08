export type CrisisLevel = 'high' | 'critical';

export type CrisisRequestStatus = 'pending' | 'assigned' | 'resolved' | 'expired';

export interface CrisisRequest {
  id: string;
  studentId: string;
  crisisLevel: CrisisLevel;
  status: CrisisRequestStatus;
  timestamp: number;
  expiresAt: number;
  ttl: number;
  postId?: string;
  volunteerId?: string;
  metadata?: Record<string, unknown>;
}

export type CrisisQueueEvent =
  | { type: 'upsert'; request: CrisisRequest }
  | { type: 'delete'; requestId: string };

export type CrisisAuditAction = 'created' | 'assigned' | 'resolved' | 'expired' | 'deleted' | 'updated';

export interface CrisisAuditEntry {
  id: string;
  requestId: string;
  action: CrisisAuditAction;
  actorId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface CrisisRequestOptions {
  postId?: string;
  ttlMs?: number;
  metadata?: Record<string, unknown>;
}

export type CrisisQueueUpdate = Partial<Pick<CrisisRequest, 'status' | 'volunteerId' | 'metadata'>>;

type CrisisQueueSubscriber = (event: CrisisQueueEvent) => void;
type CrisisQueueErrorHandler = (error: Error) => void;

type BroadcastHandler = (event: MessageEvent<CrisisQueueEvent>) => void;

const STORAGE_KEY = 'safevoice_crisis_queue';
const BROADCAST_CHANNEL = 'safevoice-crisis-queue';
const DEFAULT_TTL_MS = 15 * 60 * 1000;

const REQUEST_STATUSES_WITH_TIMEOUT: CrisisRequestStatus[] = ['pending', 'assigned'];

const cloneRequest = (request: CrisisRequest): CrisisRequest => ({
  ...request,
  metadata: request.metadata ? { ...request.metadata } : undefined,
});

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `crisis_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

class CrisisQueueService {
  private requests: CrisisRequest[] = [];
  private readonly subscribers = new Map<string, CrisisQueueSubscriber>();
  private readonly errorHandlers = new Map<string, CrisisQueueErrorHandler>();
  private readonly expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly storageAvailable: boolean;
  private broadcastChannel?: BroadcastChannel;
  private broadcastHandler?: BroadcastHandler;
  private destroyed = false;

  constructor() {
    this.storageAvailable = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    this.requests = this.readFromStorage();
    this.requests.sort((a, b) => a.timestamp - b.timestamp);
    this.requests.forEach((request) => this.scheduleExpiry(request));
    this.setupBroadcastChannel();
  }

  createRequest(studentId: string, crisisLevel: CrisisLevel, options: CrisisRequestOptions = {}): Promise<CrisisRequest> {
    if (!studentId) {
      return Promise.reject(new Error('studentId is required'));
    }

    const now = Date.now();
    const ttl = Math.max(options.ttlMs ?? DEFAULT_TTL_MS, 60 * 1000); // enforce at least one minute TTL

    const request: CrisisRequest = {
      id: generateId(),
      studentId,
      crisisLevel,
      status: 'pending',
      timestamp: now,
      ttl,
      expiresAt: now + ttl,
      postId: options.postId,
      metadata: options.metadata ? { ...options.metadata } : undefined,
    };

    this.requests = [...this.requests, request].sort((a, b) => a.timestamp - b.timestamp);
    this.persist();
    this.scheduleExpiry(request);
    this.emit({ type: 'upsert', request: cloneRequest(request) });

    return Promise.resolve(cloneRequest(request));
  }

  updateRequest(requestId: string, updates: CrisisQueueUpdate): Promise<CrisisRequest> {
    const index = this.requests.findIndex((request) => request.id === requestId);
    if (index === -1) {
      return Promise.reject(new Error(`Crisis request ${requestId} not found`));
    }

    const current = this.requests[index];
    const nextMetadata =
      updates.metadata === undefined
        ? current.metadata
        : { ...(current.metadata ?? {}), ...(updates.metadata ?? {}) };

    const nextRequest: CrisisRequest = {
      ...current,
      ...updates,
      metadata: nextMetadata,
    };

    this.requests[index] = nextRequest;
    this.requests.sort((a, b) => a.timestamp - b.timestamp);

    if (!REQUEST_STATUSES_WITH_TIMEOUT.includes(nextRequest.status)) {
      this.clearExpiryTimer(nextRequest.id);
    } else {
      this.scheduleExpiry(nextRequest);
    }

    this.persist();
    this.emit({ type: 'upsert', request: cloneRequest(nextRequest) });

    return Promise.resolve(cloneRequest(nextRequest));
  }

  deleteRequest(requestId: string): Promise<void> {
    const index = this.requests.findIndex((request) => request.id === requestId);
    if (index === -1) {
      return Promise.reject(new Error(`Crisis request ${requestId} not found`));
    }

    this.requests.splice(index, 1);
    this.clearExpiryTimer(requestId);
    this.persist();
    this.emit({ type: 'delete', requestId });

    return Promise.resolve();
  }

  getSnapshot(): CrisisRequest[] {
    return this.requests.map((request) => cloneRequest(request));
  }

  subscribe(subscriberId: string, handler: CrisisQueueSubscriber): () => void {
    this.subscribers.set(subscriberId, handler);
    return () => {
      this.subscribers.delete(subscriberId);
    };
  }

  onError(handler: CrisisQueueErrorHandler): () => void {
    const key = generateId();
    this.errorHandlers.set(key, handler);
    return () => {
      this.errorHandlers.delete(key);
    };
  }

  isSupabaseAvailable(): boolean {
    return false;
  }

  isBroadcastChannelAvailable(): boolean {
    return typeof BroadcastChannel !== 'undefined';
  }

  destroy(): void {
    this.destroyed = true;
    this.expiryTimers.forEach((timer) => clearTimeout(timer));
    this.expiryTimers.clear();
    this.subscribers.clear();

    if (this.broadcastChannel && this.broadcastHandler) {
      this.broadcastChannel.removeEventListener('message', this.broadcastHandler);
      this.broadcastChannel.close();
    }

    this.broadcastChannel = undefined;
    this.broadcastHandler = undefined;
  }

  private setupBroadcastChannel(): void {
    if (!this.isBroadcastChannelAvailable()) {
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);
      this.broadcastHandler = (event) => {
        const payload = event.data;
        if (!payload) {
          return;
        }
        this.applyExternalEvent(payload);
      };
      this.broadcastChannel.addEventListener('message', this.broadcastHandler);
    } catch (error) {
      this.notifyError(error);
      this.broadcastChannel = undefined;
      this.broadcastHandler = undefined;
    }
  }

  private applyExternalEvent(event: CrisisQueueEvent): void {
    if (this.destroyed) {
      return;
    }

    if (event.type === 'upsert') {
      const incoming = cloneRequest(event.request);
      const index = this.requests.findIndex((req) => req.id === incoming.id);
      if (index === -1) {
        this.requests = [...this.requests, incoming];
      } else {
        this.requests[index] = incoming;
      }
      this.requests.sort((a, b) => a.timestamp - b.timestamp);
      this.persist();
      this.scheduleExpiry(incoming);
      this.emit({ type: 'upsert', request: cloneRequest(incoming) }, true);
    } else if (event.type === 'delete') {
      const index = this.requests.findIndex((req) => req.id === event.requestId);
      if (index !== -1) {
        this.requests.splice(index, 1);
        this.clearExpiryTimer(event.requestId);
        this.persist();
        this.emit({ type: 'delete', requestId: event.requestId }, true);
      }
    }
  }

  private emit(event: CrisisQueueEvent, fromBroadcast = false): void {
    this.subscribers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        this.notifyError(error);
      }
    });

    if (fromBroadcast || !this.broadcastChannel) {
      return;
    }

    try {
      this.broadcastChannel.postMessage(event);
    } catch (error) {
      this.notifyError(error);
    }
  }

  private scheduleExpiry(request: CrisisRequest): void {
    if (!REQUEST_STATUSES_WITH_TIMEOUT.includes(request.status)) {
      this.clearExpiryTimer(request.id);
      return;
    }

    const delay = request.expiresAt - Date.now();
    if (delay <= 0) {
      this.handleExpiry(request.id).catch((error) => this.notifyError(error));
      return;
    }

    this.clearExpiryTimer(request.id);
    const timer = setTimeout(() => {
      this.handleExpiry(request.id).catch((error) => this.notifyError(error));
    }, delay);
    this.expiryTimers.set(request.id, timer);
  }

  private clearExpiryTimer(requestId: string): void {
    const timer = this.expiryTimers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.expiryTimers.delete(requestId);
    }
  }

  private async handleExpiry(requestId: string): Promise<void> {
    const index = this.requests.findIndex((request) => request.id === requestId);
    if (index === -1) {
      return;
    }

    const request = this.requests[index];
    if (!REQUEST_STATUSES_WITH_TIMEOUT.includes(request.status)) {
      return;
    }

    await this.updateRequest(requestId, { status: 'expired' });
  }

  private persist(): void {
    if (!this.storageAvailable) {
      return;
    }

    try {
      const payload = JSON.stringify(this.requests);
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch (error) {
      this.notifyError(error);
    }
  }

  private readFromStorage(): CrisisRequest[] {
    if (!this.storageAvailable) {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as CrisisRequest[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item) => ({
          ...item,
          status: (item.status as CrisisRequestStatus) ?? 'pending',
          ttl: typeof item.ttl === 'number' ? item.ttl : DEFAULT_TTL_MS,
          expiresAt: typeof item.expiresAt === 'number' ? item.expiresAt : Date.now() + DEFAULT_TTL_MS,
          timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
          metadata: item.metadata ? { ...item.metadata } : undefined,
        }));
    } catch (error) {
      this.notifyError(error);
      return [];
    }
  }

  private notifyError(error: unknown): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    this.errorHandlers.forEach((handler) => {
      try {
        handler(normalizedError);
      } catch (nestedError) {
        // eslint-disable-next-line no-console
        console.error('CrisisQueueService error handler threw', nestedError);
      }
    });
  }
}

let crisisQueueServiceInstance: CrisisQueueService | null = null;

export const getCrisisQueueService = (): CrisisQueueService => {
  if (!crisisQueueServiceInstance) {
    crisisQueueServiceInstance = new CrisisQueueService();
  }
  return crisisQueueServiceInstance;
};

export const destroyCrisisQueueService = (): void => {
  crisisQueueServiceInstance?.destroy();
  crisisQueueServiceInstance = null;
};
