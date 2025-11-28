/**
 * DetectionPipeline - Main entry point for domino detection
 * Orchestrates the complete detection flow from image to annotated results
 * Supports multiple detection backends: COCO-SSD, Custom Model, or Roboflow API
 */

import { dominoDetector } from './DominoDetector';
import { customModelDetector } from './CustomModelDetector';
import { roboflowDetector } from './RoboflowDetector';
import type { ImageData, DetectionResult } from '../models/types';

// Detection mode configuration
const USE_CUSTOM_MODEL = import.meta.env.VITE_USE_CUSTOM_MODEL === 'true';
const USE_ROBOFLOW_API = import.meta.env.VITE_USE_ROBOFLOW_API === 'true';

/**
 * Get the appropriate detector based on configuration
 */
function getDetector() {
  if (USE_CUSTOM_MODEL) {
    console.log('Using custom trained model');
    return customModelDetector;
  }
  
  if (USE_ROBOFLOW_API) {
    console.log('Using Roboflow hosted API');
    return roboflowDetector;
  }
  
  console.log('Using COCO-SSD with heuristics');
  return dominoDetector;
}

/**
 * Detect dominoes in an image and return annotated results
 * This is the main function used by the UI to process images
 * Automatically uses the configured detection backend
 */
export async function detectDominoes(imageData: ImageData): Promise<DetectionResult> {
  try {
    const detector = getDetector();
    const result = await detector.detectAndAnnotate(imageData);
    return result;
  } catch (error) {
    throw new Error(
      `Domino detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Detect dominoes on main thread
 * Use this when you need synchronous processing or for testing
 */
export async function detectDominoesSync(imageData: ImageData): Promise<DetectionResult> {
  try {
    const detector = getDetector();
    const result = await detector.detectAndAnnotate(imageData);
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
  if (USE_CUSTOM_MODEL) {
    // Preload custom model
    await customModelDetector.loadModel();
  } else if (!USE_ROBOFLOW_API) {
    // Preload COCO-SSD
    const { modelLoader } = await import('./ModelLoader');
    await modelLoader.loadModel();
  }
  // Roboflow API doesn't need preloading
}
