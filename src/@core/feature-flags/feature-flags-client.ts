/**
 * Feature Flags Client for Watch Party Extension
 *
 * Provides client-side feature flag evaluation with caching and fallback support.
 * Integrates with the server-side feature flags service.
 */

export interface FeatureFlags {
  [flagName: string]: boolean;
}

export interface FlagEvaluationResult {
  flags: FeatureFlags;
  userId: string;
  timestamp: number;
  source: 'server' | 'cache' | 'fallback';
}

export interface FeatureFlagsConfig {
  serverUrl: string;
  userId: string;
  cacheTimeout: number; // Cache timeout in milliseconds
  fallbackFlags: FeatureFlags; // Fallback values when server is unavailable
  enableLogging: boolean;
}

/**
 * Client for evaluating feature flags with caching and fallback support
 */
export class FeatureFlagsClient {
  private config: FeatureFlagsConfig;
  private cache: Map<string, { flags: FeatureFlags; timestamp: number }> = new Map();
  private lastServerCheck: number = 0;
  private serverAvailable: boolean = true;

  constructor(config: FeatureFlagsConfig) {
    this.config = {
      ...config,
      cacheTimeout: config.cacheTimeout ?? 5 * 60 * 1000, // 5 minutes default
      enableLogging: config.enableLogging ?? false,
      fallbackFlags: config.fallbackFlags ?? {},
    };
  }

  /**
   * Get feature flags for the current user
   * Uses cache if available and not expired, otherwise fetches from server
   */
  async getFlags(): Promise<FlagEvaluationResult> {
    const userId = this.config.userId;
    const now = Date.now();

    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && now - cached.timestamp < this.config.cacheTimeout) {
      if (this.config.enableLogging) {
        console.log('🏁 Using cached feature flags for', userId);
      }
      return {
        flags: cached.flags,
        userId,
        timestamp: cached.timestamp,
        source: 'cache',
      };
    }

    // Try to fetch from server
    try {
      const flags = await this.fetchFromServer(userId);

      // Update cache
      this.cache.set(userId, {
        flags,
        timestamp: now,
      });

      this.serverAvailable = true;
      this.lastServerCheck = now;

      if (this.config.enableLogging) {
        console.log('🏁 Fetched feature flags from server for', userId);
      }

      return {
        flags,
        userId,
        timestamp: now,
        source: 'server',
      };
    } catch (error) {
      console.warn(
        '⚠️ Failed to fetch feature flags from server:',
        error instanceof Error ? error.message : String(error)
      );
      this.serverAvailable = false;
      this.lastServerCheck = now;

      // Use cached flags if available, even if expired
      if (cached) {
        if (this.config.enableLogging) {
          console.log('🏁 Using expired cached feature flags for', userId);
        }
        return {
          flags: cached.flags,
          userId,
          timestamp: cached.timestamp,
          source: 'cache',
        };
      }

      // Fall back to default flags
      if (this.config.enableLogging) {
        console.log('🏁 Using fallback feature flags for', userId);
      }
      return {
        flags: this.config.fallbackFlags,
        userId,
        timestamp: now,
        source: 'fallback',
      };
    }
  }

  /**
   * Check if a specific feature flag is enabled
   * @param flagName Name of the feature flag
   * @returns Promise resolving to boolean indicating if flag is enabled
   */
  async isEnabled(flagName: string): Promise<boolean> {
    const result = await this.getFlags();
    return result.flags[flagName] || false;
  }

  /**
   * Get multiple specific flags
   * @param flagNames Array of flag names to check
   * @returns Promise resolving to object with flag evaluations
   */
  async getSpecificFlags(flagNames: string[]): Promise<FeatureFlags> {
    const result = await this.getFlags();
    const specificFlags: FeatureFlags = {};

    for (const flagName of flagNames) {
      specificFlags[flagName] = result.flags[flagName] || false;
    }

    return specificFlags;
  }

  /**
   * Fetch flags from server
   * @param userId User identifier
   * @returns Promise resolving to feature flags object
   */
  private async fetchFromServer(userId: string): Promise<FeatureFlags> {
    const url = `${this.config.serverUrl}/flags?userId=${encodeURIComponent(userId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.flags || {};
  }

  /**
   * Invalidate cache for current user
   */
  invalidateCache(): void {
    this.cache.delete(this.config.userId);
    if (this.config.enableLogging) {
      console.log('🗑️ Invalidated feature flags cache');
    }
  }

  /**
   * Invalidate all cached flags
   */
  invalidateAllCache(): void {
    this.cache.clear();
    if (this.config.enableLogging) {
      console.log('🗑️ Invalidated all feature flags cache');
    }
  }

  /**
   * Update configuration
   * @param updates Partial configuration updates
   */
  updateConfig(updates: Partial<FeatureFlagsConfig>): void {
    this.config = { ...this.config, ...updates };

    // If userId changed, invalidate cache
    if (updates.userId && updates.userId !== this.config.userId) {
      this.invalidateCache();
    }
  }

  /**
   * Get client status information
   */
  getStatus(): {
    serverAvailable: boolean;
    lastServerCheck: number;
    cacheSize: number;
    config: FeatureFlagsConfig;
  } {
    return {
      serverAvailable: this.serverAvailable,
      lastServerCheck: this.lastServerCheck,
      cacheSize: this.cache.size,
      config: { ...this.config },
    };
  }

  /**
   * Preload flags for better performance
   * Call this during extension initialization
   */
  async preloadFlags(): Promise<void> {
    try {
      await this.getFlags();
      if (this.config.enableLogging) {
        console.log('🏁 Feature flags preloaded successfully');
      }
    } catch (error) {
      console.warn(
        '⚠️ Failed to preload feature flags:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Set up periodic cache refresh
   * @param intervalMs Refresh interval in milliseconds
   * @returns Function to stop the refresh interval
   */
  setupPeriodicRefresh(intervalMs: number = 10 * 60 * 1000): () => void {
    const intervalId = setInterval(async () => {
      try {
        // Force refresh by invalidating cache first
        this.invalidateCache();
        await this.getFlags();

        if (this.config.enableLogging) {
          console.log('🔄 Feature flags refreshed automatically');
        }
      } catch (error) {
        console.warn(
          '⚠️ Automatic feature flags refresh failed:',
          error instanceof Error ? error.message : String(error)
        );
      }
    }, intervalMs);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      if (this.config.enableLogging) {
        console.log('🛑 Stopped automatic feature flags refresh');
      }
    };
  }
}

/**
 * Default feature flags for fallback when server is unavailable
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  'webrtc-voice-chat': true,
  'advanced-annotations': false,
  'playlist-management': false,
  'subtitle-auto-download': true,
  'watch-party-scheduling': false,
  'enhanced-security': false,
  'telemetry-collection': false,
  'performance-monitoring': true,
  'accessibility-enhancements': true,
  'beta-features': false,
};

/**
 * Create a feature flags client with default configuration
 * @param serverUrl URL of the feature flags server
 * @param userId User identifier
 * @param overrides Configuration overrides
 * @returns Configured FeatureFlagsClient instance
 */
export function createFeatureFlagsClient(
  serverUrl: string,
  userId: string,
  overrides: Partial<FeatureFlagsConfig> = {}
): FeatureFlagsClient {
  const config: FeatureFlagsConfig = {
    serverUrl,
    userId,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    fallbackFlags: DEFAULT_FEATURE_FLAGS,
    enableLogging: false,
    ...overrides,
  };

  return new FeatureFlagsClient(config);
}
