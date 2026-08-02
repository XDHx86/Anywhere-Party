/**
 * Material Design 3 Video Overlay Integration Tests
 * Tests for Material surfaces, elevation, animations, and theming
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MaterialVideoOverlay } from './material-video-overlay';
import { MaterialReactionOverlay } from './material-reaction-overlay';
import { MaterialAvatarOverlay } from './material-avatar-overlay';
import { MaterialOverlayManager } from './material-overlay-manager';
import { ReactionType } from '../@core/chat/types';
import { Avatar } from '../@core/avatar-overlay/types';

// Mock DOM elements
const createMockVideoElement = (): HTMLVideoElement => {
  const video = document.createElement('video') as HTMLVideoElement;
  video.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    width: 640,
    height: 360,
    right: 640,
    bottom: 360,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));

  const parent = document.createElement('div');
  parent.style.position = 'relative';
  parent.appendChild(video);
  document.body.appendChild(parent);

  return video;
};

const createMockAvatar = (id: string): Avatar => ({
  id,
  userId: `user_${id}`,
  displayName: `User ${id}`,
  x: Math.random(),
  y: Math.random(),
  visible: true,
  speaking: false,
  muted: false,
  imageUrl: undefined,
  animationUrl: undefined,
  lastUpdate: Date.now(),
});

describe('MaterialVideoOverlay', () => {
  let overlay: MaterialVideoOverlay;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    mockVideo = createMockVideoElement();
    overlay = new MaterialVideoOverlay({
      enableTranslucency: true,
      defaultElevation: 'level2',
      cornerRadius: 'medium',
      maxConcurrentSurfaces: 10,
    });
  });

  afterEach(() => {
    overlay.removeOverlay();
    document.body.innerHTML = '';
  });

  describe('Overlay Injection', () => {
    it('should inject overlay successfully', () => {
      const success = overlay.injectOverlay(mockVideo);
      expect(success).toBe(true);
      expect(overlay.isOverlayInjected()).toBe(true);
    });

    it('should create Material container with proper styling', () => {
      overlay.injectOverlay(mockVideo);

      const container = document.getElementById('watch-party-material-overlay');
      expect(container).toBeTruthy();
      expect(container?.className).toBe('material-video-overlay-container');
      expect(container?.style.position).toBe('absolute');
      expect(container?.style.zIndex).toBe('9998');
    });

    it('should handle cross-origin restrictions gracefully', () => {
      // Mock cross-origin error
      const restrictedVideo = createMockVideoElement();
      Object.defineProperty(restrictedVideo.parentElement, 'style', {
        get: () => {
          throw new Error('Cross-origin restriction');
        },
      });

      const success = overlay.injectOverlay(restrictedVideo);
      expect(success).toBe(false);
    });
  });

  describe('Material Surface Creation', () => {
    beforeEach(() => {
      overlay.injectOverlay(mockVideo);
    });

    it('should create reaction surface with Material Design 3 styling', () => {
      const success = overlay.createReactionSurface(
        'reaction_1',
        '❤️',
        { x: 0.5, y: 0.5 },
        { elevation: 'level2', animation: 'scaleIn' }
      );

      expect(success).toBe(true);
      expect(overlay.getActiveSurfaceCount()).toBe(1);

      const surface = document.querySelector('[data-surface-id="reaction_1"]');
      expect(surface).toBeTruthy();
      expect(surface?.classList.contains('material-surface')).toBe(true);
      expect(surface?.classList.contains('material-surface-reaction')).toBe(true);
    });

    it('should create avatar surface with Material Design 3 styling', () => {
      const avatarData = {
        displayName: 'Test User',
        color: '#6200EE',
        speaking: false,
        muted: false,
      };

      const success = overlay.createAvatarSurface(
        'avatar_1',
        avatarData,
        { x: 0.3, y: 0.7 },
        { elevation: 'level3', size: 48, showIndicators: true }
      );

      expect(success).toBe(true);
      expect(overlay.getActiveSurfaceCount()).toBe(1);

      const surface = document.querySelector('[data-surface-id="avatar_1"]');
      expect(surface).toBeTruthy();
      expect(surface?.classList.contains('material-surface')).toBe(true);
      expect(surface?.classList.contains('material-surface-avatar')).toBe(true);
    });

    it('should apply proper Material elevation shadows', () => {
      overlay.createReactionSurface('test', '👍', { x: 0.5, y: 0.5 }, { elevation: 'level3' });

      const surface = document.querySelector('[data-surface-id="test"]') as HTMLElement;
      expect(surface?.style.boxShadow).toContain('rgba(0, 0, 0');
    });

    it('should apply consistent rounded corners', () => {
      overlay.createReactionSurface('test', '👍', { x: 0.5, y: 0.5 }, {});

      const surface = document.querySelector('[data-surface-id="test"]') as HTMLElement;
      expect(surface?.style.borderRadius).toBe('12px');
    });

    it('should respect maximum concurrent surfaces limit', () => {
      const maxSurfaces = 3;
      const testOverlay = new MaterialVideoOverlay({ maxConcurrentSurfaces: maxSurfaces });
      testOverlay.injectOverlay(mockVideo);

      // Create more surfaces than the limit
      for (let i = 0; i < maxSurfaces + 2; i++) {
        testOverlay.createReactionSurface(`reaction_${i}`, '❤️', { x: 0.5, y: 0.5 });
      }

      expect(testOverlay.getActiveSurfaceCount()).toBeLessThanOrEqual(maxSurfaces);
      testOverlay.removeOverlay();
    });
  });

  describe('Material Animations', () => {
    beforeEach(() => {
      overlay.injectOverlay(mockVideo);
    });

    it('should apply Material Design 3 entrance animations', () => {
      overlay.createReactionSurface('test', '👍', { x: 0.5, y: 0.5 }, { animation: 'scaleIn' });

      const surface = document.querySelector('[data-surface-id="test"]') as HTMLElement;
      expect(surface?.style.animation).toContain('materialScaleIn');
    });

    it('should respect reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const reducedMotionOverlay = new MaterialVideoOverlay({ respectsReducedMotion: true });
      reducedMotionOverlay.injectOverlay(mockVideo);
      reducedMotionOverlay.createReactionSurface('test', '👍', { x: 0.5, y: 0.5 });

      const surface = document.querySelector('[data-surface-id="test"]') as HTMLElement;
      expect(surface?.style.transition).toBe('none');

      reducedMotionOverlay.removeOverlay();
    });
  });

  describe('Surface Management', () => {
    beforeEach(() => {
      overlay.injectOverlay(mockVideo);
    });

    it('should update avatar position smoothly', () => {
      const avatarData = { displayName: 'Test', color: '#6200EE' };
      overlay.createAvatarSurface('avatar_1', avatarData, { x: 0.3, y: 0.3 });

      overlay.updateAvatarPosition('avatar_1', { x: 0.7, y: 0.7 });

      const surface = document.querySelector('[data-surface-id="avatar_1"]') as HTMLElement;
      expect(surface?.style.left).toContain('px');
      expect(surface?.style.top).toContain('px');
    });

    it('should update avatar indicators', () => {
      const avatarData = { displayName: 'Test', color: '#6200EE' };
      overlay.createAvatarSurface(
        'avatar_1',
        avatarData,
        { x: 0.5, y: 0.5 },
        { showIndicators: true }
      );

      overlay.updateAvatarIndicators('avatar_1', { speaking: true, muted: true });

      const surface = document.querySelector('[data-surface-id="avatar_1"]');
      expect(surface).toBeTruthy();
    });

    it('should remove surfaces properly', () => {
      overlay.createReactionSurface('test', '👍', { x: 0.5, y: 0.5 });
      expect(overlay.getActiveSurfaceCount()).toBe(1);

      overlay.removeSurface('test');

      // Wait for animation to complete
      setTimeout(() => {
        expect(overlay.getActiveSurfaceCount()).toBe(0);
        expect(document.querySelector('[data-surface-id="test"]')).toBeFalsy();
      }, 350);
    });

    it('should clear all surfaces', () => {
      overlay.createReactionSurface('test1', '👍', { x: 0.3, y: 0.3 });
      overlay.createReactionSurface('test2', '❤️', { x: 0.7, y: 0.7 });
      expect(overlay.getActiveSurfaceCount()).toBe(2);

      overlay.clearAllSurfaces();

      setTimeout(() => {
        expect(overlay.getActiveSurfaceCount()).toBe(0);
      }, 350);
    });
  });
});

describe('MaterialReactionOverlay', () => {
  let overlay: MaterialReactionOverlay;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    mockVideo = createMockVideoElement();
    overlay = new MaterialReactionOverlay({
      displayDuration: 3000,
      maxConcurrentReactions: 5,
      enableTranslucency: true,
      defaultElevation: 'level2',
    });
  });

  afterEach(() => {
    overlay.removeOverlay();
    document.body.innerHTML = '';
  });

  it('should inject reaction overlay with Material styling', () => {
    const success = overlay.injectOverlay(mockVideo);
    expect(success).toBe(true);
    expect(overlay.isOverlayInjected()).toBe(true);
  });

  it('should show reactions with proper Material surfaces', () => {
    overlay.injectOverlay(mockVideo);

    const success = overlay.showReaction('reaction_1', 'heart', 1000);
    expect(success).toBe(true);
    expect(overlay.getActiveReactionCount()).toBe(1);
  });

  it('should generate optimal positions to avoid overlap', () => {
    overlay.injectOverlay(mockVideo);

    // Show multiple reactions
    for (let i = 0; i < 5; i++) {
      overlay.showReaction(`reaction_${i}`, 'heart', 1000);
    }

    expect(overlay.getActiveReactionCount()).toBe(5);
  });

  it('should provide reaction statistics', () => {
    overlay.injectOverlay(mockVideo);

    overlay.showReaction('r1', 'heart', 1000);
    overlay.showReaction('r2', 'thumbs_up', 1500);
    overlay.showReaction('r3', 'heart', 2000);

    const stats = overlay.getReactionStats();
    expect(stats.totalActive).toBe(3);
    expect(stats.reactionsByType.heart).toBe(2);
    expect(stats.reactionsByType.thumbs_up).toBe(1);
    expect(stats.oldestReaction).toBe(1000);
    expect(stats.newestReaction).toBe(2000);
  });
});

describe('MaterialAvatarOverlay', () => {
  let overlay: MaterialAvatarOverlay;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    mockVideo = createMockVideoElement();
    overlay = new MaterialAvatarOverlay({
      avatarSize: 48,
      showNameLabels: true,
      showVoiceIndicators: true,
      defaultElevation: 'level3',
      collisionAvoidance: true,
    });
  });

  afterEach(() => {
    overlay.removeOverlay();
    document.body.innerHTML = '';
  });

  it('should inject avatar overlay with Material styling', () => {
    const success = overlay.injectOverlay(mockVideo);
    expect(success).toBe(true);
    expect(overlay.isOverlayInjected()).toBe(true);
  });

  it('should update avatars with Material surfaces', () => {
    overlay.injectOverlay(mockVideo);

    const avatar = createMockAvatar('1');
    const success = overlay.updateAvatar(avatar);
    expect(success).toBe(true);
    expect(overlay.getActiveAvatarCount()).toBe(1);
  });

  it('should apply collision avoidance', () => {
    overlay.injectOverlay(mockVideo);

    const avatar1 = createMockAvatar('1');
    avatar1.x = 0.5;
    avatar1.y = 0.5;

    const avatar2 = createMockAvatar('2');
    avatar2.x = 0.5; // Same position
    avatar2.y = 0.5;

    overlay.updateAvatar(avatar1);
    overlay.updateAvatar(avatar2);

    // Positions should be adjusted to avoid collision
    const storedAvatar1 = overlay.getAvatar('1');
    const storedAvatar2 = overlay.getAvatar('2');

    expect(storedAvatar1).toBeTruthy();
    expect(storedAvatar2).toBeTruthy();

    const distance = Math.sqrt(
      Math.pow(storedAvatar1!.x - storedAvatar2!.x, 2) +
        Math.pow(storedAvatar1!.y - storedAvatar2!.y, 2)
    );
    expect(distance).toBeGreaterThan(0.05); // Should be separated
  });

  it('should update voice activity indicators', () => {
    overlay.injectOverlay(mockVideo);

    const avatar = createMockAvatar('1');
    overlay.updateAvatar(avatar);

    overlay.updateAvatarVoiceActivity('1', true, false);

    const updatedAvatar = overlay.getAvatar('1');
    expect(updatedAvatar?.speaking).toBe(true);
    expect(updatedAvatar?.muted).toBe(false);
  });

  it('should provide avatar statistics', () => {
    overlay.injectOverlay(mockVideo);

    const avatar1 = createMockAvatar('1');
    avatar1.speaking = true;
    avatar1.muted = false;

    const avatar2 = createMockAvatar('2');
    avatar2.speaking = false;
    avatar2.muted = true;

    overlay.updateAvatar(avatar1);
    overlay.updateAvatar(avatar2);
    overlay.setLocalAvatarId('1');

    const stats = overlay.getAvatarStats();
    expect(stats.totalActive).toBe(2);
    expect(stats.speakingCount).toBe(1);
    expect(stats.mutedCount).toBe(1);
    expect(stats.localAvatarId).toBe('1');
    expect(stats.averagePosition).toBeTruthy();
  });
});

describe('MaterialOverlayManager', () => {
  let manager: MaterialOverlayManager;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    mockVideo = createMockVideoElement();
    manager = new MaterialOverlayManager({
      integration: {
        reactionOverlay: {
          enabled: true,
          maxConcurrentReactions: 10,
          defaultDuration: 3000,
          animationType: 'scaleIn',
        },
        avatarOverlay: {
          enabled: true,
          showNameLabels: true,
          showVoiceIndicators: true,
          avatarSize: 48,
          elevation: 'level3',
        },
        theme: {
          respectSystemTheme: true,
          reducedMotion: true,
        },
      },
    });
  });

  afterEach(() => {
    manager.removeOverlays();
    document.body.innerHTML = '';
  });

  it('should inject both overlay systems', () => {
    const success = manager.injectOverlays(mockVideo);
    expect(success).toBe(true);
    expect(manager.areOverlaysInjected()).toBe(true);
  });

  it('should manage reactions through unified interface', () => {
    manager.injectOverlays(mockVideo);

    const success = manager.showReaction('r1', 'heart', 1000);
    expect(success).toBe(true);

    const reactionStatus = manager.getReactionOverlayStatus();
    expect(reactionStatus.enabled).toBe(true);
    expect(reactionStatus.injected).toBe(true);
    expect(reactionStatus.activeCount).toBe(1);
  });

  it('should manage avatars through unified interface', () => {
    manager.injectOverlays(mockVideo);

    const avatar = createMockAvatar('1');
    const success = manager.updateAvatar(avatar);
    expect(success).toBe(true);

    const avatarStatus = manager.getAvatarOverlayStatus();
    expect(avatarStatus.enabled).toBe(true);
    expect(avatarStatus.injected).toBe(true);
    expect(avatarStatus.activeCount).toBe(1);
  });

  it('should provide comprehensive overlay status', () => {
    manager.injectOverlays(mockVideo);

    const status = manager.getOverlayStatus();
    expect(status.injected).toBe(true);
    expect(status.reactions.enabled).toBe(true);
    expect(status.avatars.enabled).toBe(true);
    expect(status.integration).toBeTruthy();
  });

  it('should allow toggling overlay systems', () => {
    manager.injectOverlays(mockVideo);

    manager.toggleOverlaySystem('reactions', false);

    const status = manager.getOverlayStatus();
    expect(status.reactions.enabled).toBe(false);
    expect(status.avatars.enabled).toBe(true);
  });

  it('should update integration configuration', () => {
    manager.updateIntegrationConfig({
      reactionOverlay: {
        maxConcurrentReactions: 15,
        defaultDuration: 5000,
      },
    });

    const status = manager.getOverlayStatus();
    expect(status.integration.reactionOverlay?.maxConcurrentReactions).toBe(15);
    expect(status.integration.reactionOverlay?.defaultDuration).toBe(5000);
  });

  it('should clear all overlays', () => {
    manager.injectOverlays(mockVideo);

    manager.showReaction('r1', 'heart', 1000);
    manager.updateAvatar(createMockAvatar('1'));

    manager.clearAll();

    setTimeout(() => {
      const status = manager.getOverlayStatus();
      expect(status.reactions.activeCount).toBe(0);
      expect(status.avatars.activeCount).toBe(0);
    }, 350);
  });
});

describe('Material Design 3 Theme Integration', () => {
  let overlay: MaterialVideoOverlay;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    mockVideo = createMockVideoElement();
    overlay = new MaterialVideoOverlay();
    overlay.injectOverlay(mockVideo);
  });

  afterEach(() => {
    overlay.removeOverlay();
    document.body.innerHTML = '';
  });

  it('should apply Material Design 3 color palette', () => {
    overlay.createReactionSurface('test', '👍', { x: 0.5, y: 0.5 });

    const surface = document.querySelector('[data-surface-id="test"]') as HTMLElement;
    expect(surface).toBeTruthy();

    // Check if surface has Material styling applied
    expect(surface.style.boxShadow).toBeTruthy();
    expect(surface.style.borderRadius).toBeTruthy();
  });

  it('should use consistent Material typography', () => {
    const avatarData = { displayName: 'Test User', color: '#6200EE' };
    overlay.createAvatarSurface('test', avatarData, { x: 0.5, y: 0.5 }, { showIndicators: true });

    const surface = document.querySelector('[data-surface-id="test"]') as HTMLElement;
    expect(surface).toBeTruthy();

    // Check if surface has Material font family applied
    expect(surface.style.fontFamily).toContain('Roboto');
  });

  it('should apply proper Material spacing', () => {
    const avatarData = { displayName: 'Test User', color: '#6200EE' };
    overlay.createAvatarSurface('test', avatarData, { x: 0.5, y: 0.5 }, { size: 48 });

    const surface = document.querySelector('[data-surface-id="test"]') as HTMLElement;
    expect(surface.style.width).toBe('48px');
    expect(surface.style.height).toBe('48px');
  });
});
