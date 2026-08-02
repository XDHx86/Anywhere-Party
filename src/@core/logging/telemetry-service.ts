/**
 * Telemetry service with opt-out by default
 * Implements requirements 16.2, 16.3, 16.5
 */

import { BrowserBridge } from '../browser-bridge/types';
import {
  TelemetryEvent,
  TelemetryConfig,
  PerformanceMetrics,
  SyncEventData,
  ConnectionEventData,
} from './types';

export class TelemetryService {
  private config: TelemetryConfig;
  private browserBridge: BrowserBridge;
  private anonymizedUserId: string = '';
  private currentRoomId: string = '';
  private eventBuffer: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(browserBridge: BrowserBridge, config: TelemetryConfig) {
    this.browserBridge = browserBridge;
    this.config = config;
    this.initializeTelemetry();
  }

  private async initializeTelemetry(): Promise<void> {
    // Generate or retrieve anonymized user ID
    this.anonymizedUserId = await this.getAnonymizedUserId();

    // Check user's opt-out preference
    await this.checkOptOutPreference();

    // Start flush timer if telemetry is enabled
    if (this.config.enabled && !this.config.optOut) {
      this.startFlushTimer();
    }
  }

  private async getAnonymizedUserId(): Promise<string> {
    const result = await this.browserBridge.storage.local.get('anonymizedUserId');
    if (result.anonymizedUserId) {
      return result.anonymizedUserId;
    }

    // Generate anonymized ID (same as logger for consistency)
    const anonymizedId =
      'anon_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now().toString(36);
    await this.browserBridge.storage.local.set({ anonymizedUserId: anonymizedId });
    return anonymizedId;
  }

  private async checkOptOutPreference(): Promise<void> {
    const result = await this.browserBridge.storage.local.get('telemetryOptOut');

    // If user hasn't made a choice, default to opt-out as per requirement 16.2
    if (result.telemetryOptOut === undefined) {
      this.config.optOut = true;
      await this.browserBridge.storage.local.set({ telemetryOptOut: true });
    } else {
      this.config.optOut = result.telemetryOptOut;
    }
  }

  setUserId(userId: string): void {
    // Don't store the actual user ID, keep using anonymized version
    // This method exists for API compatibility but maintains anonymization
  }

  setRoomId(roomId: string): void {
    this.currentRoomId = this.config.anonymizeData ? this.anonymizeRoomId(roomId) : roomId;
  }

  private anonymizeRoomId(roomId: string): string {
    if (!this.config.anonymizeData) {
      return roomId;
    }
    // Create a consistent hash-like anonymized room ID
    let hash = 0;
    for (let i = 0; i < roomId.length; i++) {
      const char = roomId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return 'room_' + Math.abs(hash).toString(36);
  }

  private createTelemetryEvent(
    event: string,
    properties?: Record<string, any>,
    metrics?: Record<string, number>
  ): TelemetryEvent {
    const telemetryEvent: TelemetryEvent = {
      event,
      timestamp: Date.now(),
      anonymized_user_id: this.anonymizedUserId,
      properties: this.config.anonymizeData ? this.anonymizeProperties(properties) : properties,
      metrics,
    };

    if (this.currentRoomId) {
      telemetryEvent.room_id = this.currentRoomId;
    }

    return telemetryEvent;
  }

  private anonymizeProperties(properties?: Record<string, any>): Record<string, any> | undefined {
    if (!properties || !this.config.anonymizeData) {
      return properties;
    }

    const anonymized = { ...properties };

    // Remove or anonymize PII fields
    const piiFields = ['userId', 'username', 'email', 'ip', 'userAgent', 'name'];
    piiFields.forEach((field) => {
      if (anonymized[field]) {
        delete anonymized[field];
      }
    });

    // Anonymize URLs
    if (anonymized.url && typeof anonymized.url === 'string') {
      try {
        const url = new URL(anonymized.url);
        anonymized.url = `${url.protocol}//${url.hostname}${url.pathname}`;
      } catch {
        anonymized.url = '[anonymized_url]';
      }
    }

    return anonymized;
  }

  private shouldTrack(): boolean {
    return this.config.enabled && !this.config.optOut;
  }

  private addToBuffer(event: TelemetryEvent): void {
    if (!this.shouldTrack()) {
      return;
    }

    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0 || !this.shouldTrack()) {
      return;
    }

    const eventsToSend = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      if (this.config.endpoint) {
        await this.sendToEndpoint(eventsToSend);
      } else {
        // Store locally if no endpoint configured
        await this.storeLocally(eventsToSend);
      }
    } catch (error) {
      console.error('Failed to flush telemetry events:', error);

      // Add events back to buffer for retry (up to retry limit)
      if (this.config.retryAttempts > 0) {
        this.eventBuffer.unshift(...eventsToSend);
        this.config.retryAttempts--;
      }
    }
  }
  private async sendToEndpoint(events: TelemetryEvent[]): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error('No telemetry endpoint configured');
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`Telemetry endpoint returned ${response.status}: ${response.statusText}`);
    }
  }

  private async storeLocally(events: TelemetryEvent[]): Promise<void> {
    try {
      const result = await this.browserBridge.storage.local.get('watchPartyTelemetry');
      const existingEvents: TelemetryEvent[] = result.watchPartyTelemetry || [];

      const allEvents = [...existingEvents, ...events];

      // Keep only recent events to prevent storage bloat
      const maxEvents = 1000;
      const recentEvents = allEvents.sort((a, b) => b.timestamp - a.timestamp).slice(0, maxEvents);

      await this.browserBridge.storage.local.set({ watchPartyTelemetry: recentEvents });
    } catch (error) {
      console.error('Failed to store telemetry events locally:', error);
    }
  }

  // Public methods for tracking events
  trackSyncEvent(data: SyncEventData): void {
    const event = this.createTelemetryEvent(
      'sync_event',
      {
        type: data.type,
        isHost: data.isHost,
        participantCount: data.participantCount,
      },
      {
        currentTime: data.currentTime,
        targetTime: data.targetTime || 0,
        drift_ms: data.drift_ms || 0,
        playbackRate: data.playbackRate,
      }
    );

    this.addToBuffer(event);
  }

  trackConnectionEvent(data: ConnectionEventData): void {
    const event = this.createTelemetryEvent(
      'connection_event',
      {
        state: data.state,
        previousState: data.previousState,
        error: data.error,
      },
      {
        duration: data.duration || 0,
        retryAttempt: data.retryAttempt || 0,
      }
    );

    this.addToBuffer(event);
  }

  trackPerformanceMetrics(metrics: PerformanceMetrics): void {
    const event = this.createTelemetryEvent(
      'performance_metrics',
      {},
      {
        syncLatency: metrics.syncLatency,
        connectionLatency: metrics.connectionLatency,
        videoDetectionTime: metrics.videoDetectionTime,
        annotationRenderTime: metrics.annotationRenderTime,
        memoryUsage: metrics.memoryUsage || 0,
        cpuUsage: metrics.cpuUsage || 0,
      }
    );

    this.addToBuffer(event);
  }

  trackUserAction(action: string, properties?: Record<string, any>): void {
    const event = this.createTelemetryEvent('user_action', {
      action,
      ...properties,
    });

    this.addToBuffer(event);
  }

  trackError(component: string, operation: string, error: string): void {
    const event = this.createTelemetryEvent('error_event', {
      component,
      operation,
      error,
    });

    this.addToBuffer(event);
  }

  // Opt-out management
  async setOptOut(optOut: boolean): Promise<void> {
    this.config.optOut = optOut;
    await this.browserBridge.storage.local.set({ telemetryOptOut: optOut });

    if (optOut) {
      // Clear buffer and stop timer
      this.eventBuffer = [];
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }
    } else if (this.config.enabled) {
      // Restart timer if opting back in
      this.startFlushTimer();
    }
  }

  async getOptOutStatus(): Promise<boolean> {
    const result = await this.browserBridge.storage.local.get('telemetryOptOut');
    return result.telemetryOptOut !== undefined ? result.telemetryOptOut : true; // Default to opt-out
  }

  // Export telemetry data
  async exportTelemetryData(): Promise<TelemetryEvent[]> {
    try {
      const result = await this.browserBridge.storage.local.get('watchPartyTelemetry');
      return result.watchPartyTelemetry || [];
    } catch (error) {
      console.error('Failed to export telemetry data:', error);
      return [];
    }
  }

  // Clear telemetry data
  async clearTelemetryData(): Promise<void> {
    try {
      await this.browserBridge.storage.local.set({ watchPartyTelemetry: [] });
      this.eventBuffer = [];
    } catch (error) {
      console.error('Failed to clear telemetry data:', error);
    }
  }

  // Update configuration
  updateConfig(config: Partial<TelemetryConfig>): void {
    const oldOptOut = this.config.optOut;
    this.config = { ...this.config, ...config };

    // Restart timer if opt-out status changed
    if (oldOptOut !== this.config.optOut) {
      if (this.config.optOut) {
        if (this.flushTimer) {
          clearInterval(this.flushTimer);
          this.flushTimer = null;
        }
      } else if (this.config.enabled) {
        this.startFlushTimer();
      }
    }
  }

  // Cleanup on shutdown
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush any remaining events
    if (this.eventBuffer.length > 0) {
      this.flush();
    }
  }
}
