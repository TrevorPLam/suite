---
trigger: always_on
---

# Motion Preference Rules

Respect user's motion preferences for accessibility:

<!-- SECTION: hook_implementation -->

<hook_implementation>

Create useMotionPreference() hook that reads prefers-reduced-motion:

```typescript
const useMotionPreference = () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReducedMotion;
};
```

</hook_implementation>

<!-- ENDSECTION: hook_implementation -->

<!-- SECTION: behavior -->

<behavior>

When reduced motion is requested:

- Replace spring animations with instant state changes
- Or use very short fades (≤50ms)
- Do not simply "disable everything" – preserve clarity
- Essential information should still be conveyed

</behavior>

<!-- ENDSECTION: behavior -->

<!-- SECTION: usage -->

<usage>

- Call useMotionPreference() in all animated components
- Conditionally apply motion based on the hook result
- Example: `const reducedMotion = useMotionPreference();`
- Example: `transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}`

</usage>

<!-- ENDSECTION: usage -->

<!-- SECTION: css_media_query -->

<css_media_query>

Wrap all CSS animations in @media (prefers-reduced-motion: no-preference):

```css
@media (prefers-reduced-motion: no-preference) {
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
}
```

</css_media_query>

<!-- ENDSECTION: css_media_query -->
