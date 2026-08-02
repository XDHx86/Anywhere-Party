/**
 * Tests for signaling message protocol validation and factory functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateMessage,
  createCreateRoomMessage,
  createJoinRoomMessage,
  createSyncStateMessage,
  createChatMessage,
  createHeartbeatMessage,
  createErrorMessage,
  isClientMessage,
  isServerMessage,
  SignalingErrorCode,
} from './message-types';

describe('Message Validation', () => {
  it('should validate CREATE_ROOM messages', () => {
    const validMessage = { type: 'CREATE_ROOM', userId: 'user123' };
    const invalidMessage = { type: 'CREATE_ROOM' }; // missing userId

    expect(validateMessage(validMessage)).toEqual({ valid: true });
    expect(validateMessage(invalidMessage)).toEqual({
      valid: false,
      error: 'CREATE_ROOM requires userId',
    });
  });

  it('should validate JOIN_ROOM messages', () => {
    const validMessage = { type: 'JOIN_ROOM', userId: 'user123', roomId: 'ROOM123' };
    const invalidMessage = { type: 'JOIN_ROOM', userId: 'user123' }; // missing roomId

    expect(validateMessage(validMessage)).toEqual({ valid: true });
    expect(validateMessage(invalidMessage)).toEqual({
      valid: false,
      error: 'JOIN_ROOM requires userId and roomId',
    });
  });

  it('should validate SYNC_STATE messages', () => {
    const validMessage = {
      type: 'SYNC_STATE',
      userId: 'user123',
      state: { currentTime: 42.5, paused: false, playbackRate: 1, timestamp: Date.now() },
    };

    const invalidMessage = {
      type: 'SYNC_STATE',
      userId: 'user123',
      state: { currentTime: '42.5', paused: false }, // currentTime should be number
    };

    expect(validateMessage(validMessage)).toEqual({ valid: true });
    expect(validateMessage(invalidMessage)).toEqual({
      valid: false,
      error: 'SYNC_STATE state must have currentTime (number) and paused (boolean)',
    });
  });

  it('should validate CHAT_MESSAGE messages', () => {
    const validMessage = { type: 'CHAT_MESSAGE', userId: 'user123', message: 'Hello!' };
    const invalidMessage = { type: 'CHAT_MESSAGE', userId: 'user123' }; // missing message
    const tooLongMessage = {
      type: 'CHAT_MESSAGE',
      userId: 'user123',
      message: 'x'.repeat(1001), // too long
    };

    expect(validateMessage(validMessage)).toEqual({ valid: true });
    expect(validateMessage(invalidMessage)).toEqual({
      valid: false,
      error: 'CHAT_MESSAGE requires userId and message',
    });
    expect(validateMessage(tooLongMessage)).toEqual({
      valid: false,
      error: 'CHAT_MESSAGE message must be a string under 1000 characters',
    });
  });

  it('should reject invalid message formats', () => {
    expect(validateMessage(null)).toEqual({
      valid: false,
      error: 'Message must be an object',
    });

    expect(validateMessage({})).toEqual({
      valid: false,
      error: 'Message must have a string type field',
    });

    expect(validateMessage({ type: 123 })).toEqual({
      valid: false,
      error: 'Message must have a string type field',
    });
  });
});

describe('Message Type Guards', () => {
  it('should identify client messages', () => {
    expect(isClientMessage({ type: 'CREATE_ROOM', userId: 'user123' })).toBe(true);
    expect(isClientMessage({ type: 'JOIN_ROOM', userId: 'user123', roomId: 'ROOM123' })).toBe(true);
    expect(isClientMessage({ type: 'SYNC_STATE', userId: 'user123', state: {} })).toBe(true);
    expect(isClientMessage({ type: 'CHAT_MESSAGE', userId: 'user123', message: 'hi' })).toBe(true);

    expect(isClientMessage({ type: 'WELCOME', serverId: 'server123' })).toBe(false);
    expect(isClientMessage({ type: 'UNKNOWN_TYPE' })).toBe(false);
    expect(isClientMessage(null)).toBe(false);
  });

  it('should identify server messages', () => {
    expect(isServerMessage({ type: 'WELCOME', serverId: 'server123' })).toBe(true);
    expect(isServerMessage({ type: 'ROOM_CREATED', roomId: 'ROOM123' })).toBe(true);
    expect(isServerMessage({ type: 'SYNC_UPDATE', state: {}, fromUserId: 'user123' })).toBe(true);
    expect(isServerMessage({ type: 'ERROR', error: { code: 'TEST', message: 'test' } })).toBe(true);

    expect(isServerMessage({ type: 'CREATE_ROOM', userId: 'user123' })).toBe(false);
    expect(isServerMessage({ type: 'UNKNOWN_TYPE' })).toBe(false);
    expect(isServerMessage(null)).toBe(false);
  });
});

describe('Message Factory Functions', () => {
  it('should create CREATE_ROOM messages', () => {
    const message = createCreateRoomMessage('user123', { name: 'Test Room' });

    expect(message.type).toBe('CREATE_ROOM');
    expect(message.userId).toBe('user123');
    expect(message.roomOptions?.name).toBe('Test Room');
    expect(message.timestamp).toBeTypeOf('number');
  });

  it('should create JOIN_ROOM messages', () => {
    const message = createJoinRoomMessage('user123', 'ROOM123', 'password');

    expect(message.type).toBe('JOIN_ROOM');
    expect(message.userId).toBe('user123');
    expect(message.roomId).toBe('ROOM123');
    expect(message.password).toBe('password');
    expect(message.timestamp).toBeTypeOf('number');
  });

  it('should create SYNC_STATE messages', () => {
    const state = { currentTime: 42.5, paused: false, playbackRate: 1, timestamp: Date.now() };
    const message = createSyncStateMessage('user123', state);

    expect(message.type).toBe('SYNC_STATE');
    expect(message.userId).toBe('user123');
    expect(message.state.currentTime).toBe(42.5);
    expect(message.state.paused).toBe(false);
    expect(message.timestamp).toBeTypeOf('number');
  });

  it('should create CHAT_MESSAGE messages', () => {
    const message = createChatMessage('user123', 'Hello world!');

    expect(message.type).toBe('CHAT_MESSAGE');
    expect(message.userId).toBe('user123');
    expect(message.message).toBe('Hello world!');
    expect(message.timestamp).toBeTypeOf('number');
  });

  it('should create HEARTBEAT messages', () => {
    const message = createHeartbeatMessage('user123');

    expect(message.type).toBe('HEARTBEAT');
    expect(message.userId).toBe('user123');
    expect(message.timestamp).toBeTypeOf('number');
  });

  it('should create ERROR messages', () => {
    const message = createErrorMessage(SignalingErrorCode.ROOM_NOT_FOUND, 'Room not found', {
      roomId: 'ROOM123',
    });

    expect(message.type).toBe('ERROR');
    expect(message.error.code).toBe(SignalingErrorCode.ROOM_NOT_FOUND);
    expect(message.error.message).toBe('Room not found');
    expect(message.error.details.roomId).toBe('ROOM123');
    expect(message.timestamp).toBeTypeOf('number');
  });
});

describe('Error Codes', () => {
  it('should have all expected error codes', () => {
    expect(SignalingErrorCode.INVALID_MESSAGE).toBe('INVALID_MESSAGE');
    expect(SignalingErrorCode.ROOM_NOT_FOUND).toBe('ROOM_NOT_FOUND');
    expect(SignalingErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(SignalingErrorCode.NOT_HOST).toBe('NOT_HOST');
    expect(SignalingErrorCode.SERVER_ERROR).toBe('SERVER_ERROR');
  });
});
