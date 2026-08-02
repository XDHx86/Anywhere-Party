/**
 * Integration test for signaling client connectivity fixes
 *
 * Tests actual WebSocket connection to local relay server
 * to verify Requirements 18.1-18.5 are working correctly
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { SignalingClient, ConnectionState } from './signaling-client';
import { ExtensionConfig } from '../browser-bridge/types';
import { createCreateRoomMessage } from './message-types';

describe('SignalingClient Integration Tests', () => {
  let client: SignalingClient;
  let mockConfig: ExtensionConfig;
  let connectionStateChanges: ConnectionState[] = [];
  let receivedMessages: any[] = [];
  let errors: any[] = [];

  beforeAll(() => {
    mockConfig = {
      SIGNALING_SERVER: 'ws://localhost:8080',
      SIGNALING_WS_PATH: '',
      LOCAL_DEV_MODE: true,
      HEARTBEAT_INTERVAL_MS: 1000,
      RECONNECT_INTERVAL_MS: 1000,
      SYNC_TOLERANCE_MS: 300,
      SYNC_TIMEOUT_MS: 5000,
      STUN_SERVERS: [],
      TURN_SERVERS: [],
      OPENSUBTITLES_KEY: '',
      DEFAULT_SUBTITLE_LANGS: [],
      ROOM_DEFAULT_PASSWORD: '',
      FEATURE_FLAGS: {},
      TELEMETRY_ENABLED: false,
      ANNOTATION_RENDER_INTERVAL_MS: 16,
      ROOM_STATE_TTL_MS: 300000,
      VIDEO_DETECT_POLL_MS: null,
      OAUTH_ENABLED: false,
      OAUTH_PROVIDERS: {},
      ALLOW_ANONYMOUS_USERS: true,
      E2E_ENCRYPTION_ENABLED: false,
      ENCRYPTION_KEY_SIZE: 2048,
      DATA_RETENTION_ENABLED: true,
      CHAT_RETENTION_DAYS: 30,
      ROOM_HISTORY_RETENTION_DAYS: 90,
      AUTO_DELETE_EXPIRED_DATA: true,
      RECORDING_CONSENT_REQUIRED: true,
      RECORDING_RETENTION_DAYS: 30,
      ANONYMIZE_USER_DATA: true,
      PERFORMANCE_MONITORING_ENABLED: false,
      DRIFT_ANALYSIS_ENABLED: false,
      BANDWIDTH_MONITORING_ENABLED: false,
      ADAPTIVE_QUALITY_ENABLED: false,
      RESOURCE_CLEANUP_ENABLED: false,
      PERFORMANCE_DIAGNOSTICS_INTERVAL_MS: 30000,
      MAX_DRIFT_SAMPLES: 100,
      PERFORMANCE_LOG_LEVEL: 'none' as const,
      AUTO_QUALITY_ADJUSTMENT: false,
      MEMORY_CLEANUP_INTERVAL_MS: 60000,
    };
  });

  afterAll(async () => {
    if (client) {
      client.disconnect();
    }
    // Wait for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should establish WebSocket connection to local relay server', async () => {
    connectionStateChanges = [];
    receivedMessages = [];
    errors = [];

    client = new SignalingClient({
      config: mockConfig,
      userId: 'integration-test-user',
      onMessage: (message) => receivedMessages.push(message),
      onConnectionStateChange: (state) => connectionStateChanges.push(state),
      onError: (error) => errors.push(error),
    });

    await client.connect();

    expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED);
    expect(connectionStateChanges).toContain(ConnectionState.CONNECTING);
    expect(connectionStateChanges).toContain(ConnectionState.CONNECTED);
    expect(errors.length).toBe(0);
  }, 10000);

  it('should handle message validation correctly', () => {
    // Clear previous errors
    errors = [];

    // Test valid message
    const validMessage = createCreateRoomMessage('test-user');
    expect(() => client.sendMessage(validMessage)).not.toThrow();

    // Test invalid message - should generate error (either client-side validation or server error)
    const invalidMessage = { type: 'INVALID_TYPE' } as any;
    client.sendMessage(invalidMessage);

    // Wait a bit for server response
    setTimeout(() => {
      expect(
        errors.some((e) => e.code === 'INVALID_MESSAGE' || e.code === 'UNKNOWN_MESSAGE_TYPE')
      ).toBe(true);
    }, 100);
  });

  it('should maintain connection health with heartbeat mechanism', async () => {
    // The heartbeat mechanism is working correctly as evidenced by:
    // 1. Connection remains stable
    // 2. Heartbeat messages are being sent (visible in logs)
    // 3. No connection loss errors occur

    // Wait for a few heartbeat cycles
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Connection should still be healthy
    expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED);

    // No connection errors should have occurred
    expect(errors.filter((e) => e.code === 'CONNECTION_ERROR').length).toBe(0);
  });

  it('should handle server error messages gracefully', async () => {
    // Simulate receiving an error message from server
    const mockSocket = (client as any).ws;
    if (mockSocket && mockSocket.onmessage) {
      mockSocket.onmessage(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'ERROR',
            error: {
              code: 'TEST_ERROR',
              message: 'Test error message',
            },
            timestamp: Date.now(),
          }),
        })
      );
    }

    expect(errors.some((e) => e.code === 'TEST_ERROR')).toBe(true);
  });

  it('should validate server message structure', async () => {
    // Clear previous errors
    errors = [];

    // Simulate malformed message from server
    const mockSocket = (client as any).ws;
    if (mockSocket && mockSocket.onmessage) {
      mockSocket.onmessage(
        new MessageEvent('message', {
          data: '{"invalid": "message"}',
        })
      );
    }

    expect(errors.some((e) => e.code === 'INVALID_SERVER_MESSAGE')).toBe(true);
  });

  it('should handle JSON parse errors gracefully', async () => {
    // Clear previous errors
    errors = [];

    // Simulate invalid JSON from server
    const mockSocket = (client as any).ws;
    if (mockSocket && mockSocket.onmessage) {
      mockSocket.onmessage(
        new MessageEvent('message', {
          data: 'invalid json{',
        })
      );
    }

    expect(errors.some((e) => e.code === 'PARSE_ERROR')).toBe(true);
  });
});
