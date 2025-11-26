/**
 * LoadingSpinner - Reusable loading indicator component
 * Provides consistent loading UI across the application
 */

import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  progress?: number; // 0-100 for progress bar
}

export function LoadingSpinner({ size = 'medium', message, progress }: LoadingSpinnerProps) {
  const sizeClass = `spinner-${size}`;

  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner ${sizeClass}`}>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
      {progress !== undefined && (
        <div className="loading-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}
