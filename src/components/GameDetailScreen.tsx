/**
 * Game detail screen showing player scores and round history
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { gameService } from '../services/GameService';
import type { Game, Player } from '../models';
import { VirtualList } from './VirtualList';
import './GameDetailScreen.css';

interface GameDetailScreenProps {
  gameId: string;
  onBack: () => void;
  onAddRound?: () => void;
}

interface RoundHistoryItem {
  roundNumber: number;
  playerId: string;
  playerName: string;
  score: number;
  timestamp: Date;
  imageDataUrl: string;
}

// Memoized round item component for better performance
const RoundItem = memo(function RoundItem({
  round,
  onSelect,
}: {
  round: RoundHistoryItem;
  onSelect: (round: RoundHistoryItem) => void;
}) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <button
      onClick={() => onSelect(round)}
      className="round-item"
      type="button"
    >
      <div className="round-number">R{round.roundNumber}</div>
      <div className="round-details">
        <span className="round-player">{round.playerName}</span>
        <span className="round-time">{formatTime(round.timestamp)}</span>
      </div>
      <div className="round-score">{round.score}</div>
    </button>
  );
});

// Memoized modal component with lazy image loading
const RoundModal = memo(function RoundModal({
  round,
  onClose,
}: {
  round: RoundHistoryItem;
  onClose: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatTime = useCallback((date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  return (
    <div className="round-modal-overlay" onClick={onClose}>
      <div className="round-modal" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="modal-close"
          type="button"
        >
          ×
        </button>
        <h3>Round {round.roundNumber}</h3>
        <div className="modal-info">
          <p>
            <strong>Player:</strong> {round.playerName}
          </p>
          <p>
            <strong>Score:</strong> {round.score}
          </p>
          <p>
            <strong>Time:</strong> {formatTime(round.timestamp)}
          </p>
        </div>
        <div className="modal-image">
          {!imageLoaded && (
            <div className="image-loading">
              <div className="spinner" />
            </div>
          )}
          <img
            src={round.imageDataUrl}
            alt={`Round ${round.roundNumber}`}
            onLoad={() => setImageLoaded(true)}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
        </div>
      </div>
    </div>
  );
});

export const GameDetailScreen = memo(function GameDetailScreen({ gameId, onBack, onAddRound }: GameDetailScreenProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);
  const [selectedRound, setSelectedRound] = useState<RoundHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isEndingGame, setIsEndingGame] = useState(false);

  useEffect(() => {
    loadGameData();
  }, [gameId]);

  const loadGameData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [gameData, history] = await Promise.all([
        gameService.getGame(gameId),
        gameService.getRoundHistory(gameId),
      ]);
      setGame(gameData);
      setRoundHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndGame = useCallback(async () => {
    if (!game) return;

    const confirmed = window.confirm(
      'Are you sure you want to end this game? This action cannot be undone.'
    );

    if (!confirmed) return;

    setIsEndingGame(true);
    try {
      await gameService.endGame(gameId);
      await loadGameData(); // Reload to show completed status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end game');
    } finally {
      setIsEndingGame(false);
    }
  }, [game, gameId]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSortedPlayers = (players: Player[]) => {
    // In domino scoring, lower score is better
    return [...players].sort((a, b) => a.totalScore - b.totalScore);
  };

  // Memoize sorted players to avoid recalculating on every render
  const sortedPlayers = useMemo(() => {
    return game ? getSortedPlayers(game.players) : [];
  }, [game]);

  if (isLoading) {
    return (
      <div className="game-detail-screen">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="game-detail-screen">
        <div className="error-state">
          <p>{error || 'Game not found'}</p>
          <button onClick={onBack} className="button button-primary">
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-detail-screen">
      <div className="game-detail-container">
        <header className="game-detail-header">
          <button onClick={onBack} className="back-button" type="button">
            ← Back
          </button>
          <div className="game-title">
            <h1>Game Details</h1>
            <span className="game-date">{formatDate(game.createdAt)}</span>
          </div>
          {game.status === 'active' && onAddRound && (
            <button onClick={onAddRound} className="button button-primary">
              + Add Round
            </button>
          )}
        </header>

        <div className="game-status-bar">
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className={`status-badge ${game.status}`}>
              {game.status === 'active' ? 'Active' : 'Completed'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Current Round:</span>
            <span className="status-value">{game.currentRound}</span>
          </div>
        </div>

        <section className="players-section">
          <h2>Player Standings</h2>
          <div className="players-list">
            {sortedPlayers.map((player, index) => (
              <div key={player.id} className="player-row">
                <div className="player-rank">#{index + 1}</div>
                <div className="player-details">
                  <span className="player-name">{player.name}</span>
                  <span className="player-rounds">{player.rounds.length} rounds</span>
                </div>
                <div className="player-total-score">{player.totalScore}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounds-section">
          <h2>Round History</h2>
          {roundHistory.length === 0 ? (
            <div className="empty-rounds">
              <p>No rounds played yet</p>
            </div>
          ) : roundHistory.length <= 20 ? (
            <div className="rounds-list">
              {/* For small lists, render all items directly */}
              {roundHistory.map((round) => (
                <RoundItem
                  key={`${round.roundNumber}-${round.playerId}`}
                  round={round}
                  onSelect={setSelectedRound}
                />
              ))}
            </div>
          ) : (
            <VirtualList
              items={roundHistory}
              itemHeight={72}
              containerHeight={500}
              renderItem={(round) => (
                <RoundItem
                  key={`${round.roundNumber}-${round.playerId}`}
                  round={round}
                  onSelect={setSelectedRound}
                />
              )}
              overscan={5}
            />
          )}
        </section>

        {game.status === 'active' && (
          <div className="game-actions">
            <button
              onClick={handleEndGame}
              className="button button-danger"
              disabled={isEndingGame}
            >
              {isEndingGame ? 'Ending Game...' : 'End Game'}
            </button>
          </div>
        )}
      </div>

      {selectedRound && (
        <RoundModal
          round={selectedRound}
          onClose={() => setSelectedRound(null)}
        />
      )}
    </div>
  );
});
