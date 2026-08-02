/**
 * WebSocket signaling message protocol for Watch Party Extension
 *
 * Defines all message types exchanged between extension and signaling server
 * (both full server and local relay implementations)
 */

// Base message interface
export interface BaseMessage {
  type: string;
  timestamp?: number;
}

// Client to Server Messages
export interface CreateRoomMessage extends BaseMessage {
  type: 'CREATE_ROOM';
  userId: string;
  roomOptions?: RoomOptions;
}

export interface JoinRoomMessage extends BaseMessage {
  type: 'JOIN_ROOM';
  userId: string;
  roomId: string;
  password?: string;
}

export interface LeaveRoomMessage extends BaseMessage {
  type: 'LEAVE_ROOM';
  userId: string;
}

export interface SyncStateMessage extends BaseMessage {
  type: 'SYNC_STATE';
  userId: string;
  state: PlaybackState;
}

export interface ChatMessage extends BaseMessage {
  type: 'CHAT_MESSAGE';
  userId: string;
  message: string;
}

export interface HeartbeatMessage extends BaseMessage {
  type: 'HEARTBEAT';
  userId: string;
}

export interface ReactionMessage extends BaseMessage {
  type: 'REACTION';
  userId: string;
  reactionType: string;
  videoTimestamp: number;
}

export interface AnnotationCreatedMessage extends BaseMessage {
  type: 'ANNOTATION_CREATED';
  userId: string;
  annotation: AnnotationData;
}

export interface AnnotationUpdatedMessage extends BaseMessage {
  type: 'ANNOTATION_UPDATED';
  userId: string;
  annotationId: string;
  updates: Partial<AnnotationData>;
}

export interface AnnotationDeletedMessage extends BaseMessage {
  type: 'ANNOTATION_DELETED';
  userId: string;
  annotationId: string;
}

export interface LayerVisibilityChangedMessage extends BaseMessage {
  type: 'LAYER_VISIBILITY_CHANGED';
  userId: string;
  layerId: string;
  visible: boolean;
}

export interface HostTransferMessage extends BaseMessage {
  type: 'TRANSFER_HOST';
  userId: string;
  newHostId: string;
}

export interface KickParticipantMessage extends BaseMessage {
  type: 'KICK_PARTICIPANT';
  userId: string;
  targetUserId: string;
}

// Server to Client Messages
export interface WelcomeMessage extends BaseMessage {
  type: 'WELCOME';
  serverId: string;
  serverVersion?: string;
}

export interface RoomCreatedMessage extends BaseMessage {
  type: 'ROOM_CREATED';
  roomId: string;
  hostId: string;
  participants: ParticipantInfo[];
  currentState: PlaybackState;
}

export interface RoomJoinedMessage extends BaseMessage {
  type: 'ROOM_JOINED';
  roomId: string;
  hostId: string;
  participants: ParticipantInfo[];
  currentState: PlaybackState;
}

export interface ParticipantJoinedMessage extends BaseMessage {
  type: 'PARTICIPANT_JOINED';
  userId: string;
  participants: ParticipantInfo[];
}

export interface ParticipantLeftMessage extends BaseMessage {
  type: 'PARTICIPANT_LEFT';
  userId: string;
  participants: ParticipantInfo[];
  newHostId?: string;
}

export interface SyncUpdateMessage extends BaseMessage {
  type: 'SYNC_UPDATE';
  state: PlaybackState;
  fromUserId: string;
}

export interface ChatBroadcastMessage extends BaseMessage {
  type: 'CHAT_MESSAGE';
  userId: string;
  message: string;
}

export interface ReactionBroadcastMessage extends BaseMessage {
  type: 'REACTION';
  userId: string;
  reactionType: string;
  videoTimestamp: number;
}

export interface AnnotationCreatedBroadcastMessage extends BaseMessage {
  type: 'ANNOTATION_CREATED';
  userId: string;
  annotation: AnnotationData;
}

export interface AnnotationUpdatedBroadcastMessage extends BaseMessage {
  type: 'ANNOTATION_UPDATED';
  userId: string;
  annotationId: string;
  updates: Partial<AnnotationData>;
}

export interface AnnotationDeletedBroadcastMessage extends BaseMessage {
  type: 'ANNOTATION_DELETED';
  userId: string;
  annotationId: string;
}

export interface LayerVisibilityChangedBroadcastMessage extends BaseMessage {
  type: 'LAYER_VISIBILITY_CHANGED';
  userId: string;
  layerId: string;
  visible: boolean;
}

export interface HostTransferredMessage extends BaseMessage {
  type: 'HOST_TRANSFERRED';
  oldHostId: string;
  newHostId: string;
  participants: ParticipantInfo[];
}

export interface ParticipantKickedMessage extends BaseMessage {
  type: 'PARTICIPANT_KICKED';
  kickedUserId: string;
  kickedByUserId: string;
  participants: ParticipantInfo[];
}

export interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ServerShutdownMessage extends BaseMessage {
  type: 'SERVER_SHUTDOWN';
  message: string;
  gracePeriodMs?: number;
}

export interface HeartbeatAckMessage extends BaseMessage {
  type: 'HEARTBEAT_ACK';
}

export interface PingMessage extends BaseMessage {
  type: 'PING';
  userId: string;
}

export interface PongMessage extends BaseMessage {
  type: 'PONG';
  userId: string;
  originalTimestamp?: number;
}

// Union types for type safety
export type ClientMessage =
  | CreateRoomMessage
  | JoinRoomMessage
  | LeaveRoomMessage
  | SyncStateMessage
  | ChatMessage
  | HeartbeatMessage
  | ReactionMessage
  | AnnotationCreatedMessage
  | AnnotationUpdatedMessage
  | AnnotationDeletedMessage
  | LayerVisibilityChangedMessage
  | HostTransferMessage
  | KickParticipantMessage
  | PingMessage
  | PongMessage;

export type ServerMessage =
  | WelcomeMessage
  | RoomCreatedMessage
  | RoomJoinedMessage
  | ParticipantJoinedMessage
  | ParticipantLeftMessage
  | SyncUpdateMessage
  | ChatBroadcastMessage
  | ReactionBroadcastMessage
  | AnnotationCreatedBroadcastMessage
  | AnnotationUpdatedBroadcastMessage
  | AnnotationDeletedBroadcastMessage
  | LayerVisibilityChangedBroadcastMessage
  | HostTransferredMessage
  | ParticipantKickedMessage
  | ErrorMessage
  | ServerShutdownMessage
  | HeartbeatAckMessage
  | PingMessage
  | PongMessage;

export type SignalingMessage = ClientMessage | ServerMessage;

// Supporting data structures
export interface RoomOptions {
  name?: string;
  password?: string;
  isPublic?: boolean;
  maxParticipants?: number;
}

export interface PlaybackState {
  currentTime: number;
  paused: boolean;
  playbackRate: number;
  timestamp: number;
  videoUrl?: string;
  duration?: number;
}

export interface ParticipantInfo {
  id: string;
  role: 'host' | 'co-host' | 'participant';
  joinedAt: Date | string;
  name?: string;
}

export interface AnnotationData {
  id: string;
  userId: string;
  videoTimestamp: number;
  type: 'pen' | 'rectangle' | 'circle' | 'arrow' | 'text';
  layerId: string;
  data: {
    // Common properties
    color: string;
    strokeWidth: number;
    opacity: number;

    // Pen-specific
    points?: Array<{ x: number; y: number; pressure?: number; timestamp?: number }>;

    // Shape-specific
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    radius?: number;

    // Arrow-specific
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;

    // Text-specific
    text?: string;
    fontSize?: number;
    fontFamily?: string;
  };
  visible: boolean;
  createdAt: number;
  updatedAt: number;
}

// Error codes for standardized error handling
export enum SignalingErrorCode {
  // Connection errors
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  UNKNOWN_MESSAGE_TYPE = 'UNKNOWN_MESSAGE_TYPE',

  // Authentication errors
  MISSING_USER_ID = 'MISSING_USER_ID',
  MISSING_PARAMETERS = 'MISSING_PARAMETERS',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // Room errors
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  ROOM_LOCKED = 'ROOM_LOCKED',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  ALREADY_IN_ROOM = 'ALREADY_IN_ROOM',
  NOT_IN_ROOM = 'NOT_IN_ROOM',

  // Permission errors
  NOT_HOST = 'NOT_HOST',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Server errors
  SERVER_ERROR = 'SERVER_ERROR',
  SERVER_OVERLOADED = 'SERVER_OVERLOADED',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',

  // Validation errors
  INVALID_ROOM_ID = 'INVALID_ROOM_ID',
  INVALID_USER_ID = 'INVALID_USER_ID',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',
  RATE_LIMITED = 'RATE_LIMITED',
}

// Message validation utilities
export function isClientMessage(message: any): message is ClientMessage {
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    return false;
  }

  return [
    'CREATE_ROOM',
    'JOIN_ROOM',
    'LEAVE_ROOM',
    'SYNC_STATE',
    'CHAT_MESSAGE',
    'HEARTBEAT',
    'REACTION',
    'ANNOTATION_CREATED',
    'ANNOTATION_UPDATED',
    'ANNOTATION_DELETED',
    'LAYER_VISIBILITY_CHANGED',
    'TRANSFER_HOST',
    'KICK_PARTICIPANT',
    'PING',
    'PONG',
  ].includes(message.type);
}

export function isServerMessage(message: any): message is ServerMessage {
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    return false;
  }

  return [
    'WELCOME',
    'ROOM_CREATED',
    'ROOM_JOINED',
    'PARTICIPANT_JOINED',
    'PARTICIPANT_LEFT',
    'SYNC_UPDATE',
    'CHAT_MESSAGE',
    'REACTION',
    'ANNOTATION_CREATED',
    'ANNOTATION_UPDATED',
    'ANNOTATION_DELETED',
    'LAYER_VISIBILITY_CHANGED',
    'HOST_TRANSFERRED',
    'PARTICIPANT_KICKED',
    'ERROR',
    'SERVER_SHUTDOWN',
    'HEARTBEAT_ACK',
    'PING',
    'PONG',
  ].includes(message.type);
}

export function validateMessage(message: any): { valid: boolean; error?: string } {
  if (!message || typeof message !== 'object') {
    return { valid: false, error: 'Message must be an object' };
  }

  if (!message.type || typeof message.type !== 'string') {
    return { valid: false, error: 'Message must have a string type field' };
  }

  // Check if message type is valid
  if (!isClientMessage(message)) {
    return { valid: false, error: `Unknown message type: ${message.type}` };
  }

  // Add specific validation for each message type
  switch (message.type) {
    case 'CREATE_ROOM':
      if (!message.userId) {
        return { valid: false, error: 'CREATE_ROOM requires userId' };
      }
      break;

    case 'JOIN_ROOM':
      if (!message.userId || !message.roomId) {
        return { valid: false, error: 'JOIN_ROOM requires userId and roomId' };
      }
      break;

    case 'SYNC_STATE':
      if (!message.userId || !message.state) {
        return { valid: false, error: 'SYNC_STATE requires userId and state' };
      }
      if (
        typeof message.state.currentTime !== 'number' ||
        typeof message.state.paused !== 'boolean'
      ) {
        return {
          valid: false,
          error: 'SYNC_STATE state must have currentTime (number) and paused (boolean)',
        };
      }
      break;

    case 'CHAT_MESSAGE':
      if (!message.userId || !message.message) {
        return { valid: false, error: 'CHAT_MESSAGE requires userId and message' };
      }
      if (typeof message.message !== 'string' || message.message.length > 1000) {
        return {
          valid: false,
          error: 'CHAT_MESSAGE message must be a string under 1000 characters',
        };
      }
      break;

    case 'HEARTBEAT':
      if (!message.userId) {
        return { valid: false, error: 'HEARTBEAT requires userId' };
      }
      break;

    case 'PING':
    case 'PONG':
      if (!message.userId) {
        return { valid: false, error: `${message.type} requires userId` };
      }
      break;
  }

  return { valid: true };
}

// Message factory functions for type safety
export function createCreateRoomMessage(
  userId: string,
  roomOptions?: RoomOptions
): CreateRoomMessage {
  return {
    type: 'CREATE_ROOM',
    userId,
    roomOptions,
    timestamp: Date.now(),
  };
}

export function createJoinRoomMessage(
  userId: string,
  roomId: string,
  password?: string
): JoinRoomMessage {
  return {
    type: 'JOIN_ROOM',
    userId,
    roomId,
    password,
    timestamp: Date.now(),
  };
}

export function createSyncStateMessage(userId: string, state: PlaybackState): SyncStateMessage {
  return {
    type: 'SYNC_STATE',
    userId,
    state: {
      ...state,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };
}

export function createChatMessage(userId: string, message: string): ChatMessage {
  return {
    type: 'CHAT_MESSAGE',
    userId,
    message,
    timestamp: Date.now(),
  };
}

export function createHeartbeatMessage(userId: string): HeartbeatMessage {
  return {
    type: 'HEARTBEAT',
    userId,
    timestamp: Date.now(),
  };
}

export function createErrorMessage(code: string, message: string, details?: any): ErrorMessage {
  return {
    type: 'ERROR',
    error: { code, message, details },
    timestamp: Date.now(),
  };
}
