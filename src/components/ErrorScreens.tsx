/**
 * Specific error screens for common error scenarios
 */

import { createError, ErrorCategory, ErrorSeverity } from '../utils/errorHandling';
import { ErrorMessage } from './ErrorMessage';
import './ErrorScreens.css';

interface ErrorScreenProps {
  onRetry?: () => void;
  onDismiss?: () => void;
  onUploadFile?: () => void;
  onCleanupStorage?: () => void;
}

/**
 * Screen shown when no dominoes are detected in an image
 */
export function NoDominoesDetectedScreen({ onRetry, onDismiss }: ErrorScreenProps) {
  const error = createError(
    'DETECTION_NO_DOMINOES',
    ErrorCategory.DETECTION,
    ErrorSeverity.WARNING
  );

  return (
    <div className="error-screen">
      <ErrorMessage error={error} onRetry={onRetry} onDismiss={onDismiss} />
      <div className="error-tips">
        <h4>Tips for better detection:</h4>
        <ul>
          <li>Ensure all dominoes are visible in the frame</li>
          <li>Use good lighting without harsh shadows</li>
          <li>Place dominoes on a contrasting background</li>
          <li>Avoid overlapping tiles when possible</li>
          <li>Hold the camera steady to avoid blur</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Screen shown when image quality is too poor for processing
 */
export function PoorImageQualityScreen({ onRetry, onDismiss }: ErrorScreenProps) {
  const error = createError(
    'DETECTION_POOR_IMAGE_QUALITY',
    ErrorCategory.DETECTION,
    ErrorSeverity.WARNING
  );

  return (
    <div className="error-screen">
      <ErrorMessage error={error} onRetry={onRetry} onDismiss={onDismiss} />
      <div className="error-tips">
        <h4>How to improve image quality:</h4>
        <ul>
          <li>Clean your camera lens</li>
          <li>Ensure adequate lighting</li>
          <li>Hold the camera steady or use a surface</li>
          <li>Move closer to the dominoes</li>
          <li>Avoid backlighting (light behind the dominoes)</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Screen shown when camera permissions are denied
 */
export function CameraPermissionDeniedScreen({ onUploadFile, onDismiss }: ErrorScreenProps) {
  const error = createError(
    'CAMERA_PERMISSION_DENIED',
    ErrorCategory.CAMERA,
    ErrorSeverity.WARNING
  );

  return (
    <div className="error-screen">
      <ErrorMessage error={error} onDismiss={onDismiss} />
      <div className="error-tips">
        <h4>To enable camera access:</h4>
        <ol>
          <li>Click the camera icon in your browser's address bar</li>
          <li>Select "Allow" for camera permissions</li>
          <li>Refresh the page</li>
        </ol>
        <p className="alternative-text">Or use the alternative option:</p>
        {onUploadFile && (
          <button onClick={onUploadFile} className="btn-upload-alternative">
            📁 Upload Image File Instead
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Screen shown when storage quota is exceeded
 */
export function StorageQuotaExceededScreen({ onCleanupStorage, onDismiss }: ErrorScreenProps) {
  const error = createError(
    'STORAGE_QUOTA_EXCEEDED',
    ErrorCategory.STORAGE,
    ErrorSeverity.CRITICAL
  );

  return (
    <div className="error-screen">
      <ErrorMessage error={error} onDismiss={onDismiss} />
      <div className="error-tips">
        <h4>Free up storage space:</h4>
        <ul>
          <li>Delete old games you no longer need</li>
          <li>Export your game data as a backup</li>
          <li>Clear browser cache and data</li>
        </ul>
        {onCleanupStorage && (
          <button onClick={onCleanupStorage} className="btn-cleanup">
            🗑️ Manage Storage
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Generic error screen for unexpected errors
 */
export function GenericErrorScreen({ onRetry, onDismiss }: ErrorScreenProps) {
  const error = createError(
    'UNKNOWN_ERROR',
    ErrorCategory.UNKNOWN,
    ErrorSeverity.ERROR
  );

  return (
    <div className="error-screen">
      <ErrorMessage error={error} onRetry={onRetry} onDismiss={onDismiss} />
      <div className="error-tips">
        <h4>What you can try:</h4>
        <ul>
          <li>Refresh the page</li>
          <li>Clear your browser cache</li>
          <li>Try a different browser</li>
          <li>Check your internet connection</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Inline error banner for non-blocking errors
 */
export function ErrorBanner({ 
  message, 
  onDismiss 
}: { 
  message: string; 
  onDismiss?: () => void;
}) {
  return (
    <div className="error-banner">
      <span className="error-banner-icon">⚠️</span>
      <span className="error-banner-message">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="error-banner-close">
          ✕
        </button>
      )}
    </div>
  );
}
