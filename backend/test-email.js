/**
 * Manual test script for email service
 * 
 * Usage:
 *   node test-email.js status
 *   node test-email.js test your-email@example.com
 *   node test-email.js report
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3001';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function checkStatus() {
  console.log('Checking email service status...\n');
  const result = await makeRequest('/api/reports/email-status');
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
}

async function sendTestEmail(email) {
  console.log(`Sending test email to ${email}...\n`);
  const result = await makeRequest('/api/reports/test-email', 'POST', { email });
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
}

async function sendTestReport() {
  console.log('Sending test error report...\n');
  
  const testReport = {
    reportId: 'test-' + Date.now(),
    userId: 'test-user-123',
    gameId: 'test-game-456',
    roundId: 'test-round-789',
    imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...(truncated)',
    originalDetection: [
      { id: '1', leftPips: 3, rightPips: 5, totalPips: 8, confidence: 0.92 },
      { id: '2', leftPips: 2, rightPips: 4, totalPips: 6, confidence: 0.88 }
    ],
    correctedTiles: [
      { id: '1', leftPips: 3, rightPips: 5, totalPips: 8 },
      { id: '2', leftPips: 2, rightPips: 4, totalPips: 6 },
      { id: '3', leftPips: 1, rightPips: 6, totalPips: 7 }
    ]
  };

  const result = await makeRequest('/api/reports/correction', 'POST', testReport);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'status':
        await checkStatus();
        break;
      case 'test':
        if (!arg) {
          console.error('Error: Email address required');
          console.log('Usage: node test-email.js test your-email@example.com');
          process.exit(1);
        }
        await sendTestEmail(arg);
        break;
      case 'report':
        await sendTestReport();
        break;
      default:
        console.log('Email Service Test Script');
        console.log('========================\n');
        console.log('Commands:');
        console.log('  status              - Check email service configuration');
        console.log('  test <email>        - Send test email');
        console.log('  report              - Send test error report');
        console.log('\nExamples:');
        console.log('  node test-email.js status');
        console.log('  node test-email.js test your-email@example.com');
        console.log('  node test-email.js report');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
