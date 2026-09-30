import { HttpErrorResponse } from '@angular/common/http';

/**
 * The one error shape components see. Built from the API's RFC 7807 body
 * (`application/problem+json`: `status`, `detail`, and on 400 an `errors` list)
 * or from a transport failure, so no component parses HttpErrorResponse itself.
 */
export class ApiError extends Error {
  constructor(
    /** HTTP status; 0 when the request never got an answer (offline, CORS, DNS). */
    readonly status: number,
    readonly detail: string,
    /** Raw validation messages from a 400, in the API's order. */
    readonly errors: readonly string[] = [],
    /** Seconds to wait before retrying, from a 429's Retry-After. */
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(detail);
    this.name = 'ApiError';
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /**
   * Validation messages grouped by field. The API sends class-validator messages
   * ("password must be longer than or equal to 12 characters"), which name the
   * property first; that leading word is the field. Messages that don't start with
   * a known field stay in `errors` and are shown as a form-level error.
   */
  fieldErrors(fields: readonly string[]): Partial<Record<string, string>> {
    const out: Partial<Record<string, string>> = {};
    for (const message of this.errors) {
      const field = message.split(' ')[0];
      if (fields.includes(field) && !out[field]) out[field] = message;
    }
    return out;
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (!(error instanceof HttpErrorResponse)) {
      return new ApiError(0, error instanceof Error ? error.message : 'Unknown error');
    }
    const body = (error.error ?? {}) as { detail?: unknown; errors?: unknown };
    const detail =
      typeof body.detail === 'string' && body.detail ? body.detail : error.statusText || 'Error';
    const errors = Array.isArray(body.errors) ? body.errors.map(String) : [];
    return new ApiError(error.status, detail, errors, retryAfterOf(error));
  }
}

/**
 * linker-backend names the header per throttler: `Retry-After` for the per-IP
 * limit, `Retry-After-auth-email` / `-auth-user` for the per-email and per-user
 * ones. Whichever blocked the request, the visitor has to wait for the longest.
 * All three are exposed to the portal's origin by the API's CORS config.
 */
const RETRY_AFTER_HEADERS = ['Retry-After', 'Retry-After-auth-email', 'Retry-After-auth-user'];

function retryAfterOf(error: HttpErrorResponse): number | null {
  const seconds = RETRY_AFTER_HEADERS.map((name) => Number(error.headers?.get(name))).filter(
    (value) => Number.isFinite(value) && value > 0,
  );
  return seconds.length ? Math.max(...seconds) : null;
}
