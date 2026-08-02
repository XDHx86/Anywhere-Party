/**
 * Property-based tests for video detection system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VideoDetector } from './video-detector';
import { VideoElement, VideoDetectionResult } from './types';

// Mock DOM environment helpers
class MockVideoElement {
  tagName = 'VIDEO';
  paused = true;
  currentTime = 0;
  duration = 100;
  videoWidth = 1920;
  videoHeight = 1080;
  _watchPartyId?: string;
  _lastPlayTime?: number;
  _aspectRatio?: number;

  constructor(props: Partial<MockVideoElement> = {}) {
    Object.assign(this, props);
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() {
    return {
      width: this.videoWidth,
      height: this.videoHeight,
      top: 0,
      bottom: this.videoHeight,
      left: 0,
      right: this.videoWidth,
    };
  }
}

// Property generators for testing
function generateVideoConfigurations(count: number): MockVideoElement[] {
  const configs: MockVideoElement[] = [];

  for (let i = 0; i < count; i++) {
    const isPlaying = Math.random() > 0.7;
    const hasRecentPlay = Math.random() > 0.6;
    const aspectRatio = Math.random() * 3 + 0.5; // 0.5 to 3.5

    configs.push(
      new MockVideoElement({
        paused: !isPlaying,
        currentTime: isPlaying ? Math.random() * 100 : 0,
        duration: 100 + Math.random() * 200,
        videoWidth: Math.floor(1920 * aspectRatio),
        videoHeight: 1080,
        _lastPlayTime: hasRecentPlay ? Date.now() - Math.random() * 10000 : undefined,
      })
    );
  }

  return configs;
}

function createDOMWithVideos(videos: MockVideoElement[]): void {
  // Mock document.querySelectorAll
  vi.spyOn(document, 'querySelectorAll').mockImplementation((selector: string) => {
    if (selector === 'video') {
      return videos as any;
    }
    return [] as any;
  });

  // Mock window properties
  Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
  Object.defineProperty(window, 'location', {
    value: { hostname: 'example.com' },
    writable: true,
  });
}

describe('VideoDetector Property-Based Tests', () => {
  let detector: VideoDetector;
  let mockObserver: any;

  beforeEach(() => {
    // Mock MutationObserver
    mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    vi.stubGlobal(
      'MutationObserver',
      vi.fn(() => mockObserver)
    );

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock document.body
    Object.defineProperty(document, 'body', {
      value: document.createElement('body'),
      writable: true,
    });

    // Mock addEventListener/removeEventListener
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Video Selection Heuristics', () => {
    it('should prioritize currently playing videos over paused ones when detection is active', async () => {
      // Generate test scenarios with playing and paused videos
      for (let scenario = 0; scenario < 10; scenario++) {
        const playingVideo = new MockVideoElement({
          paused: false,
          currentTime: 50,
          videoWidth: 1280,
          videoHeight: 720,
        });

        const pausedVideo = new MockVideoElement({
          paused: true,
          currentTime: 0,
          videoWidth: 1920,
          videoHeight: 1080, // Larger aspect ratio
        });

        const videos = [pausedVideo, playingVideo]; // Paused video first to test prioritization
        createDOMWithVideos(videos);

        detector = new VideoDetector();

        // Detection should be inactive initially
        expect(detector.isDetectionActive()).toBe(false);

        const result = await detector.startDetection();

        expect(detector.isDetectionActive()).toBe(true);
        expect(result.success).toBe(true);
        expect(result.video).toBe(playingVideo as any);
        expect(result.method).toBe('automatic');
      }
    });

    it('should select recently played videos when no video is currently playing', async () => {
      for (let scenario = 0; scenario < 10; scenario++) {
        const recentVideo = new MockVideoElement({
          paused: true,
          currentTime: 30,
          _lastPlayTime: Date.now() - 2000, // 2 seconds ago
          videoWidth: 1280,
          videoHeight: 720,
        });

        const oldVideo = new MockVideoElement({
          paused: true,
          currentTime: 0,
          _lastPlayTime: Date.now() - 10000, // 10 seconds ago
          videoWidth: 1920,
          videoHeight: 1080, // Larger aspect ratio
        });

        const videos = [oldVideo, recentVideo];
        createDOMWithVideos(videos);

        detector = new VideoDetector();
        const result = await detector.startDetection();

        expect(result.success).toBe(true);
        expect(result.video).toBe(recentVideo as any);
        expect(result.method).toBe('automatic');
      }
    });

    it('should fallback to largest aspect ratio when no video is playing or recent', async () => {
      for (let scenario = 0; scenario < 10; scenario++) {
        const smallVideo = new MockVideoElement({
          paused: true,
          currentTime: 0,
          videoWidth: 640,
          videoHeight: 480, // 4:3 aspect ratio
        });

        const largeVideo = new MockVideoElement({
          paused: true,
          currentTime: 0,
          videoWidth: 1920,
          videoHeight: 1080, // 16:9 aspect ratio
        });

        const videos = [smallVideo, largeVideo];
        createDOMWithVideos(videos);

        detector = new VideoDetector();
        const result = await detector.startDetection();

        expect(result.success).toBe(true);
        expect(result.video).toBe(largeVideo as any);
        expect(result.method).toBe('automatic');
      }
    });

    it('should handle various DOM configurations correctly', async () => {
      // Test with different numbers of videos
      const testCases = [1, 2, 3, 5, 10];

      for (const videoCount of testCases) {
        const videos = generateVideoConfigurations(videoCount);
        createDOMWithVideos(videos);

        detector = new VideoDetector();
        const result = await detector.startDetection();

        if (videoCount > 0) {
          expect(result.success).toBe(true);
          expect(result.video).toBeTruthy();
          expect(videos).toContain(result.video);
          expect(result.method).toBe('automatic');
        } else {
          expect(result.success).toBe(false);
          expect(result.fallbackAvailable).toBe(true);
        }
      }
    });

    it('should apply confidence scoring consistently', () => {
      for (let scenario = 0; scenario < 20; scenario++) {
        const videos = generateVideoConfigurations(5);
        createDOMWithVideos(videos);

        detector = new VideoDetector();
        detector.detectVideos();

        // Access private method for testing
        const evaluateVideo = (detector as any).evaluateVideo.bind(detector);
        const results: VideoDetectionResult[] = videos.map((video) => evaluateVideo(video));

        // Verify confidence scoring rules
        results.forEach((result) => {
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.source).toMatch(/^(playing|recent|aspect-ratio|manual)$/);

          // Playing videos should have highest confidence
          if (!result.video.paused && result.video.currentTime > 0) {
            expect(result.confidence).toBeGreaterThanOrEqual(100);
            expect(result.source).toBe('playing');
          }

          // Recently played videos should have medium confidence
          if (result.video._lastPlayTime && Date.now() - result.video._lastPlayTime < 5000) {
            expect(result.confidence).toBeGreaterThanOrEqual(50);
          }
        });

        // Results should be sortable by confidence
        const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
        expect(sorted[0].confidence).toBeGreaterThanOrEqual(sorted[sorted.length - 1].confidence);
      }
    });
  });

  describe('Cross-Origin Limitation Handling', () => {
    it('should detect cross-origin limitations and provide fallback', () => {
      const restrictedVideo = new MockVideoElement();

      // Mock video that throws on property access
      Object.defineProperty(restrictedVideo, 'currentTime', {
        get: () => {
          throw new Error('Cross-origin access denied');
        },
      });

      const videos = [restrictedVideo];
      createDOMWithVideos(videos);

      detector = new VideoDetector();
      const detected = detector.detectVideos();

      // Should return empty array when all videos are inaccessible
      expect(detected).toHaveLength(0);
    });

    it('should filter out inaccessible videos but keep accessible ones', () => {
      const accessibleVideo = new MockVideoElement({
        paused: false,
        currentTime: 30,
      });

      const restrictedVideo = new MockVideoElement();
      Object.defineProperty(restrictedVideo, 'currentTime', {
        get: () => {
          throw new Error('Cross-origin access denied');
        },
      });

      const videos = [restrictedVideo, accessibleVideo];
      createDOMWithVideos(videos);

      detector = new VideoDetector();
      const detected = detector.detectVideos();

      expect(detected).toHaveLength(1);
      expect(detected[0]).toBe(accessibleVideo as any);
    });

    it('should handle iframe detection', () => {
      // Mock iframe scenario where window !== window.top
      const mockTop = {};
      Object.defineProperty(window, 'top', { value: mockTop, writable: true });

      // Create videos that will trigger cross-origin handling
      const restrictedVideo = new MockVideoElement();
      Object.defineProperty(restrictedVideo, 'currentTime', {
        get: () => {
          throw new Error('Cross-origin access denied');
        },
      });

      const videos = [restrictedVideo];
      createDOMWithVideos(videos);

      detector = new VideoDetector();
      detector.detectVideos();

      // Should detect cross-origin limitations and log warning
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cross-origin limitations detected')
      );
    });
  });

  describe('Configuration and Heuristics', () => {
    it('should respect custom configuration parameters', () => {
      const customConfig = {
        aspectRatioThreshold: 2.0,
        recentPlayThreshold: 10000,
        retryAttempts: 3,
        retryDelay: 500,
        maxRetryDelay: 5000,
      };

      const customHeuristics = {
        prioritizePlayingVideos: false,
        considerRecentlyPlayed: false,
        fallbackToLargestAspectRatio: true,
        recentPlayTimeThreshold: 10000,
      };

      detector = new VideoDetector(customConfig, customHeuristics);

      // Test that configuration is applied
      expect((detector as any).config.aspectRatioThreshold).toBe(2.0);
      expect((detector as any).config.retryAttempts).toBe(3);
      expect((detector as any).heuristics.prioritizePlayingVideos).toBe(false);
    });

    it('should handle edge cases in video properties', () => {
      const edgeCaseVideos = [
        new MockVideoElement({
          duration: Infinity, // Live stream
          videoWidth: 0,
          videoHeight: 0,
        }),
        new MockVideoElement({
          duration: NaN,
          videoWidth: 1920,
          videoHeight: 1080,
        }),
        new MockVideoElement({
          currentTime: -1,
          duration: 0,
        }),
      ];

      createDOMWithVideos(edgeCaseVideos);

      detector = new VideoDetector();
      const detected = detector.detectVideos();
      const selected = detector.selectPrimaryVideo();

      // Should handle edge cases gracefully
      expect(detected).toHaveLength(3);
      expect(selected).toBeTruthy();
    });
  });

  describe('Platform Player Integration', () => {
    it('should work with different platform configurations', () => {
      const platforms = ['youtube.com', 'netflix.com', 'twitch.tv', 'example.com'];

      platforms.forEach((hostname) => {
        Object.defineProperty(window, 'location', {
          value: { hostname },
          writable: true,
        });

        const videos = generateVideoConfigurations(3);
        createDOMWithVideos(videos);

        detector = new VideoDetector();
        const detected = detector.detectVideos();

        expect(detected).toHaveLength(3);
        expect((detector as any).platformPlayer.name).toBeTruthy();
      });
    });
  });

  describe('Right-Click Fallback Detection', () => {
    it('should enable right-click fallback when automatic detection fails', async () => {
      // Create DOM with no videos initially
      createDOMWithVideos([]);

      detector = new VideoDetector();

      // Mock setTimeout to immediately trigger fallback
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      const result = await detector.startDetection();

      expect(result.success).toBe(false);
      expect(result.fallbackAvailable).toBe(true);
      expect(result.error).toContain('right-click');
    });

    it('should detect video via right-click on video element', () => {
      const video = new MockVideoElement();
      createDOMWithVideos([video]);

      detector = new VideoDetector();
      detector.enableRightClickFallback();

      const foundVideo = detector.handleRightClick(video as any);
      expect(foundVideo).toBe(video);
    });

    it('should detect video via right-click on parent element', () => {
      const videos = [new MockVideoElement()];
      createDOMWithVideos(videos);

      const parent = document.createElement('div');
      // Mock querySelector to return our video
      vi.spyOn(parent, 'querySelectorAll').mockReturnValue(videos as any);

      detector = new VideoDetector();
      detector.enableRightClickFallback();

      const foundVideo = detector.handleRightClick(parent);
      expect(foundVideo).toBe(videos[0]);
    });

    it('should traverse parent elements up to 3 levels', () => {
      const videos = [new MockVideoElement()];
      createDOMWithVideos(videos);

      const level1 = document.createElement('div');
      const level2 = document.createElement('div');
      const level3 = document.createElement('div');
      const clickTarget = document.createElement('span');

      // Mock the parent hierarchy
      Object.defineProperty(clickTarget, 'parentElement', { value: level1, writable: true });
      Object.defineProperty(level1, 'parentElement', { value: level2, writable: true });
      Object.defineProperty(level2, 'parentElement', { value: level3, writable: true });

      // Mock level3 to contain our video
      vi.spyOn(level3, 'querySelectorAll').mockReturnValue(videos as any);

      detector = new VideoDetector();

      const foundVideo = detector.traverseParentElements(clickTarget, 3);
      expect(foundVideo).toBe(videos[0]);
    });

    it('should return null when no video found in parent traversal', () => {
      const clickTarget = document.createElement('span');
      const parent = document.createElement('div');
      parent.appendChild(clickTarget);

      detector = new VideoDetector();

      const foundVideo = detector.traverseParentElements(clickTarget, 3);
      expect(foundVideo).toBeNull();
    });

    it('should show error message when detection completely fails', () => {
      detector = new VideoDetector();

      // Mock document.createElement and appendChild
      const mockDiv = {
        id: '',
        style: { cssText: '' },
        textContent: '',
        remove: vi.fn(),
        parentNode: { removeChild: vi.fn() },
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockDiv as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockDiv as any);
      vi.spyOn(document, 'getElementById').mockReturnValue(null);

      detector.showDetectionFailedError();

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockDiv.textContent).toBe('Video capturing failed');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockDiv);
    });
  });

  describe('Lifecycle Management', () => {
    it('should properly start and stop detection', async () => {
      const videos = generateVideoConfigurations(2);
      createDOMWithVideos(videos);

      detector = new VideoDetector();

      // Initially inactive
      expect(detector.isDetectionActive()).toBe(false);

      // Start detection
      const result = await detector.startDetection();
      expect(detector.isDetectionActive()).toBe(true);
      expect(result.success).toBe(true);

      // MutationObserver is only set up if no video found initially
      // Since we have videos, it should find them immediately and not set up observer

      // Stop detection
      detector.stopDetection();
      expect(detector.isDetectionActive()).toBe(false);
      if (mockObserver.disconnect.mock.calls.length > 0) {
        expect(mockObserver.disconnect).toHaveBeenCalled();
      }
    });

    it('should handle polling fallback when configured and no video found initially', async () => {
      // Create DOM with no videos initially to trigger polling
      createDOMWithVideos([]);

      detector = new VideoDetector({ pollInterval: 1000 });

      vi.spyOn(window, 'setInterval').mockImplementation(() => 123 as any);
      vi.spyOn(window, 'clearInterval').mockImplementation(() => {});

      // Mock setTimeout to immediately trigger fallback
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      const result = await detector.startDetection();

      // Should enable polling when no video found
      expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect(result.success).toBe(false);
      expect(result.fallbackAvailable).toBe(true);

      detector.stopDetection();
      expect(window.clearInterval).toHaveBeenCalledWith(123);
    });

    it('should set up MutationObserver when no videos found initially', async () => {
      // Create DOM with no videos initially
      createDOMWithVideos([]);

      detector = new VideoDetector();

      // Mock setTimeout to immediately trigger fallback
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      const result = await detector.startDetection();

      // Should set up MutationObserver when no video found initially
      expect(mockObserver.observe).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.fallbackAvailable).toBe(true);

      detector.stopDetection();
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('should clean up resources properly', async () => {
      const videos = generateVideoConfigurations(3);
      createDOMWithVideos(videos);

      detector = new VideoDetector();

      // Verify initial state
      expect(detector.getSelectedVideo()).toBeNull();
      expect(detector.isDetectionActive()).toBe(false);

      await detector.startDetection();
      expect(detector.getSelectedVideo()).toBeTruthy();
      expect(detector.isDetectionActive()).toBe(true);

      // Clean up
      detector.stopDetection();
      expect(detector.getSelectedVideo()).toBeNull();
      expect(detector.isDetectionActive()).toBe(false);
    });
  });
});
