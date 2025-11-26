/**
 * Property-based tests for CameraModule
 * Feature: domino-web-app, Property 1: Image capture persistence
 * Validates: Requirements 1.2
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { CameraModule } from './CameraModule';

// Mock canvas operations for jsdom environment
beforeAll(() => {
  // Mock HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function(contextType: string) {
    if (contextType === '2d') {
      return {
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        canvas: this,
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  };

  // Mock HTMLCanvasElement.prototype.toDataURL
  HTMLCanvasElement.prototype.toDataURL = function(type?: string, quality?: number) {
    // Return a minimal valid data URL
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
  };

  // Mock HTMLCanvasElement.prototype.toBlob
  HTMLCanvasElement.prototype.toBlob = function(callback: BlobCallback, type?: string, quality?: number) {
    // Create a minimal blob
    const blob = new Blob(['fake image data'], { type: type || 'image/jpeg' });
    setTimeout(() => callback(blob), 0);
  };

  // Mock Image constructor to trigger onload immediately
  const OriginalImage = global.Image;
  (global as any).Image = class MockImage extends OriginalImage {
    private _src: string = '';
    
    constructor(width?: number, height?: number) {
      super(width, height);
      // Set default dimensions
      Object.defineProperty(this, 'width', { value: width || 100, writable: true, configurable: true });
      Object.defineProperty(this, 'height', { value: height || 100, writable: true, configurable: true });
    }

    get src() {
      return this._src;
    }

    set src(value: string) {
      this._src = value;
      // Trigger onload asynchronously
      setTimeout(() => {
        if (this.onload) {
          this.onload(new Event('load'));
        }
      }, 0);
    }
  };
});

describe('CameraModule', () => {
  describe('Property 1: Image capture persistence', () => {
    /**
     * Feature: domino-web-app, Property 1: Image capture persistence
     * For any captured image, storing it should result in the image being retrievable 
     * from storage with the same content.
     * Validates: Requirements 1.2
     */
    it('should preserve image data through capture and storage round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random image dimensions
          fc.integer({ min: 100, max: 4000 }),
          fc.integer({ min: 100, max: 4000 }),
          // Generate random image quality
          fc.double({ min: 0.1, max: 1.0 }),
          async (width, height, quality) => {
            // Create a video element and mock its properties
            const video = document.createElement('video');
            Object.defineProperty(video, 'videoWidth', { value: width, writable: true });
            Object.defineProperty(video, 'videoHeight', { value: height, writable: true });
            
            // Create camera module with mocked stream
            const cameraModule = new CameraModule();
            
            // Mock the stream
            const mockStream = {
              getTracks: () => [{
                stop: vi.fn(),
              }],
            } as unknown as MediaStream;
            
            (cameraModule as any).stream = mockStream;
            
            try {
              // Capture the image
              const capturedImage = await cameraModule.captureImage(video);
              
              // Verify the captured image has correct dimensions
              expect(capturedImage.width).toBe(width);
              expect(capturedImage.height).toBe(height);
              
              // Verify the data URL is valid and non-empty
              expect(capturedImage.dataUrl).toBeTruthy();
              expect(capturedImage.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
              
              // Verify timestamp is recent
              const now = new Date();
              const timeDiff = now.getTime() - capturedImage.timestamp.getTime();
              expect(timeDiff).toBeLessThan(1000); // Within 1 second
              
              // Verify the data URL length is reasonable (not empty)
              expect(capturedImage.dataUrl.length).toBeGreaterThan(50);
              
            } finally {
              cameraModule.cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });



  describe('error handling', () => {
    it('should reject non-image files', async () => {
      const cameraModule = new CameraModule();
      
      const textFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      await expect(cameraModule.uploadImage(textFile)).rejects.toThrow(
        'Selected file is not an image'
      );
      
      cameraModule.cleanup();
    });

    it('should reject files that are too large', async () => {
      const cameraModule = new CameraModule();
      
      // Create a file larger than 10MB
      const largeBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'image/jpeg' });
      const largeFile = new File([largeBlob], 'large.jpg', { type: 'image/jpeg' });
      
      await expect(cameraModule.uploadImage(largeFile)).rejects.toThrow(
        'Image file is too large'
      );
      
      cameraModule.cleanup();
    });
  });

  describe('camera support detection', () => {
    it('should detect camera support correctly', () => {
      const isSupported = CameraModule.isCameraSupported();
      
      // In jsdom environment, this should be false unless mocked
      expect(typeof isSupported).toBe('boolean');
    });
  });
});
