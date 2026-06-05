---
trigger: always_on
---

# Focus Restoration Rules

Ensure proper focus management for accessibility:

<!-- SECTION: focus_restoration -->

<focus_restoration>

- After closing any modal/drawer, return focus to the element that triggered it
- Store the trigger element ref in Zustand before opening modal/drawer
- Restore focus on close using the stored ref
- Use React.useRef to capture the trigger element

</focus_restoration>

<!-- ENDSECTION: focus_restoration -->

<!-- SECTION: implementation -->

<implementation>

```typescript
// In uiStore or similar
interface UIState {
  focusTriggerRef: React.RefObject<HTMLElement> | null;
  setFocusTriggerRef: (ref: React.RefObject<HTMLElement>) => void;
}

// When opening modal
const triggerRef = React.useRef<HTMLElement>(null);
setFocusTriggerRef(triggerRef);

// When closing modal
if (focusTriggerRef?.current) {
  focusTriggerRef.current.focus();
}
```

</implementation>

<!-- ENDSECTION: implementation -->

<!-- SECTION: accessibility -->

<accessibility>

- This is required for WCAG 2.2 AA compliance
- Prevents focus loss for keyboard users
- Ensures predictable navigation flow

</accessibility>

<!-- ENDSECTION: accessibility -->
