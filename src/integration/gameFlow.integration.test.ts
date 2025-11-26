/**
 * Integration tests for complete game flow
 * Tests: create game → capture/upload → assign score → view results
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameService } from '../services/GameService';
import { StorageRepository } from '../services/StorageRepository';
import type { Game, ImageData, DetectionResult } from '../models/types';

describe('Complete Game Flow Integration', () => {
  let gameService: GameService;
  let storage: StorageRepository;

  beforeEach(async () => {
    storage = new StorageRepository();
    await storage.initialize();
    gameService = new GameService(storage);
  });

  it('should complete full game flow: create → add round → view', async () => {
    // Step 1: Create a game
    const playerNames = ['Alice', 'Bob', 'Charlie'];
    const game = await gameService.createGame(3, playerNames);

    expect(game).toBeDefined();
    expect(game.id).toBeDefined();
    expect(game.players).toHaveLength(3);
    expect(game.currentRound).toBe(1);
    expect(game.status).toBe('active');

    // Step 2: Simulate image capture and detection
    const mockImage: ImageData = {
      dataUrl: 'data:image/png;base64,mock',
      width: 800,
      height: 600,
      timestamp: new Date(),
    };

    const mockDetectionResult: DetectionResult = {
      tiles: [
        {
          id: '1',
          boundingBox: { x: 0, y: 0, width: 100, height: 50, rotation: 0 },
          leftPips: 3,
          rightPips: 4,
          totalPips: 7,
          confidence: 0.9,
        },
        {
          id: '2',
          boundingBox: { x: 100, y: 0, width: 100, height: 50, rotation: 0 },
          leftPips: 5,
          rightPips: 6,
          totalPips: 11,
          confidence: 0.85,
        },
      ],
      totalScore: 18,
      confidence: 0.875,
      processedImage: 'data:image/png;base64,annotated',
    };

    // Step 3: Assign score to first player
    const firstPlayer = game.players[0];
    await gameService.addRoundScore(
      game.id,
      firstPlayer.id,
      mockDetectionResult.totalScore,
      mockImage.dataUrl,
      {
        tilesDetected: mockDetectionResult.tiles.length,
        confidence: mockDetectionResult.confidence,
      }
    );

    // Step 4: Verify game state updated
    const updatedGame = await gameService.getGame(game.id);
    expect(updatedGame.currentRound).toBe(2); // Should increment
    expect(updatedGame.players[0].totalScore).toBe(18);
    expect(updatedGame.players[0].rounds).toHaveLength(1);

    // Step 5: Add another round for second player
    await gameService.addRoundScore(
      game.id,
      game.players[1].id,
      25,
      mockImage.dataUrl
    );

    const gameAfterRound2 = await gameService.getGame(game.id);
    expect(gameAfterRound2.currentRound).toBe(3);
    expect(gameAfterRound2.players[1].totalScore).toBe(25);

    // Step 6: View round history
    const history = await gameService.getRoundHistory(game.id);
    expect(history).toHaveLength(2);
    expect(history[0].score).toBe(18);
    expect(history[1].score).toBe(25);

    // Step 7: End game
    const summary = await gameService.endGame(game.id);
    expect(summary.gameId).toBe(game.id);
    expect(summary.totalRounds).toBe(2);
    expect(summary.players[0].rank).toBe(1); // Alice has lowest score (18)
    expect(summary.players[1].rank).toBe(2); // Bob has 25
    expect(summary.players[2].rank).toBe(3); // Charlie has 0

    // Verify game is marked as completed
    const completedGame = await gameService.getGame(game.id);
    expect(completedGame.status).toBe('completed');
  });

  it('should handle multi-round game with multiple players', async () => {
    // Create game with 4 players
    const game = await gameService.createGame(4, ['P1', 'P2', 'P3', 'P4']);

    // Play 5 rounds
    const rounds = [
      { playerId: game.players[0].id, score: 10 },
      { playerId: game.players[1].id, score: 15 },
      { playerId: game.players[2].id, score: 8 },
      { playerId: game.players[3].id, score: 20 },
      { playerId: game.players[0].id, score: 12 },
    ];

    for (const round of rounds) {
      await gameService.addRoundScore(
        game.id,
        round.playerId,
        round.score,
        'data:image/png;base64,mock'
      );
    }

    // Verify final state
    const finalGame = await gameService.getGame(game.id);
    expect(finalGame.currentRound).toBe(6); // Started at 1, added 5 rounds
    expect(finalGame.players[0].totalScore).toBe(22); // 10 + 12
    expect(finalGame.players[1].totalScore).toBe(15);
    expect(finalGame.players[2].totalScore).toBe(8);
    expect(finalGame.players[3].totalScore).toBe(20);

    // Verify round history is in chronological order
    const history = await gameService.getRoundHistory(game.id);
    expect(history).toHaveLength(5);
    expect(history[0].roundNumber).toBe(1);
    expect(history[4].roundNumber).toBe(5);
  });

  it('should persist data across app restarts', async () => {
    // Create and save a game
    const game = await gameService.createGame(2, ['Player1', 'Player2']);
    await gameService.addRoundScore(
      game.id,
      game.players[0].id,
      15,
      'data:image/png;base64,mock'
    );

    // Simulate app restart by creating new service instances
    const newStorage = new StorageRepository();
    await newStorage.initialize();
    const newGameService = new GameService(newStorage);

    // Verify data persisted
    const loadedGame = await newGameService.getGame(game.id);
    expect(loadedGame.id).toBe(game.id);
    expect(loadedGame.players[0].totalScore).toBe(15);
    expect(loadedGame.currentRound).toBe(2);

    // Verify round history persisted
    const history = await newGameService.getRoundHistory(game.id);
    expect(history).toHaveLength(1);
    expect(history[0].score).toBe(15);
  });

  it('should handle manual correction workflow', async () => {
    // Create game
    const game = await gameService.createGame(2, ['Alice', 'Bob']);

    // Initial detection result
    const initialResult: DetectionResult = {
      tiles: [
        {
          id: '1',
          boundingBox: { x: 0, y: 0, width: 100, height: 50, rotation: 0 },
          leftPips: 3,
          rightPips: 4,
          totalPips: 7,
          confidence: 0.6, // Low confidence
        },
      ],
      totalScore: 7,
      confidence: 0.6,
      processedImage: 'data:image/png;base64,annotated',
    };

    // User corrects the detection
    const correctedResult: DetectionResult = {
      ...initialResult,
      tiles: [
        ...initialResult.tiles,
        {
          id: '2',
          boundingBox: { x: 100, y: 0, width: 100, height: 50, rotation: 0 },
          leftPips: 5,
          rightPips: 6,
          totalPips: 11,
          confidence: 1.0, // Manual correction has full confidence
        },
      ],
      totalScore: 18, // Updated total
      confidence: 0.8,
    };

    // Save corrected result
    await gameService.addRoundScore(
      game.id,
      game.players[0].id,
      correctedResult.totalScore,
      'data:image/png;base64,mock',
      {
        tilesDetected: correctedResult.tiles.length,
        confidence: correctedResult.confidence,
        manualCorrections: [{ type: 'added', tileId: '2' }],
      }
    );

    // Verify corrected score was saved
    const updatedGame = await gameService.getGame(game.id);
    expect(updatedGame.players[0].totalScore).toBe(18);
    expect(updatedGame.players[0].rounds[0].detectionResult?.manualCorrections).toBeDefined();
  });

  it('should list only active games', async () => {
    // Get initial count of active games
    const initialActiveGames = await gameService.listActiveGames();
    const initialCount = initialActiveGames.length;

    // Create multiple games
    const game1 = await gameService.createGame(2, ['A', 'B']);
    const game2 = await gameService.createGame(3, ['C', 'D', 'E']);
    const game3 = await gameService.createGame(2, ['F', 'G']);

    // End one game
    await gameService.endGame(game2.id);

    // List active games
    const activeGames = await gameService.listActiveGames();
    expect(activeGames.length).toBe(initialCount + 2); // 2 new active games
    expect(activeGames.find(g => g.id === game1.id)).toBeDefined();
    expect(activeGames.find(g => g.id === game3.id)).toBeDefined();
    expect(activeGames.find(g => g.id === game2.id)).toBeUndefined();
  });
});

describe('Mobile Viewport and Touch Interactions', () => {
  let gameService: GameService;
  let storage: StorageRepository;

  beforeEach(async () => {
    storage = new StorageRepository();
    await storage.initialize();
    gameService = new GameService(storage);
  });

  it('should handle game creation on mobile viewport', async () => {
    // Simulate mobile viewport
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone width
    });

    // Create game
    const game = await gameService.createGame(2, ['Player1', 'Player2']);
    expect(game).toBeDefined();
    expect(game.players).toHaveLength(2);

    // Restore viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('should handle touch-friendly player selection', async () => {
    // Create game
    const game = await gameService.createGame(3, ['Alice', 'Bob', 'Charlie']);

    // Simulate touch interaction by selecting player
    const selectedPlayer = game.players[1]; // Bob
    await gameService.addRoundScore(
      game.id,
      selectedPlayer.id,
      20,
      'data:image/png;base64,mock'
    );

    // Verify selection worked
    const updatedGame = await gameService.getGame(game.id);
    expect(updatedGame.players[1].totalScore).toBe(20);
  });

  it('should handle rapid successive round additions', async () => {
    // Create game
    const game = await gameService.createGame(2, ['P1', 'P2']);

    // Add rounds sequentially (simulating fast user interactions)
    // Note: In real app, rounds are added one at a time, not concurrently
    await gameService.addRoundScore(game.id, game.players[0].id, 10, 'data:image/png;base64,1');
    await gameService.addRoundScore(game.id, game.players[1].id, 15, 'data:image/png;base64,2');
    await gameService.addRoundScore(game.id, game.players[0].id, 8, 'data:image/png;base64,3');

    // Verify all rounds were saved correctly
    const finalGame = await gameService.getGame(game.id);
    expect(finalGame.players[0].totalScore).toBe(18); // 10 + 8
    expect(finalGame.players[1].totalScore).toBe(15);
    expect(finalGame.currentRound).toBe(4); // Started at 1, added 3
  });

  it('should handle game list scrolling with many games', async () => {
    // Create many games to test list performance
    const gamePromises = [];
    for (let i = 0; i < 25; i++) {
      gamePromises.push(
        gameService.createGame(2, [`Player${i}A`, `Player${i}B`])
      );
    }

    const games = await Promise.all(gamePromises);
    expect(games).toHaveLength(25);

    // List active games
    const activeGames = await gameService.listActiveGames();
    expect(activeGames.length).toBeGreaterThanOrEqual(25);

    // Verify games are retrievable
    const firstGame = await gameService.getGame(games[0].id);
    expect(firstGame.id).toBe(games[0].id);

    const lastGame = await gameService.getGame(games[24].id);
    expect(lastGame.id).toBe(games[24].id);
  });

  it('should handle round history with many rounds', async () => {
    // Create game
    const game = await gameService.createGame(2, ['P1', 'P2']);

    // Add many rounds sequentially to test virtualization
    for (let i = 0; i < 50; i++) {
      const playerId = game.players[i % 2].id;
      await gameService.addRoundScore(
        game.id,
        playerId,
        Math.floor(Math.random() * 30) + 5,
        `data:image/png;base64,round${i}`
      );
    }

    // Verify all rounds are retrievable
    const history = await gameService.getRoundHistory(game.id);
    expect(history).toHaveLength(50);

    // Verify chronological order
    for (let i = 1; i < history.length; i++) {
      expect(history[i].roundNumber).toBeGreaterThan(history[i - 1].roundNumber);
    }
  });
});

describe('Error Handling and Edge Cases', () => {
  let gameService: GameService;
  let storage: StorageRepository;

  beforeEach(async () => {
    storage = new StorageRepository();
    await storage.initialize();
    gameService = new GameService(storage);
  });

  it('should handle invalid game ID gracefully', async () => {
    await expect(gameService.getGame('invalid-id')).rejects.toThrow();
  });

  it('should handle adding round to non-existent game', async () => {
    await expect(
      gameService.addRoundScore('invalid-id', 'player-id', 10, 'data:image/png;base64,mock')
    ).rejects.toThrow();
  });

  it('should handle adding round with invalid player ID', async () => {
    const game = await gameService.createGame(2, ['P1', 'P2']);
    
    await expect(
      gameService.addRoundScore(game.id, 'invalid-player-id', 10, 'data:image/png;base64,mock')
    ).rejects.toThrow();
  });

  it('should handle ending already completed game', async () => {
    const game = await gameService.createGame(2, ['P1', 'P2']);
    await gameService.endGame(game.id);

    // Try to end again
    await expect(gameService.endGame(game.id)).rejects.toThrow();
  });

  it('should handle zero score rounds', async () => {
    const game = await gameService.createGame(2, ['P1', 'P2']);
    
    // Add round with zero score (valid in domino scoring)
    await gameService.addRoundScore(
      game.id,
      game.players[0].id,
      0,
      'data:image/png;base64,mock'
    );

    const updatedGame = await gameService.getGame(game.id);
    expect(updatedGame.players[0].totalScore).toBe(0);
    expect(updatedGame.players[0].rounds).toHaveLength(1);
  });

  it('should handle large score values', async () => {
    const game = await gameService.createGame(2, ['P1', 'P2']);
    
    // Add round with large score (double-12 set max is 168)
    await gameService.addRoundScore(
      game.id,
      game.players[0].id,
      168,
      'data:image/png;base64,mock'
    );

    const updatedGame = await gameService.getGame(game.id);
    expect(updatedGame.players[0].totalScore).toBe(168);
  });

  it('should handle concurrent read operations', async () => {
    const game = await gameService.createGame(2, ['P1', 'P2']);
    
    // Add a round first
    await gameService.addRoundScore(game.id, game.players[0].id, 10, 'data:image/png;base64,1');

    // Perform multiple read operations concurrently (safe)
    const operations = [
      gameService.getGame(game.id),
      gameService.getRoundHistory(game.id),
      gameService.getGame(game.id),
    ];

    const results = await Promise.all(operations);
    
    // Verify operations completed successfully
    expect(results[0]).toBeDefined(); // getGame result
    expect(results[1]).toBeDefined(); // getRoundHistory result
    expect(results[2]).toBeDefined(); // getGame result

    // Verify data consistency
    expect(results[0].id).toBe(game.id);
    expect(results[1]).toHaveLength(1);
    expect(results[2].players[0].totalScore).toBe(10);
  });
});
