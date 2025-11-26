/**
 * ImagePreprocessor - Handles image preprocessing for detection
 * Includes resizing, normalization, and conversion to tensors
 */

import * as tf from '@tensorflow/tfjs';
import type { ImageData } from '../models/types';
import { getOptimalImageSettings } from '../utils/performance';

export interface ProcessedImage {
  tensor: tf.Tensor3D;
  originalWidth: number;
  originalHeight: number;
  scaleFactor: number;
}

/**
 * Maximum dimension for image processing (optimization for speed)
 * Dynamically adjusted based on device capabilities
 */
const getMaxImageDimension = () => getOptimalImageSettings().maxDimension;

/**
 * Image preprocessing utilities
 */
export class ImagePreprocessor {
  /**
   * Load image from data URL and create an HTMLImageElement
   */
  private async loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  }

  /**
   * Calculate optimal dimensions for resizing while maintaining aspect ratio
   * Uses device-specific max dimension for better performance on low-end devices
   */
  private calculateResizeDimensions(
    width: number,
    height: number,
    maxDimension?: number
  ): { width: number; height: number; scaleFactor: number } {
    const maxDim = Math.max(width, height);
    const targetMaxDimension = maxDimension || getMaxImageDimension();

    if (maxDim <= targetMaxDimension) {
      return { width, height, scaleFactor: 1 };
    }

    const scaleFactor = targetMaxDimension / maxDim;
    return {
      width: Math.round(width * scaleFactor),
      height: Math.round(height * scaleFactor),
      scaleFactor,
    };
  }

  /**
   * Resize image using canvas
   */
  private resizeImage(
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw resized image
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    return canvas;
  }

  /**
   * Apply brightness and contrast adjustments for various lighting conditions
   */
  private adjustLighting(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return canvas;
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate average brightness
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalBrightness += (r + g + b) / 3;
    }
    const avgBrightness = totalBrightness / (data.length / 4);

    // Apply adjustment if image is too dark or too bright
    const targetBrightness = 128;
    const brightnessFactor = targetBrightness / avgBrightness;

    // Only adjust if significantly off target (avoid over-processing)
    if (brightnessFactor < 0.7 || brightnessFactor > 1.3) {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * brightnessFactor); // R
        data[i + 1] = Math.min(255, data[i + 1] * brightnessFactor); // G
        data[i + 2] = Math.min(255, data[i + 2] * brightnessFactor); // B
      }
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas;
  }

  /**
   * Convert canvas to TensorFlow.js tensor
   */
  private canvasToTensor(canvas: HTMLCanvasElement): tf.Tensor3D {
    // Convert canvas to tensor (normalized to 0-1 range)
    return tf.tidy(() => {
      const tensor = tf.browser.fromPixels(canvas);
      // Ensure tensor is 3D (height, width, channels)
      return tensor as tf.Tensor3D;
    });
  }

  /**
   * Preprocess image for detection
   * - Resize to optimal dimensions
   * - Adjust lighting conditions
   * - Convert to tensor
   */
  async preprocessImage(imageData: ImageData): Promise<ProcessedImage> {
    try {
      // Load image element
      const img = await this.loadImageElement(imageData.dataUrl);

      // Calculate resize dimensions
      const { width: targetWidth, height: targetHeight, scaleFactor } =
        this.calculateResizeDimensions(img.width, img.height);

      // Resize image
      let canvas = this.resizeImage(img, targetWidth, targetHeight);

      // Apply lighting adjustments
      canvas = this.adjustLighting(canvas);

      // Convert to tensor
      const tensor = this.canvasToTensor(canvas);

      return {
        tensor,
        originalWidth: img.width,
        originalHeight: img.height,
        scaleFactor,
      };
    } catch (error) {
      throw new Error(
        `Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert data URL to tensor directly (for simple cases)
   */
  async dataUrlToTensor(dataUrl: string): Promise<tf.Tensor3D> {
    const img = await this.loadImageElement(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0);
    return this.canvasToTensor(canvas);
  }

  /**
   * Get canvas from data URL (useful for annotation)
   */
  async getCanvasFromDataUrl(dataUrl: string): Promise<HTMLCanvasElement> {
    const img = await this.loadImageElement(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0);
    return canvas;
  }
}

// Export singleton instance
export const imagePreprocessor = new ImagePreprocessor();
