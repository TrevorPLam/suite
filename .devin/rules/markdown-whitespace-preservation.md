---
trigger: always_on
---

# Markdown Whitespace Preservation Rule

Blank lines and indentation are structural. Preserve them exactly.

<!-- SECTION: Critical Rule -->

## Critical Rule

**Preserve ALL existing blank lines and indentation.**

<!-- ENDSECTION: Critical Rule -->

<!-- SECTION: Specific Requirements -->

## Specific Requirements

### Blank Lines

- An empty line must remain an empty line
- Do not join lines currently separated by a blank line
- Do not add blank lines where none existed
- When inserting content, explicitly state where blank lines go

### Indentation

- Preserve existing indentation levels exactly
- Use spaces (not tabs) consistent with the file
- Common indent sizes: 2 spaces, 4 spaces
- Nested structures maintain relative indentation

<!-- ENDSECTION: Specific Requirements -->

<!-- SECTION: Examples -->

## Examples

### Preserving List Separation

```markdown
<!-- BEFORE - Two separate lists -->

- Item A
- Item B

- Item C
- Item D

<!-- AFTER - Still two separate lists -->

- Item A
- Item B

- Item C
- Item D
```

### Insertion with Explicit Blank Lines

When inserting after a heading:

```markdown
# Heading

New paragraph here. (one blank line between heading and paragraph)
```

<!-- ENDSECTION: Examples -->

<!-- SECTION: Enforcement Checklist -->

## Enforcement Checklist

- [ ] Count blank lines before and after edit - they must match
- [ ] Verify indentation levels unchanged
- [ ] Confirm no lines were inadvertently joined
- [ ] Ensure no spurious blank lines added

<!-- ENDSECTION: Enforcement Checklist -->
