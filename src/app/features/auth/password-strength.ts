import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Backend rule (linker-backend `password.constraints.ts`): 12 to 256 characters. */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 256;

/**
 * A strength meter that measures what the backend's policy is built on: length.
 * The API only requires 12+ characters and says why — length resists guessing,
 * character-class rules mostly produce `Password1!` — so the meter rewards length
 * and nudges toward a passphrase rather than punishing a missing symbol.
 */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 {
  if (value.length < PASSWORD_MIN) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((r) => r.test(value)).length;
  if (value.length >= 20 || (value.length >= 16 && variety >= 3)) return 3;
  if (value.length >= 16 || variety >= 3) return 2;
  return 1;
}

@Component({
  selector: 'kit-password-strength',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="meter" [attr.data-level]="level()" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
    <p class="meter__label" aria-live="polite">
      @switch (level()) {
        @case (0) {
          <ng-container i18n="@@password.strength.short"
            >At least {{ min }} characters. A short phrase is easiest to remember.</ng-container
          >
        }
        @case (1) {
          <ng-container i18n="@@password.strength.ok"
            >Long enough. Longer is stronger.</ng-container
          >
        }
        @case (2) {
          <ng-container i18n="@@password.strength.good">Good password.</ng-container>
        }
        @case (3) {
          <ng-container i18n="@@password.strength.strong">Strong password.</ng-container>
        }
      }
    </p>
  `,
  styles: `
    :host {
      display: grid;
      gap: 6px;
    }
    .meter {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
    }
    .meter span {
      height: 4px;
      border-radius: 2px;
      background: var(--border);
      transition: background-color 0.2s;
    }
    .meter[data-level='1'] span:nth-child(-n + 1),
    .meter[data-level='2'] span:nth-child(-n + 2),
    .meter[data-level='3'] span {
      background: var(--accent);
    }
    .meter[data-level='3'] span {
      background: var(--success);
    }
    .meter__label {
      color: var(--ink-3);
      font-size: 0.8125rem;
    }
  `,
})
export class PasswordStrength {
  readonly value = input('');
  protected readonly min = PASSWORD_MIN;
  protected readonly level = computed(() => passwordStrength(this.value()));
}
