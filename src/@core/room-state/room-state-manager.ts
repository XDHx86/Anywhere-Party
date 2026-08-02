/**
 * Room State Manager
 * Handles persistent room state across popup sessions
 * Fixes requirement 33: Room State Persistence
 */

import { createBrowserBridge } from '../browser-bridge';

export interface RoomState {
  roomId: string;
  isActive: boolean;
  isHost: boolean;
  participants: Participant[];
  currentPlaybackState: PlaybackState;
  createdAt: Date;
  lastActivity: Date;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  roomInfo?: {
    roomId: string;
    inviteLink?: string;
    createdAt: Date;
    copyableInfo?: string;
    shareableMessage?: string;
  };
  persistenceVersion?: number; // For handling schema migrations
  browserSessionId?: string; // Track browser restart cycles
}

export interface Participant {
  id: string;
  name: string;
  role: 'host' | 'co-host' | 'participant';
  isConnected: boolean;
  joinedAt: Date;
}

export interface PlaybackState {
  currentTime: number;
  paused: boolean;
  playbackRate: number;
  timestamp: number;
  videoUrl?: string;
  duration?: number;
}

export interface RoomInfo {
  id: string | null;
  name: string | null;
  role: 'host' | 'co-host' | 'participant' | null;
  participantCount: number;
  isActive: boolean;
  roomId?: string;
  inviteLink?: string;
  createdAt?: Date;
  copyableInfo?: string;
  shareableMessage?: string;
}

export class RoomStateManager {
  private browserBridge = createBrowserBridge();
  private currentState: RoomState | null = null;
  private stateChangeCallbacks: ((state: RoomState | null) => void)[] = [];

  constructor() {
    this.loadRoomState();
  }

  /**
   * Persist room state to browser.storage.local
   */
  async persistRoomState(roomId: string, state: Partial<RoomState>): Promise<void> {
    try {
      const fullState: RoomState = {
        roomId,
        isActive: true,
        isHost: false,
        participants: [],
        currentPlaybackState: {
          currentTime: 0,
          paused: true,
          playbackRate: 1,
          timestamp: Date.now(),
        },
        createdAt: new Date(),
        lastActivity: new Date(),
        connectionStatus: 'connected',
        ...state,
      };

      await this.browserBridge.storage.local.set({
        watchPartyRoomState: fullState,
      });

      this.currentState = fullState;
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to persist room state:', error);
      throw new Error('Failed to save room state');
    }
  }

  /**
   * Load room state from browser.storage.local
   */
  async loadRoomState(): Promise<RoomState | null> {
    try {
      const result = await this.browserBridge.storage.local.get('watchPartyRoomState');

      if (result.watchPartyRoomState) {
        // Convert date strings back to Date objects
        const state = result.watchPartyRoomState;
        state.createdAt = new Date(state.createdAt);
        state.lastActivity = new Date(state.lastActivity);

        // Check if state is still valid (not too old)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const age = Date.now() - state.lastActivity.getTime();

        if (age > maxAge) {
          // State is too old, clear it
          await this.clearRoomState();
          return null;
        }

        this.currentState = state;
        return state;
      }

      return null;
    } catch (error) {
      console.error('Failed to load room state:', error);
      return null;
    }
  }

  /**
   * Clear room state from storage
   */
  async clearRoomState(): Promise<void> {
    try {
      await this.browserBridge.storage.local.remove('watchPartyRoomState');
      this.currentState = null;
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to clear room state:', error);
    }
  }

  /**
   * Check if room is currently active
   */
  isRoomActive(): boolean {
    return this.currentState?.isActive || false;
  }

  /**
   * Get current room ID
   */
  getCurrentRoomId(): string | null {
    return this.currentState?.roomId || null;
  }

  /**
   * Update room information
   */
  async updateRoomInfo(info: Partial<RoomInfo>): Promise<void> {
    if (!this.currentState) {
      return;
    }

    const updatedState: RoomState = {
      ...this.currentState,
      lastActivity: new Date(),
    };

    if (info.id !== undefined) {
      updatedState.roomId = info.id || '';
    }
    if (info.role !== undefined) {
      updatedState.isHost = info.role === 'host';
    }
    if (info.isActive !== undefined) {
      updatedState.isActive = info.isActive;
    }

    await this.persistRoomState(updatedState.roomId, updatedState);
  }

  /**
   * Update playback state
   */
  async updatePlaybackState(playbackState: Partial<PlaybackState>): Promise<void> {
    if (!this.currentState) {
      return;
    }

    const updatedState: RoomState = {
      ...this.currentState,
      currentPlaybackState: {
        ...this.currentState.currentPlaybackState,
        ...playbackState,
      },
      lastActivity: new Date(),
    };

    await this.persistRoomState(updatedState.roomId, updatedState);
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus(status: RoomState['connectionStatus']): Promise<void> {
    if (!this.currentState) {
      return;
    }

    const updatedState: RoomState = {
      ...this.currentState,
      connectionStatus: status,
      lastActivity: new Date(),
    };

    await this.persistRoomState(updatedState.roomId, updatedState);
  }

  /**
   * Add participant to room
   */
  async addParticipant(participant: Participant): Promise<void> {
    if (!this.currentState) {
      return;
    }

    const participants = [...this.currentState.participants];
    const existingIndex = participants.findIndex((p) => p.id === participant.id);

    if (existingIndex >= 0) {
      participants[existingIndex] = participant;
    } else {
      participants.push(participant);
    }

    const updatedState: RoomState = {
      ...this.currentState,
      participants,
      lastActivity: new Date(),
    };

    await this.persistRoomState(updatedState.roomId, updatedState);
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(participantId: string): Promise<void> {
    if (!this.currentState) {
      return;
    }

    const participants = this.currentState.participants.filter((p) => p.id !== participantId);

    const updatedState: RoomState = {
      ...this.currentState,
      participants,
      lastActivity: new Date(),
    };

    await this.persistRoomState(updatedState.roomId, updatedState);
  }

  /**
   * Get current room state
   */
  getCurrentState(): RoomState | null {
    return this.currentState;
  }

  /**
   * Subscribe to state changes
   */
  subscribeToStateChanges(callback: (state: RoomState | null) => void): () => void {
    this.stateChangeCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index >= 0) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    });
  }

  /**
   * Get room info for UI display
   */
  getRoomInfo(): RoomInfo {
    if (!this.currentState) {
      return {
        id: null,
        name: null,
        role: null,
        participantCount: 0,
        isActive: false,
      };
    }

    return {
      id: this.currentState.roomId,
      name: `Room ${this.currentState.roomId.slice(-6)}`, // Show last 6 chars
      role: this.currentState.isHost ? 'host' : 'participant',
      participantCount: this.currentState.participants.length,
      isActive: this.currentState.isActive,
    };
  }

  /**
   * Check if current user is host
   */
  isCurrentUserHost(): boolean {
    return this.currentState?.isHost || false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): RoomState['connectionStatus'] {
    return this.currentState?.connectionStatus || 'disconnected';
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(): Promise<void> {
    if (!this.currentState) {
      return;
    }

    const updatedState: RoomState = {
      ...this.currentState,
      lastActivity: new Date(),
    };

    await this.persistRoomState(updatedState.roomId, updatedState);
  }
}

// Singleton instance
let roomStateManagerInstance: RoomStateManager | null = null;

export const getRoomStateManager = (): RoomStateManager => {
  if (!roomStateManagerInstance) {
    roomStateManagerInstance = new RoomStateManager();
  }
  return roomStateManagerInstance;
};

export default RoomStateManager;
