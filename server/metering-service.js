#!/usr/bin/env node

/**
 * Metering Service for Watch Party Extension
 *
 * Authoritative server-side usage metering / rate limiting.
 *
 * Trust boundary: THIS service is the authoritative source for enforcement
 * and accounting.  Any usage reported by clients is advisory only and is
 * never trusted for enforcement -- the server counts the events it actually
 * observes (messages received over the WebSocket relay).
 *
 * Dimensions:
 *   - chatMessages        sliding-window count per user
 *   - reactions           sliding-window count per user
 *   - annotationsCreated  sliding-window count per user
 *   - roomsCreated        sliding-window count per user
 *   - connections         concurrent gauge per user (windowMs = 0)
 *
 * Enforcement actions: 'reject' (hard limit) or 'warn' (soft limit).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ALL_DIMENSIONS = ['chatMessages', 'reactions', 'annotationsCreated', 'roomsCreated', 'connections'];

const DEFAULT_DIMENSIONS = {
  chatMessages:       { enabled: true, limit: 30, windowMs: 60_000,    action: 'warn' },
  reactions:          { enabled: true, limit: 20, windowMs: 60_000,    action: 'warn' },
  annotationsCreated: { enabled: true, limit: 15, windowMs: 60_000,    action: 'warn' },
  roomsCreated:       { enabled: true, limit: 5,  windowMs: 3_600_000, action: 'reject' },
  connections:        { enabled: true, limit: 5,  windowMs: 0,         action: 'reject' },
};

function normalizeConfig(raw = {}) {
  const src = (raw && typeof raw === 'object') ? raw : {};
  const dims = {};
  for (const dim of ALL_DIMENSIONS) {
    const d = (src.dimensions && src.dimensions[dim]) || {};
    dims[dim] = {
      enabled: typeof d.enabled === 'boolean' ? d.enabled : DEFAULT_DIMENSIONS[dim].enabled,
      limit: validNonNeg(d.limit) ? d.limit : DEFAULT_DIMENSIONS[dim].limit,
      windowMs: validNonNeg(d.windowMs) ? d.windowMs : DEFAULT_DIMENSIONS[dim].windowMs,
      action: (d.action === 'reject' || d.action === 'warn') ? d.action : DEFAULT_DIMENSIONS[dim].action,
    };
  }
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : true,
    dimensions: dims,
  };
}

function validNonNeg(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

class MeteringService {
  /**
   * @param {Object} [config]          Metering configuration
   * @param {Object} [options]
   * @param {string} [options.stateFile] Path for state persistence (default: none)
   * @param {number} [options.now]      Clock override for testing
   */
  constructor(config = {}, options = {}) {
    this.config = normalizeConfig(config);
    this.stateFile = options.stateFile || null;
    this.now = options.now || (() => Date.now());

    // userId -> dimension -> { timestamps: number[], windowStart: number }
    this.windows = new Map();
    // userId -> Set of connection tokens (for concurrent gauge)
    this.connections = new Map();

    // Debounce persistence writes
    this._saveTimer = null;

    this._loadState();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Check a dimension against limits and record the event.
   * For gauge dimensions (windowMs === 0) call `acquireConnection` instead.
   *
   * @returns {{ allowed: boolean, current: number, limit: number, action: string, reason?: string }}
   */
  checkAndRecord(userId, dimension, amount = 1) {
    if (!this.config.enabled) {
      return this._allowed(dimension, 0);
    }
    if (!ALL_DIMENSIONS.includes(dimension)) {
      return this._allowed(dimension, 0);
    }

    const dimCfg = this.config.dimensions[dimension];
    if (!dimCfg || !dimCfg.enabled) {
      return this._allowed(dimension, 0);
    }

    if (dimCfg.windowMs === 0) {
      // Gauge dimension must be managed via acquireConnection/releaseConnection
      const current = this._gaugeCount(userId, dimension);
      const allowed = current + amount <= dimCfg.limit;
      return {
        allowed,
        current,
        limit: dimCfg.limit,
        windowMs: 0,
        action: dimCfg.action,
        ...(allowed ? {} : { reason: `Limit for ${dimension} reached (${current}/${dimCfg.limit})` }),
      };
    }

    const now = this.now();
    let bucket = this._getBucket(userId, dimension);

    if (now >= bucket.windowStart + dimCfg.windowMs) {
      bucket.timestamps = [];
      bucket.windowStart = now;
    }

    const current = bucket.timestamps.length;
    const allowed = current + amount <= dimCfg.limit;

    if (allowed) {
      for (let i = 0; i < amount; i++) {
        bucket.timestamps.push(now);
      }
      this._scheduleSave();
    }

    return {
      allowed,
      current: allowed ? current + amount : current,
      limit: dimCfg.limit,
      windowMs: dimCfg.windowMs,
      action: dimCfg.action,
      ...(allowed ? {} : { reason: `Limit for ${dimension} reached (${current}/${dimCfg.limit})` }),
    };
  }

  /**
   * Acquire a concurrent-gauge slot (connections dimension).
   */
  acquireConnection(userId, connectionToken = crypto.randomUUID()) {
    if (!this.config.enabled) {
      return { allowed: true, token: connectionToken, current: 1, limit: Infinity };
    }

    const dimCfg = this.config.dimensions.connections;
    if (!dimCfg || !dimCfg.enabled) {
      return { allowed: true, token: connectionToken, current: 1, limit: Infinity };
    }

    let conns = this.connections.get(userId);
    if (!conns) {
      conns = new Set();
      this.connections.set(userId, conns);
    }

    if (conns.size >= dimCfg.limit) {
      return {
        allowed: false,
        token: connectionToken,
        current: conns.size,
        limit: dimCfg.limit,
        reason: `Concurrent connection limit reached (${conns.size}/${dimCfg.limit})`,
      };
    }

    conns.add(connectionToken);
    this._scheduleSave();
    return { allowed: true, token: connectionToken, current: conns.size, limit: dimCfg.limit };
  }

  /**
   * Release a concurrent-gauge slot (connections dimension).
   */
  releaseConnection(userId, connectionToken) {
    const conns = this.connections.get(userId);
    if (conns && connectionToken) {
      conns.delete(connectionToken);
      if (conns.size === 0) {
        this.connections.delete(userId);
      }
      this._scheduleSave();
    }
  }

  /**
   * Return authoritative state for a user (for METERING_STATE message).
   */
  getState(userId) {
    const usage = {};
    const now = this.now();

    for (const dim of ALL_DIMENSIONS) {
      const dimCfg = this.config.dimensions[dim];
      if (!dimCfg || !dimCfg.enabled) continue;

      let current = 0;
      let windowStart = 0;

      if (dimCfg.windowMs === 0) {
        current = this._gaugeCount(userId, dim);
      } else {
        const bucket = this.windows.get(userId)?.get(dim);
        if (bucket) {
          if (now >= bucket.windowStart + dimCfg.windowMs) {
            current = 0;
            windowStart = now;
          } else {
            current = bucket.timestamps.length;
            windowStart = bucket.windowStart;
          }
        } else {
          windowStart = now;
        }
      }

      usage[dim] = {
        dimension: dim,
        current,
        limit: dimCfg.limit,
        windowMs: dimCfg.windowMs,
        windowStart,
        action: dimCfg.action,
        enabled: true,
        authoritative: true,
      };
    }

    return { userId, usage, timestamp: now, source: 'server' };
  }

  /**
   * Prune expired windows and empty user entries.
   */
  prune() {
    const now = this.now();
    for (const [userId, dims] of this.windows.entries()) {
      for (const [dim, bucket] of dims.entries()) {
        const windowMs = this.config.dimensions[dim]?.windowMs;
        if (windowMs && now >= bucket.windowStart + windowMs) {
          bucket.timestamps = [];
          bucket.windowStart = now;
        }
      }
      if (dims.size === 0) this.windows.delete(userId);
    }
  }

  /**
   * Return current config snapshot (for diagnostics).
   */
  getConfig() {
    return this.config;
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  _scheduleSave() {
    if (!this.stateFile) return;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.saveState(), 1000);
  }

  saveState() {
    if (!this.stateFile) return Promise.resolve();
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }

    try {
      const payload = { version: 1, savedAt: this.now(), windows: {}, connections: {} };

      for (const [userId, dims] of this.windows.entries()) {
        payload.windows[userId] = {};
        for (const [dim, bucket] of dims.entries()) {
          payload.windows[userId][dim] = { timestamps: bucket.timestamps, windowStart: bucket.windowStart };
        }
      }
      for (const [userId, conns] of this.connections.entries()) {
        payload.connections[userId] = Array.from(conns);
      }

      fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
      fs.writeFileSync(this.stateFile, JSON.stringify(payload, null, 2));
      return Promise.resolve(true);
    } catch (error) {
      console.error('❌ Metering state save failed:', error.message);
      return Promise.resolve(false);
    }
  }

  _loadState() {
    if (!this.stateFile) return;
    let raw;
    try {
      raw = fs.readFileSync(this.stateFile, 'utf8');
    } catch {
      return; // No prior state -- fresh start
    }

    try {
      const payload = JSON.parse(raw);
      if (!payload || payload.version !== 1) return;

      if (payload.windows && typeof payload.windows === 'object') {
        for (const [userId, dims] of Object.entries(payload.windows)) {
          for (const [dim, bucket] of Object.entries(dims)) {
            if (!ALL_DIMENSIONS.includes(dim)) continue;
            const windowMs = this.config.dimensions[dim]?.windowMs;
            if (!windowMs) continue; // gauge dims not persisted as windows
            const restored = {
              timestamps: Array.isArray(bucket.timestamps) ? bucket.timestamps.filter((t) => typeof t === 'number') : [],
              windowStart: typeof bucket.windowStart === 'number' ? bucket.windowStart : 0,
            };
            if (restored.timestamps.length === 0) continue;
            this._ensureUser(userId).set(dim, restored);
          }
        }
      }

      if (payload.connections && typeof payload.connections === 'object') {
        for (const [userId, tokens] of Object.entries(payload.connections)) {
          if (!Array.isArray(tokens) || tokens.length === 0) continue;
          this.connections.set(userId, new Set(tokens.filter((t) => typeof t === 'string')));
        }
      }

      console.log('♻️  Restored metering state from disk');
    } catch (error) {
      // Corrupt state file must never crash the server; start fresh and log.
      console.error('⚠️  Metering state file corrupt, starting fresh:', error.message);
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  _ensureUser(userId) {
    let dims = this.windows.get(userId);
    if (!dims) {
      dims = new Map();
      this.windows.set(userId, dims);
    }
    return dims;
  }

  _getBucket(userId, dimension) {
    const dims = this._ensureUser(userId);
    let bucket = dims.get(dimension);
    if (!bucket) {
      bucket = { timestamps: [], windowStart: this.now() };
      dims.set(dimension, bucket);
    }
    return bucket;
  }

  _gaugeCount(userId, dimension) {
    if (dimension === 'connections') {
      return this.connections.get(userId)?.size || 0;
    }
    return 0;
  }

  _allowed(dimension, current) {
    const dimCfg = this.config.dimensions[dimension];
    return {
      allowed: true,
      current,
      limit: dimCfg ? dimCfg.limit : Infinity,
      windowMs: dimCfg ? dimCfg.windowMs : 0,
      action: dimCfg ? dimCfg.action : 'warn',
    };
  }
}

module.exports = { MeteringService, ALL_DIMENSIONS, DEFAULT_DIMENSIONS, normalizeConfig };
