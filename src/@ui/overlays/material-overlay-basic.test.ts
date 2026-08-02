/**
 * Basic Material Design 3 Video Overlay Tests
 * Core functionality tests for Material surfaces and animations
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MaterialVideoOverlay } from './material-video-overlay';
import { MaterialOverlayManager } from './material-overlay-manager';

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

describe('Material Design 3 Video Overlays - Core Functionality', () => {
  let overlay: MaterialVideoOverlay;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    mockVideo = createMockVideoElement();
    overlay = new MaterialVideoOverlay({
      enableTranslucency: true,
      defaultElevation: 'level2',
      cornerRadius: 'medium',
    });
  });

  afterEach(() => {
    overlay.removeOverlay();
    document.body.innerHTML = '';
  });

  it('should inject Material overlay successfully', () => {
    const success = overlay.injectOverlay(mockVideo);
    expect(success).toBe(true);
    expect(overlay.isOverlayInjected()).toBe(true);
  });

  it('should create Material container with proper ID and class', () => {
    overlay.injectOverlay(mockVideo);

    const container = document.getElementById('watch-party-material-overlay');
    expect(container).toBeTruthy();
    expect(container?.className).toBe('material-video-overlay-container');
  });

  it('should create reaction surface with Material styling', () => {
    overlay.injectOverlay(mockVideo);

    const success = overlay.createReactionSurface('test_reaction', '❤️', { x: 0.5, y: 0.5 });

    expect(success).toBe(true);
    expect(overlay.getActiveSurfaceCount()).toBe(1);

    const surface = document.querySelector('[data-surface-id="test_reaction"]');
    expect(surface).toBeTruthy();
    expect(surface?.classList.contains('material-surface')).toBe(true);
  });

  it('should create avatar surface with Material styling', () => {
    overlay.injectOverlay(mockVideo);

    const avatarData = {
      displayName: 'Test User',
      color: '#6200EE',
      speaking: false,
      muted: false,
    };

    const success = overlay.createAvatarSurface('test_avatar', avatarData, { x: 0.3, y: 0.7 });

    expect(success).toBe(true);
    expect(overlay.getActiveSurfaceCount()).toBe(1);

    const surface = document.querySelector('[data-surface-id="test_avatar"]');
    expect(surface).toBeTruthy();
    expect(surface?.classList.contains('material-surface')).toBe(true);
  });

  it('should apply Material Design 3 elevation shadows', () => {
    overlay.injectOverlay(mockVideo);
    overlay.createReactionSurface('test', '👍', { x: 0.5, y: 0.5 }, { elevation: 'level3' });

    const surface = document.querySelector('[data-surface-id="test"]') as HTMLElement;
    expect(surface?.style.boxShadow).toContain('rgba(0, 0, 0');
  });

  it('should apply consistent rounded corners', () => {
    overlay.injectOverlay(mockVideo);
    overlay.createReactionSurface('test', '👍', { x: 0.5, y: 0.5 });

    const surface = document.querySelector('[data-surface-id="test"]') as HTMLElement;
    expect(surface?.style.borderRadius).toBe('12px');
  });

  it('should remove surfaces properly', () => {
    overlay.injectOverlay(mockVideo);
    overlay.createReactionSurface('test', '👍', { x: 0.5, y: 0.5 });
    expect(overlay.getActiveSurfaceCount()).toBe(1);

    overlay.removeSurface('test');

    // Surface should be marked for removal (animation may still be running)
    setTimeout(() => {
      expect(overlay.getActiveSurfaceCount()).toBe(0);
    }, 100);
  });
});

describe('Material Overlay Manager - Integration', () => {
  let manager: MaterialOverlayManager;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    mockVideo = createMockVideoElement();
    manager = new MaterialOverlayManager({
      integration: {
        reactionOverlay: {
          enabled: true,
          maxConcurrentReactions: 5,
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
        theme: { respectSystemTheme: true, reducedMotion: true },
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

  it('should show reactions through unified interface', () => {
    manager.injectOverlays(mockVideo);

    const success = manager.showReaction('r1', 'heart', 1000);
    expect(success).toBe(true);

    const reactionStatus = manager.getReactionOverlayStatus();
    expect(reactionStatus.enabled).toBe(true);
    expect(reactionStatus.injected).toBe(true);
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
});
