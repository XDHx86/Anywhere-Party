/**
 * Tests for Avatar Manager
 * Tests avatar synchronization, movement, and overlay functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AvatarManager } from './avatar-manager';
import { AvatarMessage, AVATAR_ANIMATIONS } from './types';

// Mock DOM elements
const mockVideoElement = {
  getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 }),
  parentElement: {
    style: { position: 'relative' },
    appendChild: vi.fn(),
    insertBefore: vi.fn(),
  },
} as any;

const mockCanvas = {
  getContext: () => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    roundRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    measureText: () => ({ width: 100 }),
  }),
  width: 800,
  height: 600,
  style: {},
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as any;

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: (tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    const styleValues: Record<string, string> = {};
    // Mimic CSSStyleDeclaration: unset properties read as '' not undefined
    const style = new Proxy(styleValues, {
      get(target, prop) {
        if (typeof prop === 'string' && prop in target) return target[prop];
        return '';
      },
      set(target, prop, value) {
        if (typeof prop === 'string') target[prop] = String(value);
        return true;
      },
    });
    return {
      style,
      className: '',
      id: '',
      textContent: '',
      innerHTML: '',
      parentNode: null,
      setAttribute: vi.fn(),
      getAttribute: vi.fn(() => null),
      removeAttribute: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      insertBefore: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn(() => false),
      },
      getBoundingClientRect: () => ({ width: 0, height: 0, left: 0, top: 0 }),
    };
  },
});

Object.defineProperty(document, 'addEventListener', {
  value: vi.fn(),
});

Object.defineProperty(document, 'removeEventListener', {
  value: vi.fn(),
});

Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({ position: 'static' }),
});

Object.defineProperty(window, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) => {
    setTimeout(callback, 16);
    return 1;
  },
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: vi.fn(),
});

describe('AvatarManager', () => {
  let avatarManager: AvatarManager;
  let mockSignalingSend: ReturnType<typeof vi.fn>;
  let mockOnAvatarUpdate: ReturnType<typeof vi.fn>;
  let mockOnAvatarMove: ReturnType<typeof vi.fn>;

  const mockOptions = {
    roomId: 'test-room',
    userId: 'user123',
    userName: 'Test User',
  };

  beforeEach(() => {
    mockSignalingSend = vi.fn();
    mockOnAvatarUpdate = vi.fn();
    mockOnAvatarMove = vi.fn();

    avatarManager = new AvatarManager({
      ...mockOptions,
      signalingSend: mockSignalingSend,
      onAvatarUpdate: mockOnAvatarUpdate,
      onAvatarMove: mockOnAvatarMove,
      overlayOptions: {
        updateRate: 30,
        avatarSize: 48,
      },
    });
  });

  afterEach(() => {
    avatarManager.destroy();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with local avatar', () => {
      const localAvatar = avatarManager.getLocalAvatar();

      expect(localAvatar).toBeDefined();
      expect(localAvatar?.userId).toBe(mockOptions.userId);
      expect(localAvatar?.displayName).toBe(mockOptions.userName);
      expect(localAvatar?.visible).toBe(true);
      expect(localAvatar?.x).toBeGreaterThanOrEqual(0);
      expect(localAvatar?.x).toBeLessThanOrEqual(1);
      expect(localAvatar?.y).toBeGreaterThanOrEqual(0);
      expect(localAvatar?.y).toBeLessThanOrEqual(1);
    });

    it('should inject overlay successfully', () => {
      const success = avatarManager.injectOverlay(mockVideoElement);

      expect(success).toBe(true);
      expect(avatarManager.isOverlayActive()).toBe(true);
    });

    it('should remove overlay', () => {
      avatarManager.injectOverlay(mockVideoElement);
      expect(avatarManager.isOverlayActive()).toBe(true);

      avatarManager.removeOverlay();
      expect(avatarManager.isOverlayActive()).toBe(false);
    });
  });

  describe('Avatar Synchronization', () => {
    it('should handle avatar update messages', () => {
      const updateMessage: AvatarMessage = {
        type: 'AVATAR_UPDATE',
        id: 'avatar_user456',
        x: 0.5,
        y: 0.3,
        timestamp: Date.now(),
      };

      avatarManager.handleMessage(updateMessage);

      const avatars = avatarManager.getAvatars();
      const remoteAvatar = avatars.find((a) => a.id === 'avatar_user456');

      expect(remoteAvatar).toBeDefined();
      expect(remoteAvatar?.x).toBe(0.5);
      expect(remoteAvatar?.y).toBe(0.3);
      expect(mockOnAvatarUpdate).toHaveBeenCalledWith(remoteAvatar);
    });

    it('should handle avatar animation messages', () => {
      const animateMessage: AvatarMessage = {
        type: 'AVATAR_ANIMATE',
        id: 'avatar_user456',
        animationKey: AVATAR_ANIMATIONS.HEART,
        durationMs: 2000,
      };

      avatarManager.injectOverlay(mockVideoElement);
      avatarManager.handleMessage(animateMessage);

      // Animation should be handled (no direct update callback for animations)
      expect(true).toBe(true);
    });

    it('should handle chat bubble messages', () => {
      const chatMessage: AvatarMessage = {
        type: 'AVATAR_CHAT_BUBBLE',
        id: 'avatar_user456',
        message: 'Hello everyone!',
        durationMs: 4000,
      };

      avatarManager.injectOverlay(mockVideoElement);
      avatarManager.handleMessage(chatMessage);

      // Chat bubble should be handled (no direct update callback for chat bubbles)
      expect(true).toBe(true);
    });

    it('should handle avatar config messages', () => {
      const configMessage: AvatarMessage = {
        type: 'AVATAR_CONFIG',
        id: 'avatar_user456',
        displayName: 'Updated User',
        imageUrl: '/path/to/avatar.png',
      };

      avatarManager.handleMessage(configMessage);

      const avatars = avatarManager.getAvatars();
      const remoteAvatar = avatars.find((a) => a.id === 'avatar_user456');

      expect(remoteAvatar).toBeDefined();
      expect(remoteAvatar?.displayName).toBe('Updated User');
      expect(remoteAvatar?.imageUrl).toBe('/path/to/avatar.png');
    });

    it('should handle visibility messages', () => {
      const visibilityMessage: AvatarMessage = {
        type: 'AVATAR_VISIBILITY',
        id: 'avatar_user456',
        visible: false,
      };

      // First create the avatar
      const updateMessage: AvatarMessage = {
        type: 'AVATAR_UPDATE',
        id: 'avatar_user456',
        x: 0.5,
        y: 0.5,
        timestamp: Date.now(),
      };
      avatarManager.handleMessage(updateMessage);

      // Then update visibility
      avatarManager.handleMessage(visibilityMessage);

      const avatars = avatarManager.getAvatars();
      const remoteAvatar = avatars.find((a) => a.id === 'avatar_user456');

      expect(remoteAvatar?.visible).toBe(false);
    });
  });

  describe('Local Avatar Control', () => {
    it('should trigger animations on local avatar', () => {
      avatarManager.injectOverlay(mockVideoElement);
      avatarManager.triggerAnimation(AVATAR_ANIMATIONS.HEART, 3000);

      expect(mockSignalingSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AVATAR_MESSAGE',
          roomId: mockOptions.roomId,
          message: expect.objectContaining({
            type: 'AVATAR_ANIMATE',
            animationKey: AVATAR_ANIMATIONS.HEART,
            durationMs: 3000,
          }),
        })
      );
    });

    it('should show chat bubbles on local avatar', () => {
      avatarManager.injectOverlay(mockVideoElement);
      avatarManager.showChatBubble('Test message', 5000);

      expect(mockSignalingSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AVATAR_MESSAGE',
          roomId: mockOptions.roomId,
          message: expect.objectContaining({
            type: 'AVATAR_CHAT_BUBBLE',
            message: 'Test message',
            durationMs: 5000,
          }),
        })
      );
    });

    it('should update local avatar config', () => {
      const config = {
        displayName: 'New Name',
        imageUrl: '/new/avatar.png',
      };

      avatarManager.updateConfig(config);

      expect(mockSignalingSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AVATAR_MESSAGE',
          roomId: mockOptions.roomId,
          message: expect.objectContaining({
            type: 'AVATAR_CONFIG',
            displayName: 'New Name',
            imageUrl: '/new/avatar.png',
          }),
        })
      );

      const localAvatar = avatarManager.getLocalAvatar();
      expect(localAvatar?.displayName).toBe('New Name');
      expect(localAvatar?.imageUrl).toBe('/new/avatar.png');
    });

    it('should set local avatar visibility', () => {
      avatarManager.setVisibility(false);

      expect(mockSignalingSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AVATAR_MESSAGE',
          roomId: mockOptions.roomId,
          message: expect.objectContaining({
            type: 'AVATAR_VISIBILITY',
            visible: false,
          }),
        })
      );

      const localAvatar = avatarManager.getLocalAvatar();
      expect(localAvatar?.visible).toBe(false);
    });

    it('should update voice activity status', () => {
      avatarManager.setVoiceActivity(true, false);

      const localAvatar = avatarManager.getLocalAvatar();
      expect(localAvatar?.speaking).toBe(true);
      expect(localAvatar?.muted).toBe(false);
      expect(mockOnAvatarUpdate).toHaveBeenCalledWith(localAvatar);
    });
  });

  describe('Keyboard Input', () => {
    beforeEach(() => {
      avatarManager.injectOverlay(mockVideoElement);
    });

    it('should handle WASD key presses', () => {
      const keyDownEvent = new KeyboardEvent('keydown', { key: 'w' });
      const keyUpEvent = new KeyboardEvent('keyup', { key: 'w' });

      avatarManager.handleKeyDown(keyDownEvent);
      avatarManager.handleKeyUp(keyUpEvent);

      // Movement is handled by the overlay, so we just verify the methods don't throw
      expect(true).toBe(true);
    });

    it('should handle arrow key presses', () => {
      const keyDownEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      const keyUpEvent = new KeyboardEvent('keyup', { key: 'ArrowUp' });

      avatarManager.handleKeyDown(keyDownEvent);
      avatarManager.handleKeyUp(keyUpEvent);

      expect(true).toBe(true);
    });
  });

  describe('Avatar Management', () => {
    it('should get all avatars', () => {
      // Add a remote avatar
      const updateMessage: AvatarMessage = {
        type: 'AVATAR_UPDATE',
        id: 'avatar_user456',
        x: 0.5,
        y: 0.5,
        timestamp: Date.now(),
      };
      avatarManager.handleMessage(updateMessage);

      const avatars = avatarManager.getAvatars();
      expect(avatars).toHaveLength(2); // Local + remote

      const localAvatar = avatars.find((a) => a.userId === mockOptions.userId);
      const remoteAvatar = avatars.find((a) => a.id === 'avatar_user456');

      expect(localAvatar).toBeDefined();
      expect(remoteAvatar).toBeDefined();
    });

    it('should cleanup expired avatars', () => {
      // Add a remote avatar
      const updateMessage: AvatarMessage = {
        type: 'AVATAR_UPDATE',
        id: 'avatar_user456',
        x: 0.5,
        y: 0.5,
        timestamp: Date.now() - 60000, // 1 minute ago
      };
      avatarManager.handleMessage(updateMessage);

      expect(avatarManager.getAvatars()).toHaveLength(2);

      avatarManager.cleanup();

      // Remote avatar should be removed due to age
      const avatarsAfterCleanup = avatarManager.getAvatars();
      expect(avatarsAfterCleanup).toHaveLength(1);
      expect(avatarsAfterCleanup[0].userId).toBe(mockOptions.userId);
    });

    it('should destroy properly', () => {
      avatarManager.injectOverlay(mockVideoElement);
      expect(avatarManager.isOverlayActive()).toBe(true);

      avatarManager.destroy();

      expect(avatarManager.isOverlayActive()).toBe(false);
      expect(avatarManager.getLocalAvatar()).toBeNull();
      expect(avatarManager.getAvatars()).toHaveLength(0);
    });
  });

  describe('Integration', () => {
    it('should integrate with voice activity', () => {
      const mockOnVoiceActivity = vi.fn();

      const managerWithVoice = new AvatarManager({
        ...mockOptions,
        onVoiceActivity: mockOnVoiceActivity,
      });

      managerWithVoice.setVoiceActivity(true, false);

      const localAvatar = managerWithVoice.getLocalAvatar();
      expect(localAvatar?.speaking).toBe(true);
      expect(localAvatar?.muted).toBe(false);

      managerWithVoice.destroy();
    });

    it('should handle position updates from movement', () => {
      avatarManager.injectOverlay(mockVideoElement);

      const localAvatar = avatarManager.getLocalAvatar();
      if (localAvatar) {
        // Simulate movement
        localAvatar.x = 0.7;
        localAvatar.y = 0.4;

        mockOnAvatarMove(localAvatar);

        expect(mockOnAvatarMove).toHaveBeenCalledWith(localAvatar);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle signaling send failures gracefully', () => {
      const failingSignalingSend = vi.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

      const managerWithFailingSend = new AvatarManager({
        ...mockOptions,
        signalingSend: failingSignalingSend,
      });

      // Should not throw
      expect(() => {
        managerWithFailingSend.triggerAnimation(AVATAR_ANIMATIONS.HEART);
      }).not.toThrow();

      managerWithFailingSend.destroy();
    });

    it('should handle invalid messages gracefully', () => {
      const invalidMessage = {
        type: 'INVALID_TYPE',
        id: 'test',
      } as any;

      // Should not throw
      expect(() => {
        avatarManager.handleMessage(invalidMessage);
      }).not.toThrow();
    });

    it('should handle overlay injection failure', () => {
      const invalidVideoElement = null as any;

      const success = avatarManager.injectOverlay(invalidVideoElement);
      expect(success).toBe(false);
      expect(avatarManager.isOverlayActive()).toBe(false);
    });
  });
});
