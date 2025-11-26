# Domino Score Counter Backend API

Backend API server for the Domino Score Counter application, providing cloud sync and data backup functionality.

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **CORS**: Enabled for web app origin

## Setup

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/domino_db
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# Email Configuration (Optional - for error reporting)
SENDGRID_API_KEY=your_sendgrid_api_key_here
DEVELOPER_EMAIL=developer@example.com
FROM_EMAIL=noreply@yourdomain.com
```

**Note**: Email configuration is optional. If not configured, error reports will still be saved to the database but emails won't be sent. See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed setup instructions.

4. Create the database:
```bash
createdb domino_db
```

5. Run migrations:
```bash
npm run migrate
```

### Development

Start the development server with hot reload:
```bash
npm run dev
```

### Production

Build and start the production server:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/signin` - Sign in with username

### Games

- `GET /api/games/:userId` - Get all games for a user
- `POST /api/games` - Create or update a game
- `DELETE /api/games/:gameId` - Delete a game

### Rounds

- `GET /api/rounds/:gameId` - Get all rounds for a game
- `POST /api/rounds` - Create a round

### Error Reports

- `POST /api/reports/correction` - Submit error report for manual corrections (sends email if configured)
- `GET /api/reports/unprocessed` - Get unprocessed error reports
- `GET /api/reports/email-status` - Check email service configuration status
- `POST /api/reports/test-email` - Send test email to verify email setup

### Sync

- `GET /api/sync/:userId` - Get sync status for a user

### Health Check

- `GET /health` - Server health check

## Database Schema

The database includes the following tables:

- `users` - User accounts
- `cloud_games` - Game records with player data
- `cloud_rounds` - Round scores and images
- `error_reports` - Manual correction reports for debugging

See `src/db/schema.sql` for the complete schema definition.

## Security Considerations

- CORS is configured to only allow requests from the web app origin
- All API endpoints validate required fields
- Database queries use parameterized statements to prevent SQL injection
- Image data is stored as base64 text (consider S3 for production)

## Email Service

The backend includes email functionality for sending error reports to developers when users make manual corrections to detection results.

### Setup

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed setup instructions.

Quick setup:
1. Sign up for SendGrid (free tier available)
2. Create an API key
3. Add to `.env`:
```
SENDGRID_API_KEY=your_api_key
DEVELOPER_EMAIL=your-email@example.com
FROM_EMAIL=noreply@yourdomain.com
```

### Testing

Check email configuration:
```bash
node test-email.js status
```

Send test email:
```bash
node test-email.js test your-email@example.com
```

Send test error report:
```bash
node test-email.js report
```

## Future Enhancements

- Add authentication tokens (JWT)
- Implement rate limiting
- Add S3 integration for image storage
- Add API documentation with Swagger/OpenAPI
- Add email attachments for images
