# Slide Creation Best Practices

Guidelines for creating high-impact presentation slides that tell a story, sustain attention, and make ideas stick.

---

## 1. Assertion Headlines

Every slide title must be a complete sentence stating a conclusion, claim, or insight — never a topic label.

### The Rule

Write titles that answer "so what?" If someone read only your titles in sequence, they should understand the full argument. This is the **storyline test**: the sequence of titles reads as an executive summary.

### Good Examples

```markdown
# Revenue grew 40% YoY driven by enterprise expansion
# We are losing share in mid-market despite increased spend
# Object-centric storage enables parallel execution by default
# Three architectural choices make sub-second finality possible
# Developers ship 5x faster with Move's ownership model
```

### Bad Examples (Topic Labels)

```markdown
# Revenue Performance        ← What about it?
# Market Overview             ← Overview says nothing
# Core Infrastructure         ← Label, not insight
# Developer Experience        ← No claim, no direction
# Q3 Results                  ← A filing cabinet tab, not a headline
```

### Guidelines

- **Max ~15 words.** Active voice. Includes the "so what."
- **Write all titles first** before building slides. Read them as a sequence. If they don't form a coherent argument, restructure.
- **Each title is a claim the slide's body supports.** The body provides evidence for the headline's assertion.
- **Acceptable short titles**: Section dividers, chapter breaks, and cover slides can use short titles (2-5 words) when they serve as structural markers, not content carriers.

---

## 2. Deck-Level Narrative Structure

Plan the story arc before planning individual slides. A presentation is a journey, not a list.

### Narrative Arc

1. **Open with tension.** A question, a surprising fact, or a vivid problem that the rest of the deck resolves. The audience needs a reason to keep listening.
2. **Build evidence progressively.** Don't front-load all conclusions. Let insight emerge from evidence. Each slide should feel like it earns the next.
3. **Alternate "what is" and "what could be."** This creates momentum. Show the current state, then the better future. Current pain, then the solution. The gap between them is what keeps attention.
4. **Resolve the opening tension.** Return to the question or problem from slide 1 and show how the deck has answered it. Circularity creates closure and makes the deck feel complete.

### Structural Roles

Each position in the deck has a narrative job:

| Position | Narrative Role | Example |
|----------|---------------|---------|
| Cover slide | Set the tension or promise | A provocative title or question |
| Overview / TOC | Make a promise about what the audience will learn | 3-4 sections that map the journey |
| Content slides | Provide evidence, examples, data | Each slide supports its assertion headline |
| Section breaks | Reset attention and signal "new chapter" | Full-bleed image or bold statement |
| Summary / CTA | Resolve the tension, call to action | Return to the opening and answer it |

### Recommended Slide Count

- 5-minute pitch: 5-8 slides
- 10-minute talk: 10-15 slides
- 20-minute presentation: 15-25 slides

---

## 3. Voice and Tone

Presentations are spoken. Write like a person with a point of view, not a committee drafting a memo.

### Do

- Use **"we"** and **"I"**, not "the organization" or passive constructions
- Write titles as things you would **say out loud** — if it sounds awkward spoken, rewrite it
- **Have an opinion**: "We should double down on SMB" beats "SMB Segment Analysis"
- **Be specific**: name the customer, the team, the city, the metric. Specificity signals authenticity.
- Use short, direct sentences. Fragments are fine on slides.

### Avoid

- **Institutional language**: "leveraging synergies", "going forward", "key takeaways", "holistic approach"
- **Passive voice on content slides**: "It was determined that..." → "We found that..."
- **Hedge words**: "potentially", "arguably", "it could be said" — commit to the claim or remove the slide
- **Noun pile-ups**: "Customer acquisition cost optimization strategy" → "We cut acquisition costs 30%"

---

## 4. Making Ideas Tangible

Abstract ideas don't stick. Ground every claim in something the audience can see, count, or feel.

### Techniques

- **Replace adjectives with numbers.** Not "significant growth" but "3x in 18 months." Not "fast finality" but "under 400ms."
- **Use human-scale analogies.** "That's the size of every Wikipedia article ever written" is tangible. "2.7 petabytes" is not.
- **Show before/after pairs.** A screenshot of old vs. new, a code snippet of verbose vs. concise, a workflow of 12 steps vs. 3. Before/after communicates what paragraphs cannot.
- **One specific example beats a general claim.** "Acme Corp reduced support tickets 60% in 3 weeks" over "customers see improved efficiency."

### The "So What" Test

For every slide, ask: *Could someone act on this?* If the answer is no, the slide is too abstract. Add a number, an example, or a comparison.

---

## 5. Sustaining Curiosity

A 20-slide deck should feel like a story unfolding, not a list being read.

### Progressive Revelation

- **One idea per slide.** Never front-load all conclusions on a single slide.
- **Evidence before conclusion.** Show the data, then reveal the insight. Don't announce "Revenue is up" then show the chart — show the chart, let the trend register, then name it.
- **Curiosity gap.** Present the problem before the answer. Ask the question before giving the answer. The gap between question and answer is where attention lives.

### Visual Rhythm

- **Vary slide types.** Alternate between data slides, image slides, statement slides, and multi-column slides. Five identical layouts in a row signals autopilot.
- **Section breaks reset attention.** A full-bleed image or a single bold statement on a dark slide tells the audience "new chapter" and resets their focus.
- **Pace dense and light slides.** Follow a data-heavy slide with a simple statement. Follow a complex diagram with breathing room.

### Red Flag

If you find 3+ consecutive slides with the same layout class, consider whether the audience will still be engaged. Introduce a break, a different format, or a full-bleed image.

---

## 6. Using Images Intentionally

Images earn their place by creating emotional connection or making an abstraction concrete. Decoration is not a reason.

### When to Use Images

- To show a **real thing**: a product, a customer, a place, a team, a screenshot
- To create **emotional weight**: the scale of a problem, the feeling of a solution
- To make an **abstraction concrete**: a diagram, an architecture overview, a before/after

### When NOT to Use Images

- When the image merely **"relates to the topic"** — a generic handshake, a stock photo of a server room, a globe
- When the image **competes with text** — if both image and text are fighting for attention, remove one
- When the image is **decorative filler** — empty slides are better than poorly-imaged slides

### Image Placement

- **Full-bleed** (edge-to-edge) creates cinematic impact. Place text on a quiet area of the image, or use a darkened overlay.
- **One image per slide.** Collages dilute impact. Exception: explicit comparison/grid layouts.
- **Background images** (`![bg]`) for atmosphere. **Content images** (`![]`) for specific things the audience needs to examine.

### When Images Are Not Available — Placeholder Strategy

If the source material has no images, **do not fabricate image URLs or reference nonexistent files.** Instead:

1. **Prefer text-only slides.** Solid-color backgrounds with bold typography are always stronger than missing or fake images. An assertive headline on a clean background is a valid, flashy slide.

2. **Mark where images would add value.** Use a two-layer placeholder:
   - **Visible placeholder** — a styled `<div>` or background color that shows the image's intended position in the rendered draft:
     ```markdown
     <div style="background: #1a1a1a; padding: 40px; text-align: center; color: #666; font-style: italic; border: 1px dashed #333;">
     Photo: Customer team using the product in their office
     </div>
     ```
   - **Comment for the designer** — an HTML comment with the ideal image description:
     ```markdown
     <!-- IMAGE: Candid photo of a development team collaborating around a screen.
          Purpose: humanize the "developer experience" claim. Warm, authentic tone. -->
     ```

3. **Abstract/geometric backgrounds** as stand-ins are acceptable when a slide needs visual weight but no specific image exists. Use solid colors, subtle gradients, or branded patterns.

---

## 7. Visual Hierarchy and Readability

The most striking slides are the simplest. Visual impact and clarity reinforce each other.

### The Formula

**Fewer elements + higher contrast + more whitespace = polished AND clear.**

### Principles

- **High contrast only.** Dark text on light background, or light text on dark background. Never medium-on-medium.
- **Generous whitespace.** Emptiness is a design tool. Cramped slides feel desperate. If the content doesn't fill the slide, let it breathe — don't add filler.
- **Left-align body text.** Center alignment works for short titles and statements. Anything longer than a phrase should be left-aligned.
- **One visual focal point per slide.** If the audience's eye has nowhere to land, nothing gets read.
- **Two font sizes maximum per slide** (title + body). Avoid mixing three or more sizes unless it's a deliberate stats layout.

### Text Amount

A well-balanced content slide:

```markdown
# Three architectural choices make sub-second finality possible

- Narwhal/Bullshark consensus separates data availability from ordering
- Object-centric storage eliminates global state contention
- Parallel execution processes independent transactions simultaneously
```

Too crowded:

```markdown
# About the Architecture and How It Enables Performance

The blockchain introduces a revolutionary approach to consensus
that enables unprecedented performance through three key innovations
which we will now examine in the following detailed breakdown:
- Innovation 1: The first innovation involves a novel approach to...
- Innovation 2: Additionally, the system employs a technique where...
(continues)
```

---

## 8. Bullet Points

### Guidelines

- **3-5 items per slide.** More than 5 means the slide carries too many ideas — split it.
- **Parallel structure.** Same grammatical form at the same level.
- **Concise.** One line per point. If a bullet wraps to two lines, it's too long.
- **Start with the strong word.** Lead with the verb or the key noun, not "The first thing is..."

### Good Example

```markdown
- Separate data availability from ordering
- Eliminate global state contention
- Process independent transactions in parallel
```

### Bad Example

```markdown
- The blockchain uses a novel approach to consensus that enables transactions to be finalized very quickly
- Fast
- The next item is completely different in format and length, which makes the list hard to scan
```

---

## 9. Layout Selection Thinking

Match the layout to the content shape, not the other way around. Never force content into a layout that doesn't fit.

| If your content has... | Layout approach |
|---|---|
| A title + tagline (opening/closing) | Cover/title layout |
| 4 features each with 1-2 sentence descriptions | Four-column layout |
| 3 pillars/concepts with descriptions | Three-column layout |
| 2 things to compare side by side | Two-column layout |
| 4 categories that form a matrix | 2x2 grid layout |
| 4 section headings with no detail needed | Minimal column headlines |
| A full-slide photograph or screenshot | Full-bleed image layout |
| Key metrics/KPIs | Statistics layout |
| A narrative + supporting numbers | Narrative + stats split |
| A bold statement or call to action | Right-aligned statement |
| A feature list (4-5 items with detail) | Card list layout |
| 8+ images/screenshots to show | Image grid layout |
| A moment to pause and reset attention | Section break (image or statement) |

---

## 10. Quality Checklist

After completing slides, verify against all three categories.

### Craft (message quality)

- [ ] **Storyline test**: Do the titles, read in sequence, form a coherent executive summary?
- [ ] **Assertion test**: Is every content slide title a claim or insight, not a topic label?
- [ ] **Tangibility test**: Are abstract ideas grounded in numbers, examples, or comparisons?
- [ ] **Image intent test**: Does every image earn its place? Would the slide be better without it?
- [ ] **Voice test**: Would these titles sound natural if spoken aloud to a colleague?
- [ ] **Curiosity test**: Does the opening slide create tension that the deck resolves?

### Rhythm (attention management)

- [ ] **Variety test**: Are there 3+ consecutive slides with the same layout? (Red flag — insert a break)
- [ ] **Pacing test**: Do dense/data slides alternate with lighter statement or image slides?
- [ ] **Section breaks**: Are there visual breathers between major sections?

### Formatting (readability)

- [ ] Are titles concise (assertion in ~15 words or fewer)?
- [ ] Are bullet points 3-5 items per slide?
- [ ] Is it 1 slide = 1 message?
- [ ] Is the text amount appropriate for 16:9 format?
- [ ] Is there sufficient whitespace?
- [ ] Is there overall visual consistency?
- [ ] Is the slide count appropriate for the time slot?
- [ ] Do layout choices match the content type?
