---
trigger: always_on
---

# CSS @property Animated Gradient Borders

Modern CSS provides native support for animated gradient borders using the `@property` rule, eliminating the need for JavaScript-heavy solutions.

<!-- SECTION: property_rule -->

<property_rule>

- Use `@property` to register custom properties as animatable types
- Enables smooth interpolation of custom properties in keyframes
- Browser support: All modern browsers (Firefox added support Dec 2023)

</property_rule>

<!-- ENDSECTION: property_rule -->

<!-- SECTION: implementation_pattern -->

<implementation_pattern>

```css
/* Register animatable angle property */
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

/* Card with animated gradient border */
.card {
  position: relative;
  z-index: 1;
  background-color: #111111; /* Hides gradient behind face */
}

.card::after {
  content: '';
  position: absolute;
  inset: -4px; /* Expand beyond card edges */
  z-index: -1;
  border-radius: inherit;
  background: conic-gradient(
    from var(--angle),
    #0066ff,
    #00aaff,
    #0066ff /* Repeat first stop for seamless loop */
  );
  animation: spin 3s linear infinite;
}

@keyframes spin {
  to {
    --angle: 360deg;
  }
}
```

</implementation_pattern>

<!-- ENDSECTION: implementation_pattern -->

<!-- SECTION: use_cases -->

<use_cases>

- **AmbientStatusBanner**: Animated conic-gradient border for system health indicator

- **CommandPalette**: Subtle rotating border for active focus state

- **Status indicators**: Pulsing gradient borders for critical alerts

- **CTA buttons**: Animated gradient borders on hover for premium feel

</use_cases>

<!-- ENDSECTION: use_cases -->

<!-- SECTION: performance_considerations -->

<performance_considerations>

- GPU-accelerated animation (transforms and opacity)

- No JavaScript required for animation loop

- Lower CPU overhead compared to JS-based solutions

- Test on low-end devices for performance impact

</performance_considerations>

<!-- ENDSECTION: performance_considerations -->

<!-- SECTION: accessibility -->

<accessibility>

- Wrap animations in `@media (prefers-reduced-motion: no-preference)`

- When reduced motion is requested, use static border or very slow animation

- Ensure color contrast meets WCAG 2.2 AA (4.5:1 minimum)

- Animated borders should not distract from content

</accessibility>

<!-- ENDSECTION: accessibility -->

<!-- SECTION: reduced_motion -->

<reduced_motion>

```css
@media (prefers-reduced-motion: reduce) {
  .card::after {
    animation: none;
    /* Use static gradient or solid border */
    background: linear-gradient(90deg, #0066ff, #00aaff);
  }
}
```

</reduced_motion>

<!-- ENDSECTION: reduced_motion -->

<!-- SECTION: anti_patterns -->

<anti_patterns>

- Do NOT use JavaScript to continuously redraw gradients

- Do NOT use SVG filters layered behind content (outdated approach)

- Do NOT animate layout properties (width, height) with @property
- Do NOT use @property for simple color transitions (use CSS transitions instead)
- Do NOT overuse animated borders - reserve for key interactive elements

</anti_patterns>

<!-- ENDSECTION: anti_patterns -->

<!-- SECTION: color_integration -->

<color_integration>

- Use project's electric blue gradient: `#0066ff → #00aaff`
- For status indicators: red (#ff4545), green (#00ff99), amber (#ffaa00)
- Ensure gradient colors match the visual identity tokens

</color_integration>

<!-- ENDSECTION: color_integration -->
