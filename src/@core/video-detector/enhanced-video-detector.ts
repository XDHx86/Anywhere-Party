/**
 * Enhanced Video Detector with On-Demand Detection and Right-Click Fallback
 * Fixes requirements 37 and 46: On-Demand Video Detection
 */

export interface VideoElement extends HTMLVideoElement {
  _watchPartyId?: string;
}

export interface VideoDetectionResult {
  success: boolean;
  video?: VideoElement;
  method: 'automatic' | 'right-click' | 'manual' | 'retry';
  error?: string;
  fallbackAvailable: boolean;
  retryCount: number;
  detectionTime: number;
}

export interface DetectionStatus {
  isActive: boolean;
  isListening: boolean;
  hasVideo: boolean;
  currentVideo?: VideoElement;
  lastDetectionAttempt?: Date;
  retryCount: number;
}

export class EnhancedVideoDetector {
  private isActive: boolean = false;
  private isListening: boolean = false;
  private selectedVideo: VideoElement | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private detectionStartTime: number = 0;
  private rightClickHandler: ((event: MouseEvent) => void) | null = null;
  private statusCallbacks: ((status: DetectionStatus) => void)[] = [];

  /**
   * Start video detection (only when user clicks "Start Room")
   */
  async startDetection(): Promise<VideoDetectionResult> {
    console.log('Starting on-demand video detection...');
    this.isActive = true;
    this.detectionStartTime = Date.now();
    this.retryCount = 0;
    this.notifyStatusChange();

    try {
      // First attempt: automatic detection
      const automaticResult = await this.attemptAutomaticDetection();

      if (automaticResult.success) {
        const video = automaticResult.video;
        if (!video) {
          throw new Error('Automatic detection succeeded but returned no video element');
        }
        this.selectedVideo = video;
        this.notifyStatusChange();
        return automaticResult;
      }

      // If automatic detection fails, enable right-click fallback
      console.log('Automatic detection failed, enabling right-click fallback...');
      this.enableRightClickFallback();

      return {
        success: false,
        method: 'automatic',
        error: automaticResult.error,
        fallbackAvailable: true,
        retryCount: this.retryCount,
        detectionTime: Date.now() - this.detectionStartTime,
      };
    } catch (error) {
      console.error('Video detection error:', error);
      return {
        success: false,
        method: 'automatic',
        error: error instanceof Error ? error.message : 'Unknown detection error',
        fallbackAvailable: true,
        retryCount: this.retryCount,
        detectionTime: Date.now() - this.detectionStartTime,
      };
    }
  }

  /**
   * Enable right-click fallback detection
   */
  enableRightClickFallback(): void {
    if (this.isListening) {
      return; // Already listening
    }

    this.isListening = true;
    this.rightClickHandler = (event: MouseEvent) => this.handleRightClick(event);

    document.addEventListener('contextmenu', this.rightClickHandler, true);

    // Show user guidance
    this.showRightClickGuidance();
    this.notifyStatusChange();
  }

  /**
   * Handle right-click event for video detection
   */
  handleRightClick(event: MouseEvent): VideoDetectionResult {
    if (!this.isActive || !this.isListening) {
      return {
        success: false,
        method: 'right-click',
        error: 'Detection not active',
        fallbackAvailable: false,
        retryCount: this.retryCount,
        detectionTime: Date.now() - this.detectionStartTime,
      };
    }

    const target = event.target as HTMLElement;
    console.log('Right-click detected on element:', target.tagName);

    // Check if clicked element is a video
    if (target.tagName.toLowerCase() === 'video') {
      const video = target as VideoElement;
      return this.selectVideo(video, 'right-click');
    }

    // Traverse parent elements up to 3 levels
    const foundVideo = this.traverseParentElements(target, 3);

    if (foundVideo) {
      return this.selectVideo(foundVideo, 'right-click');
    }

    // No video found
    this.retryCount++;

    if (this.retryCount >= this.maxRetries) {
      this.showDetectionFailedError();
      return {
        success: false,
        method: 'right-click',
        error: 'Video capturing failed after maximum attempts',
        fallbackAvailable: false,
        retryCount: this.retryCount,
        detectionTime: Date.now() - this.detectionStartTime,
      };
    }

    return {
      success: false,
      method: 'right-click',
      error: 'No video found at clicked location',
      fallbackAvailable: true,
      retryCount: this.retryCount,
      detectionTime: Date.now() - this.detectionStartTime,
    };
  }

  /**
   * Traverse parent elements looking for video tags
   */
  traverseParentElements(element: HTMLElement, maxLevels: number): HTMLVideoElement | null {
    let currentElement: HTMLElement | null = element;
    let level = 0;

    while (currentElement && level < maxLevels) {
      // Check children of current element
      const videos = currentElement.querySelectorAll('video');
      if (videos.length > 0) {
        // Return the first visible video
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          if (!video) continue;
          if (this.isVideoVisible(video)) {
            return video;
          }
        }
      }

      // Move to parent element
      currentElement = currentElement.parentElement;
      level++;
    }

    return null;
  }

  /**
   * Show detection failed error with retry options
   */
  showDetectionFailedError(): void {
    const errorMessage = `Video capturing failed after ${this.retryCount} attempts. Please try right-clicking directly on the video player.`;

    // Create error notification
    this.showNotification(errorMessage, 'error', [
      {
        text: 'Retry Detection',
        action: () => this.retryDetection(),
      },
      {
        text: 'Manual Selection',
        action: () => this.enableManualSelection(),
      },
    ]);

    this.notifyStatusChange();
  }

  /**
   * Retry detection
   */
  async retryDetection(): Promise<VideoDetectionResult> {
    console.log('Retrying video detection...');
    this.retryCount = 0;
    return await this.startDetection();
  }

  /**
   * Stop detection and cleanup
   */
  stopDetection(): void {
    this.isActive = false;
    this.isListening = false;

    if (this.rightClickHandler) {
      document.removeEventListener('contextmenu', this.rightClickHandler, true);
      this.rightClickHandler = null;
    }

    this.hideGuidanceMessages();
    this.notifyStatusChange();
  }

  /**
   * Get current detection status
   */
  getDetectionStatus(): DetectionStatus {
    return {
      isActive: this.isActive,
      isListening: this.isListening,
      hasVideo: !!this.selectedVideo,
      currentVideo: this.selectedVideo || undefined,
      lastDetectionAttempt: this.detectionStartTime ? new Date(this.detectionStartTime) : undefined,
      retryCount: this.retryCount,
    };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: DetectionStatus) => void): () => void {
    this.statusCallbacks.push(callback);

    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index >= 0) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get selected video
   */
  getSelectedVideo(): VideoElement | null {
    return this.selectedVideo;
  }

  /**
   * Attempt automatic video detection
   */
  private async attemptAutomaticDetection(): Promise<VideoDetectionResult> {
    const videos = document.querySelectorAll('video');

    if (videos.length === 0) {
      return {
        success: false,
        method: 'automatic',
        error: 'No video elements found on page',
        fallbackAvailable: true,
        retryCount: this.retryCount,
        detectionTime: Date.now() - this.detectionStartTime,
      };
    }

    // Find the best video candidate
    const candidates = Array.from(videos)
      .filter((video) => this.isVideoVisible(video as HTMLVideoElement))
      .sort(
        (a, b) => this.scoreVideo(b as HTMLVideoElement) - this.scoreVideo(a as HTMLVideoElement)
      );

    if (candidates.length === 0) {
      return {
        success: false,
        method: 'automatic',
        error: 'No visible video elements found',
        fallbackAvailable: true,
        retryCount: this.retryCount,
        detectionTime: Date.now() - this.detectionStartTime,
      };
    }

    const bestVideo = candidates[0] as VideoElement;
    return this.selectVideo(bestVideo, 'automatic');
  }

  /**
   * Select a video element
   */
  private selectVideo(
    video: VideoElement,
    method: VideoDetectionResult['method']
  ): VideoDetectionResult {
    // Add unique identifier
    video._watchPartyId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.selectedVideo = video;
    this.stopDetection(); // Stop listening for right-clicks

    // Dispatch success event
    const event = new CustomEvent('watchPartyVideoDetected', {
      detail: { video, method },
    });
    document.dispatchEvent(event);

    console.log(`Video selected via ${method}:`, video);

    return {
      success: true,
      video,
      method,
      fallbackAvailable: false,
      retryCount: this.retryCount,
      detectionTime: Date.now() - this.detectionStartTime,
    };
  }

  /**
   * Check if video is visible and playable
   */
  private isVideoVisible(video: HTMLVideoElement): boolean {
    const rect = video.getBoundingClientRect();
    const style = window.getComputedStyle(video);

    return (
      rect.width > 100 &&
      rect.height > 100 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      video.readyState >= 2 // HAVE_CURRENT_DATA
    );
  }

  /**
   * Score video element for selection priority
   */
  private scoreVideo(video: HTMLVideoElement): number {
    let score = 0;
    const rect = video.getBoundingClientRect();

    // Size score (larger is better)
    score += (rect.width * rect.height) / 10000;

    // Duration score (longer videos are more likely to be main content)
    if (video.duration > 0) {
      score += Math.min(video.duration / 60, 100); // Cap at 100 minutes
    }

    // Position score (videos higher on page are more likely to be main content)
    score += Math.max(0, (window.innerHeight - rect.top) / 100);

    // Playing state score
    if (!video.paused) {
      score += 50;
    }

    // Has controls score
    if (video.controls) {
      score += 25;
    }

    return score;
  }

  /**
   * Show right-click guidance to user
   */
  private showRightClickGuidance(): void {
    this.showNotification(
      'Automatic video detection failed. Please right-click on the video player to select it manually.',
      'info',
      [
        {
          text: 'Cancel',
          action: () => this.stopDetection(),
        },
      ]
    );
  }

  /**
   * Enable manual video selection mode
   */
  private enableManualSelection(): void {
    // This would open a modal or overlay for manual selection
    console.log('Manual selection mode enabled');
    // Implementation would depend on UI framework
  }

  /**
   * Show notification to user
   */
  private showNotification(
    message: string,
    type: 'info' | 'error' | 'success' | 'warning',
    actions?: Array<{ text: string; action: () => void }>
  ): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `watch-party-notification watch-party-notification--${type}`;
    notification.innerHTML = `
      <div class="watch-party-notification__content">
        <p>${message}</p>
        ${
          actions
            ? `
          <div class="watch-party-notification__actions">
            ${actions
              .map(
                (action) => `
              <button class="watch-party-notification__button" data-action="${action.text}">
                ${action.text}
              </button>
            `
              )
              .join('')}
          </div>
        `
            : ''
        }
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 300px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
    `;

    // Add event listeners for actions
    if (actions) {
      actions.forEach((action) => {
        const button = notification.querySelector(`[data-action="${action.text}"]`);
        if (button) {
          button.addEventListener('click', () => {
            action.action();
            notification.remove();
          });
        }
      });
    }

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);

    document.body.appendChild(notification);
  }

  /**
   * Hide guidance messages
   */
  private hideGuidanceMessages(): void {
    const notifications = document.querySelectorAll('.watch-party-notification');
    notifications.forEach((notification) => notification.remove());
  }

  /**
   * Notify status change callbacks
   */
  private notifyStatusChange(): void {
    const status = this.getDetectionStatus();
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status change callback:', error);
      }
    });
  }
}

export default EnhancedVideoDetector;
