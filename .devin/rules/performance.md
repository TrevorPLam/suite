---
trigger: always_on
---

# Performance Rules

All components and pages must follow performance best practices:

<!-- SECTION: code_splitting -->

<code_splitting>

- Use React.lazy() for route-based code splitting
- Use dynamic imports for heavy components
- Load charts and visualizations on demand
- Split by route using React Router

</code_splitting>

<!-- ENDSECTION: code_splitting -->

<!-- SECTION: rendering_optimization -->

<rendering_optimization>

- Use React.memo() for expensive components
- Use useMemo() for expensive computations
- Use useCallback() for function props
- Avoid unnecessary re-renders with proper dependency arrays
- Virtualize long lists using react-window (standard library for this project)
- Apply virtualization to ActivityFeed, transaction lists, news feed, and any scrollable list >50 items

</rendering_optimization>

<!-- ENDSECTION: rendering_optimization -->

<!-- SECTION: image_optimization -->

<image_optimization>

- Use standard HTML img tags with loading="lazy" for below-the-fold images
- Use appropriate image formats (WebP, AVIF)
- Implement responsive images with srcset
- Add placeholder blur using CSS or background colors
- Consider using a lightweight image optimization library if needed

</image_optimization>

<!-- ENDSECTION: image_optimization -->

<!-- SECTION: data_fetching -->

<data_fetching>

- Use TanStack Query for efficient data caching
- Implement proper cache invalidation
- Use optimistic updates where appropriate
- Prefetch data for likely user actions
- Deduplicate parallel requests

</data_fetching>

<!-- ENDSECTION: data_fetching -->

<!-- SECTION: bundle_optimization -->

<bundle_optimization>

- Analyze bundle size regularly
- Tree-shake unused code
- Use import statements over require
- Avoid large dependencies when possible
- Use ES modules for better tree-shaking

</bundle_optimization>

<!-- ENDSECTION: bundle_optimization -->

<!-- SECTION: motion_performance -->

<motion_performance>

- Use CSS transforms and opacity for animations
- Avoid animating layout properties (width, height)
- Use will-change sparingly
- Respect prefers-reduced-motion
- Test animations on low-end devices

</motion_performance>

<!-- ENDSECTION: motion_performance -->
