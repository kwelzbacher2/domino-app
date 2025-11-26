/**
 * PipCounter - Counts pips on detected domino tiles
 * Handles blank tiles (0 pips) and supports pip counts from 0-12
 * 
 * ⚠️ MVP LIMITATION: Current implementation uses a naive heuristic that won't work well in practice.
 * This is a placeholder to demonstrate the architecture. For production, see TODO comments below.
 * 
 * RECOMMENDED POST-MVP IMPROVEMENTS:
 * 
 * Phase 1 (Quick Win - Better Classical CV):
 * - Implement proper circular blob detection using TensorFlow.js
 * - Filter blobs by circularity, size, and spacing
 * - Match detected blobs against known pip patterns (1-6 have specific layouts)
 * - Expected accuracy: 70-80% with good lighting
 * 
 * Phase 2 (Best Results - Custom ML Model):
 * - Collect training data using the error reporting feature (Requirement 15)
 * - Train a CNN classifier: input = domino half image, output = pip count (0-12)
 * - Use transfer learning from MobileNet for faster training
 * - Convert trained model to TensorFlow.js format
 * - Expected accuracy: 90-95%
 * 
 * Phase 3 (Production Quality - Hybrid):
 * - Use ML model as primary detection method
 * - Fall back to classical CV for low-confidence cases
 * - Always allow manual correction (Requirement 5)
 * - Continuously improve model with user corrections
 */

import * as tf from '@tensorflow/tfjs';
import type { DetectedTile, ImageData } from '../models/types';

/**
 * Minimum confidence threshold for pip counting
 */
const MIN_PIP_CONFIDENCE = 0.4;

/**
 * Maximum pip count supported (for double-12 domino sets)
 */
const MAX_PIP_COUNT = 12;

/**
 * PipCounter service for counting pips on domino tiles
 */
export class PipCounter {
  /**
   * Extract a tile region from the image as a tensor
   */
  private async extractTileRegion(
    imageData: ImageData,
    tile: DetectedTile
  ): Promise<tf.Tensor3D> {
    // Create an image element from the data URL
    const img = new Image();
    img.src = imageData.dataUrl;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Convert image to tensor
    const imageTensor = tf.browser.fromPixels(img);

    // Extract the bounding box region
    const { x, y, width, height } = tile.boundingBox;
    
    // Ensure coordinates are within image bounds
    const clampedX = Math.max(0, Math.min(x, imageData.width - 1));
    const clampedY = Math.max(0, Math.min(y, imageData.height - 1));
    const clampedWidth = Math.min(width, imageData.width - clampedX);
    const clampedHeight = Math.min(height, imageData.height - clampedY);

    // Crop the tile region
    const imageTensor4D = imageTensor.expandDims(0) as tf.Tensor4D;
    const tileRegion = tf.image.cropAndResize(
      imageTensor4D,
      [[clampedY / imageData.height, clampedX / imageData.width, 
        (clampedY + clampedHeight) / imageData.height, 
        (clampedX + clampedWidth) / imageData.width]],
      [0],
      [100, 200] // Resize to standard domino size (height, width)
    );

    // Clean up
    imageTensor.dispose();
    imageTensor4D.dispose();

    return tileRegion.squeeze() as tf.Tensor3D;
  }

  /**
   * Split a tile tensor into left and right halves
   */
  private splitTileHalves(tileTensor: tf.Tensor3D): [tf.Tensor3D, tf.Tensor3D] {
    const width = tileTensor.shape[1];
    const midpoint = Math.floor(width / 2);

    // Split into left and right halves
    const leftHalf = tf.slice3d(tileTensor, [0, 0, 0], [-1, midpoint, -1]);
    const rightHalf = tf.slice3d(tileTensor, [0, midpoint, 0], [-1, -1, -1]);

    return [leftHalf, rightHalf];
  }

  /**
   * Count pips on a single domino half using image analysis
   * This is a simplified implementation that uses blob detection
   * 
   * TODO (Phase 1): Replace with proper blob detection
   * - Use tf.image operations for circular Hough transform
   * - Detect circular blobs with appropriate size range
   * - Filter by circularity score (pips are round)
   * - Validate spatial arrangement against known pip patterns
   * 
   * TODO (Phase 2): Replace with trained ML model
   * - Load a custom CNN classifier trained on domino half images
   * - Input: 100x100 normalized image of domino half
   * - Output: probability distribution over pip counts (0-12)
   * - Use argmax for final prediction
   */
  private async countPipsOnHalf(halfTensor: tf.Tensor3D): Promise<{ count: number; confidence: number }> {
    // Convert to grayscale
    const grayscale = tf.mean(halfTensor, -1, true);

    // Apply threshold to create binary image
    const threshold = tf.scalar(0.5);
    const binary = tf.greater(grayscale, threshold);

    // Count connected components (pips)
    // This is a simplified approach - in production, you'd use more sophisticated blob detection
    const binaryData = await binary.data();
    const pipCount = this.estimatePipCount(binaryData, halfTensor.shape[0], halfTensor.shape[1]);

    // Clean up tensors
    grayscale.dispose();
    threshold.dispose();
    binary.dispose();

    // Calculate confidence based on image quality
    const variance = await this.calculateVariance(halfTensor);
    const confidence = this.calculateConfidence(pipCount, variance);

    return { count: pipCount, confidence };
  }

  /**
   * Estimate pip count from binary image data
   * Uses a simple heuristic based on the number of bright regions
   * 
   * ⚠️ WARNING: This is a placeholder that returns inaccurate results!
   * It just counts pixel transitions, not actual circular pips.
   * 
   * TODO (Phase 1): Implement proper blob detection
   * Algorithm outline:
   * 1. Apply Gaussian blur to reduce noise
   * 2. Use adaptive thresholding for better binarization
   * 3. Find connected components (blobs)
   * 4. Filter blobs by:
   *    - Area (pips should be similar size)
   *    - Circularity (pips are round, not elongated)
   *    - Color (pips are typically dark on light background or vice versa)
   * 5. Count remaining blobs
   * 6. Validate against known pip patterns:
   *    - 1 pip: center
   *    - 2 pips: diagonal corners
   *    - 3 pips: diagonal line
   *    - 4 pips: four corners
   *    - 5 pips: four corners + center
   *    - 6 pips: two columns of three
   */
  private estimatePipCount(binaryData: tf.TypedArray, _height: number, _width: number): number {
    // Count transitions from dark to bright (potential pips)
    let transitions = 0;
    let inBrightRegion = false;

    for (let i = 0; i < binaryData.length; i++) {
      const isBright = binaryData[i] > 0;
      
      if (isBright && !inBrightRegion) {
        transitions++;
        inBrightRegion = true;
      } else if (!isBright && inBrightRegion) {
        inBrightRegion = false;
      }
    }

    // Estimate pip count based on transitions
    // This is a simplified heuristic - real implementation would use proper blob detection
    const estimatedPips = Math.min(Math.floor(transitions / 10), MAX_PIP_COUNT);
    
    return estimatedPips;
  }

  /**
   * Calculate variance of pixel values to assess image quality
   */
  private async calculateVariance(tensor: tf.Tensor3D): Promise<number> {
    const mean = tf.mean(tensor);
    const squaredDiff = tf.square(tf.sub(tensor, mean));
    const variance = tf.mean(squaredDiff);
    
    const varianceValue = (await variance.data())[0];
    
    mean.dispose();
    squaredDiff.dispose();
    variance.dispose();
    
    return varianceValue;
  }

  /**
   * Calculate confidence score based on pip count and image quality
   */
  private calculateConfidence(pipCount: number, variance: number): number {
    // Base confidence on whether pip count is in valid range
    let confidence = pipCount >= 0 && pipCount <= MAX_PIP_COUNT ? 0.7 : 0.3;

    // Adjust based on image variance (higher variance = better quality)
    if (variance > 0.1) {
      confidence += 0.2;
    } else if (variance < 0.05) {
      confidence -= 0.2;
    }

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Count pips on a detected domino tile
   * Updates the tile object with pip counts and confidence
   */
  async countPips(imageData: ImageData, tile: DetectedTile): Promise<DetectedTile> {
    try {
      // Extract the tile region from the image
      const tileTensor = await this.extractTileRegion(imageData, tile);

      // Split into left and right halves
      const [leftHalf, rightHalf] = this.splitTileHalves(tileTensor);

      // Count pips on each half
      const leftResult = await this.countPipsOnHalf(leftHalf);
      const rightResult = await this.countPipsOnHalf(rightHalf);

      // Clean up tensors
      tileTensor.dispose();
      leftHalf.dispose();
      rightHalf.dispose();

      // Calculate overall confidence (average of both halves)
      const overallConfidence = (leftResult.confidence + rightResult.confidence) / 2;

      // Update tile with pip counts
      const updatedTile: DetectedTile = {
        ...tile,
        leftPips: leftResult.count,
        rightPips: rightResult.count,
        totalPips: leftResult.count + rightResult.count,
        confidence: Math.min(tile.confidence, overallConfidence), // Use minimum of detection and counting confidence
      };

      return updatedTile;
    } catch (error) {
      console.error('Pip counting failed:', error);
      
      // Return tile with zero pips and low confidence on error
      return {
        ...tile,
        leftPips: 0,
        rightPips: 0,
        totalPips: 0,
        confidence: 0.1,
      };
    }
  }

  /**
   * Count pips on multiple detected tiles
   */
  async countPipsOnTiles(imageData: ImageData, tiles: DetectedTile[]): Promise<DetectedTile[]> {
    const results: DetectedTile[] = [];

    for (const tile of tiles) {
      const updatedTile = await this.countPips(imageData, tile);
      results.push(updatedTile);
    }

    return results;
  }

  /**
   * Validate that pip counts are within acceptable range
   */
  validatePipCounts(tile: DetectedTile): boolean {
    return (
      tile.leftPips >= 0 &&
      tile.leftPips <= MAX_PIP_COUNT &&
      tile.rightPips >= 0 &&
      tile.rightPips <= MAX_PIP_COUNT &&
      tile.totalPips === tile.leftPips + tile.rightPips &&
      tile.confidence >= MIN_PIP_CONFIDENCE
    );
  }
}

// Export singleton instance
export const pipCounter = new PipCounter();
