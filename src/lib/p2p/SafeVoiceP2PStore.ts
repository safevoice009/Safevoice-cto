import Dexie, { type Table } from 'dexie';

export interface DocumentMetadata {
  docId: string;
  lastUpdatedAt: number;
  peerId: string;
  size: number;
  hash: string;
}

export interface DocumentRecord {
  id?: number;
  docId: string;
  data: Uint8Array;
  metadata: DocumentMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface P2PSession {
  id?: number;
  sessionId: string;
  peerId: string;
  college?: string;
  topics?: string[];
  lastSyncLag: number;
  createdAt: number;
  updatedAt: number;
}

export class SafeVoiceP2PStore extends Dexie {
  documents!: Table<DocumentRecord, number>;
  metadata!: Table<DocumentMetadata, string>;
  sessions!: Table<P2PSession, number>;

  constructor() {
    super('SafeVoiceP2PStore');
    
    this.version(1).stores({
      documents: '++id, docId, updatedAt',
      metadata: 'docId, lastUpdatedAt, peerId',
      sessions: '++id, sessionId, peerId, createdAt'
    });
  }

  async saveDocument(docId: string, data: Uint8Array, metadata: Omit<DocumentMetadata, 'docId'>): Promise<void> {
    await this.transaction('rw', this.documents, this.metadata, async () => {
      const now = Date.now();
      
      // Upsert document
      const existingDoc = await this.documents.where('docId').equals(docId).first();
      if (existingDoc) {
        await this.documents.update(existingDoc.id!, {
          data,
          metadata: { ...metadata, docId },
          updatedAt: now
        });
      } else {
        await this.documents.add({
          docId,
          data,
          metadata: { ...metadata, docId },
          createdAt: now,
          updatedAt: now
        });
      }

      // Update metadata
      await this.metadata.put({ ...metadata, docId });
    });
  }

  async loadDocument(docId: string): Promise<{ data: Uint8Array; metadata: DocumentMetadata } | null> {
    const doc = await this.documents.where('docId').equals(docId).first();
    return doc ? { data: doc.data, metadata: doc.metadata } : null;
  }

  async deleteDocument(docId: string): Promise<void> {
    await this.transaction('rw', this.documents, this.metadata, async () => {
      await this.documents.where('docId').equals(docId).delete();
      await this.metadata.delete(docId);
    });
  }

  async listDocuments(): Promise<DocumentMetadata[]> {
    return await this.metadata.toArray();
  }

  async saveSession(session: Omit<P2PSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = Date.now();
    const existingSession = await this.sessions.where('sessionId').equals(session.sessionId).first();
    
    if (existingSession) {
      await this.sessions.update(existingSession.id!, { ...session, updatedAt: now });
    } else {
      await this.sessions.add({ ...session, createdAt: now, updatedAt: now });
    }
  }

  async getSession(sessionId: string): Promise<P2PSession | undefined> {
    return await this.sessions.where('sessionId').equals(sessionId).first();
  }

  async listSessions(): Promise<P2PSession[]> {
    return await this.sessions.orderBy('updatedAt').reverse().toArray();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessions.where('sessionId').equals(sessionId).delete();
  }

  async clear(): Promise<void> {
    await this.transaction('rw', this.documents, this.metadata, this.sessions, async () => {
      await this.documents.clear();
      await this.metadata.clear();
      await this.sessions.clear();
    });
  }
}

// Fallback to localStorage if IndexedDB is unavailable
export class LocalStorageP2PStore {
  private prefix = 'safevoice_p2p_';

  async saveDocument(docId: string, data: Uint8Array, metadata: Omit<DocumentMetadata, 'docId'>): Promise<void> {
    const key = `${this.prefix}doc_${docId}`;
    const record = {
      data: Array.from(data), // Convert Uint8Array to array for JSON serialization
      metadata: { ...metadata, docId },
      updatedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(record));
  }

  async loadDocument(docId: string): Promise<{ data: Uint8Array; metadata: DocumentMetadata } | null> {
    const key = `${this.prefix}doc_${docId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
      const record = JSON.parse(stored);
      return {
        data: new Uint8Array(record.data),
        metadata: record.metadata
      };
    } catch {
      return null;
    }
  }

  async deleteDocument(docId: string): Promise<void> {
    const key = `${this.prefix}doc_${docId}`;
    localStorage.removeItem(key);
  }

  async listDocuments(): Promise<DocumentMetadata[]> {
    const docs: DocumentMetadata[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${this.prefix}doc_`)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const record = JSON.parse(stored);
            docs.push(record.metadata);
          } catch {
            // Skip invalid records
          }
        }
      }
    }
    return docs;
  }

  async saveSession(session: Omit<P2PSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const key = `${this.prefix}session_${session.sessionId}`;
    const record = {
      ...session,
      updatedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(record));
  }

  async getSession(sessionId: string): Promise<P2PSession | undefined> {
    const key = `${this.prefix}session_${sessionId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return undefined;

    try {
      return JSON.parse(stored);
    } catch {
      return undefined;
    }
  }

  async listSessions(): Promise<P2PSession[]> {
    const sessions: P2PSession[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${this.prefix}session_`)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            sessions.push(JSON.parse(stored));
          } catch {
            // Skip invalid records
          }
        }
      }
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `${this.prefix}session_${sessionId}`;
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));
  }
}

// Factory function to create appropriate store based on availability
export function createP2PStore(): SafeVoiceP2PStore | LocalStorageP2PStore {
  try {
    // Test IndexedDB availability
    if (typeof indexedDB !== 'undefined') {
      const testDB = new Dexie('test');
      return new SafeVoiceP2PStore();
    }
  } catch {
    // Fall back to localStorage
  }
  
  return new LocalStorageP2PStore();
}