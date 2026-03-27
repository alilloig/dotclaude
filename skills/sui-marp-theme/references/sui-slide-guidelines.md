# Sui Slide Styling Guidelines

Guidelines specific to the Sui corporate dark theme for Marp presentations.

## Sui Design Tokens

Use only colors defined in the Sui theme:

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#000000` | All slides — pure black |
| Headings | `#FFFFFF` | h1, h2, h3, `<strong>` |
| Body text | `#8B8B8B` | Paragraphs, list items |
| Accent | `#4DA2FF` | Blue markers, pagination, links, `<em>` |
| Separator | `#3A3A3A` | Dotted lines above columns |
| Cards | `#0A0A0A` bg / `#1A1A1A` border | Card containers |

### Color Emphasis

```markdown
*This renders in accent blue* (via `<em>` styling)
**This renders in white** (via `<strong>` styling)
```

Use `<span class="accent">text</span>` for inline blue accent. Avoid introducing additional colors — the constrained palette is intentional.

### Dark Background Contrast

On a pure black background:
- **Never** use dark gray text below `#666666` — it becomes unreadable
- **Body text** at `#8B8B8B` provides comfortable reading contrast
- **Headings** at `#FFFFFF` create clear visual hierarchy
- **Blue accent** `#4DA2FF` should be used sparingly for maximum impact
- **Images**: Prefer transparent-background PNGs or SVGs. Avoid images with white backgrounds — they will create jarring bright rectangles

## Using Images — Sui Specific

For product slides, use the dedicated layout classes:
```markdown
<!-- _class: product-deepbook-content -->

<div class="content">

# DeepBook Protocol

Description and bullet points here.

</div>

<div class="illustration">

![](../assets/images/product-deepbook.svg)

</div>
```

- **Dark-friendly**: Use images that work on black backgrounds
- **Transparent backgrounds**: Prefer SVGs and transparent PNGs

## Layout Class Selection Guide

Match your content type to the right Sui layout class:

| Content Type | Recommended Class | Notes |
|---|---|---|
| Title / cover | `lead` | Large h1, subtitle |
| 4 features or pillars | `cols-4` | Blue markers + body text |
| 3 key concepts | `cols-3` | Three equal columns |
| 2 comparisons | `cols-2-center` | Centered title |
| 4 categories with detail | `grid-2x2` | 2x2 grid |
| 4 headlines only | `cols-4-minimal` | No body text |
| Full image | `fullbleed` | No padding |
| 4 products with icons | `cols-4-icon` | Icon above headline |
| Key metrics (4) | `cols-4-stats` | Large numbers |
| Narrative + stats | `stats-side` | Left story, right numbers |
| Big headline numbers | `stats-left` | Large stacked stats |
| Statement / quote | `split-right` | Right-aligned |
| Feature list | `list-right` | Cards on right |
| Product showcase (8) | `grid-products` | 4x2 with icons |
| Image gallery | `grid-images` | 4x2 image grid |
| Product introduction | `product-{name}` | Hero slide with watermark |
| Product deep-dive | `product-{name}-content` | Split with illustration |

## Font Size Reference

Defined in the Sui theme:
- h1: `42px` (standard) / `64px` (lead) / `56px` (product hero)
- h2: `32px`
- h3: `24px`
- Body text: `22px`
- Stat numbers: `48px` (standard) / `56px` (cols-4-stats) / `72-80px` (stats-left)
- Small text: `16px`
- Footer/header: `14px`

## Sui Quality Checklist

After applying the Sui theme, verify:

- [ ] Are layout classes correctly applied with proper HTML structure?
- [ ] Do multi-column layouts use `<div class="grid"><div class="col">` wrappers?
- [ ] Are stat numbers using `<div class="stat">` markup?
- [ ] Does the color palette stay within Sui design tokens?
- [ ] Are product slides using the correct product-specific class?
- [ ] Is there sufficient black space (whitespace on dark bg)?
- [ ] Are images optimized for dark backgrounds (transparent, no white bg)?
- [ ] Is the Sui footer present (`footer: "Sui"`)?
