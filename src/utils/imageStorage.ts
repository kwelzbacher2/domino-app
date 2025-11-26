/**
 * Image Storage Utility - Handles image compression and storage
 * Requirements: 1.2, 10.5
 */

import type { ImageData } from '../models/types';

/**
 * Compression options for image storage
 */
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Default compression settings optimized for domino images
 */
const DEFAULT_COMPRESSION: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'image/jpeg',
};

/**
 * Compress an image to reduce storage size while maintaining quality
 * @param imageData - Original image data
 * @param options - Compression options
 * @returns Promise<ImageData> - Compressed image data
 */
export async function compressImage(
  imageData: ImageData,
  options: CompressionOptions = {}
): Promise<ImageData> {
  const opts = { ...DEFAULT_COMPRESSION, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = imageData;
        const aspectRatio = width / height;

        if (opts.maxWidth && width > opts.maxWidth) {
          width = opts.maxWidth;
          height = width / aspectRatio;
        }

        if (opts.maxHeight && height > opts.maxHeight) {
          height = opts.maxHeight;
          width = height * aspectRatio;
        }

        // Create canvas for compression
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context for compression'));
          return;
        }

        // Draw the image at the new size
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to compressed data URL
        const compressedDataUrl = canvas.toDataURL(opts.format, opts.quality);

        resolve({
          dataUrl: compressedDataUrl,
          width: canvas.width,
          height: canvas.height,
          timestamp: imageData.timestamp,
        });
      } catch (error) {
        reject(new Error(`Image compression failed: ${(error as Error).message}`));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    img.src = imageData.dataUrl;
  });
}

/**
 * Convert a data URL to a Blob for more efficient storage
 * @param dataUrl - Base64 data URL
 * @returns Blob - Binary blob representation
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Convert a Blob to a data URL
 * @param blob - Binary blob
 * @returns Promise<string> - Base64 data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error('Failed to convert blob to data URL'));
    };

    reader.readAsDataURL(blob);
  });
}

/**
 * Calculate the size of a data URL in bytes
 * @param dataUrl - Base64 data URL
 * @returns number - Size in bytes
 */
export function getDataUrlSize(dataUrl: string): number {
  // Remove the data URL prefix to get just the base64 string
  const base64 = dataUrl.split(',')[1] || '';
  
  // Calculate size: base64 is ~4/3 the size of the original binary
  // Account for padding characters
  const padding = (base64.match(/=/g) || []).length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Get a human-readable size string
 * @param bytes - Size in bytes
 * @returns string - Formatted size (e.g., "1.5 MB")
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Estimate storage savings from compression
 * @param originalDataUrl - Original image data URL
 * @param compressedDataUrl - Compressed image data URL
 * @returns object - Size comparison and savings percentage
 */
export function calculateCompressionSavings(
  originalDataUrl: string,
  compressedDataUrl: string
): {
  originalSize: number;
  compressedSize: number;
  savings: number;
  savingsPercent: number;
} {
  const originalSize = getDataUrlSize(originalDataUrl);
  const compressedSize = getDataUrlSize(compressedDataUrl);
  const savings = originalSize - compressedSize;
  const savingsPercent = (savings / originalSize) * 100;

  return {
    originalSize,
    compressedSize,
    savings,
    savingsPercent,
  };
}
