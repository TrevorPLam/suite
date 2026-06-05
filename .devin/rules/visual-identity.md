---
trigger: always_on
---

# Visual Identity Rules

Follow these visual design guidelines for all components:

<!-- SECTION: color_scheme -->

<color_scheme>

- Base backgrounds: #050507 (slightly blue-shifted near-black) and #0a0a0a
- Card surfaces: Deep charcoal (#111111, #1a1a1a)
- Accent color: Electric blue (#0066ff → #00aaff gradient)
- Accent uses: CTAs, focus rings, active nav, status pulses
  </color_scheme>

<!-- ENDSECTION: color_scheme -->

<!-- SECTION: typography -->

<typography>
- Font: Inter or system-ui
- Base size: 14px
- Line height: Generous for readability
- Headings: Tight letter-spacing
</typography>

<!-- ENDSECTION: typography -->

<!-- SECTION: glass_panels -->

<glass_panels>

- Use backdrop-blur-md on selected shell surfaces (main frame, drawer surfaces, command palette, hero cards)
- Add noise-overlay utility only for these glass shell surfaces
- Background: bg-white/5
- Border: border border-white/10
- Rounded corners: rounded-xl
- Ordinary content cards use quieter dark surface (bg-[#111111])
  </glass_panels>

<!-- ENDSECTION: glass_panels -->

<!-- SECTION: motion -->

<motion>
- Transition duration: 150ms
- Easing: ease-out
- Apply to all interactive elements
- Use skeleton loaders on every data fetch
- Add animated pulse on live status indicators
- Respect prefers-reduced-motion media query
- See motion-hierarchy.md for Alive/Quiet/Static categorization
</motion>

<!-- ENDSECTION: motion -->

<!-- SECTION: layout_structure -->

<layout_structure>

- Fixed left sidebar: 64px collapsed / 240px expanded
- Scrollable main content area
- Collapsible right utility panel: 320px
- Persistent bottom status bar: 32px
  </layout_structure>

<!-- ENDSECTION: layout_structure -->
