import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApiError } from './api-error';

const problem = (status: number, body: object, headers?: Record<string, string>) =>
  new HttpErrorResponse({ status, error: body, headers: new HttpHeaders(headers) });

describe('ApiError.from', () => {
  it('reads an RFC 7807 body from the API', () => {
    const e = ApiError.from(
      problem(400, {
        status: 400,
        detail: 'Bad Request',
        errors: [
          'password must be longer than or equal to 12 characters',
          'email must be an email',
        ],
      }),
    );
    expect(e.status).toBe(400);
    expect(e.detail).toBe('Bad Request');
    expect(e.fieldErrors(['email', 'password'])).toEqual({
      password: 'password must be longer than or equal to 12 characters',
      email: 'email must be an email',
    });
  });

  it('ignores messages that name no known field', () => {
    const e = ApiError.from(problem(400, { errors: ['property junk should not exist'] }));
    expect(e.fieldErrors(['email'])).toEqual({});
    expect(e.errors).toEqual(['property junk should not exist']);
  });

  it('reads Retry-After on a 429', () => {
    const e = ApiError.from(
      problem(429, { detail: 'Too Many Requests' }, { 'Retry-After': '240' }),
    );
    expect(e.isRateLimited).toBe(true);
    expect(e.retryAfterSeconds).toBe(240);
  });

  it('treats a request that never got an answer as a network error', () => {
    const e = ApiError.from(new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }));
    expect(e.isNetwork).toBe(true);
  });

  it('passes an ApiError through untouched', () => {
    const original = new ApiError(409, 'Conflict');
    expect(ApiError.from(original)).toBe(original);
  });
});
