/**
 * RoboflowDetector - Uses Roboflow API for domino pip detection
 * This replaces the COCO-SSD approach with a specialized domino model
 */

import type { ImageData, DetectedTile, BoundingBox, DetectionResult } from '../models/types';
import { imageAnnotator } from './ImageAnnotator';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY;
const MODEL_VERSION = import.meta.env.VITE_ROBOFLOW_MODEL_VERSION || '1';
const MODEL_NAME = import.meta.env.VITE_ROBOFLOW_MODEL_NAME || 'domino-point-counter-ubn6u';
const WORKSPACE = import.meta.env.VITE_ROBOFLOW_WORKSPACE || 'ali-amr-656xv';

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
  // Roboflow Hosted API endpoint format: https://detect.roboflow.com/workspace/model/version
  private readonly apiUrl = `https://detect.roboflow.com/${MODEL_NAME}/${MODEL_VERSION}`;

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

      // Call Roboflow Hosted API
      // Format: POST to https://detect.roboflow.com/project/version?api_key=KEY
      const url = `${this.apiUrl}?api_key=${API_KEY}`;
      
      console.log('Calling Roboflow API:', url.replace(API_KEY, 'HIDDEN'));

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
   * Group pip detections into domino tiles
   * Pips that are close together belong to the same domino
   */
  private groupPipsIntoDominoes(predictions: RoboflowPrediction[]): DetectedTile[] {
    if (predictions.length === 0) {
      return [];
    }

    // Sort predictions by x coordinate (left to right)
    const sorted = [...predictions].sort((a, b) => a.x - b.x);

    const tiles: DetectedTile[] = [];
    const used = new Set<number>();

    // Group pips into pairs (each domino has 2 halves)
    for (let i = 0; i < sorted.length; i++) {
      if (used.has(i)) continue;

      const pip1 = sorted[i];
      let pip2: RoboflowPrediction | null = null;
      let pip2Index = -1;

      // Find the closest pip to the right
      const maxDistance = pip1.width * 3; // Pips on same domino should be within 3x width
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(j)) continue;

        const candidate = sorted[j];
        const distance = Math.sqrt(
          Math.pow(candidate.x - pip1.x, 2) + Math.pow(candidate.y - pip1.y, 2)
        );

        if (distance < maxDistance) {
          pip2 = candidate;
          pip2Index = j;
          break;
        }
      }

      // Create a domino tile
      if (pip2) {
        used.add(i);
        used.add(pip2Index);

        // Calculate bounding box that encompasses both pips
        const minX = Math.min(pip1.x - pip1.width / 2, pip2.x - pip2.width / 2);
        const maxX = Math.max(pip1.x + pip1.width / 2, pip2.x + pip2.width / 2);
        const minY = Math.min(pip1.y - pip1.height / 2, pip2.y - pip2.height / 2);
        const maxY = Math.max(pip1.y + pip1.height / 2, pip2.y + pip2.height / 2);

        const boundingBox: BoundingBox = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          rotation: 0,
        };

        const leftPips = parseInt(pip1.class);
        const rightPips = parseInt(pip2.class);

        tiles.push({
          id: uuidv4(),
          boundingBox,
          leftPips,
          rightPips,
          totalPips: leftPips + rightPips,
          confidence: (pip1.confidence + pip2.confidence) / 2,
        });
      } else {
        // Single pip (might be a domino with one half visible)
        used.add(i);

        const boundingBox: BoundingBox = {
          x: pip1.x - pip1.width / 2,
          y: pip1.y - pip1.height / 2,
          width: pip1.width,
          height: pip1.height,
          rotation: 0,
        };

        const pips = parseInt(pip1.class);

        tiles.push({
          id: uuidv4(),
          boundingBox,
          leftPips: pips,
          rightPips: 0,
          totalPips: pips,
          confidence: pip1.confidence,
        });
      }
    }

    return tiles;
  }

  /**
   * Detect dominoes and count pips using Roboflow API
   */
  async detectAndAnnotate(imageData: ImageData): Promise<DetectionResult> {
    try {
      console.log('Calling Roboflow API for pip detection...');

      // Call Roboflow API
      const response = await this.callRoboflowAPI(imageData);

      console.log(`Roboflow detected ${response.predictions.length} pip values`);
      console.log('Raw predictions:', response.predictions);

      // Group pips into dominoes
      const tiles = this.groupPipsIntoDominoes(response.predictions);

      console.log(`Grouped into ${tiles.length} domino tiles`);
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
