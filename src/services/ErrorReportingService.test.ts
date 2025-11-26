/**
 * Property-based tests for ErrorReportingService
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ErrorReportingService } from './ErrorReportingService';
import type { DetectedTile } from '../models/types';

// Mock fetch globally
const originalFetch = global.fetch;

describe('ErrorReportingService', () => {
  let service: ErrorReportingService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Create new service instance
    service = new ErrorReportingService();
    
    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  // Generator for DetectedTile
  const detectedTileArb = fc.record({
    id: fc.uuid(),
    boundingBox: fc.record({
      x: fc.integer({ min: 0, max: 1000 }),
      y: fc.integer({ min: 0, max: 1000 }),
      width: fc.integer({ min: 10, max: 200 }),
      height: fc.integer({ min: 10, max: 200 }),
      rotation: fc.float({ min: 0, max: 360, noNaN: true })
    }),
    leftPips: fc.integer({ min: 0, max: 12 }),
    rightPips: fc.integer({ min: 0, max: 12 }),
    totalPips: fc.integer({ min: 0, max: 24 }),
    confidence: fc.float({ min: 0, max: 1, noNaN: true })
  });

  /**
   * Feature: domino-web-app, Property 33: Manual correction reporting
   * For any manual correction made to detection results, an error report should be 
   * generated containing the original detection and corrected values.
   * Validates: Requirements 15.1, 15.2
   */
  it('Property 33: generates error report for manual corrections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.uuid(), // gameId
        fc.uuid(), // roundId
        fc.constant('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), // imageDataUrl
        fc.array(detectedTileArb, { minLength: 1, maxLength: 10 }), // originalDetection
        fc.array(detectedTileArb, { minLength: 1, maxLength: 10 }), // correctedTiles
        async (userId, gameId, roundId, imageDataUrl, originalDetection, correctedTiles) => {
          // Reset mock for this iteration
          fetchMock.mockClear();
          localStorage.clear();
          service = new ErrorReportingService();
          
          // Mock successful API response
          fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: async () => ({ success: true })
          } as Response);

          // Enable error reporting
          service.setUserPreference(true);

          // Report manual correction
          await service.reportManualCorrection(
            userId,
            gameId,
            roundId,
            imageDataUrl,
            originalDetection,
            correctedTiles
          );

          // Verify fetch was called with correct data
          expect(fetchMock).toHaveBeenCalledTimes(1);
          const callArgs = fetchMock.mock.calls[0];
          expect(callArgs[0]).toContain('/api/reports/correction');
          
          const requestBody = JSON.parse(callArgs[1].body);
          expect(requestBody.userId).toBe(userId);
          expect(requestBody.gameId).toBe(gameId);
          expect(requestBody.roundId).toBe(roundId);
          expect(requestBody.imageData).toBe(imageDataUrl);
          expect(requestBody.originalDetection).toEqual(originalDetection);
          expect(requestBody.correctedTiles).toEqual(correctedTiles);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 34: Error report completeness
   * For any error report sent, it should include the original image, detected tiles, 
   * corrected tiles, and user identifier.
   * Validates: Requirements 15.3
   */
  it('Property 34: error reports contain all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.uuid(), // gameId
        fc.uuid(), // roundId
        fc.string({ minLength: 20 }), // imageDataUrl (simplified)
        fc.array(detectedTileArb, { minLength: 0, maxLength: 10 }), // originalDetection
        fc.array(detectedTileArb, { minLength: 0, maxLength: 10 }), // correctedTiles
        async (userId, gameId, roundId, imageDataUrl, originalDetection, correctedTiles) => {
          // Reset mock for this iteration
          fetchMock.mockClear();
          localStorage.clear();
          service = new ErrorReportingService();
          
          // Mock successful API response
          fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: async () => ({ success: true })
          } as Response);

          // Enable error reporting
          service.setUserPreference(true);

          // Report manual correction
          await service.reportManualCorrection(
            userId,
            gameId,
            roundId,
            imageDataUrl,
            originalDetection,
            correctedTiles
          );

          // Verify all required fields are present
          expect(fetchMock).toHaveBeenCalledTimes(1);
          const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
          
          // Check all required fields exist
          expect(requestBody).toHaveProperty('reportId');
          expect(requestBody).toHaveProperty('userId');
          expect(requestBody).toHaveProperty('gameId');
          expect(requestBody).toHaveProperty('roundId');
          expect(requestBody).toHaveProperty('imageData');
          expect(requestBody).toHaveProperty('originalDetection');
          expect(requestBody).toHaveProperty('correctedTiles');
          
          // Verify field values
          expect(requestBody.userId).toBe(userId);
          expect(requestBody.imageData).toBe(imageDataUrl);
          expect(Array.isArray(requestBody.originalDetection)).toBe(true);
          expect(Array.isArray(requestBody.correctedTiles)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: domino-web-app, Property 35: Privacy preference respect
   * For any user who opts out of error reporting, no error reports should be sent 
   * regardless of manual corrections made.
   * Validates: Requirements 15.5
   */
  it('Property 35: respects user privacy preferences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.uuid(), // gameId
        fc.uuid(), // roundId
        fc.constant('data:image/png;base64,test'), // imageDataUrl
        fc.array(detectedTileArb, { minLength: 1, maxLength: 5 }), // originalDetection
        fc.array(detectedTileArb, { minLength: 1, maxLength: 5 }), // correctedTiles
        fc.boolean(), // userPreference
        async (userId, gameId, roundId, imageDataUrl, originalDetection, correctedTiles, userPreference) => {
          // Reset mock for this iteration
          fetchMock.mockClear();
          localStorage.clear();
          service = new ErrorReportingService();
          
          // Set user preference
          service.setUserPreference(userPreference);

          // Mock API response (should only be called if opted in)
          fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: async () => ({ success: true })
          } as Response);

          // Report manual correction
          await service.reportManualCorrection(
            userId,
            gameId,
            roundId,
            imageDataUrl,
            originalDetection,
            correctedTiles
          );

          // Verify fetch was called only if user opted in
          if (userPreference) {
            expect(fetchMock).toHaveBeenCalledTimes(1);
          } else {
            expect(fetchMock).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Report queuing on failure
   * For any report that fails to send, it should be queued for retry
   */
  it('queues reports for retry when sending fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.uuid(), // gameId
        fc.uuid(), // roundId
        fc.constant('data:image/png;base64,test'), // imageDataUrl
        fc.array(detectedTileArb, { minLength: 1, maxLength: 3 }), // originalDetection
        fc.array(detectedTileArb, { minLength: 1, maxLength: 3 }), // correctedTiles
        async (userId, gameId, roundId, imageDataUrl, originalDetection, correctedTiles) => {
          // Reset mock for this iteration
          fetchMock.mockClear();
          localStorage.clear();
          service = new ErrorReportingService();
          
          // Mock failed API response
          fetchMock.mockRejectedValueOnce(new Error('Network error'));

          // Enable error reporting
          service.setUserPreference(true);

          // Report manual correction (should not throw)
          await service.reportManualCorrection(
            userId,
            gameId,
            roundId,
            imageDataUrl,
            originalDetection,
            correctedTiles
          );

          // Verify report was queued
          expect(service.getQueuedReportCount()).toBe(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Additional property: Retry mechanism
   * For any queued report, retrying should attempt to send it again
   */
  it('retries queued reports successfully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.uuid(), // gameId
        fc.uuid(), // roundId
        fc.constant('data:image/png;base64,test'), // imageDataUrl
        fc.array(detectedTileArb, { minLength: 1, maxLength: 3 }), // originalDetection
        fc.array(detectedTileArb, { minLength: 1, maxLength: 3 }), // correctedTiles
        async (userId, gameId, roundId, imageDataUrl, originalDetection, correctedTiles) => {
          // First call fails
          fetchMock.mockRejectedValueOnce(new Error('Network error'));

          // Enable error reporting
          service.setUserPreference(true);

          // Report manual correction (should queue)
          await service.reportManualCorrection(
            userId,
            gameId,
            roundId,
            imageDataUrl,
            originalDetection,
            correctedTiles
          );

          expect(service.getQueuedReportCount()).toBe(1);

          // Second call succeeds
          fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: async () => ({ success: true })
          } as Response);

          // Retry failed reports
          await service.retryFailedReports();

          // Queue should be empty after successful retry
          expect(service.getQueuedReportCount()).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});

