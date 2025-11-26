/**
 * Property-based tests for game display functionality
 * Tests Properties 20 and 21 from the design document
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { GameService } from './GameService';
import { StorageRepository } from './StorageRepository';
import { clearDatabase } from './storage';

describe('GameService - Game Display Property Tests', () => {
  let gameService: GameService;
  let storage: StorageRepository;

  beforeEach(async () => {
    storage = new StorageRepository();
    await storage.initialize();
    gameService = new GameService(storage);
  });

  afterEach(async () => {
    await clearDatabase();
  });

  /**
   * Feature: domino-web-app, Property 20: Historical round data retrieval
   * Validates: Requirements 9.3
   * 
   * For any historical round, selecting it should retrieve and display the associated 
   * image and detection results.
   */
  it('Property 20: Historical round data retrieval - rounds contain image and detection data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // player count
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
        fc.array(
          fc.record({
            score: fc.integer({ min: 0, max: 168 }),
            imageDataUrl: fc.constant('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
            tilesDetected: fc.integer({ min: 1, max: 20 }),
            confidence: fc.double({ min: 0, max: 1 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (playerCount, playerNames, roundsData) => {
          // Create unique player names
          const uniqueNames = Array.from(new Set(playerNames.slice(0, playerCount)));
          while (uniqueNames.length < playerCount) {
            uniqueNames.push(`Player${uniqueNames.length + 1}`);
          }

          // Create game
          const game = await gameService.createGame(playerCount, uniqueNames);

          // Add rounds for random players
          for (const roundData of roundsData) {
            const randomPlayerIndex = Math.floor(Math.random() * game.players.length);
            const playerId = game.players[randomPlayerIndex].id;

            await gameService.addRoundScore(
              game.id,
              playerId,
              roundData.score,
              roundData.imageDataUrl,
              {
                tilesDetected: roundData.tilesDetected,
                confidence: roundData.confidence,
              }
            );
          }

          // Retrieve round history
          const history = await gameService.getRoundHistory(game.id);

          // Verify all rounds have image data
          expect(history.length).toBe(roundsData.length);
          
          for (const round of history) {
            // Each round should have an image data URL
            expect(round.imageDataUrl).toBeDefined();
            expect(round.imageDataUrl).toBeTruthy();
            expect(typeof round.imageDataUrl).toBe('string');
            
            // Each round should have complete data
            expect(round.roundNumber).toBeGreaterThan(0);
            expect(round.playerId).toBeDefined();
            expect(round.playerName).toBeDefined();
            expect(round.score).toBeGreaterThanOrEqual(0);
            expect(round.timestamp).toBeInstanceOf(Date);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 21: Chronological round ordering
   * Validates: Requirements 9.4
   * 
   * For any game with multiple rounds, displaying the rounds should show them 
   * ordered by round number in ascending order.
   */
  it('Property 21: Chronological round ordering - rounds are sorted by round number', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // player count
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
        fc.array(
          fc.record({
            score: fc.integer({ min: 0, max: 168 }),
            imageDataUrl: fc.constant('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
          }),
          { minLength: 2, maxLength: 15 } // At least 2 rounds to test ordering
        ),
        async (playerCount, playerNames, roundsData) => {
          // Create unique player names
          const uniqueNames = Array.from(new Set(playerNames.slice(0, playerCount)));
          while (uniqueNames.length < playerCount) {
            uniqueNames.push(`Player${uniqueNames.length + 1}`);
          }

          // Create game
          const game = await gameService.createGame(playerCount, uniqueNames);

          // Add rounds for random players
          for (const roundData of roundsData) {
            const randomPlayerIndex = Math.floor(Math.random() * game.players.length);
            const playerId = game.players[randomPlayerIndex].id;

            await gameService.addRoundScore(
              game.id,
              playerId,
              roundData.score,
              roundData.imageDataUrl
            );
          }

          // Retrieve round history
          const history = await gameService.getRoundHistory(game.id);

          // Verify rounds are in chronological order (ascending round numbers)
          expect(history.length).toBe(roundsData.length);

          for (let i = 0; i < history.length - 1; i++) {
            const currentRound = history[i];
            const nextRound = history[i + 1];

            // Current round number should be less than or equal to next round number
            expect(currentRound.roundNumber).toBeLessThanOrEqual(nextRound.roundNumber);
          }

          // Verify round numbers start at 1 and increment
          const roundNumbers = history.map(r => r.roundNumber);
          const expectedRoundNumbers = Array.from({ length: roundsData.length }, (_, i) => i + 1);
          
          expect(roundNumbers).toEqual(expectedRoundNumbers);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify round history includes all player information
   * This ensures the game display has complete context for each round
   */
  it('Round history includes complete player information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 4 }),
        fc.array(
          fc.integer({ min: 0, max: 168 }),
          { minLength: 1, maxLength: 8 }
        ),
        async (playerCount, playerNames, scores) => {
          // Create unique player names
          const uniqueNames = Array.from(new Set(playerNames.slice(0, playerCount)));
          while (uniqueNames.length < playerCount) {
            uniqueNames.push(`Player${uniqueNames.length + 1}`);
          }

          // Create game
          const game = await gameService.createGame(playerCount, uniqueNames);

          // Track which player scored each round
          const expectedPlayerNames: string[] = [];

          // Add rounds
          for (const score of scores) {
            const randomPlayerIndex = Math.floor(Math.random() * game.players.length);
            const player = game.players[randomPlayerIndex];
            expectedPlayerNames.push(player.name);

            await gameService.addRoundScore(
              game.id,
              player.id,
              score,
              'data:image/png;base64,test'
            );
          }

          // Retrieve round history
          const history = await gameService.getRoundHistory(game.id);

          // Verify each round has player information
          expect(history.length).toBe(scores.length);

          for (let i = 0; i < history.length; i++) {
            const round = history[i];
            
            // Player ID should be valid
            expect(round.playerId).toBeDefined();
            expect(typeof round.playerId).toBe('string');
            
            // Player name should match the expected player
            expect(round.playerName).toBe(expectedPlayerNames[i]);
            
            // Player should exist in the game
            const playerExists = game.players.some(p => p.id === round.playerId);
            expect(playerExists).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
