/**
 * Error reporting routes
 */
import { Router, Request, Response } from 'express';
import { query } from '../db/database';
import type { ErrorReport } from '../types';
import { sendErrorReportEmail, isEmailConfigured, sendTestEmail } from '../services/emailService';

const router = Router();

/**
 * POST /api/reports/correction
 * Submit an error report for manual corrections
 */
router.post('/correction', async (req: Request, res: Response) => {
  try {
    const {
      reportId,
      userId,
      gameId,
      roundId,
      imageData,
      originalDetection,
      correctedTiles
    } = req.body;

    if (!reportId || !userId || !originalDetection || !correctedTiles) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store error report in database
    const result = await query<ErrorReport>(
      `INSERT INTO error_reports 
       (report_id, user_id, game_id, round_id, image_data, original_detection, corrected_tiles, timestamp, processed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, FALSE)
       RETURNING *`,
      [
        reportId,
        userId,
        gameId,
        roundId,
        imageData,
        JSON.stringify(originalDetection),
        JSON.stringify(correctedTiles)
      ]
    );

    const savedReport = result.rows[0];

    // Send email notification to developer
    try {
      if (isEmailConfigured()) {
        await sendErrorReportEmail(savedReport);
        console.log(`Email sent for error report: ${reportId}`);
      } else {
        console.warn('Email service not configured. Report saved but email not sent.');
      }
    } catch (emailError) {
      // Log email error but don't fail the request
      // The report is already saved in the database
      console.error('Failed to send error report email:', emailError);
    }

    res.status(201).json(savedReport);
  } catch (error) {
    console.error('Submit error report error:', error);
    res.status(500).json({ error: 'Failed to submit error report' });
  }
});

/**
 * GET /api/reports/unprocessed
 * Get unprocessed error reports (for developer review)
 */
router.get('/unprocessed', async (req: Request, res: Response) => {
  try {
    const result = await query<ErrorReport>(
      `SELECT * FROM error_reports 
       WHERE processed = FALSE 
       ORDER BY timestamp DESC 
       LIMIT 100`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get error reports error:', error);
    res.status(500).json({ error: 'Failed to retrieve error reports' });
  }
});

/**
 * GET /api/reports/email-status
 * Check if email service is configured
 */
router.get('/email-status', (req: Request, res: Response) => {
  const configured = isEmailConfigured();
  res.json({
    configured,
    message: configured 
      ? 'Email service is configured and ready' 
      : 'Email service is not configured. Set SENDGRID_API_KEY and DEVELOPER_EMAIL environment variables.'
  });
});

/**
 * POST /api/reports/test-email
 * Send a test email to verify configuration
 */
router.post('/test-email', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({ 
        error: 'Email service not configured',
        message: 'Set SENDGRID_API_KEY and DEVELOPER_EMAIL environment variables'
      });
    }

    await sendTestEmail(email);
    res.json({ 
      success: true, 
      message: `Test email sent to ${email}` 
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

export default router;
