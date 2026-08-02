/**
 * Bundle Size Analyzer
 * Analyzes and reports on bundle sizes and loading performance
 * Requirements: 1.1, 2.1, 1.4, 2.4
 */

export interface BundleInfo {
  name: string;
  size: number;
  gzippedSize?: number;
  loadTime: number;
  cached: boolean;
  dependencies: string[];
  chunks: string[];
}

export interface BundleAnalysis {
  totalSize: number;
  totalGzippedSize: number;
  totalLoadTime: number;
  largestBundles: BundleInfo[];
  slowestBundles: BundleInfo[];
  duplicatedDependencies: string[];
  recommendations: string[];
  cacheEfficiency: number;
}

export interface PerformanceThresholds {
  maxBundleSize: number; // bytes
  maxLoadTime: number; // milliseconds
  maxTotalSize: number; // bytes
  targetCacheHitRate: number; // percentage
}

class BundleAnalyzer {
  private bundles: Map<string, BundleInfo> = new Map();
  private loadTimes: Map<string, number[]> = new Map();
  private thresholds: PerformanceThresholds;
  private performanceObserver: PerformanceObserver | null = null;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxBundleSize: 250 * 1024, // 250KB
      maxLoadTime: 2000, // 2 seconds
      maxTotalSize: 1024 * 1024, // 1MB
      targetCacheHitRate: 80, // 80%
      ...thresholds,
    };

    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceResourceTiming[];
          entries.forEach((entry) => {
            if (this.isJavaScriptBundle(entry.name)) {
              this.recordBundleLoad(entry);
            }
          });
        });

        this.performanceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Bundle monitoring not available:', error);
      }
    }

    // Monitor webpack chunks if available
    this.monitorWebpackChunks();
  }

  private isJavaScriptBundle(url: string): boolean {
    return (
      url.includes('.js') &&
      (url.includes('/dist/') ||
        url.includes('/build/') ||
        url.includes('chunk') ||
        url.includes('bundle'))
    );
  }

  private recordBundleLoad(entry: PerformanceResourceTiming): void {
    const bundleName = this.extractBundleName(entry.name);
    const loadTime = entry.duration;
    const size = entry.transferSize || 0;
    const cached = entry.transferSize === 0 && entry.decodedBodySize > 0;

    // Record load time for averaging
    if (!this.loadTimes.has(bundleName)) {
      this.loadTimes.set(bundleName, []);
    }
    this.loadTimes.get(bundleName)!.push(loadTime);

    // Update or create bundle info
    const existingBundle = this.bundles.get(bundleName);
    const bundleInfo: BundleInfo = {
      name: bundleName,
      size: size || existingBundle?.size || 0,
      loadTime: this.calculateAverageLoadTime(bundleName),
      cached,
      dependencies: existingBundle?.dependencies || [],
      chunks: existingBundle?.chunks || [],
    };

    this.bundles.set(bundleName, bundleInfo);

    console.debug(`📦 Bundle loaded: ${bundleName}`, {
      size: `${(size / 1024).toFixed(2)}KB`,
      loadTime: `${loadTime.toFixed(2)}ms`,
      cached,
    });

    // Check for performance issues
    this.checkBundlePerformance(bundleInfo);
  }

  private extractBundleName(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];

    // Remove hash and extension
    return filename.replace(/\.[a-f0-9]{8,}\./g, '.').replace(/\.(js|css)$/, '');
  }

  private calculateAverageLoadTime(bundleName: string): number {
    const times = this.loadTimes.get(bundleName) || [];
    if (times.length === 0) return 0;

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private checkBundlePerformance(bundle: BundleInfo): void {
    const issues: string[] = [];

    if (bundle.size > this.thresholds.maxBundleSize) {
      issues.push(`Large bundle size: ${(bundle.size / 1024).toFixed(2)}KB`);
    }

    if (bundle.loadTime > this.thresholds.maxLoadTime) {
      issues.push(`Slow load time: ${bundle.loadTime.toFixed(2)}ms`);
    }

    if (issues.length > 0) {
      console.warn(`⚠️ Bundle performance issues - ${bundle.name}:`, issues);
    }
  }

  private monitorWebpackChunks(): void {
    // Monitor webpack chunk loading if __webpack_require__ is available
    if (typeof window !== 'undefined' && (window as any).__webpack_require__) {
      const webpackRequire = (window as any).__webpack_require__;

      // Hook into chunk loading
      if (webpackRequire.e) {
        const originalEnsure = webpackRequire.e;
        webpackRequire.e = (chunkId: string) => {
          const startTime = performance.now();

          return originalEnsure(chunkId).then(
            (result: any) => {
              const loadTime = performance.now() - startTime;
              this.recordChunkLoad(chunkId, loadTime, true);
              return result;
            },
            (error: any) => {
              const loadTime = performance.now() - startTime;
              this.recordChunkLoad(chunkId, loadTime, false);
              throw error;
            }
          );
        };
      }
    }
  }

  private recordChunkLoad(chunkId: string, loadTime: number, success: boolean): void {
    console.debug(
      `📦 Webpack chunk ${success ? 'loaded' : 'failed'}: ${chunkId} (${loadTime.toFixed(2)}ms)`
    );

    // Update bundle info if we can map chunk to bundle
    const bundleName = `chunk-${chunkId}`;
    const existingBundle = this.bundles.get(bundleName);

    if (existingBundle) {
      existingBundle.loadTime = loadTime;
      existingBundle.chunks.push(chunkId);
    } else {
      this.bundles.set(bundleName, {
        name: bundleName,
        size: 0, // Size will be updated by resource timing
        loadTime,
        cached: false,
        dependencies: [],
        chunks: [chunkId],
      });
    }
  }

  /**
   * Analyze current bundle performance
   */
  analyzeBundles(): BundleAnalysis {
    const bundles = Array.from(this.bundles.values());

    const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
    const totalGzippedSize = bundles.reduce(
      (sum, bundle) => sum + (bundle.gzippedSize || bundle.size * 0.3),
      0
    );
    const totalLoadTime = bundles.reduce((sum, bundle) => sum + bundle.loadTime, 0);

    // Find largest bundles
    const largestBundles = bundles.sort((a, b) => b.size - a.size).slice(0, 5);

    // Find slowest bundles
    const slowestBundles = bundles.sort((a, b) => b.loadTime - a.loadTime).slice(0, 5);

    // Find duplicated dependencies
    const allDependencies = bundles.flatMap((bundle) => bundle.dependencies);
    const dependencyCounts = allDependencies.reduce(
      (counts, dep) => {
        counts[dep] = (counts[dep] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );

    const duplicatedDependencies = Object.entries(dependencyCounts)
      .filter(([, count]) => count > 1)
      .map(([dep]) => dep);

    // Calculate cache efficiency
    const cachedBundles = bundles.filter((bundle) => bundle.cached).length;
    const cacheEfficiency = bundles.length > 0 ? (cachedBundles / bundles.length) * 100 : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      totalSize,
      totalGzippedSize,
      totalLoadTime,
      largestBundles,
      slowestBundles,
      duplicatedDependencies,
      cacheEfficiency,
    });

    return {
      totalSize,
      totalGzippedSize,
      totalLoadTime,
      largestBundles,
      slowestBundles,
      duplicatedDependencies,
      recommendations,
      cacheEfficiency,
    };
  }

  private generateRecommendations(analysis: Omit<BundleAnalysis, 'recommendations'>): string[] {
    const recommendations: string[] = [];

    // Size recommendations
    if (analysis.totalSize > this.thresholds.maxTotalSize) {
      recommendations.push(
        `Total bundle size (${(analysis.totalSize / 1024).toFixed(2)}KB) exceeds recommended limit. Consider code splitting.`
      );
    }

    // Large bundle recommendations
    analysis.largestBundles.forEach((bundle) => {
      if (bundle.size > this.thresholds.maxBundleSize) {
        recommendations.push(
          `Bundle "${bundle.name}" is large (${(bundle.size / 1024).toFixed(2)}KB). Consider splitting or lazy loading.`
        );
      }
    });

    // Slow loading recommendations
    analysis.slowestBundles.forEach((bundle) => {
      if (bundle.loadTime > this.thresholds.maxLoadTime) {
        recommendations.push(
          `Bundle "${bundle.name}" loads slowly (${bundle.loadTime.toFixed(2)}ms). Check network conditions or bundle size.`
        );
      }
    });

    // Duplication recommendations
    if (analysis.duplicatedDependencies.length > 0) {
      recommendations.push(
        `Found ${analysis.duplicatedDependencies.length} duplicated dependencies. Consider using a common chunk.`
      );
    }

    // Cache recommendations
    if (analysis.cacheEfficiency < this.thresholds.targetCacheHitRate) {
      recommendations.push(
        `Cache hit rate (${analysis.cacheEfficiency.toFixed(1)}%) is below target. Consider improving cache headers or bundle naming.`
      );
    }

    // Compression recommendations
    const compressionRatio = analysis.totalGzippedSize / analysis.totalSize;
    if (compressionRatio > 0.7) {
      recommendations.push(
        'Poor compression ratio detected. Ensure gzip/brotli compression is enabled on the server.'
      );
    }

    return recommendations;
  }

  /**
   * Get bundle information for a specific bundle
   */
  getBundleInfo(bundleName: string): BundleInfo | null {
    return this.bundles.get(bundleName) || null;
  }

  /**
   * Get all tracked bundles
   */
  getAllBundles(): BundleInfo[] {
    return Array.from(this.bundles.values());
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    bundleCount: number;
    totalSize: string;
    averageLoadTime: number;
    cacheHitRate: number;
    performanceScore: number;
  } {
    const bundles = this.getAllBundles();
    const analysis = this.analyzeBundles();

    const averageLoadTime =
      bundles.length > 0
        ? bundles.reduce((sum, bundle) => sum + bundle.loadTime, 0) / bundles.length
        : 0;

    // Calculate performance score (0-100)
    let score = 100;

    // Deduct points for large total size
    if (analysis.totalSize > this.thresholds.maxTotalSize) {
      score -= 20;
    }

    // Deduct points for slow loading
    if (averageLoadTime > this.thresholds.maxLoadTime) {
      score -= 20;
    }

    // Deduct points for poor cache efficiency
    if (analysis.cacheEfficiency < this.thresholds.targetCacheHitRate) {
      score -= 15;
    }

    // Deduct points for duplicated dependencies
    if (analysis.duplicatedDependencies.length > 0) {
      score -= Math.min(25, analysis.duplicatedDependencies.length * 5);
    }

    // Deduct points for large individual bundles
    const largeBundles = bundles.filter((bundle) => bundle.size > this.thresholds.maxBundleSize);
    if (largeBundles.length > 0) {
      score -= Math.min(20, largeBundles.length * 5);
    }

    return {
      bundleCount: bundles.length,
      totalSize: `${(analysis.totalSize / 1024).toFixed(2)}KB`,
      averageLoadTime,
      cacheHitRate: analysis.cacheEfficiency,
      performanceScore: Math.max(0, score),
    };
  }

  /**
   * Export analysis data
   */
  exportAnalysis(): {
    timestamp: number;
    analysis: BundleAnalysis;
    summary: ReturnType<BundleAnalyzer['getPerformanceSummary']>;
    thresholds: PerformanceThresholds;
  } {
    return {
      timestamp: Date.now(),
      analysis: this.analyzeBundles(),
      summary: this.getPerformanceSummary(),
      thresholds: this.thresholds,
    };
  }

  /**
   * Clear all bundle data
   */
  clearData(): void {
    this.bundles.clear();
    this.loadTimes.clear();
    console.log('🧹 Bundle analyzer data cleared');
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('🔧 Bundle analyzer thresholds updated:', newThresholds);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.clearData();
  }
}

// Singleton instance
let bundleAnalyzer: BundleAnalyzer | null = null;

export function getBundleAnalyzer(): BundleAnalyzer {
  if (!bundleAnalyzer) {
    bundleAnalyzer = new BundleAnalyzer();
  }
  return bundleAnalyzer;
}

export function createBundleAnalyzer(thresholds?: Partial<PerformanceThresholds>): BundleAnalyzer {
  return new BundleAnalyzer(thresholds);
}

export { BundleAnalyzer };
