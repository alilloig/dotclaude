---
name: marp-slide-content
description: |
  Turn source material (markdown, text, documentation) into well-structured
  Marp slide content with clear information architecture. Synthesizes key messages,
  applies presentation best practices (concise titles, 3-5 bullets, 1 slide = 1 message),
  and outputs generic Marp markdown that any theme can style. Use when: (1) turning
  docs or notes into a presentation, (2) creating slides from user-provided content,
  (3) structuring technical material for visual delivery. Pair with a theming skill
  like /sui-marp-theme for branded output.
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
---

# Marp Slide Content Creator

Create well-structured presentation content from source material. Outputs generic Marp markdown that any theme can style.

## Quick Start

1. Ask user for source material (markdown/text files)
2. Read references: `references/slide-best-practices.md`, `references/marp-syntax.md`
3. Plan slide structure, generate generic Marp markdown, quality check

## When This Skill Applies

Activate when user requests a presentation, slide deck, wants to turn content/documentation into slides, mentions "Marp", "slides", "presentation", or "deck" — and does NOT specify a particular brand/theme (if they say "Sui slides" or "Sui presentation", the `/sui-marp-theme` skill is more appropriate).

## Mandatory Workflow

### Step 1: Request Knowledge Source

Ask user for path to markdown/text files. Inline content is also acceptable.

**Key constraint:** All factual content must come from user's source material. Never fabricate.

### Step 2: Read References

Read these reference files in order of importance:

1. `references/slide-best-practices.md` — slide quality guidelines and layout selection thinking
2. `references/marp-syntax.md` — core Marp markdown syntax
3. `references/image-patterns.md` — image and background syntax
4. `references/theme-css-guide.md` — how CSS themes work (useful context)
5. `references/advanced-features.md` — math, emoji, CLI features

### Step 3: Plan Slide Structure

Based on source material:

1. Identify core message and key sections
2. Map each section to an appropriate layout concept (see Layout Concepts table)
3. Plan 1 slide = 1 message
4. Target right slide count for presentation length

### Step 4: Generate the Deck

Create a `.md` file with:

- Frontmatter: `marp: true`, `paginate: true`
- Slides separated by `---`
- Layout class directives using generic class names: `<!-- _class: layout-name -->`
- HTML `<div class="grid"><div class="col">` wrappers for multi-column layouts
- Clean, well-structured markdown content

### Step 5: Quality Check

Verify against the generic checklist in `references/slide-best-practices.md`.

## Generic Layout Concepts

| If your content has... | Use this layout class | Structure |
|---|---|---|
| A title + tagline (opening/closing) | `lead` | Large h1 + subtitle |
| 4 features with descriptions | `cols-4` | `<div class="grid">` with 4 `<div class="col">` |
| 3 pillars/concepts with descriptions | `cols-3` | `<div class="grid">` with 3 `<div class="col">` |
| 2 things to compare side by side | `cols-2` | `<div class="grid">` with 2 `<div class="col">` |
| 4 categories forming a matrix | `grid-2x2` | `<div class="grid">` with 4 `<div class="col">` |
| Key metrics/KPIs (2-4 numbers) | `stats` | `<div class="stat">` + `<div class="stat-label">` |
| A bold statement or call to action | `split` | Right-aligned content block |
| A full-slide photograph or screenshot | `fullbleed` | Background image, no padding |
| Standard content (bullets, paragraphs) | *(no class)* | Default slide with h1 + content |

## Output Format

Generated `.md` files use generic Marp markdown. They are renderable with Marp's default theme (plain white). For branded visual output, apply a theming skill afterward.

Example output structure:

```markdown
---
marp: true
paginate: true
---

<!-- _class: lead -->

# Presentation Title

Subtitle or tagline

---

# Section Title

- Key point one
- Key point two
- Key point three

---

<!-- _class: cols-3 -->

# Three Concepts

<div class="grid">
<div class="col">

### Concept 1

Description text.

</div>
<div class="col">

### Concept 2

Description text.

</div>
<div class="col">

### Concept 3

Description text.

</div>
</div>
```

## Rendering

```bash
marp slides.md --html
marp slides.md --html --pdf
marp slides.md --html --pptx
```

The `--html` flag is required because layout classes use HTML `<div>` elements.

## Important Notes

- **Never fabricate content.** All facts, statistics, and claims must come from the user's source material.
- **HTML is required for layouts.** Multi-column and grid layouts use `<div class="grid"><div class="col">` wrappers.
- **Output is theme-agnostic.** The generated markdown works with any Marp theme. For Sui-branded output, apply `/sui-marp-theme` to the result.
- **1 slide = 1 message.** Each slide should convey exactly one idea or point.
