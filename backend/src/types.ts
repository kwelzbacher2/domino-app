/**
 * Type definitions for backend API
 */

export interface User {
  user_id: string;
  username: string;
  created_at: Date;
  last_sync_at?: Date;
}

export interface CloudPlayer {
  playerId: string;
  username: string;
  totalScore: number;
}

export interface CloudGame {
  game_id: string;
  user_id: string;
  game_name?: string;
  created_at: Date;
  updated_at: Date;
  current_round: number;
  status: 'active' | 'completed';
  player_count: number;
  players: CloudPlayer[];
}

export interface CloudRound {
  round_id: string;
  game_id: string;
  player_id: string;
  round_number: number;
  score: number;
  image_data?: string;
  timestamp: Date;
  detection_result?: {
    tilesDetected: number;
    confidence: number;
    manualCorrections?: any[];
  };
}

export interface ErrorReport {
  report_id: string;
  user_id: string;
  game_id?: string;
  round_id?: string;
  image_data?: string;
  original_detection: string;
  corrected_tiles: string;
  timestamp: Date;
  processed: boolean;
}
