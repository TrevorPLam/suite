---
name: suite-layout-component
description: Guides the creation of Suite layout components such as app shells, sidebars, headers, status bars, drawers, and responsive navigation
---

# Suite Layout Component

Use this skill when building layout surfaces for the Calendar, Tasks, or Drive apps.

## Layout Responsibilities

- Keep app shells predictable and lightweight.
- Separate navigation, content, and utility regions.
- Make the layout responsive without changing the content model.
- Use semantic landmarks like `header`, `nav`, `main`, and `aside`.

## Common Layout Pieces

- App sidebar or rail.
- Top header with page controls.
- Persistent status or sync bar.
- Right-side utility panel or drawer.
- Modal and dialog containers.

## Accessibility Rules

- Preserve logical tab order.
- Trap focus in open dialogs and drawers.
- Restore focus to the trigger when the surface closes.
- Provide descriptive labels for navigation and controls.

## Implementation Checklist

1. Identify the navigation and content regions.
2. Decide which surfaces are persistent vs. conditional.
3. Wire keyboard shortcuts and close handlers.
4. Verify mobile behavior and focus management.
5. Add reduced-motion-friendly transitions where needed.
