/**
 * RoboflowDetector - Uses Roboflow API for domino pip detection
 * This replaces the COCO-SSD approach with a specialized domino model
 */

import type { ImageData, DetectedTile, BoundingBox, DetectionResult } from '../models/types';
import { imageAnnotator } from './ImageAnnotator';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY;
const MODEL_VERSION = import.meta.env.VITE_ROBOFLOW_MODEL_VERSION || '2';
const MODEL_NAME = import.meta.env.VITE_ROBOFLOW_MODEL_NAME || 'my-domino-detector-wgrei';

interface RoboflowPrediction {
  x: number; // center x
  y: number; // center y
  width: number;
  height: number;
  confidence: number;
  class: string; // "0", "1", "2", etc.
  class_id: number;
}

interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  image: {
    width: number;
    height: number;
  };
}

/**
 * Service for detecting domino pips using Roboflow API
 */
export class RoboflowDetector {
  // Roboflow Serverless API endpoint format: https://serverless.roboflow.com/model/version
  private readonly apiUrl = `https://serverless.roboflow.com/${MODEL_NAME}/${MODEL_VERSION}`;

  /**
   * Call Roboflow API to detect pips
   */
  private async callRoboflowAPI(imageData: ImageData): Promise<RoboflowResponse> {
    if (!API_KEY) {
      throw new Error('Roboflow API key not configured. Please add VITE_ROBOFLOW_API_KEY to your .env file.');
    }

    try {
      // Extract base64 data without the data URL prefix
      const base64Data = imageData.dataUrl.split(',')[1];

      // Call Roboflow Serverless API
      // Format: POST to https://serverless.roboflow.com/project/version?api_key=KEY
      const url = `${this.apiUrl}?api_key=${API_KEY}`;
      
      console.log('Calling Roboflow Serverless API:', url.replace(API_KEY, 'HIDDEN'));

      const response = await fetch(url, {
        method: 'POST',
        body: base64Data,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Roboflow API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(
        `Failed to call Roboflow API: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Detect dominoes and count pips using Roboflow API
   */
  async detectAndAnnotate(imageData: ImageData): Promise<DetectionResult> {
    try {
      console.log('Calling Roboflow API for pip detection...');

      // Call Roboflow API
      const response = await this.callRoboflowAPI(imageData);

      console.log(`Roboflow detected ${response.predictions.length} domino halves`);
      console.log('Raw predictions:', response.predictions);

      // Filter by confidence threshold (85% or higher)
      const CONFIDENCE_THRESHOLD = 0.85;
      const highConfidencePredictions = response.predictions.filter(
        pred => pred.confidence >= CONFIDENCE_THRESHOLD
      );

      console.log(`Filtered to ${highConfidencePredictions.length} high-confidence detections (>=${CONFIDENCE_THRESHOLD * 100}%)`);

      // Convert each detection to a tile (each detection is one half of a domino)
      const tiles: DetectedTile[] = highConfidencePredictions.map(pred => {
        // Parse pip count from class name (e.g., "pip-11" -> 11)
        const pips = parseInt(pred.class.replace('pip-', ''));
        
        const boundingBox: BoundingBox = {
          x: pred.x - pred.width / 2,
          y: pred.y - pred.height / 2,
          width: pred.width,
          height: pred.height,
          rotation: 0,
        };

        return {
          id: uuidv4(),
          boundingBox,
          leftPips: pips,
          rightPips: 0, // Each detection is one half
          totalPips: pips,
          confidence: pred.confidence,
        };
      });

      console.log(`Converted to ${tiles.length} tiles`);
      console.log('Detected tiles:', tiles);

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

      return {
        tiles,
        totalScore,
        confidence: overallConfidence,
        processedImage,
      };
    } catch (error) {
      throw new Error(
        `Roboflow detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const roboflowDetector = new RoboflowDetector();
