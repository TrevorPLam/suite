---
name: liquid-glass-implementation
description: Guides the implementation of liquid glass and matte glass UI effects with noise overlays, proper contrast, and accessibility considerations for 2026 design standards
---

## Liquid Glass / Matte Glass Implementation Guide

This skill guides implementation of modern glassmorphism effects that go beyond simple backdrop-blur, incorporating noise overlays, proper contrast, and premium aesthetics.

## Matte Glass vs High-Transparency Glass

**Matte Glass (Preferred for this project)**

- Lower opacity background: `bg-white/5` to `bg-white/10`
- Subtle noise overlay for texture
- Better text readability
- More modern, less dated appearance
- Used for: Shell surfaces (main frame, drawer surfaces, command palette, hero cards)

**High-Transparency Glass (Use Sparingly)**

- Higher opacity background: `bg-white/20` to `bg-white/30`
- No noise overlay
- Can cause readability issues on busy backgrounds
- Used for: Small decorative elements only

## Noise Overlay Implementation

### CSS Noise Pattern

```css
/* Add to globals.css */
.noise-overlay {
  position: relative;
}

.noise-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
}

.noise-overlay > * {
  position: relative;
  z-index: 1;
}
```

### Tailwind Utility

```css
/* In tokens.css */
@layer utilities {
  .noise-overlay {
    @apply relative;
  }

  .noise-overlay::before {
    content: '';
    @apply absolute inset-0 pointer-events-none z-0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    opacity: 0.03;
  }

  .noise-overlay > * {
    @apply relative z-1;
  }
}
```

## Matte Glass Component Pattern

```tsx
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
      noise-overlay
      backdrop-blur-md
      bg-white/5
      border border-white/10
      rounded-xl
      ${className}
    `}
    >
      {children}
    </div>
  );
};
```

## Standard Dark Card (Non-Glass)

```tsx
export const DarkCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
      bg-[#111111]
      border border-white/8
      rounded-xl
      ${className}
    `}
    >
      {children}
    </div>
  );
};
```

## When to Use Each

**Use Matte Glass (with noise overlay):**

- Main shell surfaces (Sidebar, StatusBar, RightPanel)
- Command palette
- Hero cards and featured sections
- AmbientStatusBanner
- Modal/dialog backdrops

**Use Standard Dark Card:**

- Content cards with dense information
- Data tables
- Form inputs
- Transaction lists
- News feed cards
- Budget category cards

## Accessibility Considerations

### Color Contrast

- Ensure text on glass backgrounds meets 4.5:1 contrast ratio
- Test with both light and dark content behind glass
- Use darker backgrounds for glass when content is light-colored
- Consider adding a semi-transparent dark overlay for critical text

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .backdrop-blur-md {
    backdrop-filter: none;
  }
}
```

### Focus Indicators

- Glass surfaces must still show visible focus indicators
- Use electric blue (#0066ff) for focus rings
- Ensure focus ring is visible against glass background

## Performance

- Use `backdrop-filter` sparingly - it's computationally expensive
- Limit glass surfaces to key UI elements
- Test on low-end devices for performance impact
- Consider CSS `will-change: backdrop-filter` for animated glass elements

## Visual Identity Integration

```tsx
// Electric blue accent on glass cards
<div className="noise-overlay backdrop-blur-md bg-white/5 border border-white/10 rounded-xl">
  <div className="border-l-2 border-[#0066ff]">
    {/* Content */}
  </div>
</div>

// Glow effect on hover
<motion.div
  whileHover={{
    boxShadow: "0 0 24px rgba(0, 102, 255, 0.15)"
  }}
  className="noise-overlay backdrop-blur-md bg-white/5 border border-white/10 rounded-xl"
>
  {/* Content */}
</motion.div>
```

## Common Patterns

### Glass Sidebar

```tsx
<Sidebar className="noise-overlay backdrop-blur-md bg-white/5 border-r border-white/10">
  {/* Navigation */}
</Sidebar>
```

### Glass Command Palette

```tsx
<CommandPalette className="noise-overlay backdrop-blur-md bg-white/5 border border-white/10 rounded-xl">
  {/* Search and results */}
</CommandPalette>
```

### Glass Modal

```tsx
<Dialog className="noise-overlay backdrop-blur-md bg-white/5 border border-white/10 rounded-xl">
  {/* Modal content */}
</Dialog>
```

## Anti-Patterns

- Do NOT use high-transparency glass for content-heavy areas
- Do NOT apply noise overlay to every card - reserve for shell surfaces
- Do NOT use glass on backgrounds that are too busy or colorful
- Do NOT forget to test contrast with various background colors
- Do NOT overuse glass effects - it can make the UI feel cluttered
- Do NOT use glass for form inputs or data tables (use dark cards instead)

## Testing Checklist

- [ ] Text contrast meets WCAG 2.2 AA (4.5:1) on glass backgrounds
- [ ] Noise overlay is subtle and doesn't interfere with readability
- [ ] Glass surfaces perform well on low-end devices
- [ ] Focus indicators are visible on glass backgrounds
- [ ] Reduced motion preference is respected
- [ ] Glass is only used on appropriate shell surfaces
- [ ] Standard dark cards are used for content-heavy areas
