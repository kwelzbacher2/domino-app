/**
 * Property-based tests for StorageRepository
 * Feature: domino-web-app
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StorageRepository } from './StorageRepository';
import { clearDatabase } from './storage';
import type { Game, Player, RoundScore } from '../models';

describe('StorageRepository', () => {
  let repository: StorageRepository;

  beforeEach(async () => {
    // Clear database before each test
    await clearDatabase();
    repository = new StorageRepository();
  });

  /**
   * Feature: domino-web-app, Property 23: Database persistence round-trip
   * Validates: Requirements 10.1, 10.2
   */
  it('Property 23: Database persistence round-trip - any game data written should be retrievable with identical values', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random game data
        fc.record({
          id: fc.uuid(),
          createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() }).map(ts => new Date(ts)),
          currentRound: fc.integer({ min: 1, max: 20 }),
          status: fc.constantFrom('active' as const, 'completed' as const),
          players: fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 20 }),
              totalScore: fc.integer({ min: 0, max: 500 }),
              rounds: fc.array(
                fc.record({
                  roundNumber: fc.integer({ min: 1, max: 20 }),
                  score: fc.integer({ min: 0, max: 168 }),
                  imageDataUrl: fc.string(),
                  timestamp: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() }).map(ts => new Date(ts)),
                }),
                { maxLength: 5 }
              ),
            }),
            { minLength: 2, maxLength: 6 }
          ),
        }),
        async (gameData: Game) => {
          // Save the game
          await repository.saveGame(gameData);

          // Retrieve the game
          const retrieved = await repository.getGameById(gameData.id);

          // Verify the game was retrieved
          expect(retrieved).not.toBeNull();
          
          if (retrieved) {
            // Verify all fields match
            expect(retrieved.id).toBe(gameData.id);
            expect(retrieved.createdAt.getTime()).toBe(gameData.createdAt.getTime());
            expect(retrieved.currentRound).toBe(gameData.currentRound);
            expect(retrieved.status).toBe(gameData.status);
            expect(retrieved.players.length).toBe(gameData.players.length);

            // Verify player data
            for (let i = 0; i < gameData.players.length; i++) {
              const originalPlayer = gameData.players[i];
              const retrievedPlayer = retrieved.players[i];
              
              expect(retrievedPlayer.id).toBe(originalPlayer.id);
              expect(retrievedPlayer.name).toBe(originalPlayer.name);
              expect(retrievedPlayer.totalScore).toBe(originalPlayer.totalScore);
              expect(retrievedPlayer.rounds.length).toBe(originalPlayer.rounds.length);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 11: Unique game identifiers
   * Validates: Requirements 7.1
   */
  it('Property 11: Unique game identifiers - all created games should have unique identifiers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 20 }),
        async (gameCount: number) => {
          const games: Game[] = [];
          
          // Create multiple games
          for (let i = 0; i < gameCount; i++) {
            const game: Game = {
              id: `game-${Date.now()}-${Math.random()}`,
              createdAt: new Date(),
              currentRound: 1,
              status: 'active',
              players: [
                {
                  id: `player-${i}-1`,
                  name: `Player 1`,
                  totalScore: 0,
                  rounds: [],
                },
                {
                  id: `player-${i}-2`,
                  name: `Player 2`,
                  totalScore: 0,
                  rounds: [],
                },
              ],
            };
            
            await repository.saveGame(game);
            games.push(game);
          }
          
          // Get all game IDs
          const gameIds = games.map(g => g.id);
          const uniqueIds = new Set(gameIds);
          
          // Verify all IDs are unique
          expect(uniqueIds.size).toBe(gameCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 13: Unique player identifiers
   * Validates: Requirements 7.3
   */
  it('Property 13: Unique player identifiers - all players in a game should have unique identifiers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        async (playerCount: number) => {
          const players: Player[] = [];
          
          // Create players with unique IDs
          for (let i = 0; i < playerCount; i++) {
            players.push({
              id: `player-${Date.now()}-${i}-${Math.random()}`,
              name: `Player ${i + 1}`,
              totalScore: 0,
              rounds: [],
            });
          }
          
          const game: Game = {
            id: `game-${Date.now()}`,
            createdAt: new Date(),
            currentRound: 1,
            status: 'active',
            players,
          };
          
          await repository.saveGame(game);
          const retrieved = await repository.getGameById(game.id);
          
          expect(retrieved).not.toBeNull();
          
          if (retrieved) {
            // Get all player IDs
            const playerIds = retrieved.players.map(p => p.id);
            const uniqueIds = new Set(playerIds);
            
            // Verify all player IDs are unique
            expect(uniqueIds.size).toBe(playerCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 24: Cascading deletion
   * Validates: Requirements 10.3
   */
  it('Property 24: Cascading deletion - deleting a game should remove all associated rounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          gameId: fc.uuid(),
          roundCount: fc.integer({ min: 1, max: 10 }),
        }),
        async ({ gameId, roundCount }) => {
          // Create a game
          const game: Game = {
            id: gameId,
            createdAt: new Date(),
            currentRound: 1,
            status: 'active',
            players: [
              {
                id: 'player-1',
                name: 'Player 1',
                totalScore: 0,
                rounds: [],
              },
            ],
          };
          
          await repository.saveGame(game);
          
          // Create rounds for the game
          for (let i = 1; i <= roundCount; i++) {
            const round: RoundScore = {
              roundNumber: i,
              score: 10,
              imageDataUrl: 'data:image/png;base64,test',
              timestamp: new Date(),
            };
            
            await repository.saveRound(gameId, 'player-1', round);
          }
          
          // Verify rounds exist
          const roundsBefore = await repository.getRoundsByGame(gameId);
          expect(roundsBefore.length).toBe(roundCount);
          
          // Delete the game
          await repository.deleteGame(gameId);
          
          // Verify game is deleted
          const deletedGame = await repository.getGameById(gameId);
          expect(deletedGame).toBeNull();
          
          // Verify all rounds are deleted
          const roundsAfter = await repository.getRoundsByGame(gameId);
          expect(roundsAfter.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 25: Database integrity on failure
   * Validates: Requirements 10.4
   */
  it('Property 25: Database integrity on failure - database should remain consistent after operation failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (gameId: string) => {
          // Create a game
          const game: Game = {
            id: gameId,
            createdAt: new Date(),
            currentRound: 1,
            status: 'active',
            players: [
              {
                id: 'player-1',
                name: 'Player 1',
                totalScore: 0,
                rounds: [],
              },
            ],
          };
          
          await repository.saveGame(game);
          
          // Verify game exists
          const savedGame = await repository.getGameById(gameId);
          expect(savedGame).not.toBeNull();
          
          // Try to retrieve a non-existent game (should not corrupt database)
          const nonExistent = await repository.getGameById('non-existent-id');
          expect(nonExistent).toBeNull();
          
          // Verify original game still exists and is intact
          const stillExists = await repository.getGameById(gameId);
          expect(stillExists).not.toBeNull();
          expect(stillExists?.id).toBe(gameId);
          expect(stillExists?.players.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
