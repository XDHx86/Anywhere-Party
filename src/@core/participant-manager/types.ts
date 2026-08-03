/**
 * Participant Manager Types
 * Authoritative participant state for the watch party extension.
 *
 * Ownership: This module is the single source of truth for the current room's
 * participant list. All subsystems (privacy, encryption, annotation sync, voice
 * chat) read from this module rather than maintaining their own copies.
 */

export interface ParticipantInfo {
  userId: string;
  publicKey?: string; // base64 SPKI, populated after key exchange
  joinedAt: number;
}

export interface ParticipantManagerConfig {
  /** Maximum number of participants per room */
  maxParticipants: number;
  /** Timeout in ms before a participant with no public key is considered stale */
  keyExchangeTimeout: number;
}

export type ParticipantEventType =
  | 'participant_added'
  | 'participant_removed'
  | 'keys_exchanged'
  | 'key_exchange_timeout';

export interface ParticipantEvent {
  type: ParticipantEventType;
  userId?: string;
  timestamp: number;
  /** Present for keys_exchanged event — all participants now have keys */
  allKeysReady?: boolean;
}
