import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../src/utils/rate-limiter.js';

describe('RateLimiter', () => {
  it('allows requests within configured limits', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 2,
      maxTokensPerMinute: 1000,
      maxConcurrent: 1,
    });

    expect(limiter.canProceed(500)).toBe(true);

    await limiter.acquire(500);

    expect(limiter.getStatus().activeRequests).toBe(1);
    expect(limiter.getStatus().requestsInWindow).toBe(1);
    expect(limiter.getStatus().tokensInWindow).toBe(500);

    limiter.release();
  });

  it('blocks when the concurrent request limit is reached', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 10,
      maxTokensPerMinute: 10000,
      maxConcurrent: 1,
    });

    await limiter.acquire(100);

    expect(limiter.canProceed(100)).toBe(false);

    limiter.release();

    expect(limiter.canProceed(100)).toBe(true);
  });

  it('rejects a request that exceeds the token limit', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 10,
      maxTokensPerMinute: 100,
      maxConcurrent: 2,
    });

    expect(limiter.canProceed(101)).toBe(false);
  });

  it('reports available request and token capacity', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 5,
      maxTokensPerMinute: 1000,
      maxConcurrent: 2,
    });

    await limiter.acquire(250);

    const status = limiter.getStatus();

    expect(status.requestsInWindow).toBe(1);
    expect(status.tokensInWindow).toBe(250);
    expect(status.availableRequests).toBe(4);
    expect(status.availableTokens).toBe(750);

    limiter.release();
  });
});
