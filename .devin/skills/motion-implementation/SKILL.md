---
name: motion-implementation
description: Guides the implementation of Framer Motion 11.0.0 animations including spring physics, stagger effects, layout animations, exit animations, LED borders, pulse effects, and micro-interactions with performance best practices for YDM
---

## Related Skills

- **create-react-component**: Apply motion patterns to React components
- **accessibility**: Ensure animations respect reduced motion preferences
- **performance**: Optimize animations for Core Web Vitals
- **bento-grid-layout**: Apply grid animations to bento layouts
- **liquid-glass-implementation**: Combine motion effects with glass UI

## Framer Motion Implementation Guide for YDM

This skill guides implementation of **Framer Motion 11.0.0** for creating premium, performant animations in the YDM project.

## Installation and Setup

YDM already includes Framer Motion 11.0.0 in the workspace catalog. Import for React components:

```tsx
import { motion, AnimatePresence } from 'framer-motion';
```

**Important**: Use `framer-motion` NOT `motion` library in YDM project.

## Spring Animations

Use spring physics for primary interactions (navigation, state changes, user feedback).

### Spring Configuration

```tsx
const springConfig = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

<motion.button
  whileHover={{ scale: 1.02, y: -1 }}
  whileTap={{ scale: 0.98 }}
  transition={springConfig}
>
  Click me
</motion.button>;
```

### When to Use Spring

- **Use for**: Core navigation, active state changes, button interactions, modal opens
- **Don't use for**: Tooltips, hover details, informational elements (use quiet fade instead)

## Stagger Animations

Use `staggerChildren` for list reveals to create premium orchestrated effects.

### Stagger Pattern

```tsx
import { motion } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // 50ms delay between each child
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

// Usage
<motion.div variants={containerVariants} initial="hidden" animate="show">
  {items.map((item) => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>;
```

### Stagger Timing

- Small lists (5-10 items): 0.05s delay
- Medium lists (10-30 items): 0.08s delay
- Large grids (30+ items): 0.1s delay

## Layout Animations

Use `layoutId` for shared element transitions and `layout` prop for automatic layout animations.

### Shared Layout (layoutId)

```tsx
// Active nav pill that moves between items
{
  navItems.map((item) => (
    <div key={item.id} className="relative">
      {activeItem === item.id && (
        <motion.div
          layoutId="active-pill"
          className="absolute inset-0 bg-blue-500 rounded"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
      <span className="relative z-10">{item.label}</span>
    </div>
  ));
}
```

### Automatic Layout Animations

```tsx
<motion.div layout>
  {/* Content that changes size will animate smoothly */}
  {isExpanded && <div>Expanded content</div>}
</motion.div>
```

## Exit Animations

Use `AnimatePresence` for elements that are removed from the DOM.

### Basic Exit Pattern

```tsx
import { AnimatePresence, motion } from 'motion/react';

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
</AnimatePresence>;
```

### AnimatePresence Modes

- `wait`: Wait for exit animation to complete before entering new element
- `popLayout`: Layout-aware exits (prevents layout shift)
- `sync`: Enter and exit animations happen simultaneously

### List Item Removal

```tsx
<AnimatePresence>
  {items.map((item) => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.15 }}
    >
      {item.content}
    </motion.div>
  ))}
</AnimatePresence>
```

## LED Border Effect

Create a glowing gradient border that responds to focus and keypresses.

### LED Border Implementation

```tsx
import { motion, useAnimation } from 'motion/react';

const LEDBorderInput = () => {
  const controls = useAnimation();

  const handleKeyPress = () => {
    // Flash brighter on keypress
    controls
      .start({
        boxShadow: '0 0 20px rgba(0, 102, 255, 0.6)',
        transition: { duration: 0.1 },
      })
      .then(() => {
        controls.start({
          boxShadow: '0 0 12px rgba(0, 102, 255, 0.3)',
          transition: { duration: 0.2 },
        });
      });
  };

  return (
    <motion.textarea
      animate={controls}
      initial={{
        boxShadow: '0 0 12px rgba(0, 102, 255, 0.3)',
      }}
      whileFocus={{
        boxShadow: '0 0 16px rgba(0, 102, 255, 0.4)',
        transition: { duration: 0.2 },
      }}
      onKeyPress={handleKeyPress}
      className="border-2 border-blue-500/50 rounded-lg"
    />
  );
};
```

## Pulse Animations

Use keyframes for status indicators that need continuous animation.

### Pulse Pattern

```tsx
import { motion } from 'motion/react';

const PulseIndicator = ({ isThinking }: { isThinking: boolean }) => {
  if (!isThinking) return <div className="w-2 h-2 bg-gray-500 rounded-full" />;

  return (
    <motion.div
      className="w-2 h-2 bg-blue-500 rounded-full"
      animate={{
        scale: [1, 1.5, 1],
        opacity: [1, 0.5, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};
```

## Micro-Interactions

Subtle hover effects that make the interface feel responsive.

### Hover Lift

```tsx
<motion.button
  whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0, 102, 255, 0.3)' }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.15 }}
>
  Hover me
</motion.button>
```

### Glow Effect

```tsx
<motion.div
  whileHover={{
    boxShadow: '0 0 24px rgba(0, 102, 255, 0.4)',
  }}
  transition={{ duration: 0.2 }}
>
  Content
</motion.div>
```

## Reduced Motion Support

Always respect user's motion preferences.

### useReducedMotion Hook

```tsx
import { useReducedMotion } from 'motion/react';

const AnimatedComponent = () => {
  const shouldReduceMotion = useReducedMotion();

  const transition = shouldReduceMotion
    ? { duration: 0 } // Instant change
    : { type: 'spring', stiffness: 300, damping: 30 };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition}>
      Content
    </motion.div>
  );
};
```

### CSS Fallback

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all CSS animations */
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Performance Best Practices

### Only Animate Transform and Opacity

```tsx
// GOOD - GPU accelerated
<motion.div
  animate={{ opacity: 1, scale: 1, x: 100 }}
/>

// BAD - Causes layout thrashing
<motion.div
  animate={{ width: 200, height: 100, left: 50 }}
/>
```

### LazyMotion for Code Splitting

```tsx
import { LazyMotion, domAnimation, m } from 'motion/react';

<LazyMotion features={domAnimation}>
  <m.div animate={{ opacity: 1 }}>Content</m.div>
</LazyMotion>;
```

### Memoize Animation Props

```tsx
const animationProps = useMemo(
  () => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  }),
  []
);

<motion.div {...animationProps}>Content</motion.div>;
```

## Animation Hierarchy

Apply animations consistently based on element importance:

### Alive Tier (Primary Interactions)

- Spring physics, shared layout, glow on hover
- Examples: Navigation, active states, buttons, modals

### Quiet Tier (Secondary Elements)

- Opacity fades, ≤150ms transitions, no glow
- Examples: Tooltips, dropdowns, skeleton loaders

### Static Tier (Data-Dense)

- No animation - instant changes
- Examples: Long tables, repeated data rows

## Common Component Patterns

### Animated Modal

```tsx
import { AnimatePresence, motion } from 'motion/react';

const Modal = ({ isOpen, onClose, children }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
```

### Animated Sidebar

```tsx
const Sidebar = ({ isExpanded }) => (
  <motion.aside
    layout
    animate={{ width: isExpanded ? 240 : 64 }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    className="fixed left-0 top-0 bottom-0 bg-gray-900"
  >
    {/* Content */}
  </motion.aside>
);
```

### Animated Card Grid

```tsx
const CardGrid = ({ items }) => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="show"
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
  >
    {items.map((item) => (
      <motion.div
        key={item.id}
        variants={itemVariants}
        whileHover={{ y: -4 }}
        className="bg-gray-800 rounded-lg p-4"
      >
        {item.content}
      </motion.div>
    ))}
  </motion.div>
);
```

## Accessibility Considerations

- All animations must respect `prefers-reduced-motion`
- Provide static alternatives for essential information
- Ensure animated content doesn't interfere with screen readers
- Use `aria-live` for dynamic content that needs announcement
- Maintain focus management during animations

## Testing

- Test animations on low-end devices
- Verify reduced motion preference is respected
- Check that animations don't cause layout shift
- Ensure keyboard navigation works with animated elements
- Test with screen readers to ensure announcements work
