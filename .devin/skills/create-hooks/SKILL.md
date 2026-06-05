---
name: create-hooks
description: Guides the creation of custom React hooks using TanStack Query v5 for data fetching, mutations, and domain-specific hooks for projects, calendar, budget, news, and settings. Use sse-implementation skill for Server-Sent Events.
---

## Related Skills

- **sse-implementation**: Use for Server-Sent Events and real-time streaming
- **create-api-client**: Base API client setup and configuration
- **performance**: Optimize hooks for Core Web Vitals and caching
- **create-react-component**: Integrate hooks with component patterns
- **virtualization-implementation**: For hooks managing large data sets

## Custom React Hooks

Create custom hooks in `src/hooks/` following TanStack Query v5 patterns.

**Important TanStack Query v5 Changes (2026):**

- Use `isPending` instead of `isLoading` for initial loading state
- `isLoading` is now derived: `isPending && isFetching`
- Use `isFetching` for any refetch in progress
- `gcTime` replaces `cacheTime` (garbage collection time)
- `isInitialLoading` is deprecated
- Simplified API: single object parameter (no overloads)
- Suspense is now fully supported with `useSuspenseQuery`, `useSuspenseInfiniteQuery`, `useSuspenseQueries`
- New `useMutationState` hook for accessing all mutation states across components
- Optimistic updates simplified using returned variables from `useMutation`
- ~20% smaller bundle size than v4
- Callbacks simplified: refetchInterval, refetchOnWindowFocus, refetchOnReconnect only receive query parameter
- `isDataEqual` replaced with `structuralSharing` option
- Custom loggers removed (use console in dev)
- Updated browserslist for modern, performant bundles

### useAttentionQueue.ts

Hook for managing attention queue (decisions requiring human approval).

```typescript
export function useAttentionQueue() {
  const queryClient = useQueryClient();
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['attention-queue'],
    queryFn: () => fetch('/api/v1/attention-queue').then((res) => res.json()),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/attention-queue/${id}/approve`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attention-queue'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/attention-queue/${id}/reject`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attention-queue'] }),
  });

  return {
    decisions: data,
    isLoading: isPending, // Use isPending for initial load
    isRefetching: isFetching && !isPending, // Refetching but not initial load
    error,
    approve: approveMutation.mutate,
    reject: rejectMutation.mutate,
  };
}
```

### useAgentStatus.ts

Hook for tracking agent fleet status.

```typescript
export function useAgentStatus() {
  const {
    data: agents,
    isPending,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['agents'],
    queryFn: () => fetch('/api/v1/agents').then((res) => res.json()),
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const activeAgents = agents?.filter((a: Agent) => a.status !== 'idle') || [];
  const thinkingAgents = agents?.filter((a: Agent) => a.status === 'thinking') || [];

  return {
    agents,
    activeCount: activeAgents.length,
    thinkingCount: thinkingAgents.length,
    isLoading: isPending,
    isRefetching: isFetching && !isPending,
    error,
  };
}
```

### useCostSummary.ts

Hook for tracking token costs.

```typescript
export function useCostSummary() {
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['cost-analytics'],
    queryFn: () => fetch('/api/v1/cost-analytics').then((res) => res.json()),
  });

  return {
    costSummary: data,
    isLoading: isPending,
    isRefetching: isFetching && !isPending,
    error,
  };
}
```

### useProjects.ts

Hook for project data and operations.

```typescript
export function useProjects(filters?: ProjectFilters) {
  const queryClient = useQueryClient();
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['projects', filters],
    queryFn: () =>
      fetch(`/api/v1/projects${new URLSearchParams(filters as any)}`).then((res) => res.json()),
  });

  const createMutation = useMutation({
    mutationFn: (project: Partial<Project>) =>
      fetch('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify(project),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, project }: { id: string; project: Partial<Project> }) =>
      fetch(`/api/v1/projects/${id}`, { method: 'PUT', body: JSON.stringify(project) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return {
    projects: data,
    isLoading: isPending,
    isRefetching: isFetching && !isPending,
    error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
  };
}
```

### useTasks.ts

Hook for task data and operations.

```typescript
export function useTasks(projectId: string) {
  const queryClient = useQueryClient();
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => fetch(`/api/v1/projects/${projectId}/tasks`).then((res) => res.json()),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (task: Partial<Task>) =>
      fetch(`/api/v1/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(task),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, task }: { id: string; task: Partial<Task> }) =>
      fetch(`/api/v1/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  return {
    tasks: data,
    isLoading: isPending,
    isRefetching: isFetching && !isPending,
    error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
  };
}
```

### useCalendar.ts

Hook for calendar events.

```typescript
export function useCalendar(dateRange?: DateRange) {
  const queryClient = useQueryClient();
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['calendar-events', dateRange],
    queryFn: () =>
      fetch(`/api/v1/calendar/events${new URLSearchParams(dateRange as any)}`).then((res) =>
        res.json()
      ),
  });

  const createMutation = useMutation({
    mutationFn: (event: Partial<Event>) =>
      fetch('/api/v1/calendar/events', {
        method: 'POST',
        body: JSON.stringify(event),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, event }: { id: string; event: Partial<Event> }) =>
      fetch(`/api/v1/calendar/events/${id}`, { method: 'PUT', body: JSON.stringify(event) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/calendar/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  });

  return {
    events: data,
    isLoading: isPending,
    isRefetching: isFetching && !isPending,
    error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
  };
}
```

### useBudget.ts

Hook for budget overview and categories.

```typescript
export function useBudget() {
  const { data: overview, isPending: overviewPending } = useQuery({
    queryKey: ['budget-overview'],
    queryFn: () => fetch('/api/v1/budget/overview').then((res) => res.json()),
  });

  const { data: categories, isPending: categoriesPending } = useQuery({
    queryKey: ['budget-categories'],
    queryFn: () => fetch('/api/v1/budget/categories').then((res) => res.json()),
  });

  const { data: trends, isPending: trendsPending } = useQuery({
    queryKey: ['budget-trends'],
    queryFn: () => fetch('/api/v1/budget/trends').then((res) => res.json()),
  });

  return {
    overview,
    categories,
    trends,
    isLoading: overviewPending || categoriesPending || trendsPending,
  };
}
```

### useTransactions.ts

Hook for transaction data.

```typescript
export function useTransactions(filters?: TransactionFilters) {
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      fetch(`/api/v1/budget/transactions${new URLSearchParams(filters as any)}`).then((res) =>
        res.json()
      ),
  });

  return {
    transactions: data,
    isLoading: isPending,
    isRefetching: isFetching && !isPending,
    error,
  };
}
```

### useGoals.ts

Hook for savings and payoff goals.

```typescript
export function useGoals() {
  const queryClient = useQueryClient();
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['budget-goals'],
    queryFn: () => fetch('/api/v1/budget/goals').then((res) => res.json()),
  });

  const createMutation = useMutation({
    mutationFn: (goal: Partial<Goal>) =>
      fetch('/api/v1/budget/goals', {
        method: 'POST',
        body: JSON.stringify(goal),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget-goals'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, goal }: { id: string; goal: Partial<Goal> }) =>
      fetch(`/api/v1/budget/goals/${id}`, { method: 'PUT', body: JSON.stringify(goal) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget-goals'] }),
  });

  return {
    goals: data,
    isLoading: isPending,
    isRefetching: isFetching && !isPending,
    error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
  };
}
```

### useAccounts.ts

Hook for financial accounts.

```typescript
export function useAccounts() {
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['budget-accounts'],
    queryFn: () => fetch('/api/v1/budget/accounts').then((res) => res.json()),
  });

  return {
    accounts: data,
    isLoading: isPending,
    isRefetching: isFetching && !isPending,
    error,
  };
}
```

### useNews.ts

Hook for news feed and preferences.

```typescript
export function useNews(topics?: string[], sources?: string[]) {
  const queryClient = useQueryClient();
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['news-feed', topics, sources],
    queryFn: () =>
      fetch(`/api/v1/news/feed?topics=${topics?.join(',')}&sources=${sources?.join(',')}`).then(
        (res) => res.json()
      ),
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: NewsPreferences) =>
      fetch('/api/v1/news/preferences', {
        method: 'POST',
        body: JSON.stringify(preferences),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news-feed'] }),
  });

  return {
    articles: data,
    isLoading: isPending,
    isRefetching: isFetching && !isPending,
    error,
    updatePreferences: updatePreferencesMutation.mutate,
  };
}
```

### useSettings.ts

Hook for settings data.

```typescript
export function useSettings() {
  const queryClient = useQueryClient();
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/v1/settings').then((res) => res.json()),
  });

  const updateMutation = useMutation({
    mutationFn: (settings: Partial<Settings>) =>
      fetch('/api/v1/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  return {
    settings: data,
    isLoading: isPending,
    isRefetching: isFetching && !isPending,
    error,
    update: updateMutation.mutate,
  };
}
```

## Hook Best Practices (2026)

1. **Use TanStack Query v5 patterns**: Use `isPending` for initial loading, `isFetching` for refetching
2. **TypeScript interfaces**: Define proper TypeScript interfaces for all data structures (TypeScript 5.8+)
3. **Loading and error states**: Always return isLoading (isPending) and error states
4. **Query invalidation**: Invalidate relevant queries after mutations
5. **Conditional queries**: Use the `enabled` option for conditional queries
6. **Polling**: Use `refetchInterval` for real-time data (agents, attention queue)
7. **Dependency arrays**: Include all dependencies in queryKey for proper cache management
8. **SSE for streaming**: Use sse-implementation skill for real-time message streaming in chat
9. **Optimistic updates**: Use simplified optimistic updates with `useMutation` returned variables
10. **Error boundaries**: Wrap components in error boundaries for graceful error handling
11. **Suspense support**: Consider using `useSuspenseQuery` for React 19+ with Suspense boundaries
12. **Mutation state tracking**: Use `useMutationState` for cross-component mutation state access
13. **Infinite queries**: Use `hasNextPage` and `fetchNextPage` for pagination with proper page limits
14. **Structural sharing**: Use `structuralSharing` option instead of deprecated `isDataEqual`
15. **Query removal**: Use `queryClient.removeQueries({ queryKey })` instead of `query.remove()`

## Hook File Organization

- `useAttentionQueue.ts` - Decision queue management
- `useAgentStatus.ts` - Agent fleet status
- `useCostSummary.ts` - Cost analytics
- `useProjects.ts` - Project CRUD operations
- `useTasks.ts` - Task CRUD operations
- `useCalendar.ts` - Calendar events
- `useBudget.ts` - Budget overview
- `useTransactions.ts` - Transaction data
- `useGoals.ts` - Savings and payoff goals
- `useAccounts.ts` - Financial accounts
- `useNews.ts` - News feed and preferences
- `useSettings.ts` - Settings CRUD operations

**Note**: For SSE (Server-Sent Events) implementation, use the `sse-implementation` skill which provides comprehensive patterns for real-time streaming.
