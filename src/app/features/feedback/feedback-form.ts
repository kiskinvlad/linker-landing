import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import {
  FEEDBACK_AREAS,
  FEEDBACK_BODY_MAX,
  FEEDBACK_BODY_MIN,
  FEEDBACK_KINDS,
  FEEDBACK_LIMIT,
  FEEDBACK_TITLE_MAX,
  FEEDBACK_TITLE_MIN,
  FeedbackArea,
  FeedbackItem,
  FeedbackKind,
} from '../../core/api/feedback.api';
import { FeedbackFacade } from '../../core/feedback/feedback.facade';
import { describeError } from '../auth/auth-messages';
import { AREA_LABELS, KIND_LABELS } from './feedback.content';

/**
 * The /feedback form (plan §10a): kind, area, title, description, contact
 * consent. Shown only to a signed-in, verified account; the API checks both
 * again. Emits the created idea so the page can put it at the top of the list.
 */
@Component({
  selector: 'kit-feedback-form',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="panel__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (sent()) {
        <p class="notice notice--success" role="status" i18n="@@feedback.form.sent">
          Thank you! We’ve got your idea. You’ll find it under “Your ideas” and we’ll email you when
          its status changes.
        </p>
      }
      @if (error()) {
        <p class="notice notice--error" role="alert">{{ error() }}</p>
      }

      <fieldset class="field kinds">
        <legend class="field__label" i18n="@@feedback.form.kind">What is it?</legend>
        <div class="kinds__options">
          @for (kind of kinds; track kind) {
            <label class="kinds__option">
              <input type="radio" formControlName="kind" [value]="kind" />
              <span>{{ kindLabels[kind] }}</span>
            </label>
          }
        </div>
      </fieldset>

      <div class="field">
        <label class="field__label" for="feedback-area" i18n="@@feedback.form.area"
          >Which part of the product?</label
        >
        <select id="feedback-area" formControlName="area">
          @for (area of areas; track area) {
            <option [value]="area">{{ areaLabels[area] }}</option>
          }
        </select>
      </div>

      <div class="field">
        <label class="field__label" for="feedback-title" i18n="@@feedback.form.title">Title</label>
        <input
          id="feedback-title"
          type="text"
          formControlName="title"
          [attr.maxlength]="titleMax"
          [attr.aria-invalid]="showError('title')"
          aria-describedby="feedback-title-hint"
        />
        @if (showError('title')) {
          <p class="field__error" i18n="@@feedback.form.titleError">
            Use {{ titleMin }} to {{ titleMax }} characters.
          </p>
        } @else {
          <p id="feedback-title-hint" class="field__hint" i18n="@@feedback.form.titleHint">
            One line, e.g. “Countdown timer on popups”.
          </p>
        }
      </div>

      <div class="field">
        <label class="field__label" for="feedback-body">
          <ng-container i18n="@@feedback.form.body">Describe it</ng-container>
          <span class="field__optional">{{ bodyLength() }} / {{ bodyMax }}</span>
        </label>
        <textarea
          id="feedback-body"
          rows="6"
          formControlName="body"
          [attr.maxlength]="bodyMax"
          [attr.aria-invalid]="showError('body')"
          aria-describedby="feedback-body-hint"
        ></textarea>
        @if (showError('body')) {
          <p class="field__error" i18n="@@feedback.form.bodyError">
            Tell us a little more: at least {{ bodyMin }} characters.
          </p>
        } @else {
          <p id="feedback-body-hint" class="field__hint" i18n="@@feedback.form.bodyHint">
            What would you like to do, and what would it change for your store? Please don’t include
            other people’s personal data or anything confidential.
          </p>
        }
      </div>

      <label class="consent-check">
        <input type="checkbox" formControlName="contactOk" />
        <span i18n="@@feedback.form.contactOk"
          >You may email me with questions about this idea.</span
        >
      </label>

      <p class="field__hint" i18n="@@feedback.form.licence">
        By sending it you agree to the
        <a routerLink="/legal/feedback-program">Feedback Program rules</a>, including the licence to
        use your idea.
      </p>

      <div class="panel__actions">
        <button class="btn btn--primary" type="submit" [disabled]="busy()">
          @if (busy()) {
            <ng-container i18n="@@feedback.form.sending">Sending…</ng-container>
          } @else {
            <ng-container i18n="@@feedback.form.submit">Send idea</ng-container>
          }
        </button>
      </div>
    </form>
  `,
  styles: `
    .kinds {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }
    .kinds__options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .kinds__option {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 8px 14px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-pill);
      background: var(--bg);
      color: var(--ink);
      cursor: pointer;
    }
    .kinds__option:has(input:checked) {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .kinds__option:has(input:focus-visible) {
      outline: 3px solid var(--accent);
      outline-offset: 2px;
    }
    /* Undo the global .field input box: these are radio buttons, not text fields. */
    .kinds__option input {
      width: 16px;
      height: 16px;
      min-height: 0;
      margin: 0;
      padding: 0;
      flex: none;
      box-shadow: none;
      accent-color: var(--accent);
    }
    .kinds__option span {
      white-space: nowrap;
    }
    .consent-check {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      color: var(--ink);
      font-size: 0.9375rem;
      cursor: pointer;
    }
    .consent-check input {
      width: 18px;
      height: 18px;
      margin-top: 2px;
      flex: none;
      accent-color: var(--accent);
    }
  `,
})
export class FeedbackForm {
  private readonly feedback = inject(FeedbackFacade);

  readonly created = output<FeedbackItem>();

  protected readonly kinds = FEEDBACK_KINDS;
  protected readonly areas = FEEDBACK_AREAS;
  protected readonly kindLabels = KIND_LABELS;
  protected readonly areaLabels = AREA_LABELS;
  protected readonly titleMin = FEEDBACK_TITLE_MIN;
  protected readonly titleMax = FEEDBACK_TITLE_MAX;
  protected readonly bodyMin = FEEDBACK_BODY_MIN;
  protected readonly bodyMax = FEEDBACK_BODY_MAX;

  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly submitted = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    kind: ['feature' as FeedbackKind, Validators.required],
    area: ['editor' as FeedbackArea, Validators.required],
    title: [
      '',
      [
        Validators.required,
        Validators.minLength(FEEDBACK_TITLE_MIN),
        Validators.maxLength(FEEDBACK_TITLE_MAX),
      ],
    ],
    body: [
      '',
      [
        Validators.required,
        Validators.minLength(FEEDBACK_BODY_MIN),
        Validators.maxLength(FEEDBACK_BODY_MAX),
      ],
    ],
    contactOk: [false],
  });

  private readonly body = toSignal(this.form.controls.body.valueChanges, { initialValue: '' });
  protected readonly bodyLength = computed(() => this.body().length);

  protected showError(name: 'title' | 'body'): boolean {
    const c = this.form.controls[name];
    // The API trims; a title of spaces is as empty there as it is here.
    const blank =
      c.value.trim().length < (name === 'title' ? FEEDBACK_TITLE_MIN : FEEDBACK_BODY_MIN);
    return (c.invalid || blank) && (c.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    this.sent.set(false);
    if (this.form.invalid || this.showError('title') || this.showError('body')) return;
    this.busy.set(true);
    const value = this.form.getRawValue();
    try {
      const item = await this.feedback.submit({
        ...value,
        title: value.title.trim(),
        body: value.body.trim(),
      });
      this.form.reset();
      this.submitted.set(false);
      this.sent.set(true);
      this.created.emit(item);
    } catch (e) {
      this.error.set(describeFeedbackError(e));
    } finally {
      this.busy.set(false);
    }
  }
}

function describeFeedbackError(error: unknown): string {
  const e = ApiError.from(error);
  if (e.status === 429 && e.code === FEEDBACK_LIMIT) {
    return $localize`:@@feedback.form.limit:You’ve sent five ideas in the last 24 hours. Thank you! Please send the next one tomorrow.`;
  }
  if (e.status === 403) {
    return $localize`:@@feedback.form.unverified:Confirm your email address before sending ideas.`;
  }
  return describeError(e);
}
