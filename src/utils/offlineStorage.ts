// Offline storage using IndexedDB for StudyVault
import { openDB, IDBPDatabase } from 'idb';

interface NoteData {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_favorite?: boolean;
  is_pinned?: boolean;
  tags?: string[];
  category?: string;
  synced: boolean;
  pending_operation?: 'create' | 'update' | 'delete';
}

interface FileData {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  thumbnail_path?: string;
  ocr_text?: string;
  ocr_status?: string;
  tags?: string[];
  category?: string;
  synced: boolean;
  pending_operation?: 'create' | 'update' | 'delete';
}

interface SyncQueueItem {
  id: string;
  entity_type: 'note' | 'file' | 'profile' | 'analytics';
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  created_at: string;
  retry_count: number;
  last_error?: string;
}

interface UserPreference {
  key: string;
  value: any;
  updated_at: string;
}

interface CachedContent {
  url: string;
  data: any;
  cached_at: string;
  expires_at: string;
}

class OfflineStorageManager {
  private static instance: OfflineStorageManager;
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'studyvault-offline';
  private readonly DB_VERSION = 1;

  static getInstance(): OfflineStorageManager {
    if (!OfflineStorageManager.instance) {
      OfflineStorageManager.instance = new OfflineStorageManager();
    }
    return OfflineStorageManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Notes store
          if (!db.objectStoreNames.contains('notes')) {
            const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
            notesStore.createIndex('by-updated', 'updated_at');
            notesStore.createIndex('by-synced', 'synced');
            notesStore.createIndex('by-user', 'user_id');
          }

          // Files store
          if (!db.objectStoreNames.contains('files')) {
            const filesStore = db.createObjectStore('files', { keyPath: 'id' });
            filesStore.createIndex('by-updated', 'updated_at');
            filesStore.createIndex('by-synced', 'synced');
            filesStore.createIndex('by-user', 'user_id');
          }

          // Sync queue store
          if (!db.objectStoreNames.contains('sync_queue')) {
            const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            syncStore.createIndex('by-entity', 'entity_type');
            syncStore.createIndex('by-operation', 'operation');
          }

          // User preferences store
          if (!db.objectStoreNames.contains('user_preferences')) {
            db.createObjectStore('user_preferences', { keyPath: 'key' });
          }

          // Cached content store
          if (!db.objectStoreNames.contains('cached_content')) {
            const cacheStore = db.createObjectStore('cached_content', { keyPath: 'url' });
            cacheStore.createIndex('by-expires', 'expires_at');
          }
        },
      });

      console.log('[OfflineStorage] Database initialized');
    } catch (error) {
      console.error('[OfflineStorage] Failed to initialize database:', error);
    }
  }

  private ensureDB(): IDBPDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Notes operations
  async saveNote(note: Partial<NoteData>, operation: 'create' | 'update' = 'create'): Promise<void> {
    const db = this.ensureDB();
    const noteData: NoteData = {
      id: note.id || '',
      title: note.title || '',
      content: note.content || '',
      created_at: note.created_at || new Date().toISOString(),
      user_id: note.user_id || '',
      ...note,
      synced: false,
      pending_operation: operation,
      updated_at: new Date().toISOString(),
    };

    await db.put('notes', noteData);
    await this.addToSyncQueue('note', noteData.id, operation, noteData);
  }

  async getNote(id: string): Promise<NoteData | null> {
    const db = this.ensureDB();
    return await db.get('notes', id) || null;
  }

  async getAllNotes(userId: string): Promise<NoteData[]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex('notes', 'by-user', userId);
  }

  async getUnsyncedNotes(): Promise<NoteData[]> {
    const db = this.ensureDB();
    const all = await db.getAll('notes');
    return all.filter(note => !note.synced);
  }

  async markNoteSynced(id: string): Promise<void> {
    const db = this.ensureDB();
    const note = await db.get('notes', id);
    if (note) {
      note.synced = true;
      delete note.pending_operation;
      await db.put('notes', note);
    }
  }

  async deleteNote(id: string): Promise<void> {
    const db = this.ensureDB();
    const note = await db.get('notes', id);
    
    if (note) {
      if (note.synced) {
        // Mark for deletion sync
        note.pending_operation = 'delete';
        note.synced = false;
        await db.put('notes', note);
        await this.addToSyncQueue('note', id, 'delete', { id });
      } else {
        // Remove completely if not synced yet
        await db.delete('notes', id);
        await this.removeFromSyncQueue('note', id);
      }
    }
  }

  // Files operations
  async saveFile(file: Partial<FileData>, operation: 'create' | 'update' = 'create'): Promise<void> {
    const db = this.ensureDB();
    const fileData: FileData = {
      id: file.id || '',
      name: file.name || '',
      file_type: file.file_type || '',
      file_size: file.file_size || 0,
      file_path: file.file_path || '',
      user_id: file.user_id || '',
      created_at: file.created_at || new Date().toISOString(),
      ...file,
      synced: false,
      pending_operation: operation,
      updated_at: new Date().toISOString(),
    };

    await db.put('files', fileData);
    await this.addToSyncQueue('file', fileData.id, operation, fileData);
  }

  async getFile(id: string): Promise<FileData | null> {
    const db = this.ensureDB();
    return await db.get('files', id) || null;
  }

  async getAllFiles(userId: string): Promise<FileData[]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex('files', 'by-user', userId);
  }

  async getUnsyncedFiles(): Promise<FileData[]> {
    const db = this.ensureDB();
    const all = await db.getAll('files');
    return all.filter(file => !file.synced);
  }

  async markFileSynced(id: string): Promise<void> {
    const db = this.ensureDB();
    const file = await db.get('files', id);
    if (file) {
      file.synced = true;
      delete file.pending_operation;
      await db.put('files', file);
    }
  }

  // Sync queue operations
  async addToSyncQueue(
    entityType: 'note' | 'file' | 'profile' | 'analytics',
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const db = this.ensureDB();
    const syncItem: SyncQueueItem = {
      id: `${entityType}-${entityId}-${operation}-${Date.now()}`,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      data,
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await db.put('sync_queue', syncItem);
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = this.ensureDB();
    return await db.getAll('sync_queue');
  }

  async removeFromSyncQueue(entityType: string, entityId: string): Promise<void> {
    const db = this.ensureDB();
    const allItems = await db.getAll('sync_queue');
    const itemsToRemove = allItems.filter(
      (item: SyncQueueItem) => item.entity_type === entityType && item.entity_id === entityId
    );

    for (const item of itemsToRemove) {
      await db.delete('sync_queue', item.id);
    }
  }

  async updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const db = this.ensureDB();
    const item = await db.get('sync_queue', id);
    if (item) {
      Object.assign(item, updates);
      await db.put('sync_queue', item);
    }
  }

  // User preferences
  async setPreference(key: string, value: any): Promise<void> {
    const db = this.ensureDB();
    const pref: UserPreference = {
      key,
      value,
      updated_at: new Date().toISOString(),
    };
    await db.put('user_preferences', pref);
  }

  async getPreference(key: string): Promise<any> {
    const db = this.ensureDB();
    const pref = await db.get('user_preferences', key);
    return pref?.value;
  }

  // Cached content
  async cacheContent(url: string, data: any, ttlMinutes: number = 60): Promise<void> {
    const db = this.ensureDB();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const cached: CachedContent = {
      url,
      data,
      cached_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    await db.put('cached_content', cached);
  }

  async getCachedContent(url: string): Promise<any | null> {
    const db = this.ensureDB();
    const cached = await db.get('cached_content', url);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (new Date() > new Date(cached.expires_at)) {
      await db.delete('cached_content', url);
      return null;
    }

    return cached.data;
  }

  async clearExpiredCache(): Promise<void> {
    const db = this.ensureDB();
    const now = new Date().toISOString();
    const expired = await db.getAllFromIndex('cached_content', 'by-expires', 
      IDBKeyRange.upperBound(now)
    );

    for (const item of expired) {
      await db.delete('cached_content', item.url);
    }
  }

  // Cleanup and maintenance
  async clearAllData(): Promise<void> {
    const db = this.ensureDB();
    const stores = ['notes', 'files', 'sync_queue', 'user_preferences', 'cached_content'];
    
    for (const store of stores) {
      await db.clear(store);
    }
  }

  async getStorageStats(): Promise<{
    notes: number;
    files: number;
    syncQueue: number;
    cachedContent: number;
  }> {
    const db = this.ensureDB();
    
    return {
      notes: await db.count('notes'),
      files: await db.count('files'),
      syncQueue: await db.count('sync_queue'),
      cachedContent: await db.count('cached_content'),
    };
  }
}

export const offlineStorage = OfflineStorageManager.getInstance();