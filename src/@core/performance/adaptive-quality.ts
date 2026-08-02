/**
 * Adaptive Quality Controller - Adjusts sync settings based on network conditions
 * Requirements: 2.1, 2.2, 2.3
 */

import {
  NetworkConditions,
  AdaptiveQualitySettings,
  QualityAdjustment,
  PerformanceOptimizationConfig,
} from './types';
import { ExtensionConfig } from '../browser-bridge/types';

export class AdaptiveQualityController {
  private config: PerformanceOptimizationConfig;
  private currentSettings: AdaptiveQualitySettings;
  private adjustmentHistory: QualityAdjustment[] = [];
  private onSettingsChange?: (settings: AdaptiveQualitySettings) => void;
  private onConfigUpdate?: (config: Partial<ExtensionConfig>) => void;

  // Quality presets
  private readonly qualityPresets = {
    low: {
      heartbeatInterval: 5000, // 5 seconds
      syncTolerance: 500, // 500ms
      maxRetries: 2,
      bandwidthThreshold: 500000, // 500 Kbps
      latencyThreshold: 300, // 300ms
    },
    medium: {
      heartbeatInterval: 2000, // 2 seconds
      syncTolerance: 300, // 300ms
      maxRetries: 3,
      bandwidthThreshold: 1500000, // 1.5 Mbps
      latencyThreshold: 200, // 200ms
    },
    high: {
      heartbeatInterval: 1000, // 1 second
      syncTolerance: 150, // 150ms
      maxRetries: 5,
      bandwidthThreshold: 5000000, // 5 Mbps
      latencyThreshold: 100, // 100ms
    },
  };

  constructor(
    config: PerformanceOptimizationConfig,
    initialSettings: AdaptiveQualitySettings,
    onSettingsChange?: (settings: AdaptiveQualitySettings) => void,
    onConfigUpdate?: (config: Partial<ExtensionConfig>) => void
  ) {
    this.config = config;
    this.currentSettings = initialSettings;
    this.onSettingsChange = onSettingsChange;
    this.onConfigUpdate = onConfigUpdate;
  }

  /**
   * Analyze network conditions and adjust quality settings
   */
  analyzeAndAdjust(networkConditions: NetworkConditions): QualityAdjustment | null {
    if (!this.config.adaptiveQualityEnabled || !this.currentSettings.enabled) {
      return null;
    }

    const recommendedQuality = this.determineOptimalQuality(networkConditions);

    if (recommendedQuality !== this.currentSettings.qualityLevel) {
      return this.adjustQuality(recommendedQuality, networkConditions);
    }

    // Check for fine-tuning adjustments even within the same quality level
    return this.performFineTuning(networkConditions);
  }

  /**
   * Manually set quality level
   */
  setQualityLevel(level: 'low' | 'medium' | 'high' | 'auto'): QualityAdjustment {
    const previousSettings = { ...this.currentSettings };

    if (level === 'auto') {
      this.currentSettings.qualityLevel = 'auto';
    } else {
      this.currentSettings.qualityLevel = level;
      this.applyQualityPreset(level);
    }

    const adjustment: QualityAdjustment = {
      reason: 'cpu',
      previousSettings,
      newSettings: { ...this.currentSettings },
      timestamp: Date.now(),
      networkConditions: this.getDefaultNetworkConditions(),
    };

    this.recordAdjustment(adjustment);
    this.notifySettingsChange();
    this.updateExtensionConfig(); // Update config for manual changes too

    return adjustment;
  }

  /**
   * Get current quality settings
   */
  getCurrentSettings(): AdaptiveQualitySettings {
    return { ...this.currentSettings };
  }

  /**
   * Get adjustment history
   */
  getAdjustmentHistory(): QualityAdjustment[] {
    return [...this.adjustmentHistory];
  }

  /**
   * Check if current settings are optimal for given conditions
   */
  areSettingsOptimal(networkConditions: NetworkConditions): boolean {
    const optimalQuality = this.determineOptimalQuality(networkConditions);
    return optimalQuality === this.currentSettings.qualityLevel;
  }

  /**
   * Get recommendations for manual adjustment
   */
  getRecommendations(networkConditions: NetworkConditions): string[] {
    const recommendations: string[] = [];
    const optimalQuality = this.determineOptimalQuality(networkConditions);

    if (optimalQuality !== this.currentSettings.qualityLevel) {
      recommendations.push(
        `Consider switching to ${optimalQuality} quality for better performance`
      );
    }

    if (networkConditions.bandwidth < this.currentSettings.bandwidthThreshold) {
      recommendations.push('Low bandwidth detected - consider reducing sync frequency');
    }

    if (networkConditions.latency > this.currentSettings.latencyThreshold) {
      recommendations.push('High latency detected - consider increasing sync tolerance');
    }

    if (networkConditions.packetLoss > 0.05) {
      recommendations.push('Packet loss detected - consider reducing retry attempts');
    }

    if (networkConditions.jitter > 100) {
      recommendations.push('High jitter detected - consider more conservative sync settings');
    }

    return recommendations;
  }

  /**
   * Update configuration
   */
  updateConfig(config: PerformanceOptimizationConfig): void {
    this.config = config;
  }

  /**
   * Clear adjustment history
   */
  clearHistory(): void {
    this.adjustmentHistory = [];
    console.log('Adaptive quality adjustment history cleared');
  }

  private determineOptimalQuality(networkConditions: NetworkConditions): 'low' | 'medium' | 'high' {
    const { bandwidth, latency, packetLoss, jitter } = networkConditions;

    // Determine quality based on network conditions
    if (
      bandwidth >= this.qualityPresets.high.bandwidthThreshold &&
      latency <= this.qualityPresets.high.latencyThreshold &&
      packetLoss < 0.02 &&
      jitter < 50
    ) {
      return 'high';
    } else if (
      bandwidth >= this.qualityPresets.medium.bandwidthThreshold &&
      latency <= this.qualityPresets.medium.latencyThreshold &&
      packetLoss < 0.05 &&
      jitter < 100
    ) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private adjustQuality(
    newQuality: 'low' | 'medium' | 'high',
    networkConditions: NetworkConditions
  ): QualityAdjustment {
    const previousSettings = { ...this.currentSettings };

    this.currentSettings.qualityLevel = newQuality;
    this.applyQualityPreset(newQuality);

    const reason = this.determineAdjustmentReason(networkConditions);

    const adjustment: QualityAdjustment = {
      reason,
      previousSettings,
      newSettings: { ...this.currentSettings },
      timestamp: Date.now(),
      networkConditions,
    };

    this.recordAdjustment(adjustment);
    this.notifySettingsChange();
    this.updateExtensionConfig();

    console.log(`Quality adjusted to ${newQuality} due to ${reason}`, adjustment);

    return adjustment;
  }

  private performFineTuning(networkConditions: NetworkConditions): QualityAdjustment | null {
    const previousSettings = { ...this.currentSettings };
    let adjusted = false;

    // Fine-tune heartbeat interval based on latency
    if (networkConditions.latency > this.currentSettings.latencyThreshold * 1.5) {
      this.currentSettings.heartbeatInterval = Math.min(
        this.currentSettings.heartbeatInterval * 1.2,
        10000 // Max 10 seconds
      );
      adjusted = true;
    } else if (networkConditions.latency < this.currentSettings.latencyThreshold * 0.5) {
      this.currentSettings.heartbeatInterval = Math.max(
        this.currentSettings.heartbeatInterval * 0.9,
        500 // Min 500ms
      );
      adjusted = true;
    }

    // Fine-tune sync tolerance based on jitter
    if (networkConditions.jitter > 100) {
      this.currentSettings.syncTolerance = Math.min(
        this.currentSettings.syncTolerance * 1.1,
        1000 // Max 1 second
      );
      adjusted = true;
    }

    if (!adjusted) {
      return null;
    }

    const adjustment: QualityAdjustment = {
      reason: this.determineAdjustmentReason(networkConditions),
      previousSettings,
      newSettings: { ...this.currentSettings },
      timestamp: Date.now(),
      networkConditions,
    };

    this.recordAdjustment(adjustment);
    this.notifySettingsChange();
    this.updateExtensionConfig();

    return adjustment;
  }

  private applyQualityPreset(quality: 'low' | 'medium' | 'high'): void {
    const preset = this.qualityPresets[quality];

    this.currentSettings.heartbeatInterval = preset.heartbeatInterval;
    this.currentSettings.syncTolerance = preset.syncTolerance;
    this.currentSettings.maxRetries = preset.maxRetries;
    this.currentSettings.bandwidthThreshold = preset.bandwidthThreshold;
    this.currentSettings.latencyThreshold = preset.latencyThreshold;
  }

  private determineAdjustmentReason(
    networkConditions: NetworkConditions
  ): QualityAdjustment['reason'] {
    if (networkConditions.bandwidth < this.currentSettings.bandwidthThreshold) {
      return 'bandwidth';
    } else if (networkConditions.latency > this.currentSettings.latencyThreshold) {
      return 'latency';
    } else if (networkConditions.packetLoss > 0.05) {
      return 'packet_loss';
    } else {
      return 'latency'; // Default to latency for fine-tuning
    }
  }

  private recordAdjustment(adjustment: QualityAdjustment): void {
    this.adjustmentHistory.push(adjustment);

    // Keep only recent adjustments
    if (this.adjustmentHistory.length > 50) {
      this.adjustmentHistory.shift();
    }
  }

  private notifySettingsChange(): void {
    if (this.onSettingsChange) {
      this.onSettingsChange({ ...this.currentSettings });
    }
  }

  private updateExtensionConfig(): void {
    if (this.onConfigUpdate) {
      const configUpdate: Partial<ExtensionConfig> = {
        HEARTBEAT_INTERVAL_MS: this.currentSettings.heartbeatInterval,
        SYNC_TOLERANCE_MS: this.currentSettings.syncTolerance,
      };

      this.onConfigUpdate(configUpdate);
    }
  }

  private getDefaultNetworkConditions(): NetworkConditions {
    return {
      bandwidth: 2000000,
      latency: 100,
      packetLoss: 0,
      jitter: 0,
      connectionType: 'unknown',
      effectiveType: '4g',
    };
  }
}
