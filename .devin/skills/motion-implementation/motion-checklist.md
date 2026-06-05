# Motion Implementation Checklist

## Planning Phase

- [ ] **Determine motion hierarchy tier**
  - [ ] Alive tier: Core navigation, state changes, user feedback (spring physics)
  - [ ] Quiet tier: Secondary elements, tooltips (opacity fades ≤150ms)
  - [ ] Static tier: Dense data tables, repeated items (no animation)

- [ ] **Check for reduced motion preferences**
  - [ ] Implement `useReducedMotion()` hook
  - [ ] Provide alternatives for essential animations
  - [ ] Test with `prefers-reduced-motion: reduce`

- [ ] **Choose appropriate animation type**
  - [ ] Spring physics for primary interactions
  - [ ] CSS transitions for simple hover states
  - [ ] Stagger effects for list reveals
  - [ ] Layout animations for shared elements

## Implementation Checklist

### Performance Optimization

- [ ] **Only animate transform and opacity properties**
  - [ ] Never animate width, height, left, top, margin, padding
  - [ ] Use GPU-accelerated properties
  - [ ] Test on low-end devices

- [ ] **Use LazyMotion for code splitting**
  - [ ] Import motion features on demand
  - [ ] Use `domAnimation` features for most cases
  - [ ] Avoid loading entire motion library upfront

### Spring Animations

- [ ] **Use proper spring configuration**
  - [ ] `type: "spring", stiffness: 300, damping: 30` for primary interactions
  - [ ] Adjust stiffness/damping based on interaction weight
  - [ ] Test spring feel on different devices

- [ ] **Apply spring to appropriate elements**
  - [ ] Core navigation elements
  - [ ] State change feedback
  - [ ] User interactions (buttons, forms)
  - [ ] Modal/drawer openings

### Stagger Animations

- [ ] **Implement stagger for lists**
  - [ ] Use container variants with `staggerChildren`
  - [ ] Set appropriate delay (0.05s for small lists, 0.08s for grids)
  - [ ] Apply item variants to children

- [ ] **Test stagger performance**
  - [ ] Ensure smooth scrolling with many items
  - [ ] Check for layout thrashing
  - [ ] Verify with 50+ items

### Layout Animations

- [ ] **Use layoutId for shared elements**
  - [ ] Active navigation pills
  - [ ] Moving elements between containers
  - [ ] Morphing transitions

- [ ] **Apply layout prop for size changes**
  - [ ] Content expansion/collapse
  - [ ] Dynamic list items
  - [ ] Responsive layout shifts

### Exit Animations

- [ ] **Wrap removable elements in AnimatePresence**
  - [ ] Modals and drawers
  - [ ] List item removals
  - [ ] Dynamic content

- [ ] **Configure proper exit patterns**
  - [ ] `opacity: 0, y: -8` for upward dismiss
  - [ ] `scale: 0.9, opacity: 0` for shrink dismiss
  - [ ] Set mode: "wait" or "popLayout"

### Micro-interactions

- [ ] **Add hover effects**
  - [ ] Subtle `y: -1` or `y: -2` lift
  - [ ] Scale effects for buttons (`scale: 1.02`)
  - [ ] Glow effects with `whileHover`

- [ ] **Implement LED border effects**
  - [ ] Gradient border glow on focus
  - [ ] Flash brighter on keypress (100ms)
  - [ ] Use electric blue theme colors

- [ ] **Add pulse animations**
  - [ ] Status indicators
  - [ ] Loading states
  - [ ] Attention-grabbing elements

## Accessibility Checklist

- [ ] **Respect motion preferences**
  - [ ] Wrap animations in `useReducedMotion()` check
  - [ ] Provide instant changes when reduced motion requested
  - [ ] Don't disable everything - preserve clarity

- [ ] **Maintain focus management**
  - [ ] Focus indicators remain visible during animations
  - [ ] Focus restoration after modal close
  - [ ] Keyboard navigation works with animated elements

- [ ] **Screen reader compatibility**
  - [ ] Animated content doesn't interfere with screen readers
  - [ ] Dynamic updates are announced properly
  - [ ] Animation timing doesn't cause confusion

## Testing Checklist

### Performance Testing

- [ ] **Test on low-end devices**
  - [ ] Animations remain smooth (60fps)
  - [ ] No jank or stuttering
  - [ ] Memory usage stays reasonable

- [ ] **Check Core Web Vitals impact**
  - [ ] INP (Interaction to Next Paint) ≤ 200ms
  - [ ] CLS (Cumulative Layout Shift) minimal
  - [ ] FID (First Input Delay) not affected

### Cross-browser Testing

- [ ] **Test in modern browsers**
  - [ ] Chrome/Chromium
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge

- [ ] **Verify reduced motion support**
  - [ ] macOS System Preferences → Accessibility → Reduce motion
  - [ ] Windows Settings → Ease of Access → Show animations
  - [ ] Mobile device motion settings

### User Experience Testing

- [ ] **Animation timing feels natural**
  - [ ] Not too fast or too slow
  - [ ] Provides good feedback
  - [ ] Doesn't cause motion sickness

- [ ] **Interaction feedback is clear**
  - [ ] Hover states are noticeable
  - [ ] Active states are clear
  - [ ] Loading states are informative

## Debugging Checklist

### Common Issues

- [ ] **Layout thrashing**
  - [ ] Check for animating layout properties
  - [ ] Use browser devtools performance tab
  - [ ] Look for forced synchronous layouts

- [ ] **Performance bottlenecks**
  - [ ] Too many simultaneous animations
  - [ ] Complex spring calculations
  - [ ] Memory leaks in animation cleanup

- [ ] **Accessibility issues**
  - [ ] Animations not respecting reduced motion
  - [ ] Focus lost during animations
  - [ ] Screen reader conflicts

### Optimization

- [ ] **Reduce animation complexity**
  - [ ] Simplify spring physics
  - [ ] Reduce stagger count
  - [ ] Use CSS transitions where appropriate

- [ ] **Improve performance**
  - [ ] Add `will-change` sparingly
  - [ ] Use `transform3d` for GPU acceleration
  - [ ] Implement proper cleanup

## Final Review

- [ ] **Code quality**
  - [ ] Motion code is organized and reusable
  - [ ] Proper TypeScript types
  - [ ] No console errors or warnings

- [ ] **User experience**
  - [ ] Animations enhance, don't distract
  - [ ] Performance is acceptable on all target devices
  - [ ] Accessibility requirements are met

- [ ] **Maintainability**
  - [ ] Motion patterns are documented
  - [ ] Code is easy to modify
  - [ ] Consistent patterns across components
