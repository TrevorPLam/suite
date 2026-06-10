# Test Data Factories

This document explains the test data factory pattern used in the `@suite/db` package for creating consistent, reusable test data.

## Overview

Test data factories are helper functions that create valid test data with sensible defaults. They follow the Factory pattern with support for field overrides, making tests more maintainable and reducing boilerplate.

## Available Factories

### Calendar Events

```typescript
import { createCalendarEvent } from '../test-helpers/factories/calendar.js';

// Basic usage with defaults
const event = await createCalendarEvent();
// Returns: { title: 'Test Event', startAt: <now>, endAt: <now + 1h> }

// With overrides
const event = await createCalendarEvent({
  title: 'Custom Event',
  startAt: '2026-06-10T10:00:00Z',
  endAt: '2026-06-10T11:00:00Z',
});

// With encryption
const key = await generateAESKey(false);
const event = await createCalendarEvent({ title: 'Secret Event' }, key);
```

### Tasks

```typescript
import { createTask } from '../test-helpers/factories/tasks.js';

// Basic usage with defaults
const task = await createTask();
// Returns: { title: 'Test Task', completed: false, archived: false, dueDate: null, priority: 'medium', tags: [] }

// With overrides
const task = await createTask({
  title: 'Custom Task',
  priority: 'high',
  tags: ['urgent', 'work'],
});

// With encryption
const key = await generateAESKey(false);
const task = await createTask({ title: 'Secret Task' }, key);
```

### Drive Files

```typescript
import { createDriveFile } from '../test-helpers/factories/drive.js';

// Basic usage with defaults
const file = await createDriveFile();
// Returns: { name: 'test.txt', size: 1024, createdAt: <now>, modifiedAt: <now> }

// With overrides
const file = await createDriveFile({
  name: 'document.pdf',
  size: 2048,
  folderId: 'folder-123',
  mimeType: 'application/pdf',
});

// With encryption
const key = await generateAESKey(false);
const file = await createDriveFile({ name: 'Secret Document' }, key);
```

### Drive Folders

```typescript
import { createDriveFolder } from '../test-helpers/factories/drive.js';

// Basic usage with defaults
const folder = await createDriveFolder();
// Returns: { name: 'Test Folder', createdAt: <now> }

// With overrides
const folder = await createDriveFolder({
  name: 'Documents',
  parentId: 'parent-123',
});

// With encryption
const key = await generateAESKey(false);
const folder = await createDriveFolder({ name: 'Secret Folder' }, key);
```

### Users

```typescript
import { createUser } from '../test-helpers/factories/auth.js';

// Basic usage with defaults
const user = createUser();
// Returns: { email: 'test@example.com', name: 'Test User' }

// With overrides
const user = createUser({
  email: 'custom@example.com',
  name: 'Custom User',
});
```

## Pattern: Override Parameters

All factories accept a `Partial` type as the first parameter, allowing you to override specific fields while keeping sensible defaults for the rest:

```typescript
// Only override what you need
const task = await createTask({
  priority: 'high',  // Only priority is overridden, other fields use defaults
});
```

## Pattern: Encryption Support

Factories support optional encryption via a `CryptoKey` parameter. When provided, the primary text field (title/name) is encrypted using AES-256-GCM:

```typescript
import { generateAESKey } from '@suite/crypto';

const key = await generateAESKey(false);
const event = await createCalendarEvent({ title: 'Secret Event' }, key);
// The title will be encrypted and stored as JSON string
```

## Best Practices

1. **Use factories in all new tests**: Replace hardcoded test data with factory calls
2. **Override only what's needed**: Use the override pattern to specify only fields relevant to the test
3. **Keep defaults realistic**: Default values should represent typical production data
4. **Test encryption when needed**: Use the encryption parameter for tests that verify encryption behavior
5. **Import from the index**: Use `import { createCalendarEvent } from '../test-helpers/factories/calendar.js'` for clear imports

## Migration Guide

### Before (Hardcoded Data)

```typescript
const event = await repository.create({
  title: 'Test Event',
  startAt: '2026-06-10T10:00:00Z',
  endAt: '2026-06-10T11:00:00Z',
}, context);
```

### After (Factory)

```typescript
const eventData = await createCalendarEvent({
  title: 'Test Event',
  startAt: '2026-06-10T10:00:00Z',
  endAt: '2026-06-10T11:00:00Z',
});
const event = await repository.create(eventData, context);
```

## Benefits

- **Consistency**: All tests use the same default values
- **Maintainability**: Changes to data structure only require updating the factory
- **Readability**: Tests focus on what's being tested, not data setup
- **Flexibility**: Override pattern allows customization per test
- **Encryption**: Built-in support for encrypted test data
