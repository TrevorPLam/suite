---
trigger: always_on
---

# Framer Motion Rules (v11.0+)

This project uses Framer Motion 11.0.0 for all animations, not the motion library.

<!-- SECTION: library_usage -->

<library_usage>

- **Package name**: `framer-motion` (not `motion`)
- **Version**: 11.0.0 (from catalog)
- **Import from**: `framer-motion` for React components
- **Components**: `motion.div`, `motion.button`, etc. for animated elements
- **AnimatePresence**: For exit animations and component lifecycle
- **Layout Animations**: Use layoutId and layout props for shared elements
  </library_usage>

<!-- ENDSECTION: library_usage -->

<!-- SECTION: spring_animations -->

<spring_animations>

- Use spring physics for primary interactions (navigation, state changes, user feedback)
- Spring config: `type: "spring", stiffness: 300, damping: 30`
- Avoid spring for informational elements (tooltips, hover details) - use quiet fade instead
- Spring animations feel "alive" and premium when used appropriately
  </spring_animations>

<!-- ENDSECTION: spring_animations -->

<!-- SECTION: stagger_animations -->

<stagger_animations>

- Use `staggerChildren` for list reveals (AgentCard grid, command palette items)
- Stagger delay: 0.05s for small lists, 0.08s for larger grids
- Apply to parent container with `variants` object
- Creates premium, orchestrated reveal effect
  </stagger_animations>

<!-- ENDSECTION: stagger_animations -->

<!-- SECTION: layout_animations -->

<layout_animations>

- Use `layoutId` for shared element transitions (active nav pill, moving elements)
- Enables smooth morphing between element positions
- Example: Active selection pill moving between sidebar nav items
- Use `layout` prop for automatic layout animations when content size changes
  </layout_animations>

<!-- ENDSECTION: layout_animations -->

<!-- SECTION: exit_animations -->

<exit_animations>

- Wrap removable elements in `AnimatePresence` component
- Provide `initial`, `animate`, and `exit` props
- Exit pattern: `opacity: 0, y: -8` or `scale: 0.9, opacity: 0`
- Mode: "wait" for sequential, "popLayout" for layout-aware exits
- Required for modals, drawers, list item removals
  </exit_animations>

<!-- ENDSECTION: exit_animations -->

<!-- SECTION: performance -->

<performance>
- **Only animate transform and opacity properties** for GPU acceleration
- Never animate width, height, left, top, or margin (causes layout thrashing)
- Use `will-change` sparingly - only for complex animations
- Prefer CSS transitions for simple hover states (150ms ease-out)
- Use `LazyMotion` to load animation features on demand
- Test animations on low-end devices
</performance>

<!-- ENDSECTION: performance -->

<!-- SECTION: reduced_motion -->

<reduced_motion>

- Wrap all motion animations in `useReducedMotion()` hook check
- When reduced motion is requested:
  - Replace spring animations with instant state changes or very short fades (≤50ms)
  - Disable stagger effects
  - Skip exit animations
  - Preserve clarity - don't disable everything
- Respect `prefers-reduced-motion: reduce` media query
  </reduced_motion>

<!-- ENDSECTION: reduced_motion -->

<!-- SECTION: micro_interactions -->

<micro_interactions>

- **LED border effect**: Gradient border that glows on focus, flashes brighter on keypress (100ms)
- **Hover lift**: Subtle `y: -1` or `y: -2` lift on interactive elements
- **Glow effect**: Expanding box-shadow on hover using `whileHover`
- **Pulse animation**: Use keyframes for status indicators (scale + opacity loop)
- Keep micro-interactions subtle - don't overwhelm
  </micro_interactions>

<!-- ENDSECTION: micro_interactions -->

<!-- SECTION: animation_hierarchy -->

<animation_hierarchy>

- **Alive tier** (core navigation, state changes): Spring physics, shared layout, glow on hover
- **Quiet tier** (secondary elements, tooltips): Opacity fades, ≤150ms transitions, no glow
- **Static tier** (dense data tables, repeated items): No animation - instant changes
- Apply hierarchy consistently across the application
  </animation_hierarchy>

<!-- ENDSECTION: animation_hierarchy -->

<!-- SECTION: common_patterns -->

<common_patterns>

```tsx
// Spring animation for interactive element
<motion.button
  whileHover={{ scale: 1.02, y: -1 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
  Click me
</motion.button>

// Staggered list reveal
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 }
};

<motion.div variants={containerVariants} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>

// Exit animation with AnimatePresence
<AnimatePresence mode="popLayout">
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>

// Shared layout animation
<motion.div layoutId="active-pill" className="bg-blue-500 h-8" />

// Reduced motion check
const shouldReduceMotion = useReducedMotion();
const transition = shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300 };
```

</common_patterns>

<!-- ENDSECTION: common_patterns -->

<!-- SECTION: anti_patterns -->

<anti_patterns>

- **Layout Properties**: Do NOT animate width, height, margin, padding (causes layout thrashing)
- **Over-Animation**: Do NOT use spring animations for every element - reserve for primary interactions
- **Reduced Motion**: Do NOT ignore reduced motion preferences
- **CSS vs JS**: Do NOT use heavy JavaScript animations when CSS transitions suffice
- **Off-Screen Elements**: Do NOT animate elements that are off-screen or not visible
- **Package Name**: Do NOT use `motion` package - use `framer-motion`
- **Bundle Size**: Do NOT import all animation features - use specific components
  </anti_patterns>

<!-- ENDSECTION: anti_patterns -->
