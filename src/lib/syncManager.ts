import { supabase } from '@/integrations/supabase/client';
import { 
  getPendingEntries, 
  removePendingEntry, 
  updatePendingEntryStatus,
  updateLastSyncTime,
  PendingEntry 
} from './offlineStorage';
import { toast } from 'sonner';

const MAX_RETRIES = 3;

// Store the current session token for sync operations
let currentSessionToken: string | null = null;

export function setSessionTokenForSync(token: string | null): void {
  currentSessionToken = token;
}

export async function syncPendingEntries(): Promise<{ synced: number; failed: number }> {
  const pendingEntries = await getPendingEntries();
  
  if (pendingEntries.length === 0) {
    return { synced: 0, failed: 0 };
  }

  if (!currentSessionToken) {
    console.log('No session token available for sync');
    return { synced: 0, failed: pendingEntries.length };
  }

  let synced = 0;
  let failed = 0;

  for (const entry of pendingEntries) {
    if (entry.retryCount >= MAX_RETRIES) {
      failed++;
      continue;
    }

    try {
      await updatePendingEntryStatus(entry.id, 'syncing');

      // Use secure RPC that validates session
      const { error } = await supabase.rpc('create_container_entry', {
        p_session_token: currentSessionToken,
        p_container_number: entry.containerNumber,
        p_container_size: entry.size,
        p_entry_type: entry.entryType,
        p_second_container_number: entry.secondContainerNumber || null,
        p_license_plate_number: entry.licensePlateNumber || null,
        p_container_image: entry.containerImage || null,
      });

      if (error) throw error;

      await removePendingEntry(entry.id);
      synced++;
    } catch (error) {
      console.error('Failed to sync entry:', error);
      await updatePendingEntryStatus(entry.id, 'failed', true);
      failed++;
    }
  }

  if (synced > 0) {
    await updateLastSyncTime();
  }

  return { synced, failed };
}

export async function attemptSync(): Promise<void> {
  if (!navigator.onLine) return;

  try {
    const { synced, failed } = await syncPendingEntries();
    
    if (synced > 0) {
      toast.success(`Synced ${synced} offline ${synced === 1 ? 'entry' : 'entries'}`);
    }
    
    if (failed > 0) {
      toast.error(`${failed} ${failed === 1 ? 'entry' : 'entries'} failed to sync`);
    }
  } catch (error) {
    console.error('Sync attempt failed:', error);
  }
}

// Register for background sync if available
export function registerBackgroundSync(): void {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      (registration as any).sync.register('sync-entries').catch((err: Error) => {
        console.log('Background sync registration failed:', err);
      });
    });
  }
}

// Auto-sync when coming online
let syncListenerRegistered = false;

export function setupAutoSync(): void {
  if (syncListenerRegistered) return;
  
  window.addEventListener('online', () => {
    console.log('Network restored, attempting sync...');
    attemptSync();
  });
  
  syncListenerRegistered = true;
}
