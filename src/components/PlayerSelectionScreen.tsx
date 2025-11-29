/**
 * Player selection screen for assigning round scores
 * Requirements: 8.1
 */
import { useState } from 'react';
import type { Game, Player } from '../models';
import './PlayerSelectionScreen.css';

interface PlayerSelectionScreenProps {
  game: Game;
  roundScore: number;
  imageDataUrl: string;
  onPlayerSelected: (playerId: string, scoreAnother?: boolean) => Promise<void>;
  onCancel?: () => void;
}

export function PlayerSelectionScreen({
  game,
  roundScore,
  imageDataUrl,
  onPlayerSelected,
  onCancel,
}: PlayerSelectionScreenProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handlePlayerSelect = (playerId: string) => {
    if (!isSaving) {
      setSelectedPlayerId(playerId);
    }
  };

  const handleConfirm = async (scoreAnother: boolean = false) => {
    if (selectedPlayerId && !isSaving) {
      setIsSaving(true);
      try {
        await onPlayerSelected(selectedPlayerId, scoreAnother);
      } catch (error) {
        // If there's an error, re-enable the buttons
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="player-selection-screen">
      <div className="player-selection-container">
        <h1>Assign Score</h1>

        <div className="score-info">
          <div className="score-preview">
            <img src={imageDataUrl} alt="Round result" className="preview-image" />
          </div>
          <div className="score-value">
            <span className="score-label">Round Score:</span>
            <span className="score-number">{roundScore}</span>
          </div>
        </div>

        <div className="game-info">
          <h2>Round {game.currentRound}</h2>
          <p className="instruction">Select the player who scored this round:</p>
        </div>

        <div className="player-list">
          {game.players.map((player: Player) => (
            <button
              key={player.id}
              onClick={() => handlePlayerSelect(player.id)}
              className={`player-card ${selectedPlayerId === player.id ? 'selected' : ''}`}
              type="button"
            >
              <div className="player-info">
                <span className="player-name">{player.name}</span>
                <span className="player-score">Current: {player.totalScore}</span>
              </div>
              <div className="selection-indicator">
                {selectedPlayerId === player.id && (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="button-group">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="button button-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => handleConfirm(true)}
            className="button button-secondary"
            disabled={!selectedPlayerId || isSaving}
          >
            {isSaving ? 'Saving...' : '✓ Save & Score Another Player'}
          </button>
          <button
            type="button"
            onClick={() => handleConfirm(false)}
            className="button button-primary"
            disabled={!selectedPlayerId || isSaving}
          >
            {isSaving ? 'Saving...' : '✓ Save & Finish Round'}
          </button>
        </div>
      </div>
    </div>
  );
}
