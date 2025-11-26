/**
 * Property-based tests for AuthService
 * 
 * Tests username uniqueness and authentication behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AuthService } from './AuthService';

describe('AuthService', () => {
  let authService: AuthService;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Save original localStorage
    originalLocalStorage = global.localStorage;
    
    // Clear localStorage before each test
    localStorage.clear();
    
    // Create a fresh AuthService instance for each test (after clearing storage)
    authService = new AuthService();
  });

  afterEach(() => {
    // Restore original localStorage
    global.localStorage = originalLocalStorage;
  });

  describe('Property 28: Username uniqueness', () => {
    /**
     * Feature: domino-web-app, Property 28: Username uniqueness
     * 
     * For any username entered during sign-in, the system should either create a new user 
     * or retrieve the existing user with that username, ensuring no duplicate user records.
     * 
     * Validates: Requirements 13.2
     */
    it('should ensure username uniqueness (case-insensitive)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (username) => {
            // Clear state for each property test iteration
            localStorage.clear();
            authService = new AuthService();

            // First sign-in should create a new user
            const user1 = await authService.signIn(username);
            expect(user1.username).toBe(username.trim());
            expect(user1.id).toBeDefined();

            // Second sign-in with same username should return the same user
            const user2 = await authService.signIn(username);
            expect(user2.id).toBe(user1.id);
            expect(user2.username).toBe(user1.username);
            expect(user2.createdAt.getTime()).toBe(user1.createdAt.getTime());

            // Sign-in with different casing should return the same user
            const usernameUpperCase = username.toUpperCase();
            const user3 = await authService.signIn(usernameUpperCase);
            expect(user3.id).toBe(user1.id);

            const usernameLowerCase = username.toLowerCase();
            const user4 = await authService.signIn(usernameLowerCase);
            expect(user4.id).toBe(user1.id);

            // Verify only one user record exists in storage
            const usersJson = localStorage.getItem('domino_users');
            if (usersJson) {
              const users = JSON.parse(usersJson);
              const matchingUsers = users.filter(
                (u: any) => u.username.toLowerCase() === username.trim().toLowerCase()
              );
              expect(matchingUsers.length).toBe(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create different users for different usernames', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            { minLength: 2, maxLength: 10 }
          ).map(arr => Array.from(new Set(arr.map(s => s.trim().toLowerCase())))), // Ensure unique usernames
          async (usernames) => {
            if (usernames.length < 2) return; // Skip if not enough unique usernames

            // Clear state
            localStorage.clear();
            authService = new AuthService();

            // Sign in with each username
            const users = [];
            for (const username of usernames) {
              const user = await authService.signIn(username);
              users.push(user);
            }

            // All user IDs should be unique
            const userIds = users.map(u => u.id);
            const uniqueIds = new Set(userIds);
            expect(uniqueIds.size).toBe(usernames.length);

            // Verify correct number of users in storage
            const usersJson = localStorage.getItem('domino_users');
            if (usersJson) {
              const storedUsers = JSON.parse(usersJson);
              expect(storedUsers.length).toBe(usernames.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Basic authentication functionality', () => {
    it('should sign in with a valid username', async () => {
      const user = await authService.signIn('testuser');
      
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve current user after sign-in', async () => {
      await authService.signIn('testuser');
      
      const currentUser = authService.getCurrentUser();
      expect(currentUser).toBeDefined();
      expect(currentUser?.username).toBe('testuser');
    });

    it('should return true for isAuthenticated after sign-in', async () => {
      expect(authService.isAuthenticated()).toBe(false);
      
      await authService.signIn('testuser');
      
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should sign out and clear current user', async () => {
      await authService.signIn('testuser');
      expect(authService.isAuthenticated()).toBe(true);
      
      await authService.signOut();
      
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('should persist session across service instances', async () => {
      await authService.signIn('testuser');
      const user1 = authService.getCurrentUser();
      
      // Create new service instance (simulates app restart)
      const newAuthService = new AuthService();
      const user2 = newAuthService.getCurrentUser();
      
      expect(user2).toBeDefined();
      expect(user2?.id).toBe(user1?.id);
      expect(user2?.username).toBe(user1?.username);
    });

    it('should reject empty username', async () => {
      await expect(authService.signIn('')).rejects.toThrow('Username cannot be empty');
      await expect(authService.signIn('   ')).rejects.toThrow('Username cannot be empty');
    });

    it('should trim whitespace from username', async () => {
      const user = await authService.signIn('  testuser  ');
      
      expect(user.username).toBe('testuser');
    });
  });
});
