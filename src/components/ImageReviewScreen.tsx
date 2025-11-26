/**
 * ImageReviewScreen Component - Review captured/uploaded image before processing
 * Requirements: 1.4, 6.3
 * 
 * Provides:
 * - Display captured/uploaded image
 * - Process/retake options
 * - Loading indicator during processing
 * - Processing progress
 */

import { useState, memo } from 'react';
import type { ImageData } from '../models/types';
import './ImageReviewScreen.css';

interface ImageReviewScreenProps {
  image: ImageData;
  onProcess: (image: ImageData) => Promise<void>;
  onRetake: () => void;
  onCancel?: () => void;
}

export const ImageReviewScreen = memo(function ImageReviewScreen({
  image,
  onProcess,
  onRetake,
  onCancel,
}: ImageReviewScreenProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onProcess(image);
      
      clearInterval(progressInterval);
      setProgress(100);
    } catch (error) {
      const err = error as Error;
      setError(err.message);
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="image-review-screen">
      <div className="image-review-header">
        <h1>Review Image</h1>
        {onCancel && !isProcessing && (
          <button onClick={onCancel} className="btn-close" type="button" aria-label="Close">
            ×
          </button>
        )}
      </div>

      <div className="image-review-content">
        <div className="image-preview-container">
          <img
            src={image.dataUrl}
            alt="Captured dominoes"
            className="image-preview"
          />
          
          {isProcessing && (
            <div className="processing-overlay">
              <div className="processing-content">
                <div className="processing-spinner"></div>
                <h2>Processing Image...</h2>
                <p>Detecting dominoes and counting pips</p>
                
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                
                <div className="progress-text">{progress}%</div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <div>
              <strong>Processing Failed</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!isProcessing && (
          <div className="image-review-actions">
            <button
              onClick={onRetake}
              className="btn-secondary btn-large"
              type="button"
            >
              <span className="btn-icon">📷</span>
              Retake Photo
            </button>
            
            <button
              onClick={handleProcess}
              className="btn-primary btn-large"
              type="button"
            >
              <span className="btn-icon">🔍</span>
              Process Image
            </button>
          </div>
        )}

        {!isProcessing && (
          <div className="image-info">
            <div className="info-item">
              <span className="info-label">Size:</span>
              <span className="info-value">{image.width} × {image.height}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Captured:</span>
              <span className="info-value">
                {new Date(image.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
