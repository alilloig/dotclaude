# Sui Slide Styling Guidelines

Guidelines specific to the Sui corporate theme for Marp presentations. Supports both Dark and White/Light themes.

## Theme Selection

Before generating slides, always ask the user which theme they prefer:
- **Dark** (default): Black background, white headings, gray body text
- **White/Light**: White background, black headings, gray body text
- **Mixed**: Dark default with select slides in white

To switch a slide to white theme, add `white` to the class directive:
```markdown
<!-- _class: white cols-4 -->
```

## Sui Design Tokens

### Dark Theme

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#000000` | All slides — pure black |
| Headings | `#FFFFFF` | h1, h2, h3, `<strong>` |
| Body text | `#8B8B8B` | Paragraphs, list items |
| Accent | `#4DA2FF` | Blue markers, pagination, links, `<em>` |
| Separator | `#3A3A3A` | Dotted lines above columns |
| Cards | `#0A0A0A` bg / `#1A1A1A` border | Card containers |

### White/Light Theme

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#FFFFFF` | All slides — pure white |
| Headings | `#000000` | h1, h2, h3, `<strong>` |
| Body text | `#6B6B6B` | Paragraphs, list items |
| Accent | `#4DA2FF` | Blue markers, pagination, links, `<em>` |
| Separator | `#D0D0D0` | Dotted lines above columns |
| Cards | `#F5F5F5` bg / `#E8E8E8` border | Card containers |

### Color Emphasis

```markdown
*This renders in accent blue* (via `<em>` styling)
**This renders in white/black** (via `<strong>` styling — white on dark, black on light)
```

Use `<span class="accent">text</span>` for inline blue accent. Avoid introducing additional colors — the constrained palette is intentional.

### Dark Background Contrast

On a pure black background:
- **Never** use dark gray text below `#666666` — it becomes unreadable
- **Body text** at `#8B8B8B` provides comfortable reading contrast
- **Headings** at `#FFFFFF` create clear visual hierarchy
- **Blue accent** `#4DA2FF` should be used sparingly for maximum impact
- **Images**: Prefer transparent-background PNGs or SVGs. Use `-nobg` variants.

### White Background Contrast

On a pure white background:
- **Body text** at `#6B6B6B` provides comfortable reading contrast
- **Headings** at `#000000` create clear visual hierarchy
- **Blue accent** `#4DA2FF` works on both themes
- **Separators** use lighter `#D0D0D0` dashed lines

## Background Images

The template uses `sui-cover.png` (blue gradient) for several slide types:

| Slide Type | Usage |
|---|---|
| `cover-gradient` | `![bg](assets/images/sui-cover.png)` — full bleed gradient cover |
| `section-break` | `![bg](assets/images/sui-cover.png)` — decorative filler (no title) |
| `chapter` | `![bg](assets/images/sui-cover.png)` — chapter/topic introduction |
| `quote` | `![bg](assets/images/sui-cover.png)` — quote on gradient |
| `toc` | `style="background: url('assets/images/sui-cover.png') center/cover;"` on `.toc-left` |

Always hide pagination on cover/section-break/quote slides:
```markdown
<!-- _paginate: false -->
```

## Category Labels

The template uses small uppercase labels above column headings. Add them with:
```html
<span class="category">LABEL TEXT</span>
```

These labels have a small blue square prefix and appear in uppercase monospace. They provide context about what the column represents (e.g., "PERFORMANCE", "SECURITY", "SCALABILITY").

## Column Heading Markers

Two options for column heading markers:

1. **Blue square** (default): Automatic on all `.col h3` headings
2. **Sui droplet icon**: Add `icon-marker` class to the `.col` div:
```html
<div class="col icon-marker">
```

## Using Images — Sui Specific

For product slides, use the dedicated layout classes:
```markdown
<!-- _class: product-seal-content -->

<div class="content">

# Seal

Description and bullet points here.

</div>

<div class="illustration">

![](assets/images/seal-illustration-nobg.png)

</div>
```

### Image Guidelines

- **Dark theme**: Use `-nobg.png` variants (transparent background) for illustrations
- **White theme**: Both regular and `-nobg` variants work; transparent is still preferred
- **Product icons**: Use `.svg` files from `assets/images/product-{name}.svg`
- **Avoid white-background images** on dark slides — they create jarring bright rectangles

## Layout Class Selection Guide

| Content Type | Recommended Class | Notes |
|---|---|---|
| Opening cover with gradient | `cover-gradient` | With `![bg](assets/images/sui-cover.png)` |
| Opening cover plain | `lead` | Title bottom-left |
| Section divider | `section-break` | With bg image, centered |
| Quote or statement | `quote` | With bg image (dark) or plain (white) |
| Table of contents | `toc` | Split: gradient left, list right |
| Basic title + body | `content` | Top-left aligned |
| 4 features/pillars | `cols-4` | Blue markers + category labels |
| 3 key concepts | `cols-3` | Three equal columns |
| 2 comparisons | `cols-2-center` | Centered title, category labels |
| 4 categories with detail | `grid-2x2` | 2×2 grid, centered |
| 4 headlines only | `cols-4-minimal` | No body text |
| 4 items with droplet icons | `cols-4-icon` + `icon-marker` | Sui droplet marker |
| 4 items with product icons | `cols-4-icon` + `<div class="icon">` | Product SVG above heading |
| Key metrics (4) | `cols-4-stats` | Category label + large number + description |
| Narrative + stats | `stats-side` | Left story, right numbers |
| Big headline numbers | `stats-left` | Large stacked stats with separators |
| Statement or quote | `split-right` | Right-aligned |
| Feature list | `list-right` | Cards on right |
| Text + images | `split-image` | Content left, images right |
| Product showcase (8) | `grid-products` | 4×2 with icons |
| Image gallery | `grid-images` | 4×2 image grid |
| Full image | `fullbleed` | No padding |
| Product introduction | `product-{name}` | Hero with watermark |
| Product deep-dive | `product-{name}-content` | Split with illustration |

## Font Size Reference

Defined in the Sui theme:
- h1: `42px` (standard) / `64px` (lead) / `56px` (cover-gradient, product hero)
- h2: `32px`
- h3: `24px`
- Body text: `22px`
- Category labels: `11px` uppercase
- Stat numbers: `48px` (standard) / `72-80px` (stats-left)
- Quote text: `36px`
- Small text: `16px`
- Footer/header: `14px`

## Sui Quality Checklist

After applying the Sui theme, verify:

- [ ] Did you ask the user for theme preference (Dark/White/Mixed)?
- [ ] Are layout classes correctly applied with proper HTML structure?
- [ ] Do multi-column layouts use `<div class="grid"><div class="col">` wrappers?
- [ ] Do columns have category labels where appropriate?
- [ ] Are stat numbers using `<div class="stat">` or `<div class="stat-large">` markup?
- [ ] Does the color palette stay within Sui design tokens for the chosen theme?
- [ ] Are product slides using the correct product-specific class?
- [ ] Do cover/quote/section-break slides use `![bg](assets/images/sui-cover.png)`?
- [ ] Are cover/section-break/quote slides set to `<!-- _paginate: false -->`?
- [ ] Is there sufficient black/white space?
- [ ] Are images optimized for the theme (transparent bg, `-nobg` variants for dark)?
- [ ] Is the Sui footer present (`footer: "Sui"`)? (logo is injected via CSS `footer::before`)
- [ ] For white theme: is `white` class added to all slide directives?
