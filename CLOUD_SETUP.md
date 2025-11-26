# Cloud Backend Setup Guide

This guide explains how to set up and run the cloud backend for the Domino Score Counter application.

## Overview

The cloud backend provides:
- **Cloud sync**: Automatic backup of games to cloud database
- **Cross-device access**: Access your games from any device
- **Conflict resolution**: Automatic merging of local and cloud data
- **Offline support**: Queue sync operations when offline
- **Error reporting**: Collect manual correction reports for debugging

## Architecture

- **Frontend**: React app with CloudSyncService
- **Backend**: Express.js REST API
- **Database**: PostgreSQL
- **Storage**: Base64 images in database (can be migrated to S3)

## Backend Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/domino_db
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here
DEVELOPER_EMAIL=developer@example.com
FROM_EMAIL=noreply@yourdomain.com
```

**Email Setup (Optional):**
- Sign up for a free SendGrid account at https://sendgrid.com
- Create an API key in SendGrid dashboard (Settings > API Keys)
- Add the API key to your `.env` file as `SENDGRID_API_KEY`
- Set `DEVELOPER_EMAIL` to the email where you want to receive error reports
- Set `FROM_EMAIL` to a verified sender email (or use SendGrid's default)
- Test the configuration using the `/api/reports/test-email` endpoint

5. Create the PostgreSQL database:
```bash
createdb domino_db
```

6. Run database migrations:
```bash
npm run migrate
```

7. Start the development server:
```bash
npm run dev
```

The backend API will be available at `http://localhost:3001`

## Frontend Setup

1. Create a `.env` file in the frontend root:
```bash
cp .env.example .env
```

2. Update `.env` with the backend API URL:
```env
VITE_API_URL=http://localhost:3001/api
```

3. Start the frontend development server:
```bash
npm run dev
```

## Features

### Automatic Cloud Sync

Games are automatically synced to the cloud when:
- A new game is created
- A round score is added
- A game is completed

### Manual Sync

Users can manually trigger sync from the sync status indicator in the game list screen.

### Offline Support

When offline:
- All operations continue to work with local storage
- Sync operations are queued
- Queue is processed automatically when connection is restored

### Conflict Resolution

When conflicts occur between local and cloud data:
- The system compares timestamps
- The most recently modified version is kept
- Users are notified of conflict resolution

### Sync Status Indicator

The sync status indicator shows:
- Current sync status (synced, syncing, offline, error)
- Last sync timestamp
- Number of pending operations
- Manual sync button

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in with username

### Games
- `GET /api/games/:userId` - Get all games for user
- `POST /api/games` - Create or update game
- `DELETE /api/games/:gameId` - Delete game

### Rounds
- `GET /api/rounds/:gameId` - Get rounds for game
- `POST /api/rounds` - Create round

### Error Reports
- `POST /api/reports/correction` - Submit error report (sends email to developer)
- `GET /api/reports/unprocessed` - Get unprocessed reports
- `GET /api/reports/email-status` - Check email service configuration
- `POST /api/reports/test-email` - Send test email to verify setup

### Sync
- `GET /api/sync/:userId` - Get sync status

## Database Schema

### Tables

- **users**: User accounts with username and sync timestamps
- **cloud_games**: Game records with player data (JSONB)
- **cloud_rounds**: Round scores with images and detection results
- **error_reports**: Manual correction reports for debugging

See `backend/src/db/schema.sql` for complete schema.

## Production Deployment

### Backend Deployment

1. Build the backend:
```bash
cd backend
npm run build
```

2. Set production environment variables:
```env
NODE_ENV=production
DATABASE_URL=<production-database-url>
CORS_ORIGIN=<production-frontend-url>
```

3. Run migrations:
```bash
npm run migrate
```

4. Start the server:
```bash
npm start
```

### Frontend Deployment

1. Update `.env` with production API URL:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

2. Build the frontend:
```bash
npm run build
```

3. Deploy the `dist` folder to your hosting service

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL is correct
- Check port 3001 is not in use

### Sync not working
- Check backend is running and accessible
- Verify VITE_API_URL is correct in frontend `.env`
- Check browser console for CORS errors
- Verify user is signed in

### Database errors
- Run migrations: `npm run migrate`
- Check PostgreSQL logs
- Verify database permissions

## Email Service

The backend includes email functionality for sending error reports to developers when users make manual corrections to detection results.

### Configuration

1. Sign up for SendGrid (free tier available): https://sendgrid.com
2. Create an API key in SendGrid dashboard
3. Add to `.env`:
```env
SENDGRID_API_KEY=your_api_key_here
DEVELOPER_EMAIL=your-email@example.com
FROM_EMAIL=noreply@yourdomain.com
```

### Testing Email

Test your email configuration:
```bash
curl -X POST http://localhost:3001/api/reports/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

Check email status:
```bash
curl http://localhost:3001/api/reports/email-status
```

### Email Content

Error report emails include:
- Report ID and timestamp
- User and game information
- Original detection results with confidence scores
- Manual corrections made by user
- Comparison table showing differences
- Image data (if available)
- Actionable recommendations for improving detection

### Behavior

- When a user submits manual corrections, an error report is saved to the database
- If email is configured, an email is sent to the developer immediately
- If email sending fails, the report is still saved in the database
- Email failures don't affect the user experience
- Reports can be retrieved later via `/api/reports/unprocessed`

## Future Enhancements

- **S3 Integration**: Move image storage to S3
- **Authentication**: Add JWT tokens for security
- **Rate Limiting**: Prevent API abuse
- **Monitoring**: Add logging and metrics
- **Caching**: Add Redis for performance
- **Email Attachments**: Attach images directly to emails instead of embedding

## Support

For issues or questions, please check:
- Backend logs: Check console output
- Frontend logs: Check browser console
- Database logs: Check PostgreSQL logs
- API health: `GET /health`
