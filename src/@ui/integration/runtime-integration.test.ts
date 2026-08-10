/**
 * Runtime Integration Tests
 * Verifies that the extension's core runtime managers bootstrap together and
 * interoperate through the shared browser bridge.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRoomStateManager } from '../../@core/room-state/room-state-manager';
import { getAPIKeyManager } from '../../@core/api-keys/api-key-manager';
import { ChatManager } from '../../@core/chat/chat-manager';

// Shared storage mocks used by both the browser-bridge mock and the assertions
// below. vi.hoisted exposes the object to the (hoisted) vi.mock factory.
const bridgeMocks = vi.hoisted(() => {
  const storageLocal = {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  return { storageLocal };
});

// The runtime resolves its bridge through createBrowserBridge(). Mock the
// factory so every manager receives the same promise-based bridge backed by
// the shared storage mocks above.
vi.mock('../../@core/browser-bridge', () => ({
  createBrowserBridge: () => ({
    storage: {
      local: bridgeMocks.storageLocal,
      sync: bridgeMocks.storageLocal,
    },
    runtime: {
      id: 'test-extension-id',
      getManifest: () => ({ manifest_version: 3, name: 'Test', version: '1.0.0' }),
    },
    isChrome: true,
    isFirefox: false,
    manifestVersion: 3,
  }),
}));

describe('Runtime Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Restore the default resolve values the runtime managers rely on.
    bridgeMocks.storageLocal.get.mockResolvedValue({});
    bridgeMocks.storageLocal.set.mockResolvedValue(undefined);
    bridgeMocks.storageLocal.remove.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runtime bootstrap', () => {
    it('should construct all core runtime managers together without error', () => {
      // Importing and constructing the core runtime managers together validates
      // that the runtime's module graph boots cleanly.
      expect(getRoomStateManager()).toBeDefined();
      expect(getAPIKeyManager()).toBeDefined();
      expect(new ChatManager()).toBeDefined();
    });
  });

  describe('shared browser bridge', () => {
    it('APIKeyManager should persist through the shared bridge', async () => {
      const apiKeyManager = getAPIKeyManager();

      await apiKeyManager.storeAPIKey('opensubtitles', 'test-key');

      expect(bridgeMocks.storageLocal.set).toHaveBeenCalledWith(
        expect.objectContaining({ watchPartyAPIKeys: expect.any(Object) })
      );
    });

    it('RoomStateManager should persist through the same bridge', async () => {
      const roomStateManager = getRoomStateManager();

      await roomStateManager.persistRoomState('room-1', {
        isHost: true,
        connectionStatus: 'connected',
      });

      expect(bridgeMocks.storageLocal.set).toHaveBeenCalledWith(
        expect.objectContaining({
          watchPartyRoomState: expect.objectContaining({ roomId: 'room-1' }),
        })
      );
    });
  });

  describe('chat runtime', () => {
    it('should flow a message through the runtime chat manager', () => {
      const chat = new ChatManager();
      const listener = vi.fn();
      chat.onMessage(listener);

      const message = chat.addMessage('user-1', 'hello, world', 'Alice');

      expect(message.id).toBeTruthy();
      expect(chat.getMessages()).toHaveLength(1);
      expect(chat.getMessages()[0].id).toBe(message.id);
      expect(listener).toHaveBeenCalledWith(message);
    });
  });
});
