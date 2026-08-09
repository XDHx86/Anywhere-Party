/**
 * Playlist Manager
 * In-memory queue with host-only control, skip voting, auto-advance, and persistence.
 * Mirrors the persistence pattern from RoomStateManager.
 */

import { createBrowserBridge } from '../browser-bridge';
import { PlaylistItem, PlaylistState, PlaylistManagerConfig } from './types';

const DEFAULT_CONFIG: PlaylistManagerConfig = {
  maxItems: 100,
  skipVoteThreshold: 0.5,
  persistenceKey: 'watchPartyPlaylist',
  persistenceTTL: 24 * 60 * 60 * 1000, // 24 hours
};

export class PlaylistManager {
  private browserBridge = createBrowserBridge();
  private state: PlaylistState = {
    items: [],
    currentIndex: 0,
    isPlaying: false,
    playHistory: [],
  };
  private skipVotes: Map<string, Set<string>> = new Map(); // itemId → Set of userIds
  private stateChangeCallbacks: ((state: PlaylistState) => void)[] = [];
  private config: PlaylistManagerConfig;

  constructor(config?: Partial<PlaylistManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadPlaylist();
  }

  // ─── State Access ────────────────────────────────────────

  getState(): PlaylistState {
    return { ...this.state };
  }

  getCurrentItem(): PlaylistItem | null {
    if (this.state.items.length === 0) return null;
    return this.state.items[this.state.currentIndex] ?? null;
  }

  isEmpty(): boolean {
    return this.state.items.length === 0;
  }

  // ─── Host-Only Mutations ────────────────────────────────

  async addItem(item: PlaylistItem): Promise<void> {
    if (this.state.items.length >= this.config.maxItems) {
      throw new Error('Playlist is full');
    }
    this.state.items.push(item);
    await this.persist();
  }

  async addItems(items: PlaylistItem[]): Promise<void> {
    const remaining = this.config.maxItems - this.state.items.length;
    const toAdd = items.slice(0, remaining);
    this.state.items.push(...toAdd);
    await this.persist();
  }

  async removeItems(itemIds: string[]): Promise<void> {
    const removeSet = new Set(itemIds);
    this.state.items = this.state.items.filter((item) => !removeSet.has(item.id));

    // Clamp currentIndex
    if (this.state.currentIndex >= this.state.items.length) {
      this.state.currentIndex = Math.max(0, this.state.items.length - 1);
    }

    this.skipVotes.forEach((_, itemId) => {
      if (removeSet.has(itemId)) this.skipVotes.delete(itemId);
    });

    await this.persist();
  }

  async reorderItems(itemIds: string[], newIndex: number): Promise<void> {
    const idToItem = new Map(this.state.items.map((item) => [item.id, item]));
    const reordered: PlaylistItem[] = [];
    const insertPos = newIndex;

    for (const id of itemIds) {
      const item = idToItem.get(id);
      if (item) {
        reordered.push(item);
        idToItem.delete(id);
      }
    }

    // Rebuild: items not in reordered list, with reordered items spliced in
    const newItems: PlaylistItem[] = [];
    let rIdx = 0;
    for (let i = 0; i < this.state.items.length; i++) {
      const item = this.state.items[i];
      if (item === undefined) continue;
      if (rIdx < reordered.length && i === insertPos) {
        newItems.push(...reordered);
        rIdx = reordered.length;
      }
      if (!reordered.some((r) => r.id === item.id)) {
        newItems.push(item);
      }
    }
    // Append remaining reordered if not yet placed
    if (rIdx < reordered.length) {
      newItems.push(...reordered.slice(rIdx));
    }

    this.state.items = newItems;

    if (this.state.currentIndex >= this.state.items.length) {
      this.state.currentIndex = Math.max(0, this.state.items.length - 1);
    }

    await this.persist();
  }

  async advanceToNext(): Promise<PlaylistItem | null> {
    if (this.state.items.length === 0) return null;

    this.state.playHistory.push(this.state.items[this.state.currentIndex]?.id ?? '');

    if (this.state.currentIndex < this.state.items.length - 1) {
      this.state.currentIndex++;
    } else {
      // Wrap around or stop
      this.state.currentIndex = 0;
    }

    this.state.isPlaying = true;
    await this.persist();
    return this.getCurrentItem();
  }

  async setCurrentIndex(index: number): Promise<void> {
    if (index < 0 || index >= this.state.items.length) {
      throw new Error('Index out of range');
    }
    this.state.currentIndex = index;
    this.state.isPlaying = true;
    await this.persist();
  }

  async setPlaying(isPlaying: boolean): Promise<void> {
    this.state.isPlaying = isPlaying;
    await this.persist();
  }

  // ─── Skip Voting ─────────────────────────────────────────

  addSkipVote(
    itemId: string,
    userId: string,
    totalParticipants: number
  ): { skipped: boolean; voteCount: number } {
    const votes = this.skipVotes.get(itemId) ?? new Set<string>();
    this.skipVotes.set(itemId, votes);
    votes.add(userId);

    const voteCount = votes.size;
    const threshold = Math.ceil(totalParticipants * this.config.skipVoteThreshold);
    const skipped = voteCount >= threshold;

    if (skipped) {
      this.skipVotes.delete(itemId);
    }

    return { skipped, voteCount };
  }

  clearSkipVotes(itemId?: string): void {
    if (itemId) {
      this.skipVotes.delete(itemId);
    } else {
      this.skipVotes.clear();
    }
  }

  // ─── Persistence ─────────────────────────────────────────

  async persist(): Promise<void> {
    try {
      await this.browserBridge.storage.local.set({
        [this.config.persistenceKey]: {
          ...this.state,
          savedAt: Date.now(),
        },
      });
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to persist playlist:', error);
    }
  }

  async loadPlaylist(): Promise<void> {
    try {
      const result = await this.browserBridge.storage.local.get(this.config.persistenceKey);
      const data = result[this.config.persistenceKey] as
        | {
            savedAt?: number;
            items?: PlaylistItem[];
            currentIndex?: number;
            isPlaying?: boolean;
            playHistory?: string[];
          }
        | undefined;

      if (data) {
        const savedData = data as {
          savedAt?: number;
          items?: PlaylistItem[];
          currentIndex?: number;
          isPlaying?: boolean;
          playHistory?: string[];
        };
        const age = Date.now() - (savedData.savedAt || 0);
        if (age > this.config.persistenceTTL) {
          await this.clearPlaylist();
          return;
        }

        this.state = {
          items: savedData.items || [],
          currentIndex: savedData.currentIndex || 0,
          isPlaying: savedData.isPlaying || false,
          playHistory: savedData.playHistory || [],
        };
      }
    } catch (error) {
      console.error('Failed to load playlist:', error);
    }
  }

  async clearPlaylist(): Promise<void> {
    try {
      await this.browserBridge.storage.local.remove(this.config.persistenceKey);
      this.state = { items: [], currentIndex: 0, isPlaying: false, playHistory: [] };
      this.skipVotes.clear();
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to clear playlist:', error);
    }
  }

  // ─── Subscriptions ───────────────────────────────────────

  subscribeToStateChanges(callback: (state: PlaylistState) => void): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index >= 0) this.stateChangeCallbacks.splice(index, 1);
    };
  }

  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach((cb) => {
      try {
        cb(this.getState());
      } catch (error) {
        console.error('Error in playlist state change callback:', error);
      }
    });
  }
}

// Singleton
let instance: PlaylistManager | null = null;

export function getPlaylistManager(config?: Partial<PlaylistManagerConfig>): PlaylistManager {
  if (!instance) {
    instance = new PlaylistManager(config);
  }
  return instance;
}

export default PlaylistManager;
