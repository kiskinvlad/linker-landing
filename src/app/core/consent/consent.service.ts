import {
  DOCUMENT,
  Injectable,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  CONSENT_COOKIE,
  CONSENT_LOADERS,
  CONSENT_MAX_AGE_S,
  CONSENT_POLICY_VERSION,
  ConsentRecord,
} from './consent.model';

/**
 * Holds the visitor's cookie choice and applies it (plan §8, observer: loaders
 * react to the `analytics()` signal rather than reading cookies themselves).
 *
 * Browser-only. During prerender nothing is known about the visitor, so the
 * service reports "undecided, analytics off" and the banner stays unrendered; the
 * browser reads the cookie after hydration.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly version = inject(CONSENT_POLICY_VERSION);
  private readonly loaders = inject(CONSENT_LOADERS);

  private readonly record = signal<ConsentRecord | null>(null);
  private readonly settingsRequested = signal(false);
  private readonly ready = signal(false);

  /**
   * Global Privacy Control (navigator.globalPrivacyControl): an opt-out we must
   * honour (CCPA/CPRA). While it's on, analytics stays off whatever was stored,
   * and the banner doesn't ask a question the browser has already answered.
   */
  readonly gpc = signal(false);

  /** Analytics is on only with a current, explicit yes and no GPC signal. */
  readonly analytics = computed(() => !this.gpc() && this.record()?.analytics === true);

  /** The banner shows until a choice exists, and whenever settings are reopened. */
  readonly bannerOpen = computed(
    () => this.ready() && (this.settingsRequested() || (this.record() === null && !this.gpc())),
  );

  /** True when the banner was opened from "Cookie settings", to start in the detailed view. */
  readonly detailed = this.settingsRequested.asReadonly();

  constructor() {
    if (!this.isBrowser) return;

    const nav = this.document.defaultView?.navigator as
      (Navigator & { globalPrivacyControl?: boolean }) | undefined;
    this.gpc.set(nav?.globalPrivacyControl === true);
    this.record.set(this.read());
    this.ready.set(true);

    // Run loaders on every change, including the initial state after a reload.
    let wasOn = false;
    effect(() => {
      const on = this.analytics();
      untracked(() => {
        if (on && !wasOn) this.each((l) => l.grant());
        if (!on && wasOn) this.each((l) => l.revoke());
        wasOn = on;
      });
    });
  }

  acceptAll(): void {
    this.save(true);
  }

  rejectAll(): void {
    this.save(false);
  }

  save(analytics: boolean): void {
    const record: ConsentRecord = { v: this.version, analytics, ts: Date.now() };
    this.write(record);
    this.record.set(record);
    this.settingsRequested.set(false);
  }

  /** Reopen the choices from the footer's "Cookie settings". */
  openSettings(): void {
    this.settingsRequested.set(true);
  }

  /** Close a reopened settings panel without changing anything. */
  closeSettings(): void {
    this.settingsRequested.set(false);
  }

  private each(fn: (loader: (typeof this.loaders)[number]) => void): void {
    for (const loader of this.loaders) {
      if (loader.category === 'analytics') fn(loader);
    }
  }

  private read(): ConsentRecord | null {
    const raw = this.document.cookie.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]*)`))?.[1];
    if (!raw) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentRecord>;
      // A choice made under an older policy, or a malformed cookie, counts as no choice.
      if (parsed.v !== this.version || typeof parsed.analytics !== 'boolean') return null;
      return { v: parsed.v, analytics: parsed.analytics, ts: Number(parsed.ts) || 0 };
    } catch {
      return null;
    }
  }

  private write(record: ConsentRecord): void {
    const secure = this.document.location?.protocol === 'https:' ? '; Secure' : '';
    this.document.cookie =
      `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(record))}; Path=/; ` +
      `Max-Age=${CONSENT_MAX_AGE_S}; SameSite=Lax${secure}`;
  }
}
