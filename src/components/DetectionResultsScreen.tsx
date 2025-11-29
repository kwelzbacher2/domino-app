/**
 * DetectionResultsScreen Component - Display detection results with annotations
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 * 
 * Provides:
 * - Display annotated image with detected tiles
 * - Show individual tile scores and total
 * - Accept/reject/correct action buttons
 * - Tile detail view on click/tap
 * - Touch-friendly for mobile devices
 */

import { useState, memo } from 'react';
import type { DetectionResult, DetectedTile } from '../models/types';
import './DetectionResultsScreen.css';

interface DetectionResultsScreenProps {
  result: DetectionResult;
  onAccept: (result: DetectionResult) => void;
  onCorrect: (result: DetectionResult) => void;
  onReject: () => void;
  onCancel?: () => void;
}

export const DetectionResultsScreen = memo(function DetectionResultsScreen({
  result,
  onAccept,
  onCorrect,
  onReject,
  onCancel,
}: DetectionResultsScreenProps) {
  const [selectedTile, setSelectedTile] = useState<DetectedTile | null>(null);
  const [showTileList, setShowTileList] = useState(false);

  const handleTileClick = (tile: DetectedTile) => {
    setSelectedTile(tile);
  };

  const closeTileDetail = () => {
    setSelectedTile(null);
  };

  const toggleTileList = () => {
    setShowTileList(!showTileList);
  };

  return (
    <div className="detection-results-screen">
      <div className="detection-results-header">
        <h1>Detection Results</h1>
        {onCancel && (
          <button onClick={onCancel} className="btn-close" type="button" aria-label="Close">
            ×
          </button>
        )}
      </div>

      <div className="detection-results-content">
        {/* Annotated Image */}
        <div className="annotated-image-container">
          <img
            src={result.processedImage}
            alt="Detected dominoes with annotations"
            className="annotated-image"
          />
          
          {/* Detection Summary Overlay */}
          <div className="detection-summary">
            <div className="summary-item">
              <span className="summary-label">Tiles Found:</span>
              <span className="summary-value">{result.tiles.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Score:</span>
              <span className="summary-value total-score">{result.totalScore}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Confidence:</span>
              <span className={`summary-value confidence ${getConfidenceClass(result.confidence)}`}>
                {Math.round(result.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Tile List Toggle */}
        <button
          onClick={toggleTileList}
          className="tile-list-toggle"
          type="button"
        >
          <span>{showTileList ? '▼' : '▲'}</span>
          {showTileList ? 'Hide' : 'Show'} Tile Details ({result.tiles.length})
        </button>

        {/* Tile List */}
        {showTileList && (
          <div className="tile-list">
            <h3>Detected Tiles</h3>
            <div className="tile-grid">
              {result.tiles.map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(tile)}
                  className="tile-card"
                  type="button"
                >
                  <div className="tile-pips">
                    {tile.rightPips === 0 ? (
                      <span className="pip-value">{tile.leftPips}</span>
                    ) : (
                      <>
                        <span className="pip-value">{tile.leftPips}</span>
                        <span className="pip-separator">|</span>
                        <span className="pip-value">{tile.rightPips}</span>
                      </>
                    )}
                  </div>
                  <div className="tile-score">
                    Score: <strong>{tile.totalPips}</strong>
                  </div>
                  <div className="tile-confidence">
                    {Math.round(tile.confidence * 100)}% confident
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Low Confidence Warning */}
        {result.confidence < 0.7 && (
          <div className="warning-message">
            <span className="warning-icon">⚠️</span>
            <div>
              <strong>Low Confidence Detection</strong>
              <p>The detection confidence is below 70%. Please review the results carefully or consider retaking the photo.</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="detection-actions">
          <button
            onClick={onReject}
            className="btn-reject"
            type="button"
          >
            <span className="btn-icon">✕</span>
            Reject
          </button>
          
          <button
            onClick={() => onCorrect(result)}
            className="btn-correct"
            type="button"
          >
            <span className="btn-icon">✏️</span>
            Correct
          </button>
          
          <button
            onClick={() => onAccept(result)}
            className="btn-accept"
            type="button"
          >
            <span className="btn-icon">✓</span>
            Accept
          </button>
        </div>
      </div>

      {/* Tile Detail Modal */}
      {selectedTile && (
        <div className="tile-detail-modal" onClick={closeTileDetail}>
          <div className="tile-detail-content" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeTileDetail}
              className="modal-close"
              type="button"
              aria-label="Close"
            >
              ×
            </button>
            
            <h2>Tile Details</h2>
            
            <div className="tile-detail-visual">
              <div className="domino-visual">
                {selectedTile.rightPips === 0 ? (
                  <div className="domino-half-single">
                    <span className="domino-pips">{selectedTile.leftPips}</span>
                  </div>
                ) : (
                  <>
                    <div className="domino-half">
                      <span className="domino-pips">{selectedTile.leftPips}</span>
                    </div>
                    <div className="domino-divider"></div>
                    <div className="domino-half">
                      <span className="domino-pips">{selectedTile.rightPips}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="tile-detail-info">
              {selectedTile.rightPips === 0 ? (
                <div className="detail-row">
                  <span className="detail-label">Pip Count:</span>
                  <span className="detail-value">{selectedTile.leftPips}</span>
                </div>
              ) : (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Left Pips:</span>
                    <span className="detail-value">{selectedTile.leftPips}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Right Pips:</span>
                    <span className="detail-value">{selectedTile.rightPips}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Total Score:</span>
                    <span className="detail-value total">{selectedTile.totalPips}</span>
                  </div>
                </>
              )}
              <div className="detail-row">
                <span className="detail-label">Confidence:</span>
                <span className={`detail-value ${getConfidenceClass(selectedTile.confidence)}`}>
                  {Math.round(selectedTile.confidence * 100)}%
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Position:</span>
                <span className="detail-value">
                  ({Math.round(selectedTile.boundingBox.x)}, {Math.round(selectedTile.boundingBox.y)})
                </span>
              </div>
            </div>

            <button
              onClick={closeTileDetail}
              className="btn-primary btn-large"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// Helper function to get confidence class
function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}
