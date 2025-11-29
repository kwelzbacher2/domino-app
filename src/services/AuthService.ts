/**
 * AuthService - Manages user authentication with username-based sign-in
 * 
 * This service handles:
 * - Sign-in with username (create or retrieve user)
 * - User session management in localStorage
 * - Current user retrieval
 * - Sign-out functionality
 */

import type { User } from '../models/types';

const STORAGE_KEY = 'domino_auth_user';
const USERS_STORAGE_KEY = 'domino_users';

export class AuthService {
  private currentUser: User | null = null;

  constructor() {
    this.loadSession();
  }

  /**
   * Load user session from localStorage
   */
  private loadSession(): void {
    try {
      const userJson = localStorage.getItem(STORAGE_KEY);
      if (userJson) {
        const userData = JSON.parse(userJson);
        this.currentUser = {
          ...userData,
          createdAt: new Date(userData.createdAt)
        };
      }
    } catch (error) {
      console.error('Failed to load user session:', error);
      this.currentUser = null;
    }
  }

  /**
   * Save user session to localStorage
   */
  private saveSession(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user session:', error);
      throw new Error('Failed to save user session');
    }
  }

  /**
   * Get all users from localStorage
   */
  private getAllUsers(): Map<string, User> {
    try {
      const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
      if (!usersJson) {
        return new Map();
      }
      
      const usersArray = JSON.parse(usersJson);
      const usersMap = new Map<string, User>();
      
      for (const userData of usersArray) {
        usersMap.set(userData.username.toLowerCase(), {
          ...userData,
          createdAt: new Date(userData.createdAt)
        });
      }
      
      return usersMap;
    } catch (error) {
      console.error('Failed to load users:', error);
      return new Map();
    }
  }

  /**
   * Save all users to localStorage
   */
  private saveAllUsers(users: Map<string, User>): void {
    try {
      const usersArray = Array.from(users.values());
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersArray));
    } catch (error) {
      console.error('Failed to save users:', error);
      throw new Error('Failed to save users');
    }
  }

  /**
   * Sign in with username - creates new user or retrieves existing user
   * Ensures username uniqueness (case-insensitive)
   * 
   * @param username - The username to sign in with
   * @returns Promise resolving to the User object
   */
  async signIn(username: string): Promise<User> {
    if (!username || username.trim().length === 0) {
      throw new Error('Username cannot be empty');
    }

    const trimmedUsername = username.trim();
    const normalizedUsername = trimmedUsername.toLowerCase();

    // Get all existing users from local storage
    const users = this.getAllUsers();

    // Check if user already exists locally
    let user = users.get(normalizedUsername);

    // If user exists locally, still try to sync with backend to ensure they're registered
    if (user) {
      const API_URL = import.meta.env.VITE_API_URL;
      try {
        if (API_URL && !API_URL.includes('localhost')) {
          // Try to register/update in backend (idempotent operation)
          await fetch(`${API_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username, userId: user.id }),
          });
        }
      } catch (error) {
        console.warn('Backend sync failed, continuing with local user:', error);
      }
      
      this.currentUser = user;
      this.saveSession(user);
      return user;
    }

    // Not in local storage - check backend first, then create if needed
    const API_URL = import.meta.env.VITE_API_URL;
    let userId = this.generateUserId();
    
    try {
      if (API_URL && !API_URL.includes('localhost')) {
        // First, try to get existing user by username
        const checkResponse = await fetch(`${API_URL}/auth/user/${encodeURIComponent(trimmedUsername)}`);
        
        if (checkResponse.ok) {
          // User exists in backend - use their userId
          const existingUser = await checkResponse.json();
          userId = existingUser.id;
          console.log('Found existing user in backend:', trimmedUsername);
        } else if (checkResponse.status === 404) {
          // User doesn't exist - register new user
          const registerResponse = await fetch(`${API_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: trimmedUsername, userId }),
          });
          
          if (registerResponse.ok) {
            const newUser = await registerResponse.json();
            userId = newUser.id; // Backend now returns 'id' not 'user_id'
            console.log('Registered new user in backend:', trimmedUsername);
          }
        }
      }
    } catch (error) {
      console.warn('Backend lookup failed, using offline mode:', error);
      // Continue with generated userId - offline mode
    }

    user = {
      id: userId,
      username: trimmedUsername,
      createdAt: new Date()
    };

    // Save to users collection
    users.set(normalizedUsername, user);
    this.saveAllUsers(users);

    // Set as current user
    this.currentUser = user;
    this.saveSession(user);

    return user;
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    this.currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear user session:', error);
    }
  }

  /**
   * Get the current authenticated user
   * 
   * @returns The current User or null if not authenticated
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if a user is currently authenticated
   * 
   * @returns true if user is authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Generate a unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
export const authService = new AuthService();
