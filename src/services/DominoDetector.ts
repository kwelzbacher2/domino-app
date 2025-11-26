/**
 * DominoDetector - Detects domino tiles in images using TensorFlow.js
 * Filters objects by shape/aspect ratio and handles rotation
 * 
 * CURRENT APPROACH (MVP):
 * - Uses pre-trained COCO-SSD model to detect rectangular objects
 * - Filters by aspect ratio (1.5:2.5) to find domino-shaped objects
 * - This is a heuristic that works if dominoes are the only rectangular objects
 * 
 * TODO (Post-MVP): Train custom domino detection model
 * For better accuracy, consider:
 * 1. Collect 500-1000 images of dominoes in various conditions
 * 2. Annotate with bounding boxes using tools like Roboflow or LabelImg
 * 3. Train custom YOLO or SSD model specifically for dominoes
 * 4. Fine-tune on domino-specific features (white tiles, black pips, rectangular shape)
 * 5. Convert to TensorFlow.js format
 * 
 * Benefits of custom model:
 * - Better accuracy in cluttered scenes
 * - Can detect dominoes even when partially occluded
 * - Can distinguish dominoes from other rectangular objects
 * - Can potentially detect pip counts directly (end-to-end solution)
 */

import type { DetectedObject } from '@tensorflow-models/coco-ssd';
import { modelLoader } from './ModelLoader';
import { imagePreprocessor } from './ImagePreprocessor';
import { pipCounter } from './PipCounter';
import { imageAnnotator } from './ImageAnnotator';
import type { ImageData, DetectedTile, BoundingBox, DetectionResult } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Aspect ratio range for domino tiles (width/height or height/width)
 * Standard dominoes are roughly 2:1 ratio, but we allow some variance
 */
const MIN_DOMINO_ASPECT_RATIO = 1.5;
const MAX_DOMINO_ASPECT_RATIO = 2.5;

/**
 * Minimum confidence threshold for object detection
 */
const MIN_DETECTION_CONFIDENCE = 0.3;

/**
 * Minimum size threshold (in pixels) to filter out tiny detections
 */
const MIN_TILE_SIZE = 20;

/**
 * DominoDetector service for detecting domino tiles in images
 */
export class DominoDetector {
  /**
   * Check if a detected object matches domino tile characteristics
   */
  private isDominoShaped(detection: DetectedObject): boolean {
    const [, , width, height] = detection.bbox;

    // Filter by minimum size
    if (width < MIN_TILE_SIZE || height < MIN_TILE_SIZE) {
      return false;
    }

    // Calculate aspect ratio (always > 1)
    const aspectRatio = Math.max(width, height) / Math.min(width, height);

    // Check if aspect ratio matches domino shape
    if (
      aspectRatio < MIN_DOMINO_ASPECT_RATIO ||
      aspectRatio > MAX_DOMINO_ASPECT_RATIO
    ) {
      return false;
    }

    return true;
  }

  /**
   * Estimate rotation angle based on bounding box dimensions
   * Returns 0 for horizontal, 90 for vertical
   */
  private estimateRotation(width: number, height: number): number {
    // If height > width, tile is likely vertical (90 degrees)
    return height > width ? 90 : 0;
  }

  /**
   * Convert COCO-SSD detection to DetectedTile format
   * Note: Pip counting is done separately in PipCounter
   */
  private convertToDetectedTile(detection: DetectedObject): DetectedTile {
    const [x, y, width, height] = detection.bbox;

    const boundingBox: BoundingBox = {
      x,
      y,
      width,
      height,
      rotation: this.estimateRotation(width, height),
    };

    return {
      id: uuidv4(),
      boundingBox,
      leftPips: 0, // Will be filled by PipCounter
      rightPips: 0, // Will be filled by PipCounter
      totalPips: 0, // Will be filled by PipCounter
      confidence: detection.score,
    };
  }

  /**
   * Detect domino tiles in an image
   * Returns array of detected tiles with bounding boxes
   */
  async detectDominoes(imageData: ImageData): Promise<DetectedTile[]> {
    try {
      // Ensure model is loaded
      const model = await modelLoader.loadModel();

      // Preprocess image
      const processed = await imagePreprocessor.preprocessImage(imageData);

      // Run object detection
      const detections = await model.detect(processed.tensor);

      // Clean up tensor
      processed.tensor.dispose();

      // Filter detections for domino-shaped objects
      const dominoDetections = detections.filter(
        (detection) =>
          detection.score >= MIN_DETECTION_CONFIDENCE &&
          this.isDominoShaped(detection)
      );

      // Convert to DetectedTile format
      const tiles = dominoDetections.map((detection) =>
        this.convertToDetectedTile(detection)
      );

      // Scale bounding boxes back to original image dimensions
      const scaledTiles = tiles.map((tile) => ({
        ...tile,
        boundingBox: {
          ...tile.boundingBox,
          x: tile.boundingBox.x / processed.scaleFactor,
          y: tile.boundingBox.y / processed.scaleFactor,
          width: tile.boundingBox.width / processed.scaleFactor,
          height: tile.boundingBox.height / processed.scaleFactor,
        },
      }));

      console.log(
        `Detected ${scaledTiles.length} domino-shaped objects from ${detections.length} total detections`
      );

      return scaledTiles;
    } catch (error) {
      throw new Error(
        `Domino detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Detect domino tiles and count pips
   * Returns array of detected tiles with pip counts
   */
  async detectDominoesWithPips(imageData: ImageData): Promise<DetectedTile[]> {
    try {
      // First detect the tiles
      const tiles = await this.detectDominoes(imageData);

      // Count pips on each detected tile
      const tilesWithPips = await pipCounter.countPipsOnTiles(imageData, tiles);

      console.log(
        `Counted pips on ${tilesWithPips.length} tiles. Total score: ${tilesWithPips.reduce((sum, t) => sum + t.totalPips, 0)}`
      );

      return tilesWithPips;
    } catch (error) {
      throw new Error(
        `Domino detection with pip counting failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Detect dominoes with rotation invariance
   * Tries multiple orientations if initial detection yields poor results
   * 
   * TODO (Post-MVP): Implement multi-orientation detection
   * Algorithm:
   * 1. Try detection at 0°, 90°, 180°, 270°
   * 2. For each orientation:
   *    - Rotate image using tf.image.rot90
   *    - Run detection
   *    - Transform bounding boxes back to original orientation
   * 3. Merge results from all orientations
   * 4. Remove duplicate detections using Non-Maximum Suppression (NMS)
   * 5. Return combined results
   * 
   * This helps when dominoes are at unusual angles or the camera is tilted.
   */
  async detectDominoesRotationInvariant(
    imageData: ImageData
  ): Promise<DetectedTile[]> {
    // First attempt with original orientation
    const tiles = await this.detectDominoes(imageData);

    // If we found tiles, return them
    if (tiles.length > 0) {
      return tiles;
    }

    // TODO: If no tiles found, could try rotating image 90 degrees
    // For now, just return empty array
    console.log('No dominoes detected in any orientation');
    return [];
  }

  /**
   * Complete detection pipeline with annotation
   * Detects dominoes, counts pips, and generates annotated image
   * Returns a complete DetectionResult
   */
  async detectAndAnnotate(imageData: ImageData): Promise<DetectionResult> {
    try {
      // Detect dominoes and count pips
      const tiles = await this.detectDominoesWithPips(imageData);

      // Calculate total score
      const totalScore = tiles.reduce((sum, tile) => sum + tile.totalPips, 0);

      // Calculate overall confidence (average of all tiles)
      const overallConfidence =
        tiles.length > 0
          ? tiles.reduce((sum, tile) => sum + tile.confidence, 0) / tiles.length
          : 0;

      // Generate annotated image
      const processedImage = await imageAnnotator.annotateImageWithSummary(
        imageData,
        tiles,
        totalScore
      );

      return {
        tiles,
        totalScore,
        confidence: overallConfidence,
        processedImage,
      };
    } catch (error) {
      throw new Error(
        `Detection and annotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const dominoDetector = new DominoDetector();
