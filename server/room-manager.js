/**
 * Comprehensive Room Manager for Watch Party Extension
 * 
 * Manages room lifecycle, participant management, and state synchronization
 * with PostgreSQL persistence and Redis caching.
 */

const { getDatabase } = require('./database/connection');
const { getRedisManager } = require('./cache/redis-manager');
const crypto = require('crypto');

class RoomManager {
    constructor() {
        this.db = null;
        this.redis = null;
        this.cleanupInterval = null;
    }

    /**
     * Initialize room manager with database and cache connections
     */
    async initialize() {
        this.db = getDatabase();
        this.redis = getRedisManager();

        if (!this.db.isConnected) {
            throw new Error('Database not connected');
        }

        if (!this.redis.isConnected) {
            console.warn('⚠️  Redis not connected, running without cache');
        }

        // Start cleanup interval (every 30 minutes)
        this.cleanupInterval = setInterval(() => {
            this.performCleanup().catch(console.error);
        }, 30 * 60 * 1000);

        console.log('✅ Room Manager initialized');
    }

    /**
     * Create a new room
     * @param {Object} roomData - Room creation data
     * @param {string} hostUserId - Host user ID
     * @returns {Promise<Object>} Created room
     */
    async createRoom(roomData, hostUserId) {
        const {
            name,
            description,
            password,
            isPublic = false,
            maxParticipants = 50,
            videoUrl,
            videoTitle,
            settings = {}
        } = roomData;

        try {
            // Generate short room ID
            const roomId = this.generateRoomId();

            // Hash password if provided
            const passwordHash = password ? await this.hashPassword(password) : null;

            // Create room in database
            const room = await this.db.insert('rooms', {
                id: roomId,
                host_id: hostUserId,
                name,
                description,
                password_hash: passwordHash,
                is_public: isPublic,
                max_participants: maxParticipants,
                current_video_url: videoUrl,
                current_video_title: videoTitle,
                settings: JSON.stringify(settings)
            });

            // Create initial playback state
            await this.db.insert('playback_states', {
                room_id: roomId,
                current_time: 0,
                paused: true,
                playback_rate: 1.0,
                video_url: videoUrl,
                video_title: videoTitle,
                last_updated_by: hostUserId
            });

            // Add host as participant
            await this.addParticipant(roomId, hostUserId, 'host');

            // Log room creation event
            await this.logRoomEvent(roomId, hostUserId, 'ROOM_CREATED', {
                room_name: name,
                is_public: isPublic,
                max_participants: maxParticipants
            });

            // Cache room state
            await this.cacheRoomState(roomId);

            console.log(`🏠 Room created: ${roomId} by user ${hostUserId}`);
            return room;
        } catch (error) {
            console.error('❌ Failed to create room:', error);
            throw error;
        }
    }

    /**
     * Join a room
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     * @param {string} password - Room password (if required)
     * @param {string} connectionId - WebSocket connection ID
     * @returns {Promise<Object>} Room and participant data
     */
    async joinRoom(roomId, userId, password = null, connectionId = null) {
        try {
            // Get room details
            const room = await this.db.queryOne(
                'SELECT * FROM rooms WHERE id = $1 AND (expires_at IS NULL OR expires_at > NOW())',
                [roomId]
            );

            if (!room) {
                throw new Error('Room not found or expired');
            }

            // Check password if room is private
            if (room.password_hash && !await this.verifyPassword(password, room.password_hash)) {
                throw new Error('Invalid room password');
            }

            // Check participant limit
            const participantCount = await this.db.queryOne(
                'SELECT COUNT(*) as count FROM participants WHERE room_id = $1',
                [roomId]
            );

            if (participantCount.count >= room.max_participants) {
                throw new Error('Room is full');
            }

            // Add or update participant
            const participant = await this.addParticipant(roomId, userId, 'participant', connectionId);

            // Get current room state
            const roomState = await this.getRoomState(roomId);

            // Log join event
            await this.logRoomEvent(roomId, userId, 'USER_JOINED', {
                connection_id: connectionId
            });

            // Update cache
            await this.cacheRoomState(roomId);
            await this.cacheParticipants(roomId);

            console.log(`👤 User ${userId} joined room ${roomId}`);

            return {
                room,
                participant,
                roomState
            };
        } catch (error) {
            console.error('❌ Failed to join room:', error);
            throw error;
        }
    }

    /**
     * Leave a room
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
    async leaveRoom(roomId, userId) {
        try {
            // Remove participant
            const deletedParticipants = await this.db.delete('participants', {
                room_id: roomId,
                user_id: userId
            });

            if (deletedParticipants.length === 0) {
                return false; // User wasn't in the room
            }

            // Log leave event
            await this.logRoomEvent(roomId, userId, 'USER_LEFT', {});

            // Check if room is now empty
            const remainingParticipants = await this.db.queryOne(
                'SELECT COUNT(*) as count FROM participants WHERE room_id = $1',
                [roomId]
            );

            if (remainingParticipants.count === 0) {
                // Delete empty room
                await this.deleteRoom(roomId);
            } else {
                // Check if host left and transfer host role
                const participant = deletedParticipants[0];
                if (participant.role === 'host') {
                    await this.transferHostRole(roomId);
                }
            }

            // Update cache
            await this.cacheRoomState(roomId);
            await this.cacheParticipants(roomId);

            console.log(`👤 User ${userId} left room ${roomId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to leave room:', error);
            throw error;
        }
    }

    /**
     * Update playback state
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID making the update
     * @param {Object} stateUpdate - Playback state update
     * @returns {Promise<Object>} Updated playback state
     */
    async updatePlaybackState(roomId, userId, stateUpdate) {
        try {
            // Verify user has permission to update playback state
            const participant = await this.db.queryOne(
                'SELECT role FROM participants WHERE room_id = $1 AND user_id = $2',
                [roomId, userId]
            );

            if (!participant || !['host', 'co-host'].includes(participant.role)) {
                throw new Error('Insufficient permissions to control playback');
            }

            // Update playback state
            const updatedState = await this.db.update(
                'playback_states',
                {
                    ...stateUpdate,
                    last_updated_by: userId,
                    updated_at: new Date()
                },
                { room_id: roomId }
            );

            if (updatedState.length === 0) {
                throw new Error('Failed to update playback state');
            }

            // Log playback event
            await this.logRoomEvent(roomId, userId, 'PLAYBACK_UPDATE', stateUpdate);

            // Update cache
            await this.cacheSyncState(roomId, updatedState[0]);

            return updatedState[0];
        } catch (error) {
            console.error('❌ Failed to update playback state:', error);
            throw error;
        }
    }

    /**
     * Get room state with participants and playback info
     * @param {string} roomId - Room ID
     * @returns {Promise<Object>} Complete room state
     */
    async getRoomState(roomId) {
        try {
            // Try cache first
            const cachedState = await this.redis?.getRoomState(roomId);
            if (cachedState) {
                return cachedState;
            }

            // Get from database
            const room = await this.db.queryOne(`
        SELECT r.*, u.display_name as host_name
        FROM rooms r
        LEFT JOIN users u ON r.host_id = u.id
        WHERE r.id = $1
      `, [roomId]);

            if (!room) {
                return null;
            }

            const participants = await this.db.queryAll(`
        SELECT p.*, u.display_name, u.avatar_url
        FROM participants p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.room_id = $1
        ORDER BY p.joined_at
      `, [roomId]);

            const playbackState = await this.db.queryOne(
                'SELECT * FROM playback_states WHERE room_id = $1',
                [roomId]
            );

            const roomState = {
                room,
                participants,
                playbackState,
                participantCount: participants.length
            };

            // Cache the state
            await this.redis?.cacheRoomState(roomId, roomState);

            return roomState;
        } catch (error) {
            console.error('❌ Failed to get room state:', error);
            throw error;
        }
    }

    /**
     * Add participant to room
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     * @param {string} role - Participant role
     * @param {string} connectionId - WebSocket connection ID
     * @returns {Promise<Object>} Participant record
     */
    async addParticipant(roomId, userId, role = 'participant', connectionId = null) {
        try {
            // Insert or update participant
            const participant = await this.db.query(`
        INSERT INTO participants (room_id, user_id, role, connection_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (room_id, user_id)
        DO UPDATE SET
          role = EXCLUDED.role,
          connection_id = EXCLUDED.connection_id,
          last_seen = NOW()
        RETURNING *
      `, [roomId, userId, role, connectionId]);

            return participant.rows[0];
        } catch (error) {
            console.error('❌ Failed to add participant:', error);
            throw error;
        }
    }

    /**
     * Transfer host role to another participant
     * @param {string} roomId - Room ID
     * @param {string} newHostId - New host user ID (optional)
     * @returns {Promise<Object>} New host participant
     */
    async transferHostRole(roomId, newHostId = null) {
        try {
            let newHost;

            if (newHostId) {
                // Transfer to specific user
                newHost = await this.db.queryOne(
                    'SELECT * FROM participants WHERE room_id = $1 AND user_id = $2',
                    [roomId, newHostId]
                );

                if (!newHost) {
                    throw new Error('Target user not in room');
                }
            } else {
                // Transfer to oldest participant
                newHost = await this.db.queryOne(`
          SELECT * FROM participants 
          WHERE room_id = $1 AND role != 'host'
          ORDER BY joined_at ASC
          LIMIT 1
        `, [roomId]);

                if (!newHost) {
                    throw new Error('No participants available for host transfer');
                }
            }

            // Update roles in transaction
            await this.db.transaction(async (client) => {
                // Remove host role from current host
                await client.query(
                    'UPDATE participants SET role = $1 WHERE room_id = $2 AND role = $3',
                    ['participant', roomId, 'host']
                );

                // Assign host role to new host
                await client.query(
                    'UPDATE participants SET role = $1 WHERE room_id = $2 AND user_id = $3',
                    ['host', roomId, newHost.user_id]
                );

                // Update room host_id
                await client.query(
                    'UPDATE rooms SET host_id = $1 WHERE id = $2',
                    [newHost.user_id, roomId]
                );
            });

            // Log host transfer event
            await this.logRoomEvent(roomId, newHost.user_id, 'HOST_TRANSFERRED', {
                new_host_id: newHost.user_id
            });

            console.log(`👑 Host role transferred to user ${newHost.user_id} in room ${roomId}`);
            return newHost;
        } catch (error) {
            console.error('❌ Failed to transfer host role:', error);
            throw error;
        }
    }

    /**
     * Delete a room and all associated data
     * @param {string} roomId - Room ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteRoom(roomId) {
        try {
            // Delete room (cascades to related tables)
            const deletedRooms = await this.db.delete('rooms', { id: roomId });

            if (deletedRooms.length === 0) {
                return false;
            }

            // Log deletion event
            await this.logRoomEvent(roomId, null, 'ROOM_DELETED', {
                deleted_at: new Date().toISOString()
            });

            // Clear cache
            await this.redis?.invalidateRoom(roomId);

            console.log(`🗑️  Room ${roomId} deleted`);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete room:', error);
            throw error;
        }
    }

    /**
     * Log room event for audit trail
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID (null for system events)
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     */
    async logRoomEvent(roomId, userId, eventType, eventData) {
        try {
            await this.db.insert('room_events', {
                room_id: roomId,
                user_id: userId,
                event_type: eventType,
                event_data: JSON.stringify(eventData)
            });
        } catch (error) {
            console.error('❌ Failed to log room event:', error);
            // Don't throw - logging failures shouldn't break main functionality
        }
    }

    /**
     * Generate short room ID
     * @returns {string} Room ID
     */
    generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Hash password for storage
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        const bcrypt = require('bcrypt');
        return await bcrypt.hash(password, 10);
    }

    /**
     * Verify password against hash
     * @param {string} password - Plain text password
     * @param {string} hash - Stored password hash
     * @returns {Promise<boolean>} Password match result
     */
    async verifyPassword(password, hash) {
        const bcrypt = require('bcrypt');
        return await bcrypt.compare(password, hash);
    }

    /**
     * Cache room state in Redis
     * @param {string} roomId - Room ID
     */
    async cacheRoomState(roomId) {
        if (!this.redis?.isConnected) return;

        try {
            const roomState = await this.getRoomState(roomId);
            await this.redis.cacheRoomState(roomId, roomState);
        } catch (error) {
            console.error('❌ Failed to cache room state:', error);
        }
    }

    /**
     * Cache participants list in Redis
     * @param {string} roomId - Room ID
     */
    async cacheParticipants(roomId) {
        if (!this.redis?.isConnected) return;

        try {
            const participants = await this.db.queryAll(`
        SELECT p.*, u.display_name, u.avatar_url
        FROM participants p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.room_id = $1
        ORDER BY p.joined_at
      `, [roomId]);

            await this.redis.cacheParticipants(roomId, participants);
        } catch (error) {
            console.error('❌ Failed to cache participants:', error);
        }
    }

    /**
     * Cache sync state in Redis
     * @param {string} roomId - Room ID
     * @param {Object} syncState - Sync state data
     */
    async cacheSyncState(roomId, syncState) {
        if (!this.redis?.isConnected) return;

        try {
            await this.redis.cacheSyncState(roomId, syncState);
        } catch (error) {
            console.error('❌ Failed to cache sync state:', error);
        }
    }

    /**
     * Perform cleanup tasks
     */
    async performCleanup() {
        try {
            console.log('🧹 Running room manager cleanup...');

            // Database cleanup
            await this.db.cleanup();

            // Redis cleanup
            if (this.redis?.isConnected) {
                await this.redis.cleanup();
            }

            console.log('✅ Room manager cleanup completed');
        } catch (error) {
            console.error('❌ Room manager cleanup failed:', error);
        }
    }

    /**
     * Get room manager statistics
     */
    async getStats() {
        try {
            const dbStats = await this.db.getStats();
            const redisStats = this.redis?.isConnected ? await this.redis.getStats() : null;

            return {
                database: dbStats,
                cache: redisStats,
                uptime: process.uptime()
            };
        } catch (error) {
            console.error('❌ Failed to get room manager stats:', error);
            return null;
        }
    }

    /**
     * Health check for room manager
     */
    async healthCheck() {
        try {
            const dbHealth = await this.db.healthCheck();
            const redisHealth = this.redis?.isConnected ? await this.redis.healthCheck() : { healthy: false, error: 'Not connected' };

            return {
                healthy: dbHealth.healthy,
                database: dbHealth,
                cache: redisHealth
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    /**
     * Shutdown room manager
     */
    async shutdown() {
        console.log('🔄 Shutting down room manager...');

        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Close connections
        if (this.db) {
            await this.db.close();
        }

        if (this.redis) {
            await this.redis.close();
        }

        console.log('✅ Room manager shutdown complete');
    }
}


// Singleton instance
let roomManagerInstance = null;

/**
 * Get room manager instance (singleton)
 * @returns {RoomManager} Room manager instance
 */
function getRoomManager() {
    if (!roomManagerInstance) {
        roomManagerInstance = new RoomManager();
    }
    return roomManagerInstance;
}

/**
 * Initialize room manager with database and cache connections
 * @returns {Promise<RoomManager>} Initialized room manager instance
 */
async function initializeRoomManager() {
    const roomManager = getRoomManager();

    if (!roomManager.db) {
        await roomManager.initialize();
    }

    return roomManager;
}

module.exports = {
    RoomManager,
    getRoomManager,
    initializeRoomManager
};