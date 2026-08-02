/**
 * Monitoring Service for Runtime Bug Tracking and Error Reporting
 * Implements task 8.2: Monitoring and error reporting system
 */

import { BrowserBridge } from '../browser-bridge/types';
import { ExtensionConfig } from '../browser-bridge/types';
import { LoggingManager } from '../logging/logging-manager';

export interface RuntimeBugEvent {
  bugType:
    | 'icon_load_failure'
    | 'api_error'
    | 'state_persistence_error'
    | 'video_detection_failure'
    | 'room_creation_failure'
    | 'subtitle_engine_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  operation: string;
  errorMessage: string;
  context: Record<string, any>;
  timestamp: number;
  userId: string;
  roomId?: string;
  browserInfo: {
    userAgent: string;
    version: string;
    platform: string;
  };
  extensionVersion: string;
  recoveryAction?: string;
  userImpact: 'none' | 'minor' | 'major' | 'blocking';
}

export interface HealthMetrics {
  iconLoadSuccessRate: number;
  apiCallSuccessRate: number;
  roomCreationSuccessRate: number;
  statePersistenceSuccessRate: number;
  videoDetectionSuccessRate: number;
  averageResponseTime: number;
  errorRate: number;
  userSatisfactionScore?: number;
  activeUsers: number;
  activeRooms: number;
  timestamp: number;
}

export interface AlertConfig {
  iconLoadFailureThreshold: number; // percentage
  apiErrorThreshold: number; // percentage
  criticalErrorThreshold: number; // count per hour
  responseTimeThreshold: number; // milliseconds
  userFeedbackThreshold: number; // negative feedback count
}

export interface UserFeedback {
  id: string;
  userId: string;
  type: 'bug_report' | 'feature_request' | 'general_feedback';
  severity: 'low' | 'medium' | 'high';
  category: 'ui' | 'functionality' | 'performance' | 'compatibility' | 'other';
  title: string;
  description: string;
  steps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  browserInfo: {
    userAgent: string;
    version: string;
    platform: string;
  };
  extensionVersion: string;
  timestamp: number;
  attachments?: {
    logs: boolean;
    screenshot: boolean;
    config: boolean;
  };
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  tags: string[];
}

export class MonitoringService {
  private browserBridge: BrowserBridge;
  private loggingManager: LoggingManager;
  private config: ExtensionConfig;
  private healthMetrics: HealthMetrics;
  private alertConfig: AlertConfig;
  private isEnabled: boolean = true;

  // Counters for metrics calculation
  private counters = {
    iconLoadAttempts: 0,
    iconLoadSuccesses: 0,
    apiCallAttempts: 0,
    apiCallSuccesses: 0,
    roomCreationAttempts: 0,
    roomCreationSuccesses: 0,
    statePersistenceAttempts: 0,
    statePersistenceSuccesses: 0,
    videoDetectionAttempts: 0,
    videoDetectionSuccesses: 0,
    totalResponseTime: 0,
    responseTimeCount: 0,
    totalErrors: 0,
  };

  constructor(
    browserBridge: BrowserBridge,
    loggingManager: LoggingManager,
    config: ExtensionConfig
  ) {
    this.browserBridge = browserBridge;
    this.loggingManager = loggingManager;
    this.config = config;

    // Initialize health metrics
    this.healthMetrics = {
      iconLoadSuccessRate: 100,
      apiCallSuccessRate: 100,
      roomCreationSuccessRate: 100,
      statePersistenceSuccessRate: 100,
      videoDetectionSuccessRate: 100,
      averageResponseTime: 0,
      errorRate: 0,
      activeUsers: 0,
      activeRooms: 0,
      timestamp: Date.now(),
    };

    // Initialize alert configuration
    this.alertConfig = {
      iconLoadFailureThreshold: 10, // 10% failure rate
      apiErrorThreshold: 15, // 15% error rate
      criticalErrorThreshold: 5, // 5 critical errors per hour
      responseTimeThreshold: 5000, // 5 seconds
      userFeedbackThreshold: 3, // 3 negative feedback reports
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load saved metrics and configuration
      await this.loadSavedData();

      // Start periodic health checks
      this.startHealthMonitoring();

      // Set up alert monitoring
      this.startAlertMonitoring();

      this.loggingManager.info('monitoring_service', 'Monitoring service initialized');
    } catch (error) {
      this.loggingManager.error(
        'monitoring_service',
        'Failed to initialize monitoring service',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Track runtime bug occurrences
   */
  async trackRuntimeBug(
    event: Omit<RuntimeBugEvent, 'timestamp' | 'browserInfo' | 'extensionVersion'>
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const runtimeBugEvent: RuntimeBugEvent = {
        ...event,
        timestamp: Date.now(),
        browserInfo: this.getBrowserInfo(),
        extensionVersion: this.getExtensionVersion(),
      };

      // Log the runtime bug
      this.loggingManager.logErrorEvent({
        component: event.component,
        operation: event.operation,
        errorType: event.bugType,
        errorMessage: event.errorMessage,
        context: {
          ...event.context,
          severity: event.severity,
          userImpact: event.userImpact,
          recoveryAction: event.recoveryAction,
        },
      });

      // Store for dashboard
      await this.storeRuntimeBugEvent(runtimeBugEvent);

      // Update counters based on bug type
      this.updateCountersForBug(event.bugType, false);

      // Check if alert should be triggered
      await this.checkAlerts(runtimeBugEvent);

      // Update health metrics
      this.updateHealthMetrics();
    } catch (error) {
      console.error('Failed to track runtime bug:', error);
    }
  }

  /**
   * Track successful operations for metrics
   */
  async trackSuccess(
    operationType:
      | 'icon_load'
      | 'api_call'
      | 'room_creation'
      | 'state_persistence'
      | 'video_detection',
    responseTime?: number
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      this.updateCountersForBug(operationType as any, true);

      if (responseTime !== undefined) {
        this.counters.totalResponseTime += responseTime;
        this.counters.responseTimeCount++;
      }

      this.updateHealthMetrics();
    } catch (error) {
      console.error('Failed to track success:', error);
    }
  }

  /**
   * Get current health metrics
   */
  getHealthMetrics(): HealthMetrics {
    return { ...this.healthMetrics };
  }

  /**
   * Get runtime bug history for dashboard
   */
  async getRuntimeBugHistory(limit: number = 100): Promise<RuntimeBugEvent[]> {
    try {
      const result = await this.browserBridge.storage.local.get('runtimeBugHistory');
      const history = result.runtimeBugHistory || [];
      return history.slice(-limit);
    } catch (error) {
      this.loggingManager.error(
        'monitoring_service',
        'Failed to get runtime bug history',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  /**
   * Submit user feedback
   */
  async submitUserFeedback(
    feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'browserInfo' | 'extensionVersion' | 'status'>
  ): Promise<string> {
    try {
      const userFeedback: UserFeedback = {
        ...feedback,
        id: this.generateFeedbackId(),
        timestamp: Date.now(),
        browserInfo: this.getBrowserInfo(),
        extensionVersion: this.getExtensionVersion(),
        status: 'new',
      };

      // Store feedback
      await this.storeFeedback(userFeedback);

      // Log feedback submission
      this.loggingManager.info('user_feedback', 'User feedback submitted', {
        feedbackId: userFeedback.id,
        type: userFeedback.type,
        severity: userFeedback.severity,
        category: userFeedback.category,
      });

      // Check if feedback triggers alerts
      if (feedback.type === 'bug_report' && feedback.severity === 'high') {
        await this.checkFeedbackAlerts();
      }

      return userFeedback.id;
    } catch (error) {
      this.loggingManager.error(
        'monitoring_service',
        'Failed to submit user feedback',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get user feedback history
   */
  async getUserFeedbackHistory(limit: number = 50): Promise<UserFeedback[]> {
    try {
      const result = await this.browserBridge.storage.local.get('userFeedbackHistory');
      const history = result.userFeedbackHistory || [];
      return history.slice(-limit);
    } catch (error) {
      this.loggingManager.error(
        'monitoring_service',
        'Failed to get user feedback history',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  /**
   * Export monitoring data for analysis
   */
  async exportMonitoringData(): Promise<{
    healthMetrics: HealthMetrics;
    runtimeBugs: RuntimeBugEvent[];
    userFeedback: UserFeedback[];
    alertHistory: any[];
  }> {
    try {
      const [runtimeBugs, userFeedback, alertHistory] = await Promise.all([
        this.getRuntimeBugHistory(1000),
        this.getUserFeedbackHistory(500),
        this.getAlertHistory(),
      ]);

      return {
        healthMetrics: this.healthMetrics,
        runtimeBugs,
        userFeedback,
        alertHistory,
      };
    } catch (error) {
      this.loggingManager.error(
        'monitoring_service',
        'Failed to export monitoring data',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Update alert configuration
   */
  async updateAlertConfig(config: Partial<AlertConfig>): Promise<void> {
    try {
      this.alertConfig = { ...this.alertConfig, ...config };
      await this.browserBridge.storage.local.set({ alertConfig: this.alertConfig });
      this.loggingManager.info('monitoring_service', 'Alert configuration updated', config);
    } catch (error) {
      this.loggingManager.error(
        'monitoring_service',
        'Failed to update alert config',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Enable/disable monitoring
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    await this.browserBridge.storage.local.set({ monitoringEnabled: enabled });
    this.loggingManager.info('monitoring_service', 'Monitoring service enabled status changed', {
      enabled,
    });
  }

  // Private methods

  private async loadSavedData(): Promise<void> {
    try {
      const result = await this.browserBridge.storage.local.get([
        'healthMetrics',
        'alertConfig',
        'monitoringEnabled',
        'monitoringCounters',
      ]);

      if (result.healthMetrics) {
        this.healthMetrics = { ...this.healthMetrics, ...result.healthMetrics };
      }

      if (result.alertConfig) {
        this.alertConfig = { ...this.alertConfig, ...result.alertConfig };
      }

      if (result.monitoringEnabled !== undefined) {
        this.isEnabled = result.monitoringEnabled;
      }

      if (result.monitoringCounters) {
        this.counters = { ...this.counters, ...result.monitoringCounters };
      }
    } catch (error) {
      this.loggingManager.error(
        'monitoring_service',
        'Failed to load saved data',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private startHealthMonitoring(): void {
    // Update health metrics every 5 minutes
    setInterval(
      () => {
        this.updateHealthMetrics();
        this.saveHealthMetrics();
      },
      5 * 60 * 1000
    );
  }

  private startAlertMonitoring(): void {
    // Check for alerts every minute
    setInterval(() => {
      this.checkPeriodicAlerts();
    }, 60 * 1000);
  }

  private updateCountersForBug(bugType: string, success: boolean): void {
    switch (bugType) {
      case 'icon_load_failure':
      case 'icon_load':
        this.counters.iconLoadAttempts++;
        if (success) this.counters.iconLoadSuccesses++;
        break;
      case 'api_error':
      case 'api_call':
        this.counters.apiCallAttempts++;
        if (success) this.counters.apiCallSuccesses++;
        break;
      case 'room_creation_failure':
      case 'room_creation':
        this.counters.roomCreationAttempts++;
        if (success) this.counters.roomCreationSuccesses++;
        break;
      case 'state_persistence_error':
      case 'state_persistence':
        this.counters.statePersistenceAttempts++;
        if (success) this.counters.statePersistenceSuccesses++;
        break;
      case 'video_detection_failure':
      case 'video_detection':
        this.counters.videoDetectionAttempts++;
        if (success) this.counters.videoDetectionSuccesses++;
        break;
    }

    if (!success) {
      this.counters.totalErrors++;
    }
  }

  private updateHealthMetrics(): void {
    const now = Date.now();

    // Calculate success rates
    this.healthMetrics.iconLoadSuccessRate = this.calculateSuccessRate(
      this.counters.iconLoadSuccesses,
      this.counters.iconLoadAttempts
    );

    this.healthMetrics.apiCallSuccessRate = this.calculateSuccessRate(
      this.counters.apiCallSuccesses,
      this.counters.apiCallAttempts
    );

    this.healthMetrics.roomCreationSuccessRate = this.calculateSuccessRate(
      this.counters.roomCreationSuccesses,
      this.counters.roomCreationAttempts
    );

    this.healthMetrics.statePersistenceSuccessRate = this.calculateSuccessRate(
      this.counters.statePersistenceSuccesses,
      this.counters.statePersistenceAttempts
    );

    this.healthMetrics.videoDetectionSuccessRate = this.calculateSuccessRate(
      this.counters.videoDetectionSuccesses,
      this.counters.videoDetectionAttempts
    );

    // Calculate average response time
    this.healthMetrics.averageResponseTime =
      this.counters.responseTimeCount > 0
        ? this.counters.totalResponseTime / this.counters.responseTimeCount
        : 0;

    // Calculate error rate
    const totalAttempts =
      this.counters.iconLoadAttempts +
      this.counters.apiCallAttempts +
      this.counters.roomCreationAttempts +
      this.counters.statePersistenceAttempts +
      this.counters.videoDetectionAttempts;

    this.healthMetrics.errorRate =
      totalAttempts > 0 ? (this.counters.totalErrors / totalAttempts) * 100 : 0;

    this.healthMetrics.timestamp = now;
  }

  private calculateSuccessRate(successes: number, attempts: number): number {
    return attempts > 0 ? (successes / attempts) * 100 : 100;
  }

  private async saveHealthMetrics(): Promise<void> {
    try {
      await this.browserBridge.storage.local.set({
        healthMetrics: this.healthMetrics,
        monitoringCounters: this.counters,
      });
    } catch (error) {
      console.error('Failed to save health metrics:', error);
    }
  }

  private async storeRuntimeBugEvent(event: RuntimeBugEvent): Promise<void> {
    try {
      const result = await this.browserBridge.storage.local.get('runtimeBugHistory');
      const history = result.runtimeBugHistory || [];

      history.push(event);

      // Keep only last 1000 events
      if (history.length > 1000) {
        history.splice(0, history.length - 1000);
      }

      await this.browserBridge.storage.local.set({ runtimeBugHistory: history });
    } catch (error) {
      console.error('Failed to store runtime bug event:', error);
    }
  }

  private async storeFeedback(feedback: UserFeedback): Promise<void> {
    try {
      const result = await this.browserBridge.storage.local.get('userFeedbackHistory');
      const history = result.userFeedbackHistory || [];

      history.push(feedback);

      // Keep only last 500 feedback items
      if (history.length > 500) {
        history.splice(0, history.length - 500);
      }

      await this.browserBridge.storage.local.set({ userFeedbackHistory: history });
    } catch (error) {
      console.error('Failed to store user feedback:', error);
      throw error;
    }
  }

  private async checkAlerts(event: RuntimeBugEvent): Promise<void> {
    try {
      const alerts = [];

      // Check for critical errors
      if (event.severity === 'critical') {
        alerts.push({
          type: 'critical_error',
          message: `Critical error in ${event.component}: ${event.errorMessage}`,
          severity: 'high',
          timestamp: Date.now(),
          event,
        });
      }

      // Check success rate thresholds
      if (
        event.bugType === 'icon_load_failure' &&
        this.healthMetrics.iconLoadSuccessRate < 100 - this.alertConfig.iconLoadFailureThreshold
      ) {
        alerts.push({
          type: 'icon_load_failure_threshold',
          message: `Icon load success rate dropped to ${this.healthMetrics.iconLoadSuccessRate.toFixed(1)}%`,
          severity: 'medium',
          timestamp: Date.now(),
        });
      }

      if (
        event.bugType === 'api_error' &&
        this.healthMetrics.apiCallSuccessRate < 100 - this.alertConfig.apiErrorThreshold
      ) {
        alerts.push({
          type: 'api_error_threshold',
          message: `API call success rate dropped to ${this.healthMetrics.apiCallSuccessRate.toFixed(1)}%`,
          severity: 'medium',
          timestamp: Date.now(),
        });
      }

      // Store alerts
      if (alerts.length > 0) {
        await this.storeAlerts(alerts);
        this.loggingManager.warn('monitoring_alerts', 'Alerts triggered', {
          alertCount: alerts.length,
          alerts,
        });
      }
    } catch (error) {
      console.error('Failed to check alerts:', error);
    }
  }

  private async checkPeriodicAlerts(): Promise<void> {
    try {
      const alerts = [];

      // Check response time threshold
      if (this.healthMetrics.averageResponseTime > this.alertConfig.responseTimeThreshold) {
        alerts.push({
          type: 'response_time_threshold',
          message: `Average response time is ${this.healthMetrics.averageResponseTime.toFixed(0)}ms`,
          severity: 'medium',
          timestamp: Date.now(),
        });
      }

      // Check overall error rate
      if (this.healthMetrics.errorRate > 20) {
        // 20% error rate threshold
        alerts.push({
          type: 'high_error_rate',
          message: `Error rate is ${this.healthMetrics.errorRate.toFixed(1)}%`,
          severity: 'high',
          timestamp: Date.now(),
        });
      }

      if (alerts.length > 0) {
        await this.storeAlerts(alerts);
        this.loggingManager.warn('monitoring_alerts', 'Periodic alerts triggered', {
          alertCount: alerts.length,
        });
      }
    } catch (error) {
      console.error('Failed to check periodic alerts:', error);
    }
  }

  private async checkFeedbackAlerts(): Promise<void> {
    try {
      const recentFeedback = await this.getUserFeedbackHistory(10);
      const negativeFeedback = recentFeedback.filter(
        (f) =>
          f.type === 'bug_report' &&
          f.severity === 'high' &&
          Date.now() - f.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
      );

      if (negativeFeedback.length >= this.alertConfig.userFeedbackThreshold) {
        const alert = {
          type: 'negative_feedback_threshold',
          message: `Received ${negativeFeedback.length} high-severity bug reports in the last 24 hours`,
          severity: 'high',
          timestamp: Date.now(),
        };

        await this.storeAlerts([alert]);
        this.loggingManager.warn('monitoring_alerts', 'Negative feedback threshold alert', {
          count: negativeFeedback.length,
        });
      }
    } catch (error) {
      console.error('Failed to check feedback alerts:', error);
    }
  }

  private async storeAlerts(alerts: any[]): Promise<void> {
    try {
      const result = await this.browserBridge.storage.local.get('alertHistory');
      const history = result.alertHistory || [];

      history.push(...alerts);

      // Keep only last 200 alerts
      if (history.length > 200) {
        history.splice(0, history.length - 200);
      }

      await this.browserBridge.storage.local.set({ alertHistory: history });
    } catch (error) {
      console.error('Failed to store alerts:', error);
    }
  }

  private async getAlertHistory(): Promise<any[]> {
    try {
      const result = await this.browserBridge.storage.local.get('alertHistory');
      return result.alertHistory || [];
    } catch (error) {
      console.error('Failed to get alert history:', error);
      return [];
    }
  }

  private getBrowserInfo(): { userAgent: string; version: string; platform: string } {
    if (typeof navigator === 'undefined') {
      return { userAgent: 'unknown', version: 'unknown', platform: 'unknown' };
    }

    return {
      userAgent: navigator.userAgent,
      version: this.extractBrowserVersion(navigator.userAgent),
      platform: navigator.platform,
    };
  }

  private extractBrowserVersion(userAgent: string): string {
    const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    if (chromeMatch) return chromeMatch[1];

    const firefoxMatch = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (firefoxMatch) return firefoxMatch[1];

    return 'unknown';
  }

  private getExtensionVersion(): string {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        return chrome.runtime.getManifest().version;
      }
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private generateFeedbackId(): string {
    return 'feedback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Factory function
export function createMonitoringService(
  browserBridge: BrowserBridge,
  loggingManager: LoggingManager,
  config: ExtensionConfig
): MonitoringService {
  return new MonitoringService(browserBridge, loggingManager, config);
}
