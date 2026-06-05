---
trigger: always_on
---

# Keyboard Shortcut Hints Rules

Display keyboard shortcuts using <kbd> tags:

<!-- SECTION: kbd_usage -->

<kbd_usage>

- Use <kbd> tags for common actions (e.g., ⌘K, Ctrl+K)
- Show on hover or in tooltips
- Format: <kbd class="kbd">⌘K</kbd>
- Style with Tailwind: px-2 py-1 bg-white/10 rounded text-xs font-mono

</kbd_usage>

<!-- ENDSECTION: kbd_usage -->

<!-- SECTION: common_shortcuts -->

<common_shortcuts>

- Command palette: ⌘K / Ctrl+K
- Save: ⌘S / Ctrl+S
- New item: ⌘N / Ctrl+N
- Search: ⌘F / Ctrl+F
- Close modal: Escape

</common_shortcuts>

<!-- ENDSECTION: common_shortcuts -->

<!-- SECTION: styling -->

<styling>

```css
.kbd {
  @apply px-2 py-1 bg-white/10 rounded text-xs font-mono border border-white/10;
}
```

</styling>

<!-- ENDSECTION: styling -->
