# Legal center: implementation and launch plan

Companion to [`portal-plan.md`](portal-plan.md) §8, §9, §9a and §10a. The portal
now ships the documents; this file covers how they are maintained, the backend and
editor controls the texts promise, and what only the operator can do before launch.

> Not legal advice. The texts were drafted to match how the platform actually works,
> with no lawyer review (§9a). The riskiest sections are marked **[review]** below;
> a one-off review of those before paid plans launch is the cheapest insurance.

---

## 1. What the portal has

| Route | Document | Who it binds |
|---|---|---|
| `/legal` | Legal center: all documents, the responsibility split, contacts | — |
| `/legal/terms` | Terms of Service **[review: §16 indemnity, §18 liability, §20 law]** | Customer |
| `/legal/dpa` | Data Processing Agreement, SCCs by reference **[review: §7]** | Customer (as controller) |
| `/legal/privacy` | Privacy Policy | Customers and site visitors (we are controller) |
| `/legal/cookies` | Cookie Policy, incl. what widgets store on customers' sites | Everyone |
| `/legal/acceptable-use` | Prohibited and restricted uses, enforcement, appeals, `#reporting` | Customer; reporting open to anyone |
| `/legal/copyright` | DMCA-style notice and counter-notice, repeat infringers | Rights holders, customers |
| `/legal/feedback-program` | Rules from §10a | Customer |
| `/legal/subprocessors` | DPA Annex III | Customer |

An SLA is deliberately absent: the Terms (§14) promise no uptime. Write one only
when an enterprise customer asks, as a separate signed document.

**How it is built** (`src/app/features/legal/`):

- `legal.content.ts`: the **registry**. One entry per document (slug, title, summary,
  group, version, lazy `load`). Routes, the hub, SEO and "other documents" all read
  it, so adding a document is one entry plus one Markdown file.
- `docs/*.md`: the texts. Bundled as strings by the `.md` loader in `angular.json` and
  imported lazily: each is its own chunk.
- `legal-doc.resolver.ts`: loads and renders before the route activates, so the
  **prerendered HTML contains the full text**. It fills `{{placeholders}}` from
  `APP_IDENTITY.legal` (`legalPlaceholders` lists the allowed names; an unknown name
  fails the build rather than publishing braces).
- `legal-markdown.ts`: a small escaping Markdown renderer for exactly the subset
  the texts use (headings with `{#anchor}`, lists, tables, bold, code, links,
  emails). No dependency ships to visitors. Links may only be `/paths`, `#anchors`,
  `https:` or `mailto:`, which is what makes `bypassSecurityTrustHtml` safe.
- `LEGAL_TEXTS_FINAL = false`: every legal page shows a draft notice and is `noindex`.
  Flip it at M8 with the real contacts.
- Texts are English in every language build; the Ukrainian build shows a notice that
  the English version is binding. Titles, summaries and the page frame are translated.

### Changing a document

1. Edit `docs/<slug>.md`.
2. If the change is more than a typo, set the entry's `version` to the new effective
   date in `legal.content.ts`.
3. **Terms only:** also bump `LEGAL_TERMS_VERSION` and the backend's
   `LEGAL_TERMS_VERSION` env var to the same value. Every user is asked to accept
   again on their next editor visit (§9).
4. **Material changes** (Terms, DPA, Privacy): email account owners at least 30 days
   before the effective date, as the Terms promise. **New subprocessor:** update
   `/legal/subprocessors` and email account owners 30 days before it gets data.
5. Keep old versions retrievable: the git history is the archive; the Terms promise
   previous versions "on request".

---

## 2. Backend (linker-backend)

The documents make promises the platform must keep. In priority order:

### 2.1 Terms acceptance: as §9 already specifies

`user_consents` with `(document, version, accepted_at, ip_hash, user_agent)`,
`legal` block in `/auth/me`, `POST /users/me/consents`. Nothing to add, except: keep
`LEGAL_TERMS_VERSION` in the Zod env schema and fail startup if it is missing.

### 2.2 Widget kill switch (Terms §8, AUP §4): **required before launch** (decided)

Keep moderation separate from the customer's own publish state, so neither can
overwrite the other:

```ts
// widgets table, new columns
moderation_status: 'active' | 'disabled';   // default 'active'; only admins change it
moderation_reason: ModerationReason | null; // 'phishing' | 'malware' | 'fraud' | 'illegal_content'
                                            // | 'ip_infringement' | 'privacy' | 'other'

// new table: moderation_actions (append-only audit log = our statements of reasons)
id, widget_id fk, user_id fk, action ('disable' | 'enable' | 'suspend_account' | 'restore_account'),
reason ModerationReason, statement text,   // what we tell the customer
source ('report' | 'copyright_notice' | 'own_initiative' | 'authority'),
report_ref text null, actor text, created_at
```

- **Delivery path** checks `moderation_status` alongside publish state. A disabled
  widget answers like an unpublished one (the embed script renders nothing and never
  breaks the host page). Keep the delivery response's cache TTL short (e.g. 60 s)
  and issue a CloudFront invalidation for the widget's config path on disable, so a
  phishing widget goes dark in about a minute, not at cache expiry.
- **Chain of responsibility** for delivery: `PublishedCheck → ModerationCheck →
  AccountStatusCheck → QuotaCheck`: each can short-circuit with "don't render". A
  suspended account disables all its widgets without touching each row.
- **Admin CLI** (the `nest-commander` entry point §10a introduces):
  `widgets:disable <id> --reason phishing --statement "…"`, `widgets:enable <id>`,
  `accounts:suspend <userId>`, `accounts:restore <userId>`. Each writes a
  `moderation_actions` row and emails the customer the statement of reasons (with
  "reply to appeal") through `MailerPort`. Use a **Command** object per action so
  the audit write and the email happen in one place.
- The editor shows a disabled widget with its reason and "Contact us to appeal".

### 2.3 Publish attestations (Terms §6): **required before launch** (decided: first publish only)

```ts
// new table: publish_attestations
id, user_id fk, widget_id fk, attestation_version text, accepted_at, ip_hash, user_agent
```

- `POST /widgets/:id/publish` requires, in the DTO, `attestation: { version, contentRights: true,
  claimsAccurate: true, lawsResponsibility: true }`, validated with `@Equals(true)` on
  each flag and `version === PUBLISH_ATTESTATION_VERSION`.
- Required on a widget's **first** publish and whenever `PUBLISH_ATTESTATION_VERSION`
  changes; later re-publishes of the same widget don't ask again (the editor sends
  nothing, the service checks for an existing row). Friction where it carries weight,
  none on every tweak.

### 2.4 Widget actions and messaging (Terms §6, AUP §1, DPA Annex I)

What widgets do beyond rendering: report events (view, click, close, submit),
forward what visitors type to destinations the customer configures (their own
email or phone, a webhook, a connected tool), and later send email or SMS to the
visitor. Everything below keeps the documents true and the service out of abuse
lists.

- **Execute actions on the server, never from the visitor's browser.** The widget
  posts to our API; a worker performs the action. This keeps customers' webhook
  URLs and API keys out of public page source, lets the kill switch and rate
  limits apply, and gives one audit point. Model each destination as a
  **Strategy** (`EmailAction`, `WebhookAction`, `SmsAction`, …) behind one
  `WidgetActionPort`, dispatched from a queue (Redis/BullMQ) with retries.
- **Analytics events carry no visitor identifier** (the Cookie Policy promises
  this). Keep the payload to `widgetId`, event type, timestamp, page URL and a
  coarse country derived from the IP, then drop the IP. Unique-visitor counts
  would need an ID in localStorage, which likely needs consent on EU sites: a
  policy change, not just a code change.
- **Webhooks: block SSRF.** Resolve the host and refuse private, loopback,
  link-local and cloud-metadata addresses (`169.254.169.254`) at send time, not
  only at save time (DNS can change). HTTPS only, short timeout, no redirects to
  other hosts, response body discarded. Sign each request (HMAC header) so
  customers can verify it came from us.
- **Messages to visitors:**
  - a **consent checkbox field** the customer must add to any form that triggers
    a marketing message, with the consent text stored next to the submission;
  - every email carries the customer's name as sender and an unsubscribe link;
    every SMS says who it is from and honours `STOP`; keep a per-customer
    suppression list and check it before each send;
  - US SMS requires sender registration (A2P 10DLC or toll-free verification)
    through the SMS provider; plan for it before offering SMS to US customers;
  - SMS pumping defence: per-widget and per-IP rate limits, a country allowlist
    the customer sets, block premium-rate prefixes, and a daily spend cap;
  - message logs (recipient, template, status) kept 90 days, as the DPA says.
- **New providers** (SMS, or a separate email provider for visitor messages) go
  on `/legal/subprocessors` 30 days before they get data.

### 2.5 Data rights and retention (Privacy §6, §8; DPA §9)

- `DELETE /users/me` (planned, §10): soft delete now; a **scheduled purge** job
  hard-deletes accounts, widgets, uploads and form submissions 30 days after
  `deleted_at`. Without the job, the "within 30 days" promise is false.
- `GET /users/me/export`: JSON of profile, widgets and consents (portability,
  GDPR Art. 20). Can be a CLI command answered by email at first.
- Customers can **export and delete form submissions** per widget (DPA §9, §3):
  they are controllers and must be able to answer their visitors' requests.
- Application logs: 90-day retention (CloudWatch log group retention setting).
- `ip_hash` everywhere: HMAC-SHA256 with a server-side secret, not a plain hash
  (IPv4 space is small enough to brute-force an unsalted hash).

### 2.6 Abuse and copyright intake

Email only at launch (`abuse@`, `copyright@`): it meets the DSA notice-and-action
requirement for a service our size and has no attack surface. Log each report and
its outcome in `moderation_actions.report_ref`. A public `POST /abuse-reports` form
(throttled, captcha-free honeypot) can come later if volume justifies it.

---

## 3. Editor (linker-editor)

- **TermsGate** (§9): unchanged; link the dialog's text to `/legal/terms` and show
  the version from `/auth/me`.
- **Publish dialog** (§2.3, first publish of each widget): three unticked checkboxes with the texts below, Publish
  disabled until all are ticked, links to Terms and AUP.
  1. I have the rights to all content used in this widget.
  2. The claims, offers and promotions in this widget are accurate and lawful.
  3. I am responsible for complying with privacy, advertising and consumer-protection
     laws where this widget is shown.
- **Widget runtime contract** (Cookie Policy §3, DPA Annex I): the embed script
  **sets no cookies, uses no fingerprinting**, stores only `kit_`-prefixed
  `localStorage` keys for display rules, and a per-widget **"Remember visitors"**
  toggle turns that storage off. Statistics events carry no visitor identifier;
  the backend derives a coarse country from the IP and drops the IP. These are
  promises in published policies: a code review checklist item for the SDK.
- **Form builder** (AUP §1 "Privacy violations"):
  - no field types for passwords, card numbers or government IDs;
  - a required **"Your privacy policy URL"** setting on any widget with a form,
    rendered as a link under the submit button: it puts the controller's notice in
    front of the visitor, which is the customer's legal duty and our best evidence
    that we are only the processor.

---

## 4. Operator checklist before launch (M7 and M8)

Things no code can do. Items marked ★ are legally required once you have EU users.

- [ ] **Legal form** (§15 Q3): individual or ФОП. Put the exact name into
      `APP_IDENTITY.legal.entity`, and a **full postal address** into `address`
      (GDPR Art. 13 and DMCA notices need one; a PO box or virtual office is fine).
- [ ] **Mailboxes** (M8): `legal@`, `privacy@`, `abuse@`, `copyright@`, `security@`
      on the Kitlet domain. They can all forward to one inbox; separate addresses
      let you filter and prove when a notice arrived.
- [ ] ★ **EU representative** (GDPR Art. 27) and **UK representative**: a
      representative service covers both for a yearly fee; put the names into
      `euRepresentative` / `ukRepresentative`.
- [ ] ★ **DSA legal representative** (Art. 13): a non-EU intermediary service
      offered in the EU needs one. Many GDPR-representative services also offer
      DSA representation; confirm when you buy.
- [ ] **DMCA designated agent**: register online with the US Copyright Office
      (small fee, renew every 3 years), using the `copyright@` address. Without it,
      the US safe harbour doesn't apply.
- [ ] **AWS region** (§15 Q4): confirm `eu-central-1`; if not, change
      `dataRegion` and the transfer paragraphs.
- [ ] **Google Analytics**: set data retention to **14 months** (the Privacy Policy
      says so); keep Google signals and ads features off.
- [ ] **Payment processor** (before paid plans): add it to `/legal/subprocessors`
      30 days ahead, and prefer a merchant of record (they collect sales tax and VAT
      worldwide, which a Ukrainian operator selling to US and EU businesses otherwise
      has to handle alone). Check which processors onboard Ukrainian sellers.
- [ ] Set every document's `version` to the launch date, flip
      `LEGAL_TERMS_VERSION` on both sides, and set `LEGAL_TEXTS_FINAL = true`.
- [ ] **[review]** A lawyer pass over Terms §16–20 and DPA §7 before paid plans or
      the first enterprise customer (§9a already flags this as the biggest risk).
