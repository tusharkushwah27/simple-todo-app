/**
 * Rate Limiter for API requests and token usage
 *
 * Tracks requests and estimated tokens in a rolling 60-second window
 * and limits the number of concurrent requests.
 */

export interface RateLimiterConfig {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
  maxConcurrent: number;
}

export const DEFAULT_RATE_LIMITS: RateLimiterConfig = {
  maxRequestsPerMinute: 50,
  maxTokensPerMinute: 100000,
  maxConcurrent: 5,
};

interface RequestRecord {
  timestamp: number;
  tokens: number;
}

export class RateLimiter {
  private config: RateLimiterConfig;
  private requestHistory: RequestRecord[] = [];
  private activeRequests = 0;
  private waitQueue: Array<() => void> = [];

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMITS, ...config };
  }

  async acquire(estimatedTokens: number = 1000): Promise<void> {
    const tokens = Math.max(0, estimatedTokens);

    while (true) {
      if (this.activeRequests < this.config.maxConcurrent) {
        await this.waitForRateLimit(tokens);

        if (this.activeRequests < this.config.maxConcurrent &&
            this.canProceed(tokens)) {
          this.activeRequests += 1;
          this.requestHistory.push({
            timestamp: Date.now(),
            tokens,
          });
          return;
        }
      }

      await this.waitForSlot();
    }
  }

  release(actualTokens?: number): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    if (actualTokens !== undefined && this.requestHistory.length > 0) {
      const lastRequest =
        this.requestHistory[this.requestHistory.length - 1];

      if (lastRequest) {
        lastRequest.tokens = Math.max(0, actualTokens);
      }
    }

    const next = this.waitQueue.shift();

    if (next) {
      next();
    }
  }

  getStatus(): {
    activeRequests: number;
    requestsInWindow: number;
    tokensInWindow: number;
    availableRequests: number;
    availableTokens: number;
  } {
    this.pruneOldRecords();

    const requestsInWindow = this.requestHistory.length;
    const tokensInWindow = this.requestHistory.reduce(
      (sum, record) => sum + record.tokens,
      0
    );

    return {
      activeRequests: this.activeRequests,
      requestsInWindow,
      tokensInWindow,
      availableRequests: Math.max(
        0,
        this.config.maxRequestsPerMinute - requestsInWindow
      ),
      availableTokens: Math.max(
        0,
        this.config.maxTokensPerMinute - tokensInWindow
      ),
    };
  }

  canProceed(estimatedTokens: number = 1000): boolean {
    this.pruneOldRecords();

    const tokens = Math.max(0, estimatedTokens);

    if (this.activeRequests >= this.config.maxConcurrent) {
      return false;
    }

    const requestsInWindow = this.requestHistory.length;

    const tokensInWindow = this.requestHistory.reduce(
      (sum, record) => sum + record.tokens,
      0
    );

    return (
      requestsInWindow < this.config.maxRequestsPerMinute &&
      tokensInWindow + tokens <= this.config.maxTokensPerMinute
    );
  }

  private async waitForSlot(): Promise<void> {
    if (this.activeRequests < this.config.maxConcurrent) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  private async waitForRateLimit(
    estimatedTokens: number
  ): Promise<void> {
    while (!this.canProceed(estimatedTokens)) {
      this.pruneOldRecords();

      if (this.requestHistory.length === 0) {
        break;
      }

      const oldest = this.requestHistory[0];

      if (!oldest) {
        break;
      }

      const expirationTime = oldest.timestamp + 60_000;
      const now = Date.now();

      const calculatedWait = expirationTime - now + 100;
      const waitTime = Math.min(
        5_000,
        Math.max(100, calculatedWait)
      );

      await new Promise<void>((resolve) => {
        setTimeout(resolve, waitTime);
      });
    }
  }

  private pruneOldRecords(): void {
    const cutoff = Date.now() - 60_000;

    this.requestHistory = this.requestHistory.filter(
      (record) => record.timestamp > cutoff
    );
  }
}

export function withRateLimit<T>(
  rateLimiter: RateLimiter,
  fn: () => Promise<T>,
  estimatedTokens: number = 1000
): Promise<T> {
  return (async () => {
    await rateLimiter.acquire(estimatedTokens);

    try {
      return await fn();
    } finally {
      rateLimiter.release();
    }
  })();
}

export const globalRateLimiter = new RateLimiter();
