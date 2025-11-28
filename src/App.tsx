/**
 * Main App component with routing and navigation
 * Wires together all screens in the domino score counter flow
 */
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, memo, useCallback } from 'react';
import { GameListScreen } from './components/GameListScreen';
import { GameCreationScreen } from './components/GameCreationScreen';
import { GameDetailScreen } from './components/GameDetailScreen';
import { CameraScreen } from './components/CameraScreen';
import { ImageReviewScreen } from './components/ImageReviewScreen';
import { DetectionResultsScreen } from './components/DetectionResultsScreen';
import { PlayerSelectionScreen } from './components/PlayerSelectionScreen';
import { ManualCorrection } from './components/ManualCorrection';
import { SignInScreen } from './components/SignInScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { HelpScreen } from './components/HelpScreen';
import type { Game, ImageData, DetectionResult } from './models/types';
import { gameService } from './services/GameService';
import { detectDominoes, preloadDetectionModel } from './services/DetectionPipeline';
import { authService } from './services/AuthService';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  // Preload detection model on app initialization for better first-use performance
  useEffect(() => {
    // Preload in the background without blocking UI
    preloadDetectionModel().catch((error: Error) => {
      console.warn('Failed to preload detection model:', error);
    });
  }, []);

  const handleSignIn = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/welcome" element={<WelcomeRoute />} />
        
        {/* Protected routes - require authentication */}
        {!isAuthenticated ? (
          <>
            <Route path="*" element={<SignInScreen onSignIn={handleSignIn} />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/games" replace />} />
            <Route path="/games" element={<GameListRoute />} />
            <Route path="/games/new" element={<GameCreationRoute />} />
            <Route path="/games/:gameId" element={<GameDetailRoute />} />
            <Route path="/games/:gameId/add-round" element={<AddRoundFlow />} />
            <Route path="/settings" element={<SettingsRoute />} />
            <Route path="/help" element={<HelpRoute />} />
            <Route path="*" element={<Navigate to="/games" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

// Route component for game list
const GameListRoute = memo(function GameListRoute() {
  const navigate = useNavigate();

  const handleGameSelect = useCallback((gameId: string) => {
    navigate(`/games/${gameId}`);
  }, [navigate]);

  const handleCreateGame = useCallback(() => {
    navigate('/games/new');
  }, [navigate]);

  const handleSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  const handleHelp = useCallback(() => {
    navigate('/help');
  }, [navigate]);

  return (
    <GameListScreen
      onGameSelect={handleGameSelect}
      onCreateGame={handleCreateGame}
      onSettings={handleSettings}
      onHelp={handleHelp}
    />
  );
});

// Route component for game creation
const GameCreationRoute = memo(function GameCreationRoute() {
  const navigate = useNavigate();

  const handleGameCreated = useCallback((game: Game) => {
    navigate(`/games/${game.id}`);
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate('/games');
  }, [navigate]);

  return (
    <GameCreationScreen
      onGameCreated={handleGameCreated}
      onCancel={handleCancel}
    />
  );
});

// Route component for game detail
const GameDetailRoute = memo(function GameDetailRoute() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    navigate('/games');
  }, [navigate]);

  const handleAddRound = useCallback(() => {
    if (gameId) {
      navigate(`/games/${gameId}/add-round`);
    }
  }, [navigate, gameId]);

  if (!gameId) {
    return <Navigate to="/games" replace />;
  }

  return (
    <GameDetailScreen
      gameId={gameId}
      onBack={handleBack}
      onAddRound={handleAddRound}
    />
  );
});

// Route component for settings
const SettingsRoute = memo(function SettingsRoute() {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    navigate('/games');
  }, [navigate]);

  return <SettingsScreen onBack={handleBack} />;
});

// Route component for help (authenticated users)
const HelpRoute = memo(function HelpRoute() {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    navigate('/games');
  }, [navigate]);

  return <HelpScreen onBack={handleBack} />;
});

// Route component for welcome/onboarding (public)
const WelcomeRoute = memo(function WelcomeRoute() {
  const navigate = useNavigate();

  const handleGetStarted = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return <HelpScreen onGetStarted={handleGetStarted} />;
});

// Flow component for adding a round (camera → review → detection → correction → player selection)
function AddRoundFlow() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<'camera' | 'review' | 'detection' | 'correction' | 'player-selection'>('camera');
  const [capturedImage, setCapturedImage] = useState<ImageData | null>(null);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [game, setGame] = useState<Game | null>(null);

  if (!gameId) {
    return <Navigate to="/games" replace />;
  }

  // Load game data when needed
  const loadGame = async () => {
    if (!game) {
      try {
        const loadedGame = await gameService.getGame(gameId);
        setGame(loadedGame);
      } catch (error) {
        console.error('Failed to load game:', error);
        navigate('/games');
      }
    }
  };

  // Handle image capture
  const handleCapture = useCallback((image: ImageData) => {
    setCapturedImage(image);
    setCurrentStep('review');
  }, []);

  // Handle image processing
  const handleProcess = useCallback(async (image: ImageData) => {
    try {
      const result = await detectDominoes(image);
      setDetectionResult(result);
      setCurrentStep('detection');
    } catch (error) {
      console.error('Detection failed:', error);
      throw error;
    }
  }, []);

  // Handle detection acceptance
  const handleAccept = useCallback(async (result: DetectionResult) => {
    setDetectionResult(result);
    await loadGame();
    setCurrentStep('player-selection');
  }, [loadGame]);

  // Handle manual correction
  const handleCorrect = useCallback((result: DetectionResult) => {
    setDetectionResult(result);
    setCurrentStep('correction');
  }, []);

  // Handle correction save
  const handleCorrectionSave = useCallback(async (correctedResult: DetectionResult) => {
    setDetectionResult(correctedResult);
    await loadGame();
    setCurrentStep('player-selection');
  }, [loadGame]);

  // Handle player selection
  const handlePlayerSelected = useCallback(async (playerId: string) => {
    if (!detectionResult || !game) return;

    try {
      await gameService.addRoundScore(
        gameId,
        playerId,
        detectionResult.totalScore,
        capturedImage?.dataUrl || '',
        {
          tilesDetected: detectionResult.tiles.length,
          confidence: detectionResult.confidence,
        }
      );
      navigate(`/games/${gameId}`);
    } catch (error) {
      console.error('Failed to save round score:', error);
    }
  }, [detectionResult, game, gameId, capturedImage, navigate]);

  // Handle cancellation/back navigation
  const handleCancel = useCallback(() => {
    navigate(`/games/${gameId}`);
  }, [navigate, gameId]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setDetectionResult(null);
    setCurrentStep('camera');
  }, []);

  const handleReject = useCallback(() => {
    setCurrentStep('review');
  }, []);

  const handleCorrectionCancel = useCallback(() => {
    setCurrentStep('detection');
  }, []);

  // Render current step
  switch (currentStep) {
    case 'camera':
      return <CameraScreen onCapture={handleCapture} onCancel={handleCancel} />;
    
    case 'review':
      if (!capturedImage) return <Navigate to={`/games/${gameId}`} replace />;
      return (
        <ImageReviewScreen
          image={capturedImage}
          onProcess={handleProcess}
          onRetake={handleRetake}
          onCancel={handleCancel}
        />
      );
    
    case 'detection':
      if (!detectionResult) return <Navigate to={`/games/${gameId}`} replace />;
      return (
        <DetectionResultsScreen
          result={detectionResult}
          onAccept={handleAccept}
          onCorrect={handleCorrect}
          onReject={handleReject}
          onCancel={handleCancel}
        />
      );
    
    case 'correction':
      if (!detectionResult) return <Navigate to={`/games/${gameId}`} replace />;
      return (
        <ManualCorrection
          detectionResult={detectionResult}
          gameId={gameId}
          imageDataUrl={capturedImage?.dataUrl}
          onSave={handleCorrectionSave}
          onCancel={handleCorrectionCancel}
        />
      );
    
    case 'player-selection':
      if (!detectionResult || !game || !capturedImage) {
        return <Navigate to={`/games/${gameId}`} replace />;
      }
      return (
        <PlayerSelectionScreen
          game={game}
          roundScore={detectionResult.totalScore}
          imageDataUrl={capturedImage.dataUrl}
          onPlayerSelected={handlePlayerSelected}
          onCancel={handleCancel}
        />
      );
    
    default:
      return <Navigate to={`/games/${gameId}`} replace />;
  }
}

export default App;
