/**
 * Service for managing manual corrections to detection results
 */

import type { DetectedTile, DetectionResult } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export interface CorrectionState {
  tiles: DetectedTile[];
  totalScore: number;
  hasChanges: boolean;
}

export class CorrectionService {
  /**
   * Add a new tile to the detection result
   */
  addTile(
    currentTiles: DetectedTile[],
    leftPips: number,
    rightPips: number,
    boundingBox?: Partial<BoundingBox>
  ): DetectedTile[] {
    const newTile: DetectedTile = {
      id: uuidv4(),
      leftPips,
      rightPips,
      totalPips: leftPips + rightPips,
      confidence: 1.0, // Manual additions have full confidence
      boundingBox: {
        x: boundingBox?.x ?? 0,
        y: boundingBox?.y ?? 0,
        width: boundingBox?.width ?? 50,
        height: boundingBox?.height ?? 25,
        rotation: boundingBox?.rotation ?? 0,
      },
    };

    return [...currentTiles, newTile];
  }

  /**
   * Remove a tile from the detection result
   */
  removeTile(currentTiles: DetectedTile[], tileId: string): DetectedTile[] {
    return currentTiles.filter((tile) => tile.id !== tileId);
  }

  /**
   * Update pip counts for an existing tile
   */
  updateTilePips(
    currentTiles: DetectedTile[],
    tileId: string,
    leftPips: number,
    rightPips: number
  ): DetectedTile[] {
    return currentTiles.map((tile) => {
      if (tile.id === tileId) {
        return {
          ...tile,
          leftPips,
          rightPips,
          totalPips: leftPips + rightPips,
        };
      }
      return tile;
    });
  }

  /**
   * Calculate total score from tiles
   */
  calculateTotalScore(tiles: DetectedTile[]): number {
    return tiles.reduce((sum, tile) => sum + tile.totalPips, 0);
  }

  /**
   * Create a corrected detection result
   */
  createCorrectedResult(
    originalResult: DetectionResult,
    correctedTiles: DetectedTile[]
  ): DetectionResult {
    return {
      ...originalResult,
      tiles: correctedTiles,
      totalScore: this.calculateTotalScore(correctedTiles),
    };
  }
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
