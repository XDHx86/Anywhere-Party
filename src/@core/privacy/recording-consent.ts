/**
 * Recording Consent and Retention Policies
 * Implements requirement 15.3 (recording consent and retention policies)
 */

import { BrowserBridge } from '../browser-bridge/types';

export interface RecordingConsent {
  userId: string;
  roomId: string;
  consentGiven: boolean;
  consentTimestamp: number;
  consentVersion: string;
  recordingTypes: RecordingType[];
  retentionPeriod: number; // in days
  canRevoke: boolean;
  revokedAt?: number;
}

export interface RecordingPolicy {
  enabled: boolean;
  requireExplicitConsent: boolean;
  allowConsentRevocation: boolean;
  defaultRetentionDays: number;
  maxRetentionDays: number;
  recordingTypes: {
    audio: boolean;
    video: boolean;
    screen: boolean;
    chat: boolean;
    annotations: boolean;
  };
  notificationSettings: {
    showRecordingIndicator: boolean;
    notifyOnStart: boolean;
    notifyOnStop: boolean;
    reminderInterval: number; // in minutes
  };
  dataHandling: {
    encryptRecordings: boolean;
    anonymizeParticipants: boolean;
    allowDownload: boolean;
    allowSharing: boolean;
    autoDeleteAfterRetention: boolean;
  };
}

export interface RecordingSession {
  id: string;
  roomId: string;
  initiatorId: string;
  startTime: number;
  endTime?: number;
  recordingTypes: RecordingType[];
  participants: string[];
  consentedParticipants: string[];
  status: 'starting' | 'recording' | 'stopped' | 'processing' | 'completed' | 'failed';
  retentionPolicy: {
    retentionDays: number;
    deleteAfter: number;
    notifyBeforeDeletion: boolean;
  };
  metadata: {
    fileSize?: number;
    duration?: number;
    format?: string;
    location?: string;
  };
}

export type RecordingType = 'audio' | 'video' | 'screen' | 'chat' | 'annotations';

export interface ConsentRequest {
  id: string;
  roomId: string;
  requesterId: string;
  recordingTypes: RecordingType[];
  retentionDays: number;
  purpose: string;
  requestedAt: number;
  expiresAt: number;
  responses: Map<string, boolean>;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

export class RecordingConsentManager {
  private browserBridge: BrowserBridge;
  private policy: RecordingPolicy;
  private activeConsents: Map<string, RecordingConsent> = new Map();
  private activeSessions: Map<string, RecordingSession> = new Map();
  private consentRequests: Map<string, ConsentRequest> = new Map();
  private reminderInterval: ReturnType<typeof setInterval> | null = null;

  constructor(browserBridge: BrowserBridge, policy: RecordingPolicy) {
    this.browserBridge = browserBridge;
    this.policy = policy;
  }

  /**
   * Initialize recording consent manager
   */
  async initialize(): Promise<void> {
    console.log('Initializing recording consent manager...');

    // Load existing consents and sessions
    await this.loadStoredData();

    // Start reminder interval if enabled
    if (this.policy.notificationSettings.reminderInterval > 0) {
      this.startReminderInterval();
    }

    // Clean up expired consent requests
    await this.cleanupExpiredRequests();

    console.log('Recording consent manager initialized');
  }

  /**
   * Request recording consent from participants
   */
  async requestRecordingConsent(
    roomId: string,
    requesterId: string,
    recordingTypes: RecordingType[],
    participants: string[],
    purpose: string,
    retentionDays: number = this.policy.defaultRetentionDays
  ): Promise<string> {
    if (!this.policy.enabled) {
      throw new Error('Recording is not enabled');
    }

    if (retentionDays > this.policy.maxRetentionDays) {
      throw new Error(`Retention period cannot exceed ${this.policy.maxRetentionDays} days`);
    }

    // Validate recording types
    for (const type of recordingTypes) {
      if (!this.policy.recordingTypes[type]) {
        throw new Error(`Recording type '${type}' is not allowed`);
      }
    }

    const requestId = this.generateRequestId();
    const consentRequest: ConsentRequest = {
      id: requestId,
      roomId,
      requesterId,
      recordingTypes,
      retentionDays,
      purpose,
      requestedAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes to respond
      responses: new Map(),
      status: 'pending',
    };

    this.consentRequests.set(requestId, consentRequest);
    await this.saveConsentRequests();

    console.log(`Recording consent requested: ${requestId} for room ${roomId}`);

    // If explicit consent is not required, auto-approve
    if (!this.policy.requireExplicitConsent) {
      await this.autoApproveConsent(requestId, participants);
    }

    return requestId;
  }

  /**
   * Respond to consent request
   */
  async respondToConsentRequest(
    requestId: string,
    userId: string,
    consent: boolean
  ): Promise<void> {
    const request = this.consentRequests.get(requestId);
    if (!request) {
      throw new Error('Consent request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Consent request is no longer active');
    }

    if (Date.now() > request.expiresAt) {
      request.status = 'expired';
      await this.saveConsentRequests();
      throw new Error('Consent request has expired');
    }

    // Record response
    request.responses.set(userId, consent);

    // Create or update consent record
    if (consent) {
      const consentRecord: RecordingConsent = {
        userId,
        roomId: request.roomId,
        consentGiven: true,
        consentTimestamp: Date.now(),
        consentVersion: '1.0',
        recordingTypes: request.recordingTypes,
        retentionPeriod: request.retentionDays,
        canRevoke: this.policy.allowConsentRevocation,
      };

      this.activeConsents.set(`${userId}_${request.roomId}`, consentRecord);
    }

    await this.saveConsents();
    await this.saveConsentRequests();

    console.log(`Consent response recorded: ${userId} -> ${consent} for request ${requestId}`);

    // Check if all participants have responded
    await this.checkConsentRequestCompletion(requestId);
  }

  /**
   * Revoke previously given consent
   */
  async revokeConsent(userId: string, roomId: string): Promise<void> {
    if (!this.policy.allowConsentRevocation) {
      throw new Error('Consent revocation is not allowed');
    }

    const consentKey = `${userId}_${roomId}`;
    const consent = this.activeConsents.get(consentKey);

    if (!consent) {
      throw new Error('No consent found to revoke');
    }

    if (!consent.canRevoke) {
      throw new Error('This consent cannot be revoked');
    }

    // Mark consent as revoked
    consent.consentGiven = false;
    consent.revokedAt = Date.now();

    await this.saveConsents();

    // Stop any active recordings for this user
    await this.handleConsentRevocation(userId, roomId);

    console.log(`Consent revoked by user ${userId} for room ${roomId}`);
  }

  /**
   * Start recording session
   */
  async startRecordingSession(
    roomId: string,
    initiatorId: string,
    recordingTypes: RecordingType[],
    participants: string[]
  ): Promise<string> {
    // Check if all participants have given consent
    const consentedParticipants = participants.filter((userId) => {
      const consent = this.activeConsents.get(`${userId}_${roomId}`);
      return consent && consent.consentGiven && !consent.revokedAt;
    });

    if (
      this.policy.requireExplicitConsent &&
      consentedParticipants.length !== participants.length
    ) {
      throw new Error('Not all participants have given consent for recording');
    }

    const sessionId = this.generateSessionId();
    const session: RecordingSession = {
      id: sessionId,
      roomId,
      initiatorId,
      startTime: Date.now(),
      recordingTypes,
      participants,
      consentedParticipants,
      status: 'starting',
      retentionPolicy: {
        retentionDays: this.policy.defaultRetentionDays,
        deleteAfter: Date.now() + this.policy.defaultRetentionDays * 24 * 60 * 60 * 1000,
        notifyBeforeDeletion: true,
      },
      metadata: {},
    };

    this.activeSessions.set(sessionId, session);
    await this.saveSessions();

    // Notify participants if enabled
    if (this.policy.notificationSettings.notifyOnStart) {
      await this.notifyParticipants(roomId, 'recording_started', { sessionId, recordingTypes });
    }

    console.log(`Recording session started: ${sessionId} for room ${roomId}`);
    return sessionId;
  }

  /**
   * Stop recording session
   */
  async stopRecordingSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Recording session not found');
    }

    session.endTime = Date.now();
    session.status = 'stopped';

    await this.saveSessions();

    // Notify participants if enabled
    if (this.policy.notificationSettings.notifyOnStop) {
      await this.notifyParticipants(session.roomId, 'recording_stopped', { sessionId });
    }

    console.log(`Recording session stopped: ${sessionId}`);
  }

  /**
   * Get consent status for user in room
   */
  getConsentStatus(userId: string, roomId: string): RecordingConsent | null {
    const consent = this.activeConsents.get(`${userId}_${roomId}`);
    return consent ? { ...consent } : null;
  }

  /**
   * Get active recording sessions for room
   */
  getActiveRecordingSessions(roomId: string): RecordingSession[] {
    return Array.from(this.activeSessions.values())
      .filter((session) => session.roomId === roomId && session.status === 'recording')
      .map((session) => ({ ...session }));
  }

  /**
   * Get recording policy
   */
  getRecordingPolicy(): RecordingPolicy {
    return { ...this.policy };
  }

  /**
   * Update recording policy
   */
  async updateRecordingPolicy(updates: Partial<RecordingPolicy>): Promise<void> {
    this.policy = { ...this.policy, ...updates };
    await this.savePolicy();
    console.log('Recording policy updated');
  }

  /**
   * Get consent request status
   */
  getConsentRequestStatus(requestId: string): ConsentRequest | null {
    const request = this.consentRequests.get(requestId);
    return request ? { ...request } : null;
  }

  /**
   * Clean up expired data
   */
  async performCleanup(): Promise<void> {
    console.log('Performing recording consent cleanup...');

    const now = Date.now();

    // Clean up expired consent requests
    await this.cleanupExpiredRequests();

    // Clean up expired recording sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.retentionPolicy.deleteAfter < now) {
        this.activeSessions.delete(sessionId);
        console.log(`Deleted expired recording session: ${sessionId}`);
      }
    }

    await this.saveSessions();
    console.log('Recording consent cleanup completed');
  }

  /**
   * Private helper methods
   */
  private async loadStoredData(): Promise<void> {
    try {
      const stored = await this.browserBridge.storage.local.get([
        'recordingConsents',
        'recordingSessions',
        'consentRequests',
        'recordingPolicy',
      ]);

      if (stored.recordingConsents) {
        const consents = JSON.parse(stored.recordingConsents);
        this.activeConsents = new Map(Object.entries(consents));
      }

      if (stored.recordingSessions) {
        const sessions = JSON.parse(stored.recordingSessions);
        this.activeSessions = new Map(Object.entries(sessions));
      }

      if (stored.consentRequests) {
        const requests = JSON.parse(stored.consentRequests);
        for (const [id, request] of Object.entries(requests)) {
          const req = request as any;
          req.responses = new Map(Object.entries(req.responses || {}));
          this.consentRequests.set(id, req);
        }
      }

      if (stored.recordingPolicy) {
        const policy = JSON.parse(stored.recordingPolicy);
        this.policy = { ...this.policy, ...policy };
      }
    } catch (error) {
      console.error('Failed to load stored recording data:', error);
    }
  }

  private async saveConsents(): Promise<void> {
    const consents = Object.fromEntries(this.activeConsents.entries());
    await this.browserBridge.storage.local.set({
      recordingConsents: JSON.stringify(consents),
    });
  }

  private async saveSessions(): Promise<void> {
    const sessions = Object.fromEntries(this.activeSessions.entries());
    await this.browserBridge.storage.local.set({
      recordingSessions: JSON.stringify(sessions),
    });
  }

  private async saveConsentRequests(): Promise<void> {
    const requests: Record<string, any> = {};
    for (const [id, request] of this.consentRequests.entries()) {
      requests[id] = {
        ...request,
        responses: Object.fromEntries(request.responses.entries()),
      };
    }
    await this.browserBridge.storage.local.set({
      consentRequests: JSON.stringify(requests),
    });
  }

  private async savePolicy(): Promise<void> {
    await this.browserBridge.storage.local.set({
      recordingPolicy: JSON.stringify(this.policy),
    });
  }

  private async autoApproveConsent(requestId: string, participants: string[]): Promise<void> {
    const request = this.consentRequests.get(requestId);
    if (!request) return;

    for (const userId of participants) {
      await this.respondToConsentRequest(requestId, userId, true);
    }
  }

  private async checkConsentRequestCompletion(requestId: string): Promise<void> {
    const request = this.consentRequests.get(requestId);
    if (!request) return;

    // Check if we have responses from all participants
    const allResponded = request.responses.size >= 1; // At least one response for now

    if (allResponded) {
      const allApproved = Array.from(request.responses.values()).every((response) => response);
      request.status = allApproved ? 'approved' : 'denied';
      await this.saveConsentRequests();
    }
  }

  private async handleConsentRevocation(userId: string, roomId: string): Promise<void> {
    // Find and stop any active recording sessions that include this user
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.roomId === roomId && session.participants.includes(userId)) {
        if (session.status === 'recording') {
          await this.stopRecordingSession(sessionId);
        }
      }
    }
  }

  private async cleanupExpiredRequests(): Promise<void> {
    const now = Date.now();
    for (const [requestId, request] of this.consentRequests.entries()) {
      if (request.expiresAt < now && request.status === 'pending') {
        request.status = 'expired';
      }
    }
    await this.saveConsentRequests();
  }

  private startReminderInterval(): void {
    const intervalMs = this.policy.notificationSettings.reminderInterval * 60 * 1000;
    // Use global setInterval instead of window.setInterval for service worker compatibility
    this.reminderInterval = setInterval(() => {
      this.sendRecordingReminders().catch(console.error);
    }, intervalMs);
  }

  private async sendRecordingReminders(): Promise<void> {
    for (const session of this.activeSessions.values()) {
      if (session.status === 'recording') {
        await this.notifyParticipants(session.roomId, 'recording_reminder', {
          sessionId: session.id,
          duration: Date.now() - session.startTime,
        });
      }
    }
  }

  private async notifyParticipants(roomId: string, type: string, data: any): Promise<void> {
    // In a real implementation, this would send notifications to participants
    console.log(`Notification sent to room ${roomId}: ${type}`, data);
  }

  private generateRequestId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown recording consent manager
   */
  shutdown(): void {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
    console.log('Recording consent manager shutdown');
  }
}
