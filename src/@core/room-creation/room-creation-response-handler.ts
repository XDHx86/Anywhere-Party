/**
 * Enhanced Room Creation Response Handler
 * Provides robust server response parsing with comprehensive error handling
 */

export interface RoomCreationResponse {
  success: boolean;
  roomId?: string;
  hostId?: string;
  participants?: unknown[];
  currentState?: unknown;
  timestamp?: number;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface RawRoomResponse {
  type?: string;
  error?: { code?: string; message?: string };
  roomId?: string;
  hostId?: string;
  timestamp?: number;
  participants?: unknown[];
  currentState?: unknown;
}

export interface RoomCreationResult {
  success: boolean;
  roomId?: string;
  inviteLink?: string;
  error?: string;
  userFriendlyMessage?: string;
  retryable?: boolean;
}

export class RoomCreationResponseHandler {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Parse and validate server response for room creation
   */
  parseRoomCreationResponse(rawResponse: RawRoomResponse): RoomCreationResponse {
    // Handle null/undefined responses
    if (!rawResponse) {
      return {
        success: false,
        error: {
          code: 'NULL_RESPONSE',
          message: 'Server returned null or undefined response',
          details: { rawResponse },
        },
      };
    }

    // Handle non-object responses
    if (typeof rawResponse !== 'object') {
      return {
        success: false,
        error: {
          code: 'INVALID_RESPONSE_TYPE',
          message: 'Server response is not a valid object',
          details: { rawResponse, type: typeof rawResponse },
        },
      };
    }

    // Handle error responses
    if (rawResponse.type === 'ERROR') {
      return {
        success: false,
        error: {
          code: rawResponse.error?.code || 'SERVER_ERROR',
          message: rawResponse.error?.message || 'Server reported an error',
          details: rawResponse.error,
        },
      };
    }

    // Validate ROOM_CREATED response
    if (rawResponse.type !== 'ROOM_CREATED') {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_RESPONSE_TYPE',
          message: `Expected ROOM_CREATED, got ${rawResponse.type}`,
          details: { rawResponse },
        },
      };
    }

    // Validate required fields
    const validationErrors: string[] = [];

    if (
      !rawResponse.roomId ||
      typeof rawResponse.roomId !== 'string' ||
      rawResponse.roomId.trim() === ''
    ) {
      validationErrors.push('roomId is missing or invalid');
    }

    if (!rawResponse.hostId || typeof rawResponse.hostId !== 'string') {
      validationErrors.push('hostId is missing or invalid');
    }

    if (!rawResponse.timestamp || typeof rawResponse.timestamp !== 'number') {
      validationErrors.push('timestamp is missing or invalid');
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_ROOM_RESPONSE',
          message: 'Room creation response is missing required fields',
          details: { validationErrors, rawResponse },
        },
      };
    }

    // Return successful parsed response
    return {
      success: true,
      roomId: rawResponse.roomId?.trim() ?? '',
      hostId: rawResponse.hostId,
      participants: Array.isArray(rawResponse.participants) ? rawResponse.participants : [],
      currentState: rawResponse.currentState || {
        currentTime: 0,
        paused: true,
        playbackRate: 1,
        timestamp: rawResponse.timestamp,
      },
      timestamp: rawResponse.timestamp,
    };
  }

  /**
   * Generate user-friendly result from parsed response
   */
  generateUserResult(parsedResponse: RoomCreationResponse): RoomCreationResult {
    if (!parsedResponse.success || !parsedResponse.roomId) {
      const error = parsedResponse.error;
      let userFriendlyMessage = 'Failed to create room. Please try again.';
      let retryable = true;

      if (error) {
        switch (error.code) {
          case 'NULL_RESPONSE':
          case 'INVALID_RESPONSE_TYPE':
            userFriendlyMessage =
              'Server communication error. Please check your connection and try again.';
            retryable = true;
            break;

          case 'SERVER_ERROR':
            userFriendlyMessage = error.message || 'Server error occurred. Please try again later.';
            retryable = true;
            break;

          case 'ROOM_LIMIT_EXCEEDED':
            userFriendlyMessage = 'Room limit reached. Please try again later.';
            retryable = false;
            break;

          case 'INVALID_ROOM_OPTIONS':
            userFriendlyMessage = 'Invalid room settings. Please check your configuration.';
            retryable = false;
            break;

          case 'NETWORK_ERROR':
            userFriendlyMessage =
              'Network connection error. Please check your internet connection.';
            retryable = true;
            break;

          case 'TIMEOUT':
            userFriendlyMessage = 'Request timed out. Please try again.';
            retryable = true;
            break;

          case 'INVALID_ROOM_RESPONSE':
            userFriendlyMessage = 'Server returned invalid response. Please try again.';
            retryable = true;
            break;

          default:
            userFriendlyMessage = error.message || 'Unknown error occurred. Please try again.';
            retryable = true;
        }
      }

      return {
        success: false,
        error: error?.message || 'Room creation failed',
        userFriendlyMessage,
        retryable,
      };
    }

    // Generate invite link
    const inviteLink = this.generateInviteLink(parsedResponse.roomId);

    return {
      success: true,
      roomId: parsedResponse.roomId,
      inviteLink,
      userFriendlyMessage: `Room ${parsedResponse.roomId} created successfully!`,
    };
  }

  /**
   * Generate invite link for the room
   */
  private generateInviteLink(roomId: string): string {
    if (this.baseUrl) {
      return `${this.baseUrl}/join/${roomId}`;
    }

    // Fallback to extension-based invite
    return `watch-party://join/${roomId}`;
  }

  /**
   * Handle malformed server responses gracefully
   */
  handleMalformedResponse(rawData: unknown, error?: Error): RoomCreationResult {
    console.error('Malformed server response:', { rawData, error });

    let userFriendlyMessage = 'Server returned invalid response. Please try again.';

    if (error) {
      if (error.name === 'SyntaxError') {
        userFriendlyMessage = 'Server response format error. Please try again.';
      } else if (error.message.toLowerCase().includes('timeout')) {
        userFriendlyMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message.toLowerCase().includes('network')) {
        userFriendlyMessage = 'Network error. Please check your internet connection.';
      }
    }

    return {
      success: false,
      error: error?.message || 'Malformed server response',
      userFriendlyMessage,
      retryable: true,
    };
  }

  /**
   * Validate room ID format
   */
  validateRoomId(roomId: string): boolean {
    if (!roomId || typeof roomId !== 'string') {
      return false;
    }

    const trimmed = roomId.trim();

    // Room ID should be 6-7 uppercase alphanumeric characters
    const roomIdPattern = /^[A-Z0-9]{6,7}$/;
    return roomIdPattern.test(trimmed);
  }

  /**
   * Generate copy-friendly room information
   */
  generateCopyableRoomInfo(roomId: string, inviteLink?: string): string {
    const info = [`Room ID: ${roomId}`];

    if (inviteLink) {
      info.push(`Invite Link: ${inviteLink}`);
    }

    info.push(`Created: ${new Date().toLocaleString()}`);

    return info.join('\n');
  }

  /**
   * Generate shareable room information
   */
  generateShareableMessage(roomId: string, inviteLink?: string): string {
    const baseMessage = `Join my Watch Party! Room ID: ${roomId}`;

    if (inviteLink) {
      return `${baseMessage}\nDirect link: ${inviteLink}`;
    }

    return baseMessage;
  }
}

// Export singleton instance
export const roomCreationResponseHandler = new RoomCreationResponseHandler();
