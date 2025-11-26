/**
 * Storage repository for managing game and round data in IndexedDB
 */
import { gamesStore, roundsStore, initializeDatabase } from './storage';
import type { Game, Player, RoundScore, GameRecord, RoundRecord, ImageData } from '../models';
import { compressImage } from '../utils/imageStorage';

/**
 * Storage usage information
 */
export interface StorageUsage {
  used: number;
  quota: number;
}

/**
 * Repository for managing persistent storage of game data
 */
export class StorageRepository {
  private initialized = false;

  /**
   * Initialize the storage repository
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await initializeDatabase();
      this.initialized = true;
    }
  }

  /**
   * Convert a Game to a GameRecord for storage
   */
  private gameToRecord(game: Game): GameRecord {
    return {
      id: game.id,
      createdAt: game.createdAt.toISOString(),
      currentRound: game.currentRound,
      status: game.status,
      playerCount: game.players.length,
      players: game.players,
    };
  }

  /**
   * Convert a GameRecord to a Game
   */
  private recordToGame(record: GameRecord): Game {
    return {
      id: record.id,
      createdAt: new Date(record.createdAt),
      currentRound: record.currentRound,
      status: record.status,
      players: record.players,
    };
  }

  /**
   * Save a game to storage
   */
  async saveGame(game: Game): Promise<void> {
    await this.initialize();
    const record = this.gameToRecord(game);
    await gamesStore.setItem(game.id, record);
  }

  /**
   * Get a game by ID
   */
  async getGameById(id: string): Promise<Game | null> {
    await this.initialize();
    const record = await gamesStore.getItem<GameRecord>(id);
    return record ? this.recordToGame(record) : null;
  }

  /**
   * Get all games
   */
  async getAllGames(): Promise<Game[]> {
    await this.initialize();
    const games: Game[] = [];
    
    await gamesStore.iterate<GameRecord, void>((record) => {
      games.push(this.recordToGame(record));
    });
    
    return games;
  }

  /**
   * Delete a game and all associated rounds
   */
  async deleteGame(id: string): Promise<void> {
    await this.initialize();
    
    // Delete the game
    await gamesStore.removeItem(id);
    
    // Delete all associated rounds
    const roundsToDelete: string[] = [];
    await roundsStore.iterate<RoundRecord, void>((record, key) => {
      if (record.gameId === id) {
        roundsToDelete.push(key);
      }
    });
    
    for (const roundKey of roundsToDelete) {
      await roundsStore.removeItem(roundKey);
    }
  }

  /**
   * Save a player (updates the game record)
   */
  async savePlayer(_player: Player): Promise<void> {
    // Players are embedded in games, so this is a no-op
    // In practice, you'd update the game that contains this player
    throw new Error('Players are embedded in games. Use saveGame instead.');
  }

  /**
   * Get a player by ID (searches through all games)
   */
  async getPlayerById(id: string): Promise<Player | null> {
    await this.initialize();
    
    let foundPlayer: Player | null = null;
    
    await gamesStore.iterate<GameRecord, void>((record) => {
      const player = record.players.find(p => p.id === id);
      if (player) {
        foundPlayer = player;
        return; // Stop iteration
      }
    });
    
    return foundPlayer;
  }

  /**
   * Compress and store an image
   * @param imageData - Original image data
   * @returns Promise<string> - Compressed image data URL
   */
  async compressAndStoreImage(imageData: ImageData): Promise<string> {
    await this.initialize();
    
    // Compress the image to reduce storage size
    const compressed = await compressImage(imageData, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
      format: 'image/jpeg',
    });
    
    return compressed.dataUrl;
  }

  /**
   * Save a round
   */
  async saveRound(gameId: string, playerId: string, round: RoundScore): Promise<void> {
    await this.initialize();
    
    const roundRecord: RoundRecord = {
      id: `${gameId}-${playerId}-${round.roundNumber}`,
      gameId,
      playerId,
      roundNumber: round.roundNumber,
      score: round.score,
      imageDataUrl: round.imageDataUrl,
      timestamp: round.timestamp.toISOString(),
      detectionResult: round.detectionResult,
    };
    
    await roundsStore.setItem(roundRecord.id, roundRecord);
  }

  /**
   * Get all rounds for a game
   */
  async getRoundsByGame(gameId: string): Promise<RoundScore[]> {
    await this.initialize();
    
    const rounds: RoundScore[] = [];
    
    await roundsStore.iterate<RoundRecord, void>((record) => {
      if (record.gameId === gameId) {
        rounds.push({
          roundNumber: record.roundNumber,
          score: record.score,
          imageDataUrl: record.imageDataUrl,
          timestamp: new Date(record.timestamp),
          detectionResult: record.detectionResult,
        });
      }
    });
    
    return rounds;
  }

  /**
   * Get storage usage information
   */
  async getStorageUsage(): Promise<StorageUsage> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    
    // Fallback if storage API is not available
    return {
      used: 0,
      quota: 0,
    };
  }

  /**
   * Clear old images to free up storage
   * Keeps the most recent `keepCount` rounds
   */
  async clearOldImages(keepCount: number): Promise<void> {
    await this.initialize();
    
    // Get all rounds sorted by timestamp
    const allRounds: Array<{ key: string; record: RoundRecord }> = [];
    
    await roundsStore.iterate<RoundRecord, void>((record, key) => {
      allRounds.push({ key, record });
    });
    
    // Sort by timestamp (newest first)
    allRounds.sort((a, b) => 
      new Date(b.record.timestamp).getTime() - new Date(a.record.timestamp).getTime()
    );
    
    // Delete images from old rounds (keep the round data but clear the image)
    const roundsToUpdate = allRounds.slice(keepCount);
    
    for (const { key, record } of roundsToUpdate) {
      if (record.imageDataUrl) {
        record.imageDataUrl = ''; // Clear the image
        await roundsStore.setItem(key, record);
      }
    }
  }

  /**
   * Get all active games
   */
  async getActiveGames(): Promise<Game[]> {
    await this.initialize();
    const allGames = await this.getAllGames();
    return allGames.filter(game => game.status === 'active');
  }
}

// Export a singleton instance
export const storageRepository = new StorageRepository();
