/**
 * Performance Metrics Collector Tests
 * Tests for comprehensive performance monitoring functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PerformanceMetricsCollector,
  getPerformanceMetricsCollector,
} from './performance-metrics-collector';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  timing: {
    navigationStart: 1000,
    domContentLoadedEventEnd: 2000,
    loadEventEnd: 3000,
  },
  memory: {
    usedJSHeapSize: 1024 * 1024 * 10, // 10MB
    totalJSHeapSize: 1024 * 1024 * 50, // 50MB
    jsHeapSizeLimit: 1024 * 1024 * 100, // 100MB
  },
};

// Mock window and global objects
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    PerformanceObserver: vi.fn(),
    requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
    addEventListener: vi.fn(),
  },
  writable: true,
});

describe('PerformanceMetricsCollector', () => {
  let collector: PerformanceMetricsCollector;
  const sessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new PerformanceMetricsCollector(sessionId);
  });

  afterEach(() => {
    collector?.destroy();
  });

  describe('Component Tracking', () => {
    it('should start and finish component tracking', () => {
      const componentName = 'TestComponent';

      collector.startComponentTracking(componentName);

      // Verify component is being tracked
      const metrics = collector.getComponentMetrics(componentName);
      expect(metrics).toBeDefined();
      expect(metrics?.componentName).toBe(componentName);
      expect(metrics?.loadingStages).toHaveLength(1);
      expect(metrics?.loadingStages[0].stage).toBe('html');
    });

    it('should track loading stages progression', () => {
      const componentName = 'TestComponent';

      collector.startComponentTracking(componentName);
      collector.startLoadingStage(componentName, 'javascript');
      collector.endLoadingStage(componentName);
      collector.startLoadingStage(componentName, 'react');
      collector.endLoadingStage(componentName);

      const metrics = collector.getComponentMetrics(componentName);
      expect(metrics?.loadingStages).toHaveLength(3); // html, javascript, react
      expect(metrics?.loadingStages[1].stage).toBe('javascript');
      expect(metrics?.loadingStages[2].stage).toBe('react');
    });

    it('should record component errors', () => {
      const componentName = 'TestComponent';
      const errorMessage = 'Test error';

      collector.startComponentTracking(componentName);
      collector.recordComponentError(componentName, errorMessage);

      const metrics = collector.getComponentMetrics(componentName);
      expect(metrics?.errorCount).toBe(1);
    });

    it('should record component retries', () => {
      const componentName = 'TestComponent';

      collector.startComponentTracking(componentName);
      collector.recordComponentRetry(componentName);
      collector.recordComponentRetry(componentName);

      const metrics = collector.getComponentMetrics(componentName);
      expect(metrics?.retryCount).toBe(2);
    });

    it('should calculate total load time', () => {
      const componentName = 'TestComponent';

      // Mock performance.now to return predictable values
      let timeCounter = 1000;
      mockPerformance.now.mockImplementation(() => timeCounter++);

      collector.startComponentTracking(componentName);
      collector.startLoadingStage(componentName, 'javascript');
      collector.endLoadingStage(componentName);

      const result = collector.finishComponentTracking(componentName, true);

      expect(result).toBeDefined();
      expect(result?.totalLoadTime).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should get current memory usage', () => {
      const componentName = 'TestComponent';

      collector.startComponentTracking(componentName);

      const metrics = collector.getComponentMetrics(componentName);
      expect(metrics?.memoryPeak).toBeDefined();
      expect(metrics?.memoryPeak.used).toBe(1024 * 1024 * 10);
      expect(metrics?.memoryPeak.percentage).toBe(10); // 10MB / 100MB limit
    });

    it('should track memory peak during loading', () => {
      const componentName = 'TestComponent';

      collector.startComponentTracking(componentName);

      // Simulate memory increase
      mockPerformance.memory.usedJSHeapSize = 1024 * 1024 * 20; // 20MB

      collector.startLoadingStage(componentName, 'javascript');

      const metrics = collector.getComponentMetrics(componentName);
      expect(metrics?.memoryPeak.used).toBe(1024 * 1024 * 10); // Should still be initial value
    });
  });

  describe('Performance Summary', () => {
    it('should generate performance summary', () => {
      const componentName1 = 'Component1';
      const componentName2 = 'Component2';

      // Track multiple components
      collector.startComponentTracking(componentName1);
      collector.finishComponentTracking(componentName1, true);

      collector.startComponentTracking(componentName2);
      collector.recordComponentError(componentName2, 'Test error');
      collector.finishComponentTracking(componentName2, false);

      const summary = collector.getPerformanceSummary();

      expect(summary.totalComponents).toBe(2);
      expect(summary.totalErrors).toBe(1);
      expect(summary.performanceIssues).toBeInstanceOf(Array);
    });

    it('should identify performance issues', () => {
      const componentName = 'SlowComponent';

      // Mock slow loading time
      let timeCounter = 1000;
      mockPerformance.now.mockImplementation(() => {
        const current = timeCounter;
        timeCounter += 6000; // 6 second delay (exceeds 5 second threshold)
        return current;
      });

      collector.startComponentTracking(componentName);
      collector.finishComponentTracking(componentName, true);

      const summary = collector.getPerformanceSummary();
      expect(summary.performanceIssues.length).toBeGreaterThan(0);
      expect(
        summary.performanceIssues.some((issue) =>
          issue.includes('Average load time exceeds threshold')
        )
      ).toBe(true);
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics with session information', () => {
      const componentName = 'TestComponent';

      collector.startComponentTracking(componentName);
      collector.finishComponentTracking(componentName, true);

      const exported = collector.exportMetrics();

      expect(exported.sessionId).toBe(sessionId);
      expect(exported.sessionDuration).toBeGreaterThan(0);
      expect(exported.componentMetrics).toHaveLength(1);
      expect(exported.componentMetrics[0].componentName).toBe(componentName);
      expect(exported.summary).toBeDefined();
    });

    it('should include system metrics in export', () => {
      const exported = collector.exportMetrics();

      expect(exported.systemMetrics).toBeInstanceOf(Array);
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should clear metrics', () => {
      const componentName = 'TestComponent';

      collector.startComponentTracking(componentName);
      collector.clearMetrics();

      const metrics = collector.getAllComponentMetrics();
      expect(metrics).toHaveLength(0);
    });

    it('should destroy cleanly', () => {
      const componentName = 'TestComponent';

      collector.startComponentTracking(componentName);

      expect(() => collector.destroy()).not.toThrow();

      // Verify metrics are cleared
      const metrics = collector.getAllComponentMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getPerformanceMetricsCollector', () => {
      const instance1 = getPerformanceMetricsCollector();
      const instance2 = getPerformanceMetricsCollector();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing component gracefully', () => {
      expect(() => {
        collector.endLoadingStage('NonExistentComponent');
      }).not.toThrow();

      expect(() => {
        collector.recordComponentError('NonExistentComponent', 'Error');
      }).not.toThrow();
    });

    it('should handle performance API unavailability', () => {
      // Temporarily remove performance API
      const originalPerformance = global.performance;
      delete (global as any).performance;

      expect(() => {
        const testCollector = new PerformanceMetricsCollector('test');
        testCollector.startComponentTracking('TestComponent');
        testCollector.destroy();
      }).not.toThrow();

      // Restore performance API
      global.performance = originalPerformance;
    });
  });
});
