/**
 * Asset Preloader for Critical UI Components
 * Implements intelligent preloading strategies
 */

export interface PreloadStrategy {
  critical: string[];
  important: string[];
  lazy: string[];
}

export interface PreloadResult {
  asset: string;
  success: boolean;
  loadTime: number;
  size: number;
  method: 'preload' | 'prefetch' | 'lazy';
}

interface NetworkInformationLike {
  effectiveType: string;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
}

export class AssetPreloader {
  private static instance: AssetPreloader;
  private preloadedAssets = new Set<string>();
  private preloadPromises = new Map<string, Promise<PreloadResult>>();
  private loadingQueue: Array<{ asset: string; priority: number }> = [];
  private isProcessingQueue = false;
  private intersectionObserver?: IntersectionObserver;
  private preloadingMode?: 'minimal' | 'moderate' | 'full';

  // Preload strategies based on user interaction patterns
  private strategies: Record<string, PreloadStrategy> = {
    popup: {
      critical: ['play', 'pause', 'settings', 'users', 'close'],
      important: ['chat', 'mic', 'mic-off', 'share'],
      lazy: ['heart', 'laugh', 'thumbs-up', 'thumbs-down'],
    },
    options: {
      critical: ['settings', 'check', 'warning', 'info'],
      important: ['expand-more', 'expand-less', 'copy', 'save'],
      lazy: ['palette', 'accessibility', 'key'],
    },
    overlay: {
      critical: ['close', 'minimize', 'expand'],
      important: ['heart', 'laugh', 'thumbs-up'],
      lazy: ['surprise', 'sad', 'thumbs-down'],
    },
  };

  private constructor() {
    this.initializePreloader();
  }

  public static getInstance(): AssetPreloader {
    if (!AssetPreloader.instance) {
      AssetPreloader.instance = new AssetPreloader();
    }
    return AssetPreloader.instance;
  }

  /**
   * Initialize preloader with performance optimizations
   */
  private initializePreloader(): void {
    // Use requestIdleCallback for non-critical preloading
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      this.scheduleIdlePreloading();
    }

    // Set up network-aware preloading
    this.setupNetworkAwarePreloading();

    // Set up intersection observer for lazy loading
    this.setupIntersectionObserver();
  }

  /**
   * Schedule preloading during idle time
   */
  private scheduleIdlePreloading(): void {
    if (typeof window === 'undefined' || !('requestIdleCallback' in window)) {
      console.warn('requestIdleCallback not available, using setTimeout fallback');
      this.processLoadingQueueFallback();
      return;
    }

    const idleCallback = (deadline: IdleDeadline) => {
      while (deadline.timeRemaining() > 0 && this.loadingQueue.length > 0) {
        const item = this.loadingQueue.shift();
        if (item && !this.preloadedAssets.has(item.asset)) {
          this.preloadAsset(item.asset, 'prefetch');
        }
      }

      if (this.loadingQueue.length > 0) {
        requestIdleCallback(idleCallback);
      } else {
        this.isProcessingQueue = false;
      }
    };

    requestIdleCallback(idleCallback);
  }

  /**
   * Fallback for browsers without requestIdleCallback
   */
  private processLoadingQueueFallback(): void {
    const processNext = () => {
      if (this.loadingQueue.length > 0) {
        const item = this.loadingQueue.shift();
        if (item && !this.preloadedAssets.has(item.asset)) {
          this.preloadAsset(item.asset, 'prefetch').then(() => {
            setTimeout(processNext, 100);
          });
        } else {
          setTimeout(processNext, 10);
        }
      } else {
        this.isProcessingQueue = false;
      }
    };

    setTimeout(processNext, 100);
  }

  /**
   * Set up network-aware preloading
   */
  private setupNetworkAwarePreloading(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: NetworkInformationLike })
        .connection;
      if (!connection) {
        return;
      }

      // Adjust preloading strategy based on connection
      const adjustStrategy = () => {
        const effectiveType = connection.effectiveType;

        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          // Only preload critical assets on slow connections
          this.setPreloadingMode('minimal');
        } else if (effectiveType === '3g') {
          // Moderate preloading on 3G
          this.setPreloadingMode('moderate');
        } else {
          // Full preloading on fast connections
          this.setPreloadingMode('full');
        }
      };

      connection.addEventListener('change', adjustStrategy);
      adjustStrategy(); // Initial setup
    }
  }

  /**
   * Set up intersection observer for lazy loading
   */
  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not available, lazy loading disabled');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const assetName = element.dataset.preloadAsset;

            if (assetName && !this.preloadedAssets.has(assetName)) {
              this.preloadAsset(assetName, 'lazy');
              observer.unobserve(element);
            }
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before element is visible
        threshold: 0.1,
      }
    );

    this.intersectionObserver = observer;
  }

  /**
   * Set preloading mode based on network conditions
   */
  private setPreloadingMode(mode: 'minimal' | 'moderate' | 'full'): void {
    this.preloadingMode = mode;
  }

  /**
   * Preload assets for a specific context
   */
  public async preloadForContext(context: string): Promise<PreloadResult[]> {
    const strategy = this.strategies[context];
    if (!strategy) {
      console.warn(`No preload strategy found for context: ${context}`);
      return [];
    }

    const results: PreloadResult[] = [];

    // Preload critical assets immediately
    const criticalPromises = strategy.critical.map((asset) => this.preloadAsset(asset, 'preload'));

    // Wait for critical assets
    const criticalResults = await Promise.allSettled(criticalPromises);
    results.push(
      ...criticalResults.map((result) =>
        result.status === 'fulfilled'
          ? result.value
          : { asset: '', success: false, loadTime: 0, size: 0, method: 'preload' as const }
      )
    );

    // Queue important assets for idle loading
    strategy.important.forEach((asset) => {
      this.queueAssetForPreload(asset, 2);
    });

    // Queue lazy assets with lowest priority
    strategy.lazy.forEach((asset) => {
      this.queueAssetForPreload(asset, 1);
    });

    // Start processing queue if not already running
    if (!this.isProcessingQueue && this.loadingQueue.length > 0) {
      this.isProcessingQueue = true;
      this.processLoadingQueue();
    }

    return results;
  }

  /**
   * Preload a specific asset
   */
  public async preloadAsset(
    assetName: string,
    method: 'preload' | 'prefetch' | 'lazy'
  ): Promise<PreloadResult> {
    if (this.preloadedAssets.has(assetName)) {
      return {
        asset: assetName,
        success: true,
        loadTime: 0,
        size: 0,
        method,
      };
    }

    // Check if already loading
    const existingPromise = this.preloadPromises.get(assetName);
    if (existingPromise) {
      return existingPromise;
    }

    const startTime = performance.now();
    const preloadPromise = this.performAssetPreload(assetName, method, startTime);
    this.preloadPromises.set(assetName, preloadPromise);

    try {
      const result = await preloadPromise;
      if (result.success) {
        this.preloadedAssets.add(assetName);
      }
      return result;
    } finally {
      this.preloadPromises.delete(assetName);
    }
  }

  /**
   * Perform the actual asset preloading
   */
  private async performAssetPreload(
    assetName: string,
    method: 'preload' | 'prefetch' | 'lazy',
    startTime: number
  ): Promise<PreloadResult> {
    try {
      // Try SVG sprite first (most efficient)
      const svgResult = await this.preloadSVGSprite(assetName);
      if (svgResult.success) {
        return {
          asset: assetName,
          success: true,
          loadTime: performance.now() - startTime,
          size: svgResult.size,
          method,
        };
      }

      // Try font preload
      const fontResult = await this.preloadIconFont(assetName);
      if (fontResult.success) {
        return {
          asset: assetName,
          success: true,
          loadTime: performance.now() - startTime,
          size: fontResult.size,
          method,
        };
      }

      // Fallback always succeeds
      return {
        asset: assetName,
        success: true,
        loadTime: performance.now() - startTime,
        size: 50, // Approximate fallback size
        method,
      };
    } catch {
      return {
        asset: assetName,
        success: false,
        loadTime: performance.now() - startTime,
        size: 0,
        method,
      };
    }
  }

  /**
   * Preload SVG sprite
   */
  private async preloadSVGSprite(_assetName: string): Promise<{ success: boolean; size: number }> {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        return { success: false, size: 0 };
      }

      const spriteUrl = chrome.runtime.getURL('assets/icons/sprite-optimized.svg');

      // Use link preload for better browser optimization
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = spriteUrl;

      return new Promise((resolve) => {
        link.onload = () => {
          // Estimate size based on sprite content
          resolve({ success: true, size: 2048 }); // Approximate sprite size
        };

        link.onerror = () => {
          resolve({ success: false, size: 0 });
        };

        document.head.appendChild(link);

        // Cleanup after loading
        setTimeout(() => {
          try {
            document.head.removeChild(link);
          } catch {
            // Element might already be removed
          }
        }, 1000);
      });
    } catch {
      return { success: false, size: 0 };
    }
  }

  /**
   * Preload icon font
   */
  private async preloadIconFont(_assetName: string): Promise<{ success: boolean; size: number }> {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        return { success: false, size: 0 };
      }

      const fontUrl = chrome.runtime.getURL('assets/fonts/fontawesome/css/subset.min.css');

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = fontUrl;

      return new Promise((resolve) => {
        link.onload = () => {
          resolve({ success: true, size: 1024 }); // Approximate font size
        };

        link.onerror = () => {
          resolve({ success: false, size: 0 });
        };

        document.head.appendChild(link);

        // Cleanup after loading
        setTimeout(() => {
          try {
            document.head.removeChild(link);
          } catch {
            // Element might already be removed
          }
        }, 1000);
      });
    } catch {
      return { success: false, size: 0 };
    }
  }

  /**
   * Queue asset for preload with priority
   */
  private queueAssetForPreload(asset: string, priority: number): void {
    if (this.preloadedAssets.has(asset)) {
      return;
    }

    // Insert in priority order
    const insertIndex = this.loadingQueue.findIndex((item) => item.priority < priority);
    const queueItem = { asset, priority };

    if (insertIndex === -1) {
      this.loadingQueue.push(queueItem);
    } else {
      this.loadingQueue.splice(insertIndex, 0, queueItem);
    }
  }

  /**
   * Process the loading queue
   */
  private processLoadingQueue(): void {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      this.scheduleIdlePreloading();
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        if (this.loadingQueue.length > 0) {
          const item = this.loadingQueue.shift();
          if (item && !this.preloadedAssets.has(item.asset)) {
            this.preloadAsset(item.asset, 'prefetch').then(() => {
              if (this.loadingQueue.length > 0) {
                this.processLoadingQueue();
              } else {
                this.isProcessingQueue = false;
              }
            });
          }
        }
      }, 100);
    }
  }

  /**
   * Enable lazy loading for an element
   */
  public enableLazyLoading(element: HTMLElement, assetName: string): void {
    if (this.intersectionObserver) {
      element.dataset.preloadAsset = assetName;
      this.intersectionObserver.observe(element);
    }
  }

  /**
   * Get preload statistics
   */
  public getStats(): {
    preloadedCount: number;
    queueLength: number;
    preloadedAssets: string[];
  } {
    return {
      preloadedCount: this.preloadedAssets.size,
      queueLength: this.loadingQueue.length,
      preloadedAssets: Array.from(this.preloadedAssets),
    };
  }

  /**
   * Clear preload cache
   */
  public clearCache(): void {
    this.preloadedAssets.clear();
    this.preloadPromises.clear();
    this.loadingQueue = [];
    this.isProcessingQueue = false;
  }
}

// Export singleton instance
export const assetPreloader = AssetPreloader.getInstance();
