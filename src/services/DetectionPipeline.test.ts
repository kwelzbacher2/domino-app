/**
 * Integration tests for the complete detection and annotation pipeline
 * Tests the detectAndAnnotate method that combines detection, pip counting, and annotation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DetectedObject } from '@tensorflow-models/coco-ssd';
import type { ImageData } from '../models/types';

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

vi.mock('./PipCounter', () => ({
  pipCounter: {
    countPipsOnTiles: vi.fn().mockImplementation(async (_imageData, tiles) => {
      // Mock pip counting - assign random pip counts
      return tiles.map((tile: any) => ({
        ...tile,
        leftPips: 3,
        rightPips: 4,
        totalPips: 7,
        confidence: 0.85,
      }));
    }),
  },
}));

// Import after mocking
import { dominoDetector } from './DominoDetector';
import { modelLoader } from './ModelLoader';

describe('Detection and Annotation Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock canvas and image for annotation
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

    mockCanvas.getContext.mockReturnValue(mockContext);
    mockCanvas.toDataURL.mockReturnValue('data:image/jpeg;base64,annotated');

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return document.createElement(tagName);
    });

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

    mockContext.measureText.mockReturnValue({
      width: 100,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 5,
    } as TextMetrics);
  });

  it('should return complete DetectionResult with annotated image', async () => {
    const detections: DetectedObject[] = [
      { bbox: [10, 10, 40, 20], class: 'object', score: 0.9 },
      { bbox: [60, 10, 40, 20], class: 'object', score: 0.85 },
    ];

    const mockModel = {
      detect: vi.fn().mockResolvedValue(detections),
    };
    vi.mocked(modelLoader.loadModel).mockResolvedValue(mockModel as any);

    const imageData: ImageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const result = await dominoDetector.detectAndAnnotate(imageData);

    // Should return a complete DetectionResult
    expect(result).toBeDefined();
    expect(result.tiles).toBeDefined();
    expect(result.totalScore).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.processedImage).toBeDefined();

    // Should have detected tiles
    expect(result.tiles.length).toBe(2);

    // Should have calculated total score
    expect(result.totalScore).toBe(14); // 2 tiles * 7 pips each

    // Should have confidence score
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);

    // Should have annotated image as data URL
    expect(result.processedImage).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('should handle empty detection results', async () => {
    const mockModel = {
      detect: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(modelLoader.loadModel).mockResolvedValue(mockModel as any);

    const imageData: ImageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const result = await dominoDetector.detectAndAnnotate(imageData);

    // Should return result with empty tiles
    expect(result.tiles.length).toBe(0);
    expect(result.totalScore).toBe(0);
    expect(result.confidence).toBe(0);

    // Should still have annotated image (original image)
    expect(result.processedImage).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('should calculate correct total score from all tiles', async () => {
    const detections: DetectedObject[] = [
      { bbox: [10, 10, 40, 20], class: 'object', score: 0.9 },
      { bbox: [60, 10, 40, 20], class: 'object', score: 0.85 },
      { bbox: [110, 10, 40, 20], class: 'object', score: 0.8 },
    ];

    const mockModel = {
      detect: vi.fn().mockResolvedValue(detections),
    };
    vi.mocked(modelLoader.loadModel).mockResolvedValue(mockModel as any);

    const imageData: ImageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const result = await dominoDetector.detectAndAnnotate(imageData);

    // Total score should be sum of all tile scores
    const expectedTotal = result.tiles.reduce((sum, tile) => sum + tile.totalPips, 0);
    expect(result.totalScore).toBe(expectedTotal);
  });

  it('should calculate average confidence from all tiles', async () => {
    const detections: DetectedObject[] = [
      { bbox: [10, 10, 40, 20], class: 'object', score: 0.9 },
      { bbox: [60, 10, 40, 20], class: 'object', score: 0.8 },
    ];

    const mockModel = {
      detect: vi.fn().mockResolvedValue(detections),
    };
    vi.mocked(modelLoader.loadModel).mockResolvedValue(mockModel as any);

    const imageData: ImageData = {
      dataUrl: 'data:image/jpeg;base64,test',
      width: 640,
      height: 480,
      timestamp: new Date(),
    };

    const result = await dominoDetector.detectAndAnnotate(imageData);

    // Confidence should be average of all tile confidences
    const expectedConfidence =
      result.tiles.reduce((sum, tile) => sum + tile.confidence, 0) / result.tiles.length;
    expect(result.confidence).toBeCloseTo(expectedConfidence, 2);
  });
});
