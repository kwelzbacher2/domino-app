/**
 * DetectionWorkerService - Manages Web Worker for image detection
 * Provides a clean interface for running detection in a background thread
 */

import type { ImageData, DetectionResult } from '../models/types';

interface PendingRequest {
  resolve: (result: DetectionResult) => void;
  reject: (error: Error) => void;
}

/**
 * Service for managing detection Web Worker
 * Falls back to main thread if Web Workers are not supported
 */
class DetectionWorkerService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCounter = 0;
  // Disable Web Workers for now due to Image constructor not being available in workers
  private workerSupported = false;

  /**
   * Initialize the Web Worker
   */
  private initWorker(): void {
    if (!this.workerSupported || this.worker) {
      return;
    }

    try {
      // Create worker from inline script to avoid bundling issues
      // In production, you might want to use a separate worker file
      this.worker = new Worker(
        new URL('../workers/detection.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event) => {
        const { type, requestId, result, error } = event.data;
        const pending = this.pendingRequests.get(requestId);

        if (!pending) {
          return;
        }

        this.pendingRequests.delete(requestId);

        if (type === 'result' && result) {
          pending.resolve(result);
        } else if (type === 'error') {
          pending.reject(new Error(error || 'Detection failed'));
        }
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        // Reject all pending requests
        this.pendingRequests.forEach((pending) => {
          pending.reject(new Error('Worker error'));
        });
        this.pendingRequests.clear();
      };
    } catch (error) {
      console.warn('Failed to initialize Web Worker, falling back to main thread:', error);
      this.workerSupported = false;
    }
  }

  /**
   * Detect dominoes using Web Worker (or main thread as fallback)
   */
  async detectDominoes(imageData: ImageData): Promise<DetectionResult> {
    // If Web Workers are not supported, fall back to main thread
    if (!this.workerSupported) {
      return this.detectOnMainThread(imageData);
    }

    // Initialize worker if needed
    if (!this.worker) {
      this.initWorker();
    }

    // If worker initialization failed, fall back to main thread
    if (!this.worker) {
      return this.detectOnMainThread(imageData);
    }

    // Create unique request ID
    const requestId = `req_${++this.requestCounter}`;

    // Create promise for this request
    return new Promise<DetectionResult>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      // Send message to worker
      this.worker!.postMessage({
        type: 'detect',
        imageData,
        requestId,
      });

      // Set timeout to prevent hanging
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Detection timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Fallback: Run detection on main thread
   */
  private async detectOnMainThread(imageData: ImageData): Promise<DetectionResult> {
    const { dominoDetector } = await import('./DominoDetector');
    return dominoDetector.detectAndAnnotate(imageData);
  }

  /**
   * Terminate the worker and clean up resources
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const detectionWorkerService = new DetectionWorkerService();
