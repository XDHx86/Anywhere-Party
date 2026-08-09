/**
 * Component Loading Optimizer
 * Implements lazy loading, bundle optimization, and resource preloading
 * Requirements: 1.1, 2.1, 1.4, 2.4
 */

import React from 'react';

export interface LazyComponentConfig {
  componentName: string;
  importPath: string;
  priority: 'high' | 'medium' | 'low';
  preload?: boolean;
  dependencies?: string[];
  fallback?: React.ComponentType;
}

export interface ResourcePreloadConfig {
  url: string;
  type: 'script' | 'style' | 'font' | 'image';
  priority: 'high' | 'medium' | 'low';
  crossOrigin?: 'anonymous' | 'use-credentials';
}

export interface BundleOptimizationConfig {
  enableCodeSplitting: boolean;
  enableTreeShaking: boolean;
  enableMinification: boolean;
  chunkSizeLimit: number;
  preloadCriticalChunks: boolean;
}

export interface LoadingOptimizationMetrics {
  componentName: string;
  loadTime: number;
  bundleSize: number;
  cacheHit: boolean;
  preloaded: boolean;
  lazyLoaded: boolean;
  dependencies: string[];
  errors: string[];
}

class ComponentLoadingOptimizer {
  private lazyComponents: Map<string, LazyComponentConfig> = new Map();
  private preloadedResources: Set<string> = new Set();
  private componentCache: Map<string, unknown> = new Map();
  private loadingPromises: Map<string, Promise<unknown>> = new Map();
  private preloadPromises: Map<string, Promise<void>> = new Map();
  private config: BundleOptimizationConfig;
  private metrics: LoadingOptimizationMetrics[] = [];
  private lazyLoadingObserver?: IntersectionObserver;

  constructor(config?: Partial<BundleOptimizationConfig>) {
    this.config = {
      enableCodeSplitting: true,
      enableTreeShaking: true,
      enableMinification: true,
      chunkSizeLimit: 244 * 1024, // 244KB
      preloadCriticalChunks: true,
      ...config,
    };

    this.initializeOptimizations();
  }

  private initializeOptimizations(): void {
    // Preload critical resources
    this.preloadCriticalResources();

    // Setup intersection observer for lazy loading
    this.setupLazyLoadingObserver();

    // Setup resource hints
    this.setupResourceHints();

    console.log('🚀 Component loading optimizer initialized');
  }

  /**
   * Register a component for lazy loading
   */
  registerLazyComponent(config: LazyComponentConfig): void {
    this.lazyComponents.set(config.componentName, config);

    // Preload high priority components
    if (config.priority === 'high' && config.preload) {
      this.preloadComponent(config.componentName);
    }

    console.log(
      `📦 Registered lazy component: ${config.componentName} (priority: ${config.priority})`
    );
  }

  /**
   * Create a lazy-loaded React component
   */
  createLazyComponent(
    componentName: string
  ): React.LazyExoticComponent<React.ComponentType<unknown>> | null {
    const config = this.lazyComponents.get(componentName);
    if (!config) {
      console.warn(`No lazy component config found for: ${componentName}`);
      return null;
    }

    const lazyComponent = React.lazy(async () => {
      const startTime = performance.now();

      try {
        // Check cache first
        if (this.componentCache.has(componentName)) {
          console.log(`📋 Cache hit for component: ${componentName}`);
          return this.componentCache.get(componentName);
        }

        // Load dependencies first
        if (config.dependencies && config.dependencies.length > 0) {
          await this.loadDependencies(config.dependencies);
        }

        // Dynamic import with error handling
        const module = await import(config.importPath);
        const component = module.default || module;

        // Cache the component
        this.componentCache.set(componentName, component);

        const loadTime = performance.now() - startTime;

        // Record metrics
        this.recordLoadingMetrics({
          componentName,
          loadTime,
          bundleSize: this.estimateBundleSize(config.importPath),
          cacheHit: false,
          preloaded: this.preloadedResources.has(config.importPath),
          lazyLoaded: true,
          dependencies: config.dependencies || [],
          errors: [],
        });

        console.log(`✅ Lazy loaded component: ${componentName} (${loadTime.toFixed(2)}ms)`);

        return component;
      } catch (error) {
        const loadTime = performance.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error(`❌ Failed to lazy load component: ${componentName}`, error);

        // Record error metrics
        this.recordLoadingMetrics({
          componentName,
          loadTime,
          bundleSize: 0,
          cacheHit: false,
          preloaded: false,
          lazyLoaded: false,
          dependencies: config.dependencies || [],
          errors: [errorMessage],
        });

        // Return fallback component if available
        if (config.fallback) {
          return { default: config.fallback };
        }

        throw error;
      }
    });

    return lazyComponent;
  }

  /**
   * Preload a component without rendering it
   */
  async preloadComponent(componentName: string): Promise<void> {
    const config = this.lazyComponents.get(componentName);
    if (!config) {
      console.warn(`No component config found for preloading: ${componentName}`);
      return;
    }

    // Check if already preloading
    if (this.preloadPromises.has(componentName)) {
      return this.preloadPromises.get(componentName);
    }

    const preloadPromise = this.performPreload(config);
    this.preloadPromises.set(componentName, preloadPromise);

    return preloadPromise;
  }

  private async performPreload(config: LazyComponentConfig): Promise<void> {
    try {
      console.log(`🔄 Preloading component: ${config.componentName}`);

      // Preload dependencies first
      if (config.dependencies && config.dependencies.length > 0) {
        await this.loadDependencies(config.dependencies);
      }

      // Preload the component module
      const module = await import(config.importPath);
      const component = module.default || module;

      // Cache the preloaded component
      this.componentCache.set(config.componentName, component);
      this.preloadedResources.add(config.importPath);

      console.log(`✅ Preloaded component: ${config.componentName}`);
    } catch (error) {
      console.error(`❌ Failed to preload component: ${config.componentName}`, error);
    }
  }

  /**
   * Load component dependencies
   */
  private async loadDependencies(dependencies: string[]): Promise<void> {
    const loadPromises = dependencies.map(async (dep) => {
      if (!this.componentCache.has(dep)) {
        try {
          const module = await import(dep);
          this.componentCache.set(dep, module);
        } catch (error) {
          console.warn(`Failed to load dependency: ${dep}`, error);
        }
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Preload critical resources
   */
  private preloadCriticalResources(): void {
    const criticalResources: ResourcePreloadConfig[] = [
      {
        url: '/assets/fonts/fontawesome/css/all.min.css',
        type: 'style',
        priority: 'high',
      },
      {
        url: '/assets/fonts/fontawesome/webfonts/fa-solid-900.woff2',
        type: 'font',
        priority: 'high',
        crossOrigin: 'anonymous',
      },
      {
        url: '/assets/icons/sprite-optimized.svg',
        type: 'image',
        priority: 'medium',
      },
    ];

    criticalResources.forEach((resource) => {
      this.preloadResource(resource);
    });
  }

  /**
   * Preload a specific resource
   */
  preloadResource(config: ResourcePreloadConfig): void {
    if (this.preloadedResources.has(config.url)) {
      return; // Already preloaded
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = config.url;

    switch (config.type) {
      case 'script':
        link.as = 'script';
        break;
      case 'style':
        link.as = 'style';
        break;
      case 'font':
        link.as = 'font';
        link.type = 'font/woff2';
        if (config.crossOrigin) {
          link.crossOrigin = config.crossOrigin;
        }
        break;
      case 'image':
        link.as = 'image';
        break;
    }

    // Set priority hint if supported
    if ('importance' in link) {
      (link as HTMLLinkElement & { importance?: string }).importance = config.priority;
    }

    link.onload = () => {
      this.preloadedResources.add(config.url);
      console.log(`✅ Preloaded resource: ${config.url}`);
    };

    link.onerror = () => {
      console.warn(`❌ Failed to preload resource: ${config.url}`);
    };

    document.head.appendChild(link);

    console.log(`🔄 Preloading resource: ${config.url} (${config.type}, ${config.priority})`);
  }

  /**
   * Setup lazy loading observer for components
   */
  private setupLazyLoadingObserver(): void {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported, lazy loading disabled');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const componentName = entry.target.getAttribute('data-lazy-component');
            if (componentName && this.lazyComponents.has(componentName)) {
              this.preloadComponent(componentName);
              observer.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before component comes into view
        threshold: 0.1,
      }
    );

    // Store observer for later use
    this.lazyLoadingObserver = observer;
  }

  /**
   * Setup resource hints for better loading performance
   */
  private setupResourceHints(): void {
    // DNS prefetch for external resources
    const dnsPrefetchDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'cdnjs.cloudflare.com',
    ];

    dnsPrefetchDomains.forEach((domain) => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });

    // Preconnect to critical domains
    const preconnectDomains = ['fonts.googleapis.com'];

    preconnectDomains.forEach((domain) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = `https://${domain}`;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  /**
   * Optimize bundle loading sequence
   */
  optimizeBundleLoading(): void {
    if (!this.config.preloadCriticalChunks) return;

    // Get critical chunks from webpack manifest or similar
    const criticalChunks = this.getCriticalChunks();

    criticalChunks.forEach((chunk) => {
      this.preloadResource({
        url: chunk.url,
        type: 'script',
        priority: chunk.priority,
      });
    });
  }

  private getCriticalChunks(): Array<{ url: string; priority: 'high' | 'medium' | 'low' }> {
    // In a real implementation, this would read from webpack manifest
    // For now, return common critical chunks
    return [
      { url: '/dist/vendor.js', priority: 'high' },
      { url: '/dist/common.js', priority: 'high' },
      { url: '/dist/popup.js', priority: 'medium' },
      { url: '/dist/options.js', priority: 'low' },
    ];
  }

  /**
   * Estimate bundle size for metrics
   */
  private estimateBundleSize(importPath: string): number {
    // In a real implementation, this would use webpack stats or similar
    // For now, return estimated sizes based on component type
    const sizeEstimates: Record<string, number> = {
      popup: 50 * 1024, // 50KB
      options: 80 * 1024, // 80KB
      chat: 30 * 1024, // 30KB
      overlay: 20 * 1024, // 20KB
    };

    for (const [key, size] of Object.entries(sizeEstimates)) {
      if (importPath.includes(key)) {
        return size;
      }
    }

    return 25 * 1024; // Default 25KB
  }

  /**
   * Record loading metrics
   */
  private recordLoadingMetrics(metrics: LoadingOptimizationMetrics): void {
    this.metrics.push(metrics);

    // Limit stored metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50);
    }

    // Log performance insights
    if (metrics.loadTime > 1000) {
      console.warn(
        `Slow component load: ${metrics.componentName} (${metrics.loadTime.toFixed(2)}ms)`
      );
    }

    if (metrics.bundleSize > this.config.chunkSizeLimit) {
      console.warn(
        `Large bundle size: ${metrics.componentName} (${(metrics.bundleSize / 1024).toFixed(2)}KB)`
      );
    }
  }

  /**
   * Get loading optimization metrics
   */
  getOptimizationMetrics(): {
    totalComponents: number;
    averageLoadTime: number;
    cacheHitRate: number;
    preloadedComponents: number;
    lazyLoadedComponents: number;
    totalBundleSize: number;
    errorRate: number;
  } {
    const totalComponents = this.metrics.length;

    if (totalComponents === 0) {
      return {
        totalComponents: 0,
        averageLoadTime: 0,
        cacheHitRate: 0,
        preloadedComponents: 0,
        lazyLoadedComponents: 0,
        totalBundleSize: 0,
        errorRate: 0,
      };
    }

    const totalLoadTime = this.metrics.reduce((sum, m) => sum + m.loadTime, 0);
    const averageLoadTime = totalLoadTime / totalComponents;

    const cacheHits = this.metrics.filter((m) => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalComponents) * 100;

    const preloadedComponents = this.metrics.filter((m) => m.preloaded).length;
    const lazyLoadedComponents = this.metrics.filter((m) => m.lazyLoaded).length;

    const totalBundleSize = this.metrics.reduce((sum, m) => sum + m.bundleSize, 0);

    const componentsWithErrors = this.metrics.filter((m) => m.errors.length > 0).length;
    const errorRate = (componentsWithErrors / totalComponents) * 100;

    return {
      totalComponents,
      averageLoadTime,
      cacheHitRate,
      preloadedComponents,
      lazyLoadedComponents,
      totalBundleSize,
      errorRate,
    };
  }

  /**
   * Clear component cache
   */
  clearCache(): void {
    this.componentCache.clear();
    this.preloadedResources.clear();
    this.loadingPromises.clear();
    this.preloadPromises.clear();
    console.log('🧹 Component cache cleared');
  }

  /**
   * Update optimization configuration
   */
  updateConfig(newConfig: Partial<BundleOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Optimization config updated:', newConfig);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedComponents: number;
    preloadedResources: number;
    activePromises: number;
    cacheHitRate: number;
  } {
    const cacheHits = this.metrics.filter((m) => m.cacheHit).length;
    const totalRequests = this.metrics.length;
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

    return {
      cachedComponents: this.componentCache.size,
      preloadedResources: this.preloadedResources.size,
      activePromises: this.loadingPromises.size + this.preloadPromises.size,
      cacheHitRate,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearCache();
    this.metrics = [];

    // Disconnect lazy loading observer
    if (this.lazyLoadingObserver) {
      this.lazyLoadingObserver.disconnect();
    }

    console.log('🧹 Component loading optimizer destroyed');
  }
}

// Singleton instance
let componentOptimizer: ComponentLoadingOptimizer | null = null;

export function getComponentLoadingOptimizer(): ComponentLoadingOptimizer {
  if (!componentOptimizer) {
    componentOptimizer = new ComponentLoadingOptimizer();
  }
  return componentOptimizer;
}

export function createComponentLoadingOptimizer(
  config?: Partial<BundleOptimizationConfig>
): ComponentLoadingOptimizer {
  return new ComponentLoadingOptimizer(config);
}

export { ComponentLoadingOptimizer };
