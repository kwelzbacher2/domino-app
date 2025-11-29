/**
 * SignInScreen - Username-based authentication screen
 * 
 * Provides a simple sign-in interface where users enter a username.
 * Creates new users or retrieves existing users based on username.
 * Persists session across page refreshes.
 */

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { authService } from '../services/AuthService';
import { cloudSyncService } from '../services/CloudSyncService';
import { LoadingSpinner } from './LoadingSpinner';
import './SignInScreen.css';

interface SignInScreenProps {
  onSignIn: () => void;
}

export function SignInScreen({ onSignIn }: SignInScreenProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>('');

  useEffect(() => {
    // Check if user is already signed in
    if (authService.isAuthenticated()) {
      onSignIn();
    }
  }, [onSignIn]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await authService.signIn(username);
      
      // Check if this is a new user or existing user
      const now = new Date();
      const createdRecently = (now.getTime() - user.createdAt.getTime()) < 1000; // Created within last second
      
      // Register user with cloud backend and check if they have existing games
      let hasExistingGames = false;
      try {
        setSyncStatus('Connecting to cloud...');
        await cloudSyncService.registerUser(user);
        
        // Always try to restore games from cloud (even for "new" local users)
        // They might be signing in from a different device
        setSyncStatus('Checking for saved games...');
        const restoredGames = await cloudSyncService.restoreGamesFromCloud(user.id);
        hasExistingGames = restoredGames.length > 0;
        
        if (hasExistingGames) {
          setSyncStatus(`Restored ${restoredGames.length} game${restoredGames.length > 1 ? 's' : ''}!`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (cloudError) {
        console.warn('Cloud sync failed, continuing with local storage:', cloudError);
        // Don't block sign-in if cloud sync fails
      }
      
      // Show welcome message only for truly new users (no existing games)
      const isNewUser = createdRecently && !hasExistingGames;
      setIsFirstTime(isNewUser);
      
      if (isNewUser) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      onSignIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      setIsLoading(false);
    }
  };

  if (isLoading && !isFirstTime) {
    return (
      <div className="sign-in-screen">
        <div className="sign-in-container">
          <LoadingSpinner />
          <p className="loading-text">{syncStatus || 'Signing in...'}</p>
        </div>
      </div>
    );
  }

  if (isLoading && isFirstTime) {
    return (
      <div className="sign-in-screen">
        <div className="sign-in-container welcome-screen">
          <div className="welcome-icon">👋</div>
          <h2 className="welcome-title">Welcome!</h2>
          <p className="welcome-message">{syncStatus || 'Setting up your account...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sign-in-screen">
      <div className="sign-in-container">
        <div className="sign-in-header">
          <h1 className="app-title">Domino Score Counter</h1>
          <p className="app-subtitle">Track your domino game scores with ease</p>
        </div>

        <form onSubmit={handleSubmit} className="sign-in-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Enter your username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="form-input"
              autoComplete="username"
              autoFocus
              disabled={isLoading}
            />
            {error && <p className="error-message">{error}</p>}
          </div>

          <button
            type="submit"
            className="sign-in-button"
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="sign-in-info">
          <p className="info-text">
            💡 <strong>Important:</strong> Use the same username each time to access your saved games!
          </p>
          <p className="info-text">
            Your games are saved on this device and synced to the cloud.
          </p>
        </div>
      </div>
    </div>
  );
}
