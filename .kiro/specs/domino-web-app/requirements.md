# Requirements Document

## Introduction

This document specifies the requirements for a web application that automatically counts the score of dominoes remaining at the end of each round. The system uses image recognition to identify dominoes from a photograph and calculates the total pip count, streamlining the scoring process during domino games. The application is designed to work on desktop and mobile browsers with responsive touch-friendly interfaces.

## Glossary

- **Domino Score Counter**: The web application system that processes domino images and calculates scores
- **Pip**: A single dot on a domino tile representing one point
- **Domino Tile**: A rectangular game piece divided into two squares, each containing 0-6 pips
- **Round**: A single play session ending when a player runs out of tiles or no valid moves remain
- **Game**: A complete domino game consisting of multiple rounds with tracked players and scores
- **Player**: A participant in a game with a unique identifier and score tracking
- **Pip Count**: The total number of pips visible on all domino tiles in an image
- **Game Session**: A database record containing game metadata and associated player scores
- **Username**: A unique identifier chosen by the user for authentication and game association
- **Cloud Database**: A remote database service (DynamoDB or PostgreSQL) that stores game data for backup and cross-device access
- **Cloud Sync**: The process of synchronizing local game data with the cloud database
- **Error Report**: A diagnostic message sent to the developer containing detection issues and manual corrections
- **Manual Correction**: User modifications to automatically detected domino tiles or pip counts

## Requirements

### Requirement 1

**User Story:** As a domino player, I want to take a photo of the remaining dominoes at the end of a round, so that the app can automatically calculate the score without manual counting.

#### Acceptance Criteria

1. WHEN a user opens the camera interface THEN the Domino Score Counter SHALL display a video preview with capture controls or file upload option
2. WHEN a user captures an image or uploads a file THEN the Domino Score Counter SHALL store the image for processing
3. WHEN an image is captured or uploaded THEN the Domino Score Counter SHALL provide visual feedback confirming the capture
4. WHEN the user reviews a captured image THEN the Domino Score Counter SHALL display options to process or retake the photo

### Requirement 2

**User Story:** As a domino player, I want the app to detect all domino tiles in my photo, so that no tiles are missed in the score calculation.

#### Acceptance Criteria

1. WHEN an image contains domino tiles THEN the Domino Score Counter SHALL identify the boundaries of each tile
2. WHEN domino tiles overlap partially in the image THEN the Domino Score Counter SHALL detect each tile separately
3. WHEN the image contains non-domino objects THEN the Domino Score Counter SHALL exclude those objects from detection
4. WHEN lighting conditions vary across the image THEN the Domino Score Counter SHALL detect tiles regardless of lighting variations
5. WHEN tiles are oriented at different angles THEN the Domino Score Counter SHALL detect tiles in any orientation

### Requirement 3

**User Story:** As a domino player, I want the app to count the pips on each detected domino, so that I get an accurate total score.

#### Acceptance Criteria

1. WHEN a domino tile is detected THEN the Domino Score Counter SHALL count the pips on both halves of the tile
2. WHEN a domino half contains zero pips THEN the Domino Score Counter SHALL recognize it as a blank and contribute zero to the count
3. WHEN pips range from one to six on a domino half THEN the Domino Score Counter SHALL accurately count each configuration
4. WHEN the pip counting is complete for all tiles THEN the Domino Score Counter SHALL sum the total pip count
5. WHEN image quality affects pip visibility THEN the Domino Score Counter SHALL handle unclear pips and report confidence levels

### Requirement 4

**User Story:** As a domino player, I want to see which dominoes were detected and their individual scores, so that I can verify the accuracy before accepting the total.

#### Acceptance Criteria

1. WHEN processing is complete THEN the Domino Score Counter SHALL display the original image with detected tiles highlighted
2. WHEN tiles are highlighted THEN the Domino Score Counter SHALL overlay the pip count for each tile
3. WHEN a user taps a highlighted tile THEN the Domino Score Counter SHALL display detailed information about that tile
4. WHEN the user reviews results THEN the Domino Score Counter SHALL provide options to accept or reject the count
5. WHEN a user rejects the count THEN the Domino Score Counter SHALL allow manual correction or image retake

### Requirement 5

**User Story:** As a domino player, I want to manually adjust the count if the app makes a mistake, so that I can ensure the final score is correct.

#### Acceptance Criteria

1. WHEN a user enters manual correction mode THEN the Domino Score Counter SHALL allow adding undetected tiles
2. WHEN a user enters manual correction mode THEN the Domino Score Counter SHALL allow removing incorrectly detected tiles
3. WHEN a user modifies a tile's pip count THEN the Domino Score Counter SHALL update the total score immediately
4. WHEN manual corrections are made THEN the Domino Score Counter SHALL maintain a record of the adjustments
5. WHEN the user completes corrections THEN the Domino Score Counter SHALL display the final adjusted total

### Requirement 6

**User Story:** As a domino player, I want the app to work quickly, so that scoring doesn't slow down our game.

#### Acceptance Criteria

1. WHEN an image is submitted for processing THEN the Domino Score Counter SHALL complete detection within five seconds
2. WHEN pip counting begins THEN the Domino Score Counter SHALL complete counting within three seconds
3. WHEN processing occurs THEN the Domino Score Counter SHALL display a progress indicator
4. WHEN the device has limited processing power THEN the Domino Score Counter SHALL optimize performance for mobile hardware

### Requirement 7

**User Story:** As a domino player, I want to create and manage games with multiple players, so that the app tracks who is playing and their individual scores.

#### Acceptance Criteria

1. WHEN a user creates a new game THEN the Domino Score Counter SHALL generate a unique game identifier
2. WHEN creating a game THEN the Domino Score Counter SHALL allow the user to specify the number of players
3. WHEN adding players to a game THEN the Domino Score Counter SHALL create or select player profiles with unique identifiers
4. WHEN a game is created THEN the Domino Score Counter SHALL store the game date and initialize the current round to one
5. WHEN a user views active games THEN the Domino Score Counter SHALL display all games with their players and current status

### Requirement 8

**User Story:** As a domino player, I want to assign each round's score to a specific player, so that individual scores are tracked accurately throughout the game.

#### Acceptance Criteria

1. WHEN a score is calculated from an image THEN the Domino Score Counter SHALL prompt the user to select which player the score belongs to
2. WHEN a player is selected THEN the Domino Score Counter SHALL add the round score to that player's total score
3. WHEN a round score is recorded THEN the Domino Score Counter SHALL store the round number, score value, and timestamp
4. WHEN a round is completed THEN the Domino Score Counter SHALL increment the game's current round number
5. WHEN viewing a player's scores THEN the Domino Score Counter SHALL display all round scores and the cumulative total

### Requirement 9

**User Story:** As a domino player, I want to view the complete game history with all players and their scores, so that I can see who is winning and review past rounds.

#### Acceptance Criteria

1. WHEN a user views a game THEN the Domino Score Counter SHALL display all players with their current total scores
2. WHEN viewing game details THEN the Domino Score Counter SHALL show each round with the player who scored and the points
3. WHEN a user selects a historical round THEN the Domino Score Counter SHALL display the associated image and detected tiles
4. WHEN a game has multiple rounds THEN the Domino Score Counter SHALL display rounds in chronological order
5. WHEN a user ends a game THEN the Domino Score Counter SHALL mark the game as complete and display final standings

### Requirement 10

**User Story:** As a domino player, I want the app to persist all game data locally, so that I can access my game history even without an internet connection and data survives app restarts.

#### Acceptance Criteria

1. WHEN game data is created or modified THEN the Domino Score Counter SHALL store it in browser local storage that persists across sessions
2. WHEN the app loads THEN the Domino Score Counter SHALL load existing games and players from browser storage
3. WHEN a user deletes a game THEN the Domino Score Counter SHALL remove the game and associated round data from storage
4. WHEN storage operations fail THEN the Domino Score Counter SHALL maintain data integrity and notify the user
5. WHEN storing round images THEN the Domino Score Counter SHALL optimize storage to manage browser storage limits efficiently

### Requirement 11

**User Story:** As a domino player, I want the app to handle different domino sets and styles, so that it works with whatever dominoes we're using.

#### Acceptance Criteria

1. WHEN dominoes have different background colors THEN the Domino Score Counter SHALL detect tiles regardless of color
2. WHEN dominoes have different sizes THEN the Domino Score Counter SHALL detect tiles of varying dimensions
3. WHEN dominoes use different pip styles THEN the Domino Score Counter SHALL recognize circular, square, or other pip shapes
4. WHEN dominoes are double-six, double-nine, or double-twelve sets THEN the Domino Score Counter SHALL count pips up to the maximum value

### Requirement 12

**User Story:** As a domino player, I want clear error messages when something goes wrong, so that I know how to fix the problem.

#### Acceptance Criteria

1. WHEN no dominoes are detected in an image THEN the Domino Score Counter SHALL display a message suggesting image retake or upload
2. WHEN image quality is too poor for processing THEN the Domino Score Counter SHALL notify the user with improvement suggestions
3. WHEN camera permissions are denied THEN the Domino Score Counter SHALL display a message explaining how to enable permissions and offer file upload alternative
4. WHEN processing fails unexpectedly THEN the Domino Score Counter SHALL log the error and provide a user-friendly message
5. IF an error occurs during score saving THEN the Domino Score Counter SHALL notify the user and offer retry options

### Requirement 13

**User Story:** As a domino player, I want to sign in with a username, so that my games are backed up to the cloud and accessible from any device.

#### Acceptance Criteria

1. WHEN a user opens the app for the first time THEN the Domino Score Counter SHALL prompt for a username
2. WHEN a username is entered THEN the Domino Score Counter SHALL store the username and associate it with the user session
3. WHEN a user creates or updates a game THEN the Domino Score Counter SHALL sync the game data to the cloud database
4. WHEN a user signs in on a different device THEN the Domino Score Counter SHALL load all games associated with that username from the cloud
5. WHEN cloud sync fails THEN the Domino Score Counter SHALL continue using local storage and retry sync when connection is restored

### Requirement 14

**User Story:** As a domino player, I want my games to be backed up automatically, so that I don't lose my game history if I clear my browser cache.

#### Acceptance Criteria

1. WHEN game data is saved locally THEN the Domino Score Counter SHALL automatically sync the data to the cloud database
2. WHEN the app loads THEN the Domino Score Counter SHALL check for cloud data and merge it with local data
3. WHEN local storage is cleared THEN the Domino Score Counter SHALL restore games from the cloud database on next sign-in
4. WHEN a conflict exists between local and cloud data THEN the Domino Score Counter SHALL use the most recent timestamp to resolve conflicts
5. WHEN the user is offline THEN the Domino Score Counter SHALL queue sync operations and execute them when connection is restored

### Requirement 15

**User Story:** As the app developer, I want to receive reports when users manually adjust detection results, so that I can identify and fix detection bugs.

#### Acceptance Criteria

1. WHEN a user makes manual corrections to detected tiles THEN the Domino Score Counter SHALL capture the original detection result and the manual adjustments
2. WHEN manual corrections are saved THEN the Domino Score Counter SHALL send an error report to the developer email
3. WHEN sending an error report THEN the Domino Score Counter SHALL include the original image, detected tiles, corrected tiles, and user identifier
4. WHEN the error report fails to send THEN the Domino Score Counter SHALL queue the report for retry
5. WHEN the user opts out of error reporting THEN the Domino Score Counter SHALL respect the privacy preference and not send reports
