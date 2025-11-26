/**
 * CameraCapture Component - UI for camera preview and image capture
 * Requirements: 1.1, 1.3, 12.3
 */

import { useEffect, useRef, useState } from 'react';
import { CameraModule } from '../services/CameraModule';
import type { ImageData } from '../models/types';

interface CameraCaptureProps {
  onCapture: (image: ImageData) => void;
  onError: (error: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraModuleRef = useRef<CameraModule>(new CameraModule());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);

  useEffect(() => {
    // Check if camera is supported
    setCameraSupported(CameraModule.isCameraSupported());

    // Cleanup on unmount
    return () => {
      cameraModuleRef.current.cleanup();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await cameraModuleRef.current.getPreviewStream();
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      const err = error as Error;
      onError(err.message);
      setIsStreaming(false);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !isStreaming) {
      onError('Camera is not active. Please start the camera first.');
      return;
    }

    setIsCapturing(true);
    
    try {
      const imageData = await cameraModuleRef.current.captureImage(videoRef.current);
      onCapture(imageData);
    } catch (error) {
      const err = error as Error;
      onError(err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageData = await cameraModuleRef.current.uploadImage(file);
      onCapture(imageData);
    } catch (error) {
      const err = error as Error;
      onError(err.message);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="camera-capture">
      {cameraSupported ? (
        <div className="camera-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-preview"
          />
          
          <div className="camera-controls">
            {!isStreaming ? (
              <button
                onClick={startCamera}
                className="btn-primary"
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
              >
                {isCapturing ? 'Capturing...' : 'Capture Photo'}
              </button>
            )}
            
            <button
              onClick={triggerFileUpload}
              className="btn-secondary"
              type="button"
            >
              Upload Image
            </button>
          </div>
        </div>
      ) : (
        <div className="no-camera">
          <p>Camera is not supported on this device.</p>
          <button
            onClick={triggerFileUpload}
            className="btn-primary"
            type="button"
          >
            Upload Image
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};
