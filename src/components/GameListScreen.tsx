/**
 * Game list screen showing all active games
 * Requirements: 7.5
 */
import { useState, useEffect, useMemo, memo } from 'react';
import { gameService } from '../services/GameService';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import type { Game } from '../models';
import './GameListScreen.css';

interface GameListScreenProps {
  onGameSelect: (gameId: string) => void;
  onCreateGame: () => void;
  onSettings?: () => void;
}

export const GameListScreen = memo(function GameListScreen({ onGameSelect, onCreateGame, onSettings }: GameListScreenProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setIsLoading(true);
    setError('');
    try {
      const activeGames = await gameService.listActiveGames();
      setGames(activeGames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLeadingPlayer = (game: Game) => {
    if (game.players.length === 0) return null;
    // In domino scoring, lower score is better
    return game.players.reduce((leader, player) =>
      player.totalScore < leader.totalScore ? player : leader
    );
  };

  // Memoize formatted games to avoid recalculating on every render
  const formattedGames = useMemo(() => {
    return games.map(game => ({
      ...game,
      formattedDate: formatDate(game.createdAt),
      leader: getLeadingPlayer(game),
    }));
  }, [games]);

  return (
    <div className="game-list-screen">
      <div className="game-list-container">
        <header className="game-list-header">
          <h1>My Games</h1>
          <div className="header-actions">
            {onSettings && (
              <button
                type="button"
                onClick={onSettings}
                className="button button-secondary settings-button"
                aria-label="Settings"
              >
                ⚙️
              </button>
            )}
            <button
              type="button"
              onClick={onCreateGame}
              className="button button-primary"
            >
              + New Game
            </button>
          </div>
        </header>

        <SyncStatusIndicator />

        {error && (
          <div className="error-message" role="alert">
            {error}
            <button onClick={loadGames} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading games...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="empty-state">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <h2>No Active Games</h2>
            <p>Create a new game to get started!</p>
            <button
              type="button"
              onClick={onCreateGame}
              className="button button-primary"
            >
              Create Your First Game
            </button>
          </div>
        ) : (
          <div className="games-grid">
            {formattedGames.map((game) => (
              <button
                key={game.id}
                onClick={() => onGameSelect(game.id)}
                className="game-card"
                type="button"
              >
                <div className="game-card-header">
                  <span className="game-date">{game.formattedDate}</span>
                  <span className="game-round">Round {game.currentRound}</span>
                </div>

                <div className="game-card-body">
                  <div className="player-count">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{game.players.length} Players</span>
                  </div>

                  {game.leader && (
                    <div className="leader-info">
                      <span className="leader-label">Leading:</span>
                      <span className="leader-name">{game.leader.name}</span>
                      <span className="leader-score">({game.leader.totalScore})</span>
                    </div>
                  )}
                </div>

                <div className="game-card-footer">
                  <span className="view-details">View Details →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
