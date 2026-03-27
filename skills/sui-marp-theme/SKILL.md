---
name: sui-marp-theme
description: |
  Apply the Sui corporate theme to Marp slide markdown. Supports DUAL THEMES:
  Dark (black bg, white text) and White/Light (white bg, black text) — matching the
  official 2026 Sui Slides Template. Features embedded CSS, design tokens, 20+ layout
  classes, background images (gradient covers, stripes), category labels, Sui droplet
  icon markers, product hero/content slides with watermarks, and product illustrations
  (Seal, DeepBook, Walrus, etc.). Use when: (1) styling slides with Sui branding,
  (2) applying Sui design tokens and layout classes, (3) adding product hero slides,
  (4) turning any Marp markdown into a Sui presentation. Works on output from
  /marp-slide-content or any Marp markdown. Can also accept raw source material
  directly — it will structure the content before applying the theme.
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
---

# Sui Marp Theme — Presentation Styling Skill

Apply the Sui corporate theme (Dark or White) to Marp slide markdown. Both themes match the official 2026 Sui Slides Template PDF, including gradient cover backgrounds, category labels, Sui droplet markers, and product illustration slides.

## Quick Start

1. **Ask the user for their theme preference** using `AskUserQuestion` (see Step 1 below)
2. **Read the template** at `assets/template-sui.md` — self-contained starting point with CSS and layout examples
3. **Read guidelines** at `references/sui-slide-guidelines.md`
4. **Apply Sui theme** — inject CSS, map layout classes, add product slides where appropriate

## When This Skill Applies

Activate when the user:
- Requests a Sui-branded presentation or slide deck
- Asks to apply Sui theming/styling to existing slides
- Wants to turn content into a Sui presentation
- Mentions "Sui" in combination with "slides", "presentation", "deck", or "Marp"
- Asks to restyle slides with the Sui brand

## Mandatory Workflow

### Step 1: Ask Theme Preference

Before generating any slides, use the `AskUserQuestion` tool to ask:

> "Which Sui theme would you like for your presentation?"
>
> - **Dark theme** — Black background, white headings, gray body text (corporate default)
> - **White/Light theme** — White background, black headings, gray body text
> - **Mixed** — Dark theme by default, with specific slides in white (e.g., TOC, quotes)

Based on the answer:
- **Dark**: Use default classes (no `white` prefix needed)
- **White**: Add `white` to every slide's `_class` directive (e.g., `<!-- _class: white cols-4 -->`)
- **Mixed**: Default to dark, add `white` only on specific slides as appropriate

### Step 2: Accept Input

Ask for the path to the user's Marp `.md` file OR raw source material.

> "Please provide the path to your Marp slide markdown file, or paste the content you'd like to turn into a Sui presentation."

If the user provides raw source material (not already Marp slides), first structure it into slides following content best practices (concise titles 3-6 words, 3-5 bullets per slide, 1 slide = 1 message) before applying the theme. If the input is already Marp markdown, proceed directly to theming.

### Step 3: Read References

Before generating slides, read these reference files:

1. `assets/template-sui.md` — full embedded CSS and layout class examples for both themes
2. `references/sui-slide-guidelines.md` — Sui-specific quality guidelines, design tokens, layout selection

### Step 4: Map to Sui Layout Classes

Analyze the input slides and:

1. Map generic layout classes to Sui-specific variants (see mapping table below)
2. Identify content that would benefit from Sui product-specific slides
3. Select appropriate product hero/content variants where the topic matches a Sui product
4. Add category labels (`<span class="category">LABEL</span>`) above column headings where appropriate

#### Generic-to-Sui Class Mapping

| Generic Class | Sui Class(es) | Selection Logic |
|---|---|---|
| `lead` | `lead` | Same name. Add `white` prefix for light theme. |
| *(opening cover)* | `cover-gradient` | Use with `![bg](assets/images/sui-cover.png)` for gradient covers |
| *(opening cover alt)* | `cover-stripes` | Alternative cover with striped blue background |
| *(section divider)* | `section-break` | Centered title, use with bg image |
| *(quote/statement)* | `quote` | Centered text on gradient bg. Add `white` for light variant. |
| *(table of contents)* | `toc` | Split layout: gradient left, numbered list right |
| *(basic content)* | `content` | Title + subtitle, top-left aligned |
| `cols-2` | `cols-2-center` | Sui version centers the title. Add category labels. |
| `cols-3` | `cols-3` | Same name. Add category labels. |
| `cols-4` | `cols-4` | Same name. Add category labels. |
| `cols-4` *(headlines only)* | `cols-4-minimal` | Use when only headings, no body text |
| `grid-2x2` | `grid-2x2` | Same name. Add category labels. |
| `stats` | `cols-4-stats`, `stats-side`, `stats-left` | `cols-4-stats` for 4 metrics, `stats-side` for narrative+numbers, `stats-left` for big stacked numbers |
| `split` | `split-right`, `list-right` | `split-right` for statements, `list-right` for feature cards |
| *(images + text)* | `split-image` | Text left, images right. Also `split-image-left` for reverse. |
| `fullbleed` | `fullbleed` | Same name |
| *(4 items with icons)* | `cols-4-icon` | Use `icon-marker` class on cols for Sui droplet, or `<div class="icon">` for product SVGs |
| *(product topic)* | `product-{name}`, `product-{name}-content` | When content is about a specific Sui product |
| *(8 products)* | `grid-products` | 4×2 grid with product icons and names |
| *(8 images)* | `grid-images` | 4×2 image grid |

### Step 5: Generate the Styled Deck

Create a `.md` file with:
- Frontmatter: `marp: true`, `paginate: true`, `footer: "![w:16](assets/images/sui-logo.svg) Sui"`
- Full `<style>` block copied from `assets/template-sui.md`
- Slides separated by `---`
- Sui layout class directives: `<!-- _class: layout-name -->` (or `<!-- _class: white layout-name -->` for white theme)
- Category labels: `<span class="category">LABEL TEXT</span>` above column headings
- HTML `<div>` wrappers per layout requirements
- Product SVG/PNG references where appropriate
- Background images for covers/quotes: `![bg](assets/images/sui-cover.png)`

### Step 6: Quality Check

Verify against the Sui checklist in `references/sui-slide-guidelines.md`.

---

## Sui Design Tokens

### Dark Theme (default)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#000000` | All slides — pure black |
| Headings | `#FFFFFF` | h1, h2, h3, `<strong>` |
| Body text | `#8B8B8B` | Paragraphs, lists |
| Accent | `#4DA2FF` | Blue markers, pagination, links, `<em>` |
| Separator | `#3A3A3A` | Dotted column borders |
| Card bg | `#0A0A0A` | Card containers |
| Card border | `#1A1A1A` | Card outlines |

### White/Light Theme

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#FFFFFF` | All slides — pure white |
| Headings | `#000000` | h1, h2, h3, `<strong>` |
| Body text | `#6B6B6B` | Paragraphs, lists |
| Accent | `#4DA2FF` | Blue markers, pagination, links, `<em>` |
| Separator | `#D0D0D0` | Dotted column borders |
| Card bg | `#F5F5F5` | Card containers |
| Card border | `#E8E8E8` | Card outlines |

### Shared Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Font | `Inter` | Via Google Fonts `@import` |
| Size | 1280×720 | 16:9 standard |
| Padding | 60px | Content margin |

---

## Slide Layout Classes Reference

### `lead` — Cover / Title Slide

Large title at bottom-left with subtitle. Use for the opening slide.

```markdown
<!-- _class: lead -->

# Presentation Title

Subtitle or tagline goes here
```

White variant: `<!-- _class: white lead -->`

### `cover-gradient` — Gradient Background Cover

Title slide with the Sui blue gradient background image. White text. Hides footer/pagination.

```markdown
<!-- _class: cover-gradient -->
<!-- _paginate: false -->

![bg](assets/images/sui-cover.png)

# Presentation Title

Subtitle here
```

### `cover-stripes` — Striped Background Cover

Alternative cover using the vertical blue stripes pattern. Same structure as `cover-gradient`.

### `section-break` — Section Divider

Centered title on gradient background. Use to separate deck sections.

```markdown
<!-- _class: section-break -->
<!-- _paginate: false -->

![bg](assets/images/sui-cover.png)

# Section Title
```

### `quote` — Centered Quote

Large centered text, typically on a gradient background. Great for key statements.

```markdown
<!-- _class: quote -->
<!-- _paginate: false -->

![bg](assets/images/sui-cover.png)

The key insight goes here as a memorable statement.
```

White variant: `<!-- _class: white quote -->` (no bg image, dark text on white)

### `toc` — Table of Contents

Split layout: gradient image left with title, numbered items on right.

```markdown
<!-- _class: toc -->
<!-- _paginate: false -->

<div class="toc-left" style="background: url('assets/images/sui-cover.png') center/cover;">

# Table of Contents

</div>

<div class="toc-right">

<div class="toc-item"><span class="toc-num">01</span><span class="toc-label">Introduction</span></div>
<div class="toc-item"><span class="toc-num">02</span><span class="toc-label">Architecture</span></div>
<div class="toc-item"><span class="toc-num">03</span><span class="toc-label">Next Steps</span></div>

</div>
```

### `content` — Basic Title + Body

Simple layout with title and body text in the upper-left area.

```markdown
<!-- _class: content -->

# Presentation Title

Description paragraph goes here.
```

### `cols-4` — Four Columns with Category Labels

Four equal columns with dotted separator, blue square markers, and optional category labels.

```markdown
<!-- _class: cols-4 -->

# Section Title

<div class="grid">
<div class="col">

<span class="category">HEADLINE HERE</span>

### Column 1

Description text.

</div>
<div class="col">

<span class="category">HEADLINE HERE</span>

### Column 2

Description text.

</div>
<div class="col">

<span class="category">HEADLINE HERE</span>

### Column 3

Description text.

</div>
<div class="col">

<span class="category">HEADLINE HERE</span>

### Column 4

Description text.

</div>
</div>
```

### `cols-3` — Three Columns

Same as `cols-4` but with three columns. Supports category labels.

### `cols-2-center` — Two Columns, Centered Title

Title centered, two columns below with centered content. Supports category labels.

### `grid-2x2` — 2×2 Grid

Centered title with four items in a 2×2 grid. Supports category labels.

### `cols-4-minimal` — Four Column Headlines Only

Four columns showing only category labels + h3 headings — body text is hidden.

### `cols-4-icon` — Four Columns with Icons

Two variants:
1. **Droplet icon**: Add `icon-marker` class to cols to show Sui droplet instead of blue square
2. **Product icon**: Use `<div class="icon">![](path/to/icon.svg)</div>` above heading

```markdown
<!-- _class: cols-4-icon -->

# Products

<div class="grid">
<div class="col icon-marker">

### Headline here

Description text.

</div>
<!-- ... -->
</div>
```

### `cols-4-stats` — Four Stat Columns

Four columns each showing a category label, large stat number, and description.

```markdown
<!-- _class: cols-4-stats -->

# Key Metrics

<div class="grid">
<div class="col">

<span class="category">HEADLINE HERE</span>

<div class="stat">10.3k</div>

Description text.

</div>
<!-- ... repeat -->
</div>
```

### `stats-side` — Narrative Left, Stats Right

Title and body text on the left, stacked stat rows on the right.

### `stats-left` — Large Stacked Stats

Large stat numbers stacked vertically, left-aligned, with dotted separators.

### `split-right` — Right-Aligned Content

Title and body text aligned to the right half of the slide.

### `list-right` — Title Left, Card List Right

Title/description on the left, stacked cards on the right.

### `split-image` — Text + Images Split

Content on left half, images grid on right half. Zero padding on image side.

### `grid-products` — 4×2 Product Grid

Eight products in a 4×2 grid with icons and names.

### `grid-images` — 4×2 Image Grid

Eight image cells in a 4×2 grid.

### `fullbleed` — Full Bleed Image

No padding. Use with a background image.

---

## Product-Specific Slides

Each product has two variants:

### Hero Slide (`product-{name}`)

Centered illustration + product name with a large translucent watermark text behind.

### Content Slide (`product-{name}-content`)

Split layout: text/bullets on the left, product illustration on the right.

### Available Products

| Product | Hero Class | Content Class |
|---------|-----------|---------------|
| Seal | `product-seal` | `product-seal-content` |
| DeepBook | `product-deepbook` | `product-deepbook-content` |
| Walrus | `product-walrus` | `product-walrus-content` |
| SuiNS | `product-suins` | `product-suins-content` |
| Sui | `product-sui` | `product-sui-content` |
| Mysticeti | `product-mysticeti` | `product-mysticeti-content` |
| Nautilus | `product-nautilus` | `product-nautilus-content` |
| Passkey | `product-passkey` | `product-passkey-content` |
| zkLogin | `product-zklogin` | `product-zklogin-content` |
| Move | `product-move` | `product-move-content` |

### Available Illustrations (in `assets/images/`)

- `sui-cover.png` / `.svg` — Blue gradient background for covers/quotes/TOC
- `seal-illustration.png` / `-nobg.png` / `.svg` — Seal product illustration
- `move-illustration.png` / `-nobg.png` / `.svg` — Move code illustration
- `product-{name}.svg` — Product icon SVGs (Seal, DeepBook, Walrus, SuiNS, Sui, Mysticeti, Nautilus, Passkey, zkLogin, Move)
- `sui-logo.svg` — Sui logo for footer

Use `-nobg` variants for illustrations on dark backgrounds. Use `.svg` variants for product icons in grids.

---

## Layout Selection Guide

| If your content has... | Use this layout |
|----------------------|-----------------|
| A title + tagline (opening) | `cover-gradient` with bg image |
| A title + tagline (plain) | `lead` |
| A section divider | `section-break` with bg image |
| A memorable quote or statement | `quote` with bg image |
| A table of contents | `toc` |
| Basic title + body | `content` |
| 4 features with descriptions | `cols-4` |
| 3 key concepts | `cols-3` |
| 2 comparisons | `cols-2-center` |
| 4 items in a matrix | `grid-2x2` |
| 4 headlines only | `cols-4-minimal` |
| 4 items with icons | `cols-4-icon` |
| 4 key metrics/KPIs | `cols-4-stats` |
| Narrative + supporting numbers | `stats-side` |
| 1-3 huge headline stats | `stats-left` |
| A bold statement | `split-right` |
| Feature list (3-5 items) | `list-right` |
| Text + images side by side | `split-image` |
| 8+ products at a glance | `grid-products` |
| 8 images/screenshots | `grid-images` |
| Full-slide photograph | `fullbleed` |
| Introducing a Sui product | `product-{name}` hero |
| Deep-dive on a Sui product | `product-{name}-content` |

---

## Output Format

Save generated slide decks as `.md` files. The file is self-contained — it includes all CSS in a `<style>` block, so no external theme file is needed to render.

### Rendering

```bash
# HTML output
marp slides.md --html

# PDF output
marp slides.md --html --pdf

# PowerPoint output
marp slides.md --html --pptx

# With external theme file (alternative)
marp slides.md --html --theme assets/sui-theme.css
```

The `--html` flag is required because layout classes use HTML `<div>` elements.

---

## Important Notes

- **Always ask theme preference first.** Use `AskUserQuestion` before generating slides.
- **Dark is the default.** If the user doesn't specify, use dark theme.
- **White theme uses `white` class.** Add it as a prefix: `<!-- _class: white cols-4 -->`.
- **Cover slides use background images.** Use `![bg](assets/images/sui-cover.png)` for gradient covers, quotes, section breaks, and TOC.
- **Category labels are optional but recommended.** Add `<span class="category">LABEL</span>` above column h3 headings for the full corporate look.
- **Droplet icon marker** can replace blue squares in columns by adding `icon-marker` class to `.col` divs.
- **HTML is required for layouts.** Multi-column and grid layouts use `<div class="grid"><div class="col">` wrappers.
- **Product illustrations are in the repo.** Use `-nobg.png` variants for dark backgrounds, `.svg` for icons.
- **Embedded CSS means self-contained.** Each generated `.md` file includes the full `<style>` block.
