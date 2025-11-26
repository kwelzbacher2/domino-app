/**
 * Manual correction interface for adding/removing tiles and editing pip counts
 * Requirements: 5.1, 5.2, 5.3, 15.1, 15.2, 15.5
 */

import React, { useState } from 'react';
import type { DetectedTile, DetectionResult } from '../models/types';
import { CorrectionService } from '../services/CorrectionService';
import { errorReportingService } from '../services/ErrorReportingService';
import { authService } from '../services/AuthService';
import './ManualCorrection.css';

interface ManualCorrectionProps {
  detectionResult: DetectionResult;
  gameId?: string;
  roundId?: string;
  imageDataUrl?: string;
  onSave: (correctedResult: DetectionResult) => void;
  onCancel: () => void;
}

export const ManualCorrection: React.FC<ManualCorrectionProps> = ({
  detectionResult,
  gameId,
  roundId,
  imageDataUrl,
  onSave,
  onCancel,
}) => {
  const [tiles, setTiles] = useState<DetectedTile[]>(detectionResult.tiles);
  const [editingTileId, setEditingTileId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTileLeft, setNewTileLeft] = useState(0);
  const [newTileRight, setNewTileRight] = useState(0);
  const [reportStatus, setReportStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [showReportNotification, setShowReportNotification] = useState(false);
  
  const correctionService = new CorrectionService();

  const totalScore = correctionService.calculateTotalScore(tiles);

  const handleAddTile = () => {
    const updatedTiles = correctionService.addTile(tiles, newTileLeft, newTileRight);
    setTiles(updatedTiles);
    setNewTileLeft(0);
    setNewTileRight(0);
    setShowAddForm(false);
  };

  const handleRemoveTile = (tileId: string) => {
    const updatedTiles = correctionService.removeTile(tiles, tileId);
    setTiles(updatedTiles);
  };

  const handleUpdateTile = (tileId: string, leftPips: number, rightPips: number) => {
    const updatedTiles = correctionService.updateTilePips(tiles, tileId, leftPips, rightPips);
    setTiles(updatedTiles);
    setEditingTileId(null);
  };

  const handleSave = async () => {
    const correctedResult = correctionService.createCorrectedResult(detectionResult, tiles);
    
    // Send error report if corrections were made and user has opted in
    const hasCorrections = 
      tiles.length !== detectionResult.tiles.length ||
      tiles.some((tile, idx) => {
        const original = detectionResult.tiles[idx];
        return !original || 
               tile.leftPips !== original.leftPips || 
               tile.rightPips !== original.rightPips;
      });

    if (hasCorrections && gameId && imageDataUrl) {
      const currentUser = authService.getCurrentUser();
      const userId = currentUser?.id || 'anonymous';
      const reportRoundId = roundId || `temp-${Date.now()}`;

      try {
        setReportStatus('sending');
        await errorReportingService.reportManualCorrection(
          userId,
          gameId,
          reportRoundId,
          imageDataUrl,
          detectionResult.tiles,
          tiles
        );
        setReportStatus('sent');
        setShowReportNotification(true);
        setTimeout(() => setShowReportNotification(false), 3000);
      } catch (error) {
        console.error('Failed to send error report:', error);
        setReportStatus('failed');
        setShowReportNotification(true);
        setTimeout(() => setShowReportNotification(false), 5000);
      }
    }

    onSave(correctedResult);
  };

  return (
    <div className="manual-correction">
      <div className="correction-header">
        <h2>Manual Correction</h2>
        <div className="total-score">
          Total Score: <strong>{totalScore}</strong>
        </div>
      </div>

      {showReportNotification && (
        <div className={`report-notification ${reportStatus}`}>
          {reportStatus === 'sending' && '📤 Sending error report...'}
          {reportStatus === 'sent' && '✓ Error report sent successfully. Thank you for helping improve detection!'}
          {reportStatus === 'failed' && '⚠ Failed to send error report. It will be retried later.'}
        </div>
      )}

      <div className="tiles-list">
        <h3>Detected Tiles ({tiles.length})</h3>
        {tiles.map((tile) => (
          <div key={tile.id} className="tile-item">
            {editingTileId === tile.id ? (
              <TileEditor
                tile={tile}
                onSave={(left, right) => handleUpdateTile(tile.id, left, right)}
                onCancel={() => setEditingTileId(null)}
              />
            ) : (
              <TileDisplay
                tile={tile}
                onEdit={() => setEditingTileId(tile.id)}
                onRemove={() => handleRemoveTile(tile.id)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="add-tile-section">
        {showAddForm ? (
          <div className="add-tile-form">
            <h3>Add New Tile</h3>
            <div className="pip-inputs">
              <label>
                Left Pips:
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={newTileLeft}
                  onChange={(e) => setNewTileLeft(parseInt(e.target.value) || 0)}
                />
              </label>
              <label>
                Right Pips:
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={newTileRight}
                  onChange={(e) => setNewTileRight(parseInt(e.target.value) || 0)}
                />
              </label>
            </div>
            <div className="form-actions">
              <button onClick={handleAddTile} className="btn-primary">
                Add Tile
              </button>
              <button onClick={() => setShowAddForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddForm(true)} className="btn-add">
            + Add Missing Tile
          </button>
        )}
      </div>

      <div className="correction-actions">
        <button onClick={handleSave} className="btn-save">
          Save Corrections
        </button>
        <button onClick={onCancel} className="btn-cancel">
          Cancel
        </button>
      </div>
    </div>
  );
};

interface TileDisplayProps {
  tile: DetectedTile;
  onEdit: () => void;
  onRemove: () => void;
}

const TileDisplay: React.FC<TileDisplayProps> = ({ tile, onEdit, onRemove }) => {
  return (
    <div className="tile-display">
      <div className="tile-info">
        <span className="tile-pips">
          [{tile.leftPips}|{tile.rightPips}]
        </span>
        <span className="tile-total">Total: {tile.totalPips}</span>
        <span className="tile-confidence">
          Confidence: {(tile.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <div className="tile-actions">
        <button onClick={onEdit} className="btn-edit" aria-label="Edit tile">
          Edit
        </button>
        <button onClick={onRemove} className="btn-remove" aria-label="Remove tile">
          Remove
        </button>
      </div>
    </div>
  );
};

interface TileEditorProps {
  tile: DetectedTile;
  onSave: (leftPips: number, rightPips: number) => void;
  onCancel: () => void;
}

const TileEditor: React.FC<TileEditorProps> = ({ tile, onSave, onCancel }) => {
  const [leftPips, setLeftPips] = useState(tile.leftPips);
  const [rightPips, setRightPips] = useState(tile.rightPips);

  const handleSave = () => {
    onSave(leftPips, rightPips);
  };

  return (
    <div className="tile-editor">
      <div className="pip-inputs">
        <label>
          Left:
          <input
            type="number"
            min="0"
            max="12"
            value={leftPips}
            onChange={(e) => setLeftPips(parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Right:
          <input
            type="number"
            min="0"
            max="12"
            value={rightPips}
            onChange={(e) => setRightPips(parseInt(e.target.value) || 0)}
          />
        </label>
      </div>
      <div className="editor-actions">
        <button onClick={handleSave} className="btn-save-edit">
          Save
        </button>
        <button onClick={onCancel} className="btn-cancel-edit">
          Cancel
        </button>
      </div>
    </div>
  );
};
