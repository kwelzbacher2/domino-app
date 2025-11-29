/**
 * HelpScreen - Instructions and tips for using the app
 */

import { memo } from 'react';
import './HelpScreen.css';

interface HelpScreenProps {
  onBack?: () => void;
  onGetStarted?: () => void;
}

export const HelpScreen = memo(function HelpScreen({ onBack, onGetStarted }: HelpScreenProps) {
  return (
    <div className="help-screen">
      <div className="help-header">
        {onBack && (
          <button onClick={onBack} className="btn-back" type="button">
            ← Back
          </button>
        )}
        <h1>How to Use</h1>
      </div>

      <div className="help-content">
        <section className="help-section">
          <div className="help-icon">📱</div>
          <h2>Welcome to Domino Score Counter!</h2>
          <p>This app automatically counts the pips on your dominoes so you don't have to. Just take a photo and let the app do the math!</p>
        </section>

        <section className="help-section">
          <h2>📸 Taking Good Photos</h2>
          <div className="help-tips">
            <div className="tip-card">
              <span className="tip-icon">✅</span>
              <div>
                <h3>Line up your dominoes</h3>
                <p>Arrange dominoes in a row without overlapping for best results</p>
              </div>
            </div>
            <div className="tip-card">
              <span className="tip-icon">✅</span>
              <div>
                <h3>Good lighting</h3>
                <p>Make sure the area is well-lit and avoid shadows on the dominoes</p>
              </div>
            </div>
            <div className="tip-card">
              <span className="tip-icon">✅</span>
              <div>
                <h3>Camera position</h3>
                <p>Hold your phone directly above the dominoes, not at an angle</p>
              </div>
            </div>
            <div className="tip-card">
              <span className="tip-icon">✅</span>
              <div>
                <h3>Keep them flat</h3>
                <p>Place dominoes flat on the table so all pips are clearly visible</p>
              </div>
            </div>
          </div>
        </section>

        <section className="help-section">
          <h2>🎮 How to Play</h2>
          <ol className="help-steps">
            <li>
              <strong>Enter Your Username</strong>
              <p>First time? Pick a username. <strong>Use the same username each time</strong> to see your saved games!</p>
            </li>
            <li>
              <strong>Create a Game</strong>
              <p>Tap "New Game" and add player names</p>
            </li>
            <li>
              <strong>Take a Photo</strong>
              <p>When it's time to score, tap "Add Round" and take a photo of the dominoes</p>
            </li>
            <li>
              <strong>Review Detection</strong>
              <p>The app will count the pips automatically. Check if it's correct!</p>
            </li>
            <li>
              <strong>Manual Correction (if needed)</strong>
              <p>If the count is wrong, you can manually correct it</p>
            </li>
            <li>
              <strong>Assign to Player</strong>
              <p>Select which player gets the score for this round</p>
            </li>
            <li>
              <strong>Track Progress</strong>
              <p>View scores and history for each player throughout the game</p>
            </li>
          </ol>
        </section>

        <section className="help-section">
          <h2>💡 Tips & Tricks</h2>
          <div className="help-tips">
            <div className="tip-card">
              <span className="tip-icon">💾</span>
              <div>
                <h3>Auto-save</h3>
                <p>Your games are automatically saved on your device</p>
              </div>
            </div>
            <div className="tip-card">
              <span className="tip-icon">📱</span>
              <div>
                <h3>Works offline</h3>
                <p>No internet connection needed - everything runs on your phone</p>
              </div>
            </div>
            <div className="tip-card">
              <span className="tip-icon">✏️</span>
              <div>
                <h3>Manual entry</h3>
                <p>You can always manually enter scores if detection doesn't work</p>
              </div>
            </div>
            <div className="tip-card">
              <span className="tip-icon">🔄</span>
              <div>
                <h3>Retake photos</h3>
                <p>Don't like the photo? Just retake it before confirming</p>
              </div>
            </div>
          </div>
        </section>

        <section className="help-section">
          <h2>❓ Troubleshooting</h2>
          <div className="faq">
            <div className="faq-item">
              <h3>Detection isn't working well?</h3>
              <ul>
                <li>Make sure dominoes are well-lit and clearly visible</li>
                <li>Avoid overlapping dominoes</li>
                <li>Try taking the photo from directly above</li>
                <li>Use manual correction if needed</li>
              </ul>
            </div>
            <div className="faq-item">
              <h3>Camera won't start?</h3>
              <ul>
                <li>Check that you've allowed camera permissions</li>
                <li>Try refreshing the page</li>
                <li>Use the "Upload" button to select a photo instead</li>
              </ul>
            </div>
            <div className="faq-item">
              <h3>Lost your game?</h3>
              <ul>
                <li>Games are saved automatically on your device</li>
                <li>Check the game list on the home screen</li>
                <li>Make sure you didn't clear your browser data</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="help-section help-footer">
          <p>🎉 <strong>Ready to get started?</strong></p>
          {onGetStarted ? (
            <>
              <button onClick={onGetStarted} className="btn-get-started" type="button">
                Get Started →
              </button>
              <p className="footer-note">You'll create your username and start your first game!</p>
            </>
          ) : (
            <p>Made with ❤️ for domino players</p>
          )}
        </section>
      </div>
    </div>
  );
});
