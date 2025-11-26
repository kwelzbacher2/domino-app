/**
 * Property-based tests for manual correction functionality
 * Feature: domino-web-app
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CorrectionService } from './CorrectionService';
import type { DetectedTile, DetectionResult } from '../models/types';

describe('CorrectionService - Property Tests', () => {
  const correctionService = new CorrectionService();

  // Helper to create a detected tile
  const createTile = (id: string, leftPips: number, rightPips: number): DetectedTile => ({
    id,
    leftPips,
    rightPips,
    totalPips: leftPips + rightPips,
    confidence: 0.9,
    boundingBox: { x: 0, y: 0, width: 50, height: 25, rotation: 0 },
  });

  // Arbitrary for pip count (0-12)
  const pipCountArb = fc.integer({ min: 0, max: 12 });

  // Arbitrary for detected tile
  const detectedTileArb = fc.record({
    id: fc.uuid(),
    leftPips: pipCountArb,
    rightPips: pipCountArb,
    confidence: fc.double({ min: 0, max: 1 }),
    boundingBox: fc.record({
      x: fc.integer({ min: 0, max: 1000 }),
      y: fc.integer({ min: 0, max: 1000 }),
      width: fc.integer({ min: 10, max: 100 }),
      height: fc.integer({ min: 10, max: 100 }),
      rotation: fc.integer({ min: 0, max: 360 }),
    }),
  }).map((tile) => ({
    ...tile,
    totalPips: tile.leftPips + tile.rightPips,
  }));

  // Arbitrary for array of tiles
  const tilesArrayArb = fc.array(detectedTileArb, { minLength: 0, maxLength: 20 });

  /**
   * Feature: domino-web-app, Property 9: Manual correction consistency
   * Validates: Requirements 5.1, 5.2, 5.3, 5.5
   * 
   * For any detection result, adding or removing tiles manually should update 
   * the total score to match the sum of all remaining tiles.
   */
  describe('Property 9: Manual correction consistency', () => {
    it('adding a tile updates total score correctly', () => {
      fc.assert(
        fc.property(tilesArrayArb, pipCountArb, pipCountArb, (tiles, leftPips, rightPips) => {
          // Add a new tile
          const updatedTiles = correctionService.addTile(tiles, leftPips, rightPips);
          
          // Calculate expected total
          const expectedTotal = updatedTiles.reduce((sum, tile) => sum + tile.totalPips, 0);
          const actualTotal = correctionService.calculateTotalScore(updatedTiles);
          
          // Total score should match sum of all tiles
          expect(actualTotal).toBe(expectedTotal);
          
          // Should have one more tile
          expect(updatedTiles.length).toBe(tiles.length + 1);
        }),
        { numRuns: 100 }
      );
    });

    it('removing a tile updates total score correctly', () => {
      fc.assert(
        fc.property(
          fc.array(detectedTileArb, { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 0, max: 19 }),
          (tiles, indexToRemove) => {
            // Only remove if index is valid
            if (indexToRemove >= tiles.length) return;
            
            const tileToRemove = tiles[indexToRemove];
            const updatedTiles = correctionService.removeTile(tiles, tileToRemove.id);
            
            // Calculate expected total
            const expectedTotal = updatedTiles.reduce((sum, tile) => sum + tile.totalPips, 0);
            const actualTotal = correctionService.calculateTotalScore(updatedTiles);
            
            // Total score should match sum of remaining tiles
            expect(actualTotal).toBe(expectedTotal);
            
            // Should have one fewer tile
            expect(updatedTiles.length).toBe(tiles.length - 1);
            
            // Removed tile should not be present
            expect(updatedTiles.find(t => t.id === tileToRemove.id)).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updating tile pips updates total score correctly', () => {
      fc.assert(
        fc.property(
          fc.array(detectedTileArb, { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 0, max: 19 }),
          pipCountArb,
          pipCountArb,
          (tiles, indexToUpdate, newLeftPips, newRightPips) => {
            // Only update if index is valid
            if (indexToUpdate >= tiles.length) return;
            
            const tileToUpdate = tiles[indexToUpdate];
            const updatedTiles = correctionService.updateTilePips(
              tiles,
              tileToUpdate.id,
              newLeftPips,
              newRightPips
            );
            
            // Calculate expected total
            const expectedTotal = updatedTiles.reduce((sum, tile) => sum + tile.totalPips, 0);
            const actualTotal = correctionService.calculateTotalScore(updatedTiles);
            
            // Total score should match sum of all tiles
            expect(actualTotal).toBe(expectedTotal);
            
            // Should have same number of tiles
            expect(updatedTiles.length).toBe(tiles.length);
            
            // Updated tile should have new pip counts
            const updatedTile = updatedTiles.find(t => t.id === tileToUpdate.id);
            expect(updatedTile?.leftPips).toBe(newLeftPips);
            expect(updatedTile?.rightPips).toBe(newRightPips);
            expect(updatedTile?.totalPips).toBe(newLeftPips + newRightPips);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sequence of add/remove operations maintains score consistency', () => {
      fc.assert(
        fc.property(
          tilesArrayArb,
          fc.array(
            fc.oneof(
              fc.record({ op: fc.constant('add'), leftPips: pipCountArb, rightPips: pipCountArb }),
              fc.record({ op: fc.constant('remove'), index: fc.integer({ min: 0, max: 19 }) })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (initialTiles, operations) => {
            let tiles = [...initialTiles];
            
            // Apply sequence of operations
            for (const operation of operations) {
              if (operation.op === 'add') {
                tiles = correctionService.addTile(tiles, operation.leftPips, operation.rightPips);
              } else if (operation.op === 'remove' && tiles.length > 0) {
                const index = operation.index % tiles.length;
                tiles = correctionService.removeTile(tiles, tiles[index].id);
              }
            }
            
            // After all operations, total should still be consistent
            const expectedTotal = tiles.reduce((sum, tile) => sum + tile.totalPips, 0);
            const actualTotal = correctionService.calculateTotalScore(tiles);
            
            expect(actualTotal).toBe(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: domino-web-app, Property 10: Correction persistence
   * Validates: Requirements 5.4
   * 
   * For any manual correction made to a detection result, the adjustments 
   * should be stored and retrievable with the round data.
   */
  describe('Property 10: Correction persistence', () => {
    it('corrected result preserves all tile modifications', () => {
      fc.assert(
        fc.property(
          tilesArrayArb,
          fc.array(
            fc.record({ leftPips: pipCountArb, rightPips: pipCountArb }),
            { minLength: 0, maxLength: 5 }
          ),
          (originalTiles, tilesToAdd) => {
            // Create original detection result
            const originalResult: DetectionResult = {
              tiles: originalTiles,
              totalScore: correctionService.calculateTotalScore(originalTiles),
              confidence: 0.85,
              processedImage: 'data:image/png;base64,test',
            };
            
            // Apply corrections (add tiles)
            let correctedTiles = [...originalTiles];
            for (const tile of tilesToAdd) {
              correctedTiles = correctionService.addTile(
                correctedTiles,
                tile.leftPips,
                tile.rightPips
              );
            }
            
            // Create corrected result
            const correctedResult = correctionService.createCorrectedResult(
              originalResult,
              correctedTiles
            );
            
            // Corrected result should contain all modified tiles
            expect(correctedResult.tiles).toEqual(correctedTiles);
            expect(correctedResult.tiles.length).toBe(originalTiles.length + tilesToAdd.length);
            
            // Total score should be recalculated
            const expectedTotal = correctedTiles.reduce((sum, tile) => sum + tile.totalPips, 0);
            expect(correctedResult.totalScore).toBe(expectedTotal);
            
            // Original metadata should be preserved
            expect(correctedResult.confidence).toBe(originalResult.confidence);
            expect(correctedResult.processedImage).toBe(originalResult.processedImage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('corrected result with removals preserves remaining tiles', () => {
      fc.assert(
        fc.property(
          fc.array(detectedTileArb, { minLength: 2, maxLength: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (originalTiles, removeCount) => {
            // Create original detection result
            const originalResult: DetectionResult = {
              tiles: originalTiles,
              totalScore: correctionService.calculateTotalScore(originalTiles),
              confidence: 0.85,
              processedImage: 'data:image/png;base64,test',
            };
            
            // Remove some tiles (up to half)
            const actualRemoveCount = Math.min(removeCount, Math.floor(originalTiles.length / 2));
            let correctedTiles = [...originalTiles];
            for (let i = 0; i < actualRemoveCount; i++) {
              correctedTiles = correctionService.removeTile(correctedTiles, correctedTiles[0].id);
            }
            
            // Create corrected result
            const correctedResult = correctionService.createCorrectedResult(
              originalResult,
              correctedTiles
            );
            
            // Corrected result should contain remaining tiles
            expect(correctedResult.tiles).toEqual(correctedTiles);
            expect(correctedResult.tiles.length).toBe(originalTiles.length - actualRemoveCount);
            
            // Total score should reflect remaining tiles
            const expectedTotal = correctedTiles.reduce((sum, tile) => sum + tile.totalPips, 0);
            expect(correctedResult.totalScore).toBe(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('corrected result with pip updates preserves tile identity', () => {
      fc.assert(
        fc.property(
          fc.array(detectedTileArb, { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 0, max: 19 }),
          pipCountArb,
          pipCountArb,
          (originalTiles, indexToUpdate, newLeftPips, newRightPips) => {
            if (indexToUpdate >= originalTiles.length) return;
            
            // Create original detection result
            const originalResult: DetectionResult = {
              tiles: originalTiles,
              totalScore: correctionService.calculateTotalScore(originalTiles),
              confidence: 0.85,
              processedImage: 'data:image/png;base64,test',
            };
            
            // Update a tile's pips
            const tileToUpdate = originalTiles[indexToUpdate];
            const correctedTiles = correctionService.updateTilePips(
              originalTiles,
              tileToUpdate.id,
              newLeftPips,
              newRightPips
            );
            
            // Create corrected result
            const correctedResult = correctionService.createCorrectedResult(
              originalResult,
              correctedTiles
            );
            
            // Corrected result should contain updated tiles
            expect(correctedResult.tiles).toEqual(correctedTiles);
            expect(correctedResult.tiles.length).toBe(originalTiles.length);
            
            // Updated tile should have new values but same ID
            const updatedTile = correctedResult.tiles.find(t => t.id === tileToUpdate.id);
            expect(updatedTile).toBeDefined();
            expect(updatedTile?.leftPips).toBe(newLeftPips);
            expect(updatedTile?.rightPips).toBe(newRightPips);
            expect(updatedTile?.totalPips).toBe(newLeftPips + newRightPips);
            
            // Total score should be recalculated
            const expectedTotal = correctedTiles.reduce((sum, tile) => sum + tile.totalPips, 0);
            expect(correctedResult.totalScore).toBe(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
