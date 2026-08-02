/**
 * Optimized Asset System with Lazy Loading and Bundle Size Optimization
 * Implements performance optimizations for asset loading
 */

export interface AssetLoadOptions {
  priority?: 'high' | 'medium' | 'low';
  lazy?: boolean;
  preload?: boolean;
  fallback?: boolean;
}

export interface OptimizedAssetResult {
  success: boolean;
  method: 'font' | 'svg' | 'fallback' | 'cached';
  loadTime: number;
  size?: number;
  cached: boolean;
}

export interface AssetMetrics {
  totalSize: number;
  loadTime: number;
  cacheHitRate: number;
  failureRate: number;
}

class OptimizedAssetSystem {
  private static instance: OptimizedAssetSystem;
  private assetCache = new Map<string, { data: string; timestamp: number; size: number }>();
  private loadingPromises = new Map<string, Promise<OptimizedAssetResult>>();
  private metrics: AssetMetrics = {
    totalSize: 0,
    loadTime: 0,
    cacheHitRate: 0,
    failureRate: 0,
  };
  private loadAttempts = 0;
  private cacheHits = 0;
  private failures = 0;

  // Critical assets that should be preloaded
  private criticalAssets = ['play', 'pause', 'settings', 'users', 'chat', 'mic', 'close'];

  // Lazy-loaded assets that can wait
  private lazyAssets = [
    'heart',
    'laugh',
    'surprise',
    'sad',
    'thumbs-up',
    'thumbs-down',
    'expand',
    'minimize',
    'menu',
    'share',
    'copy',
  ];

  private constructor() {
    this.initializeOptimizations();
  }

  public static getInstance(): OptimizedAssetSystem {
    if (!OptimizedAssetSystem.instance) {
      OptimizedAssetSystem.instance = new OptimizedAssetSystem();
    }
    return OptimizedAssetSystem.instance;
  }

  /**
   * Initialize performance optimizations
   */
  private initializeOptimizations(): void {
    // Set up intersection observer for lazy loading
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.setupLazyLoading();
    }

    // Preload critical assets
    this.preloadCriticalAssets();

    // Set up cache cleanup
    this.setupCacheCleanup();
  }

  /**
   * Set up lazy loading with Intersection Observer
   */
  private setupLazyLoading(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const iconName = element.dataset.iconName;
            if (iconName && this.lazyAssets.includes(iconName)) {
              this.loadIcon(iconName, { priority: 'low', lazy: true });
              observer.unobserve(element);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    // Store observer for later use
    (this as any).lazyObserver = observer;
  }

  /**
   * Preload critical assets for immediate availability
   */
  private async preloadCriticalAssets(): Promise<void> {
    const preloadPromises = this.criticalAssets.map((iconName) =>
      this.loadIcon(iconName, { priority: 'high', preload: true })
    );

    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('Some critical assets failed to preload:', error);
    }
  }

  /**
   * Set up cache cleanup to prevent memory leaks
   */
  private setupCacheCleanup(): void {
    // Clean up cache every 5 minutes
    setInterval(
      () => {
        this.cleanupCache();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [key, value] of this.assetCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.assetCache.delete(key);
      }
    }
  }

  /**
   * Load icon with optimization options
   */
  public async loadIcon(
    iconName: string,
    options: AssetLoadOptions = {}
  ): Promise<OptimizedAssetResult> {
    const startTime = performance.now();
    this.loadAttempts++;

    // Check if already loading
    if (this.loadingPromises.has(iconName)) {
      return this.loadingPromises.get(iconName)!;
    }

    // Check cache first
    const cached = this.assetCache.get(iconName);
    if (cached) {
      this.cacheHits++;
      return {
        success: true,
        method: 'cached',
        loadTime: performance.now() - startTime,
        size: cached.size,
        cached: true,
      };
    }

    // Create loading promise
    const loadingPromise = this.performIconLoad(iconName, options, startTime);
    this.loadingPromises.set(iconName, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      this.loadingPromises.delete(iconName);
    }
  }

  /**
   * Perform the actual icon loading with fallback chain
   */
  private async performIconLoad(
    iconName: string,
    options: AssetLoadOptions,
    startTime: number
  ): Promise<OptimizedAssetResult> {
    const getLoadTime = () => {
      if (typeof performance !== 'undefined' && performance.now) {
        return performance.now() - startTime;
      }
      return Date.now() - startTime;
    };

    try {
      // Try optimized SVG sprite first (smallest size)
      const spriteResult = await this.loadFromSVGSprite(iconName);
      if (spriteResult.success) {
        this.cacheAsset(iconName, spriteResult.data, spriteResult.size || 0);
        return {
          success: true,
          method: 'svg',
          loadTime: getLoadTime(),
          size: spriteResult.size,
          cached: false,
        };
      }

      // Try font icon (medium size, good caching)
      if (!options.fallback) {
        const fontResult = await this.loadFromIconFont(iconName);
        if (fontResult.success) {
          this.cacheAsset(iconName, fontResult.data, fontResult.size || 0);
          return {
            success: true,
            method: 'font',
            loadTime: getLoadTime(),
            size: fontResult.size,
            cached: false,
          };
        }
      }

      // Fallback to text (smallest size, always available)
      const fallbackResult = this.getFallbackIcon(iconName);
      this.cacheAsset(iconName, fallbackResult.data, fallbackResult.size);

      return {
        success: true,
        method: 'fallback',
        loadTime: getLoadTime(),
        size: fallbackResult.size,
        cached: false,
      };
    } catch (error) {
      this.failures++;

      // Always provide fallback even on error
      const fallbackResult = this.getFallbackIcon(iconName);
      this.cacheAsset(iconName, fallbackResult.data, fallbackResult.size);

      return {
        success: true,
        method: 'fallback',
        loadTime: getLoadTime(),
        size: fallbackResult.size,
        cached: false,
      };
    }
  }

  /**
   * Load from optimized SVG sprite
   */
  private async loadFromSVGSprite(
    iconName: string
  ): Promise<{ success: boolean; data: string; size: number }> {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        return { success: false, data: '', size: 0 };
      }

      const spriteUrl = chrome.runtime.getURL('assets/icons/sprite-optimized.svg');
      const response = await fetch(spriteUrl);

      if (!response.ok) {
        return { success: false, data: '', size: 0 };
      }

      const svgContent = await response.text();
      const iconMatch = svgContent.match(
        new RegExp(`<symbol[^>]*id="icon-${iconName}"[^>]*>([\\s\\S]*?)</symbol>`)
      );

      if (!iconMatch) {
        return { success: false, data: '', size: 0 };
      }

      const optimizedSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        ${iconMatch[1]}
      </svg>`;

      return {
        success: true,
        data: optimizedSVG,
        size: optimizedSVG.length,
      };
    } catch (error) {
      return { success: false, data: '', size: 0 };
    }
  }

  /**
   * Load from icon font with size optimization
   */
  private async loadFromIconFont(
    iconName: string
  ): Promise<{ success: boolean; data: string; size: number }> {
    try {
      // Check if font is already loaded
      if (!this.isIconFontLoaded()) {
        await this.loadIconFontOptimized();
      }

      const iconClass = this.getIconFontClass(iconName);
      if (!iconClass) {
        return { success: false, data: '', size: 0 };
      }

      const fontIcon = `<i class="${iconClass}" aria-hidden="true"></i>`;
      return {
        success: true,
        data: fontIcon,
        size: fontIcon.length,
      };
    } catch (error) {
      return { success: false, data: '', size: 0 };
    }
  }

  /**
   * Load icon font with optimization
   */
  private async loadIconFontOptimized(): Promise<boolean> {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        return false;
      }

      // Use optimized subset font that only includes needed icons
      const fontUrl = chrome.runtime.getURL('assets/fonts/fontawesome/css/subset.min.css');

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontUrl;

      return new Promise((resolve) => {
        link.onload = () => resolve(true);
        link.onerror = () => resolve(false);
        document.head.appendChild(link);

        // Timeout for performance
        setTimeout(() => resolve(false), 1000);
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if icon font is loaded
   */
  private isIconFontLoaded(): boolean {
    if (typeof document === 'undefined') return false;

    try {
      const testElement = document.createElement('span');
      testElement.className = 'fas fa-home';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      document.body.appendChild(testElement);

      const computedStyle = window.getComputedStyle(testElement);
      const fontFamily = computedStyle.fontFamily;

      document.body.removeChild(testElement);

      return fontFamily.includes('Font Awesome');
    } catch (error) {
      return false;
    }
  }

  /**
   * Get icon font class for an icon
   */
  private getIconFontClass(iconName: string): string | null {
    const iconMap: Record<string, string> = {
      play: 'fas fa-play',
      pause: 'fas fa-pause',
      stop: 'fas fa-stop',
      settings: 'fas fa-cog',
      close: 'fas fa-times',
      menu: 'fas fa-bars',
      users: 'fas fa-users',
      user: 'fas fa-user',
      chat: 'fas fa-comments',
      mic: 'fas fa-microphone',
      'mic-off': 'fas fa-microphone-slash',
      video: 'fas fa-video',
      share: 'fas fa-share',
      copy: 'fas fa-copy',
      heart: 'fas fa-heart',
      laugh: 'fas fa-laugh',
      'thumbs-up': 'fas fa-thumbs-up',
      'thumbs-down': 'fas fa-thumbs-down',
      expand_more: 'fas fa-chevron-down',
      expand_less: 'fas fa-chevron-up',
      check: 'fas fa-check',
      warning: 'fas fa-exclamation-triangle',
      error: 'fas fa-times-circle',
      info: 'fas fa-info-circle',
    };

    return iconMap[iconName] || null;
  }

  /**
   * Get fallback icon (text-based, smallest size)
   */
  private getFallbackIcon(iconName: string): { data: string; size: number } {
    const fallbackMap: Record<string, string> = {
      play: '▶',
      pause: '⏸',
      stop: '⏹',
      settings: '⚙',
      close: '✕',
      menu: '☰',
      users: '👥',
      user: '👤',
      chat: '💬',
      mic: '🎤',
      'mic-off': '🎤🚫',
      video: '📹',
      share: '📤',
      copy: '📋',
      heart: '❤',
      laugh: '😂',
      'thumbs-up': '👍',
      'thumbs-down': '👎',
      expand_more: '⌄',
      expand_less: '⌃',
      check: '✓',
      warning: '⚠',
      error: '✕',
      info: 'ℹ',
    };

    const fallbackText = fallbackMap[iconName] || '?';
    return {
      data: `<span class="material-icon-fallback">${fallbackText}</span>`,
      size: fallbackText.length + 40, // Approximate HTML wrapper size
    };
  }

  /**
   * Cache asset data
   */
  private cacheAsset(key: string, data: string, size: number): void {
    this.assetCache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });
    this.metrics.totalSize += size;
  }

  /**
   * Enable lazy loading for an element
   */
  public enableLazyLoading(element: HTMLElement, iconName: string): void {
    if ((this as any).lazyObserver && this.lazyAssets.includes(iconName)) {
      element.dataset.iconName = iconName;
      (this as any).lazyObserver.observe(element);
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): AssetMetrics {
    return {
      ...this.metrics,
      cacheHitRate: this.loadAttempts > 0 ? this.cacheHits / this.loadAttempts : 0,
      failureRate: this.loadAttempts > 0 ? this.failures / this.loadAttempts : 0,
      loadTime: this.metrics.loadTime / Math.max(this.loadAttempts, 1),
    };
  }

  /**
   * Clear cache and reset metrics
   */
  public clearCache(): void {
    this.assetCache.clear();
    this.loadingPromises.clear();
    this.metrics = {
      totalSize: 0,
      loadTime: 0,
      cacheHitRate: 0,
      failureRate: 0,
    };
    this.loadAttempts = 0;
    this.cacheHits = 0;
    this.failures = 0;
  }

  /**
   * Preload specific assets
   */
  public async preloadAssets(iconNames: string[]): Promise<OptimizedAssetResult[]> {
    const preloadPromises = iconNames.map((iconName) =>
      this.loadIcon(iconName, { priority: 'high', preload: true })
    );

    return Promise.allSettled(preloadPromises).then((results) =>
      results.map((result) =>
        result.status === 'fulfilled'
          ? result.value
          : { success: false, method: 'fallback' as const, loadTime: 0, cached: false }
      )
    );
  }
}

// Export singleton instance
export const optimizedAssetSystem = OptimizedAssetSystem.getInstance();
