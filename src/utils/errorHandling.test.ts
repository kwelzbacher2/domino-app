/**
 * Property-based tests for error handling utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  ErrorCategory,
  ErrorSeverity,
  createError,
  handleError,
  mapNativeError,
  errorLogger,
  retryWithBackoff,
  isStorageAvailable,
} from './errorHandling';

describe('Error Handling Utilities', () => {
  beforeEach(() => {
    // Clear logs before each test
    errorLogger.clearLogs();
  });

  /**
   * Feature: domino-web-app, Property 27: Error logging and user notification
   * Validates: Requirements 12.4
   * 
   * For any unexpected processing error, the system should log the error details
   * and display a user-friendly error message.
   */
  describe('Property 27: Error logging and user notification', () => {
    it('should log all errors with complete information', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ErrorCategory)),
          fc.constantFrom(...Object.values(ErrorSeverity)),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !['toString', 'valueOf', 'constructor', '__proto__'].includes(s)),
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          (category, severity, code, technicalDetails) => {
            // Create and handle an error
            const error = handleError(code, category, severity, technicalDetails);

            // Verify error has all required fields
            expect(error).toBeDefined();
            expect(error.category).toBe(category);
            expect(error.severity).toBe(severity);
            expect(error.code).toBe(code);
            expect(error.message).toBeDefined();
            expect(error.userMessage).toBeDefined();
            expect(error.timestamp).toBeInstanceOf(Date);
            expect(typeof error.recoverable).toBe('boolean');

            // Verify error was logged
            const recentLogs = errorLogger.getRecentLogs(1);
            expect(recentLogs.length).toBeGreaterThan(0);
            expect(recentLogs[0].code).toBe(code);
            expect(recentLogs[0].category).toBe(category);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide user-friendly messages for all error codes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'CAMERA_PERMISSION_DENIED',
            'CAMERA_NOT_FOUND',
            'DETECTION_NO_DOMINOES',
            'DETECTION_POOR_IMAGE_QUALITY',
            'STORAGE_QUOTA_EXCEEDED',
            'STORAGE_WRITE_FAILED',
            'VALIDATION_INVALID_PLAYER_COUNT',
            'NETWORK_OFFLINE',
            'UNKNOWN_ERROR'
          ),
          fc.constantFrom(...Object.values(ErrorCategory)),
          (code, category) => {
            const error = createError(code, category);

            // User message should be non-empty and different from technical code
            expect(error.userMessage).toBeDefined();
            expect(error.userMessage.length).toBeGreaterThan(0);
            expect(error.userMessage).not.toBe(code);
            
            // User message should not contain technical jargon
            expect(error.userMessage.toLowerCase()).not.toContain('undefined');
            expect(error.userMessage.toLowerCase()).not.toContain('null');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should map native JavaScript errors to AppErrors with user messages', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'NotAllowedError',
            'NotFoundError',
            'QuotaExceededError',
            'TypeError',
            'Error'
          ),
          fc.string({ minLength: 1 }),
          (errorName, errorMessage) => {
            const nativeError = new Error(errorMessage);
            nativeError.name = errorName;

            const appError = mapNativeError(nativeError);

            // Should have user-friendly message
            expect(appError.userMessage).toBeDefined();
            expect(appError.userMessage.length).toBeGreaterThan(0);
            
            // Should have technical details
            expect(appError.technicalDetails).toBe(errorMessage);
            
            // Should be logged
            const recentLogs = errorLogger.getRecentLogs(1);
            expect(recentLogs.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain error log history up to maximum', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              code: fc.string({ minLength: 1 }),
              category: fc.constantFrom(...Object.values(ErrorCategory)),
            }),
            { minLength: 1, maxLength: 150 }
          ),
          (errors) => {
            errorLogger.clearLogs();

            // Log all errors
            errors.forEach(({ code, category }) => {
              handleError(code, category);
            });

            // Should not exceed maximum (100)
            const allLogs = errorLogger.getRecentLogs(200);
            expect(allLogs.length).toBeLessThanOrEqual(100);

            // If we logged more than 100, should have the most recent ones
            if (errors.length > 100) {
              expect(allLogs.length).toBe(100);
            } else {
              expect(allLogs.length).toBe(errors.length);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide recovery actions for recoverable errors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'CAMERA_PERMISSION_DENIED',
            'CAMERA_NOT_FOUND',
            'DETECTION_NO_DOMINOES',
            'STORAGE_QUOTA_EXCEEDED',
            'VALIDATION_INVALID_PLAYER_COUNT'
          ),
          fc.constantFrom(...Object.values(ErrorCategory)),
          (code, category) => {
            const error = createError(code, category);

            // Recoverable errors should have recovery actions
            if (error.recoverable) {
              expect(error.recoveryAction).toBeDefined();
              expect(error.recoveryAction!.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Retry with backoff', () => {
    it('should retry failed operations with exponential backoff', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 3 }),
          async (successAfterAttempts, maxRetries) => {
            let attempts = 0;
            const operation = async () => {
              attempts++;
              if (attempts < successAfterAttempts) {
                throw new Error('Operation failed');
              }
              return 'success';
            };

            if (successAfterAttempts <= maxRetries) {
              // Should succeed
              const result = await retryWithBackoff(operation, maxRetries, 10);
              expect(result).toBe('success');
              expect(attempts).toBe(successAfterAttempts);
            } else {
              // Should fail after max retries
              await expect(retryWithBackoff(operation, maxRetries, 10)).rejects.toThrow();
              expect(attempts).toBe(maxRetries);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Storage availability check', () => {
    it('should consistently report storage availability', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const available1 = isStorageAvailable();
            const available2 = isStorageAvailable();
            
            // Should be consistent
            expect(available1).toBe(available2);
            
            // Should be boolean
            expect(typeof available1).toBe('boolean');
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Error severity levels', () => {
    it('should categorize errors by severity appropriately', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ErrorCategory)),
          fc.constantFrom(...Object.values(ErrorSeverity)),
          fc.string({ minLength: 1 }),
          (category, severity, code) => {
            const error = createError(code, category, severity);
            
            expect(error.severity).toBe(severity);
            
            // Critical errors should be marked as such
            if (severity === ErrorSeverity.CRITICAL) {
              expect(error.severity).toBe(ErrorSeverity.CRITICAL);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
