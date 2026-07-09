---
name: design-taste-frontend
description: Use when a pure HTML/CSS/JS page needs stronger visual direction, distinctive layout decisions, or anti-generic design treatment beyond routine implementation. Best for landing pages, event pages, portfolios, editorial pages, and major redesigns inside the `web-html` flow. Do not use for React, Next.js, dashboards, or backend-only work.
---

# design-taste-frontend

Pure HTML design skill for `web-html`.
This skill is for visual direction and page shaping, not framework architecture.
Output must remain compatible with plain HTML, CSS, and small native JS.

## Use It For

- New visual direction for a pure HTML page
- Major redesign of an existing static page
- Marketing, portfolio, event, editorial, or branded showcase pages
- Cases where the default implementation feels generic, bland, or overly safe

## Do Not Use It For

- React, Next.js, Vue, Astro, or component-library architecture
- Data-heavy dashboards or app-shell UX
- Small copy-only or spacing-only fixes
- Packaging, proxy, or publish-only work

## Design Read

Before producing layout or styling, state one short read:

```text
Reading this as: <page kind> for <audience>, with a <vibe> language.
```

If the brief is genuinely ambiguous, ask exactly one clarifying question.
Otherwise infer and proceed.

## Three Dials

Set these explicitly when doing a net-new direction:

| Dial | Range | Default | Meaning |
|------|------:|--------:|---------|
| `DESIGN_VARIANCE` | 1-10 | 8 | symmetry vs asymmetry |
| `MOTION_INTENSITY` | 1-10 | 6 | static vs animated |
| `VISUAL_DENSITY` | 1-10 | 4 | airy vs information-packed |

### Quick Presets

| Use case | VARIANCE | MOTION | DENSITY |
|----------|:--------:|:------:|:-------:|
| Marketing landing | 7-9 | 6-8 | 3-5 |
| Event page | 8-10 | 7-9 | 3-4 |
| Brand portfolio | 8-10 | 6-8 | 2-4 |
| Editorial / reading page | 5-7 | 2-4 | 3-5 |
| Trust-first / public info | 3-5 | 1-3 | 4-6 |

## Foundation Rules

- Stay in plain HTML, CSS, and native JS
- Prefer CSS variables for tokens
- Prefer semantic HTML over div soup
- Prefer CSS Grid / Flexbox over layout hacks
- Prefer progressive enhancement over JS-dependent first paint
- Keep output usable from `file://` unless explicitly exempted upstream

## Anti-Default Rules

Do not default to:

- purple/blue AI gradients everywhere
- centered dark hero with three identical cards
- glassmorphism on every surface
- generic SaaS section stacking
- random serif word spliced into a sans headline
- motion for motion's sake

Pick one clear visual language and apply it consistently.

## Typography

- Choose a deliberate headline voice
- Keep body copy readable and calm
- Use one primary type family; a second family is optional, not mandatory
- Sans-serif is the default
- Use serif only when the brief actually supports editorial, luxury, heritage, or publication cues
- Avoid overlong hero copy; the headline should usually fit in 1-2 desktop lines

## Color

- Use one accent color per page
- Keep neutrals coherent; do not mix warm and cool greys randomly
- Contrast must remain readable on buttons, forms, and small text
- Premium consumer pages should not automatically fall into beige + brass defaults

## Layout

- `DESIGN_VARIANCE <= 4`: cleaner, calmer, more regular composition
- `DESIGN_VARIANCE 5-7`: asymmetry with discipline
- `DESIGN_VARIANCE >= 8`: more expressive composition, but still readable

Default layout guidance:

- Avoid repeating one section pattern across the whole page
- Use at least 3-4 layout families on a longer landing page
- Keep nav on one line at desktop
- Keep hero CTA visible in the initial viewport
- Do not create empty bento cells just to satisfy a grid

## Motion

- `MOTION_INTENSITY <= 3`: mostly static, subtle hover/focus only
- `MOTION_INTENSITY 4-6`: restrained reveals, tactile button states, selective hover motion
- `MOTION_INTENSITY >= 7`: stronger scroll reveals, layered transitions, more theatrical entry

Rules:

- Respect `prefers-reduced-motion`
- Motion should support hierarchy, not obscure it
- If motion cannot be implemented cleanly in plain HTML/CSS/JS, lower the dial and ship static

## Interaction States

Every interactive surface should cover:

- default
- hover
- active
- focus
- disabled when applicable
- error when applicable

Do not ship a page that only has the happy path visual state.

## Pure HTML / JS Constraints

- No framework assumptions
- No build-step-only features
- No local-file `fetch()` assumptions for core content
- No ES module dependency if the page must run from `file://`
- Keep JS small and intentional

## Section Rules

- Hero should communicate one message, not the whole product spec
- Logo walls go below the hero, not inside it
- Avoid eyebrow labels above every section
- Avoid repeating alternating image-text zigzags more than twice in a row
- Empty states and loading states should feel designed, not ignored

## Visual Quality Bar

Before handing work back, check:

1. Does the page have a clear visual idea, not just competent assembly?
2. Is there one dominant accent and one coherent neutral system?
3. Does the hero feel intentional at both `375px` and desktop width?
4. Are typography, spacing, and radii internally consistent?
5. If the page claims strong motion, does it actually show meaningful motion?
6. Would this be mistaken for a generic AI landing page at a glance?

If the answer to `6` is yes, the design direction is not finished.

## Recommended Output Shape

When handing back to `html-design`, include:

- the one-line design read
- the three dial values
- the chosen visual direction in 2-4 bullets
- any external assets or CDN assumptions
- any known limitation that affects fidelity

## Minimal Pre-Flight

Before considering the design layer done:

- headline and CTA fit cleanly in the hero
- primary buttons have proper contrast
- `375px` layout does not overflow
- `1440px` layout does not look empty or broken
- keyboard focus is visible
- the page still makes sense with motion reduced
