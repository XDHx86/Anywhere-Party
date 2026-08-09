/**
 * Performance Diagnostics - Comprehensive diagnostic tools and performance logs
 * Requirements: 2.1, 2.2, 2.3
 */

import {
  PerformanceDiagnostics as PerformanceDiagnosticsData,
  SyncPerformanceMetrics,
  NetworkPerformanceMetrics,
  VideoPerformanceMetrics,
  PerformanceOptimizationConfig,
} from './types';
import { DriftAnalyzer } from './drift-analyzer';
import { BandwidthMonitor } from './bandwidth-monitor';
import { ResourceMonitor } from './resource-monitor';

export class PerformanceDiagnostics {
  private config: PerformanceOptimizationConfig;
  private driftAnalyzer: DriftAnalyzer;
  private bandwidthMonitor: BandwidthMonitor;
  private resourceMonitor: ResourceMonitor;

  private diagnosticsHistory: PerformanceDiagnosticsData[] = [];
  private diagnosticsTimer: number | null = null;
  private onDiagnosticsUpdate?: (diagnostics: PerformanceDiagnosticsData) => void;

  // Performance tracking
  private syncMetrics = {
    latencyMeasurements: [] as number[],
    heartbeatMissed: 0,
    convergenceFailures: 0,
    driftCorrections: 0,
    syncAttempts: 0,
    successfulSyncs: 0,
  };

  private networkMetrics = {
    connectionLatency: 0,
    reconnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    messageQueueSize: 0,
    startTime: Date.now(),
  };

  private videoMetrics = {
    detectionStartTime: 0,
    detectionEndTime: 0,
    renderingLatencies: [] as number[],
    frameDrops: 0,
    playbackStalls: 0,
    qualityChanges: 0,
  };

  constructor(
    config: PerformanceOptimizationConfig,
    driftAnalyzer: DriftAnalyzer,
    bandwidthMonitor: BandwidthMonitor,
    resourceMonitor: ResourceMonitor,
    onDiagnosticsUpdate?: (diagnostics: PerformanceDiagnosticsData) => void
  ) {
    this.config = config;
    this.driftAnalyzer = driftAnalyzer;
    this.bandwidthMonitor = bandwidthMonitor;
    this.resourceMonitor = resourceMonitor;
    this.onDiagnosticsUpdate = onDiagnosticsUpdate;
  }

  /**
   * Start performance diagnostics
   */
  start(): void {
    this.stop(); // Clear any existing timer

    this.diagnosticsTimer = window.setInterval(() => {
      const diagnostics = this.generateDiagnostics();
      this.recordDiagnostics(diagnostics);

      if (this.onDiagnosticsUpdate) {
        this.onDiagnosticsUpdate(diagnostics);
      }
    }, this.config.diagnosticsInterval);

    console.log('Performance diagnostics started');
  }

  /**
   * Stop performance diagnostics
   */
  stop(): void {
    if (this.diagnosticsTimer) {
      clearInterval(this.diagnosticsTimer);
      this.diagnosticsTimer = null;
    }
    console.log('Performance diagnostics stopped');
  }

  /**
   * Generate comprehensive performance diagnostics
   */
  generateDiagnostics(): PerformanceDiagnosticsData {
    return {
      syncPerformance: this.generateSyncMetrics(),
      networkPerformance: this.generateNetworkMetrics(),
      resourceUsage: this.resourceMonitor.collectResourceMetrics(),
      videoPerformance: this.generateVideoMetrics(),
      timestamp: Date.now(),
    };
  }

  /**
   * Get diagnostics history
   */
  getDiagnosticsHistory(): PerformanceDiagnosticsData[] {
    return [...this.diagnosticsHistory];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
    recommendations: string[];
  } {
    const latest = this.diagnosticsHistory[this.diagnosticsHistory.length - 1];
    if (!latest) {
      return {
        overall: 'fair',
        issues: ['No performance data available'],
        recommendations: ['Start performance monitoring to get recommendations'],
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Analyze sync performance
    if (latest.syncPerformance.averageLatency > 200) {
      issues.push(`High sync latency: ${latest.syncPerformance.averageLatency.toFixed(0)}ms`);
      recommendations.push('Check network connection quality');
      score -= 20;
    }

    if (latest.syncPerformance.syncAccuracy < 0.8) {
      issues.push(`Low sync accuracy: ${(latest.syncPerformance.syncAccuracy * 100).toFixed(0)}%`);
      recommendations.push('Consider adjusting sync tolerance settings');
      score -= 15;
    }

    if (latest.syncPerformance.convergenceFailures > 0) {
      issues.push(`Convergence failures: ${latest.syncPerformance.convergenceFailures}`);
      recommendations.push('Check video element responsiveness');
      score -= 10;
    }

    // Analyze network performance
    if (latest.networkPerformance.connectionLatency > 300) {
      issues.push(
        `High network latency: ${latest.networkPerformance.connectionLatency.toFixed(0)}ms`
      );
      recommendations.push('Consider using adaptive quality settings');
      score -= 15;
    }

    if (latest.networkPerformance.reconnections > 0) {
      issues.push(`Network reconnections: ${latest.networkPerformance.reconnections}`);
      recommendations.push('Check network stability');
      score -= 10;
    }

    // Analyze resource usage
    const memoryMB = latest.resourceUsage.memoryUsage / (1024 * 1024);
    if (memoryMB > 100) {
      issues.push(`High memory usage: ${memoryMB.toFixed(1)}MB`);
      recommendations.push('Enable resource cleanup or restart extension');
      score -= 15;
    }

    if (latest.resourceUsage.domNodes > 5000) {
      issues.push(`High DOM node count: ${latest.resourceUsage.domNodes}`);
      recommendations.push('Check for memory leaks in page content');
      score -= 10;
    }

    // Analyze video performance
    if (latest.videoPerformance.playbackStalls > 0) {
      issues.push(`Video playback stalls: ${latest.videoPerformance.playbackStalls}`);
      recommendations.push('Check video buffering and network bandwidth');
      score -= 10;
    }

    // Determine overall rating
    let overall: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) {
      overall = 'excellent';
    } else if (score >= 75) {
      overall = 'good';
    } else if (score >= 60) {
      overall = 'fair';
    } else {
      overall = 'poor';
    }

    return { overall, issues, recommendations };
  }

  /**
   * Export diagnostics data
   */
  exportDiagnostics(): string {
    const data = {
      config: this.config,
      history: this.diagnosticsHistory,
      summary: this.getPerformanceSummary(),
      exportTime: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Record sync latency measurement
   */
  recordSyncLatency(latencyMs: number): void {
    this.syncMetrics.latencyMeasurements.push(latencyMs);

    // Keep only recent measurements
    if (this.syncMetrics.latencyMeasurements.length > 100) {
      this.syncMetrics.latencyMeasurements.shift();
    }
  }

  /**
   * Record sync attempt
   */
  recordSyncAttempt(successful: boolean): void {
    this.syncMetrics.syncAttempts++;
    if (successful) {
      this.syncMetrics.successfulSyncs++;
    }
  }

  /**
   * Record heartbeat miss
   */
  recordHeartbeatMiss(): void {
    this.syncMetrics.heartbeatMissed++;
  }

  /**
   * Record convergence failure
   */
  recordConvergenceFailure(): void {
    this.syncMetrics.convergenceFailures++;
  }

  /**
   * Record drift correction
   */
  recordDriftCorrection(): void {
    this.syncMetrics.driftCorrections++;
  }

  /**
   * Record network reconnection
   */
  recordNetworkReconnection(): void {
    this.networkMetrics.reconnections++;
  }

  /**
   * Record message sent
   */
  recordMessageSent(): void {
    this.networkMetrics.messagesSent++;
  }

  /**
   * Record message received
   */
  recordMessageReceived(): void {
    this.networkMetrics.messagesReceived++;
  }

  /**
   * Update message queue size
   */
  updateMessageQueueSize(size: number): void {
    this.networkMetrics.messageQueueSize = size;
  }

  /**
   * Record video detection timing
   */
  recordVideoDetectionStart(): void {
    this.videoMetrics.detectionStartTime = performance.now();
  }

  recordVideoDetectionEnd(): void {
    this.videoMetrics.detectionEndTime = performance.now();
  }

  /**
   * Record video rendering latency
   */
  recordRenderingLatency(latencyMs: number): void {
    this.videoMetrics.renderingLatencies.push(latencyMs);

    // Keep only recent measurements
    if (this.videoMetrics.renderingLatencies.length > 50) {
      this.videoMetrics.renderingLatencies.shift();
    }
  }

  /**
   * Record video events
   */
  recordFrameDrop(): void {
    this.videoMetrics.frameDrops++;
  }

  recordPlaybackStall(): void {
    this.videoMetrics.playbackStalls++;
  }

  recordQualityChange(): void {
    this.videoMetrics.qualityChanges++;
  }

  /**
   * Update configuration
   */
  updateConfig(config: PerformanceOptimizationConfig): void {
    this.config = config;
  }

  /**
   * Clear diagnostics history
   */
  clearHistory(): void {
    this.diagnosticsHistory = [];
    this.resetMetrics();
    console.log('Performance diagnostics history cleared');
  }

  private generateSyncMetrics(): SyncPerformanceMetrics {
    const latencies = this.syncMetrics.latencyMeasurements;
    const averageLatency =
      latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

    const syncAccuracy =
      this.syncMetrics.syncAttempts > 0
        ? this.syncMetrics.successfulSyncs / this.syncMetrics.syncAttempts
        : 1;

    return {
      averageLatency,
      maxLatency,
      heartbeatMissed: this.syncMetrics.heartbeatMissed,
      convergenceFailures: this.syncMetrics.convergenceFailures,
      driftCorrections: this.syncMetrics.driftCorrections,
      syncAccuracy,
    };
  }

  private generateNetworkMetrics(): NetworkPerformanceMetrics {
    const currentConditions = this.bandwidthMonitor.getCurrentConditions();
    const elapsedTime = (Date.now() - this.networkMetrics.startTime) / 1000; // seconds
    const throughput =
      elapsedTime > 0
        ? (this.networkMetrics.messagesSent + this.networkMetrics.messagesReceived) / elapsedTime
        : 0;

    return {
      connectionLatency: currentConditions.latency,
      bandwidth: currentConditions.bandwidth,
      packetLoss: currentConditions.packetLoss,
      reconnections: this.networkMetrics.reconnections,
      messageQueueSize: this.networkMetrics.messageQueueSize,
      throughput,
    };
  }

  private generateVideoMetrics(): VideoPerformanceMetrics {
    const detectionTime =
      this.videoMetrics.detectionEndTime > 0
        ? this.videoMetrics.detectionEndTime - this.videoMetrics.detectionStartTime
        : 0;

    const renderingLatencies = this.videoMetrics.renderingLatencies;
    const averageRenderingLatency =
      renderingLatencies.length > 0
        ? renderingLatencies.reduce((sum, l) => sum + l, 0) / renderingLatencies.length
        : 0;

    return {
      detectionTime,
      renderingLatency: averageRenderingLatency,
      frameDrops: this.videoMetrics.frameDrops,
      bufferHealth: 0, // Would need video element access to calculate
      playbackStalls: this.videoMetrics.playbackStalls,
      qualityChanges: this.videoMetrics.qualityChanges,
    };
  }

  private recordDiagnostics(diagnostics: PerformanceDiagnosticsData): void {
    this.diagnosticsHistory.push(diagnostics);

    // Keep only recent diagnostics
    if (this.diagnosticsHistory.length > 100) {
      this.diagnosticsHistory.shift();
    }
  }

  private resetMetrics(): void {
    this.syncMetrics = {
      latencyMeasurements: [],
      heartbeatMissed: 0,
      convergenceFailures: 0,
      driftCorrections: 0,
      syncAttempts: 0,
      successfulSyncs: 0,
    };

    this.networkMetrics = {
      connectionLatency: 0,
      reconnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messageQueueSize: 0,
      startTime: Date.now(),
    };

    this.videoMetrics = {
      detectionStartTime: 0,
      detectionEndTime: 0,
      renderingLatencies: [],
      frameDrops: 0,
      playbackStalls: 0,
      qualityChanges: 0,
    };
  }
}
