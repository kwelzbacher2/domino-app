/**
 * Game creation screen component
 * Requirements: 7.2, 7.3
 */
import { useState } from 'react';
import { gameService } from '../services/GameService';
import type { Game } from '../models';
import './GameCreationScreen.css';

interface GameCreationScreenProps {
  onGameCreated: (game: Game) => void;
  onCancel?: () => void;
}

export function GameCreationScreen({ onGameCreated, onCancel }: GameCreationScreenProps) {
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>('');

  const handlePlayerCountChange = (count: number) => {
    if (count < 2 || count > 10) return;
    
    setPlayerCount(count);
    
    // Adjust player names array
    const newNames = [...playerNames];
    if (count > playerNames.length) {
      // Add empty names for new players
      while (newNames.length < count) {
        newNames.push('');
      }
    } else {
      // Remove excess names
      newNames.splice(count);
    }
    setPlayerNames(newNames);
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const validateForm = (): boolean => {
    // Check all names are filled
    for (let i = 0; i < playerCount; i++) {
      if (!playerNames[i] || playerNames[i].trim() === '') {
        setError(`Please enter a name for Player ${i + 1}`);
        return false;
      }
    }

    // Check for duplicate names
    const uniqueNames = new Set(playerNames.slice(0, playerCount).map(n => n.trim().toLowerCase()));
    if (uniqueNames.size !== playerCount) {
      setError('Player names must be unique');
      return false;
    }

    return true;
  };

  const handleCreateGame = async () => {
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const trimmedNames = playerNames.slice(0, playerCount).map(n => n.trim());
      const game = await gameService.createGame(playerCount, trimmedNames);
      onGameCreated(game);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="game-creation-screen">
      <div className="game-creation-container">
        <h1>Create New Game</h1>

        <div className="form-section">
          <label htmlFor="player-count">Number of Players</label>
          <div className="player-count-selector">
            <button
              type="button"
              onClick={() => handlePlayerCountChange(playerCount - 1)}
              disabled={playerCount <= 2}
              className="count-button"
              aria-label="Decrease player count"
            >
              −
            </button>
            <input
              id="player-count"
              type="number"
              min="2"
              max="10"
              value={playerCount}
              onChange={(e) => handlePlayerCountChange(parseInt(e.target.value) || 2)}
              className="count-input"
            />
            <button
              type="button"
              onClick={() => handlePlayerCountChange(playerCount + 1)}
              disabled={playerCount >= 10}
              className="count-button"
              aria-label="Increase player count"
            >
              +
            </button>
          </div>
          <p className="help-text">Choose between 2 and 10 players</p>
        </div>

        <div className="form-section">
          <label>Player Names</label>
          <div className="player-names-list">
            {Array.from({ length: playerCount }).map((_, index) => (
              <div key={index} className="player-name-input-group">
                <label htmlFor={`player-${index}`} className="player-label">
                  Player {index + 1}
                </label>
                <input
                  id={`player-${index}`}
                  type="text"
                  value={playerNames[index] || ''}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                  placeholder={`Enter name for Player ${index + 1}`}
                  className="player-name-input"
                  maxLength={30}
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div className="button-group">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="button button-secondary"
              disabled={isCreating}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleCreateGame}
            className="button button-primary"
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
