/**
 * Performance Metrics Collector
 * Comprehensive performance monitoring for extension loading and runtime
 * Requirements: 3.4, 1.4, 2.4
 */

export interface ComponentLoadingStage {
  stage: 'html' | 'javascript' | 'react' | 'components' | 'ready';
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: MemoryUsage;
  errors?: string[];
}

export interface MemoryUsage {
  used: number;
  total: number;
  limit?: number;
  percentage: number;
}

export interface NetworkMetrics {
  requestUrl: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  statusCode?: number;
  responseSize?: number;
  errorMessage?: string;
}

export interface ComponentPerformanceMetrics {
  componentName: string;
  loadingStages: ComponentLoadingStage[];
  totalLoadTime: number;
  memoryPeak: MemoryUsage;
  networkRequests: NetworkMetrics[];
  renderTime?: number;
  mountTime?: number;
  updateCount: number;
  errorCount: number;
  retryCount: number;
}

export interface SystemPerformanceMetrics {
  timestamp: number;
  sessionId: string;
  cpuUsage?: number;
  memoryUsage: MemoryUsage;
  networkLatency?: number;
  frameRate?: number;
  batteryLevel?: number;
  thermalState?: string;
}

export interface PerformanceThresholds {
  maxLoadTime: number; // milliseconds
  maxMemoryUsage: number; // percentage
  maxNetworkLatency: number; // milliseconds
  minFrameRate: number; // fps
}

class PerformanceMetricsCollector {
  private componentMetrics: Map<string, ComponentPerformanceMetrics> = new Map();
  private systemMetrics: SystemPerformanceMetrics[] = [];
  private networkObserver: PerformanceObserver | null = null;
  private memoryObserver: PerformanceObserver | null = null;
  private frameRateMonitor: number | null = null;
  private sessionId: string;
  private startTime: number;

  private readonly thresholds: PerformanceThresholds = {
    maxLoadTime: 5000, // 5 seconds
    maxMemoryUsage: 80, // 80%
    maxNetworkLatency: 2000, // 2 seconds
    minFrameRate: 30, // 30 fps
  };

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = PerformanceMetricsCollector.now();
    this.initializeMonitoring();
  }

  /**
   * Safe timing helper that falls back to Date.now() when the Performance API
   * is unavailable (e.g. some test environments or restricted contexts).
   */
  static now(): number {
    try {
      const perf = (globalThis as { performance?: { now?: () => number } }).performance;
      return perf && typeof perf.now === 'function' ? perf.now() : Date.now();
    } catch {
      return Date.now();
    }
  }

  private initializeMonitoring(): void {
    this.setupNetworkMonitoring();
    this.setupMemoryMonitoring();
    this.setupFrameRateMonitoring();
    this.startSystemMetricsCollection();
  }

  private setupNetworkMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.networkObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceResourceTiming[];
          entries.forEach((entry) => this.processNetworkEntry(entry));
        });

        this.networkObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Network monitoring not available:', error);
      }
    }
  }

  private setupMemoryMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.memoryObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'measure' && entry.name.includes('memory')) {
              this.processMemoryEntry(entry);
            }
          });
        });

        this.memoryObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Memory monitoring not available:', error);
      }
    }
  }

  private setupFrameRateMonitoring(): void {
    let frameCount = 0;
    let lastTime = PerformanceMetricsCollector.now();
    let frameRate = 0;

    const measureFrameRate = () => {
      frameCount++;
      const currentTime = PerformanceMetricsCollector.now();

      if (currentTime - lastTime >= 1000) {
        frameRate = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;

        // Store frame rate in system metrics
        this.recordFrameRate(frameRate);
      }

      this.frameRateMonitor = requestAnimationFrame(measureFrameRate);
    };

    this.frameRateMonitor = requestAnimationFrame(measureFrameRate);
  }

  private startSystemMetricsCollection(): void {
    const collectSystemMetrics = () => {
      const metrics: SystemPerformanceMetrics = {
        timestamp: Date.now(),
        sessionId: this.sessionId,
        memoryUsage: this.getCurrentMemoryUsage(),
        networkLatency: this.measureNetworkLatency(),
      };

      // Add battery and thermal info if available
      if ('getBattery' in navigator) {
        (navigator as any)
          .getBattery()
          .then((battery: any) => {
            metrics.batteryLevel = Math.round(battery.level * 100);
          })
          .catch(() => {
            // Battery API not available
          });
      }

      this.systemMetrics.push(metrics);

      // Limit stored metrics to prevent memory issues
      if (this.systemMetrics.length > 100) {
        this.systemMetrics = this.systemMetrics.slice(-50);
      }
    };

    // Collect system metrics every 5 seconds
    setInterval(collectSystemMetrics, 5000);

    // Initial collection
    collectSystemMetrics();
  }

  private processNetworkEntry(entry: PerformanceResourceTiming): void {
    const networkMetric: NetworkMetrics = {
      requestUrl: entry.name,
      method: 'GET', // Default, actual method not available in PerformanceResourceTiming
      startTime: entry.startTime,
      endTime: entry.responseEnd,
      duration: entry.duration,
      success: entry.responseEnd > 0,
      responseSize: entry.transferSize,
    };

    // Add to current component metrics if tracking
    const currentComponent = this.getCurrentTrackingComponent();
    if (currentComponent) {
      currentComponent.networkRequests.push(networkMetric);
    }

    // Log slow network requests
    if (networkMetric.duration > this.thresholds.maxNetworkLatency) {
      console.warn(
        `Slow network request detected: ${entry.name} (${networkMetric.duration.toFixed(2)}ms)`
      );
    }
  }

  private processMemoryEntry(entry: PerformanceEntry): void {
    const memoryUsage = this.getCurrentMemoryUsage();

    // Update peak memory for current component
    const currentComponent = this.getCurrentTrackingComponent();
    if (currentComponent && memoryUsage.percentage > currentComponent.memoryPeak.percentage) {
      currentComponent.memoryPeak = memoryUsage;
    }
  }

  private recordFrameRate(frameRate: number): void {
    const latestMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    if (latestMetrics) {
      latestMetrics.frameRate = frameRate;
    }

    // Warn about low frame rate
    if (frameRate < this.thresholds.minFrameRate) {
      console.warn(`Low frame rate detected: ${frameRate} fps`);
    }
  }

  private getCurrentMemoryUsage(): MemoryUsage {
    const perf = (globalThis as { performance?: { memory?: any } }).performance;
    if (perf && 'memory' in perf) {
      const memory = perf.memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const limit = memory.jsHeapSizeLimit;

      return {
        used,
        total,
        limit,
        percentage: limit ? Math.round((used / limit) * 100) : 0,
      };
    }

    return {
      used: 0,
      total: 0,
      percentage: 0,
    };
  }

  private measureNetworkLatency(): number | undefined {
    // Use navigation timing to estimate network latency
    const perf = (globalThis as { performance?: { timing?: any } }).performance;
    if (perf && perf.timing) {
      const timing = perf.timing;
      return timing.responseStart - timing.requestStart;
    }
    return undefined;
  }

  private getCurrentTrackingComponent(): ComponentPerformanceMetrics | undefined {
    // Find the component currently being tracked (last one without ready stage)
    for (const [, metrics] of this.componentMetrics) {
      const hasReadyStage = metrics.loadingStages.some((stage) => stage.stage === 'ready');
      if (!hasReadyStage) {
        return metrics;
      }
    }
    return undefined;
  }

  startComponentTracking(componentName: string): void {
    const metrics: ComponentPerformanceMetrics = {
      componentName,
      loadingStages: [],
      totalLoadTime: 0,
      memoryPeak: this.getCurrentMemoryUsage(),
      networkRequests: [],
      updateCount: 0,
      errorCount: 0,
      retryCount: 0,
    };

    this.componentMetrics.set(componentName, metrics);

    // Start with HTML stage
    this.startLoadingStage(componentName, 'html');

    console.log(`📊 Started performance tracking for: ${componentName}`);
  }

  startLoadingStage(componentName: string, stage: ComponentLoadingStage['stage']): void {
    const metrics = this.componentMetrics.get(componentName);
    if (!metrics) {
      console.warn(`No metrics found for component: ${componentName}`);
      return;
    }

    // End previous stage if exists
    const lastStage = metrics.loadingStages[metrics.loadingStages.length - 1];
    if (lastStage && !lastStage.endTime) {
      this.endLoadingStage(componentName);
    }

    const stageMetrics: ComponentLoadingStage = {
      stage,
      startTime: PerformanceMetricsCollector.now(),
      memoryUsage: this.getCurrentMemoryUsage(),
      errors: [],
    };

    metrics.loadingStages.push(stageMetrics);

    console.log(`⏱️ Started ${stage} stage for: ${componentName}`);
  }

  endLoadingStage(componentName: string, error?: string): void {
    const metrics = this.componentMetrics.get(componentName);
    if (!metrics) return;

    const lastStage = metrics.loadingStages[metrics.loadingStages.length - 1];
    if (!lastStage || lastStage.endTime) return;

    lastStage.endTime = PerformanceMetricsCollector.now();
    lastStage.duration = lastStage.endTime - lastStage.startTime;

    if (error) {
      lastStage.errors = lastStage.errors || [];
      lastStage.errors.push(error);
      metrics.errorCount++;
    }

    console.log(
      `⏱️ Completed ${lastStage.stage} stage for: ${componentName} (${lastStage.duration.toFixed(2)}ms)`
    );

    // Check for performance issues
    this.checkPerformanceThresholds(componentName, lastStage);
  }

  finishComponentTracking(
    componentName: string,
    success: boolean
  ): ComponentPerformanceMetrics | null {
    const metrics = this.componentMetrics.get(componentName);
    if (!metrics) return null;

    // End current stage and add ready stage
    this.endLoadingStage(componentName);

    if (success) {
      this.startLoadingStage(componentName, 'ready');
      this.endLoadingStage(componentName);
    }

    // Calculate total load time
    const firstStage = metrics.loadingStages[0];
    const lastStage = metrics.loadingStages[metrics.loadingStages.length - 1];

    if (firstStage && lastStage && lastStage.endTime) {
      metrics.totalLoadTime = lastStage.endTime - firstStage.startTime;
    }

    console.group(`📊 Performance Summary - ${componentName}`);
    console.log('Total Load Time:', metrics.totalLoadTime.toFixed(2), 'ms');
    console.log(
      'Memory Peak:',
      `${(metrics.memoryPeak.used / 1024 / 1024).toFixed(2)} MB (${metrics.memoryPeak.percentage}%)`
    );
    console.log('Network Requests:', metrics.networkRequests.length);
    console.log('Errors:', metrics.errorCount);
    console.log(
      'Stages:',
      metrics.loadingStages.map((s) => `${s.stage}: ${s.duration?.toFixed(2)}ms`)
    );
    console.groupEnd();

    return metrics;
  }

  recordComponentUpdate(componentName: string): void {
    const metrics = this.componentMetrics.get(componentName);
    if (metrics) {
      metrics.updateCount++;
    }
  }

  recordComponentError(componentName: string, error: string): void {
    const metrics = this.componentMetrics.get(componentName);
    if (metrics) {
      metrics.errorCount++;

      // Add error to current stage
      const currentStage = metrics.loadingStages[metrics.loadingStages.length - 1];
      if (currentStage && !currentStage.endTime) {
        currentStage.errors = currentStage.errors || [];
        currentStage.errors.push(error);
      }
    }
  }

  recordComponentRetry(componentName: string): void {
    const metrics = this.componentMetrics.get(componentName);
    if (metrics) {
      metrics.retryCount++;
    }
  }

  private checkPerformanceThresholds(componentName: string, stage: ComponentLoadingStage): void {
    if (!stage.duration) return;

    const warnings: string[] = [];

    // Check load time threshold
    if (stage.duration > this.thresholds.maxLoadTime) {
      warnings.push(
        `Slow ${stage.stage} stage: ${stage.duration.toFixed(2)}ms (threshold: ${this.thresholds.maxLoadTime}ms)`
      );
    }

    // Check memory usage threshold
    if (stage.memoryUsage && stage.memoryUsage.percentage > this.thresholds.maxMemoryUsage) {
      warnings.push(
        `High memory usage in ${stage.stage} stage: ${stage.memoryUsage.percentage}% (threshold: ${this.thresholds.maxMemoryUsage}%)`
      );
    }

    // Log warnings
    if (warnings.length > 0) {
      console.group(`⚠️ Performance Issues - ${componentName}`);
      warnings.forEach((warning) => console.warn(warning));
      console.groupEnd();
    }
  }

  getComponentMetrics(componentName: string): ComponentPerformanceMetrics | undefined {
    return this.componentMetrics.get(componentName);
  }

  getAllComponentMetrics(): ComponentPerformanceMetrics[] {
    return Array.from(this.componentMetrics.values());
  }

  getSystemMetrics(): SystemPerformanceMetrics[] {
    return [...this.systemMetrics];
  }

  getPerformanceSummary(): {
    totalComponents: number;
    averageLoadTime: number;
    totalErrors: number;
    memoryPeak: MemoryUsage;
    networkRequestCount: number;
    performanceIssues: string[];
  } {
    const components = this.getAllComponentMetrics();
    const totalComponents = components.length;

    const totalLoadTime = components.reduce((sum, comp) => sum + comp.totalLoadTime, 0);
    const averageLoadTime = totalComponents > 0 ? totalLoadTime / totalComponents : 0;

    const totalErrors = components.reduce((sum, comp) => sum + comp.errorCount, 0);

    const networkRequestCount = components.reduce(
      (sum, comp) => sum + comp.networkRequests.length,
      0
    );

    // Find memory peak across all components
    let memoryPeak: MemoryUsage = { used: 0, total: 0, percentage: 0 };
    components.forEach((comp) => {
      if (comp.memoryPeak.percentage > memoryPeak.percentage) {
        memoryPeak = comp.memoryPeak;
      }
    });

    // Identify performance issues
    const performanceIssues: string[] = [];

    if (averageLoadTime > this.thresholds.maxLoadTime) {
      performanceIssues.push(
        `Average load time exceeds threshold: ${averageLoadTime.toFixed(2)}ms`
      );
    }

    if (memoryPeak.percentage > this.thresholds.maxMemoryUsage) {
      performanceIssues.push(`Memory usage exceeds threshold: ${memoryPeak.percentage}%`);
    }

    if (totalErrors > 0) {
      performanceIssues.push(`${totalErrors} errors detected across components`);
    }

    const latestSystemMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    if (
      latestSystemMetrics?.frameRate &&
      latestSystemMetrics.frameRate < this.thresholds.minFrameRate
    ) {
      performanceIssues.push(`Low frame rate: ${latestSystemMetrics.frameRate} fps`);
    }

    return {
      totalComponents,
      averageLoadTime,
      totalErrors,
      memoryPeak,
      networkRequestCount,
      performanceIssues,
    };
  }

  exportMetrics(): {
    sessionId: string;
    sessionDuration: number;
    componentMetrics: ComponentPerformanceMetrics[];
    systemMetrics: SystemPerformanceMetrics[];
    summary: ReturnType<PerformanceMetricsCollector['getPerformanceSummary']>;
  } {
    return {
      sessionId: this.sessionId,
      sessionDuration: PerformanceMetricsCollector.now() - this.startTime,
      componentMetrics: this.getAllComponentMetrics(),
      systemMetrics: this.getSystemMetrics(),
      summary: this.getPerformanceSummary(),
    };
  }

  clearMetrics(): void {
    this.componentMetrics.clear();
    this.systemMetrics = [];
    console.log('🧹 Performance metrics cleared');
  }

  destroy(): void {
    if (this.networkObserver) {
      this.networkObserver.disconnect();
    }

    if (this.memoryObserver) {
      this.memoryObserver.disconnect();
    }

    if (this.frameRateMonitor) {
      cancelAnimationFrame(this.frameRateMonitor);
    }

    this.clearMetrics();
  }
}

// Singleton instance
let performanceCollector: PerformanceMetricsCollector | null = null;

export function getPerformanceMetricsCollector(): PerformanceMetricsCollector {
  if (!performanceCollector) {
    const sessionId = `perf-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    performanceCollector = new PerformanceMetricsCollector(sessionId);
  }
  return performanceCollector;
}

export function createPerformanceMetricsCollector(sessionId?: string): PerformanceMetricsCollector {
  const id = sessionId || `perf-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return new PerformanceMetricsCollector(id);
}

export { PerformanceMetricsCollector };
