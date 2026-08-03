/**
 * Simple Username Authentication Client for Watch Party Extension
 * Implements simple username-based authentication without passwords
 * Implements requirement 15.1
 */

import { BrowserBridge } from '../browser-bridge/types';

export interface AuthConfig {
  enabled: boolean;
  providers: Record<string, any>;
  allowAnonymous: boolean;
  sessionDuration: number; // in milliseconds
  maxUsernameLength: number;
  minUsernameLength: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isAnonymous: boolean;
  joinedAt: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
}

export class AuthClient {
  private browserBridge: BrowserBridge;
  private config: AuthConfig;
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
  };

  constructor(browserBridge: BrowserBridge, config: AuthConfig) {
    this.browserBridge = browserBridge;
    this.config = {
      ...config,
      enabled: config.enabled ?? false,
      providers: config.providers ?? {},
      allowAnonymous: config.allowAnonymous ?? true,
      sessionDuration: config.sessionDuration ?? 24 * 60 * 60 * 1000, // 24 hours
      maxUsernameLength: config.maxUsernameLength ?? 20,
      minUsernameLength: config.minUsernameLength ?? 2,
    };
  }

  /**
   * Initialize auth client and restore session
   */
  async initialize(): Promise<void> {
    try {
      // Try to restore existing session
      const storedAuth = await this.browserBridge.storage.local.get('authState');
      if (storedAuth.authState) {
        const authState = JSON.parse(storedAuth.authState);

        // Check if session is still valid
        if (authState.user && this.isSessionValid(authState.user)) {
          this.authState = authState;
          console.log('Session restored for user:', authState.user?.username);
          return;
        }
      }

      // No valid session, create anonymous if allowed
      if (this.config.allowAnonymous) {
        await this.createAnonymousSession();
      }
    } catch (error) {
      console.error('Failed to initialize auth client:', error);
      if (this.config.allowAnonymous) {
        await this.createAnonymousSession();
      }
    }
  }

  /**
   * Authenticate with username
   */
  async authenticateWithUsername(username: string): Promise<UserProfile> {
    // Validate username
    const validationError = this.validateUsername(username);
    if (validationError) {
      throw new Error(validationError);
    }

    try {
      // Create user profile
      const userProfile: UserProfile = {
        id: 'user_' + this.generateRandomId(),
        username: username.trim(),
        displayName: username.trim(),
        isAnonymous: false,
        joinedAt: Date.now(),
      };

      // Update auth state
      this.authState = {
        isAuthenticated: true,
        user: userProfile,
      };

      // Persist auth state
      await this.persistAuthState();

      console.log('Username authentication successful for user:', userProfile.username);
      return userProfile;
    } catch (error) {
      console.error('Username authentication failed:', error);
      throw error;
    }
  }

  /**
   * Sign out and clear session
   */
  async signOut(): Promise<void> {
    // Clear auth state
    this.authState = {
      isAuthenticated: false,
      user: null,
    };

    // Clear stored auth state
    await this.browserBridge.storage.local.remove(['authState']);

    // Create anonymous session if allowed
    if (this.config.allowAnonymous) {
      await this.createAnonymousSession();
    }

    console.log('User signed out');
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return (
      this.authState.isAuthenticated &&
      this.authState.user !== null &&
      this.isSessionValid(this.authState.user)
    );
  }

  /**
   * Get current user profile
   */
  getCurrentUser(): UserProfile | null {
    return this.authState.user ? { ...this.authState.user } : null;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    updates: Partial<Pick<UserProfile, 'displayName' | 'avatarUrl'>>
  ): Promise<void> {
    if (!this.authState.user) {
      throw new Error('No authenticated user');
    }

    this.authState.user = {
      ...this.authState.user,
      ...updates,
    };

    await this.persistAuthState();
    console.log('User profile updated');
  }

  /**
   * Validate username
   */
  private validateUsername(username: string): string | null {
    if (!username || typeof username !== 'string') {
      return 'Username is required';
    }

    const trimmed = username.trim();

    if (trimmed.length < this.config.minUsernameLength) {
      return `Username must be at least ${this.config.minUsernameLength} characters`;
    }

    if (trimmed.length > this.config.maxUsernameLength) {
      return `Username must be no more than ${this.config.maxUsernameLength} characters`;
    }

    // Check for valid characters (alphanumeric, spaces, hyphens, underscores)
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      return 'Username can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    // Check for inappropriate content (basic check)
    const inappropriate = ['admin', 'moderator', 'system', 'anonymous', 'null', 'undefined'];
    if (inappropriate.some((word) => trimmed.toLowerCase().includes(word))) {
      return 'Username contains restricted words';
    }

    return null;
  }

  /**
   * Check if session is still valid
   */
  private isSessionValid(user: UserProfile): boolean {
    if (!user.joinedAt) {
      return false;
    }

    const sessionAge = Date.now() - user.joinedAt;
    return sessionAge < this.config.sessionDuration;
  }

  /**
   * Cryptographically secure random identifier for user/anonymous sessions.
   * Uses crypto.getRandomValues instead of Math.random to avoid predictable IDs.
   */
  private generateRandomId(): string {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(36).padStart(2, '0'))
      .join('');
  }

  /**
   * Create anonymous session
   */
  private async createAnonymousSession(): Promise<void> {
    const anonymousUser: UserProfile = {
      id: 'anon_' + this.generateRandomId(),
      username: 'Anonymous',
      displayName: 'Anonymous User',
      isAnonymous: true,
      joinedAt: Date.now(),
    };

    this.authState = {
      isAuthenticated: true,
      user: anonymousUser,
    };

    await this.persistAuthState();
    console.log('Anonymous session created');
  }

  /**
   * Persist auth state to storage
   */
  private async persistAuthState(): Promise<void> {
    await this.browserBridge.storage.local.set({
      authState: JSON.stringify(this.authState),
    });
  }
}
