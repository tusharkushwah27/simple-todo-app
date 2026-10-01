import { describe, expect, it } from 'vitest';
import {
  ErrorCodes,
  ReviewError,
  withRetry,
  withTimeout,
} from '../src/utils/error-handler.js';

describe('Error handling utilities', () => {
  it('retries a failed operation and eventually succeeds', async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts++;

        if (attempts < 3) {
          throw new Error('temporary failure');
        }

        return 'success';
      },
      3,
      1
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('throws RETRY_EXHAUSTED after retries are exhausted', async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error('permanent failure');
        },
        2,
        1
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.RETRY_EXHAUSTED,
    });
  });

  it('returns before the timeout when the operation is fast enough', async () => {
    const result = await withTimeout(
      async () => 'completed',
      100
    );

    expect(result).toBe('completed');
  });

  it('throws AGENT_TIMEOUT when the operation takes too long', async () => {
    await expect(
      withTimeout(
        async () =>
          new Promise((resolve) =>
            setTimeout(resolve, 100)
          ),
        10
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.AGENT_TIMEOUT,
    });
  });

  it('creates a ReviewError with the correct code', () => {
    const error = new ReviewError(
      'test error',
      ErrorCodes.UNKNOWN_ERROR
    );

    expect(error).toBeInstanceOf(ReviewError);
    expect(error.code).toBe(ErrorCodes.UNKNOWN_ERROR);
  });
});
