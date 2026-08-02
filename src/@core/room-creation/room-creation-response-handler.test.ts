/**
 * Tests for Room Creation Response Handler
 */

import { RoomCreationResponseHandler } from './room-creation-response-handler';

describe('RoomCreationResponseHandler', () => {
  let handler: RoomCreationResponseHandler;

  beforeEach(() => {
    handler = new RoomCreationResponseHandler('https://example.com');
  });

  describe('parseRoomCreationResponse', () => {
    it('should handle null/undefined responses', () => {
      const result = handler.parseRoomCreationResponse(null);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NULL_RESPONSE');
      expect(result.error?.message).toContain('null or undefined');
    });

    it('should handle non-object responses', () => {
      const result = handler.parseRoomCreationResponse('invalid');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_RESPONSE_TYPE');
      expect(result.error?.message).toContain('not a valid object');
    });

    it('should handle server error responses', () => {
      const errorResponse = {
        type: 'ERROR',
        error: {
          code: 'ROOM_LIMIT_EXCEEDED',
          message: 'Too many rooms created',
        },
      };

      const result = handler.parseRoomCreationResponse(errorResponse);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ROOM_LIMIT_EXCEEDED');
      expect(result.error?.message).toBe('Too many rooms created');
    });

    it('should handle unexpected response types', () => {
      const response = {
        type: 'UNEXPECTED_TYPE',
        roomId: 'ROOM123',
      };

      const result = handler.parseRoomCreationResponse(response);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNEXPECTED_RESPONSE_TYPE');
      expect(result.error?.message).toContain('Expected ROOM_CREATED');
    });

    it('should validate required fields', () => {
      const invalidResponse = {
        type: 'ROOM_CREATED',
        // Missing roomId, hostId, timestamp
      };

      const result = handler.parseRoomCreationResponse(invalidResponse);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ROOM_RESPONSE');
      expect(result.error?.details?.validationErrors).toContain('roomId is missing or invalid');
      expect(result.error?.details?.validationErrors).toContain('hostId is missing or invalid');
      expect(result.error?.details?.validationErrors).toContain('timestamp is missing or invalid');
    });

    it('should handle empty or whitespace roomId', () => {
      const response = {
        type: 'ROOM_CREATED',
        roomId: '   ',
        hostId: 'user123',
        timestamp: Date.now(),
      };

      const result = handler.parseRoomCreationResponse(response);

      expect(result.success).toBe(false);
      expect(result.error?.details?.validationErrors).toContain('roomId is missing or invalid');
    });

    it('should parse valid ROOM_CREATED response', () => {
      const validResponse = {
        type: 'ROOM_CREATED',
        roomId: 'ROOM123',
        hostId: 'user123',
        participants: [{ userId: 'user123', role: 'host' }],
        currentState: {
          currentTime: 0,
          paused: true,
          playbackRate: 1,
        },
        timestamp: Date.now(),
      };

      const result = handler.parseRoomCreationResponse(validResponse);

      expect(result.success).toBe(true);
      expect(result.roomId).toBe('ROOM123');
      expect(result.hostId).toBe('user123');
      expect(result.participants).toHaveLength(1);
      expect(result.currentState).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should trim whitespace from roomId', () => {
      const response = {
        type: 'ROOM_CREATED',
        roomId: '  ROOM123  ',
        hostId: 'user123',
        timestamp: Date.now(),
      };

      const result = handler.parseRoomCreationResponse(response);

      expect(result.success).toBe(true);
      expect(result.roomId).toBe('ROOM123');
    });

    it('should provide default currentState if missing', () => {
      const response = {
        type: 'ROOM_CREATED',
        roomId: 'ROOM123',
        hostId: 'user123',
        timestamp: Date.now(),
      };

      const result = handler.parseRoomCreationResponse(response);

      expect(result.success).toBe(true);
      expect(result.currentState).toEqual({
        currentTime: 0,
        paused: true,
        playbackRate: 1,
        timestamp: response.timestamp,
      });
    });

    it('should provide empty participants array if missing', () => {
      const response = {
        type: 'ROOM_CREATED',
        roomId: 'ROOM123',
        hostId: 'user123',
        timestamp: Date.now(),
      };

      const result = handler.parseRoomCreationResponse(response);

      expect(result.success).toBe(true);
      expect(result.participants).toEqual([]);
    });
  });

  describe('generateUserResult', () => {
    it('should generate success result with invite link', () => {
      const parsedResponse = {
        success: true,
        roomId: 'ROOM123',
        hostId: 'user123',
        participants: [],
        currentState: {},
        timestamp: Date.now(),
      };

      const result = handler.generateUserResult(parsedResponse);

      expect(result.success).toBe(true);
      expect(result.roomId).toBe('ROOM123');
      expect(result.inviteLink).toBe('https://example.com/join/ROOM123');
      expect(result.userFriendlyMessage).toContain('created successfully');
    });

    it('should generate user-friendly error messages', () => {
      const errorCases = [
        {
          error: { code: 'NULL_RESPONSE', message: 'Null response' },
          expectedMessage: 'Server communication error',
        },
        {
          error: { code: 'SERVER_ERROR', message: 'Internal server error' },
          expectedMessage: 'Internal server error',
        },
        {
          error: { code: 'ROOM_LIMIT_EXCEEDED', message: 'Too many rooms' },
          expectedMessage: 'Room limit reached',
        },
        {
          error: { code: 'NETWORK_ERROR', message: 'Network failed' },
          expectedMessage: 'Network connection error',
        },
        {
          error: { code: 'TIMEOUT', message: 'Request timeout' },
          expectedMessage: 'Request timed out',
        },
      ];

      errorCases.forEach(({ error, expectedMessage }) => {
        const parsedResponse = {
          success: false,
          error,
        };

        const result = handler.generateUserResult(parsedResponse);

        expect(result.success).toBe(false);
        expect(result.userFriendlyMessage).toContain(expectedMessage);
      });
    });

    it('should set retryable flag correctly', () => {
      const retryableErrors = ['NULL_RESPONSE', 'SERVER_ERROR', 'NETWORK_ERROR', 'TIMEOUT'];
      const nonRetryableErrors = ['ROOM_LIMIT_EXCEEDED', 'INVALID_ROOM_OPTIONS'];

      retryableErrors.forEach((code) => {
        const result = handler.generateUserResult({
          success: false,
          error: { code, message: 'Test error' },
        });

        expect(result.retryable).toBe(true);
      });

      nonRetryableErrors.forEach((code) => {
        const result = handler.generateUserResult({
          success: false,
          error: { code, message: 'Test error' },
        });

        expect(result.retryable).toBe(false);
      });
    });
  });

  describe('handleMalformedResponse', () => {
    it('should handle JSON parse errors', () => {
      const syntaxError = new SyntaxError('Unexpected token');
      const result = handler.handleMalformedResponse('invalid json', syntaxError);

      expect(result.success).toBe(false);
      expect(result.userFriendlyMessage).toContain('response format error');
      expect(result.retryable).toBe(true);
    });

    it('should handle timeout errors', () => {
      const timeoutError = new Error('Request timeout occurred');
      const result = handler.handleMalformedResponse(null, timeoutError);

      expect(result.success).toBe(false);
      expect(result.userFriendlyMessage).toContain('timed out');
      expect(result.retryable).toBe(true);
    });

    it('should handle network errors', () => {
      const networkError = new Error('Network connection failed');
      const result = handler.handleMalformedResponse(null, networkError);

      expect(result.success).toBe(false);
      expect(result.userFriendlyMessage).toContain('Network error');
      expect(result.retryable).toBe(true);
    });

    it('should handle generic malformed responses', () => {
      const result = handler.handleMalformedResponse({ invalid: 'data' });

      expect(result.success).toBe(false);
      expect(result.userFriendlyMessage).toContain('invalid response');
      expect(result.retryable).toBe(true);
    });
  });

  describe('validateRoomId', () => {
    it('should validate correct room ID format', () => {
      expect(handler.validateRoomId('ROOM123')).toBe(true);
      expect(handler.validateRoomId('ABC123')).toBe(true);
      expect(handler.validateRoomId('123456')).toBe(true);
    });

    it('should reject invalid room ID formats', () => {
      expect(handler.validateRoomId('')).toBe(false);
      expect(handler.validateRoomId('room123')).toBe(false); // lowercase
      expect(handler.validateRoomId('ROOM12')).toBe(false); // too short
      expect(handler.validateRoomId('ROOM1234')).toBe(false); // too long
      expect(handler.validateRoomId('ROOM-123')).toBe(false); // special chars
      expect(handler.validateRoomId(null as any)).toBe(false);
      expect(handler.validateRoomId(undefined as any)).toBe(false);
    });
  });

  describe('generateCopyableRoomInfo', () => {
    it('should generate copyable room information', () => {
      const info = handler.generateCopyableRoomInfo('ROOM123', 'https://example.com/join/ROOM123');

      expect(info).toContain('Room ID: ROOM123');
      expect(info).toContain('Invite Link: https://example.com/join/ROOM123');
      expect(info).toContain('Created:');
    });

    it('should work without invite link', () => {
      const info = handler.generateCopyableRoomInfo('ROOM123');

      expect(info).toContain('Room ID: ROOM123');
      expect(info).not.toContain('Invite Link:');
      expect(info).toContain('Created:');
    });
  });

  describe('generateShareableMessage', () => {
    it('should generate shareable message with link', () => {
      const message = handler.generateShareableMessage(
        'ROOM123',
        'https://example.com/join/ROOM123'
      );

      expect(message).toContain('Join my Watch Party!');
      expect(message).toContain('Room ID: ROOM123');
      expect(message).toContain('Direct link: https://example.com/join/ROOM123');
    });

    it('should work without invite link', () => {
      const message = handler.generateShareableMessage('ROOM123');

      expect(message).toContain('Join my Watch Party!');
      expect(message).toContain('Room ID: ROOM123');
      expect(message).not.toContain('Direct link:');
    });
  });

  describe('constructor with different base URLs', () => {
    it('should handle empty base URL', () => {
      const handlerNoUrl = new RoomCreationResponseHandler();
      const result = handlerNoUrl.generateUserResult({
        success: true,
        roomId: 'ROOM123',
        hostId: 'user123',
        participants: [],
        currentState: {},
        timestamp: Date.now(),
      });

      expect(result.inviteLink).toBe('watch-party://join/ROOM123');
    });

    it('should use custom base URL', () => {
      const customHandler = new RoomCreationResponseHandler('https://custom.com');
      const result = customHandler.generateUserResult({
        success: true,
        roomId: 'ROOM123',
        hostId: 'user123',
        participants: [],
        currentState: {},
        timestamp: Date.now(),
      });

      expect(result.inviteLink).toBe('https://custom.com/join/ROOM123');
    });
  });
});
