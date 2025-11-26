/**
 * Email service for sending error reports
 */
import sgMail from '@sendgrid/mail';
import type { ErrorReport } from '../types';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const DEVELOPER_EMAIL = process.env.DEVELOPER_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@domino-app.com';

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY not configured. Email sending will be disabled.');
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!(SENDGRID_API_KEY && DEVELOPER_EMAIL);
}

/**
 * Format error report as HTML email
 */
function formatErrorReportEmail(report: ErrorReport): string {
  const originalDetection = JSON.parse(report.original_detection);
  const correctedTiles = JSON.parse(report.corrected_tiles);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px; }
        .label { font-weight: bold; color: #555; }
        .value { margin-left: 10px; }
        .tile-list { margin: 10px 0; }
        .tile { padding: 5px; margin: 5px 0; background-color: white; border-left: 3px solid #4CAF50; }
        .corrected { border-left-color: #ff9800; }
        .image-note { color: #666; font-style: italic; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #4CAF50; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎲 Domino Detection Error Report</h1>
        </div>
        
        <div class="section">
          <h2>Report Details</h2>
          <p><span class="label">Report ID:</span><span class="value">${report.report_id}</span></p>
          <p><span class="label">User ID:</span><span class="value">${report.user_id}</span></p>
          <p><span class="label">Game ID:</span><span class="value">${report.game_id || 'N/A'}</span></p>
          <p><span class="label">Round ID:</span><span class="value">${report.round_id || 'N/A'}</span></p>
          <p><span class="label">Timestamp:</span><span class="value">${new Date(report.timestamp).toLocaleString()}</span></p>
        </div>
        
        <div class="section">
          <h2>Original Detection</h2>
          <p><span class="label">Tiles Detected:</span><span class="value">${originalDetection.length}</span></p>
          <div class="tile-list">
            ${originalDetection.map((tile: any, idx: number) => `
              <div class="tile">
                <strong>Tile ${idx + 1}:</strong> 
                Left: ${tile.leftPips} pips, Right: ${tile.rightPips} pips, 
                Total: ${tile.totalPips} pips 
                (Confidence: ${(tile.confidence * 100).toFixed(1)}%)
              </div>
            `).join('')}
          </div>
          <p><span class="label">Original Total Score:</span><span class="value">${originalDetection.reduce((sum: number, t: any) => sum + t.totalPips, 0)} pips</span></p>
        </div>
        
        <div class="section">
          <h2>Manual Corrections</h2>
          <p><span class="label">Corrected Tiles:</span><span class="value">${correctedTiles.length}</span></p>
          <div class="tile-list">
            ${correctedTiles.map((tile: any, idx: number) => `
              <div class="tile corrected">
                <strong>Tile ${idx + 1}:</strong> 
                Left: ${tile.leftPips} pips, Right: ${tile.rightPips} pips, 
                Total: ${tile.totalPips} pips
              </div>
            `).join('')}
          </div>
          <p><span class="label">Corrected Total Score:</span><span class="value">${correctedTiles.reduce((sum: number, t: any) => sum + t.totalPips, 0)} pips</span></p>
        </div>
        
        <div class="section">
          <h2>Comparison</h2>
          <table>
            <tr>
              <th>Metric</th>
              <th>Original</th>
              <th>Corrected</th>
              <th>Difference</th>
            </tr>
            <tr>
              <td>Number of Tiles</td>
              <td>${originalDetection.length}</td>
              <td>${correctedTiles.length}</td>
              <td>${correctedTiles.length - originalDetection.length}</td>
            </tr>
            <tr>
              <td>Total Score</td>
              <td>${originalDetection.reduce((sum: number, t: any) => sum + t.totalPips, 0)}</td>
              <td>${correctedTiles.reduce((sum: number, t: any) => sum + t.totalPips, 0)}</td>
              <td>${correctedTiles.reduce((sum: number, t: any) => sum + t.totalPips, 0) - originalDetection.reduce((sum: number, t: any) => sum + t.totalPips, 0)}</td>
            </tr>
          </table>
        </div>
        
        ${report.image_data ? `
          <div class="section">
            <h2>Image</h2>
            <p class="image-note">The original image is attached to this email or stored in the database.</p>
            <p><span class="label">Image Size:</span><span class="value">${(report.image_data.length / 1024).toFixed(2)} KB</span></p>
          </div>
        ` : ''}
        
        <div class="section">
          <h2>Action Required</h2>
          <p>This error report indicates that the automatic detection system made mistakes that required manual correction by the user. Please review the detection algorithm and consider:</p>
          <ul>
            <li>Analyzing why tiles were missed or incorrectly detected</li>
            <li>Checking if pip counting was inaccurate</li>
            <li>Reviewing the image quality and lighting conditions</li>
            <li>Updating the detection model or preprocessing pipeline</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Format error report as plain text email
 */
function formatErrorReportText(report: ErrorReport): string {
  const originalDetection = JSON.parse(report.original_detection);
  const correctedTiles = JSON.parse(report.corrected_tiles);
  
  const originalTotal = originalDetection.reduce((sum: number, t: any) => sum + t.totalPips, 0);
  const correctedTotal = correctedTiles.reduce((sum: number, t: any) => sum + t.totalPips, 0);
  
  return `
DOMINO DETECTION ERROR REPORT
=============================

Report Details:
- Report ID: ${report.report_id}
- User ID: ${report.user_id}
- Game ID: ${report.game_id || 'N/A'}
- Round ID: ${report.round_id || 'N/A'}
- Timestamp: ${new Date(report.timestamp).toLocaleString()}

Original Detection:
- Tiles Detected: ${originalDetection.length}
- Total Score: ${originalTotal} pips

${originalDetection.map((tile: any, idx: number) => 
  `  Tile ${idx + 1}: ${tile.leftPips}|${tile.rightPips} (${tile.totalPips} pips, ${(tile.confidence * 100).toFixed(1)}% confidence)`
).join('\n')}

Manual Corrections:
- Corrected Tiles: ${correctedTiles.length}
- Corrected Score: ${correctedTotal} pips

${correctedTiles.map((tile: any, idx: number) => 
  `  Tile ${idx + 1}: ${tile.leftPips}|${tile.rightPips} (${tile.totalPips} pips)`
).join('\n')}

Comparison:
- Tile Count Difference: ${correctedTiles.length - originalDetection.length}
- Score Difference: ${correctedTotal - originalTotal} pips

Action Required:
This error report indicates that the automatic detection system made mistakes that required manual correction by the user. Please review the detection algorithm.
  `.trim();
}

/**
 * Send error report email to developer
 */
export async function sendErrorReportEmail(report: ErrorReport): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Email not configured. Skipping email send for report:', report.report_id);
    return;
  }

  if (!DEVELOPER_EMAIL) {
    throw new Error('DEVELOPER_EMAIL not configured');
  }

  const msg = {
    to: DEVELOPER_EMAIL,
    from: FROM_EMAIL,
    subject: `🎲 Domino Detection Error Report - ${report.report_id}`,
    text: formatErrorReportText(report),
    html: formatErrorReportEmail(report),
  };

  try {
    await sgMail.send(msg);
    console.log(`Error report email sent successfully: ${report.report_id}`);
  } catch (error: any) {
    console.error('Failed to send error report email:', error);
    if (error.response) {
      console.error('SendGrid error response:', error.response.body);
    }
    throw new Error('Failed to send error report email');
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(toEmail: string): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('Email service not configured');
  }

  const msg = {
    to: toEmail,
    from: FROM_EMAIL,
    subject: 'Domino Score Counter - Email Service Test',
    text: 'This is a test email from the Domino Score Counter backend. Email service is working correctly!',
    html: '<p>This is a test email from the <strong>Domino Score Counter</strong> backend.</p><p>Email service is working correctly! ✅</p>',
  };

  await sgMail.send(msg);
  console.log('Test email sent successfully');
}
