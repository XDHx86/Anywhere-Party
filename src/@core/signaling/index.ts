/**
 * Signaling module for Watch Party Extension
 *
 * Provides WebSocket message protocol definitions and utilities
 * for communication with signaling servers (both full and local relay)
 */

export * from './message-types';
export { SignalingClient, ConnectionState } from './signaling-client';
export type { SignalingClientOptions, SignalingError } from './signaling-client';

// Re-export commonly used types for convenience
export type {
  SignalingMessage,
  ClientMessage,
  ServerMessage,
  PlaybackState,
  ParticipantInfo,
  RoomOptions,
  AnnotationData,
} from './message-types';

export {
  SignalingErrorCode,
  isClientMessage,
  isServerMessage,
  validateMessage,
  createCreateRoomMessage,
  createJoinRoomMessage,
  createSyncStateMessage,
  createChatMessage,
  createHeartbeatMessage,
  createErrorMessage,
} from './message-types';
