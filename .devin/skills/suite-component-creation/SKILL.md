---
name: suite-component-creation
description: Guides the creation of React components for Suite apps and shared UI using TypeScript, Tailwind CSS v4, shadcn/ui, accessibility rules, and Suite-specific layout conventions
---

# Suite Component Creation

Use this skill when creating a new React component for `apps/*/web` or `packages/ui`.

## Core Rules

- Prefer semantic HTML and accessible names for every interactive element.
- Use Tailwind CSS v4 utility classes and shared design tokens.
- Use `@suite/ui` for shared primitives instead of duplicating component patterns.
- Keep components focused on one responsibility.
- Keep motion subtle and respect reduced-motion preferences.

## Component Expectations

- Add loading, empty, and error states when data is involved.
- Add keyboard support for any interactive element.
- Use visible focus indicators.
- Keep text contrast WCAG-compliant.
- Prefer composition over deeply nested markup.

## Implementation Checklist

1. Choose the correct package: app-local component or `packages/ui`.
2. Decide whether the component needs state, props, or both.
3. Build with TypeScript and explicit prop types.
4. Add accessibility attributes and semantic structure.
5. Add tests when the component has interactions or complex rendering.

## Good Targets

- Cards
- Forms
- Tables
- Dialog content
- Status indicators
- Empty states
- Event/task/file summaries
