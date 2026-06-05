---
trigger: always_on
---

# Motion Hierarchy Rules

To keep the UI disciplined and premium, categorize every animated element:

<!-- SECTION: motion_levels -->

<motion_levels>

**Alive Level**

- Use cases: Core navigation, state changes, user feedback
- Allowed techniques: Spring physics (type: "spring", stiffness: 300, damping: 30), shared layout animations (layoutId), glow on hover
- Example components: Sidebar expand/collapse, active nav pill, command palette stagger, chat input LED border

**Quiet Level**

- Use cases: Secondary elements, content reveals, tooltips
- Allowed techniques: Opacity fades, very short transitions (≤150ms), no glow
- Example components: Tooltips, dropdown menus, skeleton loaders

**Static Level**

- Use cases: Dense data tables, repeated items, non-interactive elements
- Allowed techniques: No animation – use instant changes
- Example components: Long transaction lists (except loading), calendar grid cells

</motion_levels>

<!-- ENDSECTION: motion_levels -->

<!-- SECTION: rule_of_thumb -->

<rule_of_thumb>

If an interaction is primary (navigation, sending a message, moving a task), use spring.
If it is informational (tooltip, hover detail), use quiet fade.

- If it is data-dense (table rows), keep static.

</rule_of_thumb>

<!-- ENDSECTION: rule_of_thumb -->
