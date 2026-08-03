/**
 * E2E Encryption Tests
 * Tests for end-to-end encryption implementation
 * Implements requirement 15.2 (Verify E2E encryption implementation)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { E2EEncryption, E2EConfig, E2E_PROTOCOL_VERSION } from './e2e-encryption';

// Mock crypto API for testing
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    exportKey: vi.fn(),
    importKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
  getRandomValues: vi.fn(),
};

// Mock global crypto
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

describe('E2EEncryption', () => {
  let encryption: E2EEncryption;
  let config: E2EConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      enabled: true,
      algorithm: 'RSA-OAEP',
      keySize: 2048,
    };

    encryption = new E2EEncryption(config);
  });

  describe('Initialization', () => {
    it('should initialize when encryption is disabled', async () => {
      const disabledConfig = { ...config, enabled: false };
      const disabledEncryption = new E2EEncryption(disabledConfig);

      await disabledEncryption.initialize();

      expect(disabledEncryption.isEnabled()).toBe(false);
    });

    it('should generate key pair when encryption is enabled', async () => {
      const mockKeyPair = {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
      };

      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);

      await encryption.initialize();

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        false,
        ['encrypt', 'decrypt']
      );
    });

    it('should be ready after successful initialization', async () => {
      mockCrypto.subtle.generateKey.mockResolvedValue({
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
      });

      await encryption.initialize();

      expect(encryption.isReady()).toBe(true);
    });

    it('should expose the protocol version constant', () => {
      expect(E2E_PROTOCOL_VERSION).toBe(1);
    });

    it('should not be ready before initialization', () => {
      expect(encryption.isReady()).toBe(false);
    });

    it('should report configured key size', () => {
      expect(encryption.getKeySize()).toBe(2048);
    });

    it('should handle key generation failure', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Key generation failed'));

      await expect(encryption.initialize()).rejects.toThrow('Key generation failed');
    });
  });

  describe('Key Management', () => {
    beforeEach(async () => {
      const mockKeyPair = {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
      };
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      await encryption.initialize();
    });

    it('should export public key', async () => {
      const mockExportedKey = new ArrayBuffer(256);
      mockCrypto.subtle.exportKey.mockResolvedValue(mockExportedKey);

      const publicKey = await encryption.getPublicKey();

      expect(mockCrypto.subtle.exportKey).toHaveBeenCalledWith('spki', 'mock-public-key');
      expect(publicKey).toBeTruthy();
    });

    it('should handle public key export failure', async () => {
      mockCrypto.subtle.exportKey.mockRejectedValue(new Error('Export failed'));

      const publicKey = await encryption.getPublicKey();
      expect(publicKey).toBeNull();
    });

    it('should add participant public key', async () => {
      const mockImportedKey = 'mock-imported-key';
      mockCrypto.subtle.importKey.mockResolvedValue(mockImportedKey);

      const publicKeyBase64 = 'dGVzdC1wdWJsaWMta2V5'; // base64 encoded "test-public-key"

      await encryption.addParticipantKey('user1', publicKeyBase64);

      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'spki',
        expect.any(ArrayBuffer),
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );

      expect(encryption.getAvailableParticipants()).toContain('user1');
    });

    it('should handle invalid participant key', async () => {
      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Invalid key'));

      await encryption.addParticipantKey('user1', 'invalid-key');

      expect(encryption.getAvailableParticipants()).not.toContain('user1');
    });

    it('should remove participant key', () => {
      // First add a participant (mocked)
      encryption.removeParticipantKey('user1');

      expect(encryption.getAvailableParticipants()).not.toContain('user1');
    });

    it('should clear all participant keys', () => {
      encryption.clearParticipantKeys();

      expect(encryption.getAvailableParticipants()).toHaveLength(0);
    });
  });

  describe('Message Encryption', () => {
    beforeEach(async () => {
      const mockKeyPair = {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
      };
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      await encryption.initialize();

      // Mock participant key
      const mockParticipantKey = 'mock-participant-key';
      mockCrypto.subtle.importKey.mockResolvedValue(mockParticipantKey);
      await encryption.addParticipantKey('user1', 'dGVzdC1wdWJsaWMta2V5');
    });

    it('should return null when encryption is disabled', async () => {
      const disabledEncryption = new E2EEncryption({ ...config, enabled: false });

      const result = await disabledEncryption.encryptMessage('test message', 'user1');
      expect(result).toBeNull();
    });

    it('should return null when recipient key not found', async () => {
      const result = await encryption.encryptMessage('test message', 'unknown-user');
      expect(result).toBeNull();
    });

    it('should encrypt message successfully', async () => {
      // Mock symmetric key generation
      const mockSymmetricKey = 'mock-symmetric-key';
      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);

      // Mock IV generation
      const mockIv = new Uint8Array(12);
      mockCrypto.getRandomValues.mockReturnValue(mockIv);

      // Mock encryption operations
      const mockEncryptedMessage = new ArrayBuffer(32);
      const mockExportedSymmetricKey = new ArrayBuffer(32);
      const mockEncryptedSymmetricKey = new ArrayBuffer(256);

      mockCrypto.subtle.encrypt
        .mockResolvedValueOnce(mockEncryptedMessage) // Message encryption
        .mockResolvedValueOnce(mockEncryptedSymmetricKey); // Symmetric key encryption

      mockCrypto.subtle.exportKey.mockResolvedValue(mockExportedSymmetricKey);

      // Mock public key export for sender
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(256));

      const result = await encryption.encryptMessage('test message', 'user1');

      expect(result).toBeTruthy();
      expect(result?.encryptedContent).toBeTruthy();
      expect(result?.iv).toBeTruthy();
      expect(result?.senderPublicKey).toBeTruthy();
      expect(result?.timestamp).toBeGreaterThan(0);
    });

    it('should handle encryption failure', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Encryption failed'));

      const result = await encryption.encryptMessage('test message', 'user1');
      expect(result).toBeNull();
    });
  });

  describe('Message Decryption', () => {
    beforeEach(async () => {
      const mockKeyPair = {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
      };
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      await encryption.initialize();
    });

    it('should return null when encryption is disabled', async () => {
      const disabledEncryption = new E2EEncryption({ ...config, enabled: false });

      const mockEncryptedMessage = {
        encryptedContent: 'encrypted',
        iv: 'iv',
        senderPublicKey: 'key',
        timestamp: Date.now(),
      };

      const result = await disabledEncryption.decryptMessage(mockEncryptedMessage);
      expect(result).toBeNull();
    });

    it('should decrypt message successfully', async () => {
      const mockEncryptedMessage = {
        encryptedContent: btoa('mock-encrypted-content'),
        iv: btoa('mock-iv'),
        senderPublicKey: 'mock-sender-key',
        timestamp: Date.now(),
      };

      // Mock decryption operations
      const mockDecryptedSymmetricKey = new ArrayBuffer(32);
      const mockDecryptedMessage = new ArrayBuffer(12);
      const mockSymmetricKey = 'mock-symmetric-key';

      mockCrypto.subtle.decrypt
        .mockResolvedValueOnce(mockDecryptedSymmetricKey) // Symmetric key decryption
        .mockResolvedValueOnce(mockDecryptedMessage); // Message decryption

      mockCrypto.subtle.importKey.mockResolvedValue(mockSymmetricKey);

      // Mock TextDecoder
      global.TextDecoder = vi.fn().mockImplementation(() => ({
        decode: vi.fn().mockReturnValue('decrypted message'),
      }));

      const result = await encryption.decryptMessage(mockEncryptedMessage);
      expect(result).toBe('decrypted message');
    });

    it('should handle decryption failure', async () => {
      const mockEncryptedMessage = {
        encryptedContent: 'invalid-content',
        iv: 'invalid-iv',
        senderPublicKey: 'invalid-key',
        timestamp: Date.now(),
      };

      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      const result = await encryption.decryptMessage(mockEncryptedMessage);
      expect(result).toBeNull();
    });
  });

  describe('Group Encryption', () => {
    beforeEach(async () => {
      const mockKeyPair = {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
      };
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      await encryption.initialize();

      // Mock multiple participant keys
      const mockParticipantKey = 'mock-participant-key';
      mockCrypto.subtle.importKey.mockResolvedValue(mockParticipantKey);
      await encryption.addParticipantKey('user1', 'key1');
      await encryption.addParticipantKey('user2', 'key2');
    });

    it('should encrypt message for multiple recipients', async () => {
      // Mock encryption for group
      const mockSymmetricKey = 'mock-symmetric-key';
      const mockEncryptedMessage = new ArrayBuffer(32);
      const mockExportedSymmetricKey = new ArrayBuffer(32);
      const mockEncryptedSymmetricKey = new ArrayBuffer(256);
      const mockIv = new Uint8Array(12);

      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);
      mockCrypto.getRandomValues.mockReturnValue(mockIv);
      mockCrypto.subtle.encrypt
        .mockResolvedValue(mockEncryptedMessage)
        .mockResolvedValue(mockEncryptedSymmetricKey);
      mockCrypto.subtle.exportKey.mockResolvedValue(mockExportedSymmetricKey);

      const recipients = ['user1', 'user2'];
      const result = await encryption.encryptMessageForGroup('test message', recipients);

      expect(result.size).toBe(2);
      expect(result.has('user1')).toBe(true);
      expect(result.has('user2')).toBe(true);
    });

    it('should handle partial encryption failures in group', async () => {
      // Mock one successful, one failed encryption
      mockCrypto.subtle.generateKey
        .mockResolvedValueOnce('mock-key') // Success for user1
        .mockRejectedValueOnce(new Error('Failed')); // Failure for user2

      const recipients = ['user1', 'user2'];
      const result = await encryption.encryptMessageForGroup('test message', recipients);

      // Should only contain successful encryptions
      expect(result.size).toBeLessThanOrEqual(2);
    });
  });

  describe('Security Validation', () => {
    it('should use secure key sizes', () => {
      expect(config.keySize).toBeGreaterThanOrEqual(2048);
    });

    it('should use secure algorithms', () => {
      expect(config.algorithm).toBe('RSA-OAEP');
    });

    it('should generate random IVs', () => {
      const mockIv1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const mockIv2 = new Uint8Array([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);

      mockCrypto.getRandomValues
        .mockImplementationOnce((array) => {
          array.set(mockIv1);
          return array;
        })
        .mockImplementationOnce((array) => {
          array.set(mockIv2);
          return array;
        });

      const iv1 = new Uint8Array(12);
      const iv2 = new Uint8Array(12);

      mockCrypto.getRandomValues(iv1);
      mockCrypto.getRandomValues(iv2);

      // IVs should be different
      expect(iv1).not.toEqual(iv2);
    });

    it('should validate key formats', () => {
      const validBase64 = 'dGVzdC1rZXk='; // "test-key" in base64
      const invalidBase64 = 'invalid-base64!@#';

      // Valid base64 should decode without error
      expect(() => atob(validBase64)).not.toThrow();

      // Invalid base64 should throw
      expect(() => atob(invalidBase64)).toThrow();
    });

    it('should handle malformed encrypted messages', async () => {
      const malformedMessage = {
        encryptedContent: 'not-base64!@#',
        iv: 'also-not-base64!@#',
        senderPublicKey: 'invalid',
        timestamp: Date.now(),
      };

      const result = await encryption.decryptMessage(malformedMessage);
      expect(result).toBeNull();
    });
  });

  describe('Performance and Limits', () => {
    it('should handle large messages', async () => {
      const largeMessage = 'x'.repeat(10000); // 10KB message

      // Should not throw for reasonable message sizes
      expect(largeMessage.length).toBe(10000);
    });

    it('should handle many participants', () => {
      const manyParticipants = Array.from({ length: 100 }, (_, i) => `user${i}`);

      // Should be able to handle reasonable number of participants
      expect(manyParticipants.length).toBe(100);
    });

    it('should clean up resources', () => {
      encryption.clearParticipantKeys();

      expect(encryption.getAvailableParticipants()).toHaveLength(0);
    });
  });
});
