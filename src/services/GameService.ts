/**
 * Game management service for handling game lifecycle and operations
 */
import { v4 as uuidv4 } from 'uuid';
import type { Game, Player, RoundScore, GameSummary } from '../models';
import { StorageRepository } from './StorageRepository';
import { CloudSyncService } from './CloudSyncService';
import { authService } from './AuthService';

/**
 * Service for managing game lifecycle and operations
 */
export class GameService {
  private storage: StorageRepository;
  private cloudSync: CloudSyncService;

  constructor(storage: StorageRepository, cloudSync: CloudSyncService) {
    this.storage = storage;
    this.cloudSync = cloudSync;
  }

  /**
   * Sync game to cloud if user is authenticated
   */
  private async syncToCloud(game: Game): Promise<void> {
    const user = authService.getCurrentUser();
    if (user) {
      try {
        await this.cloudSync.syncGame(game, user.id);
      } catch (error) {
        console.warn('Failed to sync game to cloud:', error);
        // Don't throw - allow local operations to succeed even if cloud sync fails
      }
    }
  }

  /**
   * Create a new game with specified players
   * Requirements: 7.1, 7.2, 7.4
   */
  async createGame(playerCount: number, playerNames: string[]): Promise<Game> {
    if (playerCount < 2 || playerCount > 10) {
      throw new Error('Player count must be between 2 and 10');
    }

    if (playerNames.length !== playerCount) {
      throw new Error('Number of player names must match player count');
    }

    // Create players with unique IDs
    const players: Player[] = playerNames.map((name) => ({
      id: uuidv4(),
      name,
      totalScore: 0,
      rounds: [],
    }));

    // Create game with unique ID and initial state
    const game: Game = {
      id: uuidv4(),
      createdAt: new Date(),
      currentRound: 1,
      players,
      status: 'active',
    };

    await this.storage.saveGame(game);
    
    // Sync to cloud
    await this.syncToCloud(game);
    
    return game;
  }

  /**
   * Get a game by ID
   * Requirements: 7.5
   */
  async getGame(gameId: string): Promise<Game> {
    const game = await this.storage.getGameById(gameId);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }
    return game;
  }

  /**
   * List all active games
   * Requirements: 7.5
   */
  async listActiveGames(): Promise<Game[]> {
    return await this.storage.getActiveGames();
  }

  /**
   * Add a round score for a player and progress to next round
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  async addRoundScore(
    gameId: string,
    playerId: string,
    score: number,
    imageUri: string,
    detectionResult?: {
      tilesDetected: number;
      confidence: number;
      manualCorrections?: any[];
    }
  ): Promise<void> {
    const game = await this.getGame(gameId);

    if (game.status !== 'active') {
      throw new Error('Cannot add score to completed game');
    }

    // Find the player
    const player = game.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }

    // Create round score
    const roundScore: RoundScore = {
      roundNumber: game.currentRound,
      score,
      imageDataUrl: imageUri,
      timestamp: new Date(),
      detectionResult,
    };

    // Add round to player
    player.rounds.push(roundScore);
    player.totalScore += score;

    // Save round to storage
    await this.storage.saveRound(gameId, playerId, roundScore);

    // Increment round number
    game.currentRound += 1;

    // Save updated game
    await this.storage.saveGame(game);
    
    // Sync to cloud
    await this.syncToCloud(game);
  }

  /**
   * End a game and calculate final standings
   * Requirements: 9.5
   */
  async endGame(gameId: string): Promise<GameSummary> {
    const game = await this.getGame(gameId);

    if (game.status === 'completed') {
      throw new Error('Game is already completed');
    }

    // Mark game as completed
    game.status = 'completed';
    await this.storage.saveGame(game);
    
    // Sync to cloud
    await this.syncToCloud(game);

    // Calculate final standings (sorted by total score, ascending for domino scoring)
    const sortedPlayers = [...game.players].sort((a, b) => a.totalScore - b.totalScore);

    // Assign ranks
    const playersWithRanks = sortedPlayers.map((player, index) => ({
      id: player.id,
      name: player.name,
      totalScore: player.totalScore,
      rank: index + 1,
    }));

    return {
      gameId: game.id,
      players: playersWithRanks,
      totalRounds: game.currentRound - 1, // Subtract 1 because currentRound is incremented after each round
      completedAt: new Date(),
    };
  }

  /**
   * Get player scores for a game
   * Requirements: 8.5, 9.1
   */
  async getPlayerScores(gameId: string): Promise<Player[]> {
    const game = await this.getGame(gameId);
    return game.players;
  }

  /**
   * Get round history for a game
   * Requirements: 9.2, 9.3, 9.4
   */
  async getRoundHistory(gameId: string): Promise<Array<{
    roundNumber: number;
    playerId: string;
    playerName: string;
    score: number;
    timestamp: Date;
    imageDataUrl: string;
  }>> {
    const game = await this.getGame(gameId);
    const rounds: Array<{
      roundNumber: number;
      playerId: string;
      playerName: string;
      score: number;
      timestamp: Date;
      imageDataUrl: string;
    }> = [];

    // Collect all rounds from all players
    for (const player of game.players) {
      for (const round of player.rounds) {
        rounds.push({
          roundNumber: round.roundNumber,
          playerId: player.id,
          playerName: player.name,
          score: round.score,
          timestamp: round.timestamp,
          imageDataUrl: round.imageDataUrl,
        });
      }
    }

    // Sort by round number (chronological order)
    rounds.sort((a, b) => a.roundNumber - b.roundNumber);

    return rounds;
  }
}

// Export a singleton instance with the storage repository and cloud sync
import { storageRepository } from './StorageRepository';
import { cloudSyncService } from './CloudSyncService';
export const gameService = new GameService(storageRepository, cloudSyncService);

