# Plan 033: Route the public preview hero through SmartImage

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/events/pages/public-event-preview.tsx apps/web/src/features/events/pages/public-event-preview.test.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; a mismatch
> is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

The public event preview's above-the-fold image is a plain `<img>`, so a
256-pixel-tall hero downloads the original image rather than the responsive
proxy variants already used by the application. The existing `SmartImage`
primitive supplies the intended responsive `srcSet`, eager priority behavior,
and a fallback path. Reusing it here reduces unnecessary image transfer without
changing the preview's data or visual layout.

## Current state

`apps/web/src/features/events/pages/public-event-preview.tsx:14-22` accepts only
HTTPS image URLs, and `:65` preserves the fallback that this plan must leave
unchanged:

```tsx
function asImageUrl(images: unknown): string | null {
  if (!Array.isArray(images)) {
    return null
  }
  const firstHttps = images.find(
    (value): value is string => typeof value === "string" && value.startsWith("https://")
  )
  return firstHttps ?? null
}

const imageUrl = asImageUrl(event?.images) || "/og-fallback.png"
```

The public preview currently renders a plain hero image at
`apps/web/src/features/events/pages/public-event-preview.tsx:134-139`:

```tsx
<Card className="overflow-hidden border-border/60">
  <img
    src={imageUrl}
    alt={event.title ?? "Family event"}
    className="h-64 w-full object-cover"
  />
```

`apps/web/src/shared/components/motion/smart-image.tsx:5-24` establishes the
available variants and `priority` contract. The `hero` variant has `100vw`
`sizes`; priority is specifically for above-the-fold heroes:

```tsx
export type SmartImageVariant = "card" | "hero" | "thumbnail"

const SIZES_MAP: Record<SmartImageVariant, string> = {
  card: "(max-width: 640px) 100vw, 300px",
  hero: "100vw",
  thumbnail: "150px",
}

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading"> {
  // …
  variant?: SmartImageVariant
  /**
   * When true, the image loads eagerly with `fetchpriority="high"`.
   * Use for above-the-fold hero images. Default: false (lazy).
   */
  priority?: boolean
}
```

At `apps/web/src/shared/components/motion/smart-image.tsx:55-75`, `SmartImage`
builds a proxy-backed `srcSet` and maps priority to eager/high-priority native
image attributes:

```tsx
const srcSet = !useFallback && src ? buildSrcSet(src) : undefined
const sizes = srcSet ? SIZES_MAP[variant] : undefined

<img
  // …
  srcSet={srcSet}
  sizes={sizes}
  alt={alt}
  loading={priority ? "eager" : "lazy"}
  fetchPriority={priority ? "high" : undefined}
```

The established import form is
`apps/web/src/features/plan/components/plan-hero-card.tsx:9,36-42`:

```tsx
import { SmartImage } from "@/shared/components/motion"

<SmartImage
  src={imageUrl}
  alt={event.title}
  variant="hero"
  priority
  className="h-64 w-full object-cover sm:h-72"
/>
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web check | `pnpm run web:check` | exit 0 |
| Web tests | `pnpm run web:test` | exit 0 |
| Web build | `pnpm run web:build` | exit 0 |
| Guard tests | `pnpm run workspace:test` | exit 0 |
| Docs guard | `pnpm run docs:test` | exit 0 |
| Dead code | `pnpm knip` | exits without new unused-symbol findings |
| Dependency audit | `pnpm audit` | exits with the current audit result |

Vitest tests are colocated: `*.test.ts` files run in the node environment, and
DOM tests use `*.test.tsx` with a `// @vitest-environment jsdom` docblock. RTL
is available through `@testing-library/react`.

## Scope

**In scope**:

- `apps/web/src/features/events/pages/public-event-preview.tsx`
- `apps/web/src/features/events/pages/public-event-preview.test.tsx` (create)

**Out of scope**:

- `apps/web/src/shared/components/motion/smart-image.tsx` and
  `buildSrcSet`; this plan consumes the existing primitive without changing its
  behavior.
- Other hero images.
- The `imageUrl` calculation, including the `/og-fallback.png` fallback.

## Git workflow

- Branch: `advisor/033-public-preview-hero-smart-image`
- Conventional Commits, e.g. `perf(web): serve public preview hero responsively`.
- Do NOT push or open a PR.

## Steps

### Step 1: Confirm the responsive-image contract

Re-read `public-event-preview.tsx`, `smart-image.tsx`, and the `SmartImage`
import in `plan-hero-card.tsx`. Confirm the preview still computes `imageUrl`
with `asImageUrl(event?.images) || "/og-fallback.png"`, and that `hero` remains
the `100vw` variant.

**Verify**: run the drift-check command from the preamble; the Current state
excerpts still match.

### Step 2: Replace only the public preview hero element

Import `SmartImage` from `@/shared/components/motion`. Replace the plain `<img>`
at the top of the preview card with exactly:

```tsx
<SmartImage
  src={imageUrl}
  alt={event.title ?? "Family event"}
  variant="hero"
  priority
  className="h-64 w-full object-cover"
/>
```

Keep the existing `imageUrl` computation and fallback intact. Do not add a
`sizes` prop: `variant="hero"` deliberately owns the `100vw` sizing policy.

**Verify**: `pnpm run web:check` exits 0 with the import and JSX type-correct.

### Step 3: Add a focused public-preview DOM test

Create `public-event-preview.test.tsx` beside the page with the jsdom docblock.
Mock the page's data hook/query boundary so a valid public event renders. For an
HTTP(S) image URL, assert that the rendered hero image has `loading="eager"`,
`fetchpriority="high"`, and a `srcSet` containing `wsrv.nl`. Add the no-image
case and assert that `/og-fallback.png` is still rendered.

Model the test's query/router setup on adjacent page tests; test observable
image attributes rather than reimplementing `SmartImage` or `buildSrcSet`.

**Verify**: `pnpm run web:test` exits 0, including the new jsdom test.

### Step 4: Run the full web gate

**Verify**: `pnpm run verify:web` exits 0.

## Test plan

- New jsdom page test: a valid HTTP(S) event image yields an eager,
  high-priority, proxy-backed hero image.
- New jsdom page test: no valid event image retains `/og-fallback.png`.
- `pnpm run web:test` and `pnpm run web:check` cover the changed page contract;
  `pnpm run verify:web` is the final regression gate.

## Done criteria

- [ ] `public-event-preview.tsx` imports and renders `SmartImage` with
  `variant="hero"` and `priority` for the existing hero slot.
- [ ] The `imageUrl` computation and `/og-fallback.png` fallback remain
  unchanged.
- [ ] The new `public-event-preview.test.tsx` verifies eager/high-priority
  responsive output and fallback behavior.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- The cited code does not match the Current state excerpts after the drift
  check.
- `SmartImage` no longer supports the `hero` variant or `priority` prop.
- The change requires changing `smart-image.tsx`, `buildSrcSet`, the image URL
  selection policy, or another hero to pass.
- The fallback image is no longer safe to render through `SmartImage`; report
  the observed behavior rather than substituting a new fallback design.

## Maintenance notes

- `SmartImage` owns responsive `srcSet`, fallback-on-proxy-error, `sizes`, and
  priority semantics; callers should supply only their slot-specific source,
  alt text, variant, and layout classes.
- Keep this preview on the `hero` variant because it is an above-the-fold,
  full-width slot. Do not introduce a bespoke `sizes` value without measuring a
  different layout contract.
