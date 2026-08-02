/**
 * Property-based tests for retry logic with exponential backoff
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RetryManager } from './retry-logic';

describe('RetryManager Property-Based Tests', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Retry Behavior', () => {
    it('should fail after maximum attempts', async () => {
      retryManager = new RetryManager(3, 1, 10); // Very short delays for testing

      let attempts = 0;
      const failingOperation = () => {
        attempts++;
        throw new Error(`Attempt ${attempts} failed`);
      };

      await expect(retryManager.retry(failingOperation)).rejects.toThrow(
        'Operation failed after 3 attempts'
      );
      // With maxAttempts=3, it tries: initial + 3 retries = 4 total attempts
      expect(attempts).toBe(4);
    });

    it('should respect maximum delay limits', () => {
      const maxDelay = 1000;
      retryManager = new RetryManager(5, 100, maxDelay);

      // Test delay calculation directly
      const calculateDelay = (retryManager as any).calculateDelay.bind(retryManager);

      // Set high attempt count to test max delay
      (retryManager as any).attempts = 10;
      const delay = calculateDelay();

      expect(delay).toBeLessThanOrEqual(maxDelay * 1.1); // Account for jitter
    });

    it('should succeed on eventual success', async () => {
      retryManager = new RetryManager(5, 1, 10); // Very short delays

      let attempts = 0;
      const eventuallySuccessfulOperation = () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return `Success on attempt ${attempts}`;
      };

      const result = await retryManager.retry(eventuallySuccessfulOperation);
      expect(result).toBe('Success on attempt 3');
      expect(attempts).toBe(3);
    });
  });

  describe('State Management', () => {
    it('should track attempt counts correctly', () => {
      retryManager = new RetryManager(3, 100, 5000);

      expect(retryManager.currentAttempts).toBe(0);
      expect(retryManager.hasReachedMaxAttempts).toBe(false);

      // Manually increment attempts to test state tracking
      (retryManager as any).attempts = 1;
      expect(retryManager.currentAttempts).toBe(1);
      expect(retryManager.hasReachedMaxAttempts).toBe(false);

      (retryManager as any).attempts = 3;
      expect(retryManager.currentAttempts).toBe(3);
      expect(retryManager.hasReachedMaxAttempts).toBe(true);
    });

    it('should reset state after successful operation', async () => {
      retryManager = new RetryManager(3, 1, 10); // Very short delays

      let attempts = 0;
      const operation = () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Fail');
        }
        return 'Success';
      };

      const result = await retryManager.retry(operation);
      expect(result).toBe('Success');

      // State should be reset
      expect(retryManager.currentAttempts).toBe(0);
      expect(retryManager.hasReachedMaxAttempts).toBe(false);
    });

    it('should handle cancellation properly', () => {
      retryManager = new RetryManager(5, 100, 5000);

      // Start a scheduled retry
      retryManager.scheduleRetry(
        () => {
          throw new Error('Should not execute');
        },
        () => {},
        () => {}
      );

      // Cancel should reset state
      retryManager.cancel();

      expect(retryManager.currentAttempts).toBe(0);
      expect(retryManager.hasReachedMaxAttempts).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle synchronous operations', async () => {
      retryManager = new RetryManager(2, 1, 10);

      const syncOperation = () => 'Immediate success';

      const result = await retryManager.retry(syncOperation);
      expect(result).toBe('Immediate success');
      expect(retryManager.currentAttempts).toBe(0);
    });

    it('should handle async operations', async () => {
      retryManager = new RetryManager(3, 1, 10);

      let attempts = 0;
      const asyncOperation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Async fail');
        }
        return 'Async success';
      };

      const result = await retryManager.retry(asyncOperation);
      expect(result).toBe('Async success');
      expect(attempts).toBe(2);
    });

    it('should handle zero max attempts', async () => {
      retryManager = new RetryManager(0, 1, 10);

      const operation = () => {
        throw new Error('Should fail immediately');
      };

      await expect(retryManager.retry(operation)).rejects.toThrow(
        'Operation failed after 0 attempts'
      );
    });

    it('should calculate exponential backoff correctly', () => {
      retryManager = new RetryManager(5, 100, 10000);

      const calculateDelay = (retryManager as any).calculateDelay.bind(retryManager);

      // Test exponential growth
      (retryManager as any).attempts = 1;
      const delay1 = calculateDelay();

      (retryManager as any).attempts = 2;
      const delay2 = calculateDelay();

      (retryManager as any).attempts = 3;
      const delay3 = calculateDelay();

      // Each delay should be roughly double the previous (accounting for jitter)
      expect(delay2).toBeGreaterThan(delay1 * 1.5);
      expect(delay3).toBeGreaterThan(delay2 * 1.5);
    });
  });
});
