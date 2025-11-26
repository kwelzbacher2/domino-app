/**
 * Performance optimization utilities
 * Provides helpers for lazy loading, memoization, and performance monitoring
 */

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to ensure a function is called at most once per interval
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Measure execution time of an async function
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    console.log(`[Performance] ${name} (failed): ${(end - start).toFixed(2)}ms`);
    throw error;
  }
}

/**
 * Check if the device has limited resources (mobile, low memory)
 */
export function isLowEndDevice(): boolean {
  // Check for mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Check for low memory (if available)
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const hasLowMemory = memory !== undefined && memory < 4;

  // Check for slow connection
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const hasSlowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';

  return isMobile || hasLowMemory || hasSlowConnection;
}

/**
 * Get optimal image processing settings based on device capabilities
 */
export function getOptimalImageSettings(): {
  maxDimension: number;
  quality: number;
} {
  if (isLowEndDevice()) {
    return {
      maxDimension: 800,
      quality: 0.7,
    };
  }

  return {
    maxDimension: 1024,
    quality: 0.85,
  };
}

/**
 * Lazy load an image and return a promise
 */
export function lazyLoadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Request idle callback with fallback for browsers that don't support it
 */
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback to setTimeout
  return setTimeout(callback, 1) as unknown as number;
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallback(id: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}
