/**
 * Redis Cache Manager for Watch Party Extension
 * 
 * Provides Redis caching for active room state, user sessions, and performance optimization.
 */

const Redis = require('ioredis');

class RedisManager {
  constructor(config = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'watch_party:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      ...config
    };

    this.redis = null;
    this.isConnected = false;
    this.keyTTL = {
      room_state: 60 * 60, // 1 hour
      user_session: 24 * 60 * 60, // 24 hours
      feature_flags: 5 * 60, // 5 minutes
      participant_list: 30 * 60, // 30 minutes
      chat_cache: 10 * 60, // 10 minutes
      sync_state: 5 * 60 // 5 minutes
    };
  }

  /**
   * Connect to Redis
   */
  async connect() {
    try {
      this.redis = new Redis(this.config);

      // Set up event handlers
      this.redis.on('connect', () => {
        console.log('🔴 Redis connected');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis error:', error);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('🔴 Redis connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      // Test connection
      await this.redis.ping();
      console.log('✅ Redis cache manager initialized');
      
      return this.redis;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Generate cache key with prefix
   * @param {string} type - Cache type
   * @param {string} identifier - Unique identifier
   * @returns {string} Full cache key
   */
  getKey(type, identifier) {
    return `${this.config.keyPrefix}${type}:${identifier}`;
  }

  /**
   * Set cache value with TTL
   * @param {string} type - Cache type
   * @param {string} identifier - Unique identifier
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async set(type, identifier, value, ttl = null) {
    if (!this.isConnected) {
      console.warn('⚠️  Redis not connected, skipping cache set');
      return false;
    }

    try {
      const key = this.getKey(type, identifier);
      const serializedValue = JSON.stringify(value);
      const cacheTTL = ttl || this.keyTTL[type] || 300; // Default 5 minutes

      await this.redis.setex(key, cacheTTL, serializedValue);
      return true;
    } catch (error) {
      console.error('❌ Redis set error:', error);
      return false;
    }
  }

  /**
   * Get cache value
   * @param {string} type - Cache type
   * @param {string} identifier - Unique identifier
   * @returns {Promise<any|null>} Cached value or null
   */
  async get(type, identifier) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const key = this.getKey(type, identifier);
      const value = await this.redis.get(key);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      console.error('❌ Redis get error:', error);
      return null;
    }
  }

  /**
   * Delete cache entry
   * @param {string} type - Cache type
   * @param {string} identifier - Unique identifier
   */
  async delete(type, identifier) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const key = this.getKey(type, identifier);
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('❌ Redis delete error:', error);
      return false;
    }
  }

  /**
   * Check if cache entry exists
   * @param {string} type - Cache type
   * @param {string} identifier - Unique identifier
   * @returns {Promise<boolean>} Whether key exists
   */
  async exists(type, identifier) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const key = this.getKey(type, identifier);
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis exists error:', error);
      return false;
    }
  }

  /**
   * Set cache entry with expiration time
   * @param {string} type - Cache type
   * @param {string} identifier - Unique identifier
   * @param {number} seconds - Seconds until expiration
   */
  async expire(type, identifier, seconds) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const key = this.getKey(type, identifier);
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis expire error:', error);
      return false;
    }
  }

  /**
   * Get multiple cache entries
   * @param {string} type - Cache type
   * @param {Array<string>} identifiers - Array of identifiers
   * @returns {Promise<Object>} Object mapping identifiers to values
   */
  async getMultiple(type, identifiers) {
    if (!this.isConnected || identifiers.length === 0) {
      return {};
    }

    try {
      const keys = identifiers.map(id => this.getKey(type, id));
      const values = await this.redis.mget(...keys);
      
      const result = {};
      identifiers.forEach((id, index) => {
        const value = values[index];
        result[id] = value ? JSON.parse(value) : null;
      });

      return result;
    } catch (error) {
      console.error('❌ Redis getMultiple error:', error);
      return {};
    }
  }

  /**
   * Set multiple cache entries
   * @param {string} type - Cache type
   * @param {Object} data - Object mapping identifiers to values
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async setMultiple(type, data, ttl = null) {
    if (!this.isConnected || Object.keys(data).length === 0) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();
      const cacheTTL = ttl || this.keyTTL[type] || 300;

      Object.entries(data).forEach(([identifier, value]) => {
        const key = this.getKey(type, identifier);
        const serializedValue = JSON.stringify(value);
        pipeline.setex(key, cacheTTL, serializedValue);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('❌ Redis setMultiple error:', error);
      return false;
    }
  }

  /**
   * Cache room state
   * @param {string} roomId - Room identifier
   * @param {Object} state - Room state object
   */
  async cacheRoomState(roomId, state) {
    return await this.set('room_state', roomId, {
      ...state,
      cached_at: new Date().toISOString()
    });
  }

  /**
   * Get cached room state
   * @param {string} roomId - Room identifier
   * @returns {Promise<Object|null>} Cached room state
   */
  async getRoomState(roomId) {
    return await this.get('room_state', roomId);
  }

  /**
   * Cache participant list for a room
   * @param {string} roomId - Room identifier
   * @param {Array} participants - Array of participant objects
   */
  async cacheParticipants(roomId, participants) {
    return await this.set('participant_list', roomId, {
      participants,
      count: participants.length,
      cached_at: new Date().toISOString()
    });
  }

  /**
   * Get cached participant list
   * @param {string} roomId - Room identifier
   * @returns {Promise<Array|null>} Cached participants
   */
  async getParticipants(roomId) {
    const cached = await this.get('participant_list', roomId);
    return cached ? cached.participants : null;
  }

  /**
   * Cache user session
   * @param {string} sessionToken - Session token
   * @param {Object} sessionData - Session data
   */
  async cacheUserSession(sessionToken, sessionData) {
    return await this.set('user_session', sessionToken, sessionData);
  }

  /**
   * Get cached user session
   * @param {string} sessionToken - Session token
   * @returns {Promise<Object|null>} Cached session data
   */
  async getUserSession(sessionToken) {
    return await this.get('user_session', sessionToken);
  }

  /**
   * Invalidate user session
   * @param {string} sessionToken - Session token
   */
  async invalidateUserSession(sessionToken) {
    return await this.delete('user_session', sessionToken);
  }

  /**
   * Cache feature flags for a user
   * @param {string} userId - User identifier
   * @param {Object} flags - Feature flags object
   */
  async cacheFeatureFlags(userId, flags) {
    return await this.set('feature_flags', userId, {
      flags,
      cached_at: new Date().toISOString()
    });
  }

  /**
   * Get cached feature flags
   * @param {string} userId - User identifier
   * @returns {Promise<Object|null>} Cached feature flags
   */
  async getFeatureFlags(userId) {
    const cached = await this.get('feature_flags', userId);
    return cached ? cached.flags : null;
  }

  /**
   * Cache recent chat messages for a room
   * @param {string} roomId - Room identifier
   * @param {Array} messages - Array of recent messages
   */
  async cacheChatMessages(roomId, messages) {
    return await this.set('chat_cache', roomId, {
      messages: messages.slice(-50), // Keep last 50 messages
      cached_at: new Date().toISOString()
    });
  }

  /**
   * Get cached chat messages
   * @param {string} roomId - Room identifier
   * @returns {Promise<Array|null>} Cached messages
   */
  async getChatMessages(roomId) {
    const cached = await this.get('chat_cache', roomId);
    return cached ? cached.messages : null;
  }

  /**
   * Cache sync state for a room
   * @param {string} roomId - Room identifier
   * @param {Object} syncState - Synchronization state
   */
  async cacheSyncState(roomId, syncState) {
    return await this.set('sync_state', roomId, {
      ...syncState,
      cached_at: new Date().toISOString()
    });
  }

  /**
   * Get cached sync state
   * @param {string} roomId - Room identifier
   * @returns {Promise<Object|null>} Cached sync state
   */
  async getSyncState(roomId) {
    return await this.get('sync_state', roomId);
  }

  /**
   * Invalidate all cache entries for a room
   * @param {string} roomId - Room identifier
   */
  async invalidateRoom(roomId) {
    const types = ['room_state', 'participant_list', 'chat_cache', 'sync_state'];
    const promises = types.map(type => this.delete(type, roomId));
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    console.log(`🗑️  Invalidated ${successful}/${types.length} cache entries for room ${roomId}`);
    return successful === types.length;
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Parse memory info
      const memoryLines = info.split('\r\n');
      const memoryStats = {};
      memoryLines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          if (key.startsWith('used_memory')) {
            memoryStats[key] = value;
          }
        }
      });

      // Count keys by type
      const keyTypes = ['room_state', 'participant_list', 'user_session', 'feature_flags', 'chat_cache', 'sync_state'];
      const keyCounts = {};
      
      for (const type of keyTypes) {
        const pattern = this.getKey(type, '*');
        const keys = await this.redis.keys(pattern);
        keyCounts[type] = keys.length;
      }

      return {
        connected: this.isConnected,
        memory: memoryStats,
        keyspace,
        keyCounts,
        totalKeys: Object.values(keyCounts).reduce((sum, count) => sum + count, 0)
      };
    } catch (error) {
      console.error('❌ Redis stats error:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Clean up expired keys and perform maintenance
   */
  async cleanup() {
    if (!this.isConnected) {
      return false;
    }

    try {
      console.log('🧹 Running Redis cache cleanup...');
      
      // Get all keys with our prefix
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log('✅ No cache keys to clean up');
        return true;
      }

      // Check TTL for each key and remove expired ones
      const pipeline = this.redis.pipeline();
      let expiredCount = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          // Key exists but has no expiration, set default TTL
          pipeline.expire(key, 3600); // 1 hour default
        } else if (ttl === -2) {
          // Key doesn't exist (already expired)
          expiredCount++;
        }
      }

      await pipeline.exec();
      
      console.log(`🗑️  Redis cleanup completed. Found ${keys.length} keys, ${expiredCount} expired`);
      return true;
    } catch (error) {
      console.error('❌ Redis cleanup failed:', error);
      return false;
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck() {
    try {
      if (!this.redis) {
        return { healthy: false, error: 'Not connected' };
      }

      const start = Date.now();
      const pong = await this.redis.ping();
      const responseTime = Date.now() - start;

      if (pong !== 'PONG') {
        return { healthy: false, error: 'Invalid ping response' };
      }

      return {
        healthy: true,
        connected: this.isConnected,
        responseTime
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
      console.log('🔴 Redis connection closed');
    }
  }
}

// Singleton instance
let redisInstance = null;

/**
 * Get Redis manager instance (singleton)
 * @param {Object} config - Redis configuration
 * @returns {RedisManager} Redis manager instance
 */
function getRedisManager(config = {}) {
  if (!redisInstance) {
    redisInstance = new RedisManager(config);
  }
  return redisInstance;
}

/**
 * Initialize Redis with connection
 * @param {Object} config - Redis configuration
 * @returns {Promise<RedisManager>} Connected Redis manager instance
 */
async function initializeRedis(config = {}) {
  const redis = getRedisManager(config);
  
  if (!redis.isConnected) {
    await redis.connect();
  }

  return redis;
}

module.exports = {
  RedisManager,
  getRedisManager,
  initializeRedis
};