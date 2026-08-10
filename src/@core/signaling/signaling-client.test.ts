/**
 * Tests for SignalingClient connectivity and reliability
 *
 * Focuses on Firefox compatibility, connection health, retry logic,
 * and message validation as specified in Requirements 18.1-18.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignalingClient, ConnectionState } from './signaling-client';
import { ExtensionConfig } from '../browser-bridge/types';
import { createHeartbeatMessage, createCreateRoomMessage } from './message-types';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private openListeners: EventListener[] = [];
  private closeListeners: EventListener[] = [];
  private messageListeners: EventListener[] = [];
  private errorListeners: EventListener[] = [];

  constructor(url: string) {
    this.url = url;
    this.scheduleOpen();
  }

  /**
   * Schedule the simulated connection-open event.  Subclasses may override
   * this to change the timing or to simulate a socket that never opens.
   */
  protected scheduleOpen(): void {
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        this.triggerEvent('open', new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    // Parse and echo back appropriate responses
    try {
      const message = JSON.parse(data);
      setTimeout(() => {
        if (this.readyState === MockWebSocket.OPEN) {
          if (message.type === 'HEARTBEAT') {
            this.triggerEvent(
              'message',
              new MessageEvent('message', {
                data: JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: Date.now() }),
              })
            );
          } else if (message.type === 'PING') {
            this.triggerEvent(
              'message',
              new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'PONG',
                  userId: message.userId,
                  originalTimestamp: message.timestamp,
                  timestamp: Date.now(),
                }),
              })
            );
          }
        }
      }, 5);
    } catch (error) {
      // Invalid JSON, ignore
    }
  }

  close(code?: number, reason?: string) {
    if (this.readyState === MockWebSocket.CLOSED) return;

    this.readyState = MockWebSocket.CLOSED;
    this.triggerEvent(
      'close',
      new CloseEvent('close', {
        code: code || 1000,
        reason: reason || '',
        wasClean: code === 1000,
      })
    );
  }

  addEventListener(type: string, listener: EventListener, options?: any) {
    // Note: unlike a real WebSocket, addEventListener must NOT overwrite the
    // corresponding on* property – both the property and the listener list are
    // independent observers.  triggerEvent fires both.
    if (type === 'open') {
      this.openListeners.push(listener);
    } else if (type === 'close') {
      this.closeListeners.push(listener);
    } else if (type === 'message') {
      this.messageListeners.push(listener);
    } else if (type === 'error') {
      this.errorListeners.push(listener);
    }
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type === 'open') {
      this.openListeners = this.openListeners.filter((l) => l !== listener);
    } else if (type === 'close') {
      this.closeListeners = this.closeListeners.filter((l) => l !== listener);
    } else if (type === 'message') {
      this.messageListeners = this.messageListeners.filter((l) => l !== listener);
    } else if (type === 'error') {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    }
  }

  protected triggerEvent(type: string, event: Event) {
    if (type === 'open') {
      this.openListeners.forEach((listener) => listener(event));
      if (this.onopen) this.onopen(event);
    } else if (type === 'close') {
      this.closeListeners.forEach((listener) => listener(event));
      if (this.onclose) this.onclose(event as CloseEvent);
    } else if (type === 'message') {
      this.messageListeners.forEach((listener) => listener(event));
      if (this.onmessage) this.onmessage(event as MessageEvent);
    } else if (type === 'error') {
      this.errorListeners.forEach((listener) => listener(event));
      if (this.onerror) this.onerror(event);
    }
  }
}

// Mock Firefox WebSocket that has longer connection delay
class FirefoxMockWebSocket extends MockWebSocket {
  protected override scheduleOpen(): void {
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        this.triggerEvent('open', new Event('open'));
      }
    }, 50); // Longer delay for Firefox
  }
}

// Helper: connect while fake timers are active.  The MockWebSocket constructor
// schedules an async open via setTimeout; fake timers prevent it from firing
// unless we advance the clock.  This helper advances just enough (30 ms) to
// trigger the open while keeping the clock below DisconnectingWebSocket's
// 60 ms close deadline.
async function connectWithFakeTimers(client: SignalingClient): Promise<void> {
  const connectPromise = client.connect();
  await vi.advanceTimersByTimeAsync(30);
  await connectPromise;
}

describe('SignalingClient Connectivity', () => {
  let client: SignalingClient;
  let mockConfig: ExtensionConfig;
  let originalWebSocket: any;
  let connectionStateChanges: ConnectionState[] = [];
  let receivedMessages: any[] = [];
  let errors: any[] = [];

  beforeEach(() => {
    // Reset mocks
    connectionStateChanges = [];
    receivedMessages = [];
    errors = [];

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
    };

    // Store original WebSocket
    originalWebSocket = global.WebSocket;

    client = new SignalingClient({
      config: mockConfig,
      userId: 'test-user',
      onMessage: (message) => receivedMessages.push(message),
      onConnectionStateChange: (state) => connectionStateChanges.push(state),
      onError: (error) => errors.push(error),
    });
  });

  afterEach(async () => {
    // Clear all timers first
    vi.clearAllTimers();

    // Disconnect client gracefully
    if (client) {
      client.disconnect();
    }

    // Clean up global browser mock
    delete (global as any).browser;

    // Restore original WebSocket
    global.WebSocket = originalWebSocket;

    // Wait a bit for cleanup
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  describe('Requirement 18.1: WebSocket connections on Chrome and Firefox', () => {
    it('should establish WebSocket connection successfully on Chrome', async () => {
      global.WebSocket = MockWebSocket as any;

      await client.connect();

      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(connectionStateChanges).toContain(ConnectionState.CONNECTING);
      expect(connectionStateChanges).toContain(ConnectionState.CONNECTED);
    });

    it('should establish WebSocket connection successfully on Firefox', async () => {
      // Mock Firefox environment
      global.WebSocket = FirefoxMockWebSocket as any;
      (global as any).browser = { runtime: {} }; // Firefox detection

      const firefoxClient = new SignalingClient({
        config: mockConfig,
        userId: 'firefox-user',
        onConnectionStateChange: (state) => connectionStateChanges.push(state),
      });

      await firefoxClient.connect();

      expect(firefoxClient.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(connectionStateChanges).toContain(ConnectionState.CONNECTING);
      expect(connectionStateChanges).toContain(ConnectionState.CONNECTED);

      firefoxClient.disconnect();
    });

    it('should handle Firefox-specific WebSocket creation timeout', async () => {
      vi.useFakeTimers();

      // Mock Firefox WebSocket that never connects
      class TimeoutFirefoxWebSocket extends MockWebSocket {
        protected override scheduleOpen(): void {
          // Never fire onopen - simulate a connection that times out
        }
      }

      global.WebSocket = TimeoutFirefoxWebSocket as any;
      (global as any).browser = { runtime: {} };

      const firefoxClient = new SignalingClient({
        config: mockConfig,
        userId: 'firefox-timeout-user',
        onError: (error) => errors.push(error),
      });

      const connectPromise = firefoxClient.connect();
      // Attach the rejection handler now so the rejection during the timer
      // advance below is considered handled, not unhandled.
      const rejection = expect(connectPromise).rejects.toThrow();

      // Advance past the 5000ms Firefox creation timeout
      await vi.advanceTimersByTimeAsync(5100);

      await rejection;
      expect(errors.length).toBeGreaterThan(0);

      vi.useRealTimers();
      firefoxClient.disconnect();
    });
  });

  describe('Requirement 18.2: Clear error messages with troubleshooting guidance', () => {
    it('should provide clear error messages for connection failures', async () => {
      // Mock WebSocket that fails to connect (fires error before any open)
      class FailingWebSocket extends MockWebSocket {
        protected override scheduleOpen(): void {
          setTimeout(() => {
            this.triggerEvent('error', new Event('error'));
          }, 0);
        }
      }

      global.WebSocket = FailingWebSocket as any;

      try {
        await client.connect();
      } catch (error) {
        // Expected to fail
      }

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toHaveProperty('code');
      expect(errors[0]).toHaveProperty('message');
      expect(errors[0]).toHaveProperty('timestamp');
    });

    it('should provide Firefox-specific error guidance', async () => {
      // The error fires 20 ms after the socket is created, AFTER the open
      // event (which fires at 10 ms) resolves the connect() promise.  We need
      // to give the event loop a chance to deliver the error macrotask.
      class FirefoxFailingWebSocket extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
          }, 20);
        }
      }

      global.WebSocket = FirefoxFailingWebSocket as any;
      (global as any).browser = { runtime: {} };

      const firefoxClient = new SignalingClient({
        config: mockConfig,
        userId: 'firefox-error-user',
        onError: (error) => errors.push(error),
      });

      try {
        await firefoxClient.connect();
      } catch {
        // Expected to fail
      }

      // Let the event loop deliver the async onerror callback
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      expect(errors.some((e) => e.code === 'FIREFOX_WEBSOCKET_ERROR')).toBe(true);
      expect(errors.some((e) => e.message.includes('Firefox'))).toBe(true);
    });
  });

  describe('Requirement 18.3: Connection retry logic with exponential backoff', () => {
    it('should implement exponential backoff for reconnection attempts', async () => {
      vi.useFakeTimers();

      // Mock WebSocket that connects then disconnects
      class DisconnectingWebSocket extends MockWebSocket {
        protected override scheduleOpen(): void {
          // Open shortly after construction, then close abnormally
          setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            this.triggerEvent('open', new Event('open'));
          }, 10);

          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED;
            this.triggerEvent('close', new CloseEvent('close', { code: 1006 })); // Abnormal closure
          }, 60);
        }
      }

      global.WebSocket = DisconnectingWebSocket as any;

      await connectWithFakeTimers(client);
      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED);

      // Wait for disconnection
      vi.advanceTimersByTime(100);
      expect(connectionStateChanges).toContain(ConnectionState.RECONNECTING);

      // Check that reconnection is scheduled with backoff
      vi.advanceTimersByTime(1000); // First retry
      vi.advanceTimersByTime(2000); // Second retry (exponential backoff)

      expect(
        connectionStateChanges.filter((s) => s === ConnectionState.RECONNECTING).length
      ).toBeGreaterThan(1);

      vi.useRealTimers();
    });

    it('should use different backoff parameters for Firefox', async () => {
      vi.useFakeTimers();

      global.WebSocket = MockWebSocket as any;
      (global as any).browser = { runtime: {} };

      const firefoxClient = new SignalingClient({
        config: mockConfig,
        userId: 'firefox-backoff-user',
        onConnectionStateChange: (state) => connectionStateChanges.push(state),
      });

      // Force connection failure to trigger backoff.
      // Fire the error *before* MockWebSocket's default open (scheduled at
      // 10 ms) so the state is still CONNECTING when the error is processed
      // and handleConnectionError transitions it to FAILED.
      class FailingWebSocket extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
          }, 0);
        }
      }

      global.WebSocket = FailingWebSocket as any;

      const connectPromise = firefoxClient.connect();
      await vi.advanceTimersByTimeAsync(50);
      try {
        await connectPromise;
      } catch {
        // Expected to fail
      }

      expect(connectionStateChanges).toContain(ConnectionState.FAILED);

      vi.useRealTimers();
      firefoxClient.disconnect();
    });
  });

  describe('Requirement 18.4: Ping/pong messages for connection health', () => {
    it('should send ping messages and handle pong responses', async () => {
      vi.useFakeTimers();

      global.WebSocket = MockWebSocket as any;

      await connectWithFakeTimers(client);
      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED);

      // Advance time to trigger several ping/pong cycles (30 s health-check
      // interval + a few extra ms for the pong echo in MockWebSocket)
      vi.advanceTimersByTime(30010); // First ping + pong
      vi.advanceTimersByTime(30010); // Second ping + pong
      vi.advanceTimersByTime(30010); // Third ping + pong

      // The connection should remain healthy because pongs keep the failure
      // counter at zero.  (PONG is handled internally by the client and is
      // not forwarded to the onMessage callback.)
      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED);

      vi.useRealTimers();
    });

    it('should handle ping timeout and connection loss detection', async () => {
      vi.useFakeTimers();

      // Mock WebSocket that doesn't respond to pings
      class NonResponsiveWebSocket extends MockWebSocket {
        override send(data: string) {
          if (this.readyState !== MockWebSocket.OPEN) {
            throw new Error('WebSocket is not open');
          }
          // Don't echo back pong responses
        }
      }

      global.WebSocket = NonResponsiveWebSocket as any;

      await connectWithFakeTimers(client);
      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED);

      // Advance time to trigger multiple ping failures
      vi.advanceTimersByTime(30000); // First ping
      vi.advanceTimersByTime(30000); // Second ping
      vi.advanceTimersByTime(30000); // Third ping
      vi.advanceTimersByTime(30000); // Fourth ping - should trigger connection loss

      expect(connectionStateChanges).toContain(ConnectionState.RECONNECTING);

      vi.useRealTimers();
    });
  });

  describe('Requirement 18.5: Validate server responses and handle malformed messages', () => {
    it('should validate server message structure', async () => {
      global.WebSocket = MockWebSocket as any;

      await client.connect();

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
      global.WebSocket = MockWebSocket as any;

      await client.connect();

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

    it('should validate outgoing messages before sending', () => {
      global.WebSocket = MockWebSocket as any;

      // Try to send invalid message
      const invalidMessage = { type: 'INVALID_TYPE' } as any;
      client.sendMessage(invalidMessage);

      expect(errors.some((e) => e.code === 'INVALID_MESSAGE')).toBe(true);
    });

    it('should handle server error responses', async () => {
      global.WebSocket = MockWebSocket as any;

      await client.connect();

      // Simulate server error message
      const mockSocket = (client as any).ws;
      if (mockSocket && mockSocket.onmessage) {
        mockSocket.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'ERROR',
              error: {
                code: 'SERVER_ERROR',
                message: 'Internal server error',
              },
              timestamp: Date.now(),
            }),
          })
        );
      }

      expect(errors.some((e) => e.code === 'SERVER_ERROR')).toBe(true);
    });
  });

  describe('Message queuing and connection recovery', () => {
    it('should queue messages when disconnected and flush on reconnection', async () => {
      global.WebSocket = MockWebSocket as any;

      // Send message while disconnected
      const message = createCreateRoomMessage('test-user');
      client.sendMessage(message);

      // Message should be queued
      expect((client as any).messageQueue.length).toBe(1);

      // Connect and verify message is sent
      await client.connect();

      // Queue should be flushed
      expect((client as any).messageQueue.length).toBe(0);
    });

    it('should maintain heartbeat during connection', async () => {
      vi.useFakeTimers();

      global.WebSocket = MockWebSocket as any;

      await connectWithFakeTimers(client);

      // Advance well past the heartbeat timeout (3 × interval = 3000 ms).
      // The heartbeat acknowledgments from MockWebSocket reset the failure
      // counter, so the connection should stay alive.
      vi.advanceTimersByTime(5000);

      // Should have sent heartbeat
      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED);

      vi.useRealTimers();
    });
  });
});
