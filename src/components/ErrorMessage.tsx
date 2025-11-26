/**
 * ErrorMessage component for displaying user-friendly error messages
 */

import type { AppError } from '../utils/errorHandling';
import './ErrorMessage.css';

interface ErrorMessageProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorMessage({ error, onRetry, onDismiss }: ErrorMessageProps) {
  const getSeverityClass = () => {
    switch (error.severity) {
      case 'CRITICAL':
        return 'error-critical';
      case 'ERROR':
        return 'error-error';
      case 'WARNING':
        return 'error-warning';
      case 'INFO':
        return 'error-info';
      default:
        return 'error-error';
    }
  };

  const getIcon = () => {
    switch (error.severity) {
      case 'CRITICAL':
      case 'ERROR':
        return '⚠️';
      case 'WARNING':
        return '⚡';
      case 'INFO':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  return (
    <div className={`error-message ${getSeverityClass()}`}>
      <div className="error-icon">{getIcon()}</div>
      <div className="error-content">
        <h3 className="error-title">{error.userMessage}</h3>
        {error.recoveryAction && (
          <p className="error-recovery">{error.recoveryAction}</p>
        )}
      </div>
      <div className="error-actions">
        {onRetry && error.recoverable && (
          <button onClick={onRetry} className="btn-retry">
            Try Again
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="btn-dismiss">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
