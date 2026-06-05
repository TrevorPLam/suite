---
trigger: always_on
---

# Markdown Block Editing Rule

Prevent structural damage by treating multi-line structures as atomic units.

<!-- SECTION: Core Principle -->

## Core Principle

**NEVER edit single lines inside lists, tables, or code blocks.** Always regenerate entire blocks.

<!-- ENDSECTION: Core Principle -->

<!-- SECTION: Block Types and Requirements -->

## Block Types and Requirements

### Lists

- Include **all items** when editing any item
- Preserve indentation levels exactly
- Maintain blank lines between list items if present

### Tables

- Include **header row, separator row, and all data rows**
- Preserve column alignment markers (`:---`, `:---:`, `---:`)
- Keep consistent column count across all rows

### Code Blocks

- Include opening fence (``` or ~~~) with language identifier
- Include **entire code content** without truncation
- Include closing fence on its own line

## Example Pattern

When asked to fix a typo in a list item:

**WRONG:** Edit just the line with the typo.
**CORRECT:** Regenerate the entire list with the typo fixed.

```markdown
<!-- If this list has a typo in item 2 -->

- First item
- Seond item (typo here)
- Third item

<!-- Regenerate the entire list -->

- First item
- Second item (fixed)
- Third item
```

<!-- ENDSECTION: Example Pattern -->

<!-- SECTION: Enforcement -->

## Enforcement

- Before any Markdown edit, identify the block type
- If edit affects a multi-line structure, expand scope to entire block
- Verify output maintains block boundaries

<!-- ENDSECTION: Enforcement -->
