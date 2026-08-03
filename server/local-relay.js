#!/usr/bin/env node

/**
 * Local WebSocket Relay Server for Watch Party Extension Development
 * 
 * Lightweight server for local development without database dependencies.
 * Provides in-memory room state management and basic message relay functionality.
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class InMemoryRoom {
  constructor(id, hostId) {
    this.id = id;
    this.hostId = hostId;
    this.participants = new Map(); // userId -> { socket, joinedAt, role }
    this.currentState = {
      currentTime: 0,
      paused: true,
      playbackRate: 1,
      timestamp: Date.now(),
      videoUrl: null,
      duration: null
    };
    this.createdAt = new Date();
    this.lastActivity = new Date();
  }

  addParticipant(userId, socket, role = 'participant') {
    this.participants.set(userId, {
      socket,
      joinedAt: new Date(),
      role: userId === this.hostId ? 'host' : role
    });
    this.lastActivity = new Date();
  }

  removeParticipant(userId) {
    this.participants.delete(userId);
    this.lastActivity = new Date();
    
    // If host leaves, promote first participant to host
    if (userId === this.hostId && this.participants.size > 0) {
      const newHostId = this.participants.keys().next().value;
      this.hostId = newHostId;
      const newHost = this.participants.get(newHostId);
      if (newHost) {
        newHost.role = 'host';
      }
    }
  }

  broadcast(message, excludeUserId = null) {
    for (const [userId, participant] of this.participants) {
      if (userId !== excludeUserId && participant.socket.readyState === WebSocket.OPEN) {
        try {
          participant.socket.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send message to ${userId}:`, error);
        }
      }
    }
  }

  updateState(newState) {
    this.currentState = { ...this.currentState, ...newState, timestamp: Date.now() };
    this.lastActivity = new Date();
  }

  isEmpty() {
    return this.participants.size === 0;
  }

  getParticipantList() {
    return Array.from(this.participants.entries()).map(([userId, participant]) => ({
      id: userId,
      role: participant.role,
      joinedAt: participant.joinedAt
    }));
  }
}

class LocalWebSocketRelay {
  constructor(port = 8080) {
    this.port = port;
    this.rooms = new Map(); // roomId -> InMemoryRoom
    this.userSockets = new Map(); // socket -> { userId, roomId }
    this.server = null;
    this.cleanupInterval = null;
  }

  start() {
    this.server = new WebSocket.Server({ 
      port: this.port,
      perMessageDeflate: false // Disable compression for simplicity
    });

    console.log(`🚀 Local WebSocket relay server started on port ${this.port}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${this.port}`);

    this.server.on('connection', (socket, request) => {
      console.log(`🔌 New connection from ${request.socket.remoteAddress}`);
      this.handleConnection(socket);
    });

    this.server.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });

    // Start cleanup interval for inactive rooms
    this.startCleanupInterval();

    // Handle graceful shutdown
    this.setupGracefulShutdown();
  }

  handleConnection(socket) {
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(socket, message);
      } catch (error) {
        console.error('❌ Invalid message format:', error);
        this.sendError(socket, 'INVALID_MESSAGE', 'Invalid JSON format');
      }
    });

    socket.on('close', () => {
      this.handleDisconnection(socket);
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.handleDisconnection(socket);
    });

    // Send welcome message
    this.sendMessage(socket, {
      type: 'WELCOME',
      timestamp: Date.now(),
      serverId: 'local-relay'
    });
  }

  handleMessage(socket, message) {
    const { type, ...payload } = message;

    // Validate message structure
    if (!this.validateMessage(message)) {
      console.warn('⚠️  Invalid message structure:', message);
      this.sendError(socket, 'INVALID_MESSAGE', 'Message missing required fields');
      return;
    }

    switch (type) {
      case 'CREATE_ROOM':
        this.handleCreateRoom(socket, payload);
        break;
      case 'JOIN_ROOM':
        this.handleJoinRoom(socket, payload);
        break;
      case 'LEAVE_ROOM':
        this.handleLeaveRoom(socket, payload);
        break;
      case 'SYNC_STATE':
        this.handleSyncState(socket, payload);
        break;
      case 'CHAT_MESSAGE':
        this.handleChatMessage(socket, payload);
        break;
      case 'HEARTBEAT':
        this.handleHeartbeat(socket, payload);
        break;
      case 'PING':
        this.handlePing(socket, payload);
        break;
      case 'PONG':
        this.handlePong(socket, payload);
        break;
      // ─── Encryption Messages (Milestone 4) ──────────────
      case 'PUBLIC_KEY_BROADCAST':
        this.handlePublicKeyBroadcast(socket, type, payload);
        break;
      case 'ENCRYPTED_CHAT_MESSAGE':
        this.handleEncryptedChatMessage(socket, type, payload);
        break;
      case 'PLAYLIST_ADD':
      case 'PLAYLIST_REMOVE':
      case 'PLAYLIST_REORDER':
      case 'PLAYLIST_SKIP_VOTE':
        this.handlePlaylistMessage(socket, type, payload);
        break;
      // ─── Annotation Messages (Milestone 4) ──────────────
      case 'ANNOTATION_CREATED':
      case 'ANNOTATION_UPDATED':
      case 'ANNOTATION_DELETED':
      case 'LAYER_VISIBILITY_CHANGED':
        this.handleAnnotationMessage(socket, type, payload);
        break;
      default:
        console.warn(`⚠️  Unknown message type: ${type}`);
        this.sendError(socket, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${type}`);
    }
  }

  handleCreateRoom(socket, { userId, roomOptions = {} }) {
    if (!userId) {
      return this.sendError(socket, 'MISSING_USER_ID', 'User ID is required');
    }

    const roomId = this.generateRoomId();
    const room = new InMemoryRoom(roomId, userId);
    room.addParticipant(userId, socket, 'host');
    
    this.rooms.set(roomId, room);
    this.userSockets.set(socket, { userId, roomId });

    console.log(`🏠 Room ${roomId} created by ${userId}`);

    this.sendMessage(socket, {
      type: 'ROOM_CREATED',
      roomId,
      hostId: userId,
      participants: room.getParticipantList(),
      currentState: room.currentState,
      timestamp: Date.now()
    });
  }

  handleJoinRoom(socket, { userId, roomId }) {
    if (!userId || !roomId) {
      return this.sendError(socket, 'MISSING_PARAMETERS', 'User ID and Room ID are required');
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return this.sendError(socket, 'ROOM_NOT_FOUND', `Room ${roomId} not found`);
    }

    // Remove user from any existing room first
    this.handleLeaveRoom(socket, { userId });

    room.addParticipant(userId, socket);
    this.userSockets.set(socket, { userId, roomId });

    console.log(`👤 ${userId} joined room ${roomId}`);

    // Notify user of successful join
    this.sendMessage(socket, {
      type: 'ROOM_JOINED',
      roomId,
      hostId: room.hostId,
      participants: room.getParticipantList(),
      currentState: room.currentState,
      timestamp: Date.now()
    });

    // Notify other participants
    room.broadcast({
      type: 'PARTICIPANT_JOINED',
      userId,
      participants: room.getParticipantList(),
      timestamp: Date.now()
    }, userId);
  }

  handleLeaveRoom(socket, { userId }) {
    const socketInfo = this.userSockets.get(socket);
    if (!socketInfo) return;

    const { roomId } = socketInfo;
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.removeParticipant(userId);
    this.userSockets.delete(socket);

    console.log(`👋 ${userId} left room ${roomId}`);

    // Notify remaining participants
    room.broadcast({
      type: 'PARTICIPANT_LEFT',
      userId,
      participants: room.getParticipantList(),
      newHostId: room.hostId,
      timestamp: Date.now()
    });

    // Clean up empty room
    if (room.isEmpty()) {
      this.rooms.delete(roomId);
      console.log(`🗑️  Room ${roomId} cleaned up (empty)`);
    }
  }

  handleSyncState(socket, { userId, state }) {
    const socketInfo = this.userSockets.get(socket);
    if (!socketInfo) {
      return this.sendError(socket, 'NOT_IN_ROOM', 'Must join a room first');
    }

    const { roomId } = socketInfo;
    const room = this.rooms.get(roomId);
    if (!room) {
      return this.sendError(socket, 'ROOM_NOT_FOUND', 'Room no longer exists');
    }

    // Only host can update sync state
    if (userId !== room.hostId) {
      return this.sendError(socket, 'UNAUTHORIZED', 'Only host can update sync state');
    }

    room.updateState(state);

    // Broadcast sync state to all participants
    room.broadcast({
      type: 'SYNC_UPDATE',
      state: room.currentState,
      fromUserId: userId,
      timestamp: Date.now()
    });

    console.log(`🔄 Sync state updated in room ${roomId} by ${userId}`);
  }

  handleChatMessage(socket, payload) {
    const socketInfo = this.userSockets.get(socket);
    if (!socketInfo) {
      return this.sendError(socket, 'NOT_IN_ROOM', 'Must join a room first');
    }

    const { roomId } = socketInfo;
    const room = this.rooms.get(roomId);
    if (!room) {
      return this.sendError(socket, 'ROOM_NOT_FOUND', 'Room no longer exists');
    }

    // Broadcast full payload to all participants (preserves encryption fields)
    room.broadcast({
      type: 'CHAT_MESSAGE',
      ...payload,
      timestamp: Date.now()
    });

    const userId = payload.userId || 'unknown';
    const preview = payload.message ? payload.message.substring(0, 50) : '(encrypted)';
    console.log(`💬 Chat message in room ${roomId} from ${userId}: ${preview}...`);
  }

  // ─── Encryption Message Handlers (Milestone 4) ──────────

  handlePublicKeyBroadcast(socket, type, payload) {
    const socketInfo = this.userSockets.get(socket);
    if (!socketInfo) {
      return this.sendError(socket, 'NOT_IN_ROOM', 'Must join a room first');
    }

    const { roomId } = socketInfo;
    const room = this.rooms.get(roomId);
    if (!room) {
      return this.sendError(socket, 'ROOM_NOT_FOUND', 'Room no longer exists');
    }

    // Broadcast public key to all room participants
    room.broadcast({
      type,
      ...payload,
      timestamp: Date.now()
    });

    console.log(`🔑 Public key broadcast in room ${roomId} from ${payload.userId}`);
  }

  handleEncryptedChatMessage(socket, type, payload) {
    const socketInfo = this.userSockets.get(socket);
    if (!socketInfo) {
      return this.sendError(socket, 'NOT_IN_ROOM', 'Must join a room first');
    }

    const { roomId } = socketInfo;
    const room = this.rooms.get(roomId);
    if (!room) {
      return this.sendError(socket, 'ROOM_NOT_FOUND', 'Room no longer exists');
    }

    // Broadcast full encrypted payload to all participants (no destructuring)
    room.broadcast({
      type,
      ...payload,
      timestamp: Date.now()
    });

    console.log(`🔒 Encrypted chat message in room ${roomId} from ${payload.userId}`);
  }

  handleHeartbeat(socket, { userId }) {
    const socketInfo = this.userSockets.get(socket);
    if (socketInfo) {
      const room = this.rooms.get(socketInfo.roomId);
      if (room) {
        room.lastActivity = new Date();
      }
    }

    // Send heartbeat response
    this.sendMessage(socket, {
      type: 'HEARTBEAT_ACK',
      timestamp: Date.now()
    });
  }

  handlePing(socket, { userId, timestamp }) {
    // Respond to client ping with pong
    this.sendMessage(socket, {
      type: 'PONG',
      userId,
      originalTimestamp: timestamp,
      timestamp: Date.now()
    });
  }

  handlePong(socket, { userId, timestamp }) {
    // Client responded to our ping
    const socketInfo = this.userSockets.get(socket);
    if (socketInfo) {
      const room = this.rooms.get(socketInfo.roomId);
      if (room) {
        room.lastActivity = new Date();
      }
    }

    console.log(`📡 Received pong from ${userId}`);
  }

  handlePlaylistMessage(socket, type, payload) {
    const socketInfo = this.userSockets.get(socket);
    if (!socketInfo) {
      return this.sendError(socket, 'NOT_IN_ROOM', 'Must be in a room to manage playlist');
    }

    const room = this.rooms.get(socketInfo.roomId);
    if (!room) {
      return this.sendError(socket, 'ROOM_NOT_FOUND', 'Room not found');
    }

    const { userId } = payload;

    // Relay playlist operation to all room participants
    switch (type) {
      case 'PLAYLIST_ADD':
      case 'PLAYLIST_REMOVE':
      case 'PLAYLIST_REORDER': {
        // Broadcast the full playlist state back — the client that sent the
        // message will receive its own state update and reconcile locally.
        room.broadcast({
          type: 'PLAYLIST_STATE',
          playlist: payload.playlist || { items: [], currentIndex: 0, isPlaying: false, playHistory: [] },
          senderUserId: userId,
          timestamp: Date.now(),
        });
        break;
      }
      case 'PLAYLIST_SKIP_VOTE': {
        // Count votes — for simplicity, relay vote tally to host who decides
        if (!room.playlistVotes) room.playlistVotes = {};
        const { itemId } = payload;
        if (!room.playlistVotes[itemId]) room.playlistVotes[itemId] = new Set();
        room.playlistVotes[itemId].add(userId);

        const totalParticipants = room.participants.size;
        const voteCount = room.playlistVotes[itemId].size;
        const skipped = voteCount >= Math.ceil(totalParticipants / 2);

        room.broadcast({
          type: 'PLAYLIST_SKIP_RESULT',
          itemId,
          skipVotes: voteCount,
          totalParticipants,
          skipped,
          timestamp: Date.now(),
        });

        if (skipped) {
          delete room.playlistVotes[itemId];
        }
        break;
      }
    }
  }

  // ─── Annotation Message Handler (Milestone 4) ──────────

  handleAnnotationMessage(socket, type, payload) {
    const socketInfo = this.userSockets.get(socket);
    if (!socketInfo) {
      return this.sendError(socket, 'NOT_IN_ROOM', 'Must join a room first');
    }

    const { roomId } = socketInfo;
    const room = this.rooms.get(roomId);
    if (!room) {
      return this.sendError(socket, 'ROOM_NOT_FOUND', 'Room no longer exists');
    }

    // Broadcast annotation operation to all participants
    room.broadcast({
      type,
      ...payload,
      timestamp: Date.now()
    });

    console.log(`🎨 Annotation message (${type}) in room ${roomId} from ${payload.userId}`);
  }

  handleDisconnection(socket) {
    const socketInfo = this.userSockets.get(socket);
    if (socketInfo) {
      const { userId } = socketInfo;
      console.log(`🔌 ${userId} disconnected`);
      this.handleLeaveRoom(socket, { userId });
    }
  }

  sendMessage(socket, message) {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send message:', error);
      }
    }
  }

  sendError(socket, code, message) {
    this.sendMessage(socket, {
      type: 'ERROR',
      error: { code, message },
      timestamp: Date.now()
    });
  }

  validateMessage(message) {
    if (!message || typeof message !== 'object') {
      return false;
    }
    
    if (!message.type || typeof message.type !== 'string') {
      return false;
    }
    
    // Most messages should have a userId, but some system messages might not
    const systemMessages = ['PING', 'PONG', 'HEARTBEAT'];
    if (!systemMessages.includes(message.type) && !message.userId) {
      console.warn(`Message type ${message.type} missing userId`);
    }
    
    return true;
  }

  generateRoomId() {
    // Generate short, readable room ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  startCleanupInterval() {
    // Clean up inactive rooms every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

      for (const [roomId, room] of this.rooms) {
        if (now - room.lastActivity > inactiveThreshold) {
          console.log(`🗑️  Cleaning up inactive room ${roomId}`);
          this.rooms.delete(roomId);
        }
      }
    }, 5 * 60 * 1000);
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      console.log('\n🛑 Shutting down local relay server...');
      
      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Notify all connected clients
      for (const room of this.rooms.values()) {
        room.broadcast({
          type: 'SERVER_SHUTDOWN',
          message: 'Server is shutting down',
          timestamp: Date.now()
        });
      }

      // Close server
      if (this.server) {
        this.server.close(() => {
          console.log('✅ Server closed gracefully');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalConnections: this.userSockets.size,
      rooms: Array.from(this.rooms.values()).map(room => ({
        id: room.id,
        hostId: room.hostId,
        participantCount: room.participants.size,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity
      }))
    };
  }
}

// CLI interface
if (require.main === module) {
  const port = process.env.PORT || 8080;
  const relay = new LocalWebSocketRelay(port);
  
  relay.start();

  // Add stats endpoint for debugging
  setInterval(() => {
    const stats = relay.getStats();
    if (stats.totalRooms > 0 || stats.totalConnections > 0) {
      console.log(`📊 Stats: ${stats.totalRooms} rooms, ${stats.totalConnections} connections`);
    }
  }, 60000); // Log stats every minute if there's activity
}

module.exports = { LocalWebSocketRelay, InMemoryRoom };