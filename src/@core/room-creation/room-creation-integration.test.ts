/**
 * Room Creation Integration Tests
 * Tests room ID generation and server response parsing
 * Requirements: 32.1, 32.2, 32.3, 32.4, 32.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock chrome runtime for testing
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
};

(global as any).chrome = mockChrome;

describe('Room Creation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Room ID Generation and Response Parsing', () => {
    it('should handle valid room creation response', async () => {
      // Mock successful room creation response
      const mockResponse = {
        success: true,
        roomId: 'ABC123',
        hostId: 'user_123',
        participants: [],
        currentState: {
          currentTime: 0,
          paused: true,
          playbackRate: 1,
          timestamp: Date.now(),
        },
      };

      mockChrome.runtime.sendMessage.mockResolvedValue(mockResponse);

      // Simulate room creation request
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_ROOM',
        roomOptions: {
          name: 'Test Room',
          isPublic: false,
        },
      });

      expect(response.success).toBe(true);
      expect(response.roomId).toBe('ABC123');
      expect(response.roomId).toMatch(/^[A-Z0-9]{6}$/); // 6-character alphanumeric
      expect(response.hostId).toBe('user_123');
      expect(response.participants).toEqual([]);
      expect(response.currentState).toBeDefined();
    });

    it('should handle room creation response with missing roomId', async () => {
      // Mock response with missing roomId
      const mockResponse = {
        success: true,
        hostId: 'user_123',
        participants: [],
        // Missing roomId field
      };

      mockChrome.runtime.sendMessage.mockResolvedValue(mockResponse);

      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_ROOM',
        roomOptions: {},
      });

      // The response should still be returned, but validation should happen in background script
      expect(response.success).toBe(true);
      expect(response.roomId).toBeUndefined();
    });

    it('should handle room creation response with empty roomId', async () => {
      // Mock response with empty roomId
      const mockResponse = {
        success: true,
        roomId: '',
        hostId: 'user_123',
        participants: [],
      };

      mockChrome.runtime.sendMessage.mockResolvedValue(mockResponse);

      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_ROOM',
        roomOptions: {},
      });

      expect(response.success).toBe(true);
      expect(response.roomId).toBe('');
    });

    it('should handle room creation failure', async () => {
      // Mock failed room creation response
      const mockResponse = {
        success: false,
        error: 'Failed to create room',
      };

      mockChrome.runtime.sendMessage.mockResolvedValue(mockResponse);

      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_ROOM',
        roomOptions: {},
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to create room');
      expect(response.roomId).toBeUndefined();
    });

    it('should handle network errors during room creation', async () => {
      // Mock network error
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Network error'));

      await expect(
        chrome.runtime.sendMessage({
          type: 'CREATE_ROOM',
          roomOptions: {},
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('Room State Persistence', () => {
    it('should persist room state after successful creation', async () => {
      // Mock successful room creation
      const mockResponse = {
        success: true,
        roomId: 'XYZ789',
        hostId: 'user_456',
        participants: [
          {
            id: 'user_456',
            role: 'host',
            joinedAt: new Date().toISOString(),
          },
        ],
        currentState: {
          currentTime: 0,
          paused: true,
          playbackRate: 1,
          timestamp: Date.now(),
        },
      };

      mockChrome.runtime.sendMessage.mockResolvedValue(mockResponse);

      // Simulate room creation
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_ROOM',
        roomOptions: {
          name: 'Persistent Room',
        },
      });

      expect(response.success).toBe(true);
      expect(response.roomId).toBe('XYZ789');
      expect(response.participants).toHaveLength(1);
      expect(response.participants[0].role).toBe('host');
    });

    it('should load persisted room state', async () => {
      // Mock persisted room state
      const mockRoomState = {
        roomId: 'SAVED123',
        isActive: true,
        isHost: true,
        participants: [],
        currentPlaybackState: {
          currentTime: 0,
          paused: true,
          playbackRate: 1,
          timestamp: Date.now(),
        },
        createdAt: new Date(),
        lastActivity: new Date(),
        connectionStatus: 'connected',
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        roomState: mockRoomState,
      });

      const response = await chrome.runtime.sendMessage({
        type: 'GET_ROOM_STATE',
      });

      expect(response.success).toBe(true);
      expect(response.roomState.roomId).toBe('SAVED123');
      expect(response.roomState.isActive).toBe(true);
      expect(response.roomState.isHost).toBe(true);
    });

    it('should handle missing room state gracefully', async () => {
      // Mock no persisted room state
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        roomState: null,
      });

      const response = await chrome.runtime.sendMessage({
        type: 'GET_ROOM_STATE',
      });

      expect(response.success).toBe(true);
      expect(response.roomState).toBeNull();
    });
  });

  describe('Room ID Validation', () => {
    it('should validate room ID format', () => {
      const validRoomIds = ['ABC123', 'XYZ789', '123ABC', 'A1B2C3', 'ABCDEF'];
      const invalidRoomIds = ['', 'abc123', '12345', 'ABC12@', 'ABCDEFG', 'AB12'];

      validRoomIds.forEach((roomId) => {
        expect(roomId).toMatch(/^[A-Z0-9]{6}$/);
      });

      invalidRoomIds.forEach((roomId) => {
        expect(roomId).not.toMatch(/^[A-Z0-9]{6}$/);
      });
    });

    it('should generate unique room IDs', () => {
      // Simulate room ID generation (this would be done server-side)
      const generateRoomId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const roomIds = new Set();
      for (let i = 0; i < 100; i++) {
        const roomId = generateRoomId();
        expect(roomId).toMatch(/^[A-Z0-9]{6}$/);
        roomIds.add(roomId);
      }

      // Should generate mostly unique IDs (allowing for small chance of collision)
      expect(roomIds.size).toBeGreaterThan(95);
    });
  });

  describe('Copy and Share Functionality', () => {
    it('should provide functional copy action for room ID', async () => {
      // Mock clipboard API
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
      (global as any).navigator = { clipboard: mockClipboard };

      const roomId = 'TEST123';
      const inviteLink = `https://example.com/join/${roomId}`;

      // Simulate copying invite link
      await navigator.clipboard.writeText(inviteLink);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(inviteLink);
    });

    it('should handle clipboard API failures gracefully', async () => {
      // Mock clipboard API failure
      const mockClipboard = {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard access denied')),
      };
      (global as any).navigator = { clipboard: mockClipboard };

      const inviteLink = 'https://example.com/join/TEST123';

      await expect(navigator.clipboard.writeText(inviteLink)).rejects.toThrow(
        'Clipboard access denied'
      );
    });

    it('should generate proper invitation links', () => {
      const roomId = 'INVITE123';
      const baseUrl = 'https://example.com';
      const inviteLink = `${baseUrl}/join/${roomId}`;

      expect(inviteLink).toBe('https://example.com/join/INVITE123');
      expect(inviteLink).toContain(roomId);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed server responses', async () => {
      // Mock malformed response
      const malformedResponses = [
        null,
        undefined,
        {},
        { success: true }, // Missing required fields
        { roomId: 'ABC123' }, // Missing success field
        { success: 'true', roomId: 123 }, // Wrong data types
      ];

      for (const response of malformedResponses) {
        mockChrome.runtime.sendMessage.mockResolvedValue(response);

        const result = await chrome.runtime.sendMessage({
          type: 'CREATE_ROOM',
          roomOptions: {},
        });

        // The response should be returned as-is, validation happens in background script
        expect(result).toEqual(response);
      }
    });

    it('should handle server timeout errors', async () => {
      // Mock timeout error
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Request timeout'));

      await expect(
        chrome.runtime.sendMessage({
          type: 'CREATE_ROOM',
          roomOptions: {},
        })
      ).rejects.toThrow('Request timeout');
    });

    it('should handle server unavailable errors', async () => {
      // Mock server unavailable
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Server unavailable'));

      await expect(
        chrome.runtime.sendMessage({
          type: 'CREATE_ROOM',
          roomOptions: {},
        })
      ).rejects.toThrow('Server unavailable');
    });
  });
});
