/**
 * Types for performance optimization and diagnostics
 * Requirements: 2.1, 2.2, 2.3
 */

export interface NetworkConditions {
  bandwidth: number; // bits per second
  latency: number; // milliseconds
  packetLoss: number; // percentage (0-1)
  jitter: number; // milliseconds
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
}

export interface DriftAnalysis {
  averageDrift: number;
  maxDrift: number;
  driftVariance: number;
  correctionFrequency: number;
  convergenceTime: number;
  driftHistory: DriftSample[];
}

export interface DriftSample {
  timestamp: number;
  driftMs: number;
  correctionApplied: boolean;
  networkLatency?: number;
}

export interface PerformanceDiagnostics {
  syncPerformance: SyncPerformanceMetrics;
  networkPerformance: NetworkPerformanceMetrics;
  resourceUsage: ResourceUsageMetrics;
  videoPerformance: VideoPerformanceMetrics;
  timestamp: number;
}

export interface SyncPerformanceMetrics {
  averageLatency: number;
  maxLatency: number;
  heartbeatMissed: number;
  convergenceFailures: number;
  driftCorrections: number;
  syncAccuracy: number; // percentage within tolerance
}

export interface NetworkPerformanceMetrics {
  connectionLatency: number;
  bandwidth: number;
  packetLoss: number;
  reconnections: number;
  messageQueueSize: number;
  throughput: number; // messages per second
}

export interface ResourceUsageMetrics {
  memoryUsage: number; // bytes
  cpuUsage: number; // percentage
  domNodes: number;
  eventListeners: number;
  timers: number;
  webSocketConnections: number;
}

export interface VideoPerformanceMetrics {
  detectionTime: number;
  renderingLatency: number;
  frameDrops: number;
  bufferHealth: number; // seconds of buffered content
  playbackStalls: number;
  qualityChanges: number;
}

export interface AdaptiveQualitySettings {
  enabled: boolean;
  heartbeatInterval: number;
  syncTolerance: number;
  maxRetries: number;
  bandwidthThreshold: number;
  latencyThreshold: number;
  qualityLevel: 'low' | 'medium' | 'high' | 'auto';
}

export interface PerformanceOptimizationConfig {
  driftAnalysisEnabled: boolean;
  bandwidthMonitoringEnabled: boolean;
  adaptiveQualityEnabled: boolean;
  resourceCleanupEnabled: boolean;
  diagnosticsInterval: number;
  maxDriftSamples: number;
  performanceLogLevel: 'none' | 'basic' | 'detailed';
}

export interface MemoryCleanupTask {
  name: string;
  priority: 'low' | 'medium' | 'high';
  execute: () => Promise<void>;
  interval?: number;
  lastRun?: number;
}

export interface BandwidthTestResult {
  downloadSpeed: number; // bits per second
  uploadSpeed: number; // bits per second
  latency: number; // milliseconds
  jitter: number; // milliseconds
  timestamp: number;
  testDuration: number; // milliseconds
}

export interface QualityAdjustment {
  reason: 'bandwidth' | 'latency' | 'packet_loss' | 'memory' | 'cpu';
  previousSettings: Partial<AdaptiveQualitySettings>;
  newSettings: Partial<AdaptiveQualitySettings>;
  timestamp: number;
  networkConditions: NetworkConditions;
}
