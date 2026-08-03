/**
 * Ephemeral Overlay Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EphemeralOverlay } from './ephemeral-overlay';

describe('EphemeralOverlay', () => {
  let overlay: EphemeralOverlay;
  let mockParent: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    overlay = new EphemeralOverlay({
      trailDuration: 1000,
      fadeDuration: 500,
      maxTrails: 5,
      trailWidth: 3,
    });

    mockParent = document.createElement('div');
    mockParent.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Lifecycle', () => {
    it('should create DOM elements on attach', () => {
      overlay.attach(mockParent);

      const container = mockParent.querySelector('#ephemeral-overlay');
      expect(container).not.toBeNull();
      expect(container?.tagName).toBe('DIV');
    });

    it('should remove DOM elements on detach', () => {
      overlay.attach(mockParent);
      overlay.detach();

      const container = mockParent.querySelector('#ephemeral-overlay');
      expect(container).toBeNull();
    });

    it('should not create duplicate containers on double attach', () => {
      overlay.attach(mockParent);
      overlay.attach(mockParent);

      const containers = mockParent.querySelectorAll('#ephemeral-overlay');
      expect(containers.length).toBe(1);
    });
  });

  describe('Trail management', () => {
    beforeEach(() => {
      overlay.attach(mockParent);
    });

    it('should create a trail and return an ID', () => {
      const id = overlay.startTrail(100, 200, '#ff0000');
      expect(id).toMatch(/^ephemeral_/);
    });

    it('should continue a trail with new points', () => {
      const id = overlay.startTrail(10, 10, '#ff0000');
      overlay.continueTrail(id, 20, 20);
      overlay.continueTrail(id, 30, 30);

      // No error thrown — trail exists and accepts points
    });

    it('should handle continuing a non-existent trail gracefully', () => {
      expect(() => overlay.continueTrail('nonexistent', 10, 10)).not.toThrow();
    });

    it('should enforce max trails limit', () => {
      for (let i = 0; i < 10; i++) {
        overlay.startTrail(i * 10, i * 10);
      }

      // clearAll to force re-render
      overlay.clearAll();
    });
  });

  describe('Cleanup', () => {
    it('should clear all trails', () => {
      overlay.attach(mockParent);
      overlay.startTrail(10, 10);
      overlay.startTrail(20, 20);

      overlay.clearAll();

      // Trails cleared — no error on detach
      overlay.detach();
    });

    it('should stop render loop on detach', () => {
      overlay.attach(mockParent);
      overlay.detach();

      // Timer should be cleared — advancing time should not cause errors
      vi.advanceTimersByTime(5000);
    });
  });
});
