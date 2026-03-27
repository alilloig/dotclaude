# Marp Slide Content Creator

A Claude Code skill for turning source material into well-structured Marp presentation markdown.

## What It Does

Generates presentation slide content from user-provided markdown/text files. Outputs generic Marp markdown that is renderable with any theme. Focuses on content synthesis, information architecture, and slide quality best practices.

## File Structure

```
marp-slide-content/
├── SKILL.md                          # Main skill instructions
├── README.md                         # This file
└── references/
    ├── slide-best-practices.md       # Generic slide quality guidelines
    ├── marp-syntax.md                # Core Marp markdown syntax
    ├── image-patterns.md             # Image and background syntax
    ├── theme-css-guide.md            # CSS theme creation guide
    └── advanced-features.md          # Math, emoji, CLI features
```

## Output

Generated `.md` files are generic Marp markdown with:
- Standard frontmatter (`marp: true`, `paginate: true`)
- Generic layout class names (`lead`, `cols-2`, `cols-3`, `cols-4`, `grid-2x2`, `stats`, `split`, `fullbleed`)
- HTML `<div>` wrappers for multi-column layouts

## Rendering

```bash
marp slides.md --html
marp slides.md --html --pdf
marp slides.md --html --pptx
```

The `--html` flag is required for layout class `<div>` elements.

## Companion Skills

For branded output, apply a theming skill to the generated content:
- `/sui-marp-theme` — Sui corporate dark theme
