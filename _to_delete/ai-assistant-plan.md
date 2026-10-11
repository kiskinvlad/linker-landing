# AI assistant: implementation plan

Status: **draft v1** · 2026-10-11

Companion to [`portal-plan.md`](portal-plan.md) (§10a feature keys, plan limits),
[`legal-plan.md`](legal-plan.md) (publish attestations, acceptable use) and
[`analytics-plan.md`](analytics-plan.md) (campaigns, later AI insights). This file
is the spec for the AI assistant that creates and edits widgets from a text prompt,
across **linker-backend** (LLM integration, credits, API), **linker-editor** (the
create flow and assistant panel) and **linker-landing** (pricing, account usage,
legal texts).

> **Prerequisite:** the element registry and presets
> ([`element-registry-plan.md`](element-registry-plan.md), milestones R-1 to R-3).
> The assistant can only produce what the widget schema can describe, so it is built
> after them.

---

## 1. Locked decisions

| # | Decision |
|---|---|
| AI1 | **Paid plans only.** Feature key `ai_assistant`; no free trial quota. |
| AI2 | **The model returns widget settings, never HTML, CSS or JavaScript.** Output is validated strictly against the widget definition JSON Schema (`@kiskinvlad/kitlet-widget-schema`, Ajv), the same one the publish endpoint uses. |
| AI3 | **Preset-first.** The model picks a preset and variant and adjusts content and theme; it doesn't compose layouts from scratch. |
| AI4 | **Model: Claude Haiku 5.5** for both creation and edits, configurable per task (`AI_MODEL_CREATE`, `AI_MODEL_EDIT`) so creation can move to a larger model by config if evals require it. |
| AI5 | **Provider: Amazon Bedrock, global endpoint**, behind an `LlmPort`. Switching to Bedrock's `eu.` regional endpoint (+10%) or to the Claude API directly is an adapter/config change. |
| AI6 | **Monthly credits**: one allowance per plan (`aiCreditsPerMonth`), **1,000 credits/month** on the current single paid plan; larger plans get larger allowances later. Create = 5, edit = 1, regenerate = 5. |
| AI7 | Everything the assistant produces is a **draft**. Publishing still requires the publish attestation, and **unfilled placeholders block publishing**. |
| AI8 | No visitor data (form submissions, analytics) is ever sent to the model. |

---

## 2. Prerequisite: what the assistant needs from the element registry

All of it comes from [`element-registry-plan.md`](element-registry-plan.md), through
the package `@kiskinvlad/kitlet-widget-schema`:

- `validateDefinition(def, { mode: 'strict' })`: the full definition JSON Schema
  plus structural checks (§4 there).
- The **preset catalogue**: `catalogue.v8.json` (full definitions per variant, used
  by the server to expand a choice) and `catalogue.v8.compact.json` (what the model
  sees: ids, descriptions, tags, variants, **slots**; under 15k tokens, far below
  Haiku 5.5's 100k-token price step).
- **Themes** (`THEMES`, `checkContrast`) and **placeholders** (`[[key]]`,
  `findPlaceholders`).
- `ElementSpec.ai.editable`: the option paths the model may change in edits.

---

## 3. Architecture (linker-backend)

```
editor ──POST /ai/widgets/generate──► AiController
                                        │  checks chain (§5.4)
                                        ▼
                                  AiWidgetService
                    builds prompt: system + catalogue (cached) + user prompt
                                        │
                                   LlmPort.complete({ model, tools, toolChoice })
                                        │   BedrockLlmAdapter (Haiku 5.5, global)
                                        ▼
                         tool call: propose_widgets | refuse
                                        │
                     expand presets + slots + theme → widget documents
                     strict validation; on failure: one retry with the errors
                                        │
                     commit credits, log request, stream result (SSE)
```

**One model call per request, no agent loop.** The model answers with exactly one
tool call (forced `tool_choice`), which keeps cost and latency predictable on Haiku.

### 3.1 Tools

```ts
// create / regenerate
propose_widgets({
  variants: Array<{                    // 1..3
    presetId: string;
    variant: string;
    title: string;                     // internal widget name, e.g. "Black Friday popup"
    slots: Record<string, string>;     // slot key → text; business facts as [[placeholders]]
    theme?: string | WidgetTheme;      // a named theme or custom tokens (must pass checkContrast)
    placeholders: string[];            // e.g. ["discount", "end date"]
    rationale: string;                 // one line, shown to the customer
  }>;
})

// edit
apply_patch({
  ops: JsonPatchOperation[];           // RFC 6902; only paths the schema allows
  summary: string;                     // "Made the button red and shortened the headline"
})

// both
refuse({ category: 'prohibited_content' | 'out_of_scope' | 'unclear'; message: string })
```

- The server (not the model) expands `{ presetId, variant }` from the catalogue,
  writes the `slots` through each slot's binding, applies the theme, then validates
  the whole document strictly.
- Patches are applied server-side to the current document and the **result** is
  validated strictly before anything is returned. Allowed patch paths come from
  `ElementSpec.ai.editable` (an allow-list), so the model can't touch ids, behaviours'
  endpoints, publish state or moderation fields.

### 3.2 Prompt assembly

- **System prompt** (versioned in the repo, e.g. `ai/prompts/create.v1.md`): role,
  the rules in §4, output language rule ("write customer-facing text in the language
  of the prompt unless told otherwise"), and the catalogue.
- System prompt + catalogue are marked for **prompt caching**; only the user prompt
  and (for edits) the current widget document are uncached.
- Each request records `promptVersion` and `catalogueVersion` so evals and logs can
  be compared across versions.

### 3.3 LLM adapter

- `LlmPort` with `BedrockLlmAdapter` (default) and an `AnthropicApiAdapter` stub for
  later. Model ids come from env (`AI_MODEL_CREATE`, `AI_MODEL_EDIT`), as Bedrock
  inference-profile ids (global).
- Use whichever client supports **tool use and prompt caching** for Haiku 5.5 on
  Bedrock (the Bedrock Runtime Converse API or Anthropic's Bedrock SDK). Verify the
  model is enabled for the AWS account and region before building on it: the newest
  Claude models are served through the "Claude in Amazon Bedrock" endpoint.
- Auth through the task's IAM role, never static keys.
- Timeouts (create 30 s, edit 15 s), one retry on transient provider errors, and a
  per-request output token cap.

### 3.4 Streaming

`generate` and `edit` respond with **Server-Sent Events**: `status` (e.g.
"Choosing a layout…"), `variant` (one per proposal, as each is validated), `done`
(with updated credit usage) or `error`. The editor shows variants as they arrive.
A plain JSON fallback (`Accept: application/json`) is useful for tests.

---

## 4. Safety and acceptable use

Kitlet's Acceptable Use Policy bans fake urgency, fake reviews and misleading claims.
The assistant must not become a tool for them.

- **Schema-level guarantees** (strongest): what the schema can't express, the model
  can't produce: no "evergreen" countdown mode, no display rating without collected
  data, no form field types for passwords, card numbers or government IDs.
- **No invented facts.** Prices, discounts, stock, deadlines, review counts and
  testimonials become **placeholders** (the registry plan's `[[key]]` syntax),
  written as `[[discount]]`, `[[end date]]`
  unless the customer's prompt states them. The editor highlights placeholders, and
  **the publish endpoint rejects a widget that still contains `[[…]]`**
  (422 `UNRESOLVED_PLACEHOLDERS`). This is the backstop: an invented value can't
  reach visitors unnoticed.
- **Refusals:** the model calls `refuse` for prohibited categories (phishing,
  impersonation, illegal goods, political ads, …); the editor shows the message and
  links `/legal/acceptable-use`. Refusals cost no credits but count toward the rate
  limit.
- **Output checks on the server:** links only `https:` (or `mailto:`/`tel:`), no
  script-like strings, text lengths within schema limits.
- **Account status:** suspended accounts and disabled widgets can't use the
  assistant (same check as delivery).
- **Labelling:** generated drafts carry `aiGenerated: true` and the editor shows
  "Created with AI. Check every claim before publishing."
- Prompt injection: v1 only uses the customer's own prompt and their own widget, so
  injection can only affect their own draft. Fetching external pages ("Match my
  site", §11) needs its own review.

---

## 5. Credits and limits

### 5.1 Rules

| Action | Credits |
|---|---|
| Create (up to 3 variants) | 5 |
| Regenerate variants | 5 |
| Edit | 1 |

- Allowance: `aiCreditsPerMonth` in plan limits (next to `maxWidgets`,
  `monthlyViews`). Current paid plan: **1,000**.
- Period: the subscription's billing cycle (`current_period_start`). Until billing
  exists: calendar month in UTC.
- **Not charged:** provider errors, output still invalid after the internal retry,
  refusals, the internal schema-fix retry. **Undo doesn't refund.**
- No rollover. Upgrade mid-cycle: the new limit applies at once, usage carries over.
  Downgrade to free: assistant locked.
- `ai_assistant` unlocked through the feedback program (§10a): the lowest paid
  plan's allowance.
- Later (needs payments): credit top-up packs.

### 5.2 Ledger

```ts
// ai_usage_ledger (append-only)
id, user_id, period_start, request_id (unique per user: idempotency key),
action ('create'|'regenerate'|'edit'|'grant'), credits (negative for grants),
status ('reserved'|'committed'|'refunded'),
model, prompt_version, input_tokens, cached_tokens, output_tokens,
cost_usd_micros, created_at

// ai_usage_counters (fast path)
user_id, period_start, used, primary key (user_id, period_start)
```

### 5.3 Reserve → commit

1. In one transaction: `SELECT … FOR UPDATE` the counter row, check
   `used + credits ≤ limit`, increment, insert a `reserved` ledger row.
2. Call the model.
3. Success: mark `committed` with real token counts and cost. Failure: mark
   `refunded` and decrement the counter.
4. A stale `reserved` row (crash) is refunded by a sweep job after 10 minutes.

The editor sends a `requestId` (UUID) per user action; a repeated `requestId`
returns the stored result instead of charging again.

### 5.4 Checks before every call (Chain of Responsibility)

`Entitlement('ai_assistant') → AccountStatus → RateLimit (10 requests/min per user)
→ Quota → GlobalSpendBreaker`

| Failure | Response |
|---|---|
| No entitlement | 403 `{ code: 'PLAN_REQUIRED', feature: 'ai_assistant' }` |
| Suspended account / disabled widget | 403 `ACCOUNT_RESTRICTED` / `WIDGET_DISABLED` |
| Rate limit | 429 `{ code: 'AI_RATE_LIMITED', retryAfter }` |
| Quota | 429 `{ code: 'AI_QUOTA_EXCEEDED', used, limit, resetsAt }` |
| Daily spend cap (`AI_DAILY_SPEND_LIMIT_USD`) reached | 503 `AI_TEMPORARILY_UNAVAILABLE` + alert to the operator |

### 5.5 Support CLI

`ai:usage <userId>` (period summary from the ledger) and
`ai:grant-credits <userId> <n> --reason "…"` (a `grant` ledger row). Both log who
ran them, like the other admin commands.

---

## 6. API contract

```ts
// POST /ai/widgets/generate          (SSE; JSON with Accept: application/json)
{ requestId: string; prompt: string /* 3..1000 chars */; variants?: 1 | 2 | 3;
  campaignId?: string; locale?: string }
→ events: status { text } · variant { index, presetId, variant, title, document,
                                       placeholders, rationale }
          · refused { category, message } · done { usage } · error { code, message }

// POST /ai/widgets/:id/edit          (SSE / JSON)
{ requestId: string; instruction: string /* 1..500 */; documentVersion: number }
→ result { ops: JsonPatchOperation[], summary, document } · refused · done { usage }
// 409 DOCUMENT_CHANGED if documentVersion is stale

// GET /ai/usage
→ { used, limit, resetsAt, costs: { create: 5, regenerate: 5, edit: 1 } }

// Creating the widget from a chosen variant: the existing POST /widgets with
// { document, title, campaignId?, aiRequestId } → the widget stores aiGenerated: true
// and ai_request_id for support.

// Publish: 422 UNRESOLVED_PLACEHOLDERS { placeholders: string[] } when [[…]] remain.
```

Generation doesn't save anything: the customer chooses a variant first, so
discarded variants never become widgets.

---

## 7. Editor (linker-editor)

1. **"Create with AI"** on the new-widget screen, next to "Start from a preset" and
   "Blank":
   - prompt box (with a character counter), example chips, e.g. "Black Friday
     banner with a countdown to Nov 28", "Email popup with 10% off the first order",
     "Was this helpful? on blog posts";
   - optional campaign selector (reuses the analytics campaign field);
   - button shows the cost: "Create · 5 credits";
   - variants stream in as cards with a live preview and the rationale; actions:
     **Use this**, **Regenerate (5 credits)**;
   - "Use this" creates the widget (POST /widgets) and opens it in the editor.
2. **Assistant panel** in the editor (paid): a single-line instruction box with
   history for the session. Each result is applied as **one command** on the undo
   stack, with its summary shown ("Undo: made the button red"). On 409, reload the
   document and ask the user to retry.
3. **Placeholders:** `[[…]]` tokens are highlighted in the canvas and listed in a
   "Fill in before publishing" checklist; Publish is disabled until none remain (the
   server enforces it too).
4. **Credit meter** in both places: "142 of 1,000 credits used · resets 3 Nov",
   from `GET /ai/usage` (refreshed from `done.usage`). At 80% a notice; at 100% the
   prompt box is disabled with the reset date. Manual editing always works.
5. **Locked state** for free plans: the "Create with AI" card is visible with a
   short description and an upgrade link to `/pricing`; no requests are sent.
6. **Refusals and errors** shown inline with the server's message; refusal links
   `/legal/acceptable-use`.
7. "Created with AI. Check every claim before publishing" banner on AI-created
   widgets until first publish.

---

## 8. Portal (linker-landing)

- `core/billing/feature-names.ts`: `ai_assistant: "AI assistant"`.
- Pricing page: the paid plan lists "AI assistant: 1,000 credits/month" with a short
  explanation of credits (create = 5, edit = 1); the free plan shows it as not
  included.
- Account page, plan section: an **AI credits** row with the same meter
  (`GET /ai/usage`), shown on paid plans.
- How-it-works page / home: optionally a step or feature card "Describe it, get a
  draft" once the feature ships (behind a content flag until then).
- Legal texts: §9.

---

## 9. Legal text changes (linker-landing)

- **Terms**, §4 or a new short section "AI features": AI output is a suggestion;
  the customer reviews it and is responsible for it like any other content they
  publish; no guarantee of accuracy; credits are a usage allowance, not a paid
  balance, don't roll over and have no cash value; we may change allowances and
  limit use to protect the Service.
- **Acceptable Use Policy**, "Abusing the Service": using AI features to generate
  prohibited content, or attempting to bypass their safeguards or limits.
- **Privacy Policy**, §3 (what we collect): AI requests: your prompt, the widget
  settings it applies to and the result, used to provide the feature, kept **30
  days** for support and quality, then deleted; usage records (credits, token
  counts) kept with billing records; not used to train AI models by us or our
  provider. §4/§5: processed through Amazon Bedrock (AWS), which may process
  requests outside the EU; covered by the AWS Data Processing Addendum and SCCs.
- **Subprocessors**: extend the AWS row's purpose with "AI features (Amazon
  Bedrock)" and note the processing location for global inference.
- Bump the version of each changed document in `legal.content.ts`. Texts aren't
  final yet (`LEGAL_TEXTS_FINAL = false`), so no 30-day notice is needed now.

---

## 10. Data handling

- Sent to the model: system prompt, catalogue, the customer's prompt or instruction,
  and (for edits) the current widget document. Never form submissions, analytics,
  visitor data, other widgets or account details.
- `ai_requests` table: request id, user, action, prompt text, result summary/document,
  refusal category, model, versions, latency, timestamps. **Deleted after 30 days**
  by the retention job; the ledger (no text) is kept with billing records.
- Account deletion: the purge job deletes `ai_requests` and the user's ledger rows
  with the account (keep only what tax records require, if anything).
- Bedrock invocation logging: off by default; if enabled for debugging, same 30-day
  retention.

---

## 11. Later (not in v1)

- **Match my site**: customer pastes a store URL; the backend fetches it (reusing
  the webhook SSRF guard), extracts colours, fonts and logo, and passes them as theme
  hints. Needs a prompt-injection review (fetched pages are untrusted input).
- **AI insights in analytics**: "Your popup's CTR dropped 30% after the last change.
  Try…", built on the analytics read API.
- **Credit top-ups** once payments exist; **larger allowances** on future plans.
- Image generation: out of scope; use uploads and the icon set.

---

## 12. Quality: evaluations and observability

- `ai/evals/` in linker-backend: 30–50 prompts in several languages (English,
  Ukrainian, Spanish, …) with expectations: preset family, number of variants,
  placeholders present when the prompt gives no numbers, refusal for prohibited
  requests, language of the output.
- `pnpm ai:eval` runs them against the configured model and prints:
  schema-valid rate (target ≥ 98% after retry), placeholder correctness (100%),
  refusal correctness, average tokens and cost per request. Run it manually and
  before changing prompts, catalogue or model, not on every CI run (it costs money).
- Metrics: requests, refusals, validation retries, latency, tokens, cost per day;
  alert on spend breaker, error rate and retry-rate spikes.

---

## 13. Configuration

| Env var | Default | Notes |
|---|---|---|
| `AI_ENABLED` | `false` | Kill switch for the whole feature |
| `AI_PROVIDER` | `bedrock` | `bedrock` \| `anthropic` |
| `AI_BEDROCK_REGION` | `eu-central-1` | Region of the Bedrock client |
| `AI_MODEL_CREATE` | Haiku 5.5 global inference profile id | |
| `AI_MODEL_EDIT` | Haiku 5.5 global inference profile id | |
| `AI_MAX_OUTPUT_TOKENS` | `4000` (create), `1500` (edit) | |
| `AI_DAILY_SPEND_LIMIT_USD` | `20` | Global breaker |
| `AI_RATE_LIMIT_PER_MIN` | `10` | Per user |

All validated by the Zod env schema.

---

## 14. Milestones

| # | Milestone | Repo | Done when |
|---|---|---|---|
| AI-0 | Plan and legal texts | landing | This file merged; §9 text changes merged |
| AI-P | Prerequisite | editor + backend | [`element-registry-plan.md`](element-registry-plan.md) R-1 to R-3 |
| AI-1 | Backend core | backend | `LlmPort` + Bedrock adapter, prompts, credits ledger and checks chain, `/ai/widgets/generate`, `/ai/usage`, placeholder publish check, `ai_requests` retention, eval harness |
| AI-2 | Create flow | editor | "Create with AI", variants, credit meter, locked state, placeholders checklist |
| AI-3 | Edits | backend + editor | `/ai/widgets/:id/edit` with JSON Patch, assistant panel with undo |
| AI-4 | Portal | landing | Pricing, account credit meter, feature name |
| AI-5 | Later | all | §11 |

Order: **AI-0 → AI-P → AI-1 → AI-2 / AI-4 → AI-3**.

---

## 15. Testing

- **Backend unit:** credit reservation under concurrency (two parallel requests at
  the limit → one 429), refund on provider error and on invalid output, idempotent
  `requestId`, stale-reservation sweep, override merge + validation, patch path
  allow-list, placeholder detection, output link checks, checks-chain order. The
  LLM is mocked through `LlmPort` with recorded tool-call fixtures.
- **Backend e2e:** 403 without entitlement, 429 at quota with `resetsAt`, 503 when
  the breaker trips, SSE event order, publish rejected with unresolved placeholders.
- **Editor unit:** variant cards from streamed events, "Use this" creates the
  widget, AI edit = one undo step, publish disabled with placeholders, meter states
  (normal, 80%, 100%, locked).
- **Evals:** §12, before every prompt, catalogue or model change.

---

## 16. Open items

1. Element registry and presets (AI-P): [`element-registry-plan.md`](element-registry-plan.md).
2. The backend's billing module (plans, subscriptions, `EntitlementsService`,
   `FEATURE_KEYS`) exists: add `ai_assistant` to `FEATURE_KEYS` and
   `aiCreditsPerMonth` to plan limits; use the subscription's period if it is
   available, otherwise the calendar month in UTC.
3. Confirm Haiku 5.5 availability on Bedrock for the AWS account and region.
