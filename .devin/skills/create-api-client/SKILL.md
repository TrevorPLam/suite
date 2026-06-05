---
name: create-api-client
description: Guides the creation of the API client setup using TanStack Query v5 with proper TypeScript typing, error handling, and mock data integration
---

## API Client Setup

Create API client in `src/api/client.ts` and individual API modules in `src/api/`.

### client.ts

Base API client with TanStack Query configuration.

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create QueryClient with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Base URL
const BASE_URL = 'http://localhost:8000/api/v1';

// Generic fetch wrapper
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// CRUD helpers
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, data: any) =>
    apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: any) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};

// QueryClient provider component
export function ApiProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### agents.ts

Agent-related API endpoints.

```typescript
import { api } from './client';

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  status: 'thinking' | 'idle' | 'error' | 'waiting';
  currentTask: string;
  tokenSpend: number;
  uptime: string;
}

export async function getAgents(): Promise<Agent[]> {
  return api.get<Agent[]>('/agents');
}

export async function getAgent(id: string): Promise<Agent> {
  return api.get<Agent>(`/agents/${id}`);
}
```

### chat.ts

Chat-related API endpoints.

```typescript
import { api } from './client';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
  output: Record<string, any>;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: string;
  agentId: string;
}

export async function getThread(threadId: string): Promise<Thread> {
  return api.get<Thread>(`/chat/${threadId}`);
}

export async function getThreads(): Promise<Thread[]> {
  return api.get<Thread[]>('/chat/threads');
}

export async function createThread(message: string): Promise<Thread> {
  return api.post<Thread>('/chat', { message });
}

export async function sendMessage(threadId: string, message: string): Promise<Message> {
  return api.post<Message>(`/chat/${threadId}`, { message });
}

// SSE endpoint for streaming
export function getThreadStream(threadId: string): EventSource {
  return new EventSource(`http://localhost:8000/api/v1/chat/${threadId}/stream`);
}
```

### projects.ts

Project-related API endpoints.

```typescript
import { api } from './client';

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'on-hold' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  tags: string[];
  progress: number;
  owner: string;
  description?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: 'not-started' | 'in-progress' | 'blocked' | 'in-review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  assignee?: string;
  subtasks?: Task[];
  checklist?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
}

export async function getProjects(filters?: Record<string, any>): Promise<Project[]> {
  const params = new URLSearchParams(filters);
  return api.get<Project[]>(`/projects?${params}`);
}

export async function getProject(id: string): Promise<Project> {
  return api.get<Project>(`/projects/${id}`);
}

export async function createProject(project: Partial<Project>): Promise<Project> {
  return api.post<Project>('/projects', project);
}

export async function updateProject(id: string, project: Partial<Project>): Promise<Project> {
  return api.put<Project>(`/projects/${id}`, project);
}

export async function deleteProject(id: string): Promise<void> {
  return api.delete<void>(`/projects/${id}`);
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  return api.get<Task[]>(`/projects/${projectId}/tasks`);
}

export async function createTask(projectId: string, task: Partial<Task>): Promise<Task> {
  return api.post<Task>(`/projects/${projectId}/tasks`, task);
}

export async function updateTask(id: string, task: Partial<Task>): Promise<Task> {
  return api.put<Task>(`/tasks/${id}`, task);
}

export async function deleteTask(id: string): Promise<void> {
  return api.delete<void>(`/tasks/${id}`);
}

export async function getProjectTemplates(): Promise<any[]> {
  return api.get<any[]>('/project-templates');
}
```

### calendar.ts

Calendar-related API endpoints.

```typescript
import { api } from './client';

export interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  description?: string;
  location?: string;
  repeatRule?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  projectId?: string;
  color: string;
  reminder?: '15min' | '1hr' | '1day';
}

export async function getEvents(dateRange?: { start: string; end: string }): Promise<Event[]> {
  const params = dateRange ? new URLSearchParams(dateRange) : '';
  return api.get<Event[]>(`/calendar/events${params ? `?${params}` : ''}`);
}

export async function getEvent(id: string): Promise<Event> {
  return api.get<Event>(`/calendar/events/${id}`);
}

export async function createEvent(event: Partial<Event>): Promise<Event> {
  return api.post<Event>('/calendar/events', event);
}

export async function updateEvent(id: string, event: Partial<Event>): Promise<Event> {
  return api.put<Event>(`/calendar/events/${id}`, event);
}

export async function deleteEvent(id: string): Promise<void> {
  return api.delete<void>(`/calendar/events/${id}`);
}
```

### budget.ts

Budget-related API endpoints.

```typescript
import { api } from './client';

export interface BudgetOverview {
  netWorth: number;
  netWorthChange: number;
  assets: number;
  liabilities: number;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  planned: number;
  actual: number;
  percentage: number;
}

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  category: string;
  account: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
}

export interface Goal {
  id: string;
  type: 'saving' | 'payoff';
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate: string;
}

export async function getBudgetOverview(): Promise<BudgetOverview> {
  return api.get<BudgetOverview>('/budget/overview');
}

export async function getBudgetCategories(): Promise<BudgetCategory[]> {
  return api.get<BudgetCategory[]>('/budget/categories');
}

export async function getTransactions(filters?: Record<string, any>): Promise<Transaction[]> {
  const params = new URLSearchParams(filters);
  return api.get<Transaction[]>(`/budget/transactions?${params}`);
}

export async function getBudgetTrends(): Promise<any> {
  return api.get<any>('/budget/trends');
}

export async function getGoals(): Promise<Goal[]> {
  return api.get<Goal[]>('/budget/goals');
}

export async function createGoal(goal: Partial<Goal>): Promise<Goal> {
  return api.post<Goal>('/budget/goals', goal);
}

export async function updateGoal(id: string, goal: Partial<Goal>): Promise<Goal> {
  return api.put<Goal>(`/budget/goals/${id}`, goal);
}

export async function getAccounts(): Promise<any[]> {
  return api.get<any[]>('/budget/accounts');
}

export async function getRecurring(): Promise<any[]> {
  return api.get<any[]>('/budget/recurring');
}

export async function getInvestments(): Promise<any[]> {
  return api.get<any[]>('/budget/investments');
}

export async function getReport(type: string): Promise<any> {
  return api.get<any>(`/budget/reports/${type}`);
}
```

### news.ts

News-related API endpoints.

```typescript
import { api } from './client';

export interface Article {
  id: string;
  source: string;
  sourceLogo: string;
  trustTier: 1 | 2 | 3;
  publishedAt: string;
  headline: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  readTime: number;
  url: string;
}

export interface NewsPreferences {
  topics: string[];
  sources: string[];
  frequency: 'real-time' | 'hourly' | '6hrs' | 'daily';
}

export async function getNewsFeed(topics?: string[], sources?: string[]): Promise<Article[]> {
  const params = new URLSearchParams();
  if (topics) params.append('topics', topics.join(','));
  if (sources) params.append('sources', sources.join(','));
  return api.get<Article[]>(`/news/feed?${params}`);
}

export async function getTopics(): Promise<string[]> {
  return api.get<string[]>('/news/topics');
}

export async function getSources(): Promise<any[]> {
  return api.get<any[]>('/news/sources');
}

export async function updatePreferences(preferences: NewsPreferences): Promise<void> {
  return api.post<void>('/news/preferences', preferences);
}

export async function getBookmarks(): Promise<Article[]> {
  return api.get<Article[]>('/news/bookmarks');
}
```

### settings.ts

Settings-related API endpoints.

```typescript
import { api } from './client';

export interface Settings {
  general: {
    displayName: string;
    language: string;
    timezone: string;
    dateFormat: string;
    weekStartsOn: 'sunday' | 'monday';
    defaultLandingPage: string;
  };
  appearance: {
    theme: 'dark' | 'system';
    accentColor: string;
    fontSize: 'small' | 'medium' | 'large';
    sidebar: 'expanded' | 'collapsed';
    motion: 'full' | 'reduced';
    density: 'compact' | 'comfortable' | 'spacious';
  };
  notifications: {
    agentDecisionAlerts: boolean;
    agentDecisionSound: boolean;
    budgetAlerts: boolean;
    budgetThreshold: number;
    newsDigest: string;
    newsDigestTime: string;
    calendarReminders: string;
    inAppNotifications: boolean;
    pushNotifications: boolean;
  };
  analytics: {
    costTracking: boolean;
    budgetCap: number;
    warningThreshold: number;
    modelBreakdown: boolean;
    dataRetention: string;
  };
  memory: {
    memorySystem: boolean;
    workingMemoryWindow: number;
    episodicRetention: number;
    semanticMemory: boolean;
  };
}

export async function getSettings(): Promise<Settings> {
  return api.get<Settings>('/settings');
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  return api.put<Settings>('/settings', settings);
}

export async function getIntegrations(): Promise<any[]> {
  return api.get<any[]>('/settings/integrations');
}

export async function updateIntegration(id: string, config: any): Promise<void> {
  return api.put<void>(`/settings/integrations/${id}`, config);
}

export async function getCostAnalytics(): Promise<any> {
  return api.get<any>('/cost-analytics');
}

export async function getAuditLog(): Promise<any[]> {
  return api.get<any[]>('/audit-log');
}

export async function getMemory(): Promise<any> {
  return api.get<any>('/memory');
}

export async function getMCPServers(): Promise<any[]> {
  return api.get<any[]>('/mcp-servers');
}
```

## API Client Best Practices

1. **TypeScript interfaces**: Define proper TypeScript interfaces for all request/response types
2. **Error handling**: All API calls should throw errors on non-200 responses
3. **Base URL**: Use consistent base URL from environment or hardcoded for mock
4. **Mock data**: All endpoints should return mock data from `src/lib/mockData/`
5. **TanStack Query**: Use TanStack Query for all data fetching (via hooks)
6. **Query keys**: Use consistent query keys across the application
7. **SSE support**: Use EventSource for streaming endpoints (chat)
8. **Request/response logging**: Add logging in development mode
9. **Retry logic**: Configure appropriate retry logic in QueryClient
10. **Cache management**: Configure staleTime and gcTime appropriately

## Mock Data Integration

All API functions should:

1. Import mock data from `src/lib/mockData/`
2. Return mock data with realistic values
3. Simulate network delays (optional, for realism)
4. Handle edge cases and error states
5. Match TypeScript interfaces exactly
