/**
 * Data Retention and Deletion Controls
 * Implements requirement 15.3
 */

import { BrowserBridge } from '../browser-bridge/types';

export interface RetentionPolicy {
  chatMessages: {
    enabled: boolean;
    retentionDays: number;
    autoDelete: boolean;
  };
  roomHistory: {
    enabled: boolean;
    retentionDays: number;
    autoDelete: boolean;
  };
  userSessions: {
    enabled: boolean;
    retentionDays: number;
    autoDelete: boolean;
  };
  annotations: {
    enabled: boolean;
    retentionDays: number;
    autoDelete: boolean;
  };
  subtitleTracks: {
    enabled: boolean;
    retentionDays: number;
    autoDelete: boolean;
  };
  telemetryData: {
    enabled: boolean;
    retentionDays: number;
    autoDelete: boolean;
  };
}

export interface DataDeletionRequest {
  userId: string;
  dataTypes: string[];
  reason: string;
  requestedAt: number;
  processedAt?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface DataExportRequest {
  userId: string;
  dataTypes: string[];
  format: 'json' | 'csv';
  requestedAt: number;
  processedAt?: number;
  downloadUrl?: string;
  expiresAt?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface PrivacySettings {
  dataRetention: RetentionPolicy;
  allowDataExport: boolean;
  allowDataDeletion: boolean;
  requireConsentForRecording: boolean;
  anonymizeData: boolean;
  shareDataWithThirdParties: boolean;
}

export class DataRetentionManager {
  private browserBridge: BrowserBridge;
  private settings: PrivacySettings;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  // In-memory cache of requests, hydrated once from storage and written through
  // on every mutation so status lookups stay consistent with updates.
  private deletionRequestsCache: Record<string, DataDeletionRequest> | null = null;
  private exportRequestsCache: Record<string, DataExportRequest> | null = null;

  constructor(browserBridge: BrowserBridge, settings: PrivacySettings) {
    this.browserBridge = browserBridge;
    this.settings = settings;
  }

  /**
   * Initialize data retention manager
   */
  async initialize(): Promise<void> {
    console.log('Initializing data retention manager...');

    // Load existing settings
    await this.loadSettings();

    // Start cleanup interval (daily)
    this.startCleanupInterval();

    // Process any pending deletion requests
    await this.processPendingDeletions();

    console.log('Data retention manager initialized');
  }

  /**
   * Update privacy settings
   */
  async updateSettings(newSettings: Partial<PrivacySettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    console.log('Privacy settings updated');
  }

  /**
   * Get current privacy settings
   */
  getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  /**
   * Request data deletion for a user
   */
  async requestDataDeletion(userId: string, dataTypes: string[], reason: string): Promise<string> {
    if (!this.settings.allowDataDeletion) {
      throw new Error('Data deletion is not enabled');
    }

    const requestId = this.generateRequestId();
    const deletionRequest: DataDeletionRequest = {
      userId,
      dataTypes,
      reason,
      requestedAt: Date.now(),
      status: 'pending',
    };

    // Store deletion request
    const requests = await this.getDeletionRequests();
    requests[requestId] = deletionRequest;
    await this.browserBridge.storage.local.set({ dataDeletionRequests: JSON.stringify(requests) });

    console.log(`Data deletion requested for user ${userId}, request ID: ${requestId}`);

    // Process immediately if possible
    try {
      await this.processDeletionRequest(requestId, deletionRequest);
    } catch (error) {
      console.error('Failed to process deletion request immediately:', error);
    }

    return requestId;
  }

  /**
   * Request data export for a user
   */
  async requestDataExport(
    userId: string,
    dataTypes: string[],
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    if (!this.settings.allowDataExport) {
      throw new Error('Data export is not enabled');
    }

    const requestId = this.generateRequestId();
    const exportRequest: DataExportRequest = {
      userId,
      dataTypes,
      format,
      requestedAt: Date.now(),
      status: 'pending',
    };

    // Store export request
    const requests = await this.getExportRequests();
    requests[requestId] = exportRequest;
    await this.browserBridge.storage.local.set({ dataExportRequests: JSON.stringify(requests) });

    console.log(`Data export requested for user ${userId}, request ID: ${requestId}`);

    // Process immediately if possible
    try {
      await this.processExportRequest(requestId, exportRequest);
    } catch (error) {
      console.error('Failed to process export request immediately:', error);
    }

    return requestId;
  }

  /**
   * Get status of deletion request
   */
  async getDeletionRequestStatus(requestId: string): Promise<DataDeletionRequest | null> {
    const requests = await this.getDeletionRequests();
    return requests[requestId] || null;
  }

  /**
   * Get status of export request
   */
  async getExportRequestStatus(requestId: string): Promise<DataExportRequest | null> {
    const requests = await this.getExportRequests();
    return requests[requestId] || null;
  }

  /**
   * Clean up expired data based on retention policies
   */
  async performDataCleanup(): Promise<void> {
    console.log('Starting data cleanup...');

    try {
      const now = Date.now();
      const policies = this.settings.dataRetention;

      // Clean up chat messages
      if (policies.chatMessages.enabled && policies.chatMessages.autoDelete) {
        await this.cleanupChatMessages(now, policies.chatMessages.retentionDays);
      }

      // Clean up room history
      if (policies.roomHistory.enabled && policies.roomHistory.autoDelete) {
        await this.cleanupRoomHistory(now, policies.roomHistory.retentionDays);
      }

      // Clean up user sessions
      if (policies.userSessions.enabled && policies.userSessions.autoDelete) {
        await this.cleanupUserSessions(now, policies.userSessions.retentionDays);
      }

      // Clean up annotations
      if (policies.annotations.enabled && policies.annotations.autoDelete) {
        await this.cleanupAnnotations(now, policies.annotations.retentionDays);
      }

      // Clean up subtitle tracks
      if (policies.subtitleTracks.enabled && policies.subtitleTracks.autoDelete) {
        await this.cleanupSubtitleTracks(now, policies.subtitleTracks.retentionDays);
      }

      // Clean up telemetry data
      if (policies.telemetryData.enabled && policies.telemetryData.autoDelete) {
        await this.cleanupTelemetryData(now, policies.telemetryData.retentionDays);
      }

      console.log('Data cleanup completed');
    } catch (error) {
      console.error('Data cleanup failed:', error);
    }
  }

  /**
   * Anonymize user data
   */
  async anonymizeUserData(userId: string): Promise<void> {
    if (!this.settings.anonymizeData) {
      return;
    }

    console.log(`Anonymizing data for user: ${userId}`);

    try {
      // Get all stored data
      const allData = await this.browserBridge.storage.local.get();

      // Anonymize user references in stored data
      const anonymizedData: Record<string, unknown> = {};
      const anonymousId = this.generateAnonymousId();

      for (const [key, value] of Object.entries(allData)) {
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            anonymizedData[key] = JSON.stringify(this.anonymizeObject(parsed, userId, anonymousId));
          } catch {
            // Not JSON, anonymize as string
            anonymizedData[key] = this.anonymizeString(value, userId, anonymousId);
          }
        } else {
          anonymizedData[key] = this.anonymizeObject(value, userId, anonymousId);
        }
      }

      // Save anonymized data
      await this.browserBridge.storage.local.set(anonymizedData);

      console.log(`Data anonymized for user: ${userId}`);
    } catch (error) {
      console.error('Failed to anonymize user data:', error);
      throw error;
    }
  }

  /**
   * Get data retention statistics
   */
  async getRetentionStats(): Promise<Record<string, unknown>> {
    try {
      const allData = await this.browserBridge.storage.local.get();
      const stats = {
        totalKeys: Object.keys(allData).length,
        estimatedSize: JSON.stringify(allData).length,
        dataTypes: {
          chatMessages: 0,
          roomHistory: 0,
          userSessions: 0,
          annotations: 0,
          subtitleTracks: 0,
          telemetryData: 0,
          other: 0,
        },
      };

      // Categorize data types
      for (const key of Object.keys(allData)) {
        if (key.includes('chat') || key.includes('message')) {
          stats.dataTypes.chatMessages++;
        } else if (key.includes('room') || key.includes('history')) {
          stats.dataTypes.roomHistory++;
        } else if (key.includes('session') || key.includes('auth')) {
          stats.dataTypes.userSessions++;
        } else if (key.includes('annotation')) {
          stats.dataTypes.annotations++;
        } else if (key.includes('subtitle')) {
          stats.dataTypes.subtitleTracks++;
        } else if (key.includes('telemetry') || key.includes('analytics')) {
          stats.dataTypes.telemetryData++;
        } else {
          stats.dataTypes.other++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Failed to get retention stats:', error);
      return {};
    }
  }

  /**
   * Load privacy settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const stored = await this.browserBridge.storage.local.get('privacySettings');
      if (stored.privacySettings) {
        const storedSettings = JSON.parse(stored.privacySettings as string);
        this.settings = { ...this.settings, ...storedSettings };
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  }

  /**
   * Save privacy settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await this.browserBridge.storage.local.set({
        privacySettings: JSON.stringify(this.settings),
      });
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup daily
    // Use global setInterval instead of window.setInterval for service worker compatibility
    this.cleanupInterval = setInterval(
      () => {
        this.performDataCleanup().catch(console.error);
      },
      24 * 60 * 60 * 1000
    );
  }

  /**
   * Process pending deletion requests
   */
  private async processPendingDeletions(): Promise<void> {
    const requests = await this.getDeletionRequests();

    for (const [requestId, request] of Object.entries(requests)) {
      if (request.status === 'pending') {
        try {
          await this.processDeletionRequest(requestId, request);
        } catch (error) {
          console.error(`Failed to process deletion request ${requestId}:`, error);
        }
      }
    }
  }

  /**
   * Process a single deletion request
   */
  private async processDeletionRequest(
    requestId: string,
    request: DataDeletionRequest
  ): Promise<void> {
    console.log(`Processing deletion request ${requestId} for user ${request.userId}`);

    try {
      // Update status to processing
      await this.updateDeletionRequestStatus(requestId, 'processing');

      // Delete requested data types
      for (const dataType of request.dataTypes) {
        await this.deleteUserDataByType(request.userId, dataType);
      }

      // Update status to completed
      await this.updateDeletionRequestStatus(requestId, 'completed', Date.now());

      console.log(`Deletion request ${requestId} completed successfully`);
    } catch (error) {
      console.error(`Deletion request ${requestId} failed:`, error);
      await this.updateDeletionRequestStatus(requestId, 'failed');
    }
  }

  /**
   * Process a single export request
   */
  private async processExportRequest(requestId: string, request: DataExportRequest): Promise<void> {
    console.log(`Processing export request ${requestId} for user ${request.userId}`);

    try {
      // Update status to processing
      await this.updateExportRequestStatus(requestId, 'processing');

      // Collect requested data
      const userData = await this.collectUserData(request.userId, request.dataTypes);

      // Format data
      const formattedData =
        request.format === 'csv' ? this.formatAsCSV(userData) : JSON.stringify(userData, null, 2);

      // Create download blob URL (in a real implementation, this would be uploaded to a secure server)
      const blob = new Blob([formattedData], {
        type: request.format === 'csv' ? 'text/csv' : 'application/json',
      });
      const downloadUrl = URL.createObjectURL(blob);

      // Update status to completed
      await this.updateExportRequestStatus(
        requestId,
        'completed',
        Date.now(),
        downloadUrl,
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ); // 7 days expiry

      console.log(`Export request ${requestId} completed successfully`);
    } catch (error) {
      console.error(`Export request ${requestId} failed:`, error);
      await this.updateExportRequestStatus(requestId, 'failed');
    }
  }

  /**
   * Delete user data by type
   */
  private async deleteUserDataByType(userId: string, dataType: string): Promise<void> {
    const allData = await this.browserBridge.storage.local.get();
    const keysToDelete: string[] = [];

    for (const [key, value] of Object.entries(allData)) {
      if (this.containsUserData(key, value, userId, dataType)) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      await this.browserBridge.storage.local.remove(keysToDelete);
      console.log(`Deleted ${keysToDelete.length} items for user ${userId}, type ${dataType}`);
    }
  }

  /**
   * Collect user data for export
   */
  private async collectUserData(
    userId: string,
    dataTypes: string[]
  ): Promise<Record<string, Record<string, unknown>>> {
    const allData = await this.browserBridge.storage.local.get();
    const userData: Record<string, Record<string, unknown>> = {};

    for (const [key, value] of Object.entries(allData)) {
      for (const dataType of dataTypes) {
        if (this.containsUserData(key, value, userId, dataType)) {
          if (!userData[dataType]) {
            userData[dataType] = {};
          }
          userData[dataType][key] = value;
        }
      }
    }

    return userData;
  }

  /**
   * Check if data contains user information of specific type
   */
  private containsUserData(key: string, value: unknown, userId: string, dataType: string): boolean {
    const keyLower = key.toLowerCase();
    const dataTypeLower = dataType.toLowerCase();

    // Check if key matches data type
    if (!keyLower.includes(dataTypeLower.replace('_', ''))) {
      return false;
    }

    // Check if value contains user ID
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    return valueStr.includes(userId);
  }

  /**
   * Cleanup methods for different data types
   */
  private async cleanupChatMessages(now: number, retentionDays: number): Promise<void> {
    const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;

    try {
      const allData = await this.browserBridge.storage.local.get();
      const retained: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(allData)) {
        if (!key.toLowerCase().includes('chat') && !key.toLowerCase().includes('message')) {
          retained[key] = value;
          continue;
        }

        let timestamp: number | undefined;
        if (typeof value === 'string') {
          try {
            timestamp = JSON.parse(value)?.timestamp;
          } catch {
            // Not JSON — keep it untouched
          }
        }

        // Drop chat data older than the retention cutoff
        if (typeof timestamp === 'number' && timestamp < cutoff) {
          continue;
        }
        retained[key] = value;
      }

      if (Object.keys(retained).length !== Object.keys(allData).length) {
        await this.browserBridge.storage.local.set(retained);
      }

      console.log(`Cleaning up chat messages older than ${retentionDays} days`);
    } catch (error) {
      console.error('Failed to clean up chat messages:', error);
    }
  }

  private async cleanupRoomHistory(_now: number, retentionDays: number): Promise<void> {
    // Implementation would clean up room history older than the cutoff time
    console.log(`Cleaning up room history older than ${retentionDays} days`);
  }

  private async cleanupUserSessions(_now: number, retentionDays: number): Promise<void> {
    // Implementation would clean up user sessions older than the cutoff time
    console.log(`Cleaning up user sessions older than ${retentionDays} days`);
  }

  private async cleanupAnnotations(_now: number, retentionDays: number): Promise<void> {
    // Implementation would clean up annotations older than the cutoff time
    console.log(`Cleaning up annotations older than ${retentionDays} days`);
  }

  private async cleanupSubtitleTracks(_now: number, retentionDays: number): Promise<void> {
    // Implementation would clean up subtitle tracks older than the cutoff time
    console.log(`Cleaning up subtitle tracks older than ${retentionDays} days`);
  }

  private async cleanupTelemetryData(_now: number, retentionDays: number): Promise<void> {
    // Implementation would clean up telemetry data older than the cutoff time
    console.log(`Cleaning up telemetry data older than ${retentionDays} days`);
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnonymousId(): string {
    return `anon_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getDeletionRequests(): Promise<Record<string, DataDeletionRequest>> {
    if (this.deletionRequestsCache) {
      return this.deletionRequestsCache;
    }
    try {
      const stored = await this.browserBridge.storage.local.get('dataDeletionRequests');
      this.deletionRequestsCache = stored.dataDeletionRequests
        ? JSON.parse(stored.dataDeletionRequests as string)
        : {};
    } catch (error) {
      console.error('Failed to load deletion requests:', error);
      this.deletionRequestsCache = {};
    }
    return this.deletionRequestsCache ?? {};
  }

  private async getExportRequests(): Promise<Record<string, DataExportRequest>> {
    if (this.exportRequestsCache) {
      return this.exportRequestsCache;
    }
    try {
      const stored = await this.browserBridge.storage.local.get('dataExportRequests');
      this.exportRequestsCache = stored.dataExportRequests
        ? JSON.parse(stored.dataExportRequests as string)
        : {};
    } catch (error) {
      console.error('Failed to load export requests:', error);
      this.exportRequestsCache = {};
    }
    return this.exportRequestsCache ?? {};
  }

  private async updateDeletionRequestStatus(
    requestId: string,
    status: DataDeletionRequest['status'],
    processedAt?: number
  ): Promise<void> {
    const requests = await this.getDeletionRequests();
    if (requests[requestId]) {
      requests[requestId].status = status;
      if (processedAt) {
        requests[requestId].processedAt = processedAt;
      }
      await this.browserBridge.storage.local.set({
        dataDeletionRequests: JSON.stringify(requests),
      });
    }
  }

  private async updateExportRequestStatus(
    requestId: string,
    status: DataExportRequest['status'],
    processedAt?: number,
    downloadUrl?: string,
    expiresAt?: number
  ): Promise<void> {
    const requests = await this.getExportRequests();
    if (requests[requestId]) {
      requests[requestId].status = status;
      if (processedAt) requests[requestId].processedAt = processedAt;
      if (downloadUrl) requests[requestId].downloadUrl = downloadUrl;
      if (expiresAt) requests[requestId].expiresAt = expiresAt;
      await this.browserBridge.storage.local.set({ dataExportRequests: JSON.stringify(requests) });
    }
  }

  private anonymizeObject(obj: unknown, userId: string, anonymousId: string): unknown {
    if (typeof obj === 'string') {
      return this.anonymizeString(obj, userId, anonymousId);
    } else if (Array.isArray(obj)) {
      return obj.map((item) => this.anonymizeObject(item, userId, anonymousId));
    } else if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.anonymizeObject(value, userId, anonymousId);
      }
      return result;
    }
    return obj;
  }

  private anonymizeString(str: string, userId: string, anonymousId: string): string {
    return str.replace(new RegExp(userId, 'g'), anonymousId);
  }

  private formatAsCSV(data: Record<string, unknown>): string {
    // Simple CSV formatting - in a real implementation, this would be more sophisticated
    const rows: string[] = [];

    for (const [dataType, typeData] of Object.entries(data)) {
      rows.push(`Data Type: ${dataType}`);

      if (typeData !== null && typeof typeData === 'object') {
        for (const [key, value] of Object.entries(typeData)) {
          const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
          rows.push(`${key},${valueStr.replace(/,/g, ';')}`);
        }
      }

      rows.push(''); // Empty line between data types
    }

    return rows.join('\n');
  }

  /**
   * Shutdown data retention manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('Data retention manager shutdown');
  }
}
