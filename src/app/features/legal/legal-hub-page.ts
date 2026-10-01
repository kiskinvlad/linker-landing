import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_IDENTITY } from '../../core/config/app-identity';
import { LEGAL_DOCS, LEGAL_GROUPS, LEGAL_TEXTS_FINAL } from './legal.content';

/**
 * `/legal`: the one page every "Legal" link can point to. Lists the documents from
 * the registry, states the responsibility split the Terms rely on in plain words,
 * and gives the contact for each kind of request (reports, copyright, privacy,
 * security), which also serves as the DSA point of contact.
 */
@Component({
  selector: 'kit-legal-hub-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-hero">
      <div class="container">
        <p class="eyebrow" i18n="@@footer.legal">Legal</p>
        <h1 i18n="@@legal.hub.title">Legal center</h1>
        <p i18n="@@legal.hub.lead">
          Everything that governs {{ identity.productName }}: what you agree to, how we handle data,
          and how to report a problem.
        </p>
      </div>
    </header>

    <section class="section hub">
      <div class="container">
        @if (!final) {
          <p class="hub__notice" role="note" i18n="@@legal.hub.draft">
            These documents are drafts and take effect when {{ identity.productName }} launches.
          </p>
        }

        <h2 class="hub__h2" i18n="@@legal.hub.rolesTitle">Who is responsible for what</h2>
        <div class="hub__roles">
          <div class="hub__card">
            <h3 i18n="@@legal.hub.youTitle">You, the customer</h3>
            <ul>
              <li i18n="@@legal.hub.you1">What your widgets say, offer and sell</li>
              <li i18n="@@legal.hub.you2">The content you upload, and your right to use it</li>
              <li i18n="@@legal.hub.you3">
                What your forms collect, why, and what you tell your visitors
              </li>
              <li i18n="@@legal.hub.you4">
                The advertising, consumer and privacy laws that apply to your business
              </li>
            </ul>
          </div>
          <div class="hub__card">
            <h3 i18n="@@legal.hub.usTitle">Us, the platform</h3>
            <ul>
              <li i18n="@@legal.hub.us1">Running the service securely and reliably</li>
              <li i18n="@@legal.hub.us2">Handling your visitors’ data only on your instructions</li>
              <li i18n="@@legal.hub.us3">Keeping our subprocessor list current</li>
              <li i18n="@@legal.hub.us4">Acting on reports of abusive or infringing widgets</li>
            </ul>
          </div>
        </div>

        @for (group of sections; track group.id) {
          <h2 class="hub__h2">{{ group.title }}</h2>
          <ul class="hub__docs">
            @for (doc of group.docs; track doc.slug) {
              <li>
                <a class="hub__card hub__doc" [routerLink]="['/legal', doc.slug]">
                  <h3>{{ doc.title }}</h3>
                  <p>{{ doc.summary }}</p>
                  <span class="hub__version" i18n="@@legal.hub.version"
                    >Version {{ doc.version }}</span
                  >
                </a>
              </li>
            }
          </ul>
        }

        <h2 class="hub__h2" id="contact" i18n="@@legal.hub.contactTitle">Contact and reports</h2>
        <dl class="hub__contacts">
          <div class="hub__card">
            <dt i18n="@@legal.hub.reportTitle">Report a widget</dt>
            <dd>
              <a [href]="'mailto:' + contacts.abuse">{{ contacts.abuse }}</a>
              <p>
                <ng-container i18n="@@legal.hub.reportText"
                  >Phishing, scams, illegal or harmful content on any site.</ng-container
                >
                <a
                  routerLink="/legal/acceptable-use"
                  fragment="reporting"
                  i18n="@@legal.hub.howToReport"
                  >What to include</a
                >
              </p>
            </dd>
          </div>
          <div class="hub__card">
            <dt i18n="@@legal.hub.copyrightTitle">Copyright and trademarks</dt>
            <dd>
              <a [href]="'mailto:' + contacts.copyright">{{ contacts.copyright }}</a>
              <p>
                <a routerLink="/legal/copyright" fragment="notice" i18n="@@legal.hub.noticeFormat"
                  >Notice requirements</a
                >
              </p>
            </dd>
          </div>
          <div class="hub__card">
            <dt i18n="@@legal.hub.privacyTitle">Privacy requests</dt>
            <dd>
              <a [href]="'mailto:' + contacts.privacy">{{ contacts.privacy }}</a>
              <p i18n="@@legal.hub.privacyText">Access, correction, deletion and other rights.</p>
            </dd>
          </div>
          <div class="hub__card">
            <dt i18n="@@legal.hub.securityTitle">Security</dt>
            <dd>
              <a [href]="'mailto:' + contacts.security">{{ contacts.security }}</a>
              <p i18n="@@legal.hub.securityText">Vulnerabilities and compromised accounts.</p>
            </dd>
          </div>
          <div class="hub__card">
            <dt i18n="@@legal.hub.legalTitle">Legal notices and appeals</dt>
            <dd>
              <a [href]="'mailto:' + contacts.legal">{{ contacts.legal }}</a>
              <p i18n="@@legal.hub.legalText">
                Contract notices, appeals against our decisions, and requests from authorities.
              </p>
            </dd>
          </div>
        </dl>

        <p class="hub__operator" i18n="@@legal.hub.operator">
          {{ identity.productName }} is operated by {{ identity.legal.entity }},
          {{ identity.legal.address }}.
        </p>
      </div>
    </section>
  `,
  styles: `
    .hub {
      padding-top: 0;
    }
    .hub__notice {
      max-width: 720px;
      margin: 0 auto 8px;
      padding: 16px 20px;
      border: 1px solid var(--border);
      border-left: 4px solid var(--spark);
      border-radius: var(--radius-sm);
      background: var(--spark-soft);
      color: var(--ink);
    }
    .hub__h2 {
      margin: 56px 0 20px;
      font-size: 1.5rem;
    }
    .hub__roles,
    .hub__docs,
    .hub__contacts {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .hub__card {
      display: block;
      height: 100%;
      padding: 24px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--ink-2);
    }
    .hub__card h3,
    .hub__card dt {
      margin: 0 0 10px;
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--ink);
    }
    .hub__card ul {
      display: grid;
      gap: 8px;
      margin: 0;
      padding-left: 20px;
    }
    .hub__card dd {
      margin: 0;
    }
    .hub__card dd p {
      margin-top: 8px;
      font-size: 0.9375rem;
    }
    .hub__doc {
      text-decoration: none;
      transition:
        border-color 0.2s var(--ease-out),
        transform 0.2s var(--ease-out);
    }
    .hub__doc:hover,
    .hub__doc:focus-visible {
      border-color: var(--accent);
      transform: translateY(-2px);
    }
    .hub__doc p {
      font-size: 0.9375rem;
    }
    .hub__version {
      display: inline-block;
      margin-top: 14px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--ink-3);
    }
    .hub__operator {
      margin-top: 48px;
      font-size: 0.875rem;
      color: var(--ink-3);
    }
    @media (prefers-reduced-motion: reduce) {
      .hub__doc {
        transition: none;
      }
      .hub__doc:hover,
      .hub__doc:focus-visible {
        transform: none;
      }
    }
  `,
})
export class LegalHubPage {
  protected readonly identity = inject(APP_IDENTITY);
  protected readonly contacts = this.identity.legal.contacts;
  protected readonly final = LEGAL_TEXTS_FINAL;
  protected readonly sections = LEGAL_GROUPS.map((group) => ({
    ...group,
    docs: LEGAL_DOCS.filter((doc) => doc.group === group.id),
  }));
}
