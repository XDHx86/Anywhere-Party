#!/usr/bin/env node

/**
 * Feature Flags Service for Watch Party Extension
 * 
 * Provides server-side feature flag management with percentage-based rollouts,
 * A/B testing capabilities, and client-side flag evaluation and caching.
 */

const crypto = require('crypto');

/**
 * Feature flag configuration structure
 */
class FlagConfig {
  constructor({
    enabled = false,
    rolloutPercentage = 0,
    conditions = {},
    overrides = {},
    description = '',
    createdAt = new Date(),
    updatedAt = new Date()
  } = {}) {
    this.enabled = enabled;
    this.rolloutPercentage = Math.max(0, Math.min(100, rolloutPercentage));
    this.conditions = conditions; // Additional conditions for flag evaluation
    this.overrides = overrides; // User-specific overrides
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Update flag configuration
   */
  update(updates) {
    Object.assign(this, updates);
    this.updatedAt = new Date();
    return this;
  }
}

/**
 * Feature Flags Service
 * 
 * Manages feature flags with support for:
 * - Percentage-based rollouts
 * - User-specific overrides
 * - A/B testing groups
 * - Audit logging
 */
class FeatureFlagsService {
  constructor() {
    this.flags = new Map(); // flagName -> FlagConfig
    this.evaluationLog = []; // Audit log for flag evaluations
    this.maxLogEntries = 10000; // Limit log size in memory
    
    // Initialize with default flags
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags based on extension requirements
   */
  initializeDefaultFlags() {
    const defaultFlags = {
      'webrtc-voice-chat': new FlagConfig({
        enabled: true,
        rolloutPercentage: 100,
        description: 'Enable WebRTC voice communication features'
      }),
      'advanced-annotations': new FlagConfig({
        enabled: false,
        rolloutPercentage: 25,
        description: 'Advanced collaborative annotation system with multiple layers'
      }),
      'playlist-management': new FlagConfig({
        enabled: false,
        rolloutPercentage: 0,
        description: 'Shared video queue and playlist management'
      }),
      'subtitle-auto-download': new FlagConfig({
        enabled: true,
        rolloutPercentage: 80,
        description: 'Automatic subtitle download from OpenSubtitles'
      }),
      'watch-party-scheduling': new FlagConfig({
        enabled: false,
        rolloutPercentage: 10,
        description: 'Scheduled watch party creation and calendar integration'
      }),
      'enhanced-security': new FlagConfig({
        enabled: false,
        rolloutPercentage: 50,
        description: 'Enhanced security features including E2E encryption'
      }),
      'telemetry-collection': new FlagConfig({
        enabled: false,
        rolloutPercentage: 0,
        description: 'Telemetry and analytics collection (opt-out by default)'
      }),
      'performance-monitoring': new FlagConfig({
        enabled: true,
        rolloutPercentage: 100,
        description: 'Performance monitoring and drift analysis'
      }),
      'accessibility-enhancements': new FlagConfig({
        enabled: true,
        rolloutPercentage: 100,
        description: 'Accessibility features and keyboard navigation'
      }),
      'beta-features': new FlagConfig({
        enabled: false,
        rolloutPercentage: 5,
        description: 'Beta features for testing and feedback'
      })
    };

    for (const [flagName, config] of Object.entries(defaultFlags)) {
      this.flags.set(flagName, config);
    }

    console.log(`🏁 Initialized ${this.flags.size} default feature flags`);
  }

  /**
   * Get all feature flags for a specific user
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Object containing flag evaluations
   */
  async getFlags(userId) {
    const result = {};
    
    for (const [flagName, config] of this.flags) {
      result[flagName] = this.evaluateFlag(flagName, userId);
    }

    return result;
  }

  /**
   * Update a feature flag configuration
   * @param {string} flagName - Name of the flag to update
   * @param {Object} updates - Configuration updates
   * @returns {Promise<FlagConfig>} Updated flag configuration
   */
  async updateFlag(flagName, updates) {
    let config = this.flags.get(flagName);
    
    if (!config) {
      // Create new flag if it doesn't exist
      config = new FlagConfig(updates);
      this.flags.set(flagName, config);
      console.log(`🆕 Created new feature flag: ${flagName}`);
    } else {
      config.update(updates);
      console.log(`🔄 Updated feature flag: ${flagName}`);
    }

    // Log the flag update
    this.logFlagUpdate(flagName, updates);
    
    return config;
  }

  /**
   * Evaluate a single feature flag for a user
   * @param {string} flagName - Name of the flag to evaluate
   * @param {string} userId - User identifier
   * @returns {boolean} Whether the flag is enabled for this user
   */
  evaluateFlag(flagName, userId) {
    const config = this.flags.get(flagName);
    
    if (!config) {
      console.warn(`⚠️  Unknown feature flag: ${flagName}`);
      this.logFlagEvaluation(flagName, userId, false, 'FLAG_NOT_FOUND');
      return false;
    }

    // Check if flag is globally disabled
    if (!config.enabled) {
      this.logFlagEvaluation(flagName, userId, false, 'GLOBALLY_DISABLED');
      return false;
    }

    // Check for user-specific override
    if (config.overrides[userId] !== undefined) {
      const result = config.overrides[userId];
      this.logFlagEvaluation(flagName, userId, result, 'USER_OVERRIDE');
      return result;
    }

    // Evaluate percentage-based rollout
    const result = this.isUserInRollout(userId, flagName, config.rolloutPercentage);
    this.logFlagEvaluation(flagName, userId, result, 'PERCENTAGE_ROLLOUT');
    
    return result;
  }

  /**
   * Determine if a user is included in a percentage-based rollout
   * Uses consistent hashing to ensure stable assignments
   * @param {string} userId - User identifier
   * @param {string} flagName - Flag name for consistent hashing
   * @param {number} percentage - Rollout percentage (0-100)
   * @returns {boolean} Whether user is in rollout
   */
  isUserInRollout(userId, flagName, percentage) {
    if (percentage <= 0) return false;
    if (percentage >= 100) return true;

    // Create consistent hash from userId and flagName
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}:${flagName}`)
      .digest('hex');
    
    // Convert first 8 characters to number and get percentage
    const hashNumber = parseInt(hash.substring(0, 8), 16);
    const userPercentage = (hashNumber % 10000) / 100; // 0-99.99
    
    return userPercentage < percentage;
  }

  /**
   * Set user-specific override for a flag
   * @param {string} flagName - Name of the flag
   * @param {string} userId - User identifier
   * @param {boolean} enabled - Override value
   */
  setUserOverride(flagName, userId, enabled) {
    const config = this.flags.get(flagName);
    if (!config) {
      throw new Error(`Feature flag '${flagName}' not found`);
    }

    config.overrides[userId] = enabled;
    config.updatedAt = new Date();
    
    console.log(`🎯 Set override for ${flagName}: ${userId} = ${enabled}`);
    this.logFlagUpdate(flagName, { userOverride: { userId, enabled } });
  }

  /**
   * Remove user-specific override for a flag
   * @param {string} flagName - Name of the flag
   * @param {string} userId - User identifier
   */
  removeUserOverride(flagName, userId) {
    const config = this.flags.get(flagName);
    if (!config) {
      throw new Error(`Feature flag '${flagName}' not found`);
    }

    delete config.overrides[userId];
    config.updatedAt = new Date();
    
    console.log(`🗑️  Removed override for ${flagName}: ${userId}`);
    this.logFlagUpdate(flagName, { removedUserOverride: userId });
  }

  /**
   * Get flag configuration (without evaluation)
   * @param {string} flagName - Name of the flag
   * @returns {FlagConfig|null} Flag configuration or null if not found
   */
  getFlagConfig(flagName) {
    return this.flags.get(flagName) || null;
  }

  /**
   * List all available flags with their configurations
   * @returns {Object} Object mapping flag names to configurations
   */
  listFlags() {
    const result = {};
    for (const [flagName, config] of this.flags) {
      result[flagName] = {
        enabled: config.enabled,
        rolloutPercentage: config.rolloutPercentage,
        description: config.description,
        overrideCount: Object.keys(config.overrides).length,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      };
    }
    return result;
  }

  /**
   * Log flag evaluation for audit purposes
   * @param {string} flagName - Name of the flag
   * @param {string} userId - User identifier
   * @param {boolean} result - Evaluation result
   * @param {string} reason - Reason for the result
   */
  logFlagEvaluation(flagName, userId, result, reason) {
    const logEntry = {
      type: 'EVALUATION',
      flagName,
      userId: this.anonymizeUserId(userId),
      result,
      reason,
      timestamp: new Date().toISOString()
    };

    this.addLogEntry(logEntry);
  }

  /**
   * Log flag configuration updates
   * @param {string} flagName - Name of the flag
   * @param {Object} updates - Updates made to the flag
   */
  logFlagUpdate(flagName, updates) {
    const logEntry = {
      type: 'UPDATE',
      flagName,
      updates,
      timestamp: new Date().toISOString()
    };

    this.addLogEntry(logEntry);
  }

  /**
   * Add entry to evaluation log with size management
   * @param {Object} logEntry - Log entry to add
   */
  addLogEntry(logEntry) {
    this.evaluationLog.push(logEntry);
    
    // Trim log if it exceeds maximum size
    if (this.evaluationLog.length > this.maxLogEntries) {
      this.evaluationLog = this.evaluationLog.slice(-this.maxLogEntries);
    }
  }

  /**
   * Get evaluation log entries
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Recent log entries
   */
  getEvaluationLog(limit = 100) {
    return this.evaluationLog.slice(-limit);
  }

  /**
   * Anonymize user ID for logging (keep first 8 chars of hash)
   * @param {string} userId - Original user ID
   * @returns {string} Anonymized user ID
   */
  anonymizeUserId(userId) {
    return crypto
      .createHash('sha256')
      .update(userId)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Get statistics about flag usage
   * @returns {Object} Usage statistics
   */
  getStats() {
    const stats = {
      totalFlags: this.flags.size,
      enabledFlags: 0,
      flagsWithOverrides: 0,
      totalOverrides: 0,
      logEntries: this.evaluationLog.length,
      flagBreakdown: {}
    };

    for (const [flagName, config] of this.flags) {
      if (config.enabled) stats.enabledFlags++;
      
      const overrideCount = Object.keys(config.overrides).length;
      if (overrideCount > 0) stats.flagsWithOverrides++;
      stats.totalOverrides += overrideCount;

      stats.flagBreakdown[flagName] = {
        enabled: config.enabled,
        rolloutPercentage: config.rolloutPercentage,
        overrides: overrideCount
      };
    }

    return stats;
  }

  /**
   * Export flag configurations for backup/migration
   * @returns {Object} Serializable flag configurations
   */
  exportFlags() {
    const exported = {};
    for (const [flagName, config] of this.flags) {
      exported[flagName] = {
        enabled: config.enabled,
        rolloutPercentage: config.rolloutPercentage,
        conditions: config.conditions,
        overrides: config.overrides,
        description: config.description,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString()
      };
    }
    return exported;
  }

  /**
   * Import flag configurations from backup/migration
   * @param {Object} flagData - Flag configurations to import
   */
  importFlags(flagData) {
    for (const [flagName, data] of Object.entries(flagData)) {
      const config = new FlagConfig({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      });
      
      this.flags.set(flagName, config);
    }
    
    console.log(`📥 Imported ${Object.keys(flagData).length} feature flags`);
  }
}

module.exports = { FeatureFlagsService, FlagConfig };