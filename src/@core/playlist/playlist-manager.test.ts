/**
 * Playlist Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaylistManager, getPlaylistManager } from './playlist-manager';
import type { PlaylistItem } from './types';

// Mock browser bridge
vi.mock('../browser-bridge', () => ({
  createBrowserBridge: () => ({
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      },
    },
  }),
}));

const createItem = (overrides: Partial<PlaylistItem> = {}): PlaylistItem => ({
  id: `item-${Math.random().toString(36).slice(2, 8)}`,
  url: `https://example.com/video/${Math.random().toString(36).slice(2, 8)}`,
  title: 'Test Video',
  addedBy: 'user-1',
  ...overrides,
});

describe('PlaylistManager', () => {
  let manager: PlaylistManager;

  beforeEach(() => {
    manager = new PlaylistManager({ persistenceTTL: 60000 });
  });

  describe('initial state', () => {
    it('starts empty', () => {
      expect(manager.isEmpty()).toBe(true);
      expect(manager.getState().items).toHaveLength(0);
      expect(manager.getCurrentItem()).toBeNull();
    });
  });

  describe('addItem', () => {
    it('adds a single item', async () => {
      const item = createItem();
      await manager.addItem(item);
      expect(manager.getState().items).toHaveLength(1);
      expect(manager.getCurrentItem()?.id).toBe(item.id);
    });

    it('throws when playlist is full', async () => {
      const mgr = new PlaylistManager({ maxItems: 2, persistenceTTL: 60000 });
      await mgr.addItem(createItem());
      await mgr.addItem(createItem());
      await expect(mgr.addItem(createItem())).rejects.toThrow('Playlist is full');
    });
  });

  describe('addItems', () => {
    it('adds multiple items', async () => {
      const items = [createItem(), createItem(), createItem()];
      await manager.addItems(items);
      expect(manager.getState().items).toHaveLength(3);
    });

    it('respects maxItems limit', async () => {
      const mgr = new PlaylistManager({ maxItems: 2, persistenceTTL: 60000 });
      await mgr.addItems([createItem(), createItem(), createItem()]);
      expect(mgr.getState().items).toHaveLength(2);
    });
  });

  describe('removeItems', () => {
    it('removes items by id', async () => {
      const item1 = createItem({ id: 'a' });
      const item2 = createItem({ id: 'b' });
      const item3 = createItem({ id: 'c' });
      await manager.addItems([item1, item2, item3]);
      await manager.removeItems(['b']);
      expect(manager.getState().items).toHaveLength(2);
      expect(manager.getState().items.map((i) => i.id)).toEqual(['a', 'c']);
    });

    it('clamps currentIndex when removing current item', async () => {
      const item1 = createItem({ id: 'a' });
      const item2 = createItem({ id: 'b' });
      await manager.addItems([item1, item2]);
      await manager.setCurrentIndex(1);
      await manager.removeItems(['b']);
      expect(manager.getState().currentIndex).toBe(0);
    });
  });

  describe('reorderItems', () => {
    it('reorders items', async () => {
      const item1 = createItem({ id: 'a' });
      const item2 = createItem({ id: 'b' });
      const item3 = createItem({ id: 'c' });
      await manager.addItems([item1, item2, item3]);
      await manager.reorderItems(['c', 'a', 'b'], 0);
      expect(manager.getState().items.map((i) => i.id)).toEqual(['c', 'a', 'b']);
    });
  });

  describe('advanceToNext', () => {
    it('advances to next item', async () => {
      const item1 = createItem({ id: 'a' });
      const item2 = createItem({ id: 'b' });
      await manager.addItems([item1, item2]);
      const next = await manager.advanceToNext();
      expect(next?.id).toBe('b');
      expect(manager.getState().currentIndex).toBe(1);
    });

    it('wraps around to first item', async () => {
      const item1 = createItem({ id: 'a' });
      const item2 = createItem({ id: 'b' });
      await manager.addItems([item1, item2]);
      await manager.advanceToNext(); // → index 1
      const next = await manager.advanceToNext(); // → wraps to 0
      expect(next?.id).toBe('a');
      expect(manager.getState().currentIndex).toBe(0);
    });

    it('returns null when empty', async () => {
      const next = await manager.advanceToNext();
      expect(next).toBeNull();
    });

    it('records play history', async () => {
      const item1 = createItem({ id: 'a' });
      const item2 = createItem({ id: 'b' });
      await manager.addItems([item1, item2]);
      await manager.advanceToNext();
      expect(manager.getState().playHistory).toContain('a');
    });
  });

  describe('skip voting', () => {
    it('returns not skipped below threshold', () => {
      const result = manager.addSkipVote('item-1', 'user-1', 5);
      expect(result.skipped).toBe(false);
      expect(result.voteCount).toBe(1);
    });

    it('skips when threshold reached (>50%)', () => {
      // 3 participants, need 2 votes (ceil(3 * 0.5) = 2)
      manager.addSkipVote('item-1', 'user-1', 3);
      const result = manager.addSkipVote('item-1', 'user-2', 3);
      expect(result.skipped).toBe(true);
      expect(result.voteCount).toBe(2);
    });

    it('does not double-count votes', () => {
      manager.addSkipVote('item-1', 'user-1', 3);
      const result = manager.addSkipVote('item-1', 'user-1', 3);
      expect(result.voteCount).toBe(1);
    });

    it('clears votes for specific item', () => {
      manager.addSkipVote('item-1', 'user-1', 3);
      manager.addSkipVote('item-1', 'user-2', 3);
      manager.clearSkipVotes('item-1');
      const result = manager.addSkipVote('item-1', 'user-3', 3);
      expect(result.voteCount).toBe(1);
    });
  });

  describe('state subscriptions', () => {
    it('notifies subscribers on state change', async () => {
      const callback = vi.fn();
      manager.subscribeToStateChanges(callback);
      await manager.addItem(createItem());
      expect(callback).toHaveBeenCalled();
    });

    it('unsubscribes correctly', async () => {
      const callback = vi.fn();
      const unsub = manager.subscribeToStateChanges(callback);
      unsub();
      await manager.addItem(createItem());
      // callback should not have been called after unsub
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
