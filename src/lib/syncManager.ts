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

export async function syncPendingEntries(): Promise<{ synced: number; failed: number }> {
  const pendingEntries = await getPendingEntries();
  
  if (pendingEntries.length === 0) {
    return { synced: 0, failed: 0 };
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

      const { error } = await supabase.from('container_entries').insert({
        container_number: entry.containerNumber,
        second_container_number: entry.secondContainerNumber || null,
        container_size: entry.size,
        user_name: entry.userName,
        user_id: entry.userId,
        container_image: entry.containerImage,
        license_plate_number: entry.licensePlateNumber || null,
        entry_type: entry.entryType,
        created_at: entry.createdAt,
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
