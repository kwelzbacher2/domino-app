/**
 * Property-based tests for DominoDetector
 * Tests domino detection properties across various inputs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { DetectedObject } from '@tensorflow-models/coco-ssd';
import type { DetectedTile } from '../models/types';

// Mock the dependencies
vi.mock('./ModelLoader', () => ({
  modelLoader: {
    loadModel: vi.fn().mockResolvedValue({
      detect: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock('./ImagePreprocessor', () => ({
  imagePreprocessor: {
    preprocessImage: vi.fn().mockResolvedValue({
      tensor: {
        dispose: vi.fn(),
      },
      originalWidth: 640,
      originalHeight: 480,
      scaleFactor: 1,
    }),
  },
}));

// Import after mocking
import { dominoDetector } from './DominoDetector';
import { modelLoader } from './ModelLoader';

// Generator for mock COCO-SSD detections with domino-like shapes
const dominoDetectionArbitrary = fc.record({
  bbox: fc.tuple(
    fc.integer({ min: 0, max: 500 }), // x
    fc.integer({ min: 0, max: 500 }), // y
    fc.integer({ min: 40, max: 100 }), // width
    fc.integer({ min: 20, max: 50 })  // height (creates ~2:1 aspect ratio)
  ),
  class: fc.constant('object'),
  score: fc.double({ min: 0.3, max: 1.0 }),
}) as fc.Arbitrary<DetectedObject>;

// Generator for non-domino shaped detections (squares or very wide/tall objects)
const nonDominoDetectionArbitrary = fc.oneof(
  // Square-ish objects (aspect ratio close to 1:1, definitely < 1.5)
  fc.record({
    bbox: fc.tuple(
      fc.integer({ min: 0, max: 500 }), // x
      fc.integer({ min: 0, max: 500 }), // y
      fc.integer({ min: 50, max: 100 }), // width
      fc.integer({ min: 50, max: 100 })  // height (creates ~1:1 aspect ratio)
    ),
    class: fc.constant('object'),
    score: fc.double({ min: 0.3, max: 1.0 }),
  }),
  // Very elongated objects (aspect ratio > 2.5)
  fc.record({
    bbox: fc.tuple(
      fc.integer({ min: 0, max: 500 }), // x
      fc.integer({ min: 0, max: 500 }), // y
      fc.integer({ min: 60, max: 100 }), // width
      fc.integer({ min: 20, max: 23 })  // height (creates ~3:1 or higher aspect ratio)
    ),
    class: fc.constant('object'),
    score: fc.double({ min: 0.3, max: 1.0 }),
  })
) as fc.Arbitrary<DetectedObject>;

describe('DominoDetector Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: domino-web-app, Property 2: Domino boundary detection
   * Validates: Requirements 2.1
   * 
   * For any image containing domino tiles, the detection system should 
   * identify bounding boxes for each tile present in the image.
   */
  it('Property 2: should return bounding boxes for detected objects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(dominoDetectionArbitrary, { minLength: 1, maxLength: 10 }),
        async (detections: DetectedObject[]) => {
          // Mock the model to return our generated detections
          const mockModel = {
            detect: vi.fn().mockResolvedValue(detections),
          };
          vi.mocked(modelLoader.loadModel).mockResolvedValue(mockModel as any);

          const imageData = {
            dataUrl: 'data:image/jpeg;base64,test',
            width: 640,
            height: 480,
            timestamp: new Date(),
          };

          const tiles = await dominoDetector.detectDominoes(imageData);

          // All detected tiles should have valid bounding boxes
          tiles.forEach((tile: DetectedTile) => {
            expect(tile.boundingBox).toBeDefined();
            expect(tile.boundingBox.x).toBeGreaterThanOrEqual(0);
            expect(tile.boundingBox.y).toBeGreaterThanOrEqual(0);
            expect(tile.boundingBox.width).toBeGreaterThan(0);
            expect(tile.boundingBox.height).toBeGreaterThan(0);
            expect(tile.boundingBox.rotation).toBeGreaterThanOrEqual(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 3: Non-domino object exclusion
   * Validates: Requirements 2.3
   * 
   * For any image containing both domino tiles and non-domino objects,
   * the detection system should only return bounding boxes for domino-shaped objects.
   */
  it('Property 3: should filter out non-domino shaped objects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(dominoDetectionArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(nonDominoDetectionArbitrary, { minLength: 1, maxLength: 5 }),
        async (dominoDetections: DetectedObject[], nonDominoDetections: DetectedObject[]) => {
          // Mix domino and non-domino detections
          const allDetections = [...dominoDetections, ...nonDominoDetections];

          const mockModel = {
            detect: vi.fn().mockResolvedValue(allDetections),
          };
          vi.mocked(modelLoader.loadModel).mockResolvedValue(mockModel as any);

          const imageData = {
            dataUrl: 'data:image/jpeg;base64,test',
            width: 640,
            height: 480,
            timestamp: new Date(),
          };

          const tiles = await dominoDetector.detectDominoes(imageData);

          // All detected tiles should have domino-like aspect ratios
          tiles.forEach((tile: DetectedTile) => {
            const { width, height } = tile.boundingBox;
            const aspectRatio = Math.max(width, height) / Math.min(width, height);

            // Domino tiles should have aspect ratio between 1.5 and 2.5
            expect(aspectRatio).toBeGreaterThanOrEqual(1.5);
            expect(aspectRatio).toBeLessThanOrEqual(2.5);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 4: Rotation invariance
   * Validates: Requirements 2.5
   * 
   * For any domino tile at any rotation angle, the detection system 
   * should identify the tile regardless of its orientation.
   */
  it('Property 4: should detect tiles regardless of rotation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(dominoDetectionArbitrary, { minLength: 1, maxLength: 10 }),
        async (detections: DetectedObject[]) => {
          const mockModel = {
            detect: vi.fn().mockResolvedValue(detections),
          };
          vi.mocked(modelLoader.loadModel).mockResolvedValue(mockModel as any);

          const imageData = {
            dataUrl: 'data:image/jpeg;base64,test',
            width: 640,
            height: 480,
            timestamp: new Date(),
          };

          const tiles = await dominoDetector.detectDominoesRotationInvariant(imageData);

          // All detected tiles should have a rotation value
          tiles.forEach((tile: DetectedTile) => {
            expect(tile.boundingBox.rotation).toBeDefined();
            // Rotation should be 0 (horizontal) or 90 (vertical)
            expect([0, 90]).toContain(tile.boundingBox.rotation);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional unit tests for specific edge cases
  it('should return empty array when no dominoes detected', async () => {
    const mockModel = {
      detect: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(modelLoader.loadModel).mockResolvedValue(mockModel as any);

    const imageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 100,
      height: 100,
      timestamp: new Date(),
    };

    const tiles = await dominoDetector.detectDominoes(imageData);
    expect(Array.isArray(tiles)).toBe(true);
    expect(tiles.length).toBe(0);
  });

  it('should assign unique IDs to each detected tile', async () => {
    const detections: DetectedObject[] = [
      { bbox: [10, 10, 40, 20], class: 'object', score: 0.9 },
      { bbox: [60, 10, 40, 20], class: 'object', score: 0.85 },
      { bbox: [110, 10, 40, 20], class: 'object', score: 0.8 },
    ];

    const mockModel = {
      detect: vi.fn().mockResolvedValue(detections),
    };
    vi.mocked(modelLoader.loadModel).mockResolvedValue(mockModel as any);

    const imageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const tiles = await dominoDetector.detectDominoes(imageData);

    const ids = tiles.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should include confidence scores for all detections', async () => {
    const detections: DetectedObject[] = [
      { bbox: [10, 10, 40, 20], class: 'object', score: 0.9 },
      { bbox: [60, 10, 40, 20], class: 'object', score: 0.5 },
    ];

    const mockModel = {
      detect: vi.fn().mockResolvedValue(detections),
    };
    vi.mocked(modelLoader.loadModel).mockResolvedValue(mockModel as any);

    const imageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const tiles = await dominoDetector.detectDominoes(imageData);

    tiles.forEach((tile) => {
      expect(tile.confidence).toBeGreaterThanOrEqual(0);
      expect(tile.confidence).toBeLessThanOrEqual(1);
    });
  });
});
