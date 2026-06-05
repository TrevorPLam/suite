# React Component Creation Checklist

## Pre-Creation Checklist

- [ ] **Determine component purpose and scope**
  - [ ] Is this a layout component or feature component?
  - [ ] Will it be reusable or single-use?
  - [ ] What data does it need to display/manage?

- [ ] **Choose appropriate directory location**
  - [ ] Layout components: `src/components/layout/`
  - [ ] Dashboard components: `src/components/dashboard/`
  - [ ] Chat components: `src/components/chat/`
  - [ ] Agents components: `src/components/agents/`
  - [ ] Projects components: `src/components/projects/`
  - [ ] Calendar components: `src/components/calendar/`
  - [ ] Budget components: `src/components/budget/`
  - [ ] News components: `src/components/news/`
  - [ ] Settings components: `src/components/settings/`
  - [ ] Analytics components: `src/components/analytics/`
  - [ ] Reusable UI components: `src/components/ui/`

- [ ] **Check for existing similar components**
  - [ ] Search component directories for similar functionality
  - [ ] Review shadcn/ui components for base functionality
  - [ ] Check if existing component can be extended

## Implementation Checklist

- [ ] **Set up component structure**
  - [ ] Create component file with proper naming (PascalCase)
  - [ ] Define TypeScript interfaces for props
  - [ ] Add proper imports (React, hooks, utilities)

- [ ] **Apply visual identity**
  - [ ] Use glass panels: `backdrop-blur-md bg-white/5 border border-white/10 rounded-xl`
  - [ ] Apply electric blue accent: `#0066ff → #00aaff` for CTAs, focus rings
  - [ ] Use dark backgrounds: `#000000`, `#0a0a0a`, `#111111`, `#1a1a1a`
  - [ ] Add 150ms ease-out transitions on interactive elements

- [ ] **Implement accessibility (WCAG 2.2 AA)**
  - [ ] Use semantic HTML elements
  - [ ] Add ARIA landmarks and labels where needed
  - [ ] Ensure keyboard navigation support
  - [ ] Implement focus management (trap in modals, restoration)
  - [ ] Verify 4.5:1 color contrast ratio
  - [ ] Maintain proper heading hierarchy
  - [ ] Add aria-live regions for dynamic content

- [ ] **Add React 18 patterns**
  - [ ] Use `forwardRef` for ref forwarding if needed
  - [ ] Implement proper state management
  - [ ] Add loading states with skeleton components
  - [ ] Include error boundaries where appropriate

## Post-Creation Checklist

- [ ] **Testing and validation**
  - [ ] Component renders without errors
  - [ ] All props work correctly
  - [ ] Keyboard navigation functions
  - [ ] Screen reader announces content properly
  - [ ] Responsive design works on all breakpoints

- [ ] **Integration checks**
  - [ ] Component integrates with parent components
  - [ ] Data flow works correctly
  - [ ] State management is properly connected
  - [ ] Event handlers work as expected

- [ ] **Documentation**
  - [ ] Add JSDoc comments for complex logic
  - [ ] Document prop interfaces
  - [ ] Add usage examples if component is reusable
  - [ ] Update any relevant documentation files

## Performance Checklist

- [ ] **Optimization**
  - [ ] Use React.memo() for expensive components
  - [ ] Implement useMemo() for expensive computations
  - [ ] Use useCallback() for event handlers
  - [ ] Avoid unnecessary re-renders

- [ ] **Motion and animations**
  - [ ] Use motion library for animations
  - [ ] Respect prefers-reduced-motion
  - [ ] Only animate transform and opacity properties
  - [ ] Test animations on low-end devices

## Final Review

- [ ] **Code quality**
  - [ ] Code follows project conventions
  - [ ] TypeScript types are correct
  - [ ] No console errors or warnings
  - [ ] Code is readable and maintainable

- [ ] **User experience**
  - [ ] Component feels responsive
  - [ ] Loading states are clear
  - [ ] Error states are handled gracefully
  - [ ] Micro-interactions feel natural
