/**
 * CloudSyncService - Manages synchronization between local and cloud storage
 * 
 * This service handles:
 * - Syncing games to cloud database
 * - Restoring games from cloud on sign-in
 * - Conflict resolution using timestamps
 * - Offline queue for sync operations
 * - Automatic sync on game create/update
 */

import type { Game, User } from '../models/types';
import { StorageRepository } from './StorageRepository';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
}

export interface SyncOperation {
  type: 'create' | 'update' | 'delete';
  gameId: string;
  timestamp: Date;
  data?: any;
}

export interface SyncStatus {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncAt?: Date;
  pendingOperations: number;
}

/**
 * Service for managing cloud synchronization
 */
export class CloudSyncService {
  private storage: StorageRepository;
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  private readonly QUEUE_STORAGE_KEY = 'domino_sync_queue';

  constructor(storage: StorageRepository) {
    this.storage = storage;
    this.loadSyncQueue();
  }

  /**
   * Load sync queue from localStorage
   */
  private loadSyncQueue(): void {
    try {
      const queueJson = localStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (queueJson) {
        const queue = JSON.parse(queueJson);
        this.syncQueue = queue.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Save sync queue to localStorage
   */
  private saveSyncQueue(): void {
    try {
      localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Check if online
   */
  private isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Sync a single game to the cloud
   * Requirements: 13.3, 14.1
   */
  async syncGame(game: Game, userId: string): Promise<SyncResult> {
    const errors: string[] = [];

    try {
      if (!this.isOnline()) {
        // Queue for later
        this.queueSyncOperation({
          type: 'update',
          gameId: game.id,
          timestamp: new Date(),
          data: { game, userId }
        });
        return {
          success: false,
          itemsSynced: 0,
          errors: ['Offline - operation queued']
        };
      }

      // Sync game
      const response = await fetch(`${API_BASE_URL}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          userId,
          createdAt: game.createdAt,
          updatedAt: new Date(),
          currentRound: game.currentRound,
          status: game.status,
          playerCount: game.players.length,
          players: game.players.map(p => ({
            playerId: p.id,
            username: p.name,
            totalScore: p.totalScore
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to sync game: ${response.statusText}`);
      }

      // Sync rounds for each player
      let roundsSynced = 0;
      for (const player of game.players) {
        for (const round of player.rounds) {
          try {
            const roundResponse = await fetch(`${API_BASE_URL}/rounds`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roundId: `${game.id}_${player.id}_${round.roundNumber}`,
                gameId: game.id,
                playerId: player.id,
                roundNumber: round.roundNumber,
                score: round.score,
                imageData: round.imageDataUrl,
                timestamp: round.timestamp,
                detectionResult: round.detectionResult
              })
            });

            if (roundResponse.ok) {
              roundsSynced++;
            }
          } catch (error) {
            errors.push(`Failed to sync round ${round.roundNumber} for player ${player.name}`);
          }
        }
      }

      return {
        success: true,
        itemsSynced: 1 + roundsSynced,
        errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      
      // Queue for retry
      this.queueSyncOperation({
        type: 'update',
        gameId: game.id,
        timestamp: new Date(),
        data: { game, userId }
      });

      return {
        success: false,
        itemsSynced: 0,
        errors
      };
    }
  }

  /**
   * Sync all local games to the cloud
   * Requirements: 14.1
   */
  async syncAllGames(userId: string): Promise<SyncResult> {
    const games = await this.storage.getAllGames();
    const errors: string[] = [];
    let totalSynced = 0;

    for (const game of games) {
      const result = await this.syncGame(game, userId);
      totalSynced += result.itemsSynced;
      errors.push(...result.errors);
    }

    return {
      success: errors.length === 0,
      itemsSynced: totalSynced,
      errors
    };
  }

  /**
   * Restore games from cloud for a user
   * Requirements: 13.4, 14.3
   */
  async restoreGamesFromCloud(userId: string): Promise<Game[]> {
    try {
      if (!this.isOnline()) {
        throw new Error('Cannot restore games while offline');
      }

      // Fetch games from cloud
      const response = await fetch(`${API_BASE_URL}/games/${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch games: ${response.statusText}`);
      }

      const cloudGames = await response.json();
      const restoredGames: Game[] = [];

      for (const cloudGame of cloudGames) {
        // Fetch rounds for this game
        const roundsResponse = await fetch(`${API_BASE_URL}/rounds/${cloudGame.game_id}`);
        const cloudRounds = roundsResponse.ok ? await roundsResponse.json() : [];

        // Reconstruct game object
        const players = JSON.parse(cloudGame.players || '[]').map((p: any) => ({
          id: p.playerId,
          name: p.username,
          totalScore: p.totalScore,
          rounds: cloudRounds
            .filter((r: any) => r.player_id === p.playerId)
            .map((r: any) => ({
              roundNumber: r.round_number,
              score: r.score,
              imageDataUrl: r.image_data || '',
              timestamp: new Date(r.timestamp),
              detectionResult: r.detection_result ? JSON.parse(r.detection_result) : undefined
            }))
        }));

        const game: Game = {
          id: cloudGame.game_id,
          createdAt: new Date(cloudGame.created_at),
          currentRound: cloudGame.current_round,
          players,
          status: cloudGame.status
        };

        // Check for conflicts with local data
        const localGame = await this.storage.getGameById(game.id);
        if (localGame) {
          const resolvedGame = this.resolveConflicts(localGame, game);
          await this.storage.saveGame(resolvedGame);
          restoredGames.push(resolvedGame);
        } else {
          await this.storage.saveGame(game);
          restoredGames.push(game);
        }
      }

      return restoredGames;
    } catch (error) {
      console.error('Failed to restore games from cloud:', error);
      throw error;
    }
  }

  /**
   * Resolve conflicts between local and cloud game data
   * Uses most recent timestamp to determine which version to keep
   * Requirements: 14.4
   */
  resolveConflicts(localGame: Game, cloudGame: Game): Game {
    // Compare timestamps - use the most recently updated game
    const localTimestamp = this.getGameLastModified(localGame);
    const cloudTimestamp = this.getGameLastModified(cloudGame);

    if (cloudTimestamp > localTimestamp) {
      return cloudGame;
    }

    return localGame;
  }

  /**
   * Get the last modified timestamp for a game
   */
  private getGameLastModified(game: Game): Date {
    let latestTimestamp = game.createdAt;

    for (const player of game.players) {
      for (const round of player.rounds) {
        if (round.timestamp > latestTimestamp) {
          latestTimestamp = round.timestamp;
        }
      }
    }

    return latestTimestamp;
  }

  /**
   * Queue a sync operation for later execution
   * Requirements: 14.5
   */
  queueSyncOperation(operation: SyncOperation): void {
    this.syncQueue.push(operation);
    this.saveSyncQueue();
  }

  /**
   * Process queued sync operations
   * Requirements: 14.5
   */
  async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline() || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      const operations = [...this.syncQueue];
      this.syncQueue = [];
      this.saveSyncQueue();

      for (const operation of operations) {
        try {
          if (operation.type === 'update' && operation.data) {
            await this.syncGame(operation.data.game, operation.data.userId);
          } else if (operation.type === 'delete') {
            await fetch(`${API_BASE_URL}/games/${operation.gameId}`, {
              method: 'DELETE'
            });
          }
        } catch (error) {
          console.error('Failed to process sync operation:', error);
          // Re-queue failed operation
          this.syncQueue.push(operation);
        }
      }

      this.saveSyncQueue();
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get current sync status
   * Requirements: 14.1, 14.5
   */
  async getSyncStatus(userId: string): Promise<SyncStatus> {
    if (!this.isOnline()) {
      return {
        status: 'offline',
        pendingOperations: this.syncQueue.length
      };
    }

    if (this.isSyncing) {
      return {
        status: 'syncing',
        pendingOperations: this.syncQueue.length
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sync/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to get sync status');
      }

      const data = await response.json();
      return {
        status: 'synced',
        lastSyncAt: data.lastSyncAt ? new Date(data.lastSyncAt) : undefined,
        pendingOperations: this.syncQueue.length
      };
    } catch (error) {
      return {
        status: 'error',
        pendingOperations: this.syncQueue.length
      };
    }
  }

  /**
   * Register user with cloud backend
   */
  async registerUser(user: User): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.username
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register user with cloud');
      }
    } catch (error) {
      console.error('Failed to register user:', error);
      throw error;
    }
  }
}

// Export singleton instance
import { storageRepository } from './StorageRepository';
export const cloudSyncService = new CloudSyncService(storageRepository);
