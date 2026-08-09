/**
 * Participant Manager
 *
 * Single source of truth for the current room's participant list.
 * All subsystems (privacy/encryption, annotation sync, voice chat) read from
 * this module rather than maintaining their own copies.
 *
 * Lifecycle:
 *   Room created/joined → onRoomJoined(participantIds)
 *   Participant joins   → addParticipant(userId)
 *   Participant leaves  → removeParticipant(userId)
 *   Keys exchanged       → setParticipantKey(userId, publicKey)
 *   Room left / reset   → reset()
 */

import {
  ParticipantInfo,
  ParticipantManagerConfig,
  ParticipantEvent,
  ParticipantEventType,
} from './types';

const DEFAULT_CONFIG: ParticipantManagerConfig = {
  maxParticipants: 50,
  keyExchangeTimeout: 30_000, // 30 seconds
};

export class ParticipantManager {
  private participants: Map<string, ParticipantInfo> = new Map();
  private currentUserId: string = '';
  private config: ParticipantManagerConfig;
  private eventListeners: Map<ParticipantEventType, Set<(event: ParticipantEvent) => void>> =
    new Map();
  private keyExchangeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config?: Partial<ParticipantManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Lifecycle ────────────────────────────────────────────

  /**
   * Initialize with the current user and participant list from a room join event.
   */
  onRoomJoined(roomId: string, currentUserId: string, participantIds: string[]): void {
    this.reset();
    this.currentUserId = currentUserId;

    // Add self first
    this.participants.set(currentUserId, {
      userId: currentUserId,
      joinedAt: Date.now(),
    });

    // Add other participants
    for (const id of participantIds) {
      if (id !== currentUserId && !this.participants.has(id)) {
        this.participants.set(id, {
          userId: id,
          joinedAt: Date.now(),
        });
        this.emitEvent('participant_added', id);
      }
    }

    this.startKeyExchangeTimer();
    console.log(`ParticipantManager: room joined with ${this.participants.size} participant(s)`);
  }

  /**
   * Reset all state when leaving a room.
   */
  reset(): void {
    this.participants.clear();
    this.currentUserId = '';
    this.clearKeyExchangeTimer();
    console.log('ParticipantManager: reset');
  }

  // ─── Participant CRUD ────────────────────────────────────

  /**
   * Add a participant who joined the room.
   */
  addParticipant(userId: string): boolean {
    if (this.participants.has(userId)) {
      return false; // already present
    }

    if (this.participants.size >= this.config.maxParticipants) {
      console.warn('ParticipantManager: max participants reached');
      return false;
    }

    this.participants.set(userId, {
      userId,
      joinedAt: Date.now(),
    });

    this.emitEvent('participant_added', userId);
    return true;
  }

  /**
   * Remove a participant who left the room.
   */
  removeParticipant(userId: string): ParticipantInfo | null {
    const participant = this.participants.get(userId);
    if (!participant) {
      return null;
    }

    this.participants.delete(userId);
    this.emitEvent('participant_removed', userId);

    // Check if all remaining participants now have keys
    if (this.hasKeysExchanged()) {
      this.emitEvent('keys_exchanged', undefined, { allKeysReady: true });
    }

    return participant;
  }

  /**
   * Update a participant's public key after key exchange.
   */
  setParticipantKey(userId: string, publicKey: string): boolean {
    const participant = this.participants.get(userId);
    if (!participant) {
      console.warn(`ParticipantManager: unknown participant ${userId} for key update`);
      return false;
    }

    participant.publicKey = publicKey;
    console.log(`ParticipantManager: key set for ${userId}`);

    // Check if all participants now have keys
    if (this.hasKeysExchanged()) {
      this.clearKeyExchangeTimer();
      this.emitEvent('keys_exchanged', undefined, { allKeysReady: true });
    }

    return true;
  }

  // ─── Queries ─────────────────────────────────────────────

  getParticipants(): ParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  getParticipantIds(): string[] {
    return Array.from(this.participants.keys());
  }

  getParticipant(userId: string): ParticipantInfo | undefined {
    return this.participants.get(userId);
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  get size(): number {
    return this.participants.size;
  }

  /**
   * Whether all participants (including self) have exchanged public keys.
   * Always returns false if there are 0 or 1 participants (no one to exchange with).
   */
  hasKeysExchanged(): boolean {
    if (this.participants.size <= 1) {
      return false;
    }

    for (const participant of this.participants.values()) {
      if (!participant.publicKey) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all participant IDs that have public keys.
   */
  getKeyExchangedIds(): string[] {
    return Array.from(this.participants.values())
      .filter((p) => p.publicKey)
      .map((p) => p.userId);
  }

  /**
   * Get participant IDs that are missing public keys (excluding self).
   */
  getMissingKeyIds(): string[] {
    return Array.from(this.participants.values())
      .filter((p) => !p.publicKey && p.userId !== this.currentUserId)
      .map((p) => p.userId);
  }

  // ─── Events ──────────────────────────────────────────────

  /**
   * Subscribe to participant events.
   * @returns Unsubscribe function.
   */
  onEvent(
    eventType: ParticipantEventType,
    callback: (event: ParticipantEvent) => void
  ): () => void {
    let listeners = this.eventListeners.get(eventType);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(eventType, listeners);
    }
    listeners.add(callback);

    return () => {
      this.eventListeners.get(eventType)?.delete(callback);
    };
  }

  private emitEvent(
    type: ParticipantEventType,
    userId?: string,
    extras?: { allKeysReady?: boolean }
  ): void {
    const event: ParticipantEvent = {
      type,
      userId,
      timestamp: Date.now(),
      ...extras,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event);
        } catch (error) {
          console.error(`ParticipantManager: error in ${type} listener:`, error);
        }
      }
    }
  }

  // ─── Key Exchange Timer ──────────────────────────────────

  private startKeyExchangeTimer(): void {
    this.clearKeyExchangeTimer();

    if (this.participants.size <= 1) return;

    this.keyExchangeTimer = setTimeout(() => {
      if (!this.hasKeysExchanged()) {
        const missing = this.getMissingKeyIds();
        console.warn(
          `ParticipantManager: key exchange timeout — missing keys from: ${missing.join(', ')}`
        );
        this.emitEvent('key_exchange_timeout', undefined, { allKeysReady: false });
      }
    }, this.config.keyExchangeTimeout);
  }

  private clearKeyExchangeTimer(): void {
    if (this.keyExchangeTimer) {
      clearTimeout(this.keyExchangeTimer);
      this.keyExchangeTimer = null;
    }
  }
}

// Singleton
let instance: ParticipantManager | null = null;

export function getParticipantManager(
  config?: Partial<ParticipantManagerConfig>
): ParticipantManager {
  if (!instance) {
    instance = new ParticipantManager(config);
  }
  return instance;
}

export default ParticipantManager;
