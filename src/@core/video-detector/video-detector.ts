/**
 * Video detection and selection system with MutationObserver
 */

import {
  VideoElement,
  VideoDetectionResult,
  VideoDetectorConfig,
  DetectionHeuristics,
  PlatformPlayer,
} from './types';
import { getPlatformPlayer, PLATFORM_PLAYERS } from './platform-players';
import { RetryManager } from './retry-logic';

export class VideoDetector {
  private observer: MutationObserver | null = null;
  private detectedVideos: Set<VideoElement> = new Set();
  private selectedVideo: VideoElement | null = null;
  private retryManager: RetryManager;
  private platformPlayer: PlatformPlayer;
  private config: VideoDetectorConfig;
  private heuristics: DetectionHeuristics;
  private pollInterval: number | null = null;
  private hotkeyListener: ((event: KeyboardEvent) => void) | null = null;
  private isActive: boolean = false;
  private rightClickListener: ((event: MouseEvent) => void) | null = null;

  constructor(
    config: Partial<VideoDetectorConfig> = {},
    heuristics: Partial<DetectionHeuristics> = {}
  ) {
    this.config = {
      retryAttempts: 5,
      retryDelay: 1000,
      maxRetryDelay: 30000,
      aspectRatioThreshold: 1.0,
      recentPlayThreshold: 5000,
      ...config,
    };

    this.heuristics = {
      prioritizePlayingVideos: true,
      considerRecentlyPlayed: true,
      fallbackToLargestAspectRatio: true,
      recentPlayTimeThreshold: 5000,
      ...heuristics,
    };

    this.retryManager = new RetryManager(
      this.config.retryAttempts,
      this.config.retryDelay,
      this.config.maxRetryDelay
    );

    this.platformPlayer = getPlatformPlayer(window.location.hostname);
    this.setupHotkeyListener();
  }

  /**
   * Start video detection using MutationObserver (only when activated)
   */
  startDetection(): Promise<VideoDetectionResult> {
    if (this.isActive) {
      console.warn('Video detection is already active');
      return Promise.resolve(this.getDetectionResult());
    }

    console.log(
      `Starting on-demand video detection on ${window.location.hostname} using ${this.platformPlayer.name} player`
    );

    this.isActive = true;

    return new Promise((resolve, reject) => {
      try {
        // Initial detection attempt
        const videos = this.detectVideos();
        const selectedVideo = this.selectPrimaryVideo();

        if (selectedVideo) {
          console.log('Video detected successfully on first attempt');
          resolve({
            success: true,
            video: selectedVideo,
            method: 'automatic',
            error: undefined,
            fallbackAvailable: false,
          });
          return;
        }

        // Set up MutationObserver for dynamic content only if no video found initially
        if (!selectedVideo) {
          this.observer = new MutationObserver((mutations) => {
            if (!this.isActive) return;

            let shouldRedetect = false;

            for (const mutation of mutations) {
              if (mutation.type === 'childList') {
                // Check if any added nodes contain video elements
                Array.from(mutation.addedNodes).forEach((node) => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;
                    if (element.tagName === 'VIDEO' || element.querySelector('video')) {
                      shouldRedetect = true;
                    }
                  }
                });
              }
            }

            if (shouldRedetect) {
              const newVideos = this.detectVideos();
              const newSelectedVideo = this.selectPrimaryVideo();
              if (newSelectedVideo && !this.selectedVideo) {
                console.log('Video detected via MutationObserver');
                resolve({
                  success: true,
                  video: newSelectedVideo,
                  method: 'automatic',
                  error: undefined,
                  fallbackAvailable: false,
                });
              }
            }
          });

          this.observer.observe(document.body, {
            childList: true,
            subtree: true,
          });
        }

        // Optional polling fallback if configured and no video found initially
        if (!selectedVideo && this.config.pollInterval && this.config.pollInterval > 0) {
          this.startPolling();
        }

        // Wait a bit for dynamic content, then try fallback if no video found
        if (!selectedVideo) {
          setTimeout(() => {
            if (!this.selectedVideo) {
              console.log('Automatic detection failed, enabling right-click fallback');
              this.enableRightClickFallback();
              resolve({
                success: false,
                video: undefined,
                method: 'automatic',
                error:
                  'No video detected automatically. Please right-click where the video should be.',
                fallbackAvailable: true,
              });
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error starting video detection:', error);
        this.isActive = false;
        reject({
          success: false,
          video: undefined,
          method: 'automatic',
          error: error instanceof Error ? error.message : 'Detection failed',
          fallbackAvailable: false,
        });
      }
    });
  }

  /**
   * Stop video detection and cleanup
   */
  stopDetection(): void {
    this.isActive = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.retryManager.cancel();
    this.removeHotkeyListener();
    this.removeRightClickListener();
    this.detectedVideos.clear();
    this.selectedVideo = null;
  }

  /**
   * Detect all video elements on the page
   */
  detectVideos(): VideoElement[] {
    try {
      const videos: VideoElement[] = [];

      // Try platform-specific detection first
      const platformVideo = this.platformPlayer.getVideo();
      if (platformVideo) {
        videos.push(platformVideo);
      }

      // Fallback to generic detection
      const allVideos = document.querySelectorAll('video') as NodeListOf<VideoElement>;
      Array.from(allVideos).forEach((video) => {
        if (!videos.includes(video)) {
          videos.push(video);
        }
      });

      // Handle cross-origin limitations
      const accessibleVideos = videos.filter((video) => this.canAccessVideo(video));

      if (accessibleVideos.length === 0 && videos.length > 0) {
        this.handleCrossOriginLimitations();
        return [];
      }

      // Update detected videos set
      this.detectedVideos.clear();
      accessibleVideos.forEach((video) => {
        this.attachVideoListeners(video);
        this.detectedVideos.add(video);
      });

      console.log(`Detected ${accessibleVideos.length} accessible videos`);
      return accessibleVideos;
    } catch (error) {
      console.error('Error detecting videos:', error);
      return [];
    }
  }

  /**
   * Select primary video using heuristics
   */
  selectPrimaryVideo(): VideoElement | null {
    const videos = Array.from(this.detectedVideos);
    if (videos.length === 0) {
      return null;
    }

    if (videos.length === 1) {
      this.selectedVideo = videos[0];
      return this.selectedVideo;
    }

    // Apply selection heuristics
    const results: VideoDetectionResult[] = videos.map((video) => {
      return this.evaluateVideo(video);
    });

    // Sort by confidence (highest first)
    results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    const bestResult = results[0];
    this.selectedVideo = bestResult?.video || null;

    console.log(`Selected video with confidence ${bestResult?.confidence} (${bestResult?.source})`);
    return this.selectedVideo;
  }

  /**
   * Get currently selected video
   */
  getSelectedVideo(): VideoElement | null {
    return this.selectedVideo;
  }

  /**
   * Manually select a specific video (hotkey override)
   */
  selectVideo(video: VideoElement): void {
    if (this.detectedVideos.has(video)) {
      this.selectedVideo = video;
      console.log('Manually selected video');
    } else {
      console.warn('Cannot select video that was not detected');
    }
  }

  /**
   * Retry video detection with exponential backoff
   */
  retryDetection(): void {
    this.retryManager.retryWithCallback(
      () => {
        const videos = this.detectVideos();
        if (videos.length === 0) {
          throw new Error('No videos detected');
        }
        return videos;
      },
      (videos) => {
        console.log(`Retry successful: detected ${videos.length} videos`);
        this.selectPrimaryVideo();
      },
      (error) => {
        console.error('Video detection retry failed:', error);
        this.handleCrossOriginLimitations();
      }
    );
  }

  /**
   * Evaluate video using heuristics
   */
  private evaluateVideo(video: VideoElement): VideoDetectionResult {
    let confidence = 0;
    let source: VideoDetectionResult['source'] = 'aspect-ratio';

    // Heuristic 1: Currently playing videos (highest priority)
    if (this.heuristics.prioritizePlayingVideos && !video.paused && video.currentTime > 0) {
      confidence += 100;
      source = 'playing';
    }

    // Heuristic 2: Recently played videos
    if (this.heuristics.considerRecentlyPlayed && video._lastPlayTime) {
      const timeSincePlay = Date.now() - video._lastPlayTime;
      if (timeSincePlay < this.heuristics.recentPlayTimeThreshold) {
        confidence += 50;
        if (source === 'aspect-ratio') {
          source = 'recent';
        }
      }
    }

    // Heuristic 3: Largest aspect ratio (fallback)
    if (this.heuristics.fallbackToLargestAspectRatio) {
      const aspectRatio = video.videoWidth / video.videoHeight || 0;
      video._aspectRatio = aspectRatio;

      if (aspectRatio > this.config.aspectRatioThreshold) {
        confidence += aspectRatio * 10; // Scale by aspect ratio
      }
    }

    // Bonus for videos with duration (not live streams)
    if (video.duration && isFinite(video.duration)) {
      confidence += 10;
    }

    // Bonus for videos that are visible
    if (this.isVideoVisible(video)) {
      confidence += 20;
    }

    return {
      success: true,
      video,
      method: 'automatic',
      confidence,
      source,
      platform: this.platformPlayer.name,
      fallbackAvailable: false,
    };
  }

  /**
   * Check if video element is accessible (not blocked by cross-origin)
   */
  private canAccessVideo(video: VideoElement): boolean {
    try {
      // Try to access video properties
      const _ = video.currentTime;
      const __ = video.duration;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if video is visible in viewport
   */
  private isVideoVisible(video: VideoElement): boolean {
    const rect = video.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
  }

  /**
   * Attach event listeners to video element
   */
  private attachVideoListeners(video: VideoElement): void {
    // Track when video starts playing
    const playHandler = () => {
      video._lastPlayTime = Date.now();
    };

    // Remove existing listeners to avoid duplicates
    video.removeEventListener('play', playHandler);
    video.addEventListener('play', playHandler);

    // Generate unique ID for tracking
    if (!video._watchPartyId) {
      video._watchPartyId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Handle cross-origin iframe limitations
   */
  private handleCrossOriginLimitations(): void {
    console.warn('Cross-origin limitations detected. Video access may be restricted.');

    // Check if we're in an iframe
    if (window !== window.top) {
      console.log('Running in iframe - cross-origin restrictions may apply');
    }

    // Display fallback message to user (this would be implemented in UI layer)
    this.showFallbackMessage();
  }

  /**
   * Show fallback message for cross-origin limitations
   */
  private showFallbackMessage(): void {
    // This would typically create a UI overlay
    console.log('FALLBACK: Please open the video page in the same frame for full functionality');
  }

  /**
   * Start optional polling fallback
   */
  private startPolling(): void {
    if (this.config.pollInterval) {
      this.pollInterval = window.setInterval(() => {
        this.detectVideos();
      }, this.config.pollInterval);
    }
  }

  /**
   * Setup hotkey listener for manual video selection
   */
  private setupHotkeyListener(): void {
    this.hotkeyListener = (event: KeyboardEvent) => {
      // Ctrl+Shift+V to cycle through detected videos
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        this.cycleVideoSelection();
      }

      // Ctrl+Shift+R to retry detection
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        this.retryDetection();
      }
    };

    document.addEventListener('keydown', this.hotkeyListener);
  }

  /**
   * Remove hotkey listener
   */
  private removeHotkeyListener(): void {
    if (this.hotkeyListener) {
      document.removeEventListener('keydown', this.hotkeyListener);
      this.hotkeyListener = null;
    }
  }

  /**
   * Cycle through detected videos for manual selection
   */
  private cycleVideoSelection(): void {
    const videos = Array.from(this.detectedVideos);
    if (videos.length === 0) {
      console.log('No videos to cycle through');
      return;
    }

    const currentIndex = this.selectedVideo ? videos.indexOf(this.selectedVideo) : -1;
    const nextIndex = (currentIndex + 1) % videos.length;

    this.selectedVideo = videos[nextIndex];
    console.log(`Manually selected video ${nextIndex + 1}/${videos.length}`);
  }

  /**
   * Enable right-click fallback detection mechanism
   */
  enableRightClickFallback(): void {
    if (this.rightClickListener) {
      return; // Already enabled
    }

    console.log('Enabling right-click fallback detection');

    this.rightClickListener = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const clickedElement = event.target as HTMLElement;
      console.log('Right-click detected, searching for video from clicked element');

      const foundVideo = this.handleRightClick(clickedElement);
      if (foundVideo) {
        console.log('Video found via right-click fallback');
        this.selectedVideo = foundVideo;
        this.attachVideoListeners(foundVideo);
        this.detectedVideos.add(foundVideo);
        this.removeRightClickListener();

        // Notify that video was found
        this.notifyVideoFound(foundVideo, 'right-click');
      } else {
        console.warn('No video found via right-click fallback');
        this.showDetectionFailedError();
      }
    };

    document.addEventListener('contextmenu', this.rightClickListener, true);
    console.log(
      'Right-click listener enabled. Right-click where the video should be to detect it.'
    );
  }

  /**
   * Remove right-click listener
   */
  private removeRightClickListener(): void {
    if (this.rightClickListener) {
      document.removeEventListener('contextmenu', this.rightClickListener, true);
      this.rightClickListener = null;
      console.log('Right-click listener removed');
    }
  }

  /**
   * Handle right-click detection with parent element traversal
   */
  handleRightClick(element: HTMLElement): VideoElement | null {
    // First check if the clicked element is a video
    if (element.tagName === 'VIDEO') {
      return element as VideoElement;
    }

    // Check element.children for video tags
    const childVideos = element.querySelectorAll('video');
    if (childVideos.length > 0) {
      return childVideos[0] as VideoElement;
    }

    // Recursively check parent elements up to 3 levels
    return this.traverseParentElements(element, 3);
  }

  /**
   * Traverse parent elements looking for videos
   */
  traverseParentElements(element: HTMLElement, maxLevels: number): VideoElement | null {
    let currentElement = element.parentElement;
    let level = 0;

    while (currentElement && level < maxLevels) {
      // Check if parent element contains video
      const videos = currentElement.querySelectorAll('video');
      if (videos.length > 0) {
        // Return the first accessible video
        for (const video of Array.from(videos)) {
          if (this.canAccessVideo(video as VideoElement)) {
            return video as VideoElement;
          }
        }
      }

      currentElement = currentElement.parentElement;
      level++;
    }

    return null;
  }

  /**
   * Show detection failed error message
   */
  showDetectionFailedError(): void {
    console.error('Video capturing failed - no video element could be detected');

    // Create a temporary error overlay
    const errorOverlay = document.createElement('div');
    errorOverlay.id = 'watch-party-detection-error';
    errorOverlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      word-wrap: break-word;
    `;
    errorOverlay.textContent = 'Video capturing failed';

    // Remove any existing error overlay
    const existingOverlay = document.getElementById('watch-party-detection-error');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    document.body.appendChild(errorOverlay);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorOverlay.parentNode) {
        errorOverlay.remove();
      }
    }, 5000);
  }

  /**
   * Get current detection result
   */
  private getDetectionResult(): VideoDetectionResult {
    if (this.selectedVideo) {
      return {
        success: true,
        video: this.selectedVideo,
        method: 'automatic',
        error: undefined,
        fallbackAvailable: false,
      };
    } else {
      return {
        success: false,
        video: undefined,
        method: 'automatic',
        error: 'No video detected',
        fallbackAvailable: true,
      };
    }
  }

  /**
   * Notify when video is found (placeholder for callback)
   */
  private notifyVideoFound(video: VideoElement, method: 'automatic' | 'right-click'): void {
    // This would typically notify the content script or background script
    console.log(`Video found via ${method}:`, video);

    // Dispatch custom event for content script to listen to
    const event = new CustomEvent('watchPartyVideoDetected', {
      detail: {
        video,
        method,
        videoId: video._watchPartyId,
      },
    });
    document.dispatchEvent(event);
  }

  /**
   * Check if detector is currently active
   */
  isDetectionActive(): boolean {
    return this.isActive;
  }
}
