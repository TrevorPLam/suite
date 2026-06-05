---
name: create-layout-component
description: Guides the creation of layout components including Sidebar, CommandPalette, StatusBar, and RightPanel with proper state management and responsive behavior
---

## Layout Components

### Sidebar (Sidebar.tsx)

- Fixed left sidebar with two states:
  - Collapsed: icons only, 64px width
  - Expanded: icons + labels, 240px width
- Toggle state stored in `uiStore`
- Nav items in order:
  1. Dashboard (grid icon)
  2. Chat (message-square icon)
  3. Projects (layers icon)
  4. Calendar (calendar icon)
  5. News (newspaper icon)
  6. Budget (wallet icon)
  7. Divider
  8. Settings (gear icon) — expands accordion with: General, Analytics, Memory, Integrations, Appearance, Notifications, Export, Danger Zone
- Active state: electric-blue left border + blue-tinted background + blue icon
- Hover: subtle white/8 background

### CommandPalette (CommandPalette.tsx)

- Triggered by `Cmd+K` / `Ctrl+K`
- Full-screen dark overlay: `bg-black/80 backdrop-blur`
- Centered modal: 640px wide
- Electric-blue highlight on selected item
- Groups: Navigation, Actions, Recent Projects, Recent Chats
- `role="combobox"` with `aria-expanded` and `aria-activedescendant`

### StatusBar (StatusBar.tsx)

- 32px fixed bottom bar
- Shows:
  - Backend connection status (green pulse = connected, red = disconnected)
  - Active agent count
  - Current time
  - Global token spend today
- Clicking each item opens relevant panel

### RightPanel (RightPanel.tsx)

- Collapsible 320px right drawer
- Smooth 200ms slide transition
- Content varies by page:
  - Dashboard: AttentionQueue
  - Projects: task metadata
  - Chat: agent context
- Toggled by button in top-right corner

## State Management

Use Zustand for UI-only state:

- Sidebar open/close
- Command palette open/close
- Active panel (for RightPanel)

## Responsive Behavior

- Sidebar should be responsive on smaller screens
- Right panel should overlay content on mobile
- Command palette should be full-screen on mobile

## Accessibility (WCAG 2.2 AA)

- Sidebar: proper ARIA navigation landmarks (nav), semantic HTML, keyboard navigation
- CommandPalette: role="combobox" with proper ARIA (aria-expanded, aria-activedescendant)
- StatusBar: accessible labels for each item, role="status"
- RightPanel: focus trap when open, role="dialog", aria-modal="true"
- All interactive elements: 4.5:1 color contrast ratio minimum
- Focus management: visible focus indicators, focus restoration after panel close
- Dynamic content: aria-live regions for status updates
- Screen readers: announce panel open/close, command palette selection
- Keyboard navigation: proper tab order, escape to close panels/drawers

**Tailwind v4 & shadcn/ui Notes (2026):**

- shadcn/ui v2+ uses Tailwind v4 with @theme directive
- Components have data-slot attributes for styling
- forwardRef removed from components (React 19 pattern)
- HSL colors converted to OKLCH in v4
- Default style deprecated, new projects use new-york style
