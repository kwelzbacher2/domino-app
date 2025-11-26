# Implementation Plan

- [x] 1. Set up React web project structure and dependencies





  - Verify Vite + React + TypeScript setup is complete
  - Install core dependencies: localforage (IndexedDB), @tensorflow/tfjs, @tensorflow-models/coco-ssd
  - Configure TypeScript with strict type checking
  - Set up project directory structure (components, services, models, utils, hooks)
  - Add CSS framework (Tailwind CSS or CSS modules)
  - _Requirements: All_

- [x] 2. Implement storage layer and data models





- [x] 2.1 Create TypeScript interfaces for all data models


  - Define Game, Player, RoundScore, DetectedTile, DetectionResult interfaces
  - Create IndexedDB schema types (GameRecord, RoundRecord)
  - _Requirements: 7.1, 7.3, 8.3, 9.1_

- [x] 2.2 Implement IndexedDB initialization with localforage


  - Create storage connection utility using localforage
  - Configure object stores for games and rounds with indexes
  - Implement version management for schema updates
  - _Requirements: 10.1, 10.2_

- [x] 2.3 Write property test for storage persistence


  - **Property 23: Database persistence round-trip**
  - **Validates: Requirements 10.1, 10.2**

- [x] 2.4 Implement StorageRepository with CRUD operations


  - Create methods for saving/retrieving games and rounds using localforage
  - Implement query methods for active games and player scores
  - Add storage quota checking and management methods
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 2.5 Write property tests for storage operations


  - **Property 11: Unique game identifiers**
  - **Property 13: Unique player identifiers**
  - **Property 24: Cascading deletion**
  - **Property 25: Database integrity on failure**
  - **Validates: Requirements 7.1, 7.3, 10.3, 10.4**

- [x] 3. Implement game management service





- [x] 3.1 Create GameService with game lifecycle methods


  - Implement createGame, getGame, listActiveGames methods
  - Add round progression logic
  - Implement game completion and final standings calculation
  - _Requirements: 7.1, 7.2, 7.4, 7.5, 9.5_

- [x] 3.2 Write property tests for game management


  - **Property 12: Game initialization**
  - **Property 14: Active games query completeness**
  - **Property 17: Round progression**
  - **Property 22: Game completion state**
  - **Validates: Requirements 7.4, 7.5, 8.4, 9.5**

- [x] 3.3 Implement score tracking and player management


  - Create addRoundScore method with player assignment
  - Implement score accumulation logic
  - Add methods for retrieving player scores and round history
  - _Requirements: 8.1, 8.2, 8.3, 8.5, 9.1, 9.2_

- [x] 3.4 Write property tests for score tracking


  - **Property 15: Score accumulation**
  - **Property 16: Round data completeness**
  - **Property 18: Player score display completeness**
  - **Property 19: Game state display completeness**
  - **Validates: Requirements 8.2, 8.3, 8.5, 9.1, 9.2**

- [x] 4. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement camera and image input module






- [x] 5.1 Create CameraModule with MediaDevices API


  - Implement camera permission request using navigator.mediaDevices.getUserMedia
  - Create camera component with video preview using HTML5 video element
  - Add image capture functionality using canvas to capture video frame
  - Implement file upload fallback for browsers without camera support
  - Handle camera errors and permission denial gracefully
  - _Requirements: 1.1, 1.2, 1.3, 12.3_

- [x] 5.2 Write property test for image capture


  - **Property 1: Image capture persistence**
  - **Validates: Requirements 1.2**

- [x] 5.3 Implement image storage with compression


  - Create utility for converting images to base64 data URLs
  - Implement canvas-based JPEG compression with quality optimization
  - Add methods to store/retrieve images from IndexedDB
  - _Requirements: 1.2, 10.5_

- [x] 5.4 Write property test for image compression


  - **Property 26: Image compression**
  - **Validates: Requirements 10.5**

- [-] 6. Implement image processing and detection engine



- [x] 6.1 Set up TensorFlow.js and load detection model


  - Initialize TensorFlow.js with WebGL backend
  - Load COCO-SSD or custom model for object detection
  - Implement model loading with error handling and loading states
  - Consider using Web Workers for non-blocking model loading
  - _Requirements: 2.1, 6.1, 6.2_

- [x] 6.2 Implement image preprocessing pipeline


  - Create image resizing and normalization functions using canvas
  - Convert image data URLs to tensors for TensorFlow.js
  - Add preprocessing for various lighting conditions
  - _Requirements: 2.4_

- [x] 6.3 Implement domino tile detection


  - Create detectDominoes method using TensorFlow.js model
  - Implement bounding box extraction and filtering
  - Add rotation-invariant detection logic
  - Filter out non-domino objects based on shape/aspect ratio
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 6.4 Write property tests for detection



  - **Property 2: Domino boundary detection**
  - **Property 3: Non-domino object exclusion**
  - **Property 4: Rotation invariance**
  - **Validates: Requirements 2.1, 2.3, 2.5**

- [x] 6.5 Implement pip counting for detected tiles





  - Create pip counting logic for each domino half
  - Handle blank tiles (0 pips) correctly
  - Support pip counts from 0-12 for different domino sets
  - Calculate confidence scores for each detection
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 11.4_

- [x] 6.6 Write property tests for pip counting





  - **Property 5: Complete pip counting**
  - **Property 6: Pip range accuracy**
  - **Property 7: Confidence reporting**
  - **Validates: Requirements 3.1, 3.3, 3.4, 3.5, 11.4**

- [x] 6.7 Implement result annotation and visualization





  - Create function to overlay bounding boxes on original image using canvas
  - Add pip count labels to each detected tile
  - Generate annotated image as data URL for user review
  - _Requirements: 4.1, 4.2_

- [x] 6.8 Write property test for detection annotation





  - **Property 8: Detection result annotation**
  - **Validates: Requirements 4.1, 4.2**

- [x] 7. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement manual correction functionality






- [x] 8.1 Create correction interface for adding/removing tiles


  - Implement UI for manual tile addition with touch/click support
  - Add tile removal functionality
  - Create pip count editing interface
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8.2 Implement real-time score updates during corrections


  - Add reactive score calculation on tile changes using React state
  - Update total score display immediately
  - Validate correction inputs
  - _Requirements: 5.3, 5.5_

- [x] 8.3 Write property tests for manual corrections


  - **Property 9: Manual correction consistency**
  - **Property 10: Correction persistence**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 9. Build UI components for camera and capture flow





- [x] 9.1 Create camera screen with viewfinder


  - Build camera view component with video preview
  - Add capture button with visual feedback
  - Implement file upload button as alternative
  - Add permission request UI with clear messaging
  - Make responsive for mobile and desktop
  - _Requirements: 1.1, 1.3, 12.3_

- [x] 9.2 Create image review screen


  - Display captured/uploaded image with process/retake options
  - Add loading indicator during processing
  - Show processing progress
  - _Requirements: 1.4, 6.3_

- [x] 9.3 Create detection results screen


  - Display annotated image with detected tiles
  - Show individual tile scores and total
  - Add accept/reject/correct action buttons
  - Implement tile detail view on click/tap
  - Make touch-friendly for mobile devices
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10. Build UI components for game management





- [x] 10.1 Create game creation screen


  - Build responsive form for player count and names
  - Add player profile creation with validation
  - Implement game initialization
  - _Requirements: 7.2, 7.3_

- [x] 10.2 Create player selection screen for score assignment


  - Display list of players in current game
  - Allow selection of player for round score
  - Show current scores for context
  - Make touch-friendly for mobile
  - _Requirements: 8.1_

- [x] 10.3 Create game list and detail screens


  - Build responsive active games list view
  - Create game detail screen with player scores
  - Display round history in chronological order
  - Implement round selection to view images
  - Add game completion functionality
  - _Requirements: 7.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10.4 Write property tests for game display


  - **Property 20: Historical round data retrieval**
  - **Property 21: Chronological round ordering**
  - **Validates: Requirements 9.3, 9.4**

- [x] 11. Implement error handling and user feedback





- [x] 11.1 Create error handling utilities


  - Implement error logging system (console and optional analytics)
  - Create user-friendly error message mapper
  - Add error recovery strategies
  - _Requirements: 12.4_

- [x] 11.2 Write property test for error handling


  - **Property 27: Error logging and user notification**
  - **Validates: Requirements 12.4**

- [x] 11.3 Add specific error screens and messages


  - Create "no dominoes detected" message with suggestions
  - Add "poor image quality" feedback with tips
  - Implement camera permission denied screen with file upload fallback
  - Add storage quota error notifications with cleanup options
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [x] 12. Final integration and polish










- [x] 12.1 Wire all components together in app routing


  - Set up React Router or similar for page navigation
  - Connect camera → detection → score assignment → game update flow
  - Implement navigation between game list and details
  - Add back navigation and state preservation
  - Ensure responsive layout works on mobile and desktop

- [x] 12.2 Add loading states and progress indicators


  - Implement loading spinners for async operations
  - Add progress bar for image processing
  - Show feedback during storage operations
  - _Requirements: 6.3_


- [x] 12.3 Optimize performance








  - Move image processing to Web Worker if possible
  - Implement image downsampling for faster detection
  - Add lazy loading and virtualization for game history
  - Use React.memo and useMemo for expensive computations
  - Enable TensorFlow.js WebGL backend
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 12.4 Write integration tests for complete flows




  - Test complete game flow: create → capture/upload → assign → view
  - Test multi-round game with multiple players
  - Test manual correction workflow
  - Test page refresh with data persistence
  - Test mobile viewport and touch interactions

- [x] 13. Implement authentication and user management






- [x] 13.1 Create AuthService for username-based authentication


  - Implement sign-in with username (create or retrieve user)
  - Store user session in localStorage
  - Add getCurrentUser and isAuthenticated methods
  - Handle sign-out functionality
  - _Requirements: 13.1, 13.2_

- [x] 13.2 Write property test for authentication


  - **Property 28: Username uniqueness**
  - **Validates: Requirements 13.2**

- [x] 13.3 Create sign-in UI component


  - Build username input form with validation
  - Add welcome screen for first-time users
  - Implement persistent session across page refreshes
  - Make responsive for mobile and desktop
  - _Requirements: 13.1_

- [x] 14. Set up cloud backend infrastructure





- [x] 14.1 Set up cloud database and API


  - Choose between AWS (DynamoDB + Lambda) or traditional (PostgreSQL + Express)
  - Create database tables: Users, CloudGames, CloudRounds, ErrorReports
  - Implement REST API endpoints for CRUD operations
  - Set up S3 bucket for image storage (optional, can use base64 in DB initially)
  - Configure CORS and security settings
  - _Requirements: 13.3, 14.1, 15.2_

- [x] 14.2 Implement CloudSyncService


  - Create methods for syncing games to cloud
  - Implement restoreGamesFromCloud for user sign-in
  - Add conflict resolution logic (use most recent timestamp)
  - Implement offline queue for sync operations
  - Add automatic sync on game create/update
  - _Requirements: 13.3, 13.4, 14.1, 14.2, 14.4, 14.5_

- [x] 14.3 Write property tests for cloud sync


  - **Property 29: Cloud sync persistence**
  - **Property 30: Cloud data restoration**
  - **Property 31: Conflict resolution consistency**
  - **Property 32: Offline sync queue**
  - **Validates: Requirements 13.3, 13.4, 14.1, 14.3, 14.4, 14.5**

- [x] 14.4 Add sync status UI indicators


  - Show sync status (synced, syncing, offline)
  - Display last sync timestamp
  - Add manual sync button
  - Show conflict resolution notifications
  - _Requirements: 14.1, 14.5_

- [-] 15. Implement error reporting system



- [x] 15.1 Create ErrorReportingService


  - Implement reportManualCorrection method
  - Add email sending via AWS SES or SendGrid
  - Include image, original detection, and corrections in report
  - Implement retry queue for failed reports
  - Add user privacy preference management
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 15.2 Write property tests for error reporting



  - **Property 33: Manual correction reporting**
  - **Property 34: Error report completeness**
  - **Property 35: Privacy preference respect**
  - **Validates: Requirements 15.1, 15.2, 15.3, 15.5**

- [x] 15.3 Integrate error reporting with manual correction UI





  - Trigger error report when user saves manual corrections
  - Add privacy opt-in/opt-out toggle in settings
  - Show confirmation when report is sent
  - Handle report failures gracefully
  - _Requirements: 15.1, 15.2, 15.5_

- [x] 15.4 Set up backend email endpoint





  - Create API endpoint to receive error reports
  - Configure email service (AWS SES or SendGrid)
  - Format email with diagnostic information
  - Store reports in database for tracking
  - _Requirements: 15.2, 15.3_

- [x] 16. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
