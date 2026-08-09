/**
 * WebSocket client for extension background script
 *
 * Handles connection to signaling server (full or local relay)
 * with automatic reconnection and message routing
 */

import {
  ClientMessage,
  ServerMessage,
  SignalingErrorCode,
  validateMessage,
  createHeartbeatMessage,
  isServerMessage,
} from './message-types';
import { ExtensionConfig } from '../browser-bridge/types';
import { PerformanceManager } from '../performance/performance-manager';

export interface SignalingClientOptions {
  config: ExtensionConfig;
  userId: string;
  onMessage?: (message: ServerMessage) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: SignalingError) => void;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

export interface SignalingError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private config: ExtensionConfig;
  private userId: string;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private pingTimer: number | null = null;
  private lastHeartbeatAck = 0;
  private lastPingTime = 0;
  private consecutivePingFailures = 0;
  private maxPingFailures = 3;
  private messageQueue: ClientMessage[] = [];
  private performanceManager?: PerformanceManager;
  private connectionHealthCheckInterval = 30000; // 30 seconds
  private isFirefox = false;

  // Event handlers
  private onMessage?: (message: ServerMessage) => void;
  private onConnectionStateChange?: (state: ConnectionState) => void;
  private onError?: (error: SignalingError) => void;

  constructor(options: SignalingClientOptions) {
    this.config = options.config;
    this.userId = options.userId;
    this.onMessage = options.onMessage;
    this.onConnectionStateChange = options.onConnectionStateChange;
    this.onError = options.onError;

    // Detect Firefox for browser-specific handling
    this.isFirefox = this.detectFirefox();

    if (this.isFirefox) {
      console.log('Firefox detected - using Firefox-specific WebSocket handling');
    }
  }

  /**
   * Set performance manager for monitoring
   */
  setPerformanceManager(performanceManager: PerformanceManager): void {
    this.performanceManager = performanceManager;
  }

  /**
   * Connect to the signaling server
   */
  async connect(): Promise<void> {
    if (
      this.connectionState === ConnectionState.CONNECTING ||
      this.connectionState === ConnectionState.CONNECTED
    ) {
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      const serverUrl = this.buildServerUrl();
      console.log(`Connecting to signaling server: ${serverUrl} (Firefox: ${this.isFirefox})`);

      // Firefox-specific WebSocket creation with additional error handling
      if (this.isFirefox) {
        this.ws = await this.createFirefoxWebSocket(serverUrl);
      } else {
        this.ws = new WebSocket(serverUrl);
      }

      this.setupWebSocketHandlers();

      // Wait for connection to be established with timeout
      await this.waitForConnection();
    } catch (error) {
      console.error('Failed to connect to signaling server:', error);
      this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * Disconnect from the signaling server
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    this.clearPingTimer();

    if (this.ws) {
      // Use different close codes for better debugging
      const closeCode = this.connectionState === ConnectionState.FAILED ? 1006 : 1000;
      const closeReason =
        this.connectionState === ConnectionState.FAILED ? 'Connection failed' : 'Client disconnect';

      try {
        this.ws.close(closeCode, closeReason);
      } catch (error) {
        console.warn('Error closing WebSocket:', error);
      }
      this.ws = null;
    }

    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.reconnectAttempts = 0;
    this.consecutivePingFailures = 0;
    this.messageQueue = [];
  }

  /**
   * Send a message to the signaling server
   */
  sendMessage(message: ClientMessage): void {
    // Validate message first, regardless of connection state
    try {
      const validation = validateMessage(message);
      if (!validation.valid) {
        this.emitError({
          code: SignalingErrorCode.INVALID_MESSAGE,
          message: validation.error || 'Invalid message',
          details: message,
          timestamp: Date.now(),
        });
        return;
      }
    } catch (error) {
      this.emitError({
        code: SignalingErrorCode.INVALID_MESSAGE,
        message: 'Message validation failed',
        details: { message, error },
        timestamp: Date.now(),
      });
      return;
    }

    if (this.connectionState !== ConnectionState.CONNECTED) {
      // Queue message for when connection is restored
      this.messageQueue.push(message);

      // Update performance monitoring
      if (this.performanceManager) {
        this.performanceManager.updateMessageQueueSize(this.messageQueue.length);
      }

      console.warn('Message queued - not connected to signaling server:', message.type);
      return;
    }

    if (!this.ws) {
      this.emitError({
        code: 'NO_CONNECTION',
        message: 'WebSocket connection not available',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      console.debug('Sent message:', message.type, message);

      // Record message sent for performance monitoring
      if (this.performanceManager) {
        this.performanceManager.recordMessageSent();
      }
    } catch (error) {
      this.emitError({
        code: 'SEND_ERROR',
        message: error instanceof Error ? error.message : 'Failed to send message',
        details: { message, error },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Update configuration (triggers reconnection if needed)
   */
  updateConfig(newConfig: ExtensionConfig): void {
    const serverChanged =
      this.config.SIGNALING_SERVER !== newConfig.SIGNALING_SERVER ||
      this.config.SIGNALING_WS_PATH !== newConfig.SIGNALING_WS_PATH ||
      this.config.LOCAL_DEV_MODE !== newConfig.LOCAL_DEV_MODE;

    this.config = newConfig;

    if (serverChanged && this.isConnected()) {
      console.log('Server configuration changed, reconnecting...');
      this.disconnect();
      this.connect().catch((error) => {
        console.error('Failed to reconnect after config change:', error);
      });
    }
  }

  private buildServerUrl(): string {
    const baseUrl = this.config.SIGNALING_SERVER;
    const path = this.config.SIGNALING_WS_PATH || '';

    // Handle local dev mode
    if (this.config.LOCAL_DEV_MODE) {
      // Use local relay server (typically ws://localhost:8080)
      return `${baseUrl}${path}`;
    }

    // Full signaling server
    return `${baseUrl}${path}`;
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connection established successfully');
      this.setConnectionState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.consecutivePingFailures = 0;
      this.startHeartbeat();
      this.startConnectionHealthCheck();
      this.flushMessageQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Validate message structure before processing
        if (!this.validateServerMessage(message)) {
          console.warn('Received invalid server message structure:', message);
          this.emitError({
            code: 'INVALID_SERVER_MESSAGE',
            message: 'Server sent malformed message',
            details: { message },
            timestamp: Date.now(),
          });
          return;
        }

        this.handleServerMessage(message);
      } catch (error) {
        console.error('Failed to parse server message:', error, event.data);
        this.emitError({
          code: 'PARSE_ERROR',
          message: 'Failed to parse server message',
          details: { data: event.data, error },
          timestamp: Date.now(),
        });
      }
    };

    this.ws.onclose = (event) => {
      console.log(
        `WebSocket connection closed: code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`
      );
      this.ws = null;
      this.clearHeartbeatTimer();
      this.clearPingTimer();

      // Handle different close codes appropriately
      if (event.code === 1000 || event.code === 1001) {
        // Normal closure or going away
        this.setConnectionState(ConnectionState.DISCONNECTED);
      } else if (event.code === 1006) {
        // Abnormal closure (connection lost)
        console.warn('WebSocket closed abnormally - connection may have been lost');
        this.handleConnectionLoss();
      } else if (event.code >= 4000) {
        // Custom application error codes
        console.error('Server closed connection with application error:', event.code, event.reason);
        this.emitError({
          code: 'SERVER_ERROR',
          message: `Server error: ${event.reason || 'Unknown error'}`,
          details: { code: event.code, reason: event.reason },
          timestamp: Date.now(),
        });
        this.setConnectionState(ConnectionState.FAILED);
      } else {
        // Other error codes
        this.handleConnectionLoss();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error occurred:', error);

      // Firefox-specific error handling
      if (this.isFirefox) {
        console.log('Applying Firefox-specific error handling');
        // Firefox may not provide detailed error information
        this.emitError({
          code: 'FIREFOX_WEBSOCKET_ERROR',
          message:
            'WebSocket error in Firefox - check network connectivity and server availability',
          details: { error, isFirefox: true },
          timestamp: Date.now(),
        });
      } else {
        this.emitError({
          code: 'WEBSOCKET_ERROR',
          message: 'WebSocket connection error',
          details: { error },
          timestamp: Date.now(),
        });
      }

      this.handleConnectionError(error);
    };
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      // If already connected, resolve immediately
      if (this.ws.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        resolve();
        return;
      }

      // Use longer timeout for Firefox due to potential slower connection establishment
      const timeoutMs = this.isFirefox ? 15000 : 10000;
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const onOpen = () => {
        clearTimeout(timeout);
        console.log('WebSocket connection established within timeout');
        resolve();
      };

      const onError = (error: Event) => {
        clearTimeout(timeout);
        console.error('WebSocket connection failed during establishment:', error);
        reject(new Error('WebSocket connection failed'));
      };

      const onClose = (event: CloseEvent) => {
        clearTimeout(timeout);
        console.error(
          'WebSocket closed during connection establishment:',
          event.code,
          event.reason
        );
        reject(new Error(`WebSocket closed during connection: ${event.code} ${event.reason}`));
      };

      this.ws.addEventListener('open', onOpen, { once: true });
      this.ws.addEventListener('error', onError, { once: true });
      this.ws.addEventListener('close', onClose, { once: true });
    });
  }

  private handleServerMessage(message: unknown): void {
    if (!isServerMessage(message)) {
      console.warn('Received invalid server message:', message);
      this.emitError({
        code: 'INVALID_SERVER_MESSAGE',
        message: 'Server sent invalid message format',
        details: { message },
        timestamp: Date.now(),
      });
      return;
    }

    // Validate critical message fields for room operations
    if (message.type === 'ROOM_CREATED' || message.type === 'ROOM_JOINED') {
      if (!message.roomId || typeof message.roomId !== 'string' || message.roomId.trim() === '') {
        console.error(`Invalid ${message.type} response - missing or empty roomId:`, message);
        this.emitError({
          code: 'INVALID_ROOM_RESPONSE',
          message: `${message.type} response missing valid roomId`,
          details: { message },
          timestamp: Date.now(),
        });
        return;
      }

      if (!message.hostId || typeof message.hostId !== 'string') {
        console.error(`Invalid ${message.type} response - missing or invalid hostId:`, message);
        this.emitError({
          code: 'INVALID_ROOM_RESPONSE',
          message: `${message.type} response missing valid hostId`,
          details: { message },
          timestamp: Date.now(),
        });
        return;
      }
    }

    // Record message received for performance monitoring
    if (this.performanceManager) {
      this.performanceManager.recordMessageReceived();
    }

    // Handle heartbeat acknowledgments
    if (message.type === 'HEARTBEAT_ACK') {
      this.lastHeartbeatAck = Date.now();
      this.consecutivePingFailures = 0; // Reset ping failure counter
      return;
    }

    // Handle ping/pong for connection health
    if (message.type === 'PING') {
      // Respond to server ping with pong
      this.sendPong();
      return;
    }

    if (message.type === 'PONG') {
      // Server responded to our ping
      const now = Date.now();
      const latency = now - this.lastPingTime;
      console.debug(`Received pong, latency: ${latency}ms`);
      this.consecutivePingFailures = 0;

      if (this.performanceManager) {
        this.performanceManager.recordSyncLatency(latency);
      }
      return;
    }

    // Handle server shutdown notifications
    if (message.type === 'SERVER_SHUTDOWN') {
      console.warn('Server shutdown notification:', message.message);
      if (message.gracePeriodMs) {
        setTimeout(() => this.disconnect(), message.gracePeriodMs);
      } else {
        this.disconnect();
      }
      return;
    }

    // Handle server errors
    if (message.type === 'ERROR') {
      console.error('Server error:', message.error);
      this.emitError({
        code: message.error?.code || 'SERVER_ERROR',
        message: message.error?.message || 'Server reported an error',
        details: message.error,
        timestamp: Date.now(),
      });
      return;
    }

    // Forward message to handler
    if (this.onMessage) {
      this.onMessage(message);
    }
  }

  private handleConnectionLoss(): void {
    if (this.connectionState === ConnectionState.DISCONNECTED) {
      return; // Already handled
    }

    // Record network reconnection for performance monitoring
    if (this.performanceManager) {
      this.performanceManager.recordNetworkReconnection();
    }

    this.setConnectionState(ConnectionState.RECONNECTING);
    this.scheduleReconnect();
  }

  private handleConnectionError(error: unknown): void {
    console.error('Connection error:', error);

    this.emitError({
      code: 'CONNECTION_ERROR',
      message: error instanceof Error ? error.message : 'Connection failed',
      details: error,
      timestamp: Date.now(),
    });

    if (this.connectionState === ConnectionState.CONNECTING) {
      this.setConnectionState(ConnectionState.FAILED);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.setConnectionState(ConnectionState.FAILED);
      this.emitError({
        code: 'MAX_RECONNECT_ATTEMPTS',
        message: `Failed to reconnect after ${this.maxReconnectAttempts} attempts`,
        details: { attempts: this.reconnectAttempts },
        timestamp: Date.now(),
      });
      return;
    }

    this.clearReconnectTimer();

    // Enhanced exponential backoff with jitter and Firefox-specific adjustments
    const baseDelay = this.config.RECONNECT_INTERVAL_MS;
    const backoffMultiplier = this.isFirefox ? 1.5 : 2; // Slower backoff for Firefox
    const maxDelay = this.isFirefox ? 45000 : 30000; // Longer max delay for Firefox

    const backoffDelay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, this.reconnectAttempts),
      maxDelay
    );
    const jitter = Math.random() * Math.min(1000, baseDelay * 0.1); // Proportional jitter
    const delay = backoffDelay + jitter;

    console.log(
      `Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms (Firefox: ${this.isFirefox})`
    );

    this.reconnectTimer = window.setTimeout(async () => {
      this.reconnectAttempts++;
      console.log(
        `Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`
      );

      try {
        await this.connect();
        console.log('Reconnection successful');
      } catch (error) {
        console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);

        // Continue trying if we haven't reached max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.clearHeartbeatTimer();
    this.lastHeartbeatAck = Date.now();

    this.heartbeatTimer = window.setInterval(() => {
      // Check if we've missed heartbeat acknowledgments
      const timeSinceLastAck = Date.now() - this.lastHeartbeatAck;
      const heartbeatTimeout = this.config.HEARTBEAT_INTERVAL_MS * (this.isFirefox ? 4 : 3); // More tolerance for Firefox

      if (timeSinceLastAck > heartbeatTimeout) {
        console.warn(
          `Heartbeat timeout detected (${timeSinceLastAck}ms > ${heartbeatTimeout}ms), connection may be lost`
        );
        this.handleConnectionLoss();
        return;
      }

      // Send heartbeat
      const heartbeat = createHeartbeatMessage(this.userId);
      this.sendMessage(heartbeat);
    }, this.config.HEARTBEAT_INTERVAL_MS);
  }

  private startConnectionHealthCheck(): void {
    this.clearPingTimer();

    this.pingTimer = window.setInterval(() => {
      this.sendPing();
    }, this.connectionHealthCheckInterval);
  }

  private sendPing(): void {
    if (this.connectionState !== ConnectionState.CONNECTED || !this.ws) {
      return;
    }

    this.lastPingTime = Date.now();

    try {
      // Send ping message
      const pingMessage = {
        type: 'PING',
        userId: this.userId,
        timestamp: this.lastPingTime,
      };

      this.ws.send(JSON.stringify(pingMessage));

      // Set timeout to detect ping failure
      setTimeout(() => {
        const timeSincePing = Date.now() - this.lastPingTime;
        if (timeSincePing > 10000) {
          // 10 second ping timeout
          this.consecutivePingFailures++;
          console.warn(`Ping timeout (${this.consecutivePingFailures}/${this.maxPingFailures})`);

          if (this.consecutivePingFailures >= this.maxPingFailures) {
            console.error('Multiple ping failures detected, connection appears unhealthy');
            this.handleConnectionLoss();
          }
        }
      }, 10000);
    } catch (error) {
      console.error('Failed to send ping:', error);
      this.consecutivePingFailures++;

      if (this.consecutivePingFailures >= this.maxPingFailures) {
        this.handleConnectionLoss();
      }
    }
  }

  private sendPong(): void {
    if (this.connectionState !== ConnectionState.CONNECTED || !this.ws) {
      return;
    }

    try {
      const pongMessage = {
        type: 'PONG',
        userId: this.userId,
        timestamp: Date.now(),
      };

      this.ws.send(JSON.stringify(pongMessage));
    } catch (error) {
      console.error('Failed to send pong:', error);
    }
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`Flushing ${this.messageQueue.length} queued messages`);
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    // Update performance monitoring
    if (this.performanceManager) {
      this.performanceManager.updateMessageQueueSize(0);
    }

    for (const message of messages) {
      this.sendMessage(message);
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;

    const previousState = this.connectionState;
    this.connectionState = state;

    console.log(`Connection state changed: ${previousState} -> ${state}`);

    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(state);
    }
  }

  private emitError(error: SignalingError): void {
    console.error('Signaling error:', error);

    if (this.onError) {
      this.onError(error);
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private detectFirefox(): boolean {
    // Check for Firefox-specific APIs or webextension-polyfill
    const browserApi = (globalThis as { browser?: { runtime?: unknown } }).browser;
    if (browserApi?.runtime) {
      return true;
    }

    // Fallback detection based on user agent
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      return userAgent.includes('firefox') && !userAgent.includes('chrome');
    }

    return false;
  }

  private async createFirefoxWebSocket(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);

        // Firefox may need additional time for WebSocket creation
        const creationTimeout = setTimeout(() => {
          reject(new Error('Firefox WebSocket creation timeout'));
        }, 5000);

        // Set up event listeners to detect when WebSocket is ready
        const onOpen = () => {
          clearTimeout(creationTimeout);
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('error', onError);
          ws.removeEventListener('close', onClose);
          resolve(ws);
        };

        const onError = (_error: Event) => {
          clearTimeout(creationTimeout);
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('error', onError);
          ws.removeEventListener('close', onClose);
          reject(new Error('Firefox WebSocket failed to initialize'));
        };

        const onClose = (_event: CloseEvent) => {
          clearTimeout(creationTimeout);
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('error', onError);
          ws.removeEventListener('close', onClose);
          reject(new Error('Firefox WebSocket closed during creation'));
        };

        ws.addEventListener('open', onOpen);
        ws.addEventListener('error', onError);
        ws.addEventListener('close', onClose);

        // If WebSocket is already open (unlikely but possible)
        if (ws.readyState === WebSocket.OPEN) {
          clearTimeout(creationTimeout);
          resolve(ws);
        }
      } catch (error) {
        reject(new Error(`Firefox WebSocket creation failed: ${error}`));
      }
    });
  }

  private validateServerMessage(message: unknown): boolean {
    if (
      !message ||
      typeof message !== 'object' ||
      !('type' in message) ||
      typeof message.type !== 'string'
    ) {
      return false;
    }

    if (!('timestamp' in message) || typeof message.timestamp !== 'number') {
      // Some message types might not have timestamp, so this is a warning rather than failure
      console.debug('Server message missing timestamp:', message.type);
    }

    return true;
  }
}
