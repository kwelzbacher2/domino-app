/**
 * Tests for ImageAnnotator
 * Tests annotation functionality for detection results
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { imageAnnotator } from './ImageAnnotator';
import type { DetectedTile, ImageData } from '../models/types';

// Mock canvas and image elements for testing
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(),
  toDataURL: vi.fn(),
};

const mockContext = {
  drawImage: vi.fn(),
  strokeRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 0,
  globalAlpha: 1,
  font: '',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high' as ImageSmoothingQuality,
};

describe('ImageAnnotator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document.createElement for canvas
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        mockCanvas.getContext.mockReturnValue(mockContext);
        mockCanvas.toDataURL.mockReturnValue('data:image/jpeg;base64,annotated');
        return mockCanvas as any;
      }
      return document.createElement(tagName);
    });

    // Mock Image constructor
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      width = 640;
      height = 480;

      constructor() {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    } as any;

    // Mock measureText
    mockContext.measureText.mockReturnValue({
      width: 100,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 5,
    } as TextMetrics);
  });

  it('should annotate image with bounding boxes and pip counts', async () => {
    const imageData: ImageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const tiles: DetectedTile[] = [
      {
        id: '1',
        boundingBox: { x: 10, y: 10, width: 40, height: 20, rotation: 0 },
        leftPips: 3,
        rightPips: 5,
        totalPips: 8,
        confidence: 0.9,
      },
      {
        id: '2',
        boundingBox: { x: 60, y: 10, width: 40, height: 20, rotation: 0 },
        leftPips: 2,
        rightPips: 4,
        totalPips: 6,
        confidence: 0.85,
      },
    ];

    const result = await imageAnnotator.annotateImage(imageData, tiles);

    // Should return a data URL
    expect(result).toMatch(/^data:image\/jpeg;base64,/);

    // Should have drawn the original image
    expect(mockContext.drawImage).toHaveBeenCalled();

    // Should have drawn bounding boxes for each tile
    expect(mockContext.strokeRect).toHaveBeenCalledTimes(tiles.length);

    // Should have drawn labels for each tile
    expect(mockContext.fillText).toHaveBeenCalledTimes(tiles.length);
  });

  it('should annotate image with summary header', async () => {
    const imageData: ImageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const tiles: DetectedTile[] = [
      {
        id: '1',
        boundingBox: { x: 10, y: 10, width: 40, height: 20, rotation: 0 },
        leftPips: 3,
        rightPips: 5,
        totalPips: 8,
        confidence: 0.9,
      },
    ];

    const totalScore = 8;

    const result = await imageAnnotator.annotateImageWithSummary(
      imageData,
      tiles,
      totalScore
    );

    // Should return a data URL
    expect(result).toMatch(/^data:image\/jpeg;base64,/);

    // Should have created canvas with extra height for summary
    expect(mockCanvas.height).toBeGreaterThan(480);

    // Should have drawn summary background
    expect(mockContext.fillRect).toHaveBeenCalled();

    // Should have drawn summary text
    expect(mockContext.fillText).toHaveBeenCalled();
  });

  it('should handle empty tiles array', async () => {
    const imageData: ImageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const tiles: DetectedTile[] = [];

    const result = await imageAnnotator.annotateImage(imageData, tiles);

    // Should still return a data URL (original image)
    expect(result).toMatch(/^data:image\/jpeg;base64,/);

    // Should have drawn the original image
    expect(mockContext.drawImage).toHaveBeenCalled();

    // Should not have drawn any bounding boxes
    expect(mockContext.strokeRect).not.toHaveBeenCalled();
  });

  it('should format pip count labels correctly', async () => {
    const imageData: ImageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const tiles: DetectedTile[] = [
      {
        id: '1',
        boundingBox: { x: 10, y: 10, width: 40, height: 20, rotation: 0 },
        leftPips: 6,
        rightPips: 6,
        totalPips: 12,
        confidence: 0.9,
      },
    ];

    await imageAnnotator.annotateImage(imageData, tiles);

    // Should have called fillText with formatted label
    expect(mockContext.fillText).toHaveBeenCalledWith(
      '6|6 (12)',
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('should handle blank tiles (0 pips)', async () => {
    const imageData: ImageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const tiles: DetectedTile[] = [
      {
        id: '1',
        boundingBox: { x: 10, y: 10, width: 40, height: 20, rotation: 0 },
        leftPips: 0,
        rightPips: 3,
        totalPips: 3,
        confidence: 0.9,
      },
    ];

    await imageAnnotator.annotateImage(imageData, tiles);

    // Should have called fillText with formatted label including 0
    expect(mockContext.fillText).toHaveBeenCalledWith(
      '0|3 (3)',
      expect.any(Number),
      expect.any(Number)
    );
  });

  /**
   * Property-Based Tests
   */
  describe('Property-Based Tests', () => {
    /**
     * Feature: domino-web-app, Property 8: Detection result annotation
     * Validates: Requirements 4.1, 4.2
     * 
     * For any completed detection, the result should include the original image 
     * with bounding boxes and pip counts overlaid on each detected tile.
     */
    it('Property 8: annotated image contains bounding boxes and pip counts for all tiles', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random image data
          fc.record({
            dataUrl: fc.constant('data:image/jpeg;base64,test'),
            width: fc.integer({ min: 100, max: 2000 }),
            height: fc.integer({ min: 100, max: 2000 }),
            timestamp: fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 0, 1) }),
          }),
          // Generate random array of detected tiles
          fc.array(
            fc.record({
              id: fc.uuid(),
              boundingBox: fc.record({
                x: fc.integer({ min: 0, max: 500 }),
                y: fc.integer({ min: 0, max: 500 }),
                width: fc.integer({ min: 20, max: 100 }),
                height: fc.integer({ min: 10, max: 50 }),
                rotation: fc.double({ min: 0, max: 360 }),
              }),
              leftPips: fc.integer({ min: 0, max: 12 }),
              rightPips: fc.integer({ min: 0, max: 12 }),
              confidence: fc.double({ min: 0.5, max: 1.0 }),
            }).map((tile) => ({
              ...tile,
              totalPips: tile.leftPips + tile.rightPips,
            })),
            { minLength: 0, maxLength: 20 }
          ),
          async (imageData: ImageData, tiles: DetectedTile[]) => {
            // Reset mocks for each iteration
            mockContext.strokeRect.mockClear();
            mockContext.fillText.mockClear();
            mockContext.drawImage.mockClear();
            mockCanvas.toDataURL.mockReturnValue('data:image/jpeg;base64,annotated');

            // Annotate the image
            const result = await imageAnnotator.annotateImage(imageData, tiles);

            // Property 1: Result should be a valid data URL
            expect(result).toMatch(/^data:image\/jpeg;base64,/);

            // Property 2: Original image should be drawn
            expect(mockContext.drawImage).toHaveBeenCalled();

            // Property 3: Bounding boxes should be drawn for each tile
            // Each tile should have exactly one bounding box
            expect(mockContext.strokeRect).toHaveBeenCalledTimes(tiles.length);

            // Property 4: Pip count labels should be drawn for each tile
            // Each tile should have exactly one label
            expect(mockContext.fillText).toHaveBeenCalledTimes(tiles.length);

            // Property 5: Each label should contain the correct pip count format
            for (let i = 0; i < tiles.length; i++) {
              const tile = tiles[i];
              const expectedLabel = `${tile.leftPips}|${tile.rightPips} (${tile.totalPips})`;
              
              // Check that fillText was called with the expected label
              const fillTextCalls = mockContext.fillText.mock.calls;
              const labelFound = fillTextCalls.some(
                (call) => call[0] === expectedLabel
              );
              expect(labelFound).toBe(true);
            }

            // Property 6: Bounding boxes should be drawn at correct positions
            for (let i = 0; i < tiles.length; i++) {
              const tile = tiles[i];
              const { x, y, width, height } = tile.boundingBox;
              
              // Check that strokeRect was called with the correct bounding box
              const strokeRectCalls = mockContext.strokeRect.mock.calls;
              const boxFound = strokeRectCalls.some(
                (call) => call[0] === x && call[1] === y && call[2] === width && call[3] === height
              );
              expect(boxFound).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
