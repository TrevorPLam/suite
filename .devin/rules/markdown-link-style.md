---
trigger: always_on
---

# Markdown Link Style Rule

Prefer self-contained inline links over reference-style to prevent breakage.

<!-- SECTION: Primary Rule -->

## Primary Rule

**Use inline links `[text](url)` whenever possible.**

<!-- ENDSECTION: Primary Rule -->

<!-- SECTION: Rationale -->

## Rationale

Inline links are self-contained. Reference-style links risk broken references when text moves without its definition.

<!-- ENDSECTION: Rationale -->

<!-- SECTION: Patterns -->

## Patterns

### Preferred: Inline Links

```markdown
[Visit Google](https://google.com)

[Read the Docs](https://docs.example.com/guide)
```

### Acceptable: Reference-Style with Proximity Rule

If reference-style must be used, keep definitions **immediately after** the paragraph:

```markdown
Visit [Google](https://google.com) or [Bing](https://bing.com) for search.
```

Or use a dedicated section at end of file:

```markdown
## Footnotes and References

[Link text](https://example.com/1)
[Another link](https://example.com/2)
```

<!-- ENDSECTION: Patterns -->

<!-- SECTION: Reference Label Generation -->

## Reference Label Generation

When creating new reference-style links, use unique dated labels:

```markdown
[Link text](https://example.com/1)
[Another link](https://example.com/2)
```

Format: `ref-YYYY-MM-DD-NN` where NN is sequential.

<!-- ENDSECTION: Reference Label Generation -->

<!-- SECTION: Editing Rules -->

## Editing Rules

1. **Moving link text?** Also move its reference definition
2. **Deleting link?** Also delete its reference definition
3. **Converting inline to reference?** Add definition immediately or to Footnotes section
4. **Converting reference to inline?** Remove the definition

<!-- ENDSECTION: Editing Rules -->

<!-- SECTION: Validation -->

## Validation

After any link edit:

- [ ] All reference definitions have at least one usage
- [ ] All reference usages have a matching definition
- [ ] No orphaned definitions remain

<!-- ENDSECTION: Validation -->
