/**
 * SyncStatusIndicator - Displays cloud sync status
 * 
 * Shows:
 * - Sync status (synced, syncing, offline, error)
 * - Last sync timestamp
 * - Manual sync button
 * - Conflict resolution notifications
 */

import { useState, useEffect } from 'react';
import { cloudSyncService, type SyncStatus } from '../services/CloudSyncService';
import { authService } from '../services/AuthService';
import './SyncStatusIndicator.css';

export function SyncStatusIndicator() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'offline',
    pendingOperations: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!user) return;

    // Load initial status
    loadSyncStatus();

    // Poll for status updates every 30 seconds
    const interval = setInterval(loadSyncStatus, 30000);

    // Listen for online/offline events
    const handleOnline = () => loadSyncStatus();
    const handleOffline = () => loadSyncStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const loadSyncStatus = async () => {
    if (!user) return;

    try {
      const status = await cloudSyncService.getSyncStatus(user.id);
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
      setSyncStatus({
        status: 'error',
        pendingOperations: 0
      });
    }
  };

  const handleManualSync = async () => {
    if (!user || isSyncing) return;

    setIsSyncing(true);
    try {
      // Process any queued operations first
      await cloudSyncService.processSyncQueue();

      // Then sync all games
      const result = await cloudSyncService.syncAllGames(user.id);

      if (result.success) {
        setNotificationMessage('All games synced successfully');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
      } else {
        setNotificationMessage(`Sync completed with ${result.errors.length} errors`);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      }

      await loadSyncStatus();
    } catch (error) {
      console.error('Manual sync failed:', error);
      setNotificationMessage('Sync failed. Please try again.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!user) {
    return null;
  }

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'synced':
        return '✓';
      case 'syncing':
        return '↻';
      case 'offline':
        return '⚠';
      case 'error':
        return '✗';
      default:
        return '?';
    }
  };

  const getStatusText = () => {
    switch (syncStatus.status) {
      case 'synced':
        return 'Synced';
      case 'syncing':
        return 'Syncing...';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Sync Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusClass = () => {
    return `sync-status-${syncStatus.status}`;
  };

  const formatLastSync = () => {
    if (!syncStatus.lastSyncAt) return 'Never';

    const now = new Date();
    const diff = now.getTime() - syncStatus.lastSyncAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="sync-status-container">
      <div className={`sync-status-indicator ${getStatusClass()}`}>
        <span className="sync-status-icon">{getStatusIcon()}</span>
        <span className="sync-status-text">{getStatusText()}</span>
        {syncStatus.lastSyncAt && (
          <span className="sync-status-time">{formatLastSync()}</span>
        )}
        {syncStatus.pendingOperations > 0 && (
          <span className="sync-status-pending">
            ({syncStatus.pendingOperations} pending)
          </span>
        )}
      </div>

      <button
        className="sync-button"
        onClick={handleManualSync}
        disabled={isSyncing || syncStatus.status === 'syncing'}
        title="Sync now"
      >
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {showNotification && (
        <div className="sync-notification">
          {notificationMessage}
        </div>
      )}
    </div>
  );
}
