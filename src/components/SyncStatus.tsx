import { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getPendingCount, getLastSyncTime } from '@/lib/offlineStorage';
import { attemptSync } from '@/lib/syncManager';
import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export function SyncStatus() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      const count = await getPendingCount();
      const syncTime = await getLastSyncTime();
      setPendingCount(count);
      setLastSync(syncTime);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline && pendingCount > 0) {
      handleSync();
    }
  }, [wasOffline, isOnline, pendingCount]);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    await attemptSync();
    
    // Refresh counts
    const count = await getPendingCount();
    const syncTime = await getLastSyncTime();
    setPendingCount(count);
    setLastSync(syncTime);
    setIsSyncing(false);
  };

  // Only show when there's something to display
  if (isOnline && pendingCount === 0 && !wasOffline) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
      isOnline 
        ? pendingCount > 0 
          ? 'bg-amber-500/10 text-amber-600' 
          : 'bg-emerald-500/10 text-emerald-600'
        : 'bg-destructive/10 text-destructive'
    }`}>
      {isOnline ? (
        pendingCount > 0 ? (
          <>
            <Cloud className="h-4 w-4" />
            <span>{pendingCount} pending</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="h-6 px-2 text-xs"
            >
              {isSyncing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                'Sync now'
              )}
            </Button>
          </>
        ) : wasOffline ? (
          <>
            <Check className="h-4 w-4" />
            <span>Back online</span>
          </>
        ) : null
      ) : (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Offline mode</span>
          {pendingCount > 0 && (
            <span className="text-xs opacity-70">({pendingCount} queued)</span>
          )}
        </>
      )}
    </div>
  );
}
