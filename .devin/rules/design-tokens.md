---
trigger: always_on
---

# Design Tokens Rules

Define CSS custom properties in tokens.css for consistent theming:

<!-- SECTION: token_definition -->

<token_definition>

Define these CSS custom properties in src/tokens.css:

- --color-accent: Electric blue (#0066ff)
- --color-surface: Deep charcoal (#111111)
- --motion-duration: 150ms
- --motion-ease: ease-out

</token_definition>

<!-- ENDSECTION: token_definition -->

<!-- SECTION: tailwind_integration -->

<tailwind_integration>

Reference these tokens in tokens.css using @theme directive:

- Use @theme to map CSS variables to Tailwind utilities
- Example: @theme { --color-accent: #0066ff; }
- Add @source directive for component discovery

</tailwind_integration>

<!-- ENDSECTION: tailwind_integration -->

<!-- SECTION: usage -->

<usage>

- Use CSS variables instead of hardcoded values for themeable properties
- Reference via Tailwind utilities where possible
- Direct CSS variable usage for custom components

</usage>

<!-- ENDSECTION: usage -->
