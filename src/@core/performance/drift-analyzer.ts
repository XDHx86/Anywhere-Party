/**
 * Drift Analyzer - Analyzes synchronization drift patterns
 * Requirements: 2.1, 2.2
 */

import { DriftAnalysis, DriftSample, PerformanceOptimizationConfig } from './types';
import { DriftCorrection } from '../sync-engine/types';

export class DriftAnalyzer {
  private driftSamples: DriftSample[] = [];
  private config: PerformanceOptimizationConfig;
  private analysisTimer: number | null = null;
  private onAnalysisUpdate?: (analysis: DriftAnalysis) => void;

  constructor(
    config: PerformanceOptimizationConfig,
    onAnalysisUpdate?: (analysis: DriftAnalysis) => void
  ) {
    this.config = config;
    this.onAnalysisUpdate = onAnalysisUpdate;
  }

  /**
   * Start drift analysis monitoring
   */
  start(): void {
    if (!this.config.driftAnalysisEnabled) {
      return;
    }

    this.stop(); // Clear any existing timer

    this.analysisTimer = window.setInterval(() => {
      const analysis = this.generateAnalysis();
      if (this.onAnalysisUpdate) {
        this.onAnalysisUpdate(analysis);
      }
    }, this.config.diagnosticsInterval);

    console.log('Drift analyzer started');
  }

  /**
   * Stop drift analysis monitoring
   */
  stop(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    console.log('Drift analyzer stopped');
  }

  /**
   * Record a drift correction event
   */
  recordDriftCorrection(correction: DriftCorrection, networkLatency?: number): void {
    if (!this.config.driftAnalysisEnabled) {
      return;
    }

    const sample: DriftSample = {
      timestamp: correction.timestamp,
      driftMs: correction.detectedDriftMs,
      correctionApplied: correction.correctionApplied,
      networkLatency,
    };

    this.driftSamples.push(sample);

    // Maintain sample history limit
    if (this.driftSamples.length > this.config.maxDriftSamples) {
      this.driftSamples.shift();
    }
  }

  /**
   * Record a drift measurement (without correction)
   */
  recordDriftMeasurement(driftMs: number, networkLatency?: number): void {
    if (!this.config.driftAnalysisEnabled) {
      return;
    }

    const sample: DriftSample = {
      timestamp: Date.now(),
      driftMs: Math.abs(driftMs),
      correctionApplied: false,
      networkLatency,
    };

    this.driftSamples.push(sample);

    // Maintain sample history limit
    if (this.driftSamples.length > this.config.maxDriftSamples) {
      this.driftSamples.shift();
    }
  }

  /**
   * Generate comprehensive drift analysis
   */
  generateAnalysis(): DriftAnalysis {
    if (this.driftSamples.length === 0) {
      return {
        averageDrift: 0,
        maxDrift: 0,
        driftVariance: 0,
        correctionFrequency: 0,
        convergenceTime: 0,
        driftHistory: [],
      };
    }

    const driftValues = this.driftSamples.map((s) => s.driftMs);
    const corrections = this.driftSamples.filter((s) => s.correctionApplied);

    // Calculate basic statistics
    const averageDrift = driftValues.reduce((sum, drift) => sum + drift, 0) / driftValues.length;
    const maxDrift = Math.max(...driftValues);

    // Calculate variance
    const variance =
      driftValues.reduce((sum, drift) => {
        const diff = drift - averageDrift;
        return sum + diff * diff;
      }, 0) / driftValues.length;

    // Calculate correction frequency (corrections per minute)
    const timeSpan = this.getTimeSpanMinutes();
    const correctionFrequency = timeSpan > 0 ? corrections.length / timeSpan : 0;

    // Calculate average convergence time
    const convergenceTime = this.calculateAverageConvergenceTime();

    return {
      averageDrift,
      maxDrift,
      driftVariance: variance,
      correctionFrequency,
      convergenceTime,
      driftHistory: [...this.driftSamples], // Return copy
    };
  }

  /**
   * Get drift trend analysis
   */
  getDriftTrend(): 'improving' | 'stable' | 'degrading' | 'insufficient_data' {
    if (this.driftSamples.length < 10) {
      return 'insufficient_data';
    }

    // Compare recent samples with older samples
    const recentSamples = this.driftSamples.slice(-5);
    const olderSamples = this.driftSamples.slice(-10, -5);

    const recentAverage =
      recentSamples.reduce((sum, s) => sum + s.driftMs, 0) / recentSamples.length;
    const olderAverage = olderSamples.reduce((sum, s) => sum + s.driftMs, 0) / olderSamples.length;

    const improvementThreshold = 0.1; // 10% improvement threshold
    const degradationThreshold = 0.15; // 15% degradation threshold

    if (recentAverage < olderAverage * (1 - improvementThreshold)) {
      return 'improving';
    } else if (recentAverage > olderAverage * (1 + degradationThreshold)) {
      return 'degrading';
    } else {
      return 'stable';
    }
  }

  /**
   * Check if drift is within acceptable bounds
   */
  isDriftAcceptable(toleranceMs: number): boolean {
    const analysis = this.generateAnalysis();
    return analysis.averageDrift <= toleranceMs && analysis.maxDrift <= toleranceMs * 2;
  }

  /**
   * Get recommendations for sync optimization
   */
  getOptimizationRecommendations(toleranceMs: number): string[] {
    const analysis = this.generateAnalysis();
    const recommendations: string[] = [];

    if (analysis.averageDrift > toleranceMs) {
      recommendations.push('Consider reducing heartbeat interval for better sync accuracy');
    }

    if (analysis.maxDrift > toleranceMs * 3) {
      recommendations.push('High drift spikes detected - check network stability');
    }

    if (analysis.correctionFrequency > 2) {
      // More than 2 corrections per minute
      recommendations.push('Frequent corrections needed - consider tighter sync tolerance');
    }

    if (analysis.driftVariance > toleranceMs * toleranceMs) {
      recommendations.push('High drift variance - network conditions may be unstable');
    }

    if (analysis.convergenceTime > 2000) {
      // More than 2 seconds
      recommendations.push('Slow convergence detected - check video element responsiveness');
    }

    const trend = this.getDriftTrend();
    if (trend === 'degrading') {
      recommendations.push('Drift performance is degrading - consider connection quality check');
    }

    return recommendations;
  }

  /**
   * Clear all drift samples
   */
  clearHistory(): void {
    this.driftSamples = [];
    console.log('Drift analysis history cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: PerformanceOptimizationConfig): void {
    const wasEnabled = this.config.driftAnalysisEnabled;
    this.config = config;

    if (config.driftAnalysisEnabled && !wasEnabled) {
      this.start();
    } else if (!config.driftAnalysisEnabled && wasEnabled) {
      this.stop();
    }
  }

  /**
   * Export drift data for analysis
   */
  exportData(): DriftSample[] {
    return [...this.driftSamples];
  }

  private getTimeSpanMinutes(): number {
    if (this.driftSamples.length < 2) {
      return 0;
    }

    const oldest = this.driftSamples[0].timestamp;
    const newest = this.driftSamples[this.driftSamples.length - 1].timestamp;
    return (newest - oldest) / (1000 * 60); // Convert to minutes
  }

  private calculateAverageConvergenceTime(): number {
    // Look for patterns where corrections are followed by stable periods
    const corrections = this.driftSamples.filter((s) => s.correctionApplied);
    if (corrections.length === 0) {
      return 0;
    }

    let totalConvergenceTime = 0;
    let convergenceCount = 0;

    for (const correction of corrections) {
      // Find the next few samples after this correction
      const correctionIndex = this.driftSamples.indexOf(correction);
      const subsequentSamples = this.driftSamples.slice(correctionIndex + 1, correctionIndex + 6);

      // Look for when drift stabilizes (stays below threshold)
      const stabilityThreshold = 100; // 100ms
      for (let i = 0; i < subsequentSamples.length; i++) {
        if (subsequentSamples[i].driftMs <= stabilityThreshold) {
          const convergenceTime = subsequentSamples[i].timestamp - correction.timestamp;
          totalConvergenceTime += convergenceTime;
          convergenceCount++;
          break;
        }
      }
    }

    return convergenceCount > 0 ? totalConvergenceTime / convergenceCount : 0;
  }
}
