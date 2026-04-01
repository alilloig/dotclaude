---
name: marp-slide-content
description: |
  Turn source material into compelling Marp slide decks with narrative structure,
  assertion headlines, and presentation craft. Applies storytelling best practices
  (assertion titles, curiosity gaps, visual rhythm, tangible language, intentional
  imagery with placeholders when unavailable) and outputs generic Marp markdown
  that any theme can style. Use when: (1) turning docs or notes into a presentation,
  (2) creating slides from user-provided content, (3) structuring technical material
  for visual delivery. Pair with a theming skill like /sui-marp-theme for branded output.
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
---

# Marp Slide Content Creator

Create compelling presentation content from source material. Produces decks with assertion headlines, narrative structure, and visual rhythm. Outputs generic Marp markdown that any theme can style.

## Quick Start

1. Ask user for source material (markdown/text files)
2. Read references: `references/slide-best-practices.md`, `references/marp-syntax.md`
3. Plan narrative arc, write assertion titles, map to layouts, generate Marp markdown, quality check

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

### Step 3: Plan Narrative Arc and Slide Structure

Based on source material:

1. Identify the core argument and the tension it resolves (what problem does this presentation address?)
2. Plan the narrative arc: opening tension → evidence → resolution
3. **Write all assertion titles first** as a standalone sequence. Each title is a complete sentence stating a claim or insight — not a topic label. Read the sequence: it should form a coherent executive summary.
4. Map each section to an appropriate layout concept (see Layout Concepts table)
5. Plan visual rhythm: vary layout types, insert section breaks between major topics, alternate dense and light slides
6. Target right slide count for presentation length

### Step 4: Generate the Deck

Create a `.md` file with:

- Frontmatter: `marp: true`, `paginate: true`
- Slides separated by `---`
- **Assertion headlines** on every content slide (complete sentences, not topic labels)
- Layout class directives using generic class names: `<!-- _class: layout-name -->`
- HTML `<div class="grid"><div class="col">` wrappers for multi-column layouts
- Clean, well-structured markdown content
- **Image placeholders** when source material has no images (see below)

#### Image Placeholders

When the source material does not include images, **never fabricate image URLs or reference nonexistent files.** Instead:

- Prefer text-only slides with bold typography — these are strong on their own
- Where an image would genuinely strengthen the slide, add a visible placeholder and a comment:
  ```markdown
  <div style="background: #1a1a1a; padding: 40px; text-align: center; color: #666; font-style: italic; border: 1px dashed #333;">
  Photo: Development team collaborating around a whiteboard
  </div>
  <!-- IMAGE: Candid team photo. Purpose: humanize the "developer experience" claim. Warm, authentic. -->
  ```
- The visible `<div>` shows where the image belongs in the rendered draft; the comment describes the ideal image for whoever supplies it later

### Step 5: Quality Check

Verify against the three-part checklist (Craft, Rhythm, Formatting) in `references/slide-best-practices.md`. Pay special attention to:

- **Storyline test**: read all titles in sequence — they should form a coherent executive summary
- **Assertion test**: every content slide title is a claim, not a topic label
- **Rhythm test**: no 3+ consecutive slides with the same layout

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

Example output structure (note assertion headlines and visual rhythm):

```markdown
---
marp: true
paginate: true
---

<!-- _class: lead -->

# Blockchain adoption stalls because developers can't ship fast enough

The speed-to-deploy gap is the real barrier — not consensus performance

---

# Current tooling forces developers to choose between safety and speed

- Smart contract languages lack ownership semantics
- State management requires manual lock coordination
- Testing cycles take 10x longer than equivalent web development

---

<!-- _class: cols-3 -->

# Three architectural choices close the speed gap

<div class="grid">
<div class="col">

### Object-centric storage

Every asset is a first-class object with built-in ownership — no manual state management.

</div>
<div class="col">

### Parallel execution

Independent transactions process simultaneously, eliminating sequential bottlenecks.

</div>
<div class="col">

### Move's type system

Ownership enforced at compile time — bugs caught before deployment, not after.

</div>
</div>

---

<!-- _class: fullbleed -->

<div style="background: #1a1a1a; padding: 60px; text-align: center; color: #666; font-style: italic; border: 1px dashed #333; height: 100%; display: flex; align-items: center; justify-content: center;">
Photo: Developer team shipping a product launch, candid celebration moment
</div>
<!-- IMAGE: Authentic team photo at a product launch. Purpose: emotional proof that faster shipping = happier teams. Warm, energetic. -->
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
- **Write assertion headlines, not topic labels.** Every content slide title is a complete sentence stating a claim the slide body supports.
- **Plan the narrative arc first.** Write all titles as a sequence before building individual slides. The title sequence should read as a coherent executive summary.
- **When images aren't available, use placeholders — never fabricate.** Don't reference nonexistent image files. Use visible placeholder `<div>`s with descriptive text plus HTML comments describing the ideal image.
- **HTML is required for layouts.** Multi-column and grid layouts use `<div class="grid"><div class="col">` wrappers.
- **Output is theme-agnostic.** The generated markdown works with any Marp theme. For Sui-branded output, apply `/sui-marp-theme` to the result.
- **1 slide = 1 message.** Each slide should convey exactly one idea or point.
- **Vary slide types for rhythm.** Alternate between data, image, statement, and multi-column slides. Avoid 3+ consecutive slides with the same layout.
