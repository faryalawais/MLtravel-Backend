---
name: fe-implement
description: >-
  Implement the FE feature by reading the FE contract (contract.md), Figma
  frame data, @fe Gherkins, and the published OpenAPI spec from BE. Uses
  speckit internally — one task per @fe scenario, component by component.
  Figma is the visual reference; contract.md is the boundary; OpenAPI is the
  data contract. Run only after BE ticket is be-implemented.
---

# fe-implement

Implements the FE feature — React components, pages, and API integration —
using the FE contract as the build checklist and Figma as the visual reference.
BE must be fully implemented and the OpenAPI spec published before this starts.

## Inputs
- `features/<fe-jira-id>/contract.md` — FE implementation boundary
- `features/<fe-jira-id>/figma/nodes/<nodeId>.json` — the cached
  `get_design_context` payloads (exact values per slice-root + leaves). **Read
  these instead of calling the Figma MCP.**
- `features/<fe-jira-id>/figma/layout.json` — the composition tree (where each
  component sits on the page)
- `features/<fe-jira-id>/figma/` — `spec.json`, `reference-<section>.png`,
  `asset-manifest.json`, `run-report.json`
- `features/<parent-id>/<parent-id>.feature` (`@fe` scenarios only)
- `docs/openapi/paths/<be-jira-id>.yaml` — the published BE API contract
- `tokens/ui-registry.json` — component paths and token bindings
- `reports/tokens-report.md` — allowed token vocabulary
- `features/<parent-id>/memory.md`

## Smart zone check (run before anything else)

Count the `@fe` scenarios in the feature file:
```bash
grep -c "^\s*@fe" features/<parent-id>/<parent-id>.feature
```

- **≤ 10 scenarios** → proceed normally.
- **11–20 scenarios** → warn: _"⚠️ This feature has N @fe scenarios — you may hit the smart zone limit mid-run. Consider starting a fresh chat for each group of ~10 scenarios, or split the feature further with `/to-issues`."_ Then ask: _"Continue in this chat or split first?"_
- **> 20 scenarios** → warn strongly: _"⚠️ This feature has N @fe scenarios — too large for reliable output in one context window. Recommended: split the feature using `/to-issues` into smaller slices, then implement each slice in a fresh chat. Continue anyway?"_ Wait for the user to decide.

Each scenario = one component task. Never implement more than one component per task pass.

## Pre-flight checks (mandatory before any code)

Before writing a single line of UI code:

1. Confirm BE ticket is `be-implemented` in memory. If not, stop — FE
   cannot start until BE is complete.
2. Verify `features/<fe-jira-id>/contract.md` exists and both
   `validate:figma-coverage` and `validate:contract` passed.
3. Verify the extraction cache exists: `features/<fe-jira-id>/figma/nodes/`
   has at least one `<nodeId>.json`, `layout.json` is present, and a real
   `reference-<section>.png` exists. If the cache is absent, the feature was not
   extracted — run `figma-extract` (which runs the single-session driver) first.
   `npm run validate:figma-extract -- <fe-jira-id>` must exit 0.
4. Read `contract.md` §2 anatomy completely — build a checklist of every
   named element. Every element in §2 must be rendered. No gaps.
5. **Verify every named component in §2 has a nodeId.** Scan every anatomy
   line that carries a `[component.*]` tag. Each one must have `(nodeId X:Y)`
   beside its name. If any nodeId is missing → **STOP**. Do not implement.
   Report which components lack nodeIds and instruct the user to re-run
   `design-contract` (which will trigger `figma-extract` to backfill them).
   A missing nodeId means per-component Figma extraction cannot run, which
   means implementation will produce drift from the Figma design.

## Procedure

### Step 0 — Validate feature branch
```bash
git rev-parse --abbrev-ref HEAD
```
Must equal `feature/<fe-jira-id>`. If it is `main` or anything else, stop:
> "Wrong branch. Switch with: `git checkout feature/<fe-jira-id>`"
> `design-contract` creates the branch — if it does not exist yet, that skill must run first.

### Step 1 — Read all inputs
Read these completely before writing any code (all on disk — 0 MCP):
1. `contract.md` — full component anatomy, layout, tokens, states, API bindings
2. `figma/nodes/<nodeId>.json` — the cached exact values per slice-root/leaf
3. `figma/layout.json` — the composition tree (where each component sits)
4. `figma/reference-<section>.png` — open and keep as visual reference throughout
5. `figma/spec.json` — exact measurements, colours, spacing (+ `$meta.figmaLastModified` for the freshness check)
6. `docs/openapi/paths/<be-jira-id>.yaml` — know every endpoint and response field
7. `tokens-report.md` — know which token names to use

### Step 2 — Plan with speckit
Run `speckit-plan` with:
- `@fe` Gherkin scenarios as the task source
- FE contract as the context document
- Output: one task per `@fe` scenario

Task naming: `fe-<component-slug>-<scenario-slug>`
Example: `fe-feedback-form-happy-path`, `fe-feedback-form-empty-state`

### Step 3 — Create task list
Run `speckit-tasks`. Each task must state:
- Which component it builds
- Which `@fe` scenario it covers
- Which `contract.md` anatomy sections it implements
- Which API field bindings apply

### Step 4 — Implement component by component
Run `speckit-implement` one task at a time.

**⚠ MANDATORY: Per-component design-data gate — CACHE-FIRST (runs before writing any code for each component)**

This is a hard gate. It runs once per component, in order, before the first line
of code for that component is written. It is not optional and cannot be deferred.

**The data already exists on disk.** `figma-extract` ran the single MCP session
for this feature and wrote the recursive `get_design_context` payload for every
slice-root to `features/<fe-jira-id>/figma/nodes/<nodeId>.json` (the §5 cache).
That payload contains the exact values (px, colour, typography, token bindings)
for the slice-root **and all its leaves**. `fe-implement` reads that cache — it
does **NOT** re-call the Figma MCP per component (that duplication is exactly
what this plan removed; see `docs/figma-single-pass-extract-plan.md` §6).

```
FOR EACH component in the current slice/task:
  1. Read the component's nodeId from contract.md §2
     (format: `ComponentName  (nodeId X:Y, WxH)  [component.*]`)
  2. Read the cache, NO MCP:
       features/<fe-jira-id>/figma/nodes/<nodeId>.json  (or its slice-root's
       file — the recursive payload contains this node's leaf values), or the
       features/_shared/figma/nodes/<nodeId>.json pointer for shared chrome.
     - if present AND its $meta.figmaLastModified matches spec.json $meta
       → use it. This is the normal path → 0 MCP calls.
     - if MISSING or STALE (figmaLastModified differs) → refresh ONLY that node:
         npm run figma:refresh-node -- --feature <fe-jira-id> --refresh-node <nodeId>
       then read the rewritten cache file. (This is the only path that touches
       MCP, and only for a genuinely missing/changed node.)
  3. From the cached payload, record EVERY value before opening any .tsx file:
       - Exact px dimensions (width, height)
       - Exact padding, gap, margin values
       - Font size, weight, line-height per text element
       - Color token for every fill, stroke, background
       - Border width, border-radius / shadow tokens
       - Icon sizes and exact SVG asset URLs
  4. Read layout.json to know WHERE this component sits on the page
     (its slot in the composition tree) so a stub/replace slice drops the real
     component into a known position — do not re-derive page composition.
  5. Map every recorded value to its exact design token from tokens-report.md.
     If ANY value has no exact token match → STOP. Follow the missing-tokens
     protocol (see figma-extract skill). Do not approximate.
  6. ONLY after steps 1–5 are complete → open the .tsx file and implement

  BLOCK conditions (do not write code if any apply):
  - nodeId is missing from contract.md §2 → re-run design-contract
  - the cache file is missing AND figma:refresh-node cannot fetch it → STOP,
    report to user (the feature was not fully extracted; re-run figma-extract)
  - A measurement has no exact token and allow_raw_values is not set → STOP
```

**Why cache-first is correct:** the cache is a verified-fresh snapshot, not a
guess. `figma-extract` captured the exact recursive payload once; the
`figmaLastModified` stamp makes staleness explicit, and `figma:refresh-node`
re-fetches exactly the one node that drifted. So you keep live-Figma correctness
without the ~26 duplicate calls. If contract.md §2 and the cached payload
disagree on a value, the cached Figma value wins — update the contract to match.
Never extract the full frame; never loop `get_design_context` per component.

**Stale or missing cache protocol:** If a node's cache file is missing or its
`figmaLastModified` no longer matches `spec.json`:
1. `npm run figma:refresh-node -- --feature <fe-jira-id> --refresh-node <nodeId>`
   re-fetches exactly that one node (one small MCP call) and rewrites its cache.
2. Read the rewritten `nodes/<nodeId>.json` and continue from step 3.
3. If refresh cannot fetch it (whole frame changed), re-run `figma-extract`
   (one session) — never hand-build values from memory or a screenshot.

**Token discipline — enforced throughout:**
- No raw hex values. All colours from `var(--token-name)` or Tailwind token class.
- No raw `px` values. All spacing from token-backed Tailwind classes.
- Every token name must exist in `reports/tokens-report.md`.

**§4 Token Audit — mandatory after EVERY component, before moving on:**
`token-lint` only catches raw values — it cannot catch a wrong token. `bg-surface-warning`
and `bg-surface-brand` are both valid tokens; only `contract.md §4` says which is correct.

After writing each component, open `contract.md §4 Tokens per element` and walk every row
that applies to elements in that component. For each row, verify the exact token used in
the className matches §4 — background, text, border, radius, font size, font weight.

Example check:
```
§4 says: Promo Side Banner | bg: color.surface.brand | text: color.text.inverse
Component uses: bg-surface-brand ✓  text-text-inverse ✓  → pass

§4 says: Feature label | font: font.weight.semibold
Component uses: font-medium  → FAIL — fix before continuing
```

Do not move to the next component until every §4 row for the current component passes.
A §4 mismatch is a blocker, the same as a failing test.

**Shared component contract conflict check — mandatory before touching any `components/shared/` file:**
A shared component (e.g. `SiteNav`, `SiteFooter`) must be implemented **once** and then
reused. Never re-implement a shared component that already exists — just import and call it.

Before writing or modifying any file under `components/shared/`:
1. Check git log: `git log --oneline -- components/shared/<file>`
   - **Has prior commits → already implemented. Stop. Import it where needed; do not touch the file.**
     Only modify it if the current feature's §4 requires a genuine addition (new slot, new prop)
     that the existing implementation does not support — and even then, follow steps 2–4 first.
   - **No prior commits → it needs to be implemented. Continue to steps 2–4.**
2. Find every contract.md that mentions this component:
   `grep -rl "<ComponentName>" features/*/contract.md`
3. Extract the §4 token rows for this component from each contract found.
4. Compare token values row by row. Any disagreement is a **conflict** — do not pick one
   arbitrarily. Open the Figma frame for each conflicting feature and resolve which value
   is correct before writing any code.

Example conflict:
```
HOME-002 §4 says: Middle Nav bg → color.surface.card    ← WRONG (bad extraction)
SHOP-003 §4 says: Middle Nav bg → color.surface.infoStrong  ← CORRECT
```
Shipping with the wrong value means every feature that uses the shared component is broken.
A conflict is a blocker — resolve it first, then update the incorrect contract.md to match.

**Shared component reuse rule (summary):**
- Exists → import it, do not rewrite it.
- Does not exist → implement it once using §4 from all contracts, then import it everywhere.

**globals.css — must import tokens before any code is written:**
`app/globals.css` MUST have `@import '../tokens/build/tokens.css';` as its first line,
before the Tailwind directives. Without it, every `var(--color-*)` / `var(--spacing-*)`
reference resolves to `unset` — the page renders with no colour, no spacing, no shadows.
Check this file exists and has the import before writing any component.

```css
@import '../tokens/build/tokens.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Layout shell — mandatory for every feature layout:**
Every `app/<group>/layout.tsx` that renders a nav + main + footer shell MUST use:
```tsx
<div className="flex flex-col min-h-screen">
  <SiteNav />
  <main className="flex-1">{children}</main>
  <SiteFooter />
</div>
```
Without `min-h-screen` + `flex-1`, short-content pages leave a large white gap
between the content card and the footer, and the footer floats in the middle
of the viewport instead of sitting at the bottom. Never use a bare fragment `<>`
as the layout root when the layout includes a header, main, and footer.

**Component anatomy enforcement:**
- Every element named in `contract.md` §2 must be rendered.
- Every element with a `[component.*]` tag gets `data-testid={ids.<path>}`.
- Every element with a `data-api-field` marker gets `data-api-field={fields.<path>}`.
- No placeholder text, no skeleton layouts, no "TODO: implement" comments.

**API integration:**
- Fetch from the exact endpoint paths defined in `docs/openapi/paths/<be-jira-id>.yaml`.
- Response fields accessed by their exact JSON paths from contract.md §1b.
- Handle loading, error, and empty states as specified in contract.md §5.

**Responsive design — mandatory on every component:**
Every page and component MUST be responsive across all screen sizes. Figma shows
desktop at a fixed width — that is the fidelity target for desktop, but the
implementation must also work at mobile (≥320px) and tablet (≥768px).
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) for layout changes.
- Fixed widths like `w-[424px]` that are wider than mobile viewport MUST get a
  mobile override: `w-full sm:w-[424px]`.
- Horizontal padding like `px-[300px]` (allow-raw) that would collapse content on
  mobile MUST have a responsive alternative: `px-4 sm:px-8 lg:px-[300px]`.
- Multi-column layouts (nav tiers, footer columns) MUST stack vertically on mobile.
- Never ship a component that clips or overflows horizontally on any viewport width.
- After implementing each component, resize the browser to 375px wide and verify
  nothing overflows before moving to the next component.

**Figma fidelity:**
- After implementing each component, compare visually against `reference.png`.
- Layout, spacing, typography, colours must match Figma within fidelity tolerance
  defined in contract.md §11.

### Step 5 — Run tests after each component
```bash
npm run test:e2e -- --grep "<scenario name>"
```

Fix failures before moving to the next component. Never move on with a
failing scenario.

### Step 6 — Final gate
After all components implemented, run a full §4 sweep across every implemented component:
re-open `contract.md §4` and check each row against the finished files. This is the last
chance to catch any wrong token that slipped through the per-component audit.

Then run:
```bash
npm run test:e2e && npm run test:visual
```

Both must exit 0.

If `test:e2e` fails: fix the component implementation, not the test.
If `test:visual` fails with a diff: compare against `reference.png`.
  If it's a real regression → fix the component.
  If the Figma design changed → re-run `figma-extract` and update the baseline.
  Never update the visual baseline to hide a real fidelity gap.

Also run:
```bash
npm run typecheck && npm run lint && npm run token-lint
```

All three must pass.

### Step 7 — Write to memory
```markdown
## Implementation Notes
### FE notes
<!-- Written by: fe-implement on <ISO date> -->
- Components implemented: <list>
- test:e2e: passed (<N> scenarios)
- test:visual: passed
- typecheck: passed
- token-lint: passed
- Deviations from contract: <none / list if any>
```

### Step 8 — Run `jira-sync`
Set FE ticket to `fe-implemented`.

### Step 9 — Run `figma-comment`
Post FE implementation complete notice to parent Jira ticket.

### Step 10 — Commit, push branch, open PR
```bash
# Stage all feature work
git add app/ components/ features/<fe-jira-id>/ docs/ tokens/

# Commit
git commit -m "feat(<fe-jira-id>): <short description of feature>

- <component 1>
- <component 2>
- test:e2e passed, test:visual passed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

# Push feature branch
git push origin feature/<fe-jira-id>

# Open PR targeting main
gh pr create \
  --base main \
  --head feature/<fe-jira-id> \
  --title "feat(<fe-jira-id>): <Feature Name>" \
  --body "$(cat <<'EOF'
## Summary
- Implements <Feature Name> FE
- All @fe Gherkin scenarios covered
- test:e2e passed, test:visual passed, typecheck passed

## Components
<list of components>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Hard rule: never push directly to `main`. The PR is the only merge path.**

## Success criteria
- Every element in `contract.md` §2 anatomy is rendered
- Every `[component.*]` tag has a corresponding `data-testid`
- `test:e2e` exits 0
- `test:visual` exits 0
- `typecheck`, `lint`, `token-lint` all pass
- No raw hex or px in `app/` or `components/`
- All pages render correctly at 375px, 768px, and 1280px+ viewport widths
- FE ticket `fe-implemented`
- Feature branch `feature/<fe-jira-id>` pushed to origin
- PR opened targeting `main`
- `main` branch unchanged — no direct commits to main

## Hard rules
- FE NEVER starts before BE ticket is `be-implemented`.
- Never modify test files to make them pass. Fix the component.
- Never update visual baseline to hide a fidelity gap. Fix the component.
- Every element in §2 anatomy is required — omitting any element is a blocker.
- **After every component: audit §4 (Tokens per element) row by row. `token-lint` cannot
  catch a wrong token — `bg-surface-warning` and `bg-surface-brand` are both valid tokens,
  only §4 says which is correct. A §4 mismatch is a blocker.**
- No `any`, no `@ts-ignore`, no disabled lint rules.
- **Never push directly to `main`.** Commit to `feature/<fe-jira-id>` and open a PR.
- Every component must be responsive — no horizontal overflow at any viewport width.
- **Shared components are implemented once and reused everywhere.** Before touching any
  `components/shared/` file: check git log. If it has prior commits → it is done, import it,
  do not rewrite it. If it is new → check §4 across all contracts that reference it, resolve
  any disagreement against Figma, then implement it once. Never re-implement a shared
  component that already exists. A shared component with the wrong token or a duplicate
  implementation breaks every feature that uses it.
- speckit is used internally — do not call speckit skills from outside this skill.
- **No code before the cache is read. Every component's exact values come from
  `features/<fe-jira-id>/figma/nodes/<nodeId>.json` (the cache `figma-extract`
  wrote), read before a single line of code. No approximations from memory or a
  screenshot. The gate runs per component, every time.**
- **`fe-implement` makes ZERO Figma MCP calls on a clean extract.** The only path
  that touches MCP is `figma:refresh-node` for a single node whose
  `figmaLastModified` no longer matches `spec.json` (Layer D freshness). Never
  call `get_design_context` per component, and never extract the full frame — the
  single-session driver in `figma-extract` already did that once and cached it
  (`docs/figma-single-pass-extract-plan.md` §6, §12).
