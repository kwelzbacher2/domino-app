/**
 * Property-based tests for CloudSyncService
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { CloudSyncService } from './CloudSyncService';
import { StorageRepository } from './StorageRepository';
import type { Game, Player, RoundScore } from '../models/types';

// Mock fetch globally
global.fetch = vi.fn();

describe('CloudSyncService Property Tests', () => {
  let service: CloudSyncService;
  let storage: StorageRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new StorageRepository();
    service = new CloudSyncService(storage);
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  // Generators
  const playerArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    totalScore: fc.integer({ min: 0, max: 500 }),
    rounds: fc.array(
      fc.record({
        roundNumber: fc.integer({ min: 1, max: 20 }),
        score: fc.integer({ min: 0, max: 168 }),
        imageDataUrl: fc.constant('data:image/png;base64,test'),
        timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        detectionResult: fc.option(
          fc.record({
            tilesDetected: fc.integer({ min: 0, max: 20 }),
            confidence: fc.double({ min: 0, max: 1 }),
            manualCorrections: fc.option(fc.array(fc.anything()))
          })
        )
      }),
      { minLength: 0, maxLength: 10 }
    )
  });

  const gameArb = fc.record({
    id: fc.uuid(),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    currentRound: fc.integer({ min: 1, max: 20 }),
    players: fc.array(playerArb, { minLength: 2, maxLength: 10 }),
    status: fc.constantFrom('active' as const, 'completed' as const)
  });

  /**
   * Feature: domino-web-app, Property 29: Cloud sync persistence
   * Validates: Requirements 13.3, 14.1
   * 
   * For any game saved locally, syncing to the cloud should result in the game
   * being retrievable from the cloud database with identical data.
   */
  it('Property 29: Cloud sync persistence - synced games can be retrieved from cloud', async () => {
    await fc.assert(
      fc.asyncProperty(gameArb, fc.uuid(), async (game, userId) => {
        // Mock successful sync
        const mockFetch = vi.fn()
          .mockResolvedValueOnce({ ok: true, json: async () => ({ game_id: game.id }) }) // Game sync
          .mockResolvedValue({ ok: true, json: async () => ({}) }); // Round syncs
        
        global.fetch = mockFetch;

        // Sync game to cloud
        const syncResult = await service.syncGame(game, userId);

        // Verify sync was attempted
        expect(syncResult.success).toBe(true);
        expect(mockFetch).toHaveBeenCalled();

        // Verify game endpoint was called with correct data
        const gameCall = mockFetch.mock.calls.find(call => 
          call[0].includes('/games') && call[1]?.method === 'POST'
        );
        expect(gameCall).toBeDefined();

        if (gameCall) {
          const body = JSON.parse(gameCall[1].body);
          expect(body.gameId).toBe(game.id);
          expect(body.userId).toBe(userId);
          expect(body.status).toBe(game.status);
          expect(body.currentRound).toBe(game.currentRound);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 30: Cloud data restoration
   * Validates: Requirements 13.4, 14.3
   * 
   * For any user signing in on a new device, all games associated with that
   * username should be loaded from the cloud database.
   */
  it('Property 30: Cloud data restoration - all user games are restored from cloud', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(gameArb, { minLength: 0, maxLength: 5 }),
        async (userId, games) => {
          // Filter out games with invalid dates
          const validGames = games.filter(g => !isNaN(g.createdAt.getTime()));
          
          // Mock cloud API responses
          const cloudGames = validGames.map(game => ({
            game_id: game.id,
            user_id: userId,
            created_at: game.createdAt.toISOString(),
            updated_at: new Date().toISOString(),
            current_round: game.currentRound,
            status: game.status,
            player_count: game.players.length,
            players: JSON.stringify(game.players.map(p => ({
              playerId: p.id,
              username: p.name,
              totalScore: p.totalScore
            })))
          }));

          const mockFetch = vi.fn()
            .mockResolvedValueOnce({ 
              ok: true, 
              json: async () => cloudGames 
            })
            .mockResolvedValue({ 
              ok: true, 
              json: async () => [] // No rounds for simplicity
            });

          global.fetch = mockFetch;

          // Restore games from cloud
          const restoredGames = await service.restoreGamesFromCloud(userId);

          // Verify all games were restored
          expect(restoredGames.length).toBe(validGames.length);

          // Verify each game ID is present
          const restoredIds = new Set(restoredGames.map(g => g.id));
          for (const game of validGames) {
            expect(restoredIds.has(game.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 31: Conflict resolution consistency
   * Validates: Requirements 14.4
   * 
   * For any pair of conflicting game records (local and cloud), the conflict
   * resolution should select the record with the most recent timestamp.
   */
  it('Property 31: Conflict resolution consistency - most recent game is selected', async () => {
    await fc.assert(
      fc.asyncProperty(
        gameArb,
        gameArb,
        fc.boolean(),
        async (game1, game2, localIsNewer) => {
          // Ensure games have same ID but different timestamps
          const localGame = { 
            ...game1,
            players: game1.players.map(p => ({
              ...p,
              rounds: p.rounds.map(r => ({
                ...r,
                timestamp: new Date('2024-01-01')
              }))
            }))
          };
          
          const cloudGame = { 
            ...game2, 
            id: game1.id,
            players: game2.players.map(p => ({
              ...p,
              rounds: p.rounds.map(r => ({
                ...r,
                timestamp: new Date('2024-01-01')
              }))
            }))
          };

          // Set timestamps based on which should be newer
          // Add a round with newer timestamp to the appropriate game
          if (localIsNewer) {
            localGame.createdAt = new Date('2024-01-01');
            cloudGame.createdAt = new Date('2024-01-01');
            if (localGame.players.length > 0) {
              localGame.players[0].rounds.push({
                roundNumber: 999,
                score: 0,
                imageDataUrl: 'test',
                timestamp: new Date('2024-01-02'),
                detectionResult: undefined
              });
            }
          } else {
            localGame.createdAt = new Date('2024-01-01');
            cloudGame.createdAt = new Date('2024-01-01');
            if (cloudGame.players.length > 0) {
              cloudGame.players[0].rounds.push({
                roundNumber: 999,
                score: 0,
                imageDataUrl: 'test',
                timestamp: new Date('2024-01-02'),
                detectionResult: undefined
              });
            }
          }

          // Resolve conflict
          const resolved = service.resolveConflicts(localGame, cloudGame);

          // Verify the newer game was selected by checking if it has the marker round
          if (localIsNewer && localGame.players.length > 0) {
            const hasMarkerRound = resolved.players[0].rounds.some(r => r.roundNumber === 999);
            expect(hasMarkerRound).toBe(true);
          } else if (!localIsNewer && cloudGame.players.length > 0) {
            const hasMarkerRound = resolved.players[0].rounds.some(r => r.roundNumber === 999);
            expect(hasMarkerRound).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 32: Offline sync queue
   * Validates: Requirements 14.5
   * 
   * For any sync operation attempted while offline, the operation should be
   * queued and the queue should contain that operation.
   */
  it('Property 32: Offline sync queue - operations are queued when offline', async () => {
    await fc.assert(
      fc.asyncProperty(gameArb, fc.uuid(), async (game, userId) => {
        // Set offline
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        });

        // Create a fresh service instance to ensure clean queue
        const offlineService = new CloudSyncService(storage);

        // Attempt to sync while offline
        const result = await offlineService.syncGame(game, userId);

        // Verify operation was queued
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Offline');

        // Verify sync status shows pending operations
        const status = await offlineService.getSyncStatus(userId);
        expect(status.status).toBe('offline');
        expect(status.pendingOperations).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Sync queue persistence
   * Verifies that queued operations survive service restart
   */
  it('Property: Sync queue persists across service restarts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(gameArb, { minLength: 1, maxLength: 3 }),
        fc.uuid(),
        async (games, userId) => {
          // Set offline
          Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false
          });

          const service1 = new CloudSyncService(storage);

          // Queue multiple operations
          for (const game of games) {
            await service1.syncGame(game, userId);
          }

          const status1 = await service1.getSyncStatus(userId);
          const queueSize1 = status1.pendingOperations;

          // Create new service instance (simulates restart)
          const service2 = new CloudSyncService(storage);
          const status2 = await service2.getSyncStatus(userId);

          // Verify queue was persisted
          expect(status2.pendingOperations).toBe(queueSize1);
        }
      ),
      { numRuns: 20 }
    );
  }, 10000); // 10 second timeout
});
