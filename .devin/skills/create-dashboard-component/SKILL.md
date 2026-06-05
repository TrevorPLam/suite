---
name: create-dashboard-component
description: Guides the creation of dashboard-specific components including AgentFleetPanel, ActivityFeed, AttentionQueue, and AmbientStatusBanner with proper data visualization and status indicators
---

## Dashboard Component Types

### AgentFleetPanel

- Grid of AgentCard components (2 cols on md, 3 on lg)
- Each card shows:
  - Agent name + avatar (colored initials)
  - Current status with animated StatusIndicator
  - Current task description (truncated to 2 lines)
  - Token spend this session
  - Uptime duration
  - Expand button → opens AgentDetailDrawer

### ActivityFeed

- Chronological log of all agent actions
- `role="log"` with `aria-live="polite"`
- Each entry shows:
  - Timestamp
  - Agent name badge
  - Action type (tool call, message sent, file written, decision requested)
  - Collapsible detail
- Filter bar: All / Tool Calls / Decisions / Errors

### AttentionQueue

- List of DecisionPacket components requiring human approval
- Each packet shows:
  - Priority badge (Critical / High / Medium)
  - Agent name + task context
  - The specific decision being requested
  - Approve / Reject / Defer buttons
  - Countdown timer if time-sensitive
- Empty state: "No pending decisions — your agents are running autonomously."

### AmbientStatusBanner

- Full-width banner at top
- Shows system health: active agents, pending decisions, last sync time
- Pulses electric blue when agents are thinking
- Dismissible

## StatusIndicator Component

States:

- `thinking`: pulsing blue dot (electric blue)
- `idle`: gray dot
- `error`: red dot
- `waiting`: amber dot
- `success`: green dot

## Data Requirements

All dashboard components must use realistic mock data from `src/lib/mockData/agents.ts`

**Tailwind v4 & shadcn/ui Notes (2026):**

- shadcn/ui v2+ uses Tailwind v4 with @theme directive
- Components have data-slot attributes for styling
- forwardRef removed from components (React 19 pattern)
- HSL colors converted to OKLCH in v4
- Default style deprecated, new projects use new-york style

## Accessibility Requirements (WCAG 2.2 AA)

- ActivityFeed: role="log" aria-live="polite", semantic HTML for log entries
- AttentionQueue: each decision packet has role="article" and descriptive aria-label
- AgentFleetPanel: proper landmark, keyboard navigation for agent cards
- AmbientStatusBanner: role="status", aria-live for system health updates
- All interactive elements: accessible names via aria-label or visible label
- Focus management: visible focus indicators, logical tab order
- Dynamic content: aria-live regions for real-time updates
- Screen readers: announce agent status changes, new decisions
- Keyboard navigation: all interactive elements reachable via keyboard
