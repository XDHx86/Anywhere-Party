/**
 * Performance Manager - Main coordinator for performance optimization and diagnostics
 * Requirements: 2.1, 2.2, 2.3
 */

import {
  PerformanceOptimizationConfig,
  PerformanceDiagnostics as PerformanceDiagnosticsData,
  NetworkConditions,
  AdaptiveQualitySettings,
  DriftAnalysis,
} from './types';
import { ExtensionConfig } from '../browser-bridge/types';
import { DriftAnalyzer } from './drift-analyzer';
import { BandwidthMonitor } from './bandwidth-monitor';
import { AdaptiveQualityController } from './adaptive-quality';
import { ResourceMonitor } from './resource-monitor';
import { ResourceUsageMetrics } from './types';
import { PerformanceDiagnostics as DiagnosticsCollector } from './diagnostics';
import { DriftCorrection } from '../sync-engine/types';

export interface PerformanceManagerOptions {
  config: ExtensionConfig;
  onConfigUpdate?: (config: Partial<ExtensionConfig>) => void;
  onPerformanceAlert?: (alert: PerformanceAlert) => void;
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  category: 'sync' | 'network' | 'memory' | 'video';
  message: string;
  details?: unknown;
  timestamp: number;
}

export class PerformanceManager {
  private config: PerformanceOptimizationConfig;
  private extensionConfig: ExtensionConfig;

  // Component instances
  private driftAnalyzer: DriftAnalyzer;
  private bandwidthMonitor: BandwidthMonitor;
  private adaptiveQuality: AdaptiveQualityController;
  private resourceMonitor: ResourceMonitor;
  private diagnostics: DiagnosticsCollector;

  // Event handlers
  private onConfigUpdate?: (config: Partial<ExtensionConfig>) => void;
  private onPerformanceAlert?: (alert: PerformanceAlert) => void;

  // State tracking
  private isActive = false;
  private alertHistory: PerformanceAlert[] = [];

  constructor(options: PerformanceManagerOptions) {
    this.extensionConfig = options.config;
    this.onConfigUpdate = options.onConfigUpdate;
    this.onPerformanceAlert = options.onPerformanceAlert;

    // Create performance optimization configuration
    this.config = this.createPerformanceConfig(options.config);

    // Initialize components
    this.driftAnalyzer = new DriftAnalyzer(this.config, (analysis) =>
      this.handleDriftAnalysis(analysis)
    );

    this.bandwidthMonitor = new BandwidthMonitor(this.config, (conditions) =>
      this.handleNetworkConditionsChange(conditions)
    );

    this.adaptiveQuality = new AdaptiveQualityController(
      this.config,
      this.createInitialQualitySettings(),
      (settings) => this.handleQualitySettingsChange(settings),
      (config) => this.handleConfigUpdate(config)
    );

    this.resourceMonitor = new ResourceMonitor(this.config, (metrics) =>
      this.handleResourceUpdate(metrics)
    );

    this.diagnostics = new DiagnosticsCollector(
      this.config,
      this.driftAnalyzer,
      this.bandwidthMonitor,
      this.resourceMonitor,
      (diagnostics) => this.handleDiagnosticsUpdate(diagnostics)
    );
  }

  /**
   * Start performance monitoring and optimization
   */
  start(): void {
    if (this.isActive) {
      return;
    }

    console.log('Starting performance manager...');

    this.driftAnalyzer.start();
    this.bandwidthMonitor.start();
    this.resourceMonitor.start();
    this.diagnostics.start();

    this.isActive = true;
    console.log('Performance manager started');
  }

  /**
   * Stop performance monitoring and optimization
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    console.log('Stopping performance manager...');

    this.driftAnalyzer.stop();
    this.bandwidthMonitor.stop();
    this.resourceMonitor.stop();
    this.diagnostics.stop();

    this.isActive = false;
    console.log('Performance manager stopped');
  }

  /**
   * Record a drift correction event
   */
  recordDriftCorrection(correction: DriftCorrection): void {
    const networkConditions = this.bandwidthMonitor.getCurrentConditions();
    this.driftAnalyzer.recordDriftCorrection(correction, networkConditions.latency);
    this.diagnostics.recordDriftCorrection();
  }

  /**
   * Record a drift measurement
   */
  recordDriftMeasurement(driftMs: number): void {
    const networkConditions = this.bandwidthMonitor.getCurrentConditions();
    this.driftAnalyzer.recordDriftMeasurement(driftMs, networkConditions.latency);
  }

  /**
   * Record sync performance metrics
   */
  recordSyncLatency(latencyMs: number): void {
    this.diagnostics.recordSyncLatency(latencyMs);
  }

  recordSyncAttempt(successful: boolean): void {
    this.diagnostics.recordSyncAttempt(successful);
  }

  recordHeartbeatMiss(): void {
    this.diagnostics.recordHeartbeatMiss();
  }

  recordConvergenceFailure(): void {
    this.diagnostics.recordConvergenceFailure();
  }

  /**
   * Record network events
   */
  recordNetworkReconnection(): void {
    this.diagnostics.recordNetworkReconnection();
  }

  recordMessageSent(): void {
    this.diagnostics.recordMessageSent();
  }

  recordMessageReceived(): void {
    this.diagnostics.recordMessageReceived();
  }

  updateMessageQueueSize(size: number): void {
    this.diagnostics.updateMessageQueueSize(size);
  }

  /**
   * Record video performance events
   */
  recordVideoDetectionStart(): void {
    this.diagnostics.recordVideoDetectionStart();
  }

  recordVideoDetectionEnd(): void {
    this.diagnostics.recordVideoDetectionEnd();
  }

  recordRenderingLatency(latencyMs: number): void {
    this.diagnostics.recordRenderingLatency(latencyMs);
  }

  recordFrameDrop(): void {
    this.diagnostics.recordFrameDrop();
  }

  recordPlaybackStall(): void {
    this.diagnostics.recordPlaybackStall();
  }

  recordQualityChange(): void {
    this.diagnostics.recordQualityChange();
  }

  /**
   * Get current performance diagnostics
   */
  getCurrentDiagnostics(): PerformanceDiagnosticsData {
    return this.diagnostics.generateDiagnostics();
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    return this.diagnostics.getPerformanceSummary();
  }

  /**
   * Get current network conditions
   */
  getCurrentNetworkConditions(): NetworkConditions {
    return this.bandwidthMonitor.getCurrentConditions();
  }

  /**
   * Get current quality settings
   */
  getCurrentQualitySettings(): AdaptiveQualitySettings {
    return this.adaptiveQuality.getCurrentSettings();
  }

  /**
   * Get drift analysis
   */
  getDriftAnalysis(): DriftAnalysis {
    return this.driftAnalyzer.generateAnalysis();
  }

  /**
   * Force bandwidth test
   */
  async performBandwidthTest() {
    return await this.bandwidthMonitor.performBandwidthTest();
  }

  /**
   * Force resource cleanup
   */
  async forceResourceCleanup(): Promise<void> {
    await this.resourceMonitor.forceCleanup();
  }

  /**
   * Set quality level manually
   */
  setQualityLevel(level: 'low' | 'medium' | 'high' | 'auto') {
    return this.adaptiveQuality.setQualityLevel(level);
  }

  /**
   * Check if performance is healthy
   */
  isPerformanceHealthy(): boolean {
    const summary = this.getPerformanceSummary();
    // If no data is available, consider it healthy by default
    if (summary.issues.length === 1 && summary.issues[0] === 'No performance data available') {
      return true;
    }
    return summary.overall === 'excellent' || summary.overall === 'good';
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const summary = this.getPerformanceSummary();
    const networkConditions = this.getCurrentNetworkConditions();
    const qualityRecommendations = this.adaptiveQuality.getRecommendations(networkConditions);
    const driftRecommendations = this.driftAnalyzer.getOptimizationRecommendations(
      this.extensionConfig.SYNC_TOLERANCE_MS
    );

    return [...summary.recommendations, ...qualityRecommendations, ...driftRecommendations];
  }

  /**
   * Export performance data
   */
  exportPerformanceData(): string {
    const data = {
      config: this.config,
      extensionConfig: this.extensionConfig,
      diagnostics: this.diagnostics.exportDiagnostics(),
      driftAnalysis: this.driftAnalyzer.generateAnalysis(),
      networkConditions: this.bandwidthMonitor.getCurrentConditions(),
      qualitySettings: this.adaptiveQuality.getCurrentSettings(),
      alerts: this.alertHistory,
      exportTime: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Update extension configuration
   */
  updateExtensionConfig(config: ExtensionConfig): void {
    this.extensionConfig = config;
    this.config = this.createPerformanceConfig(config);

    // Update all components
    this.driftAnalyzer.updateConfig(this.config);
    this.bandwidthMonitor.updateConfig(this.config);
    this.adaptiveQuality.updateConfig(this.config);
    this.resourceMonitor.updateConfig(this.config);
    this.diagnostics.updateConfig(this.config);
  }

  /**
   * Clear all performance history
   */
  clearHistory(): void {
    this.driftAnalyzer.clearHistory();
    this.bandwidthMonitor.clearHistory();
    this.adaptiveQuality.clearHistory();
    this.diagnostics.clearHistory();
    this.alertHistory = [];
    console.log('All performance history cleared');
  }

  /**
   * Destroy performance manager and clean up resources
   */
  destroy(): void {
    this.stop();
    this.resourceMonitor.destroy();
    console.log('Performance manager destroyed');
  }

  private createPerformanceConfig(extensionConfig: ExtensionConfig): PerformanceOptimizationConfig {
    return {
      driftAnalysisEnabled: true,
      bandwidthMonitoringEnabled: true,
      adaptiveQualityEnabled: true,
      resourceCleanupEnabled: true,
      diagnosticsInterval: 10000, // 10 seconds
      maxDriftSamples: 100,
      performanceLogLevel: extensionConfig.LOCAL_DEV_MODE ? 'detailed' : 'basic',
    };
  }

  private createInitialQualitySettings(): AdaptiveQualitySettings {
    return {
      enabled: true,
      heartbeatInterval: this.extensionConfig.HEARTBEAT_INTERVAL_MS,
      syncTolerance: this.extensionConfig.SYNC_TOLERANCE_MS,
      maxRetries: 3,
      bandwidthThreshold: 1500000, // 1.5 Mbps
      latencyThreshold: 200, // 200ms
      qualityLevel: 'auto',
    };
  }

  private handleDriftAnalysis(analysis: DriftAnalysis): void {
    // Check for concerning drift patterns
    if (analysis.averageDrift > this.extensionConfig.SYNC_TOLERANCE_MS * 2) {
      this.emitAlert({
        type: 'warning',
        category: 'sync',
        message: `High average drift detected: ${analysis.averageDrift.toFixed(1)}ms`,
        details: analysis,
        timestamp: Date.now(),
      });
    }

    if (analysis.correctionFrequency > 3) {
      // More than 3 corrections per minute
      this.emitAlert({
        type: 'warning',
        category: 'sync',
        message: `Frequent drift corrections: ${analysis.correctionFrequency.toFixed(1)}/min`,
        details: analysis,
        timestamp: Date.now(),
      });
    }
  }

  private handleNetworkConditionsChange(conditions: NetworkConditions): void {
    // Trigger adaptive quality adjustment
    const adjustment = this.adaptiveQuality.analyzeAndAdjust(conditions);

    if (adjustment) {
      this.emitAlert({
        type: 'info',
        category: 'network',
        message: `Quality adjusted to ${adjustment.newSettings.qualityLevel} due to ${adjustment.reason}`,
        details: adjustment,
        timestamp: Date.now(),
      });
    }

    // Check for poor network conditions
    if (conditions.bandwidth < 500000) {
      // Less than 500 Kbps
      this.emitAlert({
        type: 'warning',
        category: 'network',
        message: `Low bandwidth detected: ${(conditions.bandwidth / 1000000).toFixed(1)} Mbps`,
        details: conditions,
        timestamp: Date.now(),
      });
    }

    if (conditions.latency > 500) {
      // More than 500ms
      this.emitAlert({
        type: 'warning',
        category: 'network',
        message: `High latency detected: ${conditions.latency.toFixed(0)}ms`,
        details: conditions,
        timestamp: Date.now(),
      });
    }
  }

  private handleQualitySettingsChange(settings: AdaptiveQualitySettings): void {
    console.log('Quality settings updated:', settings);
  }

  private handleConfigUpdate(config: Partial<ExtensionConfig>): void {
    if (this.onConfigUpdate) {
      this.onConfigUpdate(config);
    }
  }

  private handleResourceUpdate(metrics: ResourceUsageMetrics): void {
    const warnings = this.resourceMonitor.getResourceWarnings();

    for (const warning of warnings) {
      this.emitAlert({
        type: 'warning',
        category: 'memory',
        message: warning,
        details: metrics,
        timestamp: Date.now(),
      });
    }
  }

  private handleDiagnosticsUpdate(diagnostics: PerformanceDiagnosticsData): void {
    // Log performance diagnostics if detailed logging is enabled
    if (this.config.performanceLogLevel === 'detailed') {
      console.log('Performance diagnostics:', diagnostics);
    }
  }

  private emitAlert(alert: PerformanceAlert): void {
    this.alertHistory.push(alert);

    // Keep only recent alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory.shift();
    }

    if (this.onPerformanceAlert) {
      this.onPerformanceAlert(alert);
    }

    console.log(`Performance alert [${alert.type}/${alert.category}]:`, alert.message);
  }
}
