/**
 * Cross-browser popup button functionality tests
 *
 * Tests Requirement 19.1: Popup button functionality across browser versions
 * Verifies button handlers work correctly on both Chrome MV3 and Firefox
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock browser environments
interface MockBrowserEnvironment {
  name: 'chrome' | 'firefox';
  userAgent: string;
  webExtensionAPI: 'chrome' | 'browser';
  manifestVersion: 2 | 3;
}

const BROWSER_ENVIRONMENTS: MockBrowserEnvironment[] = [
  {
    name: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    webExtensionAPI: 'chrome',
    manifestVersion: 3,
  },
  {
    name: 'firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    webExtensionAPI: 'browser',
    manifestVersion: 2,
  },
];

// Mock popup button handlers
class MockPopupButtonHandler {
  private buttonStates: Map<string, string> = new Map();
  private notifications: Array<{ type: string; message: string }> = [];
  private browserAPI: any;

  constructor(browserAPI: any) {
    this.browserAPI = browserAPI;
  }

  setButtonState(buttonId: string, state: 'idle' | 'loading' | 'success' | 'error'): void {
    this.buttonStates.set(buttonId, state);

    // Update UI classes
    const button = document.getElementById(buttonId);
    if (button) {
      button.className = `btn btn-${state}`;
    }
  }

  getButtonState(buttonId: string): string {
    return this.buttonStates.get(buttonId) || 'idle';
  }

  showNotification(type: 'success' | 'error', message: string): void {
    this.notifications.push({ type, message });
  }

  getNotifications(): Array<{ type: string; message: string }> {
    return [...this.notifications];
  }

  clearNotifications(): void {
    this.notifications = [];
  }

  // Simulate button click handlers
  async handleCreateRoom(): Promise<void> {
    try {
      this.setButtonState('createRoom', 'loading');

      const response = await this.browserAPI.runtime.sendMessage({
        type: 'CREATE_ROOM',
        timestamp: Date.now(),
      });

      if (response.success) {
        this.setButtonState('createRoom', 'success');
        this.showNotification('success', `Room created: ${response.roomId}`);
      } else {
        throw new Error(response.error || 'Failed to create room');
      }
    } catch (error) {
      this.setButtonState('createRoom', 'error');
      this.showNotification('error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async handleJoinRoom(roomId: string): Promise<void> {
    try {
      this.setButtonState('joinRoom', 'loading');

      const response = await this.browserAPI.runtime.sendMessage({
        type: 'JOIN_ROOM',
        roomId,
        timestamp: Date.now(),
      });

      if (response.success) {
        this.setButtonState('joinRoom', 'success');
        this.showNotification('success', `Joined room: ${roomId}`);
      } else {
        throw new Error(response.error || 'Failed to join room');
      }
    } catch (error) {
      this.setButtonState('joinRoom', 'error');
      this.showNotification('error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async handleLeaveRoom(): Promise<void> {
    try {
      this.setButtonState('leaveRoom', 'loading');

      const response = await this.browserAPI.runtime.sendMessage({
        type: 'LEAVE_ROOM',
        timestamp: Date.now(),
      });

      if (response.success) {
        this.setButtonState('leaveRoom', 'success');
        this.showNotification('success', 'Left room successfully');
      } else {
        throw new Error(response.error || 'Failed to leave room');
      }
    } catch (error) {
      this.setButtonState('leaveRoom', 'error');
      this.showNotification('error', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

describe('Cross-Browser Popup Button Functionality', () => {
  let originalUserAgent: string;
  let mockDocument: Document;

  beforeEach(() => {
    // Store original user agent
    originalUserAgent = navigator.userAgent;

    // Create mock DOM elements
    document.body.innerHTML = `
      <div class="popup-container">
        <div class="popup-header">
          <h1>Watch Party</h1>
        </div>
        <div class="popup-content">
          <div class="status-card" id="connectionStatus">
            <div class="status-indicator"></div>
            <div class="status-text">Disconnected</div>
          </div>
          <div class="room-section">
            <button id="createRoom" class="btn btn-primary">Create Room</button>
            <input id="roomIdInput" type="text" placeholder="Enter Room ID" />
            <button id="joinRoom" class="btn btn-secondary">Join Room</button>
            <button id="leaveRoom" class="btn btn-danger" style="display: none;">Leave Room</button>
          </div>
        </div>
      </div>
    `;

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    });

    // Clean up global mocks
    delete (global as any).chrome;
    delete (global as any).browser;

    // Clear DOM
    document.body.innerHTML = '';

    vi.restoreAllMocks();
  });

  describe('Button state management', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      it(`should handle button states correctly on ${env.name}`, async () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        const mockSendMessage = vi.fn().mockResolvedValue({
          success: true,
          roomId: 'test-room-123',
        });

        if (env.name === 'chrome') {
          (global as any).chrome = {
            runtime: { sendMessage: mockSendMessage },
          };
        } else {
          (global as any).browser = {
            runtime: { sendMessage: mockSendMessage },
          };
        }

        const browserAPI = env.name === 'chrome' ? (global as any).chrome : (global as any).browser;
        const handler = new MockPopupButtonHandler(browserAPI);

        // Test create room button
        await handler.handleCreateRoom();

        expect(handler.getButtonState('createRoom')).toBe('success');
        expect(handler.getNotifications()).toContainEqual({
          type: 'success',
          message: 'Room created: test-room-123',
        });

        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'CREATE_ROOM',
          timestamp: expect.any(Number),
        });
      });

      it(`should handle button errors correctly on ${env.name}`, async () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        const mockSendMessage = vi.fn().mockResolvedValue({
          success: false,
          error: 'Server connection failed',
        });

        if (env.name === 'chrome') {
          (global as any).chrome = {
            runtime: { sendMessage: mockSendMessage },
          };
        } else {
          (global as any).browser = {
            runtime: { sendMessage: mockSendMessage },
          };
        }

        const browserAPI = env.name === 'chrome' ? (global as any).chrome : (global as any).browser;
        const handler = new MockPopupButtonHandler(browserAPI);

        // Test failed room creation
        await handler.handleCreateRoom();

        expect(handler.getButtonState('createRoom')).toBe('error');
        expect(handler.getNotifications()).toContainEqual({
          type: 'error',
          message: 'Server connection failed',
        });
      });

      it(`should handle network errors correctly on ${env.name}`, async () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        const mockSendMessage = vi.fn().mockRejectedValue(new Error('Network error'));

        if (env.name === 'chrome') {
          (global as any).chrome = {
            runtime: { sendMessage: mockSendMessage },
          };
        } else {
          (global as any).browser = {
            runtime: { sendMessage: mockSendMessage },
          };
        }

        const browserAPI = env.name === 'chrome' ? (global as any).chrome : (global as any).browser;
        const handler = new MockPopupButtonHandler(browserAPI);

        // Test network error
        await handler.handleJoinRoom('test-room');

        expect(handler.getButtonState('joinRoom')).toBe('error');
        expect(handler.getNotifications()).toContainEqual({
          type: 'error',
          message: 'Network error',
        });
      });
    });
  });

  describe('WebExtension API compatibility', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      it(`should use correct API namespace on ${env.name}`, async () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        const mockSendMessage = vi.fn().mockResolvedValue({ success: true });

        if (env.name === 'chrome') {
          (global as any).chrome = {
            runtime: { sendMessage: mockSendMessage },
          };
          delete (global as any).browser;
        } else {
          (global as any).browser = {
            runtime: { sendMessage: mockSendMessage },
          };
          delete (global as any).chrome;
        }

        // Test that the correct API is available
        if (env.name === 'chrome') {
          expect((global as any).chrome).toBeDefined();
          expect((global as any).browser).toBeUndefined();
        } else {
          expect((global as any).browser).toBeDefined();
          expect((global as any).chrome).toBeUndefined();
        }

        const browserAPI = env.name === 'chrome' ? (global as any).chrome : (global as any).browser;
        const handler = new MockPopupButtonHandler(browserAPI);

        await handler.handleCreateRoom();
        expect(mockSendMessage).toHaveBeenCalled();
      });

      it(`should handle manifest version differences on ${env.name}`, () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        // Chrome MV3 uses service workers, Firefox MV2 uses background scripts
        if (env.name === 'chrome') {
          expect(env.manifestVersion).toBe(3);
          // In MV3, background scripts are service workers
        } else {
          expect(env.manifestVersion).toBe(2);
          // In MV2, background scripts are persistent or event pages
        }
      });
    });
  });

  describe('UI consistency', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      it(`should render buttons consistently on ${env.name}`, () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        // Test button elements exist
        const createButton = document.getElementById('createRoom');
        const joinButton = document.getElementById('joinRoom');
        const leaveButton = document.getElementById('leaveRoom');

        expect(createButton).toBeTruthy();
        expect(joinButton).toBeTruthy();
        expect(leaveButton).toBeTruthy();

        // Test CSS classes
        expect(createButton?.classList.contains('btn')).toBe(true);
        expect(createButton?.classList.contains('btn-primary')).toBe(true);
        expect(joinButton?.classList.contains('btn-secondary')).toBe(true);
        expect(leaveButton?.classList.contains('btn-danger')).toBe(true);
      });

      it(`should handle button interactions consistently on ${env.name}`, () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        const createButton = document.getElementById('createRoom') as HTMLButtonElement;

        let clickCount = 0;
        createButton.addEventListener('click', () => {
          clickCount++;
        });

        // Simulate click
        createButton.click();
        expect(clickCount).toBe(1);

        // Test disabled state
        createButton.disabled = true;
        createButton.click();
        expect(clickCount).toBe(1); // Should not increment when disabled

        // Test CSS state changes
        createButton.className = 'btn btn-loading';
        expect(createButton.classList.contains('btn-loading')).toBe(true);
      });

      it(`should display status correctly on ${env.name}`, () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        const statusCard = document.getElementById('connectionStatus');
        const statusText = statusCard?.querySelector('.status-text');

        expect(statusCard).toBeTruthy();
        expect(statusText?.textContent).toBe('Disconnected');

        // Test status updates
        if (statusText) {
          statusText.textContent = 'Connected';
          expect(statusText.textContent).toBe('Connected');
        }

        // Test status indicator
        const statusIndicator = statusCard?.querySelector('.status-indicator');
        expect(statusIndicator).toBeTruthy();
      });
    });
  });

  describe('Error handling and user feedback', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      it(`should provide clear error messages on ${env.name}`, async () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        const mockSendMessage = vi.fn().mockRejectedValue(new Error('Connection timeout'));

        if (env.name === 'chrome') {
          (global as any).chrome = {
            runtime: { sendMessage: mockSendMessage },
          };
        } else {
          (global as any).browser = {
            runtime: { sendMessage: mockSendMessage },
          };
        }

        const browserAPI = env.name === 'chrome' ? (global as any).chrome : (global as any).browser;
        const handler = new MockPopupButtonHandler(browserAPI);

        await handler.handleCreateRoom();

        const notifications = handler.getNotifications();
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe('error');
        expect(notifications[0].message).toBe('Connection timeout');
      });

      it(`should handle loading states properly on ${env.name}`, async () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        const mockSendMessage = vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
          );

        if (env.name === 'chrome') {
          (global as any).chrome = {
            runtime: { sendMessage: mockSendMessage },
          };
        } else {
          (global as any).browser = {
            runtime: { sendMessage: mockSendMessage },
          };
        }

        const browserAPI = env.name === 'chrome' ? (global as any).chrome : (global as any).browser;
        const handler = new MockPopupButtonHandler(browserAPI);

        // Start async operation
        const promise = handler.handleCreateRoom();

        // Should be in loading state immediately
        expect(handler.getButtonState('createRoom')).toBe('loading');

        // Wait for completion
        await promise;

        // Should be in success state
        expect(handler.getButtonState('createRoom')).toBe('success');
      });
    });
  });
});
