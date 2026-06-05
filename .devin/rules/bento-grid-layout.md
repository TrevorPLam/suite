---
trigger: always_on
---

# Bento Grid Layout Rules

Bento Grid Design is a modular layout pattern inspired by Japanese bento boxes, using asymmetric content blocks in varying sizes to create organized, visually striking interfaces.

<!-- SECTION: core_principles -->

<core_principles>

- **Hierarchy through Size**: Important elements get more space
- **Visual Rhythm**: Variation creates interest
- **Consistent Spacing**: Uniform gaps between all elements
- **Rounded Corners**: Soft, modern aesthetic

</core_principles>

<!-- ENDSECTION: core_principles -->

<!-- SECTION: css_grid_foundation -->

<css_grid_foundation>

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

/* Spanning variants */
.bento-item--large {
  grid-column: span 2;
  grid-row: span 2;
}

.bento-item--wide {
  grid-column: span 2;
}

.bento-item--tall {
  grid-row: span 2;
}
```

</css_grid_foundation>

<!-- ENDSECTION: css_grid_foundation -->

<!-- SECTION: responsive_breakpoints -->

<responsive_breakpoints>

```css
/* Mobile: Single column */
@media (max-width: 640px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }
  .bento-item--large,
  .bento-item--wide,
  .bento-item--tall {
    grid-column: span 1;
    grid-row: span 1;
  }
}

/* Tablet: 2 columns */
@media (min-width: 641px) and (max-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop: 3-4 columns */
@media (min-width: 1025px) {
  .bento-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1440px) {
  .bento-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

</responsive_breakpoints>

<!-- ENDSECTION: responsive_breakpoints -->

<!-- SECTION: project_integration -->

<project_integration>

Use Bento Grid for:

- **Dashboard**: AgentFleetPanel, ActivityFeed, AmbientStatusBanner in modular layout
- **Budget Dashboard**: NetWorthCard, CashFlowSummary, BudgetCategoryCard grid
- **Settings**: Integration cards (MCPServerCard) in grid layout
- **Analytics**: Cost breakdown charts and metrics in organized blocks

</project_integration>

<!-- ENDSECTION: project_integration -->

<!-- SECTION: visual_identity -->

<visual_identity>

- Card background: `bg-[#111111]` for content cards
- Glass cards: `backdrop-blur-md bg-white/5 border border-white/10` for shell surfaces
- Border radius: `rounded-xl` (1rem)
- Gap: `gap-4` (1rem)
- Padding: `p-4` to `p-6` depending on content density

</visual_identity>

<!-- ENDSECTION: visual_identity -->

<!-- SECTION: motion_integration -->

<motion_integration>

```tsx
import { motion } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
};

<motion.div className="bento-grid" variants={containerVariants} initial="hidden" animate="show">
  {items.map((item) => (
    <motion.div
      key={item.id}
      className={`bento-item ${item.size}`}
      variants={itemVariants}
      whileHover={{ y: -4 }}
    >
      {item.content}
    </motion.div>
  ))}
</motion.div>;
```

</motion_integration>

<!-- ENDSECTION: motion_integration -->

<!-- SECTION: accessibility -->

<accessibility>

- Use semantic HTML: `<article>` for bento items, `<section>` for grid container
- Proper heading hierarchy within each bento item
- Keyboard navigation: Tab order follows visual left-to-right, top-to-bottom
- Focus indicators: Electric blue ring on all interactive elements
- ARIA labels for decorative items that contain interactive content
- Ensure color contrast meets WCAG 2.2 AA (4.5:1 minimum)

</accessibility>

<!-- ENDSECTION: accessibility -->

<!-- SECTION: performance -->

<performance>

- Use CSS Grid for layout (GPU-accelerated)
- Avoid JavaScript layout calculations
- Lazy load images in bento items below the fold
- Use `content-visibility: auto` for off-screen bento items
- Test with 50+ items to ensure smooth scrolling

</performance>

<!-- ENDSECTION: performance -->

<!-- SECTION: best_practices -->

<best_practices>

- Keep bento items focused on single purpose
- Use size variants to establish visual hierarchy
- Maintain consistent gap and padding across all breakpoints
- Don't force content into bento grid if it doesn't fit naturally
- Consider content aspect ratio when assigning spans
- Use `minmax()` for responsive column sizing

</best_practices>

<!-- ENDSECTION: best_practices -->

<!-- SECTION: anti_patterns -->

<anti_patterns>

- Do NOT use fixed pixel widths for columns
- Do NOT use JavaScript for layout calculations
- Do NOT create deep nesting within bento items
- Do NOT use bento grid for simple lists (use standard list instead)
- Do NOT mix alignment systems (Flexbox + Grid) within same grid
- Do NOT ignore mobile - always provide single-column fallback

</anti_patterns>

<!-- ENDSECTION: anti_patterns -->
