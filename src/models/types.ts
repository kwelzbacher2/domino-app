/**
 * Core data models for the Domino Score Counter application
 */

/**
 * Bounding box coordinates for a detected domino tile
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * A detected domino tile with pip counts and confidence
 */
export interface DetectedTile {
  id: string;
  boundingBox: BoundingBox;
  leftPips: number;
  rightPips: number;
  totalPips: number;
  confidence: number;
}

/**
 * Result of domino detection on an image
 */
export interface DetectionResult {
  tiles: DetectedTile[];
  totalScore: number;
  confidence: number;
  processedImage: string; // base64 data URL with annotations
}

/**
 * Score for a single round of play
 */
export interface RoundScore {
  roundNumber: number;
  score: number;
  imageDataUrl: string;
  timestamp: Date;
  detectionResult?: {
    tilesDetected: number;
    confidence: number;
    manualCorrections?: any[];
  };
}

/**
 * A player in a game
 */
export interface Player {
  id: string;
  name: string;
  totalScore: number;
  rounds: RoundScore[];
}

/**
 * A domino game with players and rounds
 */
export interface Game {
  id: string;
  createdAt: Date;
  currentRound: number;
  players: Player[];
  status: 'active' | 'completed';
}

/**
 * IndexedDB record for a game
 */
export interface GameRecord {
  id: string; // Primary key
  createdAt: string; // ISO date string
  currentRound: number;
  status: 'active' | 'completed';
  playerCount: number;
  players: Player[]; // Embedded player data
}

/**
 * IndexedDB record for a round
 */
export interface RoundRecord {
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

/**
 * Image data captured from camera or file upload
 */
export interface ImageData {
  dataUrl: string; // base64 encoded image
  width: number;
  height: number;
  timestamp: Date;
}

/**
 * Summary of a completed game
 */
export interface GameSummary {
  gameId: string;
  players: Array<{
    id: string;
    name: string;
    totalScore: number;
    rank: number;
  }>;
  totalRounds: number;
  completedAt: Date;
}

/**
 * User account for authentication
 */
export interface User {
  id: string;
  username: string;
  createdAt: Date;
}
