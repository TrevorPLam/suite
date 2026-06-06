# Cross-App State

This document defines the cross-app state model for the Sovereign Suite, covering BroadcastChannel event bus implementation, window.postMessage protocol, cross-app deep linking, and shared user preferences architecture.

---

## Overview

The Sovereign Suite consists of 53 apps that run in the same browser context (web) or as native apps (Capacitor). Cross-app state sharing enables features like:

- Single sign-on across all apps
- Shared theme preference (dark/light mode)
- Unread notification count
- Active upload progress
- Cross-app file picker (Drive → Mail)

---

## Cross-App State Model

### What is Shareable

| State | Shareable | Storage | Sync Mechanism |
|-------|-----------|---------|----------------|
| **Auth session** | ✅ Yes | Better Auth cookie | Automatic |
| **Theme preference** | ✅ Yes | `auth.users.preferences` | BroadcastChannel |
| **Language preference** | ✅ Yes | `auth.users.preferences` | BroadcastChannel |
| **Timezone** | ✅ Yes | `auth.users.preferences` | BroadcastChannel |
| **Unread notification count** | ✅ Yes | KV store | BroadcastChannel |
| **Active upload progress** | ✅ Yes | In-memory | BroadcastChannel |
| **App-specific data** | ❌ No | App-specific storage | N/A |

### What Must Remain Per-App

| State | Per-App Only | Storage | Reason |
|-------|--------------|---------|--------|
| **App-specific settings** | ✅ Yes | App-specific storage | Different settings per app |
| **App-specific cache** | ✅ Yes | App-specific storage | Different cache needs |
| **App-specific UI state** | ✅ Yes | In-memory | Different UI per app |

---

## BroadcastChannel Event Bus

### Channel Name Convention

Use a single channel name for all cross-app events:

```typescript
const CHANNEL_NAME = 'sovereign-suite-events';
```

### Event Schema

```typescript
interface CrossAppEvent {
  type: 'theme_change' | 'language_change' | 'notification_update' | 'upload_progress';
  payload: any;
  sourceApp: string; // e.g., 'calendar', 'drive', 'mail'
  timestamp: number;
}
```

### Implementation

```typescript
// packages/ui/src/lib/cross-app-bus.ts
export class CrossAppBus {
  private channel: BroadcastChannel;
  private listeners: Map<string, Set<(event: CrossAppEvent) => void>> = new Map();

  constructor() {
    this.channel = new BroadcastChannel('sovereign-suite-events');
    this.channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private handleMessage(event: CrossAppEvent) {
    const listeners = this.listeners.get(event.type) || new Set();
    listeners.forEach((listener) => listener(event));
  }

  on(eventType: string, listener: (event: CrossAppEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  off(eventType: string, listener: (event: CrossAppEvent) => void) {
    this.listeners.get(eventType)?.delete(listener);
  }

  emit(event: CrossAppEvent) {
    this.channel.postMessage(event);
  }
}

export const crossAppBus = new CrossAppBus();
```

### Usage in Calendar App

```typescript
// apps/calendar/web/src/hooks/use-theme.ts
import { crossAppBus } from '@suite/ui';

export function useTheme() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Listen for theme changes from other apps
    crossAppBus.on('theme_change', (event) => {
      setTheme(event.payload.theme);
    });

    return () => {
      crossAppBus.off('theme_change', () => {});
    };
  }, []);

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme);
    crossAppBus.emit({
      type: 'theme_change',
      payload: { theme: newTheme },
      sourceApp: 'calendar',
      timestamp: Date.now(),
    });
  };

  return { theme, changeTheme };
}
```

### Origin Validation

Validate that events come from trusted origins:

```typescript
// packages/ui/src/lib/cross-app-bus.ts
const TRUSTED_ORIGINS = [
  'https://calendar.yourdomain.com',
  'https://drive.yourdomain.com',
  'https://mail.yourdomain.com',
  // ... all app origins
];

export class CrossAppBus {
  private channel: BroadcastChannel;

  constructor() {
    this.channel = new BroadcastChannel('sovereign-suite-events');
    this.channel.onmessage = (event) => {
      if (!this.isTrustedOrigin(event.origin)) {
        console.warn('Untrusted origin in cross-app event:', event.origin);
        return;
      }
      this.handleMessage(event.data);
    };
  }

  private isTrustedOrigin(origin: string): boolean {
    return TRUSTED_ORIGINS.some((trusted) => origin === trusted);
  }
}
```

---

## window.postMessage Protocol

### Use Case: Embedded Drive File Picker in Mail

The Mail app needs to embed the Drive file picker to attach files to emails.

### Message Format

```typescript
interface PostMessageRequest {
  type: 'drive_file_picker_open' | 'drive_file_picker_close';
  payload: {
    accept?: string[]; // MIME types to accept
    multiple?: boolean;
  };
}

interface PostMessageResponse {
  type: 'drive_file_picker_select' | 'drive_file_picker_cancel';
  payload: {
    files?: Array<{
      id: string;
      name: string;
      size: number;
      mimeType: string;
    }>;
  };
}
```

### Implementation in Mail App

```typescript
// apps/mail/web/src/components/file-picker.tsx
export function FilePicker() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const openFilePicker = () => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'drive_file_picker_open',
        payload: {
          accept: ['image/*', 'application/pdf'],
          multiple: true,
        },
      },
      'https://drive.yourdomain.com' // targetOrigin - NEVER use '*'
    );
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== 'https://drive.yourdomain.com') {
      return;
    }

    if (event.data.type === 'drive_file_picker_select') {
      console.log('Selected files:', event.data.payload.files);
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <>
      <button onClick={openFilePicker}>Attach File</button>
      <iframe
        ref={iframeRef}
        src="https://drive.yourdomain.com/file-picker"
        style={{ display: 'none' }}
      />
    </>
  );
}
```

### Implementation in Drive App

```typescript
// apps/drive/web/src/file-picker.tsx
export function FilePicker() {
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== 'https://mail.yourdomain.com') {
      return;
    }

    if (event.data.type === 'drive_file_picker_open') {
      // Open file picker UI
    }
  };

  const selectFiles = (files: File[]) => {
    window.parent.postMessage(
      {
        type: 'drive_file_picker_select',
        payload: {
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            mimeType: f.mimeType,
          })),
        },
      },
      'https://mail.yourdomain.com' // targetOrigin - NEVER use '*'
    );
  };

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return <FilePickerUI onSelect={selectFiles} />;
}
```

### Security Rule

**NEVER use `*` as targetOrigin**. Always specify the exact origin of the parent window.

---

## Cross-App Deep Linking

### URI Schemes (Capacitor Mobile App)

Custom URI schemes allow deep linking from other apps:

```typescript
// Calendar: calendar://event/abc123
// Drive: drive://file/def456
// Mail: mail://compose?to=user@example.com
```

### Implementation in Capacitor

```typescript
// apps/calendar/mobile/src/app.tsx
import { App } from '@capacitor/app';

App.addListener('appUrlOpen', (event) => {
  const url = event.url;
  
  if (url.startsWith('calendar://event/')) {
    const eventId = url.replace('calendar://event/', '');
    // Navigate to event detail page
    navigation.navigate(`/event/${eventId}`);
  }
});
```

### HTTP Deep Links (Web)

Use standard HTTP deep links for web apps:

```typescript
// Calendar: https://calendar.yourdomain.com/event/abc123
// Drive: https://drive.yourdomain.com/file/def456
// Mail: https://mail.yourdomain.com/compose?to=user@example.com
```

### Notification Click Handlers

```typescript
// apps/calendar/web/src/lib/notifications.ts
export function handleNotificationClick(notification: Notification) {
  if (notification.data.type === 'event') {
    window.location.href = `https://calendar.yourdomain.com/event/${notification.data.eventId}`;
  }
}
```

---

## Shared User Preferences Architecture

### Storage Location

Store global preferences in the `auth.users` table:

```sql
ALTER TABLE auth.users ADD COLUMN preferences JSONB DEFAULT '{}';
```

### Preferences Schema

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: 'iso' | 'us' | 'eu';
  timeFormat: '12h' | '24h';
}
```

### Fetch Once at Shell Load

The shell (shared navigation app) fetches preferences once and propagates to all apps:

```typescript
// apps/shell/web/src/hooks/use-preferences.ts
export function usePreferences() {
  const { data: user } = useUser();
  const preferences = user?.preferences || {
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
  };

  return preferences;
}
```

### Propagate to All Apps

```typescript
// apps/shell/web/src/app.tsx
export function App() {
  const preferences = usePreferences();

  return (
    <PreferencesContext.Provider value={preferences}>
      <CalendarApp />
      <DriveApp />
      <MailApp />
    </PreferencesContext.Provider>
  );
}
```

### Update Preferences

```typescript
// apps/calendar/web/src/hooks/use-preferences.ts
export function usePreferences() {
  const { data: user, refetch } = useUser();

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    await fetch('/api/user/preferences', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    
    // Refetch user data
    refetch();
    
    // Broadcast change to other apps
    crossAppBus.emit({
      type: 'preferences_change',
      payload: updates,
      sourceApp: 'calendar',
      timestamp: Date.now(),
    });
  };

  return { preferences: user?.preferences, updatePreferences };
}
```

---

## Cross-App State Best Practices

### 1. Use BroadcastChannel for Real-Time Updates

BroadcastChannel is more efficient than polling for real-time updates.

### 2. Validate Origins

Always validate the origin of postMessage events to prevent XSS attacks.

### 3. Never Use `*` as targetOrigin

Always specify the exact origin when using postMessage.

### 4. Debounce Rapid Updates

Debounce rapid updates (e.g., upload progress) to avoid overwhelming the event bus.

```typescript
import { debounce } from 'lodash-es';

const debouncedEmit = debounce(crossAppBus.emit, 100);
```

### 5. Handle Channel Errors

Handle cases where BroadcastChannel is not supported (e.g., in some browsers):

```typescript
let channel: BroadcastChannel | null = null;

try {
  channel = new BroadcastChannel('sovereign-suite-events');
} catch (error) {
  console.warn('BroadcastChannel not supported, falling back to localStorage');
  // Fallback to localStorage events
}
```

### 6. Clean Up Listeners

Always clean up event listeners to prevent memory leaks:

```typescript
useEffect(() => {
  crossAppBus.on('theme_change', handler);
  return () => crossAppBus.off('theme_change', handler);
}, []);
```

---

## Testing Cross-App State

### Unit Tests

```typescript
// packages/ui/src/lib/cross-app-bus.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CrossAppBus } from './cross-app-bus';

describe('CrossAppBus', () => {
  it('should emit and receive events', () => {
    const bus = new CrossAppBus();
    const handler = vi.fn();
    
    bus.on('theme_change', handler);
    bus.emit({
      type: 'theme_change',
      payload: { theme: 'dark' },
      sourceApp: 'calendar',
      timestamp: Date.now(),
    });
    
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'theme_change',
        payload: { theme: 'dark' },
      })
    );
  });
});
```

### E2E Tests

```typescript
// apps/calendar/web/e2e/cross-app.spec.ts
import { test, expect } from '@playwright/test';

test('theme change syncs across apps', async ({ context }) => {
  // Open Calendar app
  const calendarPage = await context.newPage();
  await calendarPage.goto('https://calendar.yourdomain.com');
  
  // Open Drive app
  const drivePage = await context.newPage();
  await drivePage.goto('https://drive.yourdomain.com');
  
  // Change theme in Calendar
  await calendarPage.click('[data-testid="theme-toggle"]');
  
  // Verify theme changed in Drive
  await expect(drivePage.locator('html')).toHaveClass(/dark/);
});
```

---

*This document must be updated when new cross-app state patterns are introduced.*
