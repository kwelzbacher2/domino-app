/**
 * Web Worker for domino detection
 * Runs image processing in a separate thread to avoid blocking the UI
 */

import { dominoDetector } from '../services/DominoDetector';
import type { ImageData, DetectionResult } from '../models/types';

// Message types for worker communication
interface DetectionMessage {
  type: 'detect';
  imageData: ImageData;
  requestId: string;
}

interface DetectionResponse {
  type: 'result' | 'error';
  requestId: string;
  result?: DetectionResult;
  error?: string;
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<DetectionMessage>) => {
  const { type, imageData, requestId } = event.data;

  if (type === 'detect') {
    try {
      // Run detection in worker thread
      const result = await dominoDetector.detectAndAnnotate(imageData);

      // Send result back to main thread
      const response: DetectionResponse = {
        type: 'result',
        requestId,
        result,
      };
      self.postMessage(response);
    } catch (error) {
      // Send error back to main thread
      const response: DetectionResponse = {
        type: 'error',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      self.postMessage(response);
    }
  }
};

// Export empty object to make TypeScript happy
export {};
