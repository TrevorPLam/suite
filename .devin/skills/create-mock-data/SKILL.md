---
name: create-mock-data
description: Guides the creation of realistic mock data files for the AI command center, ensuring all components have placeholder data that matches TypeScript interfaces
---

## Mock Data Files

Create mock data files in `src/lib/mockData/`:

### agents.ts

- Agent fleet data with realistic agent information
- Each agent: name, avatar initials, status, current task, token spend, uptime
- Include various states: thinking, idle, error, waiting

### projects.ts

- Project list with realistic project data
- Each project: name, status, priority, due date, tags, progress, owner
- Include tasks with subtasks, checklists, comments

### tasks.ts

- Task data with nested subtasks
- Each task: title, status, priority, due date, assignee, checklist items
- Include various states: Not Started, In Progress, Blocked, In Review, Done

### calendar.ts

- Calendar events with realistic schedule
- Each event: title, date, time, description, location, repeat rule
- Include linked project references

### budget.ts

- Financial data: net worth, cash flow, categories, transactions
- Include goals (saving and payoff), accounts, recurring items, investments
- Realistic monetary values and trends

### transactions.ts

- Transaction history with realistic data
- Each transaction: date, merchant, category, account, amount, type
- Include income, expenses, transfers

### news.ts

- News feed with realistic articles
- Each article: source, published timestamp, headline, AI summary, sentiment, topics
- Include various sources with trust tier badges

### settings.ts

- Settings data for all settings sections
- Include: general, appearance, notifications, analytics, memory, integrations
- Realistic configuration values

## Data Quality Guidelines

- Use realistic, believable data
- Include edge cases and error states
- Ensure data matches TypeScript interfaces
- Provide sufficient variety for testing
- Include realistic dates, times, and monetary values
- Use consistent naming conventions
- Add comments explaining data structure

## TypeScript Interfaces

Ensure all mock data exports TypeScript interfaces that match the data structure. These interfaces should be used in API client functions and components.

## Example Pattern

```typescript
export interface Agent {
  id: string;
  name: string;
  avatar: string;
  status: 'thinking' | 'idle' | 'error' | 'waiting';
  currentTask: string;
  tokenSpend: number;
  uptime: string;
}

export const mockAgents: Agent[] = [
  // realistic data here
];
```
