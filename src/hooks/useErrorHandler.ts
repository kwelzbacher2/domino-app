/**
 * Custom hook for managing error state in components
 */

import { useState, useCallback } from 'react';
import type { AppError } from '../utils/errorHandling';
import { handleError, mapNativeError, ErrorCategory, ErrorSeverity } from '../utils/errorHandling';

interface UseErrorHandlerReturn {
  error: AppError | null;
  setError: (error: AppError | null) => void;
  handleNativeError: (error: Error, category?: ErrorCategory) => void;
  handleErrorCode: (code: string, category: ErrorCategory, severity?: ErrorSeverity, details?: string) => void;
  clearError: () => void;
  hasError: boolean;
}

/**
 * Hook for managing error state with automatic logging
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setErrorState] = useState<AppError | null>(null);

  const setError = useCallback((error: AppError | null) => {
    setErrorState(error);
  }, []);

  const handleNativeError = useCallback((error: Error, category: ErrorCategory = ErrorCategory.UNKNOWN) => {
    const appError = mapNativeError(error, category);
    setErrorState(appError);
  }, []);

  const handleErrorCode = useCallback((
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    details?: string
  ) => {
    const appError = handleError(code, category, severity, details);
    setErrorState(appError);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  return {
    error,
    setError,
    handleNativeError,
    handleErrorCode,
    clearError,
    hasError: error !== null,
  };
}
