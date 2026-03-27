---
name: sui-marp-theme
description: |
  Apply the Sui corporate dark theme to Marp slide markdown. Transforms generic
  slide content into a polished Sui-branded deck with embedded CSS, design tokens
  (#000 background, #4DA2FF accent, Inter font), 17+ layout classes, and product
  illustrations (Seal, DeepBook, Walrus, etc.). Use when: (1) styling slides with
  Sui branding, (2) applying Sui design tokens and layout classes, (3) adding product
  hero slides, (4) turning any Marp markdown into a Sui presentation. Works on output
  from /marp-slide-content or any Marp markdown. Can also accept raw source material
  directly — it will structure the content before applying the theme.
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
---

# Sui Marp Theme — Presentation Styling Skill

Apply the Sui corporate dark theme to Marp slide markdown. All slides use a single dark corporate theme with Sui design tokens.

## Quick Start

1. **Accept the user's Marp slide `.md` file** (or raw source material)
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

### Step 1: Accept Input

Ask for the path to the user's Marp `.md` file OR raw source material.

> "Please provide the path to your Marp slide markdown file, or paste the content you'd like to turn into a Sui presentation."

If the user provides raw source material (markdown/text that is NOT already Marp slides), first structure it into slides following content best practices (concise titles 3-6 words, 3-5 bullets per slide, 1 slide = 1 message, appropriate slide count) before applying the theme. If the input is already Marp markdown, proceed directly to theming.

### Step 2: Read References

Before generating slides, read these reference files:

1. `assets/template-sui.md` — full embedded CSS and layout class examples
2. `references/sui-slide-guidelines.md` — Sui-specific quality guidelines, design tokens, layout selection

### Step 3: Map to Sui Layout Classes

Analyze the input slides and:

1. Map generic layout classes to Sui-specific variants (see mapping table below)
2. Identify content that would benefit from Sui product-specific slides
3. Select appropriate product hero/content variants where the topic matches a Sui product

#### Generic-to-Sui Class Mapping

| Generic Class | Sui Class(es) | Selection Logic |
|---|---|---|
| `lead` | `lead` | Same name |
| `cols-2` | `cols-2-center` | Sui version centers the title |
| `cols-3` | `cols-3` | Same name |
| `cols-4` | `cols-4`, `cols-4-minimal`, `cols-4-icon` | Use `cols-4` for descriptions, `cols-4-minimal` for headlines only, `cols-4-icon` if icons present |
| `grid-2x2` | `grid-2x2` | Same name |
| `stats` | `cols-4-stats`, `stats-side`, `stats-left` | Use `cols-4-stats` for 4 metrics, `stats-side` for narrative+numbers, `stats-left` for 1-2 big numbers |
| `split` | `split-right`, `list-right` | Use `split-right` for statements, `list-right` for feature lists with cards |
| `fullbleed` | `fullbleed` | Same name |
| *(product topic)* | `product-{name}`, `product-{name}-content` | When content is about a specific Sui product |

### Step 4: Generate the Styled Deck

Create a `.md` file with:
- Frontmatter: `marp: true`, `paginate: true`, `footer: "Sui"`
- Full `<style>` block copied from `assets/template-sui.md`
- Slides separated by `---`
- Sui layout class directives: `<!-- _class: layout-name -->`
- HTML `<div>` wrappers per layout requirements
- Product SVG references where appropriate

### Step 5: Quality Check

Verify against the Sui checklist in `references/sui-slide-guidelines.md`.

---

## Sui Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#000000` | All slides — pure black |
| Headings | `#FFFFFF` | h1, h2, h3, `<strong>` |
| Body text | `#8B8B8B` | Paragraphs, lists |
| Accent | `#4DA2FF` | Blue markers, pagination, links, `<em>` |
| Separator | `#3A3A3A` | Dotted column borders |
| Card bg | `#0A0A0A` | Card containers |
| Card border | `#1A1A1A` | Card outlines |
| Font | `Inter` | Via Google Fonts `@import` |
| Size | 1280x720 | 16:9 standard |
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

### `cols-4` — Four Columns with Markers

Four equal columns with blue square markers before h3 headings and body text below. Dotted separator on top of each column.

```markdown
<!-- _class: cols-4 -->

# Section Title

<div class="grid">
<div class="col">

### Column 1

Description text for this column.

</div>
<div class="col">

### Column 2

Description text for this column.

</div>
<div class="col">

### Column 3

Description text for this column.

</div>
<div class="col">

### Column 4

Description text for this column.

</div>
</div>
```

### `cols-3` — Three Columns

Same as `cols-4` but with three columns.

```markdown
<!-- _class: cols-3 -->

# Section Title

<div class="grid">
<div class="col">

### Column 1

Body text.

</div>
<div class="col">

### Column 2

Body text.

</div>
<div class="col">

### Column 3

Body text.

</div>
</div>
```

### `cols-2-center` — Two Columns, Centered Title

Title centered, two equal columns below.

```markdown
<!-- _class: cols-2-center -->

# Centered Title

<div class="grid">
<div class="col">

### Left Column

Body text.

</div>
<div class="col">

### Right Column

Body text.

</div>
</div>
```

### `grid-2x2` — 2x2 Grid

Centered title with four items in a 2x2 grid.

```markdown
<!-- _class: grid-2x2 -->

# Grid Title

<div class="grid">
<div class="col">

### Top Left

Body text.

</div>
<div class="col">

### Top Right

Body text.

</div>
<div class="col">

### Bottom Left

Body text.

</div>
<div class="col">

### Bottom Right

Body text.

</div>
</div>
```

### `cols-4-minimal` — Four Column Headlines Only

Four columns showing only h3 headings — body text is hidden.

```markdown
<!-- _class: cols-4-minimal -->

# Key Areas

<div class="grid">
<div class="col">

### Area 1

</div>
<div class="col">

### Area 2

</div>
<div class="col">

### Area 3

</div>
<div class="col">

### Area 4

</div>
</div>
```

### `fullbleed` — Full Bleed Image

No padding. Use with a background image.

```markdown
<!-- _class: fullbleed -->

![bg](path/to/image.png)
```

### `cols-4-icon` — Four Columns with Icons

Four columns with a product icon image above each heading.

```markdown
<!-- _class: cols-4-icon -->

# Products

<div class="grid">
<div class="col">

<div class="icon">

![](../assets/images/product-seal.svg)

</div>

### Seal

Description text.

</div>
<!-- repeat for remaining columns -->
</div>
```

### `cols-4-stats` — Four Stat Columns

Four columns each showing a large number and label. Numbers rendered in accent blue.

```markdown
<!-- _class: cols-4-stats -->

# Key Metrics

<div class="grid">
<div class="col">

<div class="stat">390ms</div>
<div class="stat-label">Time to Finality</div>

</div>
<div class="col">

<div class="stat">297K</div>
<div class="stat-label">Peak TPS</div>

</div>
<div class="col">

<div class="stat">65B+</div>
<div class="stat-label">Total Transactions</div>

</div>
<div class="col">

<div class="stat">$1.5B+</div>
<div class="stat-label">TVL</div>

</div>
</div>
```

### `stats-side` — Narrative Left, Stats Right

Title and body text on the left, stacked stat rows on the right.

```markdown
<!-- _class: stats-side -->

<div class="content">

# Title

Narrative paragraph explaining the context.

</div>

<div class="stats">
<div class="stat-row">

<div class="stat">65B+</div>
<div class="stat-label">Total Transactions</div>

</div>
<div class="stat-row">

<div class="stat">$1.5B+</div>
<div class="stat-label">Total Value Locked</div>

</div>
</div>
```

### `stats-left` — Large Stacked Stats

Large stat numbers stacked vertically on the left.

```markdown
<!-- _class: stats-left -->

<div class="grid">
<div class="col no-border">

<div class="stat-large">390ms</div>
<div class="stat-label">Time to finality</div>

</div>
<div class="col no-border">

<div class="stat-large">297K</div>
<div class="stat-label">Peak transactions per second</div>

</div>
</div>
```

### `split-right` — Right-Aligned Content

Title and body text aligned to the right side. Good for statements or quotes.

```markdown
<!-- _class: split-right -->

# Bold Statement

Supporting text that provides context for the statement, aligned to the right half of the slide.
```

### `list-right` — Title Left, Card List Right

Title/description on the left, stacked cards on the right.

```markdown
<!-- _class: list-right -->

<div class="content">

# Section Title

Brief description of what these items represent.

</div>

<div class="cards">
<div class="card">

#### Card Title 1

Short description.

</div>
<div class="card">

#### Card Title 2

Short description.

</div>
<div class="card">

#### Card Title 3

Short description.

</div>
</div>
```

### `grid-products` — 4x2 Product Grid

Eight products in a 4x2 grid with icons and names.

```markdown
<!-- _class: grid-products -->

# Ecosystem

<div class="grid">
<div class="col">

<div class="icon">

![](../assets/images/product-seal.svg)

</div>

### Seal

</div>
<!-- repeat for all 8 products -->
</div>
```

### `grid-images` — 4x2 Image Grid

Eight image cells in a 4x2 grid.

```markdown
<!-- _class: grid-images -->

# Gallery

<div class="grid">
<div class="col">

![](image1.png)

</div>
<!-- repeat for all 8 cells -->
</div>
```

---

## Product-Specific Slides

Use these when content is about a specific Sui ecosystem product. Each product has two variants:

### Hero Slide (`product-{name}`)

Centered illustration + product name with a large translucent watermark text behind.

### Content Slide (`product-{name}-content`)

Split layout: text/bullets on the left, product illustration on the right.

### Available Products

| Product | Hero Class | Content Class | When to Use |
|---------|-----------|---------------|-------------|
| Seal | `product-seal` | `product-seal-content` | Threshold encryption, access control |
| DeepBook | `product-deepbook` | `product-deepbook-content` | DEX, order book, liquidity |
| Walrus | `product-walrus` | `product-walrus-content` | Decentralized storage, blobs |
| SuiNS | `product-suins` | `product-suins-content` | Name service, human-readable addresses |
| Sui | `product-sui` | `product-sui-content` | The Sui network/platform itself |
| Mysticeti | `product-mysticeti` | `product-mysticeti-content` | Consensus protocol, finality |
| Nautilus | `product-nautilus` | `product-nautilus-content` | TEE, secure computation |
| Passkey | `product-passkey` | `product-passkey-content` | WebAuthn, passwordless login |
| zkLogin | `product-zklogin` | `product-zklogin-content` | Zero-knowledge auth, OAuth bridge |
| Move | `product-move` | `product-move-content` | Smart contract language, dev tools |

### Hero Slide Example

```markdown
<!-- _class: product-deepbook -->

![w:200](../assets/images/product-deepbook.svg)

# DeepBook

The native liquidity layer for Sui
```

### Content Slide Example

```markdown
<!-- _class: product-deepbook-content -->

<div class="content">

# DeepBook Protocol

DeepBook is Sui's native decentralized central limit order book.

- Central limit order book
- On-chain matching engine
- Composable with DeFi protocols
- Low-latency execution

</div>

<div class="illustration">

![](../assets/images/product-deepbook.svg)

</div>
```

---

## Layout Selection Guide

When deciding which layout to use for a piece of content:

| If your content has... | Use this layout |
|----------------------|-----------------|
| A title + tagline (opening/closing) | `lead` |
| 4 features each with 1-2 sentence descriptions | `cols-4` |
| 3 pillars/concepts with descriptions | `cols-3` |
| 2 things to compare side by side | `cols-2-center` |
| 4 categories that form a matrix | `grid-2x2` |
| 4 section headings with no detail needed | `cols-4-minimal` |
| A full-slide photograph or screenshot | `fullbleed` |
| 4 products/tools to showcase with icons | `cols-4-icon` |
| 4 key metrics/KPIs | `cols-4-stats` |
| A narrative + supporting numbers | `stats-side` |
| 1-2 huge headline statistics | `stats-left` |
| A bold statement or call to action | `split-right` |
| A feature list (4-5 items with detail) | `list-right` |
| All 8+ ecosystem products at a glance | `grid-products` |
| 8 images/screenshots to show | `grid-images` |
| Introducing a specific Sui product | `product-{name}` hero |
| Deep-dive on a specific Sui product | `product-{name}-content` |

---

## Output Format

Save generated slide decks as `.md` files. The file is self-contained — it includes all CSS in a `<style>` block, so no external theme file is needed to render.

### Rendering

The user can render with Marp CLI:

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

- **Always use the Sui theme.** Do not create alternative color schemes or override the design tokens.
- **HTML is required for layouts.** Multi-column and grid layouts use `<div class="grid"><div class="col">` wrappers. This is standard Marp behavior — HTML passes through to the output.
- **Product SVGs are in the repo.** Reference them as `../assets/images/product-{name}.svg` when generating from the assets directory, or adjust the path based on where the output file lives.
- **Embedded CSS means self-contained.** Each generated `.md` file includes the full `<style>` block, so it renders correctly without external files.
- **Companion content skill.** To generate slide content from source material first, use `/marp-slide-content`.
