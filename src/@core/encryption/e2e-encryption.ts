/**
 * End-to-End Encryption for Chat Communications
 * Implements requirement 15.2
 */

export interface EncryptionKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
  senderPublicKey: string;
  timestamp: number;
}

export interface E2EConfig {
  enabled: boolean;
  algorithm: string;
  keySize: number;
}

/** Current wire protocol version for E2E encryption messages. */
export const E2E_PROTOCOL_VERSION = 1;

export class E2EEncryption {
  private keyPair: EncryptionKeyPair | null = null;
  private participantKeys: Map<string, CryptoKey> = new Map();
  private config: E2EConfig;

  constructor(config: E2EConfig) {
    this.config = config;
  }

  /**
   * Initialize encryption system and generate key pair
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('E2E encryption disabled');
      return;
    }

    try {
      // Generate key pair for this user
      this.keyPair = await this.generateKeyPair();
      console.log(
        `E2E encryption initialized (protocol v${E2E_PROTOCOL_VERSION}, RSA-${this.config.keySize})`
      );
    } catch (error) {
      console.error('Failed to initialize E2E encryption:', error);
      throw error;
    }
  }

  /**
   * Check if encryption is initialized and ready for use.
   */
  isReady(): boolean {
    return this.config.enabled && this.keyPair !== null;
  }

  /**
   * Get the configured RSA key size in bits.
   */
  getKeySize(): number {
    return this.config.keySize;
  }

  /**
   * Get public key for sharing with other participants
   */
  async getPublicKey(): Promise<string | null> {
    if (!this.keyPair) {
      return null;
    }

    try {
      const exported = await crypto.subtle.exportKey('spki', this.keyPair.publicKey);
      return this.arrayBufferToBase64(exported);
    } catch (error) {
      console.error('Failed to export public key:', error);
      return null;
    }
  }

  /**
   * Add participant's public key
   */
  async addParticipantKey(userId: string, publicKeyBase64: string): Promise<void> {
    try {
      const keyData = this.base64ToArrayBuffer(publicKeyBase64);
      const publicKey = await crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );

      this.participantKeys.set(userId, publicKey);
      console.log(`Added public key for participant: ${userId}`);
    } catch (error) {
      console.error(`Failed to add public key for ${userId}:`, error);
    }
  }

  /**
   * Remove participant's public key
   */
  removeParticipantKey(userId: string): void {
    this.participantKeys.delete(userId);
    console.log(`Removed public key for participant: ${userId}`);
  }

  /**
   * Encrypt message for specific recipient
   */
  async encryptMessage(message: string, recipientUserId: string): Promise<EncryptedMessage | null> {
    if (!this.config.enabled || !this.keyPair) {
      return null;
    }

    const recipientKey = this.participantKeys.get(recipientUserId);
    if (!recipientKey) {
      console.warn(`No public key found for recipient: ${recipientUserId}`);
      return null;
    }

    try {
      // Generate symmetric key for this message
      const symmetricKey = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt message with symmetric key
      const messageBuffer = new TextEncoder().encode(message);
      const encryptedMessage = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        symmetricKey,
        messageBuffer
      );

      // Export symmetric key
      const exportedSymmetricKey = await crypto.subtle.exportKey('raw', symmetricKey);

      // Encrypt symmetric key with recipient's public key
      const encryptedSymmetricKey = await crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        recipientKey,
        exportedSymmetricKey
      );

      // Get sender's public key
      const senderPublicKey = await this.getPublicKey();
      if (!senderPublicKey) {
        throw new Error('Failed to get sender public key');
      }

      // Combine encrypted symmetric key and encrypted message
      const combinedBuffer = new Uint8Array(
        encryptedSymmetricKey.byteLength + encryptedMessage.byteLength
      );
      combinedBuffer.set(new Uint8Array(encryptedSymmetricKey), 0);
      combinedBuffer.set(new Uint8Array(encryptedMessage), encryptedSymmetricKey.byteLength);

      return {
        encryptedContent: this.arrayBufferToBase64(combinedBuffer.buffer),
        iv: this.arrayBufferToBase64(iv.buffer),
        senderPublicKey,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      return null;
    }
  }

  /**
   * Decrypt received message
   */
  async decryptMessage(encryptedMessage: EncryptedMessage): Promise<string | null> {
    if (!this.config.enabled || !this.keyPair) {
      return null;
    }

    try {
      // Decode encrypted content and IV
      const combinedBuffer = this.base64ToArrayBuffer(encryptedMessage.encryptedContent);
      const iv = this.base64ToArrayBuffer(encryptedMessage.iv);

      // The combined buffer is [encrypted symmetric key][encrypted message].
      // The encrypted symmetric key length equals the RSA key size in bytes
      // (keySize/8), so this is dynamic rather than hardcoded to RSA-2048.
      const encryptedKeyBytes = this.config.keySize / 8;
      const encryptedSymmetricKey = combinedBuffer.slice(0, encryptedKeyBytes);
      const encryptedMessageContent = combinedBuffer.slice(encryptedKeyBytes);

      // Decrypt symmetric key with our private key
      const decryptedSymmetricKeyBuffer = await crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP',
        },
        this.keyPair.privateKey,
        encryptedSymmetricKey
      );

      // Import symmetric key
      const symmetricKey = await crypto.subtle.importKey(
        'raw',
        decryptedSymmetricKeyBuffer,
        {
          name: 'AES-GCM',
        },
        false,
        ['decrypt']
      );

      // Decrypt message content
      const decryptedMessageBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        symmetricKey,
        encryptedMessageContent
      );

      return new TextDecoder().decode(decryptedMessageBuffer);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      return null;
    }
  }

  /**
   * Encrypt message for multiple recipients (group chat)
   */
  async encryptMessageForGroup(
    message: string,
    recipientUserIds: string[]
  ): Promise<Map<string, EncryptedMessage>> {
    const encryptedMessages = new Map<string, EncryptedMessage>();

    for (const userId of recipientUserIds) {
      const encrypted = await this.encryptMessage(message, userId);
      if (encrypted) {
        encryptedMessages.set(userId, encrypted);
      }
    }

    return encryptedMessages;
  }

  /**
   * Check if encryption is available and enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.keyPair !== null;
  }

  /**
   * Get list of participants with available keys
   */
  getAvailableParticipants(): string[] {
    return Array.from(this.participantKeys.keys());
  }

  /**
   * Clear all participant keys (when leaving room)
   */
  clearParticipantKeys(): void {
    this.participantKeys.clear();
    console.log('Cleared all participant keys');
  }

  /**
   * Generate RSA key pair for encryption
   */
  private async generateKeyPair(): Promise<EncryptionKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: this.config.keySize,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      false, // Not extractable for security
      ['encrypt', 'decrypt']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    };
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Factory function to create E2E encryption instance
 */
export function createE2EEncryption(config: E2EConfig): E2EEncryption {
  return new E2EEncryption(config);
}
