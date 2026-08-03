/**
 * Participant Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParticipantManager } from './participant-manager';

describe('ParticipantManager', () => {
  let manager: ParticipantManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new ParticipantManager({ maxParticipants: 10, keyExchangeTimeout: 5000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Room lifecycle', () => {
    it('should initialize with current user on room join', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2', 'user-3']);

      expect(manager.getCurrentUserId()).toBe('user-1');
      expect(manager.size).toBe(3);
      expect(manager.getParticipantIds()).toEqual(
        expect.arrayContaining(['user-1', 'user-2', 'user-3'])
      );
    });

    it('should reset state on room leave', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2']);
      manager.reset();

      expect(manager.size).toBe(0);
      expect(manager.getCurrentUserId()).toBe('');
    });
  });

  describe('Participant CRUD', () => {
    it('should add a participant', () => {
      manager.onRoomJoined('room-1', 'user-1', []);
      const added = manager.addParticipant('user-2');

      expect(added).toBe(true);
      expect(manager.size).toBe(2);
    });

    it('should not add duplicate participant', () => {
      manager.onRoomJoined('room-1', 'user-1', []);
      const added = manager.addParticipant('user-1');

      expect(added).toBe(false);
      expect(manager.size).toBe(1);
    });

    it('should respect maxParticipants limit', () => {
      const smallManager = new ParticipantManager({ maxParticipants: 2 });
      smallManager.onRoomJoined('room-1', 'user-1', ['user-2']);

      const added = smallManager.addParticipant('user-3');
      expect(added).toBe(false);
      expect(smallManager.size).toBe(2);
    });

    it('should remove a participant', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2', 'user-3']);
      const removed = manager.removeParticipant('user-2');

      expect(removed).not.toBeNull();
      expect(removed!.userId).toBe('user-2');
      expect(manager.size).toBe(2);
    });

    it('should return null when removing unknown participant', () => {
      manager.onRoomJoined('room-1', 'user-1', []);
      const removed = manager.removeParticipant('unknown');

      expect(removed).toBeNull();
    });
  });

  describe('Key management', () => {
    it('should set a participant key', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2']);
      const set = manager.setParticipantKey('user-2', 'public-key-2');

      expect(set).toBe(true);
      expect(manager.getParticipant('user-2')?.publicKey).toBe('public-key-2');
    });

    it('should return false for unknown participant key', () => {
      manager.onRoomJoined('room-1', 'user-1', []);
      const set = manager.setParticipantKey('unknown', 'key');

      expect(set).toBe(false);
    });

    it('should report keys not exchanged with only self', () => {
      manager.onRoomJoined('room-1', 'user-1', []);

      expect(manager.hasKeysExchanged()).toBe(false);
    });

    it('should report keys exchanged when all have keys', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2']);

      manager.setParticipantKey('user-1', 'key-1');
      manager.setParticipantKey('user-2', 'key-2');

      expect(manager.hasKeysExchanged()).toBe(true);
    });

    it('should report keys not exchanged when some are missing', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2', 'user-3']);

      manager.setParticipantKey('user-1', 'key-1');
      // user-2 and user-3 have no keys

      expect(manager.hasKeysExchanged()).toBe(false);
    });

    it('should track missing key IDs', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2', 'user-3']);

      manager.setParticipantKey('user-1', 'key-1');
      manager.setParticipantKey('user-2', 'key-2');

      expect(manager.getMissingKeyIds()).toEqual(['user-3']);
    });

    it('should track key-exchanged IDs', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2', 'user-3']);

      manager.setParticipantKey('user-1', 'key-1');
      manager.setParticipantKey('user-3', 'key-3');

      expect(manager.getKeyExchangedIds()).toEqual(expect.arrayContaining(['user-1', 'user-3']));
    });
  });

  describe('Events', () => {
    it('should emit participant_added event', () => {
      const listener = vi.fn();
      manager.onEvent('participant_added', listener);
      manager.onRoomJoined('room-1', 'user-1', ['user-2']);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'participant_added', userId: 'user-2' })
      );
    });

    it('should emit participant_removed event', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2']);

      const listener = vi.fn();
      manager.onEvent('participant_removed', listener);
      manager.removeParticipant('user-2');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'participant_removed', userId: 'user-2' })
      );
    });

    it('should emit keys_exchanged when all keys are set', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2']);

      const listener = vi.fn();
      manager.onEvent('keys_exchanged', listener);

      manager.setParticipantKey('user-1', 'key-1');
      manager.setParticipantKey('user-2', 'key-2');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'keys_exchanged', allKeysReady: true })
      );
    });

    it('should emit key_exchange_timeout after timeout', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2']);

      const listener = vi.fn();
      manager.onEvent('key_exchange_timeout', listener);

      vi.advanceTimersByTime(5001);

      expect(listener).toHaveBeenCalled();
    });

    it('should support unsubscribe', () => {
      const listener = vi.fn();
      const unsub = manager.onEvent('participant_added', listener);
      unsub();

      manager.onRoomJoined('room-1', 'user-1', ['user-2']);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid join/leave cycles', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2', 'user-3']);
      manager.removeParticipant('user-2');
      manager.addParticipant('user-4');
      manager.removeParticipant('user-3');
      manager.addParticipant('user-5');

      expect(manager.getParticipantIds()).toEqual(
        expect.arrayContaining(['user-1', 'user-4', 'user-5'])
      );
    });

    it('should handle setting key for participant after they leave', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2']);
      manager.removeParticipant('user-2');

      const set = manager.setParticipantKey('user-2', 'stale-key');
      expect(set).toBe(false);
    });

    it('should clear keys_exchanged when participant leaves', () => {
      manager.onRoomJoined('room-1', 'user-1', ['user-2']);
      manager.setParticipantKey('user-1', 'key-1');
      manager.setParticipantKey('user-2', 'key-2');
      expect(manager.hasKeysExchanged()).toBe(true);

      manager.removeParticipant('user-2');
      // Now only self remains — hasKeysExchanged returns false for <=1 participants
      expect(manager.hasKeysExchanged()).toBe(false);
    });
  });
});
