/**
 * How a feature key from linker-backend's `FEATURE_KEYS` registry reads to a
 * person (plan §10a): the "unlocked by your ideas" list in the account and the
 * feature an idea is linked to on /feedback. A key the portal doesn't know yet
 * falls back to a readable form of the key, so a feature shipped by the backend
 * first still shows up rather than vanishing.
 */
const FEATURE_NAMES: Record<string, string> = {
  ai_assistant: $localize`:@@feature.aiAssistant:AI assistant`,
  analytics: $localize`:@@feature.analytics:Analytics`,
  custom_branding: $localize`:@@feature.customBranding:Custom branding`,
  priority_support: $localize`:@@feature.prioritySupport:Priority support`,
};

export function featureName(key: string): string {
  const name = FEATURE_NAMES[key];
  if (name) return name;
  const words = key.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
