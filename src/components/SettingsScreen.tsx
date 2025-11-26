/**
 * Settings screen for app configuration
 * Includes privacy preferences for error reporting
 * Requirements: 15.1, 15.2, 15.5
 */
import React, { useState, useEffect } from 'react';
import { errorReportingService } from '../services/ErrorReportingService';
import './SettingsScreen.css';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [errorReportingEnabled, setErrorReportingEnabled] = useState(
    errorReportingService.getUserPreference()
  );
  const [queuedReportCount, setQueuedReportCount] = useState(
    errorReportingService.getQueuedReportCount()
  );
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setQueuedReportCount(errorReportingService.getQueuedReportCount());
  }, []);

  const handleToggleErrorReporting = (enabled: boolean) => {
    setErrorReportingEnabled(enabled);
    errorReportingService.setUserPreference(enabled);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleRetryReports = async () => {
    try {
      await errorReportingService.retryFailedReports();
      setQueuedReportCount(errorReportingService.getQueuedReportCount());
    } catch (error) {
      console.error('Failed to retry reports:', error);
    }
  };

  return (
    <div className="settings-screen">
      <header className="settings-header">
        <button onClick={onBack} className="back-button" aria-label="Back">
          ← Back
        </button>
        <h1>Settings</h1>
      </header>

      <div className="settings-content">
        <section className="settings-section">
          <h2>Privacy</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Error Reporting</h3>
              <p className="setting-description">
                Help improve detection accuracy by automatically sending reports when you make manual corrections.
                Reports include the image, detected tiles, and your corrections.
              </p>
            </div>
            
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={errorReportingEnabled}
                onChange={(e) => handleToggleErrorReporting(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {showSaved && (
            <div className="save-notification">
              ✓ Preference saved
            </div>
          )}
        </section>

        {queuedReportCount > 0 && (
          <section className="settings-section">
            <h2>Pending Reports</h2>
            <div className="setting-item">
              <div className="setting-info">
                <p>
                  You have {queuedReportCount} pending error report{queuedReportCount !== 1 ? 's' : ''} 
                  that failed to send.
                </p>
              </div>
              <button onClick={handleRetryReports} className="btn-retry">
                Retry Now
              </button>
            </div>
          </section>
        )}

        <section className="settings-section">
          <h2>About</h2>
          <div className="setting-item">
            <div className="setting-info">
              <p className="app-version">Domino Score Counter v1.0.0</p>
              <p className="setting-description">
                Automatically count domino scores using image recognition.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
