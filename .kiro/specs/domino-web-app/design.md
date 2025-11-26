# Design Document: Domino Score Counter

## Overview

The Domino Score Counter is a web application that uses computer vision to automatically count domino pip scores from photographs. The system combines image processing, object detection, and browser-based data persistence to streamline score tracking during domino games. The architecture is built with React and works across desktop and mobile browsers with responsive, touch-friendly interfaces and progressive web app capabilities.

## Architecture

### High-Level Architecture

The application follows a layered architecture pattern:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (UI Components, Camera Interface)      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (Game Logic, Score Management)         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Domain Layer                    │
│  (Image Processing, Detection Engine)   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Data Layer                      │
│  (Local DB, File Storage)               │
└─────────────────────────────────────────┘
```

### Technology Stack

- **Framework**: React with Vite (fast web development)
- **Language**: TypeScript (type safety and better tooling)
- **Image Processing**: TensorFlow.js for browser-based object detection
- **Local Storage**: IndexedDB via localforage for structured data and images
- **Cloud Database**: AWS DynamoDB or PostgreSQL for cloud backup and sync
- **Backend API**: AWS Lambda + API Gateway or Node.js/Express for cloud operations
- **Email Service**: AWS SES or SendGrid for error reporting
- **Camera**: Web MediaDevices API (getUserMedia) with file upload fallback
- **Image Storage**: IndexedDB with base64 encoding and optimized compression
- **UI Library**: CSS modules or Tailwind CSS for responsive design

## Components and Interfaces

### 1. Camera Module

**Responsibilities:**
- Capture images from device camera
- Provide viewfinder preview
- Handle camera permissions
- Manage image quality settings

**Interface:**
```typescript
interface CameraModule {
  requestPermissions(): Promise<boolean>;
  captureImage(): Promise<ImageData>;
  getPreviewStream(): Promise<MediaStream>;
  uploadImage(file: File): Promise<ImageData>;
}

interface ImageData {
  dataUrl: string; // base64 encoded image
  width: number;
  height: number;
  timestamp: Date;
}
```

### 2. Image Processing Engine

**Responsibilities:**
- Preprocess images for detection
- Detect domino tiles in images
- Count pips on each detected tile
- Calculate confidence scores

**Interface:**
```typescript
interface ImageProcessor {
  detectDominoes(image: ImageData): Promise<DetectionResult>;
  preprocessImage(image: ImageData): ProcessedImage;
}

interface DetectionResult {
  tiles: DetectedTile[];
  totalScore: number;
  confidence: number;
  processedImage: string; // base64 data URL with annotations
}

interface DetectedTile {
  id: string;
  boundingBox: BoundingBox;
  leftPips: number;
  rightPips: number;
  totalPips: number;
  confidence: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
```

### 3. Game Management Service

**Responsibilities:**
- Create and manage games
- Track players and scores
- Handle round progression
- Coordinate data persistence

**Interface:**
```typescript
interface GameService {
  createGame(playerCount: number, playerNames: string[]): Promise<Game>;
  getGame(gameId: string): Promise<Game>;
  addRoundScore(gameId: string, playerId: string, score: number, imageUri: string): Promise<void>;
  endGame(gameId: string): Promise<GameSummary>;
  listActiveGames(): Promise<Game[]>;
}

interface Game {
  id: string;
  createdAt: Date;
  currentRound: number;
  players: Player[];
  status: 'active' | 'completed';
}

interface Player {
  id: string;
  name: string;
  totalScore: number;
  rounds: RoundScore[];
}

interface RoundScore {
  roundNumber: number;
  score: number;
  imageDataUrl: string;
  timestamp: Date;
}
```

### 4. Storage Repository

**Responsibilities:**
- Persist game and player data in IndexedDB
- Query historical data
- Manage data integrity
- Handle storage quota limits

**Interface:**
```typescript
interface StorageRepository {
  // Game operations
  saveGame(game: Game): Promise<void>;
  getGameById(id: string): Promise<Game | null>;
  getAllGames(): Promise<Game[]>;
  deleteGame(id: string): Promise<void>;
  
  // Player operations
  savePlayer(player: Player): Promise<void>;
  getPlayerById(id: string): Promise<Player | null>;
  
  // Round operations
  saveRound(gameId: string, playerId: string, round: RoundScore): Promise<void>;
  getRoundsByGame(gameId: string): Promise<RoundScore[]>;
  
  // Storage management
  getStorageUsage(): Promise<{ used: number; quota: number }>;
  clearOldImages(keepCount: number): Promise<void>;
}
```

### 5. Authentication Service

**Responsibilities:**
- Manage user authentication with username
- Store and retrieve user session
- Associate games with user accounts
- Handle user sign-in and sign-out

**Interface:**
```typescript
interface AuthService {
  signIn(username: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
}

interface User {
  id: string;
  username: string;
  createdAt: Date;
}
```

### 6. Cloud Sync Service

**Responsibilities:**
- Synchronize local data to cloud database
- Restore data from cloud on sign-in
- Handle conflict resolution between local and cloud data
- Queue operations for offline mode

**Interface:**
```typescript
interface CloudSyncService {
  syncGame(game: Game): Promise<SyncResult>;
  syncAllGames(): Promise<SyncResult>;
  restoreGamesFromCloud(userId: string): Promise<Game[]>;
  resolveConflicts(localGame: Game, cloudGame: Game): Game;
  queueSyncOperation(operation: SyncOperation): void;
  processSyncQueue(): Promise<void>;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
}

interface SyncOperation {
  type: 'create' | 'update' | 'delete';
  gameId: string;
  timestamp: Date;
}
```

### 7. Error Reporting Service

**Responsibilities:**
- Capture manual correction events
- Send error reports to developer email
- Include diagnostic information (images, detection data)
- Handle user privacy preferences
- Queue reports for retry on failure

**Interface:**
```typescript
interface ErrorReportingService {
  reportManualCorrection(report: CorrectionReport): Promise<void>;
  setUserPreference(optIn: boolean): void;
  getUserPreference(): boolean;
  retryFailedReports(): Promise<void>;
}

interface CorrectionReport {
  userId: string;
  gameId: string;
  roundId: string;
  imageDataUrl: string;
  originalDetection: DetectedTile[];
  correctedTiles: DetectedTile[];
  timestamp: Date;
}
```

### 8. Export/Import Service (Optional)

**Responsibilities:**
- Export game data to JSON
- Import game data from JSON
- Handle data validation on import
- Support backup and restore

**Interface:**
```typescript
interface ExportImportService {
  exportGame(gameId: string): Promise<string>; // JSON string
  exportAllGames(): Promise<string>;
  importGames(jsonData: string): Promise<ImportResult>;
  downloadBackup(): void; // Triggers browser download
}

interface ImportResult {
  success: boolean;
  gamesImported: number;
  errors: string[];
}
```

## Data Models

### IndexedDB Schema

The application uses IndexedDB with the following object stores:

**Games Store:**
```typescript
interface GameRecord {
  id: string; // Primary key
  createdAt: string; // ISO date string
  currentRound: number;
  status: 'active' | 'completed';
  playerCount: number;
  players: Player[]; // Embedded player data
}
// Index: status
```

**Rounds Store:**
```typescript
interface RoundRecord {
  id: string; // Primary key
  gameId: string;
  playerId: string;
  roundNumber: number;
  score: number;
  imageDataUrl: string; // base64 encoded image
  timestamp: string; // ISO date string
  detectionResult?: {
    tilesDetected: number;
    confidence: number;
    manualCorrections?: any[];
  };
}
// Indexes: gameId, playerId, timestamp
```

**Note:** Players are embedded within Game records rather than stored separately, simplifying the data model for browser storage.

### Cloud Database Schema

The cloud database uses the following tables for backup and cross-device sync:

**Users Table:**
```typescript
interface UserRecord {
  userId: string; // Primary key (UUID)
  username: string; // Unique index
  createdAt: string; // ISO date string
  lastSyncAt: string; // ISO date string
}
```

**Cloud Games Table:**
```typescript
interface CloudGameRecord {
  gameId: string; // Primary key
  userId: string; // Foreign key to Users, indexed
  gameName?: string; // Optional game name
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string for conflict resolution
  currentRound: number;
  status: 'active' | 'completed';
  players: CloudPlayer[];
}

interface CloudPlayer {
  playerId: string;
  username: string;
  totalScore: number;
}
```

**Cloud Rounds Table:**
```typescript
interface CloudRoundRecord {
  roundId: string; // Primary key
  gameId: string; // Foreign key to Games, indexed
  playerId: string;
  roundNumber: number;
  score: number;
  imageUrl?: string; // Optional S3 URL for image storage
  timestamp: string; // ISO date string
  detectionResult?: {
    tilesDetected: number;
    confidence: number;
    manualCorrections?: any[];
  };
}
```

**Error Reports Table:**
```typescript
interface ErrorReportRecord {
  reportId: string; // Primary key
  userId: string; // Indexed
  gameId: string;
  roundId: string;
  imageUrl: string; // S3 URL
  originalDetection: string; // JSON string
  correctedTiles: string; // JSON string
  timestamp: string; // ISO date string
  processed: boolean; // Whether developer has reviewed
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Image capture persistence
*For any* captured image, storing it should result in the image being retrievable from storage with the same content.
**Validates: Requirements 1.2**

### Property 2: Domino boundary detection
*For any* image containing domino tiles, the detection system should identify bounding boxes for each tile present in the image.
**Validates: Requirements 2.1**

### Property 3: Non-domino object exclusion
*For any* image containing both domino tiles and non-domino objects, the detection system should only return bounding boxes for domino-shaped objects.
**Validates: Requirements 2.3**

### Property 4: Rotation invariance
*For any* domino tile at any rotation angle, the detection system should identify the tile regardless of its orientation.
**Validates: Requirements 2.5**

### Property 5: Complete pip counting
*For any* detected domino tile, the total pip count should equal the sum of pips on the left half plus pips on the right half.
**Validates: Requirements 3.1, 3.4**

### Property 6: Pip range accuracy
*For any* domino half with pips ranging from 0 to 12, the counting system should accurately identify the exact number of pips.
**Validates: Requirements 3.3, 12.4**

### Property 7: Confidence reporting
*For any* image processed, the detection result should include a confidence score between 0 and 1 for each detected tile.
**Validates: Requirements 3.5**

### Property 8: Detection result annotation
*For any* completed detection, the result should include the original image with bounding boxes and pip counts overlaid on each detected tile.
**Validates: Requirements 4.1, 4.2**

### Property 9: Manual correction consistency
*For any* detection result, adding or removing tiles manually should update the total score to match the sum of all remaining tiles.
**Validates: Requirements 5.1, 5.2, 5.3, 5.5**

### Property 10: Correction persistence
*For any* manual correction made to a detection result, the adjustments should be stored and retrievable with the round data.
**Validates: Requirements 5.4**

### Property 11: Unique game identifiers
*For any* sequence of game creations, each game should receive a unique identifier that differs from all previously created games.
**Validates: Requirements 7.1**

### Property 12: Game initialization
*For any* newly created game, the initial state should have current round set to 1 and a creation timestamp.
**Validates: Requirements 7.4**

### Property 13: Unique player identifiers
*For any* set of players added to a game, each player should have a unique identifier within that game.
**Validates: Requirements 7.3**

### Property 14: Active games query completeness
*For any* set of active games in the database, querying for active games should return all and only those games with status 'active'.
**Validates: Requirements 7.5**

### Property 15: Score accumulation
*For any* player and any sequence of round scores, the player's total score should equal the sum of all their round scores.
**Validates: Requirements 8.2**

### Property 16: Round data completeness
*For any* round score recorded, the stored data should include round number, score value, player ID, and timestamp.
**Validates: Requirements 8.3**

### Property 17: Round progression
*For any* game, completing a round should increment the current round number by exactly 1.
**Validates: Requirements 8.4**

### Property 18: Player score display completeness
*For any* player, viewing their scores should display all recorded rounds and a cumulative total that matches the sum of round scores.
**Validates: Requirements 8.5**

### Property 19: Game state display completeness
*For any* game, viewing the game should display all players with their current total scores and all rounds in chronological order.
**Validates: Requirements 9.1, 9.2**

### Property 20: Historical round data retrieval
*For any* historical round, selecting it should retrieve and display the associated image and detection results.
**Validates: Requirements 9.3**

### Property 21: Chronological round ordering
*For any* game with multiple rounds, displaying the rounds should show them ordered by round number in ascending order.
**Validates: Requirements 9.4**

### Property 22: Game completion state
*For any* active game, ending the game should change its status to 'completed' and produce final standings ordered by total score.
**Validates: Requirements 9.5**

### Property 23: Database persistence round-trip
*For any* game data (games, players, rounds) written to the database, the data should be retrievable after simulated app restart with identical values.
**Validates: Requirements 10.1, 10.2**

### Property 24: Cascading deletion
*For any* game, deleting the game should remove all associated rounds and game-player relationships from the database.
**Validates: Requirements 10.3**

### Property 25: Database integrity on failure
*For any* database operation that fails, the database should remain in a consistent state with no partial writes or corrupted data.
**Validates: Requirements 10.4**

### Property 26: Image compression
*For any* round image stored, the file size should be reduced through compression while maintaining sufficient quality for detection review.
**Validates: Requirements 10.5**

### Property 27: Error logging and user notification
*For any* unexpected processing error, the system should log the error details and display a user-friendly error message.
**Validates: Requirements 12.4**

### Property 28: Username uniqueness
*For any* username entered during sign-in, the system should either create a new user or retrieve the existing user with that username, ensuring no duplicate user records.
**Validates: Requirements 13.2**

### Property 29: Cloud sync persistence
*For any* game saved locally, syncing to the cloud should result in the game being retrievable from the cloud database with identical data.
**Validates: Requirements 13.3, 14.1**

### Property 30: Cloud data restoration
*For any* user signing in on a new device, all games associated with that username should be loaded from the cloud database.
**Validates: Requirements 13.4, 14.3**

### Property 31: Conflict resolution consistency
*For any* pair of conflicting game records (local and cloud), the conflict resolution should select the record with the most recent timestamp.
**Validates: Requirements 14.4**

### Property 32: Offline sync queue
*For any* sync operation attempted while offline, the operation should be queued and executed when connection is restored.
**Validates: Requirements 14.5**

### Property 33: Manual correction reporting
*For any* manual correction made to detection results, an error report should be generated containing the original detection and corrected values.
**Validates: Requirements 15.1, 15.2**

### Property 34: Error report completeness
*For any* error report sent, it should include the original image, detected tiles, corrected tiles, and user identifier.
**Validates: Requirements 15.3**

### Property 35: Privacy preference respect
*For any* user who opts out of error reporting, no error reports should be sent regardless of manual corrections made.
**Validates: Requirements 15.5**

## Error Handling

### Error Categories and Strategies

**1. Camera and Permissions Errors**
- Permission denied: Display clear instructions for enabling camera access in browser settings and offer file upload alternative
- Camera unavailable: Notify user and automatically fall back to file upload option
- Capture failure: Allow retry with option to upload image file instead

**2. Image Processing Errors**
- No dominoes detected: Suggest retaking photo with better lighting/angle, show example of good photo
- Low confidence detection: Display warning and allow manual verification/correction
- Processing timeout: Cancel operation gracefully, preserve image for retry
- Insufficient image quality: Provide specific feedback (too blurry, too dark, etc.)

**3. Storage Errors**
- Write failure: Retry with exponential backoff, notify user if persistent
- Read failure: Attempt recovery, fall back to empty state if necessary
- Quota exceeded: Notify user, offer to delete old games/images or export data
- Storage unavailable: Warn user about private browsing mode limitations

**4. Validation Errors**
- Invalid player count: Display acceptable range (2-10 players)
- Invalid score value: Reject negative scores, warn on unusually high scores
- Missing required data: Prevent operation, highlight missing fields

### Error Recovery Patterns

**Graceful Degradation:**
- If image annotation fails, display results without visual overlay
- If confidence scoring fails, proceed with detection but flag for manual review

**Data Integrity:**
- Use IndexedDB transactions for multi-step operations
- Validate data before persistence
- Implement optimistic updates with rollback on failure
- Maintain referential integrity through application logic

**User Communication:**
- Use clear, non-technical language in error messages
- Provide actionable next steps
- Include "Learn More" links for complex issues
- Show progress indicators for long operations

## Testing Strategy

### Unit Testing

**Framework:** Vitest with React Testing Library

**Focus Areas:**
- Data model validation and transformations
- Game logic (score calculation, round progression)
- Storage repository operations (CRUD with IndexedDB)
- Image preprocessing functions
- UI component rendering and interactions
- Browser API mocking (MediaDevices, IndexedDB)

**Example Unit Tests:**
- Test that creating a game with 4 players initializes 4 player records
- Test that deleting a game removes associated rounds
- Test that score calculation sums all round scores correctly
- Test that invalid player counts are rejected
- Test that camera permission request shows appropriate UI

### Property-Based Testing

**Framework:** fast-check (JavaScript/TypeScript property-based testing library)

**Configuration:**
- Minimum 100 iterations per property test
- Use seed-based randomization for reproducibility
- Generate edge cases (empty sets, boundary values, maximum sizes)

**Test Tagging Convention:**
Each property-based test must include a comment with this format:
```typescript
// Feature: domino-score-counter, Property X: [property description]
```

**Generator Strategies:**

*Image Data Generators:*
- Generate images with varying numbers of dominoes (0-20)
- Include edge cases: overlapping tiles, various rotations, different lighting
- Generate different domino styles (colors, sizes, pip shapes)

*Game Data Generators:*
- Generate games with random player counts (2-10)
- Generate round sequences with random scores (0-168 for double-12 set)
- Generate timestamps in realistic sequences

*Database Operation Generators:*
- Generate sequences of CRUD operations
- Include concurrent operation scenarios
- Generate failure scenarios (disk full, permission denied)

**Property Test Examples:**

```typescript
// Feature: domino-score-counter, Property 15: Score accumulation
test('player total score equals sum of round scores', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 0, max: 168 }), { minLength: 1, maxLength: 20 }),
      (roundScores) => {
        const player = createPlayerWithRounds(roundScores);
        const expectedTotal = roundScores.reduce((sum, score) => sum + score, 0);
        expect(player.totalScore).toBe(expectedTotal);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: domino-score-counter, Property 11: Unique game identifiers
test('all created games have unique identifiers', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 2, max: 50 }),
      (gameCount) => {
        const games = Array.from({ length: gameCount }, () => createGame(4, ['A', 'B', 'C', 'D']));
        const ids = games.map(g => g.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(gameCount);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**Framework:** Playwright or Cypress (browser-based end-to-end testing)

**Scenarios:**
- Complete game flow: create game → capture/upload image → assign score → view results
- Multi-round game with multiple players
- Manual correction workflow
- Export/import data cycle
- Page refresh with data persistence verification
- Mobile viewport testing

### Image Detection Testing

**Approach:** Model-based testing with labeled dataset

**Test Dataset:**
- Collect 100+ real domino images with manual annotations
- Include variety: different sets, lighting, angles, backgrounds
- Label each image with ground truth (tile positions, pip counts)

**Validation:**
- Compare detected tiles against ground truth
- Measure precision (% of detections that are correct)
- Measure recall (% of actual tiles detected)
- Track confidence score calibration

**Acceptance Criteria:**
- Precision > 90% on test dataset
- Recall > 85% on test dataset
- Average confidence score correlates with accuracy

## Implementation Notes

### Image Detection Approach

**Model Selection:** Use TensorFlow.js with a pre-trained object detection model (e.g., COCO-SSD or MobileNet) fine-tuned on domino images, or use a custom model converted to TensorFlow.js format.

**Training Data:** Collect and annotate 500-1000 domino images with bounding boxes and pip counts. Use data augmentation (rotation, lighting, scale) to expand dataset.

**Detection Pipeline:**
1. Preprocess image (resize, normalize)
2. Run object detection to find domino tiles
3. For each detected tile, crop and run pip counting
4. Aggregate results and calculate confidence

**Pip Counting:** Use template matching or a small CNN classifier trained on individual domino halves (0-12 pips).

### Performance Optimization

- Run detection using Web Workers to avoid UI blocking
- Use image downsampling for faster processing (resize to max 1024px)
- Cache detection models in memory and use WebGL backend for TensorFlow.js
- Compress stored images to JPEG with 80% quality before base64 encoding
- Implement lazy loading and virtualization for game history
- Use code splitting to reduce initial bundle size

### Browser and Mobile Considerations

- Request camera permissions before first use with clear explanations
- Provide file upload fallback for browsers without camera support
- Support both portrait and landscape orientations with responsive design
- Handle different browser storage quotas gracefully
- Support touch gestures on mobile devices
- Test across major browsers (Chrome, Firefox, Safari, Edge)
- Consider PWA features for offline capability and home screen installation

### Cloud Infrastructure

**Backend Architecture:**
- **Option 1 (Serverless):** AWS Lambda functions with API Gateway for REST endpoints, DynamoDB for database, S3 for image storage, SES for email
- **Option 2 (Traditional):** Node.js/Express server, PostgreSQL database, S3 or local storage for images, SendGrid for email

**API Endpoints:**
- `POST /api/auth/signin` - Sign in with username
- `GET /api/games/:userId` - Get all games for user
- `POST /api/games` - Create or update game
- `DELETE /api/games/:gameId` - Delete game
- `POST /api/rounds` - Create round with score
- `POST /api/reports/correction` - Submit error report
- `GET /api/sync/:userId` - Get sync status

**Security Considerations:**
- Use HTTPS for all API calls
- Implement rate limiting to prevent abuse
- Validate and sanitize all user inputs
- Use signed URLs for S3 image uploads/downloads
- Implement CORS properly for web app domain
- Consider adding API key authentication for production

**Cost Optimization:**
- Use DynamoDB on-demand pricing for variable traffic
- Compress images before uploading to S3
- Set S3 lifecycle policies to archive old images
- Use CloudFront CDN for faster image delivery
- Implement pagination for large game lists

### Future Enhancements

- Progressive Web App (PWA) with offline support and installability
- Multi-language support for international users
- Batch processing of multiple images
- Export game history to CSV/PDF
- Social features (share scores via URL, online leaderboards)
- Support for other tile games (mahjong, rummikub)
- OAuth authentication (Google, Facebook)
- Dark mode support
- Game sharing between users
- Real-time multiplayer scoring
