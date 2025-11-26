/**
 * useAsyncOperation - Hook for managing async operations with loading states
 * Provides consistent loading, error, and success state management
 */

import { useState, useCallback } from 'react';

interface AsyncOperationState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  progress?: number;
}

interface UseAsyncOperationReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  progress?: number;
  execute: (operation: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
  setProgress: (progress: number) => void;
}

/**
 * Hook for managing async operations with loading and error states
 */
export function useAsyncOperation<T = unknown>(): UseAsyncOperationReturn<T> {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    isLoading: false,
    error: null,
    progress: undefined,
  });

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T | null> => {
    setState({
      data: null,
      isLoading: true,
      error: null,
      progress: 0,
    });

    try {
      const result = await operation();
      setState({
        data: result,
        isLoading: false,
        error: null,
        progress: 100,
      });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState({
        data: null,
        isLoading: false,
        error: err,
        progress: undefined,
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      progress: undefined,
    });
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState((prev) => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
    }));
  }, []);

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    progress: state.progress,
    execute,
    reset,
    setProgress,
  };
}
