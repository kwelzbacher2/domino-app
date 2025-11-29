/**
 * CustomModelDetector - Loads and uses custom-trained TensorFlow.js models
 * Supports models trained on Roboflow, YOLOv5, or other platforms
 * 
 * To use your custom model:
 * 1. Train model on Roboflow (or locally)
 * 2. Export to TensorFlow.js format
 * 3. Place model files in public/models/custom-domino/
 *    - model.json
 *    - group1-shard1of1.bin (or similar weight files)
 * 4. Update .env: VITE_USE_CUSTOM_MODEL=true
 */

import * as tf from '@tensorflow/tfjs';
import type { ImageData, DetectedTile, BoundingBox, DetectionResult } from '../models/types';
import { imageAnnotator } from './ImageAnnotator';
import { v4 as uuidv4 } from 'uuid';

const MODEL_PATH = '/models/custom-domino/model.json';

interface CustomDetection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number;
}

/**
 * Service for using custom-trained domino detection models
 */
export class CustomModelDetector {
  private model: tf.GraphModel | null = null;
  private isLoading = false;

  /**
   * Load the custom model from local files
   */
  async loadModel(): Promise<tf.GraphModel> {
    if (this.model) {
      return this.model;
    }

    if (this.isLoading) {
      // Wait for existing load to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.model) return this.model;
    }

    this.isLoading = true;

    try {
      console.log('Loading custom domino detection model from:', MODEL_PATH);
      
      // Load the model
      this.model = await tf.loadGraphModel(MODEL_PATH);
      
      console.log('Custom model loaded successfully');
      console.log('Model inputs:', this.model.inputs);
      console.log('Model outputs:', this.model.outputs);
      
      return this.model;
    } catch (error) {
      console.error('Failed to load custom model:', error);
      throw new Error(
        `Custom model loading failed. Make sure model files are in public/models/custom-domino/. Error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Parse model output to extract detections
   * This will need to be adjusted based on your specific model's output format
   */
  private parseModelOutput(
    outputTensor: tf.Tensor | tf.Tensor[],
    _imageWidth: number,
    _imageHeight: number
  ): CustomDetection[] {
    // TODO: Adjust this based on your model's output format
    // Common formats:
    // - YOLO: [batch, num_detections, 5 + num_classes] where 5 = [x, y, w, h, confidence]
    // - SSD: Multiple tensors for boxes, scores, classes
    // - Roboflow: Usually similar to YOLO format

    const detections: CustomDetection[] = [];

    // Example for YOLO-style output (adjust as needed)
    if (Array.isArray(outputTensor)) {
      // Multiple output tensors (e.g., SSD-style)
      console.warn('Multiple output tensors detected. You may need to adjust parseModelOutput()');
      // TODO: Parse multiple tensors
    } else {
      // Single output tensor (e.g., YOLO-style)
      const data = outputTensor.dataSync();
      const shape = outputTensor.shape;
      
      console.log('Model output shape:', shape);
      console.log('First 10 values:', Array.from(data.slice(0, 10)));
      
      // TODO: Parse based on your model's specific format
      // This is a placeholder - you'll need to adjust based on your model
    }

    return detections;
  }

  /**
   * Convert custom detection to DetectedTile format
   */
  private convertToDetectedTile(
    detection: CustomDetection,
    imageWidth: number,
    imageHeight: number
  ): DetectedTile {
    const [x, y, width, height] = detection.bbox;

    const boundingBox: BoundingBox = {
      x: x * imageWidth,
      y: y * imageHeight,
      width: width * imageWidth,
      height: height * imageHeight,
      rotation: 0,
    };

    // Parse pip counts from class name if available
    // e.g., "domino-3-5" or just "domino"
    let leftPips = 0;
    let rightPips = 0;
    
    const pipMatch = detection.class.match(/(\d+)-(\d+)/);
    if (pipMatch) {
      leftPips = parseInt(pipMatch[1]);
      rightPips = parseInt(pipMatch[2]);
    }

    return {
      id: uuidv4(),
      boundingBox,
      leftPips,
      rightPips,
      totalPips: leftPips + rightPips,
      confidence: detection.score,
    };
  }

  /**
   * Detect dominoes using the custom model
   */
  async detectAndAnnotate(imageData: ImageData): Promise<DetectionResult> {
    try {
      // Load model
      const model = await this.loadModel();

      // Prepare image tensor
      const img = new Image();
      img.src = imageData.dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Convert to tensor
      const tensor = tf.browser.fromPixels(img);
      const expanded = tensor.expandDims(0); // Add batch dimension

      console.log('Input tensor shape:', expanded.shape);

      // Run inference
      const output = model.predict(expanded) as tf.Tensor | tf.Tensor[];

      // Parse detections
      const detections = this.parseModelOutput(output, imageData.width, imageData.height);

      // Convert to tiles
      const tiles = detections.map(d => 
        this.convertToDetectedTile(d, imageData.width, imageData.height)
      );

      // Clean up tensors
      tensor.dispose();
      expanded.dispose();
      if (Array.isArray(output)) {
        output.forEach(t => t.dispose());
      } else {
        output.dispose();
      }

      // Calculate total score
      const totalScore = tiles.reduce((sum, tile) => sum + tile.totalPips, 0);

      // Calculate overall confidence
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

      console.log(`Custom model detected ${tiles.length} dominoes with total score ${totalScore}`);

      return {
        tiles,
        totalScore,
        confidence: overallConfidence,
        processedImage,
      };
    } catch (error) {
      throw new Error(
        `Custom model detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const customModelDetector = new CustomModelDetector();
