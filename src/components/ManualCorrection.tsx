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
  const [newTileLeft, setNewTileLeft] = useState<number | string>(0);
  const [newTileRight, setNewTileRight] = useState<number | string>(0);
  const [reportStatus, setReportStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [showReportNotification, setShowReportNotification] = useState(false);
  
  const correctionService = new CorrectionService();

  const totalScore = correctionService.calculateTotalScore(tiles);

  const handleAddTile = () => {
    const left = newTileLeft === '' ? 0 : Number(newTileLeft);
    const right = newTileRight === '' ? 0 : Number(newTileRight);
    const updatedTiles = correctionService.addTile(tiles, left, right);
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
        <h3>Detected Dominoes ({tiles.length})</h3>
        <p className="tiles-help">Click "Edit" to correct individual pip counts</p>
        {tiles.length === 0 ? (
          <div className="no-tiles">
            <p>No dominoes detected. Click "Add Missing Tile" below to add them manually.</p>
          </div>
        ) : (
          tiles.map((tile, index) => (
            <div key={tile.id} className="tile-item">
              <div className="tile-number">#{index + 1}</div>
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
          ))
        )}
      </div>

      <div className="add-tile-section">
        {showAddForm ? (
          <div className="add-tile-form">
            <h3>Add Missing Tile</h3>
            <div className="pip-inputs">
              <label>
                Pip Count:
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={newTileLeft}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTileLeft(val === '' ? 0 : parseInt(val));
                  }}
                  onFocus={(e) => e.target.select()}
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
        <div className="tile-pips-display">
          {tile.rightPips === 0 ? (
            <>
              <span className="pip-value">{tile.leftPips}</span>
              <span className="pip-label"> pips</span>
            </>
          ) : (
            <>
              <span className="pip-value">{tile.leftPips}</span>
              <span className="pip-separator">|</span>
              <span className="pip-value">{tile.rightPips}</span>
              <span className="pip-equals">=</span>
              <span className="pip-total">{tile.totalPips}</span>
            </>
          )}
        </div>
        <span className="tile-confidence">
          {(tile.confidence * 100).toFixed(0)}% confident
        </span>
      </div>
      <div className="tile-actions">
        <button onClick={onEdit} className="btn-edit" aria-label="Edit tile">
          ✏️ Edit
        </button>
        <button onClick={onRemove} className="btn-remove" aria-label="Remove tile">
          🗑️ Remove
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
  const [leftPips, setLeftPips] = useState<number | string>(tile.leftPips);
  const [rightPips, setRightPips] = useState<number | string>(tile.rightPips);
  const [isSingleHalf, setIsSingleHalf] = useState(tile.rightPips === 0);

  const handleSave = () => {
    const left = leftPips === '' ? 0 : Number(leftPips);
    const right = rightPips === '' ? 0 : Number(rightPips);
    onSave(left, isSingleHalf ? 0 : right);
  };

  return (
    <div className="tile-editor">
      <div className="editor-mode-toggle">
        <label>
          <input
            type="checkbox"
            checked={isSingleHalf}
            onChange={(e) => setIsSingleHalf(e.target.checked)}
          />
          Single half (not full domino)
        </label>
      </div>
      <div className="pip-inputs">
        {isSingleHalf ? (
          <label>
            Pip Count:
            <input
              type="number"
              min="0"
              max="12"
              value={leftPips}
              onChange={(e) => setLeftPips(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </label>
        ) : (
          <>
            <label>
              Left:
              <input
                type="number"
                min="0"
                max="12"
                value={leftPips}
                onChange={(e) => setLeftPips(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <label>
              Right:
              <input
                type="number"
                min="0"
                max="12"
                value={rightPips}
                onChange={(e) => setRightPips(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </label>
          </>
        )}
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
