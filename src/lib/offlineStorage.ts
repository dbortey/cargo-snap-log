import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PendingEntry {
  id: string;
  containerNumber: string;
  secondContainerNumber?: string;
  size: string;
  containerImage: string;
  licensePlateNumber: string;
  entryType: string;
  userId: string;
  userName: string;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

interface CachedEntry {
  id: string;
  container_number: string;
  second_container_number?: string | null;
  container_size: string;
  user_name: string;
  user_id?: string | null;
  created_at: string;
  container_image?: string | null;
  license_plate_number?: string | null;
  entry_type: string;
  deletion_requested?: boolean;
}

interface OfflineDBSchema extends DBSchema {
  pendingEntries: {
    key: string;
    value: PendingEntry;
    indexes: { 'by-status': string };
  };
  cachedEntries: {
    key: string;
    value: CachedEntry;
  };
  syncMetadata: {
    key: string;
    value: { lastSyncAt: string };
  };
}

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDBSchema>('container-tracker-offline', 1, {
    upgrade(db) {
      // Pending entries store
      const pendingStore = db.createObjectStore('pendingEntries', { keyPath: 'id' });
      pendingStore.createIndex('by-status', 'syncStatus');

      // Cached entries store
      db.createObjectStore('cachedEntries', { keyPath: 'id' });

      // Sync metadata store
      db.createObjectStore('syncMetadata', { keyPath: 'lastSyncAt' });
    },
  });

  return dbInstance;
}

// Pending entries operations
export async function addPendingEntry(entry: Omit<PendingEntry, 'syncStatus' | 'retryCount'>): Promise<void> {
  const db = await getDB();
  await db.put('pendingEntries', {
    ...entry,
    syncStatus: 'pending',
    retryCount: 0,
  });
}

export async function getPendingEntries(): Promise<PendingEntry[]> {
  const db = await getDB();
  return db.getAll('pendingEntries');
}

export async function getPendingEntriesByStatus(status: PendingEntry['syncStatus']): Promise<PendingEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingEntries', 'by-status', status);
}

export async function updatePendingEntryStatus(
  id: string, 
  status: PendingEntry['syncStatus'],
  incrementRetry = false
): Promise<void> {
  const db = await getDB();
  const entry = await db.get('pendingEntries', id);
  if (entry) {
    entry.syncStatus = status;
    if (incrementRetry) {
      entry.retryCount += 1;
    }
    await db.put('pendingEntries', entry);
  }
}

export async function removePendingEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingEntries', id);
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count('pendingEntries');
}

// Cached entries operations
export async function setCachedEntries(entries: CachedEntry[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cachedEntries', 'readwrite');
  await tx.store.clear();
  for (const entry of entries) {
    await tx.store.put(entry);
  }
  await tx.done;
}

export async function getCachedEntries(): Promise<CachedEntry[]> {
  const db = await getDB();
  return db.getAll('cachedEntries');
}

export async function updateLastSyncTime(): Promise<void> {
  const db = await getDB();
  await db.put('syncMetadata', { lastSyncAt: new Date().toISOString() });
}

export async function getLastSyncTime(): Promise<string | null> {
  const db = await getDB();
  const all = await db.getAll('syncMetadata');
  return all.length > 0 ? all[0].lastSyncAt : null;
}

export type { PendingEntry, CachedEntry };
