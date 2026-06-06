# Internationalization

This document defines the internationalization (i18n) strategy for the Sovereign Suite, covering library choice, translation string location, lazy-loading strategy, RTL support, locale-aware blind indexing, and timezone model.

---

## Library Choice: lingui vs. react-i18next

### Comparison

| Feature | lingui | react-i18next |
|---------|--------|---------------|
| **Bundle size** | Smaller (~5 KB) | Larger (~15 KB) |
| **TypeScript support** | Excellent (ICU message format) | Good |
| **Monorepo support** | Native support via CLI | Requires configuration |
| **Message extraction** | Automatic via CLI | Manual or via plugin |
| **Pluralization** | ICU format (built-in) | Requires i18next plural |
| **React integration** | Good | Excellent |
| **Community adoption** | Growing (2026) | Mature |

### Recommendation: lingui

**Rationale:**

1. **Smaller bundle size**: Critical for 53 apps sharing `packages/ui`
2. **Native monorepo support**: lingui CLI works well with Nx/pnpm workspaces
3. **Automatic message extraction**: Reduces manual work
4. **ICU message format**: Industry standard for complex pluralization and gender

### Installation

```bash
pnpm add @lingui/react @lingui/cli
pnpm add -D @lingui/macro
```

---

## Translation String Location

### Strategy: Per-App JSON Files

Each app maintains its own translation files in `apps/<app>/web/src/locales/`:

```
apps/calendar/web/src/locales/
├── en.json
├── de.json
├── fr.json
└── es.json

apps/drive/web/src/locales/
├── en.json
├── de.json
├── fr.json
└── es.json
```

### Shared Strings in packages/ui

Common UI strings (buttons, labels, errors) live in `packages/ui/src/locales/`:

```
packages/ui/src/locales/
├── en.json
├── de.json
├── fr.json
└── es.json
```

### Trade-off Analysis

| Approach | Pros | Cons |
|----------|------|------|
| **Per-app files** | Easy to manage, no conflicts | Duplicate strings across apps |
| **Shared files** | No duplicates, consistent terminology | Harder to manage, merge conflicts |

**Decision**: Hybrid approach
- App-specific strings: Per-app files
- Common UI strings: Shared files in `packages/ui`

---

## Lazy-Loading Strategy

### Code-Splitting by Locale

Load only the required locale on initial page load:

```typescript
// apps/calendar/web/src/i18n.ts
import { i18n } from '@lingui/core';
import { en, de, fr, es } from './locales';

const locales = { en, de, fr, es };

export async function loadLocale(locale: string) {
  const messages = locales[locale] || locales.en;
  i18n.load(locale, messages);
  i18n.activate(locale);
}
```

### Dynamic Import

Use dynamic imports to load locale files on demand:

```typescript
// apps/calendar/web/src/i18n.ts
export async function loadLocale(locale: string) {
  const { messages } = await import(`./locales/${locale}.json`);
  i18n.load(locale, messages);
  i18n.activate(locale);
}
```

### Initial Bundle Impact

With lazy loading, the initial bundle includes only the default locale (English). Other locales are loaded on-demand when the user switches languages.

---

## RTL Support Decision

### Binary Architectural Choice

**Decision**: Support RTL (Right-to-Left) languages from day one.

**Rationale:**

1. **Market expansion**: Arabic, Hebrew, Farsi markets are significant
2. **Retrofit cost**: Adding RTL later requires extensive CSS changes
3. **User expectation**: RTL users expect native RTL support

### CSS Logical Properties Approach

Use CSS logical properties instead of physical properties:

```css
/* ❌ Physical properties (bad for RTL) */
.button {
  margin-left: 10px;
  padding-right: 20px;
}

/* ✅ Logical properties (works for RTL) */
.button {
  margin-inline-start: 10px;
  padding-inline-end: 20px;
}
```

### Tailwind Configuration

Update Tailwind config to support logical properties:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      spacing: {
        'is': 'inline-start',
        'ie': 'inline-end',
      },
    },
  },
};
```

### Usage in Components

```tsx
// packages/ui/src/button.tsx
export function Button({ children }) {
  return (
    <button className="px-4 py-2 m-is-2">
      {children}
    </button>
  );
}
```

### Direction Detection

Detect and set document direction based on locale:

```typescript
// apps/calendar/web/src/i18n.ts
const rtlLocales = ['ar', 'he', 'fa', 'ur'];

export function setDocumentDirection(locale: string) {
  const direction = rtlLocales.includes(locale) ? 'rtl' : 'ltr';
  document.documentElement.dir = direction;
}
```

---

## Locale-Aware Blind Indexing

### Unicode Normalization

Search tokens must be Unicode-normalized before HMAC to ensure search correctness across languages:

```typescript
// packages/search/src/blind-index.ts
import { createHash } from 'crypto';

export function generateBlindIndexToken(term: string, key: string): string {
  // Normalize to NFC (canonical composition)
  const normalized = term.normalize('NFC');
  
  // Lowercase for case-insensitive search
  const lowercased = normalized.toLowerCase();
  
  // Generate HMAC
  return createHash('sha256')
    .update(lowercased + key)
    .digest('hex');
}
```

### Normalization Forms

| Form | Description | Use Case |
|------|-------------|----------|
| **NFC** | Canonical composition | Default for most languages |
| **NFD** | Canonical decomposition | For decomposed characters |
| **NFKC** | Compatibility composition | For compatibility |
| **NFKD** | Compatibility decomposition | For compatibility |

### Language-Specific Considerations

| Language | Consideration | Example |
|----------|----------------|---------|
| **German** | Umlauts (ä, ö, ü) | "Müller" → "muller" (normalize) |
| **French** | Accents (é, è, ê) | "café" → "cafe" (normalize) |
| **CJK** | Hanzi, Kanji, Hangul | No normalization needed |
| **Arabic** | RTL, ligatures | Normalize before HMAC |

---

## Timezone Model

### Decision: Store in auth.users

Store user timezone preference in the `auth.users` table:

```sql
ALTER TABLE auth.users ADD COLUMN timezone TEXT DEFAULT 'UTC';
```

### Transmission Strategy

**Option 1: Header on every request**

```typescript
// apps/calendar/api/src/middleware/timezone.ts
export const timezoneMiddleware = createMiddleware(async (c, next) => {
  const timezone = c.req.header('X-Timezone') || 'UTC';
  c.set('timezone', timezone);
  await next();
});
```

**Option 2: Fetched once at shell load**

```typescript
// apps/calendar/web/src/hooks/use-timezone.ts
export function useTimezone() {
  const { data: user } = useUser();
  return user?.timezone || 'UTC';
}
```

**Decision**: Option 2 (fetched once)

**Rationale**: Reduces header overhead, timezone rarely changes

### Timezone Conversion

```typescript
// packages/domain-calendar/src/lib/format-event.ts
import { formatInTimeZone } from 'date-fns-tz';

export function formatEventTime(event: Event, timezone: string) {
  return {
    start: formatInTimeZone(event.startAt, timezone, 'PPp'),
    end: formatInTimeZone(event.endAt, timezone, 'PPp'),
  };
}
```

---

## lingui Configuration

### lingui.config.js

```javascript
// lingui.config.js
module.exports = {
  locales: ['en', 'de', 'fr', 'es', 'ar'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: 'apps/<app>/web/src/locales/{locale}',
      include: ['apps/<app>/web/src'],
    },
    {
      path: 'packages/ui/src/locales/{locale}',
      include: ['packages/ui/src'],
    },
  ],
  format: 'minimal',
  compileNamespace: 'es',
};
```

### Extract Messages

```bash
# Extract messages from all apps and packages
pnpm lingui extract

# Compile messages
pnpm lingui compile
```

---

## Usage in Components

### Trans Component

```tsx
import { Trans } from '@lingui/react';

export function EventCard({ event }) {
  return (
    <div>
      <Trans>Event created at {event.createdAt}</Trans>
    </div>
  );
}
```

### t Function

```tsx
import { t } from '@lingui/react';

export function DeleteButton() {
  return (
    <button>
      {t('Delete')}
    </button>
  );
}
```

### Pluralization

```tsx
import { Trans, plural } from '@lingui/react';

export function EventCount({ count }) {
  return (
    <Trans>
      {plural(count, {
        one: '# event',
        other: '# events',
      })}
    </Trans>
  );
}
```

---

## Supported Languages

### Initial Launch

| Language | Code | RTL | Status |
|----------|------|-----|--------|
| English | `en` | No | ✅ Default |
| German | `de` | No | ✅ Launch |
| French | `fr` | No | ✅ Launch |
| Spanish | `es` | No | ✅ Launch |

### Future Expansion

| Language | Code | RTL | Priority |
|----------|------|-----|----------|
| Arabic | `ar` | Yes | High |
| Hebrew | `he` | Yes | High |
| Japanese | `ja` | No | Medium |
| Chinese (Simplified) | `zh-CN` | No | Medium |
| Chinese (Traditional) | `zh-TW` | No | Medium |
| Portuguese | `pt` | No | Low |
| Russian | `ru` | No | Low |

---

## Translation Workflow

### 1. Add Message to Code

```tsx
import { t } from '@lingui/react';

export function NewFeature() {
  return <div>{t('New feature description')}</div>;
}
```

### 2. Extract Messages

```bash
pnpm lingui extract
```

This updates the `.json` files with the new message key.

### 3. Translate

Edit the locale files:

```json
// apps/calendar/web/src/locales/de.json
{
  "New feature description": "Neue Funktionsbeschreibung"
}
```

### 4. Compile

```bash
pnpm lingui compile
```

This generates the compiled message catalogs.

---

## Testing i18n

### Unit Tests

```typescript
// apps/calendar/web/src/components/event-card.test.tsx
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import { EventCard } from './event-card';

test('renders translated text', () => {
  i18n.load('de', { 'Event created': 'Ereignis erstellt' });
  i18n.activate('de');

  render(
    <I18nProvider i18n={i18n}>
      <EventCard event={{ createdAt: new Date() }} />
    </I18nProvider>
  );

  expect(screen.getByText('Ereignis erstellt')).toBeInTheDocument();
});
```

### E2E Tests

```typescript
// apps/calendar/web/e2e/i18n.spec.ts
import { test, expect } from '@playwright/test';

test('language switch works', async ({ page }) => {
  await page.goto('/calendar');
  
  // Switch to German
  await page.click('[data-testid="language-selector"]');
  await page.click('text=Deutsch');
  
  // Verify German text
  await expect(page.locator('text=Ereignis erstellen')).toBeVisible();
});
```

---

## Monitoring

### Track Locale Usage

Track which locales are most used to prioritize translation efforts:

```typescript
// packages/analytics/src/track-locale.ts
export function trackLocale(locale: string) {
  analytics.track('locale_selected', {
    locale,
    timestamp: Date.now(),
  });
}
```

### Track Missing Translations

Log when a translation is missing:

```typescript
// apps/calendar/web/src/i18n.ts
i18n.on('missing', (locale, id) => {
  console.warn(`Missing translation for ${id} in ${locale}`);
  analytics.track('missing_translation', { locale, id });
});
```

---

## Best Practices

1. **Use ICU message format** for complex pluralization and gender
2. **Keep messages short** to minimize bundle size
3. **Avoid concatenation** - use ICU format instead
4. **Test RTL layouts** with Arabic or Hebrew
5. **Normalize search terms** before blind indexing
6. **Store user timezone** in the database
7. **Lazy-load locales** to reduce initial bundle size
8. **Extract messages** before translating
9. **Compile messages** before deploying
10. **Track missing translations** to prioritize work

---

*This document must be updated when new languages are added or when i18n patterns change.*
