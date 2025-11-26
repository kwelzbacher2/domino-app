-- Database schema for Domino Score Counter cloud backend

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_sync_at TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);

-- Cloud Games table
CREATE TABLE IF NOT EXISTS cloud_games (
  game_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  game_name VARCHAR(255),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_round INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'completed')),
  player_count INTEGER NOT NULL,
  players JSONB NOT NULL
);

CREATE INDEX idx_cloud_games_user_id ON cloud_games(user_id);
CREATE INDEX idx_cloud_games_status ON cloud_games(status);
CREATE INDEX idx_cloud_games_updated_at ON cloud_games(updated_at);

-- Cloud Rounds table
CREATE TABLE IF NOT EXISTS cloud_rounds (
  round_id VARCHAR(255) PRIMARY KEY,
  game_id VARCHAR(255) NOT NULL REFERENCES cloud_games(game_id) ON DELETE CASCADE,
  player_id VARCHAR(255) NOT NULL,
  round_number INTEGER NOT NULL,
  score INTEGER NOT NULL,
  image_data TEXT,
  timestamp TIMESTAMP NOT NULL,
  detection_result JSONB
);

CREATE INDEX idx_cloud_rounds_game_id ON cloud_rounds(game_id);
CREATE INDEX idx_cloud_rounds_player_id ON cloud_rounds(player_id);
CREATE INDEX idx_cloud_rounds_timestamp ON cloud_rounds(timestamp);

-- Error Reports table
CREATE TABLE IF NOT EXISTS error_reports (
  report_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  game_id VARCHAR(255),
  round_id VARCHAR(255),
  image_data TEXT,
  original_detection TEXT NOT NULL,
  corrected_tiles TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_error_reports_user_id ON error_reports(user_id);
CREATE INDEX idx_error_reports_processed ON error_reports(processed);
CREATE INDEX idx_error_reports_timestamp ON error_reports(timestamp);
