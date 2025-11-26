/**
 * Unit tests and property-based tests for PipCounter
 * Tests pip counting logic on domino tiles
 * Feature: domino-web-app
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { DetectedTile, ImageData } from '../models/types';

// Mock Image constructor to avoid actual image loading
global.Image = class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  
  constructor() {
    // Simulate immediate load
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as any;

// Mock TensorFlow.js
vi.mock('@tensorflow/tfjs', () => ({
  browser: {
    fromPixels: vi.fn().mockReturnValue({
      expandDims: vi.fn().mockReturnValue({
        dispose: vi.fn(),
      }),
      dispose: vi.fn(),
    }),
  },
  image: {
    cropAndResize: vi.fn().mockReturnValue({
      squeeze: vi.fn().mockReturnValue({
        shape: [100, 200, 3],
        dispose: vi.fn(),
      }),
      dispose: vi.fn(),
    }),
  },
  slice3d: vi.fn().mockReturnValue({
    dispose: vi.fn(),
  }),
  mean: vi.fn().mockReturnValue({
    data: vi.fn().mockResolvedValue(new Float32Array([0.5])),
    dispose: vi.fn(),
  }),
  scalar: vi.fn().mockReturnValue({
    dispose: vi.fn(),
  }),
  greater: vi.fn().mockReturnValue({
    data: vi.fn().mockResolvedValue(new Uint8Array(20000).fill(0)),
    dispose: vi.fn(),
  }),
  square: vi.fn().mockReturnValue({
    dispose: vi.fn(),
  }),
  sub: vi.fn().mockReturnValue({
    dispose: vi.fn(),
  }),
}));

// Import after mocking
import { pipCounter } from './PipCounter';

describe('PipCounter Unit Tests', () => {
  let mockImageData: ImageData;
  let mockTile: DetectedTile;

  beforeEach(() => {
    mockImageData = {
      dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    mockTile = {
      id: 'test-tile-1',
      boundingBox: {
        x: 100,
        y: 100,
        width: 80,
        height: 40,
        rotation: 0,
      },
      leftPips: 0,
      rightPips: 0,
      totalPips: 0,
      confidence: 0.9,
    };
  });

  it('should return a tile with pip counts', async () => {
    const result = await pipCounter.countPips(mockImageData, mockTile);

    expect(result).toBeDefined();
    expect(result.id).toBe(mockTile.id);
    expect(typeof result.leftPips).toBe('number');
    expect(typeof result.rightPips).toBe('number');
    expect(typeof result.totalPips).toBe('number');
    expect(typeof result.confidence).toBe('number');
  });

  it('should calculate totalPips as sum of leftPips and rightPips', async () => {
    const result = await pipCounter.countPips(mockImageData, mockTile);

    expect(result.totalPips).toBe(result.leftPips + result.rightPips);
  });

  it('should handle blank tiles (0 pips)', async () => {
    const result = await pipCounter.countPips(mockImageData, mockTile);

    // Pip counts should be non-negative
    expect(result.leftPips).toBeGreaterThanOrEqual(0);
    expect(result.rightPips).toBeGreaterThanOrEqual(0);
    expect(result.totalPips).toBeGreaterThanOrEqual(0);
  });

  it('should support pip counts up to 12', async () => {
    const result = await pipCounter.countPips(mockImageData, mockTile);

    // Pip counts should be within valid range (0-12)
    expect(result.leftPips).toBeLessThanOrEqual(12);
    expect(result.rightPips).toBeLessThanOrEqual(12);
  });

  it('should include confidence score between 0 and 1', async () => {
    const result = await pipCounter.countPips(mockImageData, mockTile);

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should process multiple tiles', async () => {
    const tiles: DetectedTile[] = [
      { ...mockTile, id: 'tile-1' },
      { ...mockTile, id: 'tile-2' },
      { ...mockTile, id: 'tile-3' },
    ];

    const results = await pipCounter.countPipsOnTiles(mockImageData, tiles);

    expect(results).toHaveLength(3);
    expect(results[0].id).toBe('tile-1');
    expect(results[1].id).toBe('tile-2');
    expect(results[2].id).toBe('tile-3');
  });

  it('should validate pip counts correctly', () => {
    const validTile: DetectedTile = {
      ...mockTile,
      leftPips: 3,
      rightPips: 5,
      totalPips: 8,
      confidence: 0.8,
    };

    expect(pipCounter.validatePipCounts(validTile)).toBe(true);
  });

  it('should reject invalid pip counts', () => {
    const invalidTile: DetectedTile = {
      ...mockTile,
      leftPips: 3,
      rightPips: 5,
      totalPips: 10, // Wrong total
      confidence: 0.8,
    };

    expect(pipCounter.validatePipCounts(invalidTile)).toBe(false);
  });

  it('should reject pip counts outside valid range', () => {
    const invalidTile: DetectedTile = {
      ...mockTile,
      leftPips: 15, // Too high
      rightPips: 5,
      totalPips: 20,
      confidence: 0.8,
    };

    expect(pipCounter.validatePipCounts(invalidTile)).toBe(false);
  });

  it('should reject low confidence detections', () => {
    const lowConfidenceTile: DetectedTile = {
      ...mockTile,
      leftPips: 3,
      rightPips: 5,
      totalPips: 8,
      confidence: 0.2, // Too low
    };

    expect(pipCounter.validatePipCounts(lowConfidenceTile)).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    const invalidImageData: ImageData = {
      dataUrl: 'invalid-data',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const result = await pipCounter.countPips(invalidImageData, mockTile);

    // Should return tile with zero pips and low confidence on error
    expect(result.leftPips).toBe(0);
    expect(result.rightPips).toBe(0);
    expect(result.totalPips).toBe(0);
    expect(result.confidence).toBeLessThan(0.5);
  });
});

describe('PipCounter Property-Based Tests', () => {
  let mockImageData: ImageData;

  beforeEach(() => {
    mockImageData = {
      dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };
  });

  /**
   * Feature: domino-web-app, Property 5: Complete pip counting
   * Validates: Requirements 3.1, 3.4
   */
  it('Property 5: Complete pip counting - total pip count should equal sum of left and right halves', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random detected tiles
        fc.record({
          id: fc.uuid(),
          boundingBox: fc.record({
            x: fc.integer({ min: 0, max: 600 }),
            y: fc.integer({ min: 0, max: 440 }),
            width: fc.integer({ min: 40, max: 100 }),
            height: fc.integer({ min: 20, max: 50 }),
            rotation: fc.float({ min: 0, max: 360 }),
          }),
          leftPips: fc.integer({ min: 0, max: 12 }),
          rightPips: fc.integer({ min: 0, max: 12 }),
          totalPips: fc.integer({ min: 0, max: 24 }),
          confidence: fc.float({ min: 0, max: 1 }),
        }),
        async (tile: DetectedTile) => {
          // Count pips on the tile
          const result = await pipCounter.countPips(mockImageData, tile);

          // Verify that totalPips equals leftPips + rightPips
          expect(result.totalPips).toBe(result.leftPips + result.rightPips);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 6: Pip range accuracy
   * Validates: Requirements 3.3, 11.4
   */
  it('Property 6: Pip range accuracy - pip counts should be within valid range (0-12)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random detected tiles
        fc.record({
          id: fc.uuid(),
          boundingBox: fc.record({
            x: fc.integer({ min: 0, max: 600 }),
            y: fc.integer({ min: 0, max: 440 }),
            width: fc.integer({ min: 40, max: 100 }),
            height: fc.integer({ min: 20, max: 50 }),
            rotation: fc.float({ min: 0, max: 360 }),
          }),
          leftPips: fc.integer({ min: 0, max: 12 }),
          rightPips: fc.integer({ min: 0, max: 12 }),
          totalPips: fc.integer({ min: 0, max: 24 }),
          confidence: fc.float({ min: 0, max: 1 }),
        }),
        async (tile: DetectedTile) => {
          // Count pips on the tile
          const result = await pipCounter.countPips(mockImageData, tile);

          // Verify that pip counts are within valid range
          expect(result.leftPips).toBeGreaterThanOrEqual(0);
          expect(result.leftPips).toBeLessThanOrEqual(12);
          expect(result.rightPips).toBeGreaterThanOrEqual(0);
          expect(result.rightPips).toBeLessThanOrEqual(12);
          
          // Total should also be within valid range (0-24 for double-12 set)
          expect(result.totalPips).toBeGreaterThanOrEqual(0);
          expect(result.totalPips).toBeLessThanOrEqual(24);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 7: Confidence reporting
   * Validates: Requirements 3.5
   */
  it('Property 7: Confidence reporting - confidence score should be between 0 and 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random detected tiles
        fc.record({
          id: fc.uuid(),
          boundingBox: fc.record({
            x: fc.integer({ min: 0, max: 600 }),
            y: fc.integer({ min: 0, max: 440 }),
            width: fc.integer({ min: 40, max: 100 }),
            height: fc.integer({ min: 20, max: 50 }),
            rotation: fc.float({ min: 0, max: 360 }),
          }),
          leftPips: fc.integer({ min: 0, max: 12 }),
          rightPips: fc.integer({ min: 0, max: 12 }),
          totalPips: fc.integer({ min: 0, max: 24 }),
          confidence: fc.float({ min: 0, max: 1 }),
        }),
        async (tile: DetectedTile) => {
          // Count pips on the tile
          const result = await pipCounter.countPips(mockImageData, tile);

          // Verify that confidence is between 0 and 1
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
