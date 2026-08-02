/**
 * Resource Monitor - Monitors and optimizes memory usage and resource cleanup
 * Requirements: 2.1, 2.2, 2.3
 */

import { ResourceUsageMetrics, MemoryCleanupTask, PerformanceOptimizationConfig } from './types';

export class ResourceMonitor {
  private config: PerformanceOptimizationConfig;
  private cleanupTasks: MemoryCleanupTask[] = [];
  private monitoringTimer: number | null = null;
  private cleanupTimer: number | null = null;
  private onResourceUpdate?: (metrics: ResourceUsageMetrics) => void;

  // Resource tracking
  private trackedTimers = new Set<number>();
  private trackedIntervals = new Set<number>();
  private trackedEventListeners = new Map<EventTarget, Map<string, Function[]>>();
  private trackedWebSockets = new Set<WebSocket>();

  constructor(
    config: PerformanceOptimizationConfig,
    onResourceUpdate?: (metrics: ResourceUsageMetrics) => void
  ) {
    this.config = config;
    this.onResourceUpdate = onResourceUpdate;

    this.setupDefaultCleanupTasks();
    this.interceptResourceCreation();
  }

  /**
   * Start resource monitoring
   */
  start(): void {
    if (!this.config.resourceCleanupEnabled) {
      return;
    }

    this.stop(); // Clear any existing timers

    // Start monitoring
    this.monitoringTimer = window.setInterval(() => {
      const metrics = this.collectResourceMetrics();
      if (this.onResourceUpdate) {
        this.onResourceUpdate(metrics);
      }
    }, this.config.diagnosticsInterval);

    // Start cleanup tasks
    this.cleanupTimer = window.setInterval(() => {
      this.runCleanupTasks();
    }, 30000); // Run cleanup every 30 seconds

    console.log('Resource monitor started');
  }

  /**
   * Stop resource monitoring
   */
  stop(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    console.log('Resource monitor stopped');
  }

  /**
   * Add a cleanup task
   */
  addCleanupTask(task: MemoryCleanupTask): void {
    this.cleanupTasks.push(task);
    console.log(`Added cleanup task: ${task.name}`);
  }

  /**
   * Remove a cleanup task
   */
  removeCleanupTask(taskName: string): void {
    const index = this.cleanupTasks.findIndex((task) => task.name === taskName);
    if (index !== -1) {
      this.cleanupTasks.splice(index, 1);
      console.log(`Removed cleanup task: ${taskName}`);
    }
  }

  /**
   * Force run all cleanup tasks
   */
  async forceCleanup(): Promise<void> {
    console.log('Running forced cleanup...');
    await this.runCleanupTasks();
  }

  /**
   * Get current resource usage metrics
   */
  collectResourceMetrics(): ResourceUsageMetrics {
    const metrics: ResourceUsageMetrics = {
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: 0, // CPU usage not available in browser
      domNodes: this.getDOMNodeCount(),
      eventListeners: this.getEventListenerCount(),
      timers: this.getTimerCount(),
      webSocketConnections: this.trackedWebSockets.size,
    };

    return metrics;
  }

  /**
   * Check if resources are within acceptable limits
   */
  areResourcesHealthy(): boolean {
    const metrics = this.collectResourceMetrics();

    // Define thresholds
    const maxMemoryMB = 100; // 100MB
    const maxDOMNodes = 10000;
    const maxEventListeners = 1000;
    const maxTimers = 100;

    return (
      metrics.memoryUsage < maxMemoryMB * 1024 * 1024 &&
      metrics.domNodes < maxDOMNodes &&
      metrics.eventListeners < maxEventListeners &&
      metrics.timers < maxTimers
    );
  }

  /**
   * Get resource usage warnings
   */
  getResourceWarnings(): string[] {
    const metrics = this.collectResourceMetrics();
    const warnings: string[] = [];

    if (metrics.memoryUsage > 50 * 1024 * 1024) {
      // 50MB
      warnings.push(`High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }

    if (metrics.domNodes > 5000) {
      warnings.push(`High DOM node count: ${metrics.domNodes}`);
    }

    if (metrics.eventListeners > 500) {
      warnings.push(`High event listener count: ${metrics.eventListeners}`);
    }

    if (metrics.timers > 50) {
      warnings.push(`High timer count: ${metrics.timers}`);
    }

    if (metrics.webSocketConnections > 5) {
      warnings.push(`Multiple WebSocket connections: ${metrics.webSocketConnections}`);
    }

    return warnings;
  }

  /**
   * Update configuration
   */
  updateConfig(config: PerformanceOptimizationConfig): void {
    const wasEnabled = this.config.resourceCleanupEnabled;
    this.config = config;

    if (config.resourceCleanupEnabled && !wasEnabled) {
      this.start();
    } else if (!config.resourceCleanupEnabled && wasEnabled) {
      this.stop();
    }
  }

  /**
   * Clean up all tracked resources
   */
  destroy(): void {
    this.stop();

    // Clean up tracked timers
    this.trackedTimers.forEach((id) => clearTimeout(id));
    this.trackedIntervals.forEach((id) => clearInterval(id));

    // Clean up tracked event listeners
    this.trackedEventListeners.forEach((listeners, target) => {
      listeners.forEach((handlers, event) => {
        handlers.forEach((handler) => {
          target.removeEventListener(event, handler as EventListener);
        });
      });
    });

    // Clean up WebSocket connections
    this.trackedWebSockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    this.trackedTimers.clear();
    this.trackedIntervals.clear();
    this.trackedEventListeners.clear();
    this.trackedWebSockets.clear();

    console.log('Resource monitor destroyed and resources cleaned up');
  }

  private setupDefaultCleanupTasks(): void {
    // DOM cleanup task
    this.addCleanupTask({
      name: 'dom-cleanup',
      priority: 'medium',
      execute: async () => {
        // Remove orphaned elements
        const orphanedElements = document.querySelectorAll('[data-watch-party-orphaned]');
        orphanedElements.forEach((el) => el.remove());

        // Clean up empty containers
        const emptyContainers = document.querySelectorAll('.watch-party-container:empty');
        emptyContainers.forEach((el) => el.remove());
      },
      interval: 60000, // Every minute
    });

    // Event listener cleanup task
    this.addCleanupTask({
      name: 'event-listener-cleanup',
      priority: 'high',
      execute: async () => {
        // Remove listeners from removed DOM elements
        this.trackedEventListeners.forEach((listeners, target) => {
          if (target instanceof Element && !document.contains(target)) {
            listeners.forEach((handlers, event) => {
              handlers.forEach((handler) => {
                target.removeEventListener(event, handler as EventListener);
              });
            });
            this.trackedEventListeners.delete(target);
          }
        });
      },
      interval: 30000, // Every 30 seconds
    });

    // WebSocket cleanup task
    this.addCleanupTask({
      name: 'websocket-cleanup',
      priority: 'high',
      execute: async () => {
        // Close dead WebSocket connections
        this.trackedWebSockets.forEach((ws) => {
          if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
            this.trackedWebSockets.delete(ws);
          }
        });
      },
      interval: 15000, // Every 15 seconds
    });

    // Memory pressure cleanup task
    this.addCleanupTask({
      name: 'memory-pressure-cleanup',
      priority: 'low',
      execute: async () => {
        const metrics = this.collectResourceMetrics();

        // If memory usage is high, trigger garbage collection hints
        if (metrics.memoryUsage > 75 * 1024 * 1024) {
          // 75MB
          // Force garbage collection if available (Chrome DevTools)
          if ('gc' in window && typeof (window as any).gc === 'function') {
            (window as any).gc();
          }

          // Clear caches
          this.clearCaches();
        }
      },
      interval: 120000, // Every 2 minutes
    });
  }

  private interceptResourceCreation(): void {
    // Intercept setTimeout
    const originalSetTimeout = window.setTimeout;
    (window as any).setTimeout = (handler: TimerHandler, timeout?: number, ...args: any[]) => {
      const id = originalSetTimeout(handler, timeout, ...args);
      this.trackedTimers.add(id);
      return id;
    };

    // Intercept setInterval
    const originalSetInterval = window.setInterval;
    (window as any).setInterval = (handler: TimerHandler, timeout?: number, ...args: any[]) => {
      const id = originalSetInterval(handler, timeout, ...args);
      this.trackedIntervals.add(id);
      return id;
    };

    // Intercept clearTimeout
    const originalClearTimeout = window.clearTimeout;
    (window as any).clearTimeout = (id?: number) => {
      if (id !== undefined) {
        this.trackedTimers.delete(id);
        originalClearTimeout(id);
      }
    };

    // Intercept clearInterval
    const originalClearInterval = window.clearInterval;
    (window as any).clearInterval = (id?: number) => {
      if (id !== undefined) {
        this.trackedIntervals.delete(id);
        originalClearInterval(id);
      }
    };
  }

  private async runCleanupTasks(): Promise<void> {
    const now = Date.now();

    // Sort tasks by priority
    const sortedTasks = [...this.cleanupTasks].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const task of sortedTasks) {
      try {
        // Check if task should run based on interval
        if (task.interval && task.lastRun) {
          if (now - task.lastRun < task.interval) {
            continue;
          }
        }

        await task.execute();
        task.lastRun = now;
      } catch (error) {
        console.error(`Cleanup task ${task.name} failed:`, error);
      }
    }
  }

  private getMemoryUsage(): number {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || 0;
    }

    // Fallback estimation based on DOM size
    return this.estimateMemoryUsage();
  }

  private estimateMemoryUsage(): number {
    // Rough estimation based on DOM nodes and other factors
    const domNodes = this.getDOMNodeCount();
    const eventListeners = this.getEventListenerCount();
    const timers = this.getTimerCount();

    // Very rough estimation: 1KB per DOM node, 100 bytes per listener, 50 bytes per timer
    return domNodes * 1024 + eventListeners * 100 + timers * 50;
  }

  private getDOMNodeCount(): number {
    return document.querySelectorAll('*').length;
  }

  private getEventListenerCount(): number {
    let count = 0;
    this.trackedEventListeners.forEach((listeners) => {
      listeners.forEach((handlers) => {
        count += handlers.length;
      });
    });
    return count;
  }

  private getTimerCount(): number {
    return this.trackedTimers.size + this.trackedIntervals.size;
  }

  private clearCaches(): void {
    // Clear any internal caches
    console.log('Clearing internal caches to free memory');

    // This would clear application-specific caches
    // For now, just log the action
  }
}
