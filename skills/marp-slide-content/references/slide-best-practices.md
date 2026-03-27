# Slide Creation Best Practices

Guidelines for creating high-quality presentation slides.

## Slide Titles (h1 / h2)

### Good Examples
- **Concise**: 3-6 words maximum
- **Clear**: Content is immediately understandable
- **Consistent**: Same style at the same hierarchy level

```markdown
# Core Infrastructure
# Network Performance
# Developer Experience
# Platform Overview
```

### Bad Examples
```markdown
# In this section we will explain the core infrastructure of Sui
# What are the challenges we are currently facing with blockchain adoption
```

## Bullet Points

### Good Examples
- **3-5 items**: Not too many per slide
- **Concise**: One line per point
- **Parallel**: Same grammatical structure at the same level

```markdown
- Sub-second finality
- Parallel transaction execution
- Object-centric storage model
```

### Bad Examples
```markdown
- The blockchain uses a novel approach to consensus that enables transactions to be finalized in under one second
- Fast
- The next item is completely different in format. This inconsistency makes it hard to read and follow.
```

## Slide Structure

### Basic Structure

1. **Cover Slide** (use a `lead` or title layout)
   - Presentation title
   - Subtitle or tagline
   - Date/presenter (optional)

2. **Overview Slide** (standard or minimal column layout)
   - Show overall structure
   - 3-5 key sections

3. **Content Slides** (use appropriate layout concepts)
   - 1 slide = 1 message
   - Title summarizes the slide content
   - Select layout that matches the content type

4. **Summary / Call-to-Action Slide** (statement or standard layout)
   - Reconfirm key points
   - Next steps or CTA

### Recommended Slide Count

- 5-minute pitch: 5-8 slides
- 10-minute talk: 10-15 slides
- 20-minute presentation: 15-25 slides

## Text Amount

### Good Balance

```markdown
# Object Model

- Every asset is a first-class object
- Unique ownership semantics
- Composable across protocols
- Parallel execution by default
```

### Too Crowded

```markdown
# About the Object Model

The blockchain introduces a revolutionary approach to data modeling
that treats every digital asset as a first-class object with unique
ownership semantics. The main features include the following 7 points:
- Feature 1: Detailed explanation continues at length...
- Feature 2: Even more detailed explanation...
(Continued)
```

## Using Whitespace

- **Adequate whitespace**: Don't cram too much information
- **Visual guidance**: Layout that naturally draws eyes to important information
- **Breathing room**: Appropriate pauses between dense content slides

## Using Images

### Effective Usage

- **Clear purpose**: To aid understanding, not just decoration
- **Appropriate size**: Neither too large nor too small
- **Consider background contrast**: Ensure images work on the target theme's background color

### Layout Tips

```markdown
<!-- Text on left, image on right -->
![bg right:40%](image.png)

- Point 1
- Point 2
```

## Layout Selection Thinking

When deciding which layout to use, think about your content's structure:

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

The key principle: match the layout to the content shape, not the other way around. Don't force content into a layout that doesn't fit.

## Animations and Transitions

Marp does not support animations by default. Focus on clear slide progression and visual hierarchy through layout variation.

## Quality Checklist

After completing slides, verify:

- [ ] Are titles concise (3-6 words)?
- [ ] Are bullet points 3-5 items per slide?
- [ ] Is it 1 slide = 1 message?
- [ ] Is the text amount appropriate for 16:9 format?
- [ ] Is there sufficient whitespace?
- [ ] Is there overall visual consistency?
- [ ] Is the slide count appropriate for the time slot?
- [ ] Do layout choices match the content type?
