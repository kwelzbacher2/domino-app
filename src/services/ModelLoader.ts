/**
 * ModelLoader - Handles TensorFlow.js model initialization and loading
 * Implements lazy loading with error handling and loading states
 * 
 * CURRENT MODEL: COCO-SSD (pre-trained on 80 common objects)
 * - Good for general object detection
 * - Not optimized for dominoes specifically
 * 
 * TODO (Post-MVP): Support custom domino detection models
 * To add custom model support:
 * 1. Train a custom model (YOLO, SSD, or custom CNN)
 * 2. Convert to TensorFlow.js format using tfjs-converter
 * 3. Host model files (model.json + weight shards) on CDN or local server
 * 4. Add loadCustomModel() method that loads from URL
 * 5. Add model versioning and A/B testing support
 * 
 * Example custom model loading:
 * ```typescript
 * const customModel = await tf.loadGraphModel('https://your-cdn.com/models/domino-v1/model.json');
 * ```
 * 
 * For pip counting, consider a two-stage approach:
 * - Stage 1: Domino detection (bounding boxes)
 * - Stage 2: Pip classification (0-12 for each half)
 */

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export type ModelLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface ModelLoaderStatus {
  state: ModelLoadingState;
  error?: string;
  progress?: number;
}

/**
 * Singleton service for managing TensorFlow.js model lifecycle
 */
class ModelLoader {
  private model: cocoSsd.ObjectDetection | null = null;
  private loadingState: ModelLoadingState = 'idle';
  private loadingError: string | null = null;
  private loadingPromise: Promise<cocoSsd.ObjectDetection> | null = null;

  /**
   * Initialize TensorFlow.js with WebGL backend for optimal performance
   */
  async initializeTensorFlow(): Promise<void> {
    try {
      // Set WebGL backend for hardware acceleration
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('TensorFlow.js initialized with backend:', tf.getBackend());
    } catch (error) {
      console.warn('WebGL backend failed, falling back to CPU:', error);
      // Fallback to CPU backend if WebGL fails
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('TensorFlow.js initialized with CPU backend');
    }
  }

  /**
   * Load the COCO-SSD object detection model
   * Uses singleton pattern to avoid loading multiple times
   */
  async loadModel(): Promise<cocoSsd.ObjectDetection> {
    // Return cached model if already loaded
    if (this.model && this.loadingState === 'loaded') {
      return this.model;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading
    this.loadingState = 'loading';
    this.loadingError = null;

    this.loadingPromise = (async () => {
      try {
        // Initialize TensorFlow.js backend first
        await this.initializeTensorFlow();

        // Load COCO-SSD model
        console.log('Loading COCO-SSD model...');
        const loadedModel = await cocoSsd.load({
          base: 'lite_mobilenet_v2', // Faster, lighter model for mobile
        });

        this.model = loadedModel;
        this.loadingState = 'loaded';
        console.log('COCO-SSD model loaded successfully');

        return loadedModel;
      } catch (error) {
        this.loadingState = 'error';
        this.loadingError = error instanceof Error ? error.message : 'Unknown error loading model';
        console.error('Failed to load model:', error);
        throw new Error(`Model loading failed: ${this.loadingError}`);
      } finally {
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Get the current loading status
   */
  getStatus(): ModelLoaderStatus {
    return {
      state: this.loadingState,
      error: this.loadingError || undefined,
    };
  }

  /**
   * Get the loaded model (throws if not loaded)
   */
  getModel(): cocoSsd.ObjectDetection {
    if (!this.model || this.loadingState !== 'loaded') {
      throw new Error('Model not loaded. Call loadModel() first.');
    }
    return this.model;
  }

  /**
   * Check if model is loaded and ready
   */
  isReady(): boolean {
    return this.loadingState === 'loaded' && this.model !== null;
  }

  /**
   * Unload the model and free memory
   */
  async unloadModel(): Promise<void> {
    if (this.model) {
      this.model = null;
      this.loadingState = 'idle';
      this.loadingError = null;
      // Dispose of TensorFlow.js tensors to free memory
      tf.disposeVariables();
      console.log('Model unloaded and memory freed');
    }
  }
}

// Export singleton instance
export const modelLoader = new ModelLoader();
