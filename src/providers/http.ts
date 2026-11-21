import type { z } from 'zod';

// The provider answered with a non-2xx status. The market-data service reads `status` to
// detect HTTP 451 and fall back to the other provider (ADR 0004).
export class ProviderHttpError extends Error {
  override readonly name = 'ProviderHttpError';
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`HTTP ${status} from ${url}`);
  }
}

// The provider answered, but the response does not match what the adapter expects.
export class ProviderDataError extends Error {
  override readonly name = 'ProviderDataError';
}

export type Fetch = typeof fetch;

export async function getJson<T>(
  fetchFn: Fetch,
  url: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetchFn(url, signal ? { signal } : {});
  if (!response.ok) throw new ProviderHttpError(url, response.status);
  const body: unknown = await response.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ProviderDataError(`Unexpected response from ${url}: ${parsed.error.message}`);
  }
  return parsed.data;
}
