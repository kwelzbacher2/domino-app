/**
 * Property-based tests for GameService
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { GameService } from './GameService';
import { StorageRepository } from './StorageRepository';
import { clearDatabase } from './storage';

describe('GameService - Property-Based Tests', () => {
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
   * Feature: domino-web-app, Property 12: Game initialization
   * Validates: Requirements 7.4
   * 
   * For any newly created game, the initial state should have current round set to 1 
   * and a creation timestamp.
   */
  it('Property 12: Game initialization - new games start at round 1 with timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // player count
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
        async (playerCount, playerNames) => {
          // Ensure we have the right number of player names
          const names = playerNames.slice(0, playerCount);
          if (names.length < playerCount) {
            names.push(...Array(playerCount - names.length).fill('Player'));
          }

          const beforeCreate = new Date();
          const game = await gameService.createGame(playerCount, names);
          const afterCreate = new Date();

          // Game should start at round 1
          expect(game.currentRound).toBe(1);

          // Game should have a creation timestamp between before and after
          expect(game.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
          expect(game.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

          // Game should be active
          expect(game.status).toBe('active');

          // Game should have the correct number of players
          expect(game.players.length).toBe(playerCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 14: Active games query completeness
   * Validates: Requirements 7.5
   * 
   * For any set of active games in the database, querying for active games should 
   * return all and only those games with status 'active'.
   */
  it('Property 14: Active games query completeness - returns only active games', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            playerCount: fc.integer({ min: 2, max: 10 }),
            playerNames: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
            shouldComplete: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (gameConfigs) => {
          // Clear database before each iteration
          await clearDatabase();
          
          const createdGames = [];

          // Create games
          for (const config of gameConfigs) {
            const names = config.playerNames.slice(0, config.playerCount);
            if (names.length < config.playerCount) {
              names.push(...Array(config.playerCount - names.length).fill('Player'));
            }

            const game = await gameService.createGame(config.playerCount, names);
            createdGames.push({ game, shouldComplete: config.shouldComplete });
          }

          // Complete some games
          for (const { game, shouldComplete } of createdGames) {
            if (shouldComplete) {
              await gameService.endGame(game.id);
            }
          }

          // Query active games
          const activeGames = await gameService.listActiveGames();

          // Count expected active games
          const expectedActiveCount = createdGames.filter(g => !g.shouldComplete).length;

          // Should return correct number of active games
          expect(activeGames.length).toBe(expectedActiveCount);

          // All returned games should be active
          for (const game of activeGames) {
            expect(game.status).toBe('active');
          }

          // All active games should be in the result
          const activeGameIds = new Set(activeGames.map(g => g.id));
          for (const { game, shouldComplete } of createdGames) {
            if (!shouldComplete) {
              expect(activeGameIds.has(game.id)).toBe(true);
            } else {
              expect(activeGameIds.has(game.id)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 50 } // Reduced runs due to complexity
    );
  });

  /**
   * Feature: domino-web-app, Property 17: Round progression
   * Validates: Requirements 8.4
   * 
   * For any game, completing a round should increment the current round number by exactly 1.
   */
  it('Property 17: Round progression - round number increments by 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // player count
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 168 }), { minLength: 1, maxLength: 20 }), // round scores
        async (playerCount, playerNames, scores) => {
          // Create game
          const names = playerNames.slice(0, playerCount);
          if (names.length < playerCount) {
            names.push(...Array(playerCount - names.length).fill('Player'));
          }

          const game = await gameService.createGame(playerCount, names);
          const initialRound = game.currentRound;

          // Add rounds
          for (let i = 0; i < scores.length; i++) {
            const playerIndex = i % game.players.length;
            const player = game.players[playerIndex];

            await gameService.addRoundScore(
              game.id,
              player.id,
              scores[i],
              'data:image/png;base64,test'
            );

            // Get updated game
            const updatedGame = await gameService.getGame(game.id);

            // Round should have incremented by exactly 1
            expect(updatedGame.currentRound).toBe(initialRound + i + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 22: Game completion state
   * Validates: Requirements 9.5
   * 
   * For any active game, ending the game should change its status to 'completed' 
   * and produce final standings ordered by total score.
   */
  it('Property 22: Game completion state - ending game marks as completed with standings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // player count
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
        fc.array(
          fc.record({
            playerIndex: fc.integer({ min: 0, max: 9 }),
            score: fc.integer({ min: 0, max: 168 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (playerCount, playerNames, rounds) => {
          // Create game
          const names = playerNames.slice(0, playerCount);
          if (names.length < playerCount) {
            names.push(...Array(playerCount - names.length).fill('Player'));
          }

          const game = await gameService.createGame(playerCount, names);

          // Add rounds
          for (const round of rounds) {
            const playerIndex = round.playerIndex % game.players.length;
            const player = game.players[playerIndex];

            await gameService.addRoundScore(
              game.id,
              player.id,
              round.score,
              'data:image/png;base64,test'
            );
          }

          // End the game
          const summary = await gameService.endGame(game.id);

          // Game should be marked as completed
          const completedGame = await gameService.getGame(game.id);
          expect(completedGame.status).toBe('completed');

          // Summary should have correct game ID
          expect(summary.gameId).toBe(game.id);

          // Summary should have all players
          expect(summary.players.length).toBe(playerCount);

          // Players should be ordered by total score (ascending for domino scoring)
          for (let i = 1; i < summary.players.length; i++) {
            expect(summary.players[i].totalScore).toBeGreaterThanOrEqual(
              summary.players[i - 1].totalScore
            );
          }

          // Ranks should be assigned correctly (1, 2, 3, ...)
          for (let i = 0; i < summary.players.length; i++) {
            expect(summary.players[i].rank).toBe(i + 1);
          }

          // Total rounds should match the number of rounds played
          expect(summary.totalRounds).toBe(rounds.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 15: Score accumulation
   * Validates: Requirements 8.2
   * 
   * For any player and any sequence of round scores, the player's total score 
   * should equal the sum of all their round scores.
   */
  it('Property 15: Score accumulation - player total equals sum of rounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // player count
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
        fc.array(
          fc.record({
            playerIndex: fc.integer({ min: 0, max: 9 }),
            score: fc.integer({ min: 0, max: 168 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (playerCount, playerNames, rounds) => {
          // Create game
          const names = playerNames.slice(0, playerCount);
          if (names.length < playerCount) {
            names.push(...Array(playerCount - names.length).fill('Player'));
          }

          const game = await gameService.createGame(playerCount, names);

          // Track expected scores per player
          const expectedScores = new Map<string, number>();
          game.players.forEach(p => expectedScores.set(p.id, 0));

          // Add rounds
          for (const round of rounds) {
            const playerIndex = round.playerIndex % game.players.length;
            const player = game.players[playerIndex];

            await gameService.addRoundScore(
              game.id,
              player.id,
              round.score,
              'data:image/png;base64,test'
            );

            // Update expected score
            expectedScores.set(player.id, (expectedScores.get(player.id) || 0) + round.score);
          }

          // Get updated game and verify scores
          const updatedGame = await gameService.getGame(game.id);

          for (const player of updatedGame.players) {
            const expectedScore = expectedScores.get(player.id) || 0;
            expect(player.totalScore).toBe(expectedScore);

            // Also verify that the sum of round scores equals total
            const roundSum = player.rounds.reduce((sum, r) => sum + r.score, 0);
            expect(player.totalScore).toBe(roundSum);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 16: Round data completeness
   * Validates: Requirements 8.3
   * 
   * For any round score recorded, the stored data should include round number, 
   * score value, player ID, and timestamp.
   */
  it('Property 16: Round data completeness - rounds have all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // player count
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
        fc.array(
          fc.record({
            playerIndex: fc.integer({ min: 0, max: 9 }),
            score: fc.integer({ min: 0, max: 168 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (playerCount, playerNames, rounds) => {
          // Create game
          const names = playerNames.slice(0, playerCount);
          if (names.length < playerCount) {
            names.push(...Array(playerCount - names.length).fill('Player'));
          }

          const game = await gameService.createGame(playerCount, names);

          // Add rounds
          for (const round of rounds) {
            const playerIndex = round.playerIndex % game.players.length;
            const player = game.players[playerIndex];

            await gameService.addRoundScore(
              game.id,
              player.id,
              round.score,
              'data:image/png;base64,test'
            );
          }

          // Get round history
          const history = await gameService.getRoundHistory(game.id);

          // Verify each round has all required fields
          for (const round of history) {
            expect(round.roundNumber).toBeGreaterThan(0);
            expect(typeof round.score).toBe('number');
            expect(round.playerId).toBeTruthy();
            expect(round.playerName).toBeTruthy();
            expect(round.timestamp).toBeInstanceOf(Date);
            expect(round.imageDataUrl).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 18: Player score display completeness
   * Validates: Requirements 8.5
   * 
   * For any player, viewing their scores should display all recorded rounds 
   * and a cumulative total that matches the sum of round scores.
   */
  it('Property 18: Player score display completeness - all rounds and correct total', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // player count
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
        fc.array(
          fc.record({
            playerIndex: fc.integer({ min: 0, max: 9 }),
            score: fc.integer({ min: 0, max: 168 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (playerCount, playerNames, rounds) => {
          // Create game
          const names = playerNames.slice(0, playerCount);
          if (names.length < playerCount) {
            names.push(...Array(playerCount - names.length).fill('Player'));
          }

          const game = await gameService.createGame(playerCount, names);

          // Track rounds per player
          const playerRounds = new Map<string, number[]>();
          game.players.forEach(p => playerRounds.set(p.id, []));

          // Add rounds
          for (const round of rounds) {
            const playerIndex = round.playerIndex % game.players.length;
            const player = game.players[playerIndex];

            await gameService.addRoundScore(
              game.id,
              player.id,
              round.score,
              'data:image/png;base64,test'
            );

            playerRounds.get(player.id)?.push(round.score);
          }

          // Get player scores
          const players = await gameService.getPlayerScores(game.id);

          for (const player of players) {
            const expectedRounds = playerRounds.get(player.id) || [];

            // Player should have all their rounds
            expect(player.rounds.length).toBe(expectedRounds.length);

            // Total should match sum of rounds
            const expectedTotal = expectedRounds.reduce((sum, score) => sum + score, 0);
            expect(player.totalScore).toBe(expectedTotal);

            // Each round should have the correct score
            const actualScores = player.rounds.map(r => r.score).sort((a, b) => a - b);
            const expectedScores = [...expectedRounds].sort((a, b) => a - b);
            expect(actualScores).toEqual(expectedScores);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 19: Game state display completeness
   * Validates: Requirements 9.1, 9.2
   * 
   * For any game, viewing the game should display all players with their current 
   * total scores and all rounds in chronological order.
   */
  it('Property 19: Game state display completeness - all players and chronological rounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // player count
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
        fc.array(
          fc.record({
            playerIndex: fc.integer({ min: 0, max: 9 }),
            score: fc.integer({ min: 0, max: 168 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (playerCount, playerNames, rounds) => {
          // Create game
          const names = playerNames.slice(0, playerCount);
          if (names.length < playerCount) {
            names.push(...Array(playerCount - names.length).fill('Player'));
          }

          const game = await gameService.createGame(playerCount, names);

          // Add rounds
          for (const round of rounds) {
            const playerIndex = round.playerIndex % game.players.length;
            const player = game.players[playerIndex];

            await gameService.addRoundScore(
              game.id,
              player.id,
              round.score,
              'data:image/png;base64,test'
            );
          }

          // Get game state
          const updatedGame = await gameService.getGame(game.id);

          // Should have all players
          expect(updatedGame.players.length).toBe(playerCount);

          // Each player should have a total score
          for (const player of updatedGame.players) {
            expect(typeof player.totalScore).toBe('number');
            expect(player.totalScore).toBeGreaterThanOrEqual(0);
          }

          // Get round history
          const history = await gameService.getRoundHistory(game.id);

          // Rounds should be in chronological order (by round number)
          for (let i = 1; i < history.length; i++) {
            expect(history[i].roundNumber).toBeGreaterThanOrEqual(history[i - 1].roundNumber);
          }

          // Total number of rounds should match
          expect(history.length).toBe(rounds.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

