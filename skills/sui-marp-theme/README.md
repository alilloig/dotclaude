# Sui Marp Theme

A Claude Code skill for applying the Sui corporate dark theme to Marp slide presentations.

## What It Does

Takes Marp slide markdown (or raw source material) and transforms it into a polished Sui-branded presentation with the dark corporate theme, 17+ layout classes, and product illustrations.

## File Structure

```
sui-marp-theme/
├── SKILL.md                          # Main skill instructions
├── README.md                         # This file
├── assets/
│   ├── sui-theme.css                 # Standalone Marpit CSS theme
│   ├── template-sui.md               # Self-contained Marp template
│   └── images/
│       ├── sui-logo.svg              # Sui droplet logo
│       ├── product-seal.svg          # Seal product illustration
│       ├── product-deepbook.svg      # DeepBook product illustration
│       ├── product-walrus.svg        # Walrus product illustration
│       ├── product-suins.svg         # SuiNS product illustration
│       ├── product-sui.svg           # Sui product illustration
│       ├── product-mysticeti.svg     # Mysticeti product illustration
│       ├── product-nautilus.svg      # Nautilus product illustration
│       ├── product-passkey.svg       # Passkey product illustration
│       ├── product-zklogin.svg       # zkLogin product illustration
│       └── product-move.svg          # Move product illustration
└── references/
    └── sui-slide-guidelines.md       # Sui-specific quality guidelines
```

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#000000` | Pure black |
| Headings | `#FFFFFF` | h1, h2, h3 |
| Body text | `#8B8B8B` | Paragraphs, lists |
| Accent | `#4DA2FF` | Blue markers, links |
| Separator | `#3A3A3A` | Dotted borders |
| Font | Inter | Google Fonts import |
| Size | 1280x720 | 16:9 |

## Layout Classes Quick Reference

| Class | Description |
|-------|-------------|
| `lead` | Cover/title slide — large h1 bottom-left |
| `cols-4` | 4 columns with blue markers + body |
| `cols-3` | 3 columns |
| `cols-2-center` | 2 columns, centered title |
| `grid-2x2` | 2x2 grid, centered title |
| `cols-4-minimal` | 4 column headlines only |
| `fullbleed` | Full image, no padding |
| `cols-4-icon` | 4 columns with icons |
| `cols-4-stats` | 4 stat number columns |
| `stats-side` | Narrative left, stats right |
| `stats-left` | Large stacked stats |
| `split-right` | Right-aligned content |
| `list-right` | Title left, card list right |
| `grid-products` | 4x2 product grid with icons |
| `grid-images` | 4x2 image grid |
| `product-{name}` | Product hero (watermark) |
| `product-{name}-content` | Product content (split) |

Products: `seal`, `deepbook`, `walrus`, `suins`, `sui`, `mysticeti`, `nautilus`, `passkey`, `zklogin`, `move`

## Rendering

Generated `.md` files are self-contained (CSS embedded in `<style>` block).

```bash
marp slides.md --html
marp slides.md --html --pdf
marp slides.md --html --pptx
marp slides.md --html --theme assets/sui-theme.css
```

The `--html` flag is required for layout class `<div>` elements.

## Companion Skills

- `/marp-slide-content` — Generate slide content from source material (run this first, then apply Sui theme)

## Based On

Split from the original `sui-marp-slide` skill, separating content synthesis from visual theming.
