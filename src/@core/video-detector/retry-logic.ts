/**
 * Retry logic with exponential backoff for video detection
 */

export class RetryManager {
  private attempts: number = 0;
  private readonly maxAttempts: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private timeoutId: number | null = null;

  constructor(maxAttempts: number = 5, baseDelay: number = 1000, maxDelay: number = 30000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  async retry<T>(operation: () => Promise<T> | T): Promise<T> {
    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      if (this.attempts >= this.maxAttempts) {
        this.reset();
        throw new Error(`Operation failed after ${this.maxAttempts} attempts: ${error}`);
      }

      this.attempts++;
      const delay = this.calculateDelay();

      console.log(`Retry attempt ${this.attempts}/${this.maxAttempts} in ${delay}ms`);

      await this.sleep(delay);
      return this.retry(operation);
    }
  }

  retryWithCallback<T>(
    operation: () => Promise<T> | T,
    onSuccess: (result: T) => void,
    onError: (error: Error) => void
  ): void {
    this.retry(operation).then(onSuccess).catch(onError);
  }

  scheduleRetry<T>(
    operation: () => Promise<T> | T,
    onSuccess: (result: T) => void,
    onError: (error: Error) => void
  ): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    const delay = this.calculateDelay();
    this.attempts++;

    if (this.attempts > this.maxAttempts) {
      onError(new Error(`Operation failed after ${this.maxAttempts} attempts`));
      this.reset();
      return;
    }

    this.timeoutId = window.setTimeout(async () => {
      try {
        const result = await operation();
        this.reset();
        onSuccess(result);
      } catch {
        this.scheduleRetry(operation, onSuccess, onError);
      }
    }, delay);
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.reset();
  }

  private calculateDelay(): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, this.attempts - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, this.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private reset(): void {
    this.attempts = 0;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  get currentAttempts(): number {
    return this.attempts;
  }

  get hasReachedMaxAttempts(): boolean {
    return this.attempts >= this.maxAttempts;
  }
}
