---
trigger: always_on
---

# Core Web Vitals - INP (Interaction to Next Paint)

INP is a Core Web Vital metric that measures overall page responsiveness, replacing FID (First Input Delay). It measures the time from user interaction to the next visual update.

<!-- SECTION: inp_thresholds -->

<inp_thresholds>

- **Good**: INP ≤ 200ms
- **Needs Improvement**: 200ms < INP ≤ 500ms
- **Poor**: INP > 500ms

Measure at 75th percentile of page loads, segmented by mobile and desktop.

</inp_thresholds>

<!-- ENDSECTION: inp_thresholds -->

<!-- SECTION: measured_interactions -->

<measured_interactions>

INP measures these interaction types:

- Mouse clicks
- Touchscreen taps
- Keyboard key presses (keydown, keypress, keyup)

Note: Scrolling and hovering are NOT measured by INP.

</measured_interactions>

<!-- ENDSECTION: measured_interactions -->

<!-- SECTION: interaction_components -->

<interaction_components>

An interaction consists of:

1. **Input Delay**: Time before event handler starts
2. **Processing Duration**: Time for all event handlers to execute
3. **Presentation Delay**: Time until next frame paints

INP = longest duration among all three phases.

</interaction_components>

<!-- ENDSECTION: interaction_components -->

<!-- SECTION: optimization_strategies -->

<optimization_strategies>

**Reduce JavaScript Execution Time**

- Code-split large bundles with React.lazy()
- Use TanStack Query for efficient data caching
- Debounce/throttle event handlers (use useCallback)
- Avoid long-running tasks on main thread
- Use Web Workers for heavy computations

**Optimize Event Handlers**

```tsx
// BAD - Inline function recreated on every render
<button onClick={() => handleClick()}>Click</button>;

// GOOD - Stable function reference
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);

<button onClick={handleClick}>Click</button>;
```

**Reduce Layout Thrashing**

- Only animate transform and opacity properties
- Avoid reading layout properties (offsetWidth, scrollTop) in loops
- Use requestAnimationFrame for visual updates
- Batch DOM reads and writes

**Optimize Animations**

- Use CSS transitions for simple state changes (150ms ease-out)
- Use motion library with reduced motion checks
- Test animations on low-end devices
- Keep animation duration under 200ms for interactive elements

**Improve Rendering Performance**

- Use React.memo() for expensive components
- Virtualize long lists with react-window
- Use useMemo() for expensive computations
- Avoid unnecessary re-renders with proper dependency arrays

</optimization_strategies>

<!-- ENDSECTION: optimization_strategies -->

<!-- SECTION: project_specific_optimizations -->

<project_specific_optimizations>

**TanStack Query Integration**

```tsx
// Use staleTime to reduce unnecessary refetches
const { data } = useQuery(['agents'], fetchAgents, {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});

// Use optimistic updates for instant feedback
const mutation = useMutation(updateAgent, {
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['agents']);
    const previous = queryClient.getQueryData(['agents']);
    queryClient.setQueryData(['agents'], (old) => [...old, newData]);
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['agents'], context.previous);
  },
});
```

**Motion Library Performance**

```tsx
// Use LazyMotion for code splitting
import { LazyMotion, domAnimation, m } from 'motion/react';

<LazyMotion features={domAnimation}>
  <m.div animate={{ opacity: 1 }}>Content</m.div>
</LazyMotion>;

// Respect reduced motion
const shouldReduceMotion = useReducedMotion();
const transition = shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300 };
```

**Virtualization for Long Lists**

```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList height={400} itemCount={items.length} itemSize={50} width="100%">
  {Row}
</FixedSizeList>;
```

</project_specific_optimizations>

<!-- ENDSECTION: project_specific_optimizations -->

<!-- SECTION: measurement -->

<measurement>

**Lab Testing**

```tsx
import { getINP } from 'web-vitals';

getINP((metric) => {
  console.log('INP:', metric.value);
  // Send to analytics
});
```

**Field Testing**

- Use Chrome User Experience Report (CrUX) data
- Test on real devices (mobile and desktop)
- Monitor 75th percentile across users
- Segment by device type and connection speed

</measurement>

<!-- ENDSECTION: measurement -->

<!-- SECTION: common_issues -->

<common_issues>

**Long Event Handlers**

- Symptom: Clicks feel sluggish
- Solution: Break up long tasks, use Web Workers

**Layout Thrashing**

- Symptom: Janky animations, low FPS
- Solution: Batch DOM reads/writes, avoid layout reads in loops

**Excessive JavaScript**

- Symptom: High INP on page load
- Solution: Code-split, lazy load, reduce bundle size

**Slow Animations**

- Symptom: Interactions delayed by animations
- Solution: Keep animations under 200ms, use GPU-accelerated properties

</common_issues>

<!-- ENDSECTION: common_issues -->

<!-- SECTION: best_practices -->

<best_practices>

- Aim for INP under 200ms (good threshold)
- Test on low-end devices and slow connections
- Monitor INP in production with RUM (Real User Monitoring)
- Optimize critical interaction paths first
- Use performance budgets in CI/CD
- Regularly audit with Lighthouse and WebPageTest

</best_practices>

<!-- ENDSECTION: best_practices -->

<!-- SECTION: anti_patterns -->

<anti_patterns>

- Do NOT block main thread with long-running tasks
- Do NOT use inline event handlers in render loops
- Do NOT animate layout properties (width, height, margin)
- Do NOT ignore reduced motion preferences
- Do NOT skip code-splitting for large bundles
- Do NOT measure INP only on high-end devices

</anti_patterns>

<!-- ENDSECTION: anti_patterns -->
