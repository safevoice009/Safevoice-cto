/**
 * Crisis Queue Infrastructure
 *
 * Provides a real-time crisis support queue backed by Supabase Realtime when
 * credentials are available, falling back to a local BroadcastChannel for
 * intra-tab communication. The service tracks request TTL (15 minutes by
 * default), expires sessions automatically, and exposes a subscription API so
 * the application store can remain in sync.
 */

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// ============================================================================
// Types & Interfaces
// ============================================================================

export type CrisisRequestStatus = 'pending' | 'assigned' | 'resolved' | 'expired';

export interface CrisisRequest {
  id: string;
  studentId: string;
  crisisLevel: 'high' | 'critical';
  timestamp: number;
  status: CrisisRequestStatus;
  volunteerId: string | null;
  ttl: number;
  expiresAt: number;
  postId?: string | null;
  metadata?: {
    contactPreference?: 'chat' | 'call' | 'text';
    notes?: string;
    [key: string]: unknown;
  };
}

export interface CrisisAuditEntry {
  id: string;
  requestId: string;
  action: 'created' | 'assigned' | 'resolved' | 'expired' | 'updated' | 'deleted';
  actorId: string | null;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type CrisisQueueEvent =
  | { type: 'upsert'; request: CrisisRequest }
  | { type: 'delete'; requestId: string };

export type CrisisQueueCallback = (event: CrisisQueueEvent) => void;
export type CrisisQueueErrorCallback = (error: Error) => void;

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface SupabaseChannel {
  on: (
    event: string,
    filter: Record<string, unknown>,
    callback: (payload: unknown) => void
  ) => SupabaseChannel;
  subscribe: () => Promise<void> | void;
  unsubscribe: () => Promise<void> | void;
}

interface SupabaseClient {
  channel: (channelName: string) => SupabaseChannel;
  from: (table: string) => {
    insert: (data: unknown) => Promise<{ data: unknown; error: unknown }>;
    update: (data: unknown) => {
      eq: (column: string, value: unknown) => Promise<{ data: unknown; error: unknown }>;
    };
    delete: () => {
      eq: (column: string, value: unknown) => Promise<{ data: unknown; error: unknown }>;
    };
  };
}

export interface CrisisQueueOptions {
  supabaseClient?: SupabaseClient | null;
  broadcastFactory?: (name: string) => BroadcastChannel | null;
  channelName?: string;
}

interface CrisisBroadcastMessageUpsert {
  type: 'upsert';
  request: CrisisRequest;
}

interface CrisisBroadcastMessageDelete {
  type: 'delete';
  requestId: string;
}

type CrisisBroadcastMessage = CrisisBroadcastMessageUpsert | CrisisBroadcastMessageDelete;

// ============================================================================
// Utilities
// ============================================================================

const BROADCAST_CHANNEL_NAME = 'crisis-queue';
const SUPABASE_CHANNEL_NAME = 'crisis-requests';
const CRISIS_REQUEST_TABLE = 'crisis_requests';

function safeRandomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `crq_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const trimmedUrl = String(url).trim();
  const trimmedKey = String(anonKey).trim();

  if (!trimmedUrl || !trimmedKey) {
    return null;
  }

  return { url: trimmedUrl, anonKey: trimmedKey };
}

function createSupabaseClient(config: SupabaseConfig): SupabaseClient | null {
  void config;
  // Supabase client is not bundled by default; callers can inject a client via
  // CrisisQueueOptions.supabaseClient. The default implementation returns null
  // so the service gracefully falls back to BroadcastChannel coordination.
  return null;
}

function getGlobalBroadcastConstructor(): (new (name: string) => BroadcastChannel) | null {
  const globalScope = typeof window !== 'undefined' ? window : globalThis;
  const ctor = (globalScope as { BroadcastChannel?: new (name: string) => BroadcastChannel }).BroadcastChannel;
  return typeof ctor === 'function' ? ctor : null;
}

// ============================================================================
// Crisis Queue Service
// ============================================================================

export class CrisisQueueService {
  private readonly channelName: string;
  private readonly broadcastFactory: (name: string) => BroadcastChannel | null;
  private supabaseClient: SupabaseClient | null;
  private supabaseChannel: SupabaseChannel | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private subscribers: Map<string, CrisisQueueCallback> = new Map();
  private errorHandlers: CrisisQueueErrorCallback[] = [];
  private expiryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private requests: Map<string, CrisisRequest> = new Map();

  constructor(options: CrisisQueueOptions = {}) {
    this.channelName = options.channelName ?? BROADCAST_CHANNEL_NAME;
    this.broadcastFactory =
      options.broadcastFactory ??
      ((name: string) => {
        const ctor = getGlobalBroadcastConstructor();
        if (!ctor) {
          return null;
        }
        try {
          return new ctor(name);
        } catch {
          return null;
        }
      });

    this.supabaseClient =
      options.supabaseClient === undefined ? this.initializeSupabaseClient() : options.supabaseClient;

    this.initializeCommunicationLayers();
  }

  private initializeSupabaseClient(): SupabaseClient | null {
    const config = getSupabaseConfig();
    if (!config) {
      return null;
    }

    try {
      return createSupabaseClient(config);
    } catch (error) {
      this.handleError(new Error(`Failed to initialize Supabase client: ${String(error)}`));
      return null;
    }
  }

  private initializeCommunicationLayers(): void {
    if (this.supabaseClient) {
      this.setupSupabaseRealtime();
    }

    this.setupBroadcastChannel();
  }

  private setupSupabaseRealtime(): void {
    if (!this.supabaseClient) return;

    try {
      const channel = this.supabaseClient.channel(SUPABASE_CHANNEL_NAME);
      this.supabaseChannel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: CRISIS_REQUEST_TABLE,
        },
        (payload) => {
          this.handleSupabasePayload(payload);
        }
      );
      void this.supabaseChannel.subscribe();
    } catch (error) {
      this.handleError(new Error(`Failed to subscribe to Supabase Realtime: ${String(error)}`));
      this.supabaseChannel = null;
    }
  }

  private setupBroadcastChannel(): void {
    try {
      this.broadcastChannel = this.broadcastFactory(this.channelName);
      if (this.broadcastChannel) {
        this.broadcastChannel.onmessage = (event: MessageEvent<CrisisBroadcastMessage>) => {
          this.handleBroadcastMessage(event.data);
        };
      }
    } catch (error) {
      this.handleError(new Error(`Failed to initialise BroadcastChannel: ${String(error)}`));
      this.broadcastChannel = null;
    }
  }

  private handleSupabasePayload(payload: unknown): void {
    const typed = payload as {
      eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
      new?: CrisisRequest;
      old?: CrisisRequest;
    };

    if (typed.eventType === 'DELETE' && typed.old?.id) {
      this.applyDelete(typed.old.id, { broadcast: true });
      return;
    }

    if (typed.new) {
      this.applyUpsert(typed.new, { broadcast: true });
    }
  }

  private handleBroadcastMessage(message: CrisisBroadcastMessage | null | undefined): void {
    if (!message) return;

    if (message.type === 'delete' && message.requestId) {
      this.applyDelete(message.requestId, { broadcast: false });
      return;
    }

    if (message.type === 'upsert' && message.request) {
      this.applyUpsert(message.request, { broadcast: false });
    }
  }

  private applyUpsert(request: CrisisRequest, options: { broadcast: boolean }): void {
    this.requests.set(request.id, request);

    if (request.status === 'resolved' || request.status === 'expired') {
      this.clearExpiryTimer(request.id);
    } else {
      this.scheduleExpiry(request);
    }

    if (options.broadcast) {
      this.broadcastMessage({ type: 'upsert', request });
    }

    this.notifySubscribers({ type: 'upsert', request });
  }

  private applyDelete(requestId: string, options: { broadcast: boolean }): void {
    this.requests.delete(requestId);
    this.clearExpiryTimer(requestId);

    if (options.broadcast) {
      this.broadcastMessage({ type: 'delete', requestId });
    }

    this.notifySubscribers({ type: 'delete', requestId });
  }

  private scheduleExpiry(request: CrisisRequest): void {
    const timeLeft = request.expiresAt - Date.now();
    if (timeLeft <= 0) {
      void this.expireRequest(request.id);
      return;
    }

    this.clearExpiryTimer(request.id);

    const timerId = setTimeout(() => {
      void this.expireRequest(request.id);
    }, timeLeft);

    this.expiryTimers.set(request.id, timerId);
  }

  private clearExpiryTimer(requestId: string): void {
    const timer = this.expiryTimers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.expiryTimers.delete(requestId);
    }
  }

  private broadcastMessage(message: CrisisBroadcastMessage): void {
    try {
      this.broadcastChannel?.postMessage(message);
    } catch (error) {
      this.handleError(new Error(`Failed to broadcast crisis queue message: ${String(error)}`));
    }
  }

  private notifySubscribers(event: CrisisQueueEvent): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        this.handleError(new Error(`Crisis queue subscriber failed: ${String(error)}`));
      }
    });
  }

  private handleError(error: Error): void {
    console.error('[CrisisQueue]', error);
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('[CrisisQueue] error handler failed', handlerError);
      }
    });
  }

  private async expireRequest(requestId: string): Promise<void> {
    const existing = this.requests.get(requestId);
    if (!existing || existing.status === 'resolved' || existing.status === 'expired') {
      return;
    }

    const expired: CrisisRequest = {
      ...existing,
      status: 'expired',
      volunteerId: existing.volunteerId,
      expiresAt: existing.expiresAt,
    };

    try {
      if (this.supabaseClient) {
        const { error } = await this.supabaseClient
          .from(CRISIS_REQUEST_TABLE)
          .update({ status: 'expired' })
          .eq('id', requestId);

        if (error) {
          throw error;
        }
      }

      this.applyUpsert(expired, { broadcast: true });
    } catch (error) {
      this.handleError(new Error(`Failed to expire crisis request ${requestId}: ${String(error)}`));
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  getSnapshot(): CrisisRequest[] {
    return Array.from(this.requests.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  isSupabaseAvailable(): boolean {
    return this.supabaseClient !== null;
  }

  isBroadcastChannelAvailable(): boolean {
    return this.broadcastChannel !== null;
  }

  subscribe(id: string, callback: CrisisQueueCallback): () => void {
    this.subscribers.set(id, callback);
    return () => {
      this.subscribers.delete(id);
    };
  }

  onError(handler: CrisisQueueErrorCallback): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index >= 0) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  async createRequest(
    studentId: string,
    crisisLevel: 'high' | 'critical',
    options?: { postId?: string | null; ttl?: number; metadata?: CrisisRequest['metadata'] }
  ): Promise<CrisisRequest> {
    const ttl = Math.max(options?.ttl ?? FIFTEEN_MINUTES_MS, 60 * 1000); // minimum 1 minute safeguard
    const timestamp = Date.now();

    const request: CrisisRequest = {
      id: safeRandomUUID(),
      studentId,
      crisisLevel,
      timestamp,
      status: 'pending',
      volunteerId: null,
      ttl,
      expiresAt: timestamp + ttl,
      postId: options?.postId ?? null,
      metadata: options?.metadata,
    };

    if (this.supabaseClient) {
      const { error } = await this.supabaseClient
        .from(CRISIS_REQUEST_TABLE)
        .insert(request);

      if (error) {
        this.handleError(new Error(`Failed to create crisis request: ${String(error)}`));
        throw error;
      }
    }

    this.applyUpsert(request, { broadcast: true });
    return request;
  }

  async updateRequest(
    requestId: string,
    updates: Partial<Pick<CrisisRequest, 'status' | 'volunteerId' | 'metadata'>>
  ): Promise<CrisisRequest> {
    const existing = this.requests.get(requestId);
    if (!existing) {
      this.handleError(new Error(`Cannot update unknown crisis request: ${requestId}`));
      throw new Error('CRISIS_REQUEST_NOT_FOUND');
    }

    const updated: CrisisRequest = {
      ...existing,
      ...updates,
    };

    if (this.supabaseClient) {
      const { error } = await this.supabaseClient
        .from(CRISIS_REQUEST_TABLE)
        .update({
          status: updated.status,
          volunteerId: updated.volunteerId,
          metadata: updated.metadata,
        })
        .eq('id', requestId);

      if (error) {
        this.handleError(new Error(`Failed to update crisis request: ${String(error)}`));
        throw error;
      }
    }

    this.applyUpsert(updated, { broadcast: true });
    return updated;
  }

  async deleteRequest(requestId: string): Promise<void> {
    if (this.supabaseClient) {
      const { error } = await this.supabaseClient
        .from(CRISIS_REQUEST_TABLE)
        .delete()
        .eq('id', requestId);

      if (error) {
        this.handleError(new Error(`Failed to delete crisis request: ${String(error)}`));
        throw error;
      }
    }

    this.applyDelete(requestId, { broadcast: true });
  }

  destroy(): void {
    this.requests.clear();

    this.expiryTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.expiryTimers.clear();

    if (this.supabaseChannel) {
      void this.supabaseChannel.unsubscribe();
      this.supabaseChannel = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    this.subscribers.clear();
    this.errorHandlers = [];
  }
}

// ============================================================================
// Singleton Helpers
// ============================================================================

let crisisQueueInstance: CrisisQueueService | null = null;

export function getCrisisQueueService(): CrisisQueueService {
  if (!crisisQueueInstance) {
    crisisQueueInstance = new CrisisQueueService();
  }
  return crisisQueueInstance;
}

export function destroyCrisisQueueService(): void {
  crisisQueueInstance?.destroy();
  crisisQueueInstance = null;
}
