import { ApiError } from '../../core/api/api-error';

/**
 * User-facing text for failures every auth form shares. The API's own `detail`
 * strings are English and written for developers, so they are never shown as-is.
 */
export function describeError(error: unknown): string {
  const e = ApiError.from(error);
  if (e.isRateLimited) {
    const minutes = e.retryAfterSeconds ? Math.max(1, Math.ceil(e.retryAfterSeconds / 60)) : null;
    return minutes
      ? $localize`:@@auth.error.rateLimitedFor:Too many attempts. Try again in ${minutes}:minutes: min.`
      : $localize`:@@auth.error.rateLimited:Too many attempts. Please wait a few minutes and try again.`;
  }
  if (e.isNetwork || e.status >= 500) {
    return $localize`:@@auth.error.unavailable:We can’t reach the service right now. Please try again in a moment.`;
  }
  return $localize`:@@auth.error.generic:Something went wrong. Please check the form and try again.`;
}

/**
 * Validation messages from a 400 mapped to the form's fields, translated. The API
 * sends class-validator English ("email must be an email"); the field name is all
 * we keep, and the message comes from here.
 */
export function fieldMessages(
  error: unknown,
  fields: readonly string[],
): Partial<Record<string, string>> {
  const e = ApiError.from(error);
  if (e.status !== 400) return {};
  const out: Partial<Record<string, string>> = {};
  for (const field of Object.keys(e.fieldErrors(fields))) {
    out[field] = FIELD_MESSAGES[field] ?? $localize`:@@auth.error.field:Please check this field.`;
  }
  return out;
}

const FIELD_MESSAGES: Record<string, string> = {
  email: $localize`:@@auth.error.email:Enter a valid email address.`,
  password: $localize`:@@auth.error.passwordLength:Use 12 to 256 characters.`,
  firstName: $localize`:@@auth.error.firstName:Enter your first name (up to 100 characters).`,
  lastName: $localize`:@@auth.error.lastName:Enter your last name (up to 100 characters).`,
  company: $localize`:@@auth.error.company:Up to 200 characters.`,
};
