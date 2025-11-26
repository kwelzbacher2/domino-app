/**
 * Error Reporting Service
 * Handles reporting of manual corrections to help improve detection accuracy
 */
import { v4 as uuidv4 } from 'uuid';
import type { DetectedTile } from '../models/types';

export interface CorrectionReport {
  reportId: string;
  userId: string;
  gameId: string;
  roundId: string;
  imageDataUrl: string;
  originalDetection: DetectedTile[];
  correctedTiles: DetectedTile[];
  timestamp: Date;
}

interface QueuedReport {
  report: CorrectionReport;
  retryCount: number;
  lastAttempt: Date;
}

const PRIVACY_PREFERENCE_KEY = 'domino_error_reporting_enabled';
const REPORT_QUEUE_KEY = 'domino_error_report_queue';
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ErrorReportingService {
  private reportQueue: QueuedReport[] = [];

  constructor() {
    this.loadQueueFromStorage();
  }

  /**
   * Report a manual correction to the developer
   */
  async reportManualCorrection(
    userId: string,
    gameId: string,
    roundId: string,
    imageDataUrl: string,
    originalDetection: DetectedTile[],
    correctedTiles: DetectedTile[]
  ): Promise<void> {
    // Check user privacy preference
    if (!this.getUserPreference()) {
      console.log('Error reporting disabled by user preference');
      return;
    }

    const report: CorrectionReport = {
      reportId: uuidv4(),
      userId,
      gameId,
      roundId,
      imageDataUrl,
      originalDetection,
      correctedTiles,
      timestamp: new Date()
    };

    try {
      await this.sendReport(report);
    } catch (error) {
      console.error('Failed to send error report, queuing for retry:', error);
      this.queueReport(report);
    }
  }

  /**
   * Send a report to the backend API
   */
  private async sendReport(report: CorrectionReport): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/reports/correction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reportId: report.reportId,
        userId: report.userId,
        gameId: report.gameId,
        roundId: report.roundId,
        imageData: report.imageDataUrl,
        originalDetection: report.originalDetection,
        correctedTiles: report.correctedTiles
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send report: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Queue a report for retry
   */
  private queueReport(report: CorrectionReport): void {
    this.reportQueue.push({
      report,
      retryCount: 0,
      lastAttempt: new Date()
    });
    this.saveQueueToStorage();
  }

  /**
   * Retry sending failed reports
   */
  async retryFailedReports(): Promise<void> {
    if (this.reportQueue.length === 0) {
      return;
    }

    const reportsToRetry = [...this.reportQueue];
    this.reportQueue = [];

    for (const queuedReport of reportsToRetry) {
      if (queuedReport.retryCount >= MAX_RETRY_ATTEMPTS) {
        console.warn(`Report ${queuedReport.report.reportId} exceeded max retry attempts, discarding`);
        continue;
      }

      try {
        await this.sendReport(queuedReport.report);
        console.log(`Successfully sent queued report ${queuedReport.report.reportId}`);
      } catch (error) {
        console.error(`Retry failed for report ${queuedReport.report.reportId}:`, error);
        this.reportQueue.push({
          ...queuedReport,
          retryCount: queuedReport.retryCount + 1,
          lastAttempt: new Date()
        });
      }
    }

    this.saveQueueToStorage();
  }

  /**
   * Set user's privacy preference for error reporting
   */
  setUserPreference(optIn: boolean): void {
    localStorage.setItem(PRIVACY_PREFERENCE_KEY, JSON.stringify(optIn));
  }

  /**
   * Get user's privacy preference for error reporting
   * Defaults to true (opt-in) if not set
   */
  getUserPreference(): boolean {
    const preference = localStorage.getItem(PRIVACY_PREFERENCE_KEY);
    if (preference === null) {
      return true; // Default to opt-in
    }
    return JSON.parse(preference);
  }

  /**
   * Get the number of queued reports
   */
  getQueuedReportCount(): number {
    return this.reportQueue.length;
  }

  /**
   * Load report queue from localStorage
   */
  private loadQueueFromStorage(): void {
    try {
      const queueData = localStorage.getItem(REPORT_QUEUE_KEY);
      if (queueData) {
        const parsed = JSON.parse(queueData);
        this.reportQueue = parsed.map((item: any) => ({
          ...item,
          report: {
            ...item.report,
            timestamp: new Date(item.report.timestamp)
          },
          lastAttempt: new Date(item.lastAttempt)
        }));
      }
    } catch (error) {
      console.error('Failed to load report queue from storage:', error);
      this.reportQueue = [];
    }
  }

  /**
   * Save report queue to localStorage
   */
  private saveQueueToStorage(): void {
    try {
      localStorage.setItem(REPORT_QUEUE_KEY, JSON.stringify(this.reportQueue));
    } catch (error) {
      console.error('Failed to save report queue to storage:', error);
    }
  }
}

// Export singleton instance
export const errorReportingService = new ErrorReportingService();

