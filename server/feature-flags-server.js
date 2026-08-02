#!/usr/bin/env node

/**
 * Feature Flags HTTP API Server
 * 
 * Provides REST API endpoints for feature flag management and evaluation.
 * Can run standalone or alongside the WebSocket relay server.
 */

const http = require('http');
const url = require('url');
const { FeatureFlagsService } = require('./feature-flags');

class FeatureFlagsServer {
  constructor(port = 8081) {
    this.port = port;
    this.server = null;
    this.featureFlags = new FeatureFlagsService();
    
    // CORS headers for browser requests
    this.corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };
  }

  start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(this.port, () => {
      console.log(`🏁 Feature Flags API server started on port ${this.port}`);
      console.log(`📡 API endpoint: http://localhost:${this.port}`);
      console.log(`📊 Stats endpoint: http://localhost:${this.port}/stats`);
    });

    this.server.on('error', (error) => {
      console.error('❌ Feature Flags server error:', error);
    });

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;
    const query = parsedUrl.query;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      this.sendResponse(res, 200, null, this.corsHeaders);
      return;
    }

    try {
      // Route requests
      if (path === '/flags' && method === 'GET') {
        await this.handleGetFlags(req, res, query);
      } else if (path === '/flags' && method === 'POST') {
        await this.handleUpdateFlag(req, res);
      } else if (path.startsWith('/flags/') && method === 'GET') {
        await this.handleGetFlag(req, res, path);
      } else if (path.startsWith('/flags/') && method === 'PUT') {
        await this.handleUpdateFlag(req, res, path);
      } else if (path.startsWith('/flags/') && method === 'DELETE') {
        await this.handleDeleteFlag(req, res, path);
      } else if (path === '/evaluate' && method === 'POST') {
        await this.handleEvaluateFlags(req, res);
      } else if (path === '/override' && method === 'POST') {
        await this.handleSetOverride(req, res);
      } else if (path === '/override' && method === 'DELETE') {
        await this.handleRemoveOverride(req, res);
      } else if (path === '/stats' && method === 'GET') {
        await this.handleGetStats(req, res);
      } else if (path === '/logs' && method === 'GET') {
        await this.handleGetLogs(req, res, query);
      } else if (path === '/export' && method === 'GET') {
        await this.handleExportFlags(req, res);
      } else if (path === '/import' && method === 'POST') {
        await this.handleImportFlags(req, res);
      } else {
        this.sendError(res, 404, 'NOT_FOUND', 'Endpoint not found');
      }
    } catch (error) {
      console.error('❌ Request handling error:', error);
      this.sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
  }

  /**
   * GET /flags?userId=xxx - Get all flags for a user
   */
  async handleGetFlags(req, res, query) {
    const userId = query.userId;
    
    if (!userId) {
      return this.sendError(res, 400, 'MISSING_USER_ID', 'userId parameter is required');
    }

    const flags = await this.featureFlags.getFlags(userId);
    this.sendResponse(res, 200, { flags, userId });
  }

  /**
   * GET /flags/{flagName} - Get specific flag configuration
   */
  async handleGetFlag(req, res, path) {
    const flagName = path.split('/')[2];
    const config = this.featureFlags.getFlagConfig(flagName);
    
    if (!config) {
      return this.sendError(res, 404, 'FLAG_NOT_FOUND', `Flag '${flagName}' not found`);
    }

    this.sendResponse(res, 200, {
      flagName,
      enabled: config.enabled,
      rolloutPercentage: config.rolloutPercentage,
      description: config.description,
      overrideCount: Object.keys(config.overrides).length,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    });
  }

  /**
   * POST /flags - Create new flag
   * PUT /flags/{flagName} - Update existing flag
   */
  async handleUpdateFlag(req, res, path = null) {
    const body = await this.parseRequestBody(req);
    const flagName = path ? path.split('/')[2] : body.flagName;
    
    if (!flagName) {
      return this.sendError(res, 400, 'MISSING_FLAG_NAME', 'flagName is required');
    }

    const updates = {
      enabled: body.enabled,
      rolloutPercentage: body.rolloutPercentage,
      description: body.description,
      conditions: body.conditions
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) delete updates[key];
    });

    const config = await this.featureFlags.updateFlag(flagName, updates);
    
    this.sendResponse(res, 200, {
      flagName,
      enabled: config.enabled,
      rolloutPercentage: config.rolloutPercentage,
      description: config.description,
      updatedAt: config.updatedAt
    });
  }

  /**
   * DELETE /flags/{flagName} - Delete flag (not implemented for safety)
   */
  async handleDeleteFlag(req, res, path) {
    // For safety, we don't actually delete flags, just disable them
    const flagName = path.split('/')[2];
    
    try {
      const config = await this.featureFlags.updateFlag(flagName, { 
        enabled: false,
        rolloutPercentage: 0 
      });
      
      this.sendResponse(res, 200, {
        message: `Flag '${flagName}' disabled`,
        flagName,
        enabled: config.enabled
      });
    } catch (error) {
      this.sendError(res, 404, 'FLAG_NOT_FOUND', error.message);
    }
  }

  /**
   * POST /evaluate - Evaluate multiple flags for a user
   */
  async handleEvaluateFlags(req, res) {
    const body = await this.parseRequestBody(req);
    const { userId, flags: flagNames } = body;
    
    if (!userId) {
      return this.sendError(res, 400, 'MISSING_USER_ID', 'userId is required');
    }

    let result;
    if (flagNames && Array.isArray(flagNames)) {
      // Evaluate specific flags
      result = {};
      for (const flagName of flagNames) {
        result[flagName] = this.featureFlags.evaluateFlag(flagName, userId);
      }
    } else {
      // Evaluate all flags
      result = await this.featureFlags.getFlags(userId);
    }

    this.sendResponse(res, 200, { flags: result, userId });
  }

  /**
   * POST /override - Set user override
   */
  async handleSetOverride(req, res) {
    const body = await this.parseRequestBody(req);
    const { flagName, userId, enabled } = body;
    
    if (!flagName || !userId || enabled === undefined) {
      return this.sendError(res, 400, 'MISSING_PARAMETERS', 
        'flagName, userId, and enabled are required');
    }

    try {
      this.featureFlags.setUserOverride(flagName, userId, enabled);
      this.sendResponse(res, 200, {
        message: 'Override set successfully',
        flagName,
        userId,
        enabled
      });
    } catch (error) {
      this.sendError(res, 404, 'FLAG_NOT_FOUND', error.message);
    }
  }

  /**
   * DELETE /override - Remove user override
   */
  async handleRemoveOverride(req, res) {
    const body = await this.parseRequestBody(req);
    const { flagName, userId } = body;
    
    if (!flagName || !userId) {
      return this.sendError(res, 400, 'MISSING_PARAMETERS', 
        'flagName and userId are required');
    }

    try {
      this.featureFlags.removeUserOverride(flagName, userId);
      this.sendResponse(res, 200, {
        message: 'Override removed successfully',
        flagName,
        userId
      });
    } catch (error) {
      this.sendError(res, 404, 'FLAG_NOT_FOUND', error.message);
    }
  }

  /**
   * GET /stats - Get feature flag statistics
   */
  async handleGetStats(req, res) {
    const stats = this.featureFlags.getStats();
    this.sendResponse(res, 200, stats);
  }

  /**
   * GET /logs?limit=100 - Get evaluation logs
   */
  async handleGetLogs(req, res, query) {
    const limit = parseInt(query.limit) || 100;
    const logs = this.featureFlags.getEvaluationLog(limit);
    
    this.sendResponse(res, 200, {
      logs,
      count: logs.length,
      limit
    });
  }

  /**
   * GET /export - Export all flag configurations
   */
  async handleExportFlags(req, res) {
    const exported = this.featureFlags.exportFlags();
    
    res.setHeader('Content-Disposition', 'attachment; filename="feature-flags.json"');
    this.sendResponse(res, 200, exported);
  }

  /**
   * POST /import - Import flag configurations
   */
  async handleImportFlags(req, res) {
    const body = await this.parseRequestBody(req);
    
    try {
      this.featureFlags.importFlags(body);
      this.sendResponse(res, 200, {
        message: 'Flags imported successfully',
        count: Object.keys(body).length
      });
    } catch (error) {
      this.sendError(res, 400, 'IMPORT_ERROR', error.message);
    }
  }

  /**
   * Parse JSON request body
   */
  async parseRequestBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });
      
      req.on('error', reject);
    });
  }

  /**
   * Send JSON response with CORS headers
   */
  sendResponse(res, statusCode, data, additionalHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...this.corsHeaders,
      ...additionalHeaders
    };

    res.writeHead(statusCode, headers);
    res.end(data ? JSON.stringify(data, null, 2) : '');
  }

  /**
   * Send error response
   */
  sendError(res, statusCode, code, message) {
    this.sendResponse(res, statusCode, {
      error: { code, message },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = () => {
      console.log('\n🛑 Shutting down Feature Flags server...');
      
      if (this.server) {
        this.server.close(() => {
          console.log('✅ Feature Flags server closed gracefully');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

// CLI interface
if (require.main === module) {
  const port = process.env.FEATURE_FLAGS_PORT || 8081;
  const server = new FeatureFlagsServer(port);
  
  server.start();
}

module.exports = { FeatureFlagsServer };