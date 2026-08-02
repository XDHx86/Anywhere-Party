/**
 * Database Connection Management for Watch Party Extension
 * 
 * Provides PostgreSQL connection pooling, query utilities, and migration support.
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class DatabaseConnection {
  constructor(config = {}) {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'watch_party',
      user: process.env.DB_USER || 'watch_party_user',
      password: process.env.DB_PASSWORD || 'watch_party_password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX) || 20, // Maximum pool size
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
      ...config
    };

    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection pool
   */
  async connect() {
    try {
      this.pool = new Pool(this.config);

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      console.log('🗄️  Database connected successfully');
      
      // Set up connection event handlers
      this.pool.on('error', (err) => {
        console.error('❌ Database pool error:', err);
        this.isConnected = false;
      });

      this.pool.on('connect', () => {
        console.log('🔌 New database client connected');
      });

      return this.pool;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Execute a query with parameters
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = []) {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.log(`🐌 Slow query (${duration}ms):`, text.substring(0, 100));
      }
      
      return result;
    } catch (error) {
      console.error('❌ Database query error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Function that receives client and executes queries
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a single row from query result
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} Single row or null
   */
  async queryOne(text, params = []) {
    const result = await this.query(text, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get all rows from query result
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Array of rows
   */
  async queryAll(text, params = []) {
    const result = await this.query(text, params);
    return result.rows;
  }

  /**
   * Insert a record and return the inserted row
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @param {string} returning - Columns to return (default: '*')
   * @returns {Promise<Object>} Inserted row
   */
  async insert(table, data, returning = '*') {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const columns = keys.join(', ');

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING ${returning}`;
    const result = await this.query(query, values);
    
    return result.rows[0];
  }

  /**
   * Update records and return updated rows
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} where - Where conditions
   * @param {string} returning - Columns to return (default: '*')
   * @returns {Promise<Array>} Updated rows
   */
  async update(table, data, where, returning = '*') {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    const setClause = dataKeys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    const whereClause = whereKeys.map((key, index) => `${key} = $${dataKeys.length + index + 1}`).join(' AND ');

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING ${returning}`;
    const result = await this.query(query, [...dataValues, ...whereValues]);
    
    return result.rows;
  }

  /**
   * Delete records and return deleted rows
   * @param {string} table - Table name
   * @param {Object} where - Where conditions
   * @param {string} returning - Columns to return (default: '*')
   * @returns {Promise<Array>} Deleted rows
   */
  async delete(table, where, returning = '*') {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');

    const query = `DELETE FROM ${table} WHERE ${whereClause} RETURNING ${returning}`;
    const result = await this.query(query, whereValues);
    
    return result.rows;
  }

  /**
   * Check if database schema exists and is up to date
   */
  async checkSchema() {
    try {
      // Check if main tables exist
      const tables = await this.queryAll(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const expectedTables = [
        'users', 'rooms', 'participants', 'room_events', 'playback_states',
        'chat_messages', 'annotations', 'subtitle_tracks', 'scheduled_sessions',
        'session_invites', 'feature_flags', 'feature_flag_evaluations', 'user_sessions'
      ];

      const existingTables = tables.map(t => t.table_name);
      const missingTables = expectedTables.filter(t => !existingTables.includes(t));

      if (missingTables.length > 0) {
        console.warn('⚠️  Missing database tables:', missingTables);
        return false;
      }

      console.log('✅ Database schema is complete');
      return true;
    } catch (error) {
      console.error('❌ Schema check failed:', error);
      return false;
    }
  }

  /**
   * Initialize database schema from SQL file
   */
  async initializeSchema() {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = await fs.readFile(schemaPath, 'utf8');

      console.log('🔧 Initializing database schema...');
      await this.query(schemaSql);
      console.log('✅ Database schema initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Schema initialization failed:', error);
      throw error;
    }
  }

  /**
   * Run database cleanup tasks
   */
  async cleanup() {
    try {
      console.log('🧹 Running database cleanup...');
      
      // Clean up expired rooms
      const expiredRooms = await this.query('SELECT cleanup_expired_rooms()');
      const deletedCount = expiredRooms.rows[0].cleanup_expired_rooms;
      
      if (deletedCount > 0) {
        console.log(`🗑️  Cleaned up ${deletedCount} expired rooms`);
      }

      // Clean up old sessions
      const oldSessions = await this.query(`
        DELETE FROM user_sessions 
        WHERE expires_at < NOW() - INTERVAL '7 days'
        RETURNING id
      `);
      
      if (oldSessions.rows.length > 0) {
        console.log(`🗑️  Cleaned up ${oldSessions.rows.length} expired sessions`);
      }

      // Clean up old room events (keep last 30 days)
      const oldEvents = await this.query(`
        DELETE FROM room_events 
        WHERE timestamp < NOW() - INTERVAL '30 days'
        AND event_type NOT IN ('ROOM_CREATED', 'ROOM_DELETED')
        RETURNING id
      `);
      
      if (oldEvents.rows.length > 0) {
        console.log(`🗑️  Cleaned up ${oldEvents.rows.length} old room events`);
      }

      // Clean up old feature flag evaluations (keep last 7 days)
      const oldEvaluations = await this.query(`
        DELETE FROM feature_flag_evaluations 
        WHERE timestamp < NOW() - INTERVAL '7 days'
        RETURNING id
      `);
      
      if (oldEvaluations.rows.length > 0) {
        console.log(`🗑️  Cleaned up ${oldEvaluations.rows.length} old flag evaluations`);
      }

      console.log('✅ Database cleanup completed');
      return true;
    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const stats = await this.queryOne(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE is_anonymous = false) as registered_users,
          (SELECT COUNT(*) FROM rooms) as total_rooms,
          (SELECT COUNT(*) FROM rooms WHERE last_activity > NOW() - INTERVAL '1 hour') as active_rooms,
          (SELECT COUNT(*) FROM participants WHERE connection_id IS NOT NULL) as connected_participants,
          (SELECT COUNT(*) FROM chat_messages WHERE created_at > NOW() - INTERVAL '24 hours') as messages_24h,
          (SELECT COUNT(*) FROM room_events WHERE timestamp > NOW() - INTERVAL '24 hours') as events_24h
      `);

      return stats;
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('🔌 Database connection closed');
    }
  }

  /**
   * Check if database is healthy
   */
  async healthCheck() {
    try {
      if (!this.pool) {
        return { healthy: false, error: 'Not connected' };
      }

      const start = Date.now();
      await this.query('SELECT 1');
      const responseTime = Date.now() - start;

      const poolStats = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };

      return {
        healthy: true,
        responseTime,
        poolStats,
        connected: this.isConnected
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
let dbInstance = null;

/**
 * Get database instance (singleton)
 * @param {Object} config - Database configuration
 * @returns {DatabaseConnection} Database instance
 */
function getDatabase(config = {}) {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection(config);
  }
  return dbInstance;
}

/**
 * Initialize database with schema check
 * @param {Object} config - Database configuration
 * @returns {Promise<DatabaseConnection>} Connected database instance
 */
async function initializeDatabase(config = {}) {
  const db = getDatabase(config);
  
  if (!db.isConnected) {
    await db.connect();
  }

  // Check schema and initialize if needed
  const schemaExists = await db.checkSchema();
  if (!schemaExists) {
    console.log('🔧 Database schema missing, initializing...');
    await db.initializeSchema();
  }

  return db;
}

module.exports = {
  DatabaseConnection,
  getDatabase,
  initializeDatabase
};