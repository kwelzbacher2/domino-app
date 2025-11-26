/**
 * CameraScreen Component - Full camera interface with viewfinder
 * Requirements: 1.1, 1.3, 12.3
 * 
 * Provides:
 * - Camera view with video preview
 * - Capture button with visual feedback
 * - File upload button as alternative
 * - Permission request UI with clear messaging
 * - Responsive for mobile and desktop
 */

import { useEffect, useRef, useState, memo } from 'react';
import { CameraModule } from '../services/CameraModule';
import type { ImageData } from '../models/types';
import './CameraScreen.css';

interface CameraScreenProps {
  onCapture: (image: ImageData) => void;
  onCancel?: () => void;
}

export const CameraScreen = memo(function CameraScreen({ onCapture, onCancel }: CameraScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraModuleRef = useRef<CameraModule>(new CameraModule());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if camera is supported
    setCameraSupported(CameraModule.isCameraSupported());

    // Auto-start camera if supported
    if (CameraModule.isCameraSupported()) {
      startCamera();
    }

    // Cleanup on unmount
    return () => {
      cameraModuleRef.current.cleanup();
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    setPermissionDenied(false);
    
    try {
      const stream = await cameraModuleRef.current.getPreviewStream();
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      const err = error as Error;
      
      // Check if permission was denied
      if (err.message.includes('Permission denied') || err.message.includes('NotAllowedError')) {
        setPermissionDenied(true);
        setError('Camera access was denied. Please enable camera permissions in your browser settings or upload an image instead.');
      } else {
        setError(err.message);
      }
      
      setIsStreaming(false);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !isStreaming) {
      setError('Camera is not active. Please start the camera first.');
      return;
    }

    setIsCapturing(true);
    setError(null);
    
    try {
      const imageData = await cameraModuleRef.current.captureImage(videoRef.current);
      onCapture(imageData);
    } catch (error) {
      const err = error as Error;
      setError(err.message);
      setIsCapturing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    
    try {
      const imageData = await cameraModuleRef.current.uploadImage(file);
      onCapture(imageData);
    } catch (error) {
      const err = error as Error;
      setError(err.message);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="camera-screen">
      <div className="camera-screen-header">
        <h1>Capture Dominoes</h1>
        {onCancel && (
          <button onClick={onCancel} className="btn-close" type="button" aria-label="Close">
            ×
          </button>
        )}
      </div>

      <div className="camera-screen-content">
        {!cameraSupported ? (
          // No camera support - show upload only
          <div className="camera-message">
            <div className="message-icon">📷</div>
            <h2>Camera Not Available</h2>
            <p>Your device doesn't support camera access. Please upload an image instead.</p>
            <button
              onClick={triggerFileUpload}
              className="btn-primary btn-large"
              type="button"
            >
              Upload Image
            </button>
          </div>
        ) : permissionDenied ? (
          // Permission denied - show instructions
          <div className="camera-message">
            <div className="message-icon">🔒</div>
            <h2>Camera Permission Required</h2>
            <p>To use the camera, please enable camera permissions in your browser settings.</p>
            <div className="permission-instructions">
              <h3>How to enable camera access:</h3>
              <ol>
                <li>Click the camera icon in your browser's address bar</li>
                <li>Select "Allow" for camera access</li>
                <li>Refresh the page if needed</li>
              </ol>
            </div>
            <div className="button-group">
              <button
                onClick={startCamera}
                className="btn-primary"
                type="button"
              >
                Try Again
              </button>
              <button
                onClick={triggerFileUpload}
                className="btn-secondary"
                type="button"
              >
                Upload Image Instead
              </button>
            </div>
          </div>
        ) : (
          // Camera interface
          <div className="camera-container">
            <div className="camera-viewfinder">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-preview"
              />
              
              {!isStreaming && !error && (
                <div className="camera-loading">
                  <div className="spinner"></div>
                  <p>Starting camera...</p>
                </div>
              )}

              {isStreaming && (
                <div className="camera-overlay">
                  <div className="camera-guide">
                    <p>Position dominoes within the frame</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="camera-controls">
              {!isStreaming ? (
                <button
                  onClick={startCamera}
                  className="btn-primary btn-large"
                  type="button"
                >
                  Start Camera
                </button>
              ) : (
                <button
                  onClick={handleCapture}
                  disabled={isCapturing}
                  className="btn-capture"
                  type="button"
                  aria-label="Capture photo"
                >
                  <span className="capture-ring">
                    <span className="capture-button"></span>
                  </span>
                  {isCapturing && <span className="capture-feedback"></span>}
                </button>
              )}
              
              <button
                onClick={triggerFileUpload}
                className="btn-upload"
                type="button"
                title="Upload from device"
              >
                <span className="upload-icon">📁</span>
                Upload
              </button>
            </div>

            <div className="camera-tips">
              <p>💡 <strong>Tips:</strong> Ensure good lighting and all dominoes are visible</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        aria-label="Upload image file"
      />
    </div>
  );
});
