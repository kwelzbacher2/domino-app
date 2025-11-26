/**
 * CameraModule - Handles camera access, image capture, and file upload
 * Requirements: 1.1, 1.2, 1.3, 12.3
 */

import type { ImageData } from '../models/types';

export class CameraModule {
  private stream: MediaStream | null = null;

  /**
   * Request camera permissions from the user
   * @returns Promise<boolean> - true if permission granted, false otherwise
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Request video-only stream to check permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera on mobile
        audio: false,
      });
      
      // Stop the stream immediately - we just needed to check permissions
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Camera permission denied or unavailable:', error);
      return false;
    }
  }

  /**
   * Get a preview stream from the camera
   * @returns Promise<MediaStream> - video stream for preview
   * @throws Error if camera access fails
   */
  async getPreviewStream(): Promise<MediaStream> {
    try {
      // Stop any existing stream
      this.stopStream();

      // Request camera access with environment-facing camera preference
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      return this.stream;
    } catch (error) {
      const err = error as Error;
      
      // Provide specific error messages based on error type
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Camera permission denied. Please enable camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No camera found on this device. Please use the file upload option.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        throw new Error('Camera is already in use by another application.');
      } else {
        throw new Error(`Failed to access camera: ${err.message}`);
      }
    }
  }

  /**
   * Capture an image from the current video stream
   * @param videoElement - HTML video element displaying the camera stream
   * @returns Promise<ImageData> - captured image data
   * @throws Error if no stream is active or capture fails
   */
  async captureImage(videoElement: HTMLVideoElement): Promise<ImageData> {
    if (!this.stream) {
      throw new Error('No active camera stream. Call getPreviewStream() first.');
    }

    try {
      // Create a canvas to capture the current video frame
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context for image capture.');
      }

      // Draw the current video frame to the canvas
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert canvas to base64 data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      return {
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        timestamp: new Date(),
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to capture image: ${err.message}`);
    }
  }

  /**
   * Upload an image from a file input
   * @param file - File object from input element
   * @returns Promise<ImageData> - uploaded image data
   * @throws Error if file reading fails or file is not an image
   */
  async uploadImage(file: File): Promise<ImageData> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Selected file is not an image. Please choose a valid image file.');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Image file is too large. Please choose an image smaller than 10MB.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        
        // Create an image element to get dimensions
        const img = new Image();
        
        img.onload = () => {
          resolve({
            dataUrl,
            width: img.width,
            height: img.height,
            timestamp: new Date(),
          });
        };

        img.onerror = () => {
          reject(new Error('Failed to load image. The file may be corrupted.'));
        };

        img.src = dataUrl;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read image file.'));
      };

      // Read the file as a data URL
      reader.readAsDataURL(file);
    });
  }

  /**
   * Stop the current camera stream and release resources
   */
  stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Check if camera is supported in the current browser
   * @returns boolean - true if camera API is available
   */
  static isCameraSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Cleanup resources when module is no longer needed
   */
  cleanup(): void {
    this.stopStream();
  }
}
