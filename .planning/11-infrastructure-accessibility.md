# Accessibility Strategy

**Last updated:** 2026-06-04
**Version:** 1.0

---

## 1. Overview

The Sovereign Suite is committed to accessibility as a core design principle. This document defines the accessibility strategy for ensuring WCAG 2.1 AA conformance across all web and mobile applications, in compliance with the European Accessibility Act (EAA) and other accessibility laws.

---

## 2. Accessibility Standards

### 2.1 WCAG 2.1 AA Conformance

The Sovereign Suite aims to achieve WCAG 2.1 Level AA conformance for:

- **Web applications:** All SPAs in `apps/*/web`
- **Mobile applications:** iOS and Android apps built with Capacitor
- **Documentation:** Help center and developer portal
- **Admin interfaces:** Internal tools and dashboards

### 2.2 EAA Compliance

The European Accessibility Act requires digital products and services to be accessible. See `.planning/07-business-18-compliance-gdpr-cra.md` (Section 20) for EAA requirements and microenterprise exemption details.

---

## 3. Accessibility Testing Strategy

### 3.1 Automated Testing

**Axe-Core Integration:**

```typescript
// packages/ui-kit/src/a11y/axe-config.ts
import Axe from '@axe-core/react';

export const axeConfig = {
  rules: {
    // Enable all WCAG 2.1 AA rules
    'wcag2a': { enabled: true },
    'wcag2aa': { enabled: true },
    'wcag21a': { enabled: true },
    'wcag21aa': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
};
```

**CI Integration:**

```yaml
# .github/workflows/a11y.yml
name: Accessibility Tests

on: [pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm nx run-many --target=test:a11y
```

**Vitest Test:**

```typescript
// apps/calendar/web/src/__tests__/a11y.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Axe from '@axe-core/react';
import CalendarApp from '../src/CalendarApp';

describe('Calendar Accessibility', () => {
  it('should have no a11y violations', async () => {
    const { container } = render(<CalendarApp />);
    const results = await Axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
```

### 3.2 Manual Testing

**Keyboard Navigation Checklist:**

- [ ] All interactive elements are keyboard-accessible
- [ ] Tab order follows visual layout
- [ ] Focus indicators are visible
- [ ] Skip links work correctly
- [ ] Modal traps focus
- [ ] Escape key closes modals/menus

**Screen Reader Testing:**

- **VoiceOver (iOS/macOS):** Test with Safari and iOS Simulator
- **NVDA (Windows):** Test with Firefox and Chrome
- **TalkBack (Android):** Test with Chrome on Android

**Color Contrast Testing:**

- Use Chrome DevTools Lighthouse
- Verify contrast ratios meet WCAG 2.1 AA:
  - Normal text: 4.5:1
  - Large text (18pt+): 3:1
  - UI components: 3:1

### 3.3 User Testing

Conduct quarterly accessibility testing with users who have disabilities:

- **Blind/low vision users:** Screen reader navigation
- **Keyboard-only users:** Full keyboard accessibility
- **Colorblind users:** Color-independent information
- **Cognitive disabilities:** Clear language and instructions

---

## 4. Component Library Accessibility

### 4.1 shadcn/ui Components

All vendored shadcn/ui components must be audited for accessibility:

```typescript
// packages/ui-kit/src/components/Button/Button.tsx
export const Button = ({ children, ...props }) => {
  return (
    <button
      {...props}
      // Ensure keyboard focus is visible
      className="focus:ring-2 focus:ring-offset-2"
    >
      {children}
    </button>
  );
};
```

### 4.2 Custom Components

**Accessible Modal:**

```typescript
// packages/ui-kit/src/components/Modal/Modal.tsx
import { useEffect, useRef } from 'react';

export const Modal = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Save previous focus
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus modal
      modalRef.current?.focus();
      
      // Trap focus in modal
      const trapFocus = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          // Focus trap logic
        }
      };
      
      document.addEventListener('keydown', trapFocus);
      
      return () => {
        document.removeEventListener('keydown', trapFocus);
        // Restore focus
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {children}
    </div>
  );
};
```

**Accessible Form:**

```typescript
// packages/ui-kit/src/components/Form/Form.tsx
export const FormField = ({ label, error, children }) => {
  const id = useId();
  
  return (
    <div>
      <label htmlFor={id} className="block">
        {label}
        {error && <span className="text-red-500 ml-2">{error}</span>}
      </label>
      {children}
      {error && (
        <span id={`${id}-error`} role="alert" className="text-red-500 text-sm">
          {error}
        </span>
      )}
    </div>
  );
};
```

---

## 5. Accessibility in Development Workflow

### 5.1 Spec Creation

Every feature spec must include accessibility requirements:

```markdown
# Feature: Calendar Event Creation

## Accessibility Requirements

- [ ] Event form is keyboard-navigable
- [ ] Form fields have proper labels and error messages
- [ ] Date picker is accessible to screen readers
- [ ] Color-coded events have text labels
- [ ] Focus returns to triggering element after modal close
```

### 5.2 Code Review Checklist

PR reviewers must verify:

- [ ] New components pass Axe-Core tests
- [ ] Keyboard navigation works correctly
- [ ] ARIA attributes are correct
- [ ] Color contrast meets WCAG AA
- [ ] Images have alt text
- [ ] Forms have proper labels

### 5.3 AI Agent Rules

```markdown
## Accessibility Rules (AI Agents Must Follow)

1. All new components must pass Axe-Core automated tests.
2. All interactive elements must have visible focus indicators.
3. All images must have alt text or be marked decorative.
4. All forms must have proper labels associated with inputs.
5. All modals must trap focus and provide escape key support.
6. All dynamic content must use ARIA live regions for screen readers.
7. All color-coded information must have text alternatives.
8. All keyboard interactions must match mouse interactions.
```

---

## 6. High-Contrast Theme

### 6.1 Theme Implementation

```typescript
// packages/ui-kit/src/themes/high-contrast.ts
export const highContrastTheme = {
  colors: {
    background: '#000000',
    foreground: '#FFFFFF',
    primary: '#FFFF00', // Yellow for high contrast
    'primary-foreground': '#000000',
    border: '#FFFFFF',
    muted: '#333333',
    'muted-foreground': '#FFFFFF',
  },
};
```

### 6.2 Theme Toggle

```typescript
// packages/ui-kit/src/hooks/useTheme.ts
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'high-contrast'>('light');
  
  const toggleHighContrast = () => {
    setTheme(theme === 'high-contrast' ? 'light' : 'high-contrast');
  };
  
  return { theme, setTheme, toggleHighContrast };
}
```

---

## 7. Accessibility Documentation

### 7.1 Accessibility Statement

Each app must publish an accessibility statement at `/accessibility`. Use the template at `.planning/12-legal-39-accessibility-statement-template.md`.

### 7.2 Help Center Articles

Create accessibility help articles:

- "How to navigate the Sovereign Suite with a keyboard"
- "Using screen readers with the Sovereign Suite"
- "Enabling high-contrast mode"
- "Adjusting text size and spacing"

---

## 8. Accessibility Training

### 8.1 Developer Training

All developers must complete accessibility training:

- **WCAG 2.1 AA fundamentals**
- **Screen reader basics**
- **Keyboard navigation patterns**
- **A11y testing tools**

### 8.2 Designer Training

All designers must complete accessibility training:

- **Color contrast requirements**
- **Typography best practices**
- **Focus indicator design**
- **Accessible form design**

---

## 9. Monitoring and Reporting

### 9.1 Accessibility Metrics

Track accessibility metrics:

- **Axe-Core violations:** Number and severity of violations per PR
- **Keyboard navigation:** Percentage of components tested
- **Screen reader compatibility:** Issues reported by users
- **Color contrast:** Components failing contrast checks

### 9.2 User Feedback

Collect accessibility feedback:

- In-app feedback widget with accessibility category
- Accessibility email: accessibility@yourdomain.com
- Regular surveys with accessibility questions

---

## 10. Accessibility Roadmap

| Quarter | Milestone |
|---------|-----------|
| **Q2 2026** | Axe-Core integration in CI for all apps |
| **Q3 2026** | High-contrast theme implementation |
| **Q4 2026** | Screen reader testing with external users |
| **Q1 2027** | Full WCAG 2.1 AA conformance audit |
| **Q2 2027** | Accessibility statement published for all apps |

---

*This document must be updated when the accessibility strategy changes.*
