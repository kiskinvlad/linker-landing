# Element registry and presets: implementation plan

Status: **draft v1** · 2026-10-11

Prerequisite for [`ai-assistant-plan.md`](ai-assistant-plan.md) (milestone AI-P) and
for the "element results" phase of [`analytics-plan.md`](analytics-plan.md) (§10).
It covers **linker-editor** (most of the work), **linker-backend** (strict
validation, schema v8, `vote` events) and the shared widget-schema contract.

> The editor owns the widget definition and its contract
> ([Widget Definition Envelope](https://github.com/kiskinvlad/linker-editor/wiki/Widget-Definition-Envelope)
> on the wiki). Every change to the serialised shape below updates that page in the
> same PR, as the editor's own docs require.

---

## 1. Where we are

What already exists, and stays:

| Piece | Today |
|---|---|
| Element registry | `ElementDescriptor` per type, registered via the `ELEMENT_DESCRIPTOR` DI token: label, icon, category, `canHaveChild`, `allowedChildren`, `supportedBehaviors`, `supportedTriggers`, `optionsSchema` (the inspector's form), `createDefaultOptions` |
| Elements | vertical/horizontal layout, text, button, text/number/email/phone/custom input, marketing consent, **countdown** (v6: fixed deadline, daily/weekly cutoff, no evergreen mode by design), **accordion** (v7) |
| Presets | `persistence/presets.ts`: 37 `WidgetPreset`s in 6 categories (`lead`, `promo`, `announce`, `info`, `consent`, `feedback`), built by the `Kit` builder from the same `*DefaultOptions` classes as the palette; deterministic; six hard-coded themes (`DARK`, `LIGHT`, `GREEN`, `WARM`, `SALE`, `MIDNIGHT`) |
| Behaviour | `NodeBehavior[]` on nodes; `WidgetAction` = `submitForm \| notify \| message \| track \| navigate \| dismiss`; widget-level display rules |
| Embed | `src/embed/`, framework-free, renders every element type, with the Cookie Policy's promises enforced by specs |
| Backend | Ajv **envelope-only** validation for `schemaVersion` 4–7 (`widget-schema.registry.ts`), deliberately not looking inside `root` or `display`; events `view \| click \| close \| submit` |

What's missing for the assistant, analytics and the element presets discussed:

1. **The registry is Angular-only.** Descriptors mix UI (form controls, icons) with
   data rules (which options exist, their types and limits). Nothing outside the
   editor (backend, AI, embed tests) can validate an element's options.
2. **There is no full schema of a definition**, so nobody can check that a generated
   or edited widget is valid beyond its envelope.
3. **Presets are code, not data.** They can't be listed, described or expanded
   outside the editor, and they have no named editable parts.
4. **Variants are separate presets** (`email-capture` and `email-capture-light`),
   and the themes are private constants.
5. **No rating or reaction element.** "Was this helpful?" is two buttons with
   `track` actions (`helpful_yes` / `helpful_no`), but the events API only accepts
   `view | click | close | submit`, so those custom events have nowhere to go.
6. **Preset copy contains sample offers** ("Get 10% off", sample codes). Nothing
   stops a customer from publishing a sample discount they never meant to give.

---

## 2. Locked decisions

| # | Decision |
|---|---|
| R1 | Split each element into a framework-free **`ElementSpec`** (data rules, JSON Schema of its options, defaults, AI hints) and the existing Angular **`ElementDescriptor`** (UI), which references its spec. |
| R2 | The full widget definition gets a **JSON Schema** (draft 2020-12), composed from the element specs, validated with **Ajv** (what the backend already uses). |
| R3 | The schema, specs, preset catalogue and validators ship as one framework-free package, **`@kiskinvlad/kitlet-widget-schema`**, built from the editor repo and versioned with `schemaVersion`. |
| R4 | Backend storage stays **envelope-only** (its deliberate decision). Strict validation is a separate function, used for AI output and as a publish check. |
| R5 | Presets stay authored with `Kit` (good DX) but **export to a JSON catalogue** at build time. Each preset declares **slots** (named editable parts) and **variants** (themes and display modes). |
| R6 | Themes become a public **`WidgetTheme`** of 7 tokens with a **contrast check** (WCAG AA). |
| R7 | **Placeholders** `[[name]]` mark values the customer must supply (discount, code, deadline). **Publishing is blocked** while any remain, for presets and AI drafts alike. |
| R8 | New elements in **schema v8**: **rating** and **reaction**, reporting a new **`vote`** event. No display-only rating (fake reviews). |

---

## 3. ElementSpec: the framework-free registry

New folder in the editor: `src/widget-schema/` (like `src/embed/`, no Angular imports;
an ESLint rule enforces it).

```ts
export interface ElementSpec<O = unknown> {
  type: ElementType;
  /** Since which schemaVersion the type exists. */
  since: number;
  canHaveChild: boolean;
  allowedChildren?: readonly ElementType[];
  supportedActions?: readonly WidgetAction['kind'][];
  supportedTriggers?: readonly TriggerEvent[];
  /** JSON Schema of node.options for this type: types, enums, min/max, maxLength. */
  optionsSchema: JSONSchema;
  /** Pure default options; the Angular *DefaultOptions classes delegate to it. */
  defaults(name: string): O;
  /** For the AI catalogue: one line on what it is and when to use it. */
  ai: { summary: string; editable: readonly string[] /* option paths AI may set */ };
}

export const ELEMENT_SPECS: Readonly<Record<ElementType, ElementSpec>>;
```

- `ElementDescriptor` gains `spec: ElementSpec` and drops what moves into it
  (`canHaveChild`, `allowedChildren`, `supportedBehaviors`, `supportedTriggers`,
  `createDefaultOptions` delegate to the spec). Label, icon, category and the
  inspector's `optionsSchema` (UI form fields) stay on the descriptor.
- A spec test asserts every `ElementType` has exactly one spec and one descriptor,
  and that every inspector field writes only option keys the spec's JSON Schema
  declares (so the form can't produce what the schema rejects).
- The embed's `render.ts` keeps its `switch`, but a test asserts it covers every
  type in `ELEMENT_SPECS`.

---

## 4. The definition schema and strict validation

- `src/widget-schema/definition.schema.ts` composes the envelope, `display`
  (display rules), the node tree (a node's `options` validated by its type's
  `optionsSchema` via `if/then` on `type`, or a discriminated `oneOf`), behaviours
  and actions.
- `validateDefinition(def, { mode: 'strict' })` → `{ ok, errors }` with JSON pointers
  and Ajv messages, **never echoing values** (same rule as the backend registry).
- Extra structural rules Ajv can't express, as small pure checks in the same module:
  only layouts have children, `allowedChildren` respected, `submitForm.fields`
  reference existing inputs, unique node ids, maximum depth (e.g. 6) and node count
  (e.g. 60).
- **Who uses it:**
  - editor: specs assert that the seed widget, every preset variant, and
    `migrate()` output of fixtures validate strictly;
  - backend: AI output must validate (AI plan); `POST /widgets/:id/publish` runs it
    too, **log-only for two weeks**, then enforced (422 `DEFINITION_INVALID`), so
    an unforeseen gap can't block customers on day one;
  - embed tests: render fixtures that pass validation.
- Storage (`POST /widgets/:id/versions`) stays envelope-only, so a draft in progress
  is never refused.

### 4.1 The package

`@kiskinvlad/kitlet-widget-schema`, built from `src/widget-schema/` by esbuild/tsc
into ESM + CJS + `.d.ts`, plus generated JSON files:

```
dist/
  index.js, index.d.ts         // ELEMENT_SPECS (data part), validateDefinition, placeholders, theme utils
  definition.v8.schema.json    // the full JSON Schema
  catalogue.v8.json            // the preset catalogue (§5.4)
  catalogue.v8.compact.json    // the AI view of it (§5.5)
```

- Published to **GitHub Packages** from the editor's CI when `CURRENT_SCHEMA_VERSION`
  or the catalogue changes (`<schemaVersion>.<catalogueRevision>.<patch>`, e.g.
  `8.3.0`). The backend pins an exact version.
- Fallback if you don't want a registry yet: a `sync-widget-schema` script in the
  backend copies a tagged editor build's `dist/` into `vendor/widget-schema/`, and a
  CI check fails if it differs from the pinned tag.

---

## 5. Presets as data: themes, slots, variants, placeholders

### 5.1 Themes

```ts
export interface WidgetTheme {
  surface: string; line: string; ink: string; muted: string;
  field: string; accent: string; accentInk: string;   // #rrggbb
}
export const THEMES: Record<'dark'|'light'|'green'|'warm'|'sale'|'midnight', WidgetTheme>;
export function checkContrast(t: WidgetTheme): string[];  // ink/surface, muted/surface, accentInk/accent ≥ 4.5:1
```

The six existing theme constants move here unchanged; a spec runs `checkContrast` on
each (fix any that fail). The AI may pick a named theme or supply a custom one,
which must pass `checkContrast`.

### 5.2 Slots

A **slot** is a named, typed editable part of a preset, bound to a node by a stable
key, so customers (a future "quick edit" form) and the AI can change content without
knowing the tree:

```ts
interface PresetSlot {
  key: string;                 // 'headline' | 'body' | 'cta' | 'code' | 'deadline' | …
  label: string;               // "Headline"
  kind: 'text' | 'url' | 'deadline' | 'items' | 'email' | 'phone';
  maxLength?: number;
  required: boolean;           // must be filled before publishing
  bind: { node: string; path: string };   // node trackId/name + option path, e.g. options.text
}
```

`Kit` gets `k.slot('headline', node, 'options.text', {...})`. The build output stays
the same document; slots are metadata beside it.

### 5.3 Variants

```ts
interface PresetVariant {
  id: string;                  // 'dark' | 'light' | 'bar' | 'popup' …
  label: string;
  theme: keyof typeof THEMES;
  display?: Partial<WidgetDisplayRules>;  // e.g. inline vs popup vs bar
}

interface WidgetPreset {
  id; name; description; category;
  tags: string[];              // 'discount', 'email', 'countdown', 'exit-intent', 'black-friday' …
  slots: PresetSlot[];
  variants: PresetVariant[];   // first is the default
  build(variant: PresetVariant): WidgetSchema;
}
```

- Merge the existing pairs into variants (e.g. `email-capture` + `email-capture-light`
  → `email-capture` with `dark` and `light`). Keep the old ids working:
  `presetById('email-capture-light')` resolves to `email-capture` / `light`
  (an alias map, tested).
- Aim for **2–3 variants per preset** where they make sense (a light and a dark
  theme at least; a bar/popup choice for promos and announcements). Quality over
  count.

### 5.4 Placeholders

- Syntax: `[[key]]` inside any text option (`options.text`, button labels, coupon
  code, accordion answers, message texts). `key` is lowercase words/dashes, e.g.
  `[[discount]]`, `[[code]]`, `[[end date]]`.
- Preset copy uses placeholders for anything that is **a business fact the customer
  must supply**: discount amounts, coupon codes, prices, dates, shipping thresholds,
  opening hours. Example: "Get [[discount]] off your first order", code `[[code]]`.
  Generic copy ("Join the list") stays plain.
- `findPlaceholders(def): { key, nodeId, path }[]` in the package.
- **Editor:** placeholders are highlighted on the canvas and listed in a "Fill in
  before publishing" checklist; `publishBlockers()` adds "Fill in: discount, code".
- **Backend:** the publish endpoint rejects unresolved placeholders with
  422 `UNRESOLVED_PLACEHOLDERS { placeholders }` (shared with the AI plan).
- Existing customer widgets built from old presets contain no placeholders, so
  nothing already saved is affected.

### 5.5 The catalogue

`npm run presets:export` (run in CI and by the package build) writes:

- `catalogue.v8.json`: per preset: id, name, description, category, tags, slots,
  variants, the element types used, and the **built definition per variant**.
  The backend expands `{ presetId, variant }` from it, so it builds exactly what the
  editor builds.
- `catalogue.v8.compact.json`: the AI view: id, one-line description, tags,
  variants (id + label), slots (key, kind, maxLength, required), element types. No
  definitions. A test asserts it stays under **15k tokens** (approximate: chars / 4).

### 5.6 Preset lint (one spec, run in CI)

For every preset and variant: deterministic build, strict validation passes, slots
resolve to existing nodes and paths, `required` slots point at placeholders or real
copy, theme passes contrast, every `submitForm` field exists, description and at
least two tags present, no element the plan forbids (no evergreen countdown).

---

## 6. New elements (schema v8)

### 6.1 Rating

```ts
options.rating = {
  scale: 'stars5' | 'emoji5' | 'nps11';     // 1–5 stars, 1–5 faces, 0–10 NPS
  question: string;                          // "How was your experience?"
  lowLabel?: string; highLabel?: string;     // NPS: "Not likely" / "Very likely"
  thanksText: string;                        // shown after voting
  followUp?: { enabled: boolean; prompt: string; onlyAtOrBelow?: number };
}
```

- Rendered as a **radio group** (keyboard and screen-reader friendly), in the canvas,
  production view and embed through one framework-free `rating-dom.ts` (same
  pattern as `countdown-dom.ts` and `accordion-dom.ts`).
- **Collect only.** There is no option to display an average or a count: showing a
  rating the customer typed in is a fake-reviews tool. A results display may come
  later only from collected data, behind its own decision.
- Follow-up text (e.g. "What could we do better?") is a **form submission** through
  the existing `submitForm` path, so the submissions, retention and export rules
  apply; it is never part of the `vote` event.

### 6.2 Reaction

```ts
options.reaction = {
  style: 'thumbs' | 'yesno' | 'emoji3';      // 👍/👎 · Yes/Not really · 🙁😐🙂
  question: string;                          // "Was this helpful?"
  labels?: { positive?: string; neutral?: string; negative?: string };
  thanksText: string;
  followUpOnNegative?: { enabled: boolean; prompt: string };
}
```

Values: `thumbs`/`yesno` → `+1 | -1`, `emoji3` → `-1 | 0 | +1`.

### 6.3 The `vote` event

- Embed sends `{ type: 'vote', value, pageUrl }`. No visitor id (Cookie Policy).
- Repeat votes are blocked in the browser with `localStorage` key
  `kit_voted_<widgetId>` (try/catch; none at all when `display.rememberVisitors` is
  false, as for every `kit_` key).
- New trigger `vote` (declared on rating and reaction specs) so rules like
  "on vote → dismiss after the thanks message" work.
- **Backend:** `EVENT_TYPES` gains `vote`; the events DTO accepts `value` only for
  `vote`, an integer in `-1..10`; the ingest checks the widget's published definition
  contains a rating or reaction element and that the value fits its scale (cached per
  published version); rate-limited like other events. Rollups and the dashboard block
  are the analytics plan's §10.
- "Was this helpful?" preset is rebuilt on the reaction element; its old `track`
  actions are dropped (they never reached the API).

### 6.4 Schema version

v8 is **additive** (two element types, one trigger, one event type): `migrate()` only
stamps a v7 document as v8. Backend `widget-schema.registry.ts` adds `[8, envelope(8)]`
**before** the editor ships v8 (its own comment requires this order).

---

## 7. Editor UX

- **Preset dialog:** each preset card shows its variants as small theme swatches;
  choosing a swatch changes the preview; tags are searchable ("countdown",
  "discount"). The `blank` preset stays pinned.
- **Palette:** Rating and Reaction under a "Feedback" group; inspector panels via
  two new option strategies (`rating`, `reaction`) in the schema-driven form.
- **Placeholders:** highlighted chips on the canvas, the "Fill in before publishing"
  checklist in the publish flow, Publish disabled while any remain.
- Widgets record their origin: the editor sends `presetId` and `presetVariant` with
  `POST /widgets`; the backend stores them as widget columns (not in the
  definition). Analytics can later answer "which presets perform best".

---

## 8. Backend (linker-backend)

1. Add `[8, envelope(8)]` to the schema registry (first, before the editor's v8).
2. Depend on `@kiskinvlad/kitlet-widget-schema` (or the vendored copy, §4.1).
3. `StrictDefinitionValidator` service wrapping `validateDefinition`; used by the
   publish endpoint (log-only behind `STRICT_PUBLISH_VALIDATION=log|enforce`, default
   `log`) and later by the AI service.
4. `findPlaceholders` on publish → 422 `UNRESOLVED_PLACEHOLDERS`.
5. `PresetCatalogue` service loading `catalogue.v8.json`: `expand(presetId, variant)`
   → definition; `GET /presets` (id, name, description, category, tags, variants) for
   the AI and possible portal use.
6. `widgets.preset_id`, `widgets.preset_variant` (nullable) + `POST /widgets` accepts
   them (validated against the catalogue).
7. `vote` event (§6.3).

---

## 9. Milestones

| # | Milestone | Repo | Done when |
|---|---|---|---|
| R-0 | Plan | landing | This file merged |
| R-1 | Specs and schema | editor | `src/widget-schema/` with `ElementSpec` for every type, descriptors reference specs, definition JSON Schema + `validateDefinition`, structural checks; seed, presets and migration fixtures validate; ESLint boundary rule |
| R-2 | Package | editor + backend | Package build and publish (or vendored copy); backend strict validator (log-only on publish), registry accepts v8 |
| R-3 | Presets as data | editor | Themes + contrast, slots, variants (pairs merged, aliases), placeholders in preset copy, `findPlaceholders` + publish blocker, catalogue export + compact view under 15k tokens, preset lint |
| R-4 | New elements | editor + backend | Rating and reaction (spec, descriptor, inspector strategies, canvas, production view, embed), `vote` trigger and event, v8, "Was this helpful?" rebuilt; backend `vote` ingest, placeholder check on publish, preset columns, `GET /presets` |
| R-5 | Preset UX | editor | Variant swatches, tag search, origin sent on create |

Order: **R-0 → R-1 → R-2 → R-3 → R-4 → R-5**. After R-3 the AI assistant can start
(AI-1); after R-4 the analytics phase 2 (vote results) can.

---

## 10. Testing

- **Editor:** one spec and one descriptor per type; inspector fields ⊆ spec schema;
  strict validation of seed, every preset variant and migrated fixtures; structural
  checks (bad children, missing submit fields, depth/count limits); contrast per
  theme; slot binding; alias ids; placeholder detection and publish blocker; rating
  and reaction keyboard operation; embed: vote payload is exactly
  `{ type, value, pageUrl }`, repeat-vote guard, no storage when remembering is off;
  `embed-policy.spec.ts` still passes; catalogue determinism (two exports are
  byte-identical) and compact size.
- **Backend:** registry accepts 4–8; strict validator log vs enforce; 422 on
  placeholders; catalogue expansion equals the editor's build (fixture from the
  package); `vote` accepted only with a valid value for a widget that has a matching
  element; other types reject `value`.

---

## 11. Open items

1. GitHub Packages vs vendored copy (§4.1): pick one before R-2.
2. Which presets get which variants: review the list in R-3 (designer's eye
   welcome).
3. Results display for ratings (averages or counts on the widget): out of scope;
   needs its own decision because of the fake-reviews rule.
