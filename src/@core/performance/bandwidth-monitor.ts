/**
 * Bandwidth Monitor - Monitors network conditions and bandwidth
 * Requirements: 2.1, 2.2
 */

import { NetworkConditions, BandwidthTestResult, PerformanceOptimizationConfig } from './types';

// Extend Navigator interface for Network Information API
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
}

interface NetworkInformation extends EventTarget {
  readonly downlink: number;
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  readonly rtt: number;
  readonly saveData: boolean;
  readonly type: string;
  addEventListener(
    type: 'change',
    listener: (this: NetworkInformation, ev: Event) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: 'change',
    listener: (this: NetworkInformation, ev: Event) => unknown,
    options?: boolean | EventListenerOptions
  ): void;
}

export class BandwidthMonitor {
  private config: PerformanceOptimizationConfig;
  private currentConditions: NetworkConditions;
  private testHistory: BandwidthTestResult[] = [];
  private monitoringTimer: number | null = null;
  private onConditionsChange?: (conditions: NetworkConditions) => void;

  // Network API support detection
  private readonly supportsNetworkAPI: boolean;
  private readonly supportsConnectionAPI: boolean;

  constructor(
    config: PerformanceOptimizationConfig,
    onConditionsChange?: (conditions: NetworkConditions) => void
  ) {
    this.config = config;
    this.onConditionsChange = onConditionsChange;

    // Detect browser API support
    const nav = navigator as NavigatorWithConnection;
    this.supportsNetworkAPI = 'navigator' in globalThis && 'connection' in navigator;
    this.supportsConnectionAPI =
      this.supportsNetworkAPI && 'effectiveType' in (nav.connection || {});

    // Initialize with default conditions
    this.currentConditions = this.getInitialConditions();
  }

  /**
   * Start bandwidth monitoring
   */
  start(): void {
    if (!this.config.bandwidthMonitoringEnabled) {
      return;
    }

    this.stop(); // Clear any existing timer

    // Set up network API listeners if available
    if (this.supportsNetworkAPI) {
      this.setupNetworkAPIListeners();
    }

    // Start periodic bandwidth testing
    this.monitoringTimer = window.setInterval(() => {
      this.performBandwidthTest();
    }, this.config.diagnosticsInterval);

    // Perform initial test
    this.performBandwidthTest();

    console.log('Bandwidth monitor started');
  }

  /**
   * Stop bandwidth monitoring
   */
  stop(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    // Remove network API listeners
    if (this.supportsNetworkAPI) {
      this.removeNetworkAPIListeners();
    }

    console.log('Bandwidth monitor stopped');
  }

  /**
   * Get current network conditions
   */
  getCurrentConditions(): NetworkConditions {
    return { ...this.currentConditions };
  }

  /**
   * Perform a bandwidth test
   */
  async performBandwidthTest(): Promise<BandwidthTestResult> {
    const startTime = Date.now();

    try {
      // Perform download speed test using small image
      const downloadSpeed = await this.testDownloadSpeed();

      // Perform latency test using WebSocket ping if available
      const latency = await this.testLatency();

      // Calculate jitter from recent latency measurements
      const jitter = this.calculateJitter();

      const result: BandwidthTestResult = {
        downloadSpeed,
        uploadSpeed: 0, // Upload testing not implemented for privacy/resource reasons
        latency,
        jitter,
        timestamp: Date.now(),
        testDuration: Date.now() - startTime,
      };

      this.testHistory.push(result);

      // Keep only recent test results
      if (this.testHistory.length > 20) {
        this.testHistory.shift();
      }

      // Update current conditions based on test results
      this.updateConditionsFromTest(result);

      return result;
    } catch (error) {
      console.warn('Bandwidth test failed:', error);

      // Return fallback result
      return {
        downloadSpeed: 0,
        uploadSpeed: 0,
        latency: 0,
        jitter: 0,
        timestamp: Date.now(),
        testDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get bandwidth test history
   */
  getTestHistory(): BandwidthTestResult[] {
    return [...this.testHistory];
  }

  /**
   * Check if network conditions are suitable for high-quality sync
   */
  isNetworkSuitable(minBandwidth: number, maxLatency: number): boolean {
    return (
      this.currentConditions.bandwidth >= minBandwidth &&
      this.currentConditions.latency <= maxLatency &&
      this.currentConditions.packetLoss < 0.05
    ); // Less than 5% packet loss
  }

  /**
   * Get network quality rating
   */
  getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const { bandwidth, latency, packetLoss } = this.currentConditions;

    if (bandwidth >= 5000000 && latency <= 50 && packetLoss < 0.01) {
      // 5 Mbps, 50ms, <1% loss
      return 'excellent';
    } else if (bandwidth >= 2000000 && latency <= 100 && packetLoss < 0.03) {
      // 2 Mbps, 100ms, <3% loss
      return 'good';
    } else if (bandwidth >= 500000 && latency <= 200 && packetLoss < 0.05) {
      // 500 Kbps, 200ms, <5% loss
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: PerformanceOptimizationConfig): void {
    const wasEnabled = this.config.bandwidthMonitoringEnabled;
    this.config = config;

    if (config.bandwidthMonitoringEnabled && !wasEnabled) {
      this.start();
    } else if (!config.bandwidthMonitoringEnabled && wasEnabled) {
      this.stop();
    }
  }

  /**
   * Clear test history
   */
  clearHistory(): void {
    this.testHistory = [];
    console.log('Bandwidth test history cleared');
  }

  private getInitialConditions(): NetworkConditions {
    // Try to get initial conditions from Network API
    if (this.supportsConnectionAPI) {
      const nav = navigator as NavigatorWithConnection;
      const connection = nav.connection;
      if (connection) {
        return {
          bandwidth: this.estimateBandwidthFromEffectiveType(connection.effectiveType),
          latency: this.estimateLatencyFromEffectiveType(connection.effectiveType),
          packetLoss: 0,
          jitter: 0,
          connectionType: (connection.type as NetworkConditions['connectionType']) || 'unknown',
          effectiveType: connection.effectiveType || '4g',
        };
      }
    }

    // Fallback to default conditions
    return {
      bandwidth: 2000000, // 2 Mbps default
      latency: 100, // 100ms default
      packetLoss: 0,
      jitter: 0,
      connectionType: 'unknown',
      effectiveType: '4g',
    };
  }

  private setupNetworkAPIListeners(): void {
    if (!this.supportsNetworkAPI) return;

    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection;
    if (!connection) return;

    const handleConnectionChange = () => {
      this.updateConditionsFromNetworkAPI();
    };

    connection.addEventListener('change', handleConnectionChange);

    // Store reference for cleanup
    this._connectionChangeHandler = handleConnectionChange;
  }

  private _connectionChangeHandler: (() => void) | null = null;

  private removeNetworkAPIListeners(): void {
    if (!this.supportsNetworkAPI) return;

    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection;
    const handler = this._connectionChangeHandler;

    if (connection && handler) {
      connection.removeEventListener('change', handler);
      this._connectionChangeHandler = null;
    }
  }

  private updateConditionsFromNetworkAPI(): void {
    if (!this.supportsConnectionAPI) return;

    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection;
    if (!connection) return;

    const newConditions: NetworkConditions = {
      bandwidth: this.estimateBandwidthFromEffectiveType(connection.effectiveType),
      latency: this.estimateLatencyFromEffectiveType(connection.effectiveType),
      packetLoss: this.currentConditions.packetLoss, // Keep existing value
      jitter: this.currentConditions.jitter, // Keep existing value
      connectionType:
        (connection.type as NetworkConditions['connectionType']) ||
        this.currentConditions.connectionType,
      effectiveType: connection.effectiveType || this.currentConditions.effectiveType,
    };

    this.updateConditions(newConditions);
  }

  private async testDownloadSpeed(): Promise<number> {
    // Use a small test image to measure download speed
    const testImageUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testSize = 100; // bytes (very small test)

    const startTime = performance.now();

    try {
      const response = await fetch(testImageUrl, { cache: 'no-cache' });
      await response.blob();

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds

      if (duration > 0) {
        return (testSize * 8) / duration; // bits per second
      }
    } catch (error) {
      console.warn('Download speed test failed:', error);
    }

    return 0;
  }

  private async testLatency(): Promise<number> {
    // Simple latency test using fetch with timestamp
    const startTime = performance.now();

    try {
      // Use a minimal request to test latency
      await fetch('data:text/plain,ping', {
        method: 'HEAD',
        cache: 'no-cache',
      });

      const endTime = performance.now();
      return endTime - startTime;
    } catch (error) {
      console.warn('Latency test failed:', error);
      return 0;
    }
  }

  private calculateJitter(): number {
    if (this.testHistory.length < 3) {
      return 0;
    }

    // Calculate jitter from recent latency measurements
    const recentLatencies = this.testHistory.slice(-5).map((t) => t.latency);
    const avgLatency = recentLatencies.reduce((sum, l) => sum + l, 0) / recentLatencies.length;

    const jitterSum = recentLatencies.reduce((sum, latency) => {
      return sum + Math.abs(latency - avgLatency);
    }, 0);

    return jitterSum / recentLatencies.length;
  }

  private updateConditionsFromTest(result: BandwidthTestResult): void {
    // Update conditions based on test results
    const newConditions: NetworkConditions = {
      ...this.currentConditions,
      bandwidth: result.downloadSpeed,
      latency: result.latency,
      jitter: result.jitter,
      // Keep existing connectionType and effectiveType
    };

    this.updateConditions(newConditions);
  }

  private updateConditions(newConditions: NetworkConditions): void {
    const previousConditions = { ...this.currentConditions };
    this.currentConditions = newConditions;

    // Check if conditions changed significantly
    const significantChange =
      Math.abs(newConditions.bandwidth - previousConditions.bandwidth) >
        previousConditions.bandwidth * 0.2 ||
      Math.abs(newConditions.latency - previousConditions.latency) > 50 ||
      newConditions.effectiveType !== previousConditions.effectiveType;

    if (significantChange && this.onConditionsChange) {
      this.onConditionsChange(newConditions);
    }
  }

  private estimateBandwidthFromEffectiveType(effectiveType: string): number {
    switch (effectiveType) {
      case 'slow-2g':
        return 50000; // 50 Kbps
      case '2g':
        return 250000; // 250 Kbps
      case '3g':
        return 1500000; // 1.5 Mbps
      case '4g':
        return 10000000; // 10 Mbps
      default:
        return 2000000; // 2 Mbps default
    }
  }

  private estimateLatencyFromEffectiveType(effectiveType: string): number {
    switch (effectiveType) {
      case 'slow-2g':
        return 2000; // 2000ms
      case '2g':
        return 1400; // 1400ms
      case '3g':
        return 400; // 400ms
      case '4g':
        return 100; // 100ms
      default:
        return 200; // 200ms default
    }
  }
}
