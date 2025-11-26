/**
 * Rounds routes
 */
import { Router, Request, Response } from 'express';
import { query } from '../db/database';
import type { CloudRound } from '../types';

const router = Router();

/**
 * GET /api/rounds/:gameId
 * Get all rounds for a game
 */
router.get('/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    const result = await query<CloudRound>(
      `SELECT * FROM cloud_rounds 
       WHERE game_id = $1 
       ORDER BY round_number ASC`,
      [gameId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get rounds error:', error);
    res.status(500).json({ error: 'Failed to retrieve rounds' });
  }
});

/**
 * POST /api/rounds
 * Create a round
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      roundId,
      gameId,
      playerId,
      roundNumber,
      score,
      imageData,
      timestamp,
      detectionResult
    } = req.body;

    if (!roundId || !gameId || !playerId || roundNumber === undefined || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query<CloudRound>(
      `INSERT INTO cloud_rounds 
       (round_id, game_id, player_id, round_number, score, image_data, timestamp, detection_result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        roundId,
        gameId,
        playerId,
        roundNumber,
        score,
        imageData,
        timestamp || new Date(),
        detectionResult ? JSON.stringify(detectionResult) : null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create round error:', error);
    res.status(500).json({ error: 'Failed to create round' });
  }
});

export default router;
