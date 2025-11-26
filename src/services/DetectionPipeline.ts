/**
 * DetectionPipeline - Main entry point for domino detection
 * Orchestrates the complete detection flow from image to annotated results
 * Uses Web Worker for non-blocking processing when available
 */

import { detectionWorkerService } from './DetectionWorkerService';
import { dominoDetector } from './DominoDetector';
import type { ImageData, DetectionResult } from '../models/types';

/**
 * Detect dominoes in an image and return annotated results
 * This is the main function used by the UI to process images
 * Uses Web Worker for better performance when available
 */
export async function detectDominoes(imageData: ImageData): Promise<DetectionResult> {
  try {
    // Try to use Web Worker for non-blocking processing
    // Falls back to main thread if workers are not supported
    const result = await detectionWorkerService.detectDominoes(imageData);
    return result;
  } catch (error) {
    throw new Error(
      `Domino detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Detect dominoes on main thread (bypass Web Worker)
 * Use this when you need synchronous processing or for testing
 */
export async function detectDominoesSync(imageData: ImageData): Promise<DetectionResult> {
  try {
    const result = await dominoDetector.detectAndAnnotate(imageData);
    return result;
  } catch (error) {
    throw new Error(
      `Domino detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Preload the detection model to improve first-use performance
 * Call this during app initialization
 */
export async function preloadDetectionModel(): Promise<void> {
  const { modelLoader } = await import('./ModelLoader');
  await modelLoader.loadModel();
}
