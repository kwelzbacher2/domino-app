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

  /**
   * Delete a specific round for a player
   */
  async deleteRound(gameId: string, playerId: string, roundNumber: number): Promise<void> {
    const game = await this.getGame(gameId);

    // Find the player
    const player = game.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }

    // Find the round
    const roundIndex = player.rounds.findIndex((r) => r.roundNumber === roundNumber);
    if (roundIndex === -1) {
      throw new Error(`Round ${roundNumber} not found for player ${player.name}`);
    }

    // Get the round score before removing
    const roundScore = player.rounds[roundIndex].score;

    // Remove the round
    player.rounds.splice(roundIndex, 1);

    // Update player's total score
    player.totalScore -= roundScore;

    // Save updated game
    await this.storage.saveGame(game);
    
    // Sync to cloud
    await this.syncToCloud(game);
  }

  /**
   * Update the score for a specific round
   */
  async updateRoundScore(
    gameId: string,
    playerId: string,
    roundNumber: number,
    newScore: number
  ): Promise<void> {
    const game = await this.getGame(gameId);

    // Find the player
    const player = game.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }

    // Find the round
    const round = player.rounds.find((r) => r.roundNumber === roundNumber);
    if (!round) {
      throw new Error(`Round ${roundNumber} not found for player ${player.name}`);
    }

    // Calculate score difference
    const scoreDiff = newScore - round.score;

    // Update round score
    round.score = newScore;

    // Update player's total score
    player.totalScore += scoreDiff;

    // Save updated game
    await this.storage.saveGame(game);
    
    // Sync to cloud
    await this.syncToCloud(game);
  }

  /**
   * Reassign a round to a different player (useful for correcting mistakes)
   */
  async reassignRound(
    gameId: string,
    oldPlayerId: string,
    newPlayerId: string,
    roundNumber: number,
    newScore?: number
  ): Promise<void> {
    const game = await this.getGame(gameId);

    // Find both players
    const oldPlayer = game.players.find((p) => p.id === oldPlayerId);
    const newPlayer = game.players.find((p) => p.id === newPlayerId);
    
    if (!oldPlayer) {
      throw new Error(`Old player not found: ${oldPlayerId}`);
    }
    if (!newPlayer) {
      throw new Error(`New player not found: ${newPlayerId}`);
    }

    // Find the round
    const roundIndex = oldPlayer.rounds.findIndex((r) => r.roundNumber === roundNumber);
    if (roundIndex === -1) {
      throw new Error(`Round ${roundNumber} not found for player ${oldPlayer.name}`);
    }

    // Get the round
    const round = oldPlayer.rounds[roundIndex];
    const oldScore = round.score;
    const finalScore = newScore !== undefined ? newScore : oldScore;

    // Remove from old player
    oldPlayer.rounds.splice(roundIndex, 1);
    oldPlayer.totalScore -= oldScore;

    // Update score if changed
    if (newScore !== undefined) {
      round.score = newScore;
    }

    // Add to new player
    newPlayer.rounds.push(round);
    newPlayer.totalScore += finalScore;

    // Save updated game
    await this.storage.saveGame(game);
    
    // Sync to cloud
    await this.syncToCloud(game);
  }

  /**
   * Set the current round number (useful for fixing round counter after deletions)
   */
  async setCurrentRound(gameId: string, roundNumber: number): Promise<void> {
    const game = await this.getGame(gameId);

    if (roundNumber < 1) {
      throw new Error('Round number must be at least 1');
    }

    game.currentRound = roundNumber;

    // Save updated game
    await this.storage.saveGame(game);
    
    // Sync to cloud
    await this.syncToCloud(game);
  }
}

// Export a singleton instance with the storage repository and cloud sync
import { storageRepository } from './StorageRepository';
import { cloudSyncService } from './CloudSyncService';
export const gameService = new GameService(storageRepository, cloudSyncService);

