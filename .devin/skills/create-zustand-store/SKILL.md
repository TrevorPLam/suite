---
name: create-zustand-store
description: Guides the creation of Zustand stores for UI-only state management including uiStore, projectStore, budgetStore, and newsStore with proper TypeScript typing and persistence
---

## Zustand Store Setup

Create Zustand stores in `src/stores/` following these patterns.

### uiStore.ts

Global UI state for layout components.

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Command Palette
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  // Right Panel
  rightPanelOpen: boolean;
  rightPanelContent: 'attention-queue' | 'task-metadata' | 'agent-context' | null;
  openRightPanel: (content: 'attention-queue' | 'task-metadata' | 'agent-context') => void;
  closeRightPanel: () => void;

  // Modals
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;

  // Theme
  accentColor: string;
  setAccentColor: (color: string) => void;

  // Density
  density: 'compact' | 'comfortable' | 'spacious';
  setDensity: (density: 'compact' | 'comfortable' | 'spacious') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Command Palette
      commandPaletteOpen: false,
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),

      // Right Panel
      rightPanelOpen: false,
      rightPanelContent: null,
      openRightPanel: (content) => set({ rightPanelOpen: true, rightPanelContent: content }),
      closeRightPanel: () => set({ rightPanelOpen: false, rightPanelContent: null }),

      // Modals
      activeModal: null,
      openModal: (modalId) => set({ activeModal: modalId }),
      closeModal: () => set({ activeModal: null }),

      // Theme
      accentColor: '#0066ff',
      setAccentColor: (color) => set({ accentColor: color }),

      // Density
      density: 'comfortable',
      setDensity: (density) => set({ density }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        accentColor: state.accentColor,
        density: state.density,
      }),
    }
  )
);
```

### projectStore.ts

Project-specific UI state.

```typescript
import { create } from 'zustand';

interface ProjectState {
  // View mode
  viewMode: 'list' | 'kanban' | 'timeline' | 'my-week' | 'workload';
  setViewMode: (mode: 'list' | 'kanban' | 'timeline' | 'my-week' | 'workload') => void;

  // Filters
  filters: {
    status: string[];
    priority: string[];
    dueDateRange: { start: string | null; end: string | null };
    tags: string[];
  };
  setStatusFilter: (statuses: string[]) => void;
  setPriorityFilter: (priorities: string[]) => void;
  setDueDateRange: (range: { start: string | null; end: string | null }) => void;
  setTagsFilter: (tags: string[]) => void;
  clearFilters: () => void;

  // Sort
  sortBy: 'due-date' | 'last-updated' | 'alphabetical' | 'priority';
  setSortBy: (sort: 'due-date' | 'last-updated' | 'alphabetical' | 'priority') => void;

  // Selected project
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;

  // Task drawer
  taskDrawerOpen: boolean;
  taskDrawerTaskId: string | null;
  openTaskDrawer: (taskId: string) => void;
  closeTaskDrawer: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // View mode
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),

  // Filters
  filters: {
    status: [],
    priority: [],
    dueDateRange: { start: null, end: null },
    tags: [],
  },
  setStatusFilter: (statuses) =>
    set((state) => ({ filters: { ...state.filters, status: statuses } })),
  setPriorityFilter: (priorities) =>
    set((state) => ({ filters: { ...state.filters, priority: priorities } })),
  setDueDateRange: (range) =>
    set((state) => ({ filters: { ...state.filters, dueDateRange: range } })),
  setTagsFilter: (tags) => set((state) => ({ filters: { ...state.filters, tags } })),
  clearFilters: () =>
    set({
      filters: {
        status: [],
        priority: [],
        dueDateRange: { start: null, end: null },
        tags: [],
      },
    }),

  // Sort
  sortBy: 'due-date',
  setSortBy: (sort) => set({ sortBy: sort }),

  // Selected project
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  // Task drawer
  taskDrawerOpen: false,
  taskDrawerTaskId: null,
  openTaskDrawer: (taskId) => set({ taskDrawerOpen: true, taskDrawerTaskId: taskId }),
  closeTaskDrawer: () => set({ taskDrawerOpen: false, taskDrawerTaskId: null }),
}));
```

### budgetStore.ts

Budget-specific UI state.

```typescript
import { create } from 'zustand';

interface BudgetState {
  // Active tab
  activeTab:
    | 'overview'
    | 'transactions'
    | 'goals'
    | 'accounts'
    | 'recurring'
    | 'investments'
    | 'reports';
  setActiveTab: (
    tab:
      | 'overview'
      | 'transactions'
      | 'goals'
      | 'accounts'
      | 'recurring'
      | 'investments'
      | 'reports'
  ) => void;

  // Transaction filters
  transactionFilters: {
    dateRange: { start: string | null; end: string | null };
    categories: string[];
    accounts: string[];
    amountRange: { min: number | null; max: number | null };
    type: string[];
  };
  setTransactionFilters: (filters: Partial<BudgetState['transactionFilters']>) => void;
  clearTransactionFilters: () => void;

  // Transaction drawer
  transactionDrawerOpen: boolean;
  transactionDrawerTransactionId: string | null;
  openTransactionDrawer: (transactionId: string) => void;
  closeTransactionDrawer: () => void;

  // Goal drawer
  goalDrawerOpen: boolean;
  goalDrawerGoalId: string | null;
  openGoalDrawer: (goalId: string) => void;
  closeGoalDrawer: () => void;

  // Chart settings
  chartType: 'line' | 'bar';
  setChartType: (type: 'line' | 'bar') => void;
  timeRange: '3M' | '6M' | '1Y' | 'All';
  setTimeRange: (range: '3M' | '6M' | '1Y' | 'All') => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  // Active tab
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Transaction filters
  transactionFilters: {
    dateRange: { start: null, end: null },
    categories: [],
    accounts: [],
    amountRange: { min: null, max: null },
    type: [],
  },
  setTransactionFilters: (filters) =>
    set((state) => ({
      transactionFilters: { ...state.transactionFilters, ...filters },
    })),
  clearTransactionFilters: () =>
    set({
      transactionFilters: {
        dateRange: { start: null, end: null },
        categories: [],
        accounts: [],
        amountRange: { min: null, max: null },
        type: [],
      },
    }),

  // Transaction drawer
  transactionDrawerOpen: false,
  transactionDrawerTransactionId: null,
  openTransactionDrawer: (transactionId) =>
    set({ transactionDrawerOpen: true, transactionDrawerTransactionId: transactionId }),
  closeTransactionDrawer: () =>
    set({ transactionDrawerOpen: false, transactionDrawerTransactionId: null }),

  // Goal drawer
  goalDrawerOpen: false,
  goalDrawerGoalId: null,
  openGoalDrawer: (goalId) => set({ goalDrawerOpen: true, goalDrawerGoalId: goalId }),
  closeGoalDrawer: () => set({ goalDrawerOpen: false, goalDrawerGoalId: null }),

  // Chart settings
  chartType: 'line',
  setChartType: (type) => set({ chartType: type }),
  timeRange: '6M',
  setTimeRange: (range) => set({ timeRange: range }),
}));
```

### newsStore.ts

News-specific UI state.

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NewsState {
  // Active topics
  activeTopics: string[];
  toggleTopic: (topic: string) => void;
  setTopics: (topics: string[]) => void;

  // Active sources
  activeSources: string[];
  toggleSource: (source: string) => void;
  setSources: (sources: string[]) => void;

  // Frequency
  frequency: 'real-time' | 'hourly' | '6hrs' | 'daily';
  setFrequency: (frequency: 'real-time' | 'hourly' | '6hrs' | 'daily') => void;

  // Sort
  sortBy: 'recency' | 'relevance' | 'trending';
  setSortBy: (sort: 'recency' | 'relevance' | 'trending') => void;

  // Saved articles
  savedArticles: string[];
  toggleSaveArticle: (articleId: string) => void;

  // Last refresh
  lastRefresh: string | null;
  setLastRefresh: (timestamp: string) => void;
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set) => ({
      // Active topics
      activeTopics: ['Technology', 'AI/ML'],
      toggleTopic: (topic) =>
        set((state) => {
          const isActive = state.activeTopics.includes(topic);
          return {
            activeTopics: isActive
              ? state.activeTopics.filter((t) => t !== topic)
              : [...state.activeTopics, topic],
          };
        }),
      setTopics: (topics) => set({ activeTopics: topics }),

      // Active sources
      activeSources: [],
      toggleSource: (source) =>
        set((state) => {
          const isActive = state.activeSources.includes(source);
          return {
            activeSources: isActive
              ? state.activeSources.filter((s) => s !== source)
              : [...state.activeSources, source],
          };
        }),
      setSources: (sources) => set({ activeSources: sources }),

      // Frequency
      frequency: 'hourly',
      setFrequency: (frequency) => set({ frequency }),

      // Sort
      sortBy: 'recency',
      setSortBy: (sort) => set({ sortBy: sort }),

      // Saved articles
      savedArticles: [],
      toggleSaveArticle: (articleId) =>
        set((state) => {
          const isSaved = state.savedArticles.includes(articleId);
          return {
            savedArticles: isSaved
              ? state.savedArticles.filter((id) => id !== articleId)
              : [...state.savedArticles, articleId],
          };
        }),

      // Last refresh
      lastRefresh: null,
      setLastRefresh: (timestamp) => set({ lastRefresh: timestamp }),
    }),
    {
      name: 'news-storage',
      partialize: (state) => ({
        activeTopics: state.activeTopics,
        activeSources: state.activeSources,
        frequency: state.frequency,
        savedArticles: state.savedArticles,
      }),
    }
  )
);
```

## Zustand Best Practices (2026)

1. **TypeScript interfaces**: Define proper TypeScript interfaces for all store states (strict mode recommended, TypeScript 5.8+)
2. **Action naming**: Use clear, descriptive action names (setX, toggleX, openX, closeX)
3. **Immutability**: Always return new state objects, never mutate directly (or use immer middleware)
4. **Partial updates**: Use partial updates for nested state objects
5. **Persistence**: Use zustand/middleware/persist for stores that need to persist to localStorage
6. **Selective persistence**: Use partialize to persist only relevant state
7. **Store separation**: Separate concerns into different stores (UI, domain-specific)
8. **DevTools**: Add devtools middleware in development with proper naming
9. **Default values**: Provide sensible default values for all state
10. **Action composition**: Combine multiple state updates in a single action when needed
11. **Selector optimization**: Use selector arguments to prevent unnecessary re-renders
12. **Store splitting**: Consider splitting large stores into slices for better maintainability
13. **Type safety**: Use curried form for proper TypeScript inference when needed
14. **Middleware ordering**: Apply middleware in correct order (devtools, persist, immer)
15. **Immer middleware**: Use immer for complex nested state updates (prevents mutation bugs)
16. **Redux DevTools integration**: Import type from '@redux-devtools/extension' for proper typing

## Store Usage Examples

### Using uiStore

```typescript
import { useUIStore } from '@/stores/uiStore';

function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside className={sidebarOpen ? 'w-240' : 'w-64'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  );
}
```

### Using projectStore

```typescript
import { useProjectStore } from '@/stores/projectStore';

function ProjectsPage() {
  const { viewMode, setViewMode, filters, setStatusFilter } = useProjectStore();

  return (
    <div>
      <button onClick={() => setViewMode('kanban')}>Kanban</button>
      <button onClick={() => setStatusFilter(['active'])}>Filter Active</button>
    </div>
  );
}
```

### Using budgetStore

```typescript
import { useBudgetStore } from '@/stores/budgetStore';

function BudgetPage() {
  const { activeTab, setActiveTab, chartType, setChartType } = useBudgetStore();

  return (
    <div>
      <button onClick={() => setActiveTab('transactions')}>Transactions</button>
      <button onClick={() => setChartType('bar')}>Bar Chart</button>
    </div>
  );
}
```

### Using newsStore

```typescript
import { useNewsStore } from '@/stores/newsStore';

function NewsSidebar() {
  const { activeTopics, toggleTopic, frequency, setFrequency } = useNewsStore();

  return (
    <aside>
      {activeTopics.map((topic) => (
        <button key={topic} onClick={() => toggleTopic(topic)}>
          {topic}
        </button>
      ))}
      <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
        <option value="real-time">Real-time</option>
        <option value="hourly">Hourly</option>
      </select>
    </aside>
  );
}
```

## Store File Organization

- `uiStore.ts` - Global UI state (sidebar, modals, theme)
- `projectStore.ts` - Project view and filter state
- `budgetStore.ts` - Budget tab and filter state
- `newsStore.ts` - News preferences and saved articles

## DevTools Integration

Add devtools middleware in development with proper typing:

```typescript
import { devtools } from 'zustand/middleware';
import type {} from '@redux-devtools/extension'; // Required for devtools typing

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        /* state */
      }),
      { name: 'ui-storage' }
    ),
    { name: 'UIStore' }
  )
);
```

## Immer Middleware for Complex State

Use immer middleware for complex nested state updates:

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ComplexState {
  nested: {
    deep: {
      value: string;
    };
  };
}

export const useComplexStore = create<ComplexState>()(
  immer((set) => ({
    nested: {
      deep: {
        value: 'initial',
      },
    },
    updateValue: (newValue) =>
      set((state) => {
        state.nested.deep.value = newValue; // Direct mutation allowed with immer
      }),
  }))
);
```
