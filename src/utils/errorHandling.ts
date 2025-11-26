/**
 * Error handling utilities for the Domino Score Counter application
 * Provides error logging, user-friendly messages, and recovery strategies
 */

/**
 * Error categories for the application
 */
export const ErrorCategory = {
  CAMERA: 'CAMERA',
  DETECTION: 'DETECTION',
  STORAGE: 'STORAGE',
  VALIDATION: 'VALIDATION',
  NETWORK: 'NETWORK',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
} as const;

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

/**
 * Structured error information
 */
export interface AppError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  technicalDetails?: string;
  timestamp: Date;
  recoverable: boolean;
  recoveryAction?: string;
}

/**
 * Error logging service
 */
class ErrorLogger {
  private logs: AppError[] = [];
  private maxLogs = 100;

  /**
   * Log an error to console and internal storage
   */
  log(error: AppError): void {
    // Log to console with appropriate level
    const logMessage = `[${error.category}] ${error.code}: ${error.message}`;
    
    switch (error.severity) {
      case ErrorSeverity.INFO:
        console.info(logMessage, error);
        break;
      case ErrorSeverity.WARNING:
        console.warn(logMessage, error);
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        console.error(logMessage, error);
        break;
    }

    // Store in memory (limited to maxLogs)
    this.logs.push(error);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Optional: Send to analytics service in production
    // this.sendToAnalytics(error);
  }

  /**
   * Get recent error logs
   */
  getRecentLogs(count: number = 10): AppError[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Optional: Send error to analytics service
   */
  // private sendToAnalytics(error: AppError): void {
  //   // Placeholder for analytics integration
  //   // Example: window.gtag?.('event', 'exception', { description: error.message });
  // }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

/**
 * User-friendly error message mapper
 */
export const errorMessages: Record<string, { userMessage: string; recoveryAction?: string }> = {
  // Camera errors
  'CAMERA_PERMISSION_DENIED': {
    userMessage: 'Camera access was denied. Please enable camera permissions in your browser settings.',
    recoveryAction: 'You can still upload an image file instead.',
  },
  'CAMERA_NOT_FOUND': {
    userMessage: 'No camera was found on your device.',
    recoveryAction: 'Please upload an image file instead.',
  },
  'CAMERA_IN_USE': {
    userMessage: 'The camera is currently being used by another application.',
    recoveryAction: 'Please close other apps using the camera and try again.',
  },
  'CAMERA_CAPTURE_FAILED': {
    userMessage: 'Failed to capture image from camera.',
    recoveryAction: 'Please try again or upload an image file.',
  },

  // Detection errors
  'DETECTION_NO_DOMINOES': {
    userMessage: 'No dominoes were detected in the image.',
    recoveryAction: 'Try taking a clearer photo with better lighting and all dominoes visible.',
  },
  'DETECTION_LOW_CONFIDENCE': {
    userMessage: 'The detection confidence is low. Results may not be accurate.',
    recoveryAction: 'Please review the results carefully and make manual corrections if needed.',
  },
  'DETECTION_PROCESSING_FAILED': {
    userMessage: 'Failed to process the image.',
    recoveryAction: 'Please try again with a different image.',
  },
  'DETECTION_POOR_IMAGE_QUALITY': {
    userMessage: 'The image quality is too poor for accurate detection.',
    recoveryAction: 'Try taking a photo with better lighting, less blur, and a clear view of the dominoes.',
  },
  'DETECTION_MODEL_LOAD_FAILED': {
    userMessage: 'Failed to load the detection model.',
    recoveryAction: 'Please check your internet connection and refresh the page.',
  },

  // Storage errors
  'STORAGE_QUOTA_EXCEEDED': {
    userMessage: 'Storage space is full.',
    recoveryAction: 'Please delete old games or export your data to free up space.',
  },
  'STORAGE_WRITE_FAILED': {
    userMessage: 'Failed to save data.',
    recoveryAction: 'Please try again. If the problem persists, check your browser storage settings.',
  },
  'STORAGE_READ_FAILED': {
    userMessage: 'Failed to load data.',
    recoveryAction: 'Please refresh the page and try again.',
  },
  'STORAGE_DELETE_FAILED': {
    userMessage: 'Failed to delete data.',
    recoveryAction: 'Please try again.',
  },
  'STORAGE_UNAVAILABLE': {
    userMessage: 'Storage is not available. You may be in private browsing mode.',
    recoveryAction: 'Please use a regular browser window for data persistence.',
  },

  // Validation errors
  'VALIDATION_INVALID_PLAYER_COUNT': {
    userMessage: 'Invalid number of players.',
    recoveryAction: 'Please enter a number between 2 and 10.',
  },
  'VALIDATION_INVALID_SCORE': {
    userMessage: 'Invalid score value.',
    recoveryAction: 'Score must be a positive number.',
  },
  'VALIDATION_MISSING_DATA': {
    userMessage: 'Required information is missing.',
    recoveryAction: 'Please fill in all required fields.',
  },
  'VALIDATION_INVALID_IMAGE': {
    userMessage: 'The selected file is not a valid image.',
    recoveryAction: 'Please select a JPG, PNG, or WebP image file.',
  },

  // Network errors
  'NETWORK_OFFLINE': {
    userMessage: 'You are currently offline.',
    recoveryAction: 'The app will continue to work with local data. Changes will sync when you reconnect.',
  },
  'NETWORK_REQUEST_FAILED': {
    userMessage: 'Network request failed.',
    recoveryAction: 'Please check your internet connection and try again.',
  },

  // Unknown errors
  'UNKNOWN_ERROR': {
    userMessage: 'An unexpected error occurred.',
    recoveryAction: 'Please try again. If the problem persists, refresh the page.',
  },
};

/**
 * Create an AppError from an error code
 */
export function createError(
  code: string,
  category: ErrorCategory,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  technicalDetails?: string
): AppError {
  const errorInfo = errorMessages[code] || errorMessages['UNKNOWN_ERROR'];
  
  return {
    category,
    severity,
    code,
    message: code,
    userMessage: errorInfo.userMessage,
    technicalDetails,
    timestamp: new Date(),
    recoverable: !!errorInfo.recoveryAction,
    recoveryAction: errorInfo.recoveryAction,
  };
}

/**
 * Handle and log an error, returning user-friendly information
 */
export function handleError(
  code: string,
  category: ErrorCategory,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  technicalDetails?: string
): AppError {
  const error = createError(code, category, severity, technicalDetails);
  errorLogger.log(error);
  return error;
}

/**
 * Map native JavaScript errors to AppErrors
 */
export function mapNativeError(error: Error, category: ErrorCategory = ErrorCategory.UNKNOWN): AppError {
  let code = 'UNKNOWN_ERROR';
  let severity: ErrorSeverity = ErrorSeverity.ERROR;

  // Map common error types
  if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
    code = 'CAMERA_PERMISSION_DENIED';
    category = ErrorCategory.CAMERA;
  } else if (error.name === 'NotFoundError') {
    code = 'CAMERA_NOT_FOUND';
    category = ErrorCategory.CAMERA;
  } else if (error.name === 'QuotaExceededError') {
    code = 'STORAGE_QUOTA_EXCEEDED';
    category = ErrorCategory.STORAGE;
    severity = ErrorSeverity.CRITICAL;
  } else if (error.message.includes('network') || error.message.includes('fetch')) {
    code = 'NETWORK_REQUEST_FAILED';
    category = ErrorCategory.NETWORK;
  }

  return handleError(code, category, severity, error.message);
}

/**
 * Retry strategy for recoverable errors
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get storage usage information
 */
export async function getStorageInfo(): Promise<{ used: number; quota: number; available: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    return {
      used,
      quota,
      available: quota - used,
    };
  }
  
  return { used: 0, quota: 0, available: 0 };
}
