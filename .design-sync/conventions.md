# @suzumina.click/ui — usage conventions

A **Tailwind CSS v4 + shadcn/ui**-based React component library (the suzumina.click design
system for the 涼花みなせ fan site). Friendly, rounded look; the primary brand color is
**suzuka** pink. Build with the real components below — every one renders from the bound bundle.

## Setup

- **No provider/wrapper is required.** Components are styled entirely by the design system's
  stylesheet (`styles.css`) — just render them. There is no React ThemeProvider.
- **Toasts:** render `<Toaster />` once near the app root so toast notifications can appear.
- **Font:** the brand font **M PLUS Rounded 1c** (rounded gothic) is loaded by `styles.css` and
  applied to `<body>`. Don't set a font-family — inherit it.
- **Dark mode:** add the `dark` class to an ancestor element; the token utilities below flip.

## Styling idiom — component props first, Tailwind utilities for glue

Style a component through its **props** (variant/size unions), and use **Tailwind v4 utility
classes** only for your own layout, spacing, and surfaces. Do NOT invent class names — this
system has its own vocabulary; use the names below.

**Variants are props, not classes.** Examples (check each component's `<Name>.d.ts` for the exact union):
- `<Button variant="default | secondary | destructive | outline | ghost | link" size="default | sm | lg | icon">`
- `<Badge variant="default | secondary | destructive | outline">`
- `<Alert variant="default | destructive">`

**Semantic color utilities** (pair a `bg-*` surface with its matching `*-foreground` text):

| Utility | Use |
|---|---|
| `bg-background` / `text-foreground` | page surface + body text |
| `bg-card` / `text-card-foreground` | cards, panels |
| `bg-primary` / `text-primary-foreground` | primary actions (brand pink) |
| `bg-secondary` / `text-secondary-foreground` | secondary actions |
| `bg-muted` / `text-muted-foreground` | subdued surfaces / hint text |
| `bg-accent` | hover / active surface |
| `bg-destructive` / `text-destructive` / `text-destructive-foreground` | danger |
| `bg-popover` / `text-popover-foreground` | overlays (menus, popovers) |
| `border-border`, `ring-ring` | borders, focus rings |

**Brand scales:** `*-suzuka-{50,100,200,500,600,700,…}` (pink — the brand) and `*-minase-{…}`
(warm orange accent), e.g. `bg-suzuka-500`, `text-suzuka-700`, `border-suzuka-200`, `bg-minase-500`.
Prefer `primary` for ordinary brand actions; reach for the raw scales for bespoke brand surfaces.
The full 50–950 range is defined as CSS variables in `styles.css` (`var(--color-suzuka-700)` etc.),
so if a specific shade's utility isn't styled, use the variable directly.

**Raw scales invert in dark mode** (`suzuka-50 ↔ 950`), so always pair a raw-scale class with a
`dark:` variant (`bg-suzuka-50 dark:bg-suzuka-950`); for ordinary surfaces prefer the semantic
tokens above, which already carry dark values. `minase` is the **secondary** accent (footer
surfaces, special-feature emphasis) — keep it limited, and never put white text on orange
(it fails AA at 2.3:1; use dark or `minase-50` text).

**Radius:** `rounded-sm | rounded-md | rounded-lg | rounded-xl | rounded-full` (from the `--radius` token, 0.5rem).

## Where the truth lives

- The bound **`styles.css`** (and its `@import` closure) is the authoritative source of tokens and
  utilities — read it before styling.
- Each component ships **`<Name>.prompt.md`** (how to use it) and **`<Name>.d.ts`** (its exact prop
  contract) — read them before composing a component.

## Example

```tsx
<Card className="max-w-md">
  <CardHeader>
    <CardTitle>新着ボタン</CardTitle>
    <CardDescription className="text-muted-foreground">最近追加された音声</CardDescription>
  </CardHeader>
  <CardContent className="flex flex-col gap-3">
    <Button variant="default">再生</Button>
    <Button variant="outline" size="sm">詳細を見る</Button>
  </CardContent>
</Card>
```
