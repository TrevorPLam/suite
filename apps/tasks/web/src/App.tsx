import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Skeleton, useTheme } from '@suite/ui';
import { TaskRow } from './components/TaskRow';
import { EmptyState } from './components/EmptyState';
import { VirtualizedTaskList } from './components/VirtualizedTaskList';
import { useAuth } from './auth-provider';

type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
};

type TasksResponse = {
  tasks: TaskItem[];
};

type TaskResponse = {
  task: TaskItem;
};

function isTaskItem(value: unknown): value is TaskItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.completed === 'boolean';
}

function isTasksResponse(value: unknown): value is TasksResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return Array.isArray(candidate.tasks) && candidate.tasks.every(isTaskItem);
}

function isTaskResponse(value: unknown): value is TaskResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isTaskItem(candidate.task);
}

function extractErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null) {
    const candidate = value as Record<string, unknown>;

    if (typeof candidate.error === 'string' && candidate.error.trim().length > 0) {
      return candidate.error;
    }
  }

  return fallback;
}

function extractErrorDetails(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }

  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.details)) {
    return [];
  }

  return candidate.details.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0);
}

type TaskFilter = 'all' | 'active' | 'completed' | 'archived';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function App() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [title, setTitle] = useState('Draft spec');
  const [completed, setCompleted] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTags, _setSearchTags] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadTasks();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && editingTaskId) {
        cancelEditing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingTaskId]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError('');
    try {
      await signIn(email, password);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign in failed');
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery || searchTags.length > 0) {
        void performSearch();
      } else {
        void loadTasks();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchTags]);

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  }

  function addEditTag() {
    const trimmed = editTagInput.trim();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
      setEditTagInput('');
    }
  }

  function removeEditTag(tagToRemove: string) {
    setEditTags(editTags.filter((tag) => tag !== tagToRemove));
  }

  async function performSearch() {
    setLoading(true);
    setError('');
    setErrorDetails([]);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (searchTags.length > 0) params.set('tags', searchTags.join(','));

      const response = await fetch(`${API_BASE}/api/v1/tasks/search?${params.toString()}`);
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Unable to search tasks'));
      }

      if (isTasksResponse(payload)) {
        setTasks(payload.tasks);
      } else {
        setTasks([]);
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Unable to search tasks');
    } finally {
      setLoading(false);
    }
  }

  function toggleTaskSelection(taskId: string) {
    const newSelection = new Set(selectedTaskIds);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTaskIds(newSelection);
  }

  function clearSelection() {
    setSelectedTaskIds(new Set());
  }

  async function batchComplete() {
    if (selectedTaskIds.size === 0) return;

    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    setStatus('');

    try {
      const response = await fetch(`${API_BASE}/api/v1/tasks/batch/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: Array.from(selectedTaskIds) }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(payload, 'Unable to complete tasks'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      if (isTasksResponse(payload)) {
        setTasks(payload.tasks);
        setStatus(`Completed ${selectedTaskIds.size} tasks`);
        clearSelection();
      }
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : 'Unable to complete tasks');
    } finally {
      setSubmitting(false);
    }
  }

  async function batchArchive() {
    if (selectedTaskIds.size === 0) return;

    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    setStatus('');

    try {
      const response = await fetch(`${API_BASE}/api/v1/tasks/batch/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: Array.from(selectedTaskIds) }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(payload, 'Unable to archive tasks'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      if (isTasksResponse(payload)) {
        setTasks(payload.tasks);
        setStatus(`Archived ${selectedTaskIds.size} tasks`);
        clearSelection();
      }
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : 'Unable to archive tasks');
    } finally {
      setSubmitting(false);
    }
  }

  async function loadTasks() {
    setLoading(true);
    setError('');
    setErrorDetails([]);

    try {
      const response = await fetch(`${API_BASE}/api/v1/tasks`);
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Unable to load tasks'));
      }

      if (isTasksResponse(payload)) {
        setTasks(payload.tasks);
      } else {
        setTasks([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load tasks');
    } finally {
      setLoading(false);
    }
  }

  function upsertTask(task: TaskItem) {
    setTasks((currentTasks) => {
      const nextTasks = currentTasks.filter((currentTask) => currentTask.id !== task.id);

      nextTasks.unshift(task);

      return nextTasks;
    });
  }

  function removeTask(id: string) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
  }

  function getFilteredTasks(): TaskItem[] {
    switch (filter) {
      case 'active':
        return tasks.filter((task) => !task.completed && !task.archived);
      case 'completed':
        return tasks.filter((task) => task.completed && !task.archived);
      case 'archived':
        return tasks.filter((task) => task.archived);
      case 'all':
      default:
        return tasks.filter((task) => !task.archived);
    }
  }

  async function editTask(task: TaskItem) {
    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    setStatus('');

    // Optimistic update: modify task in state immediately
    const optimisticTask: TaskItem = {
      ...task,
      title: editTitle,
      priority: editPriority,
      tags: editTags,
      ...(editDueDate && { dueDate: editDueDate }),
    };

    const previousTasks = [...tasks];
    upsertTask(optimisticTask);

    try {
      const response = await fetch(`${API_BASE}/api/v1/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, dueDate: editDueDate, priority: editPriority, tags: editTags }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        setTasks(previousTasks);
        setError(extractErrorMessage(payload, 'Unable to update task'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      const savedTask = isTaskResponse(payload) ? payload.task : isTaskItem(payload) ? payload : null;

      if (!savedTask) {
        // Revert optimistic update on error
        setTasks(previousTasks);
        setError('The server returned an unexpected task shape');
        return;
      }

      // Replace optimistic task with server response
      upsertTask(savedTask);
      setEditingTaskId(null);
      setEditTitle('');
      setEditDueDate('');
      setEditPriority('medium');
      setEditTags([]);
      setEditTagInput('');
      setStatus(`Updated ${savedTask.title}`);
    } catch (editError) {
      // Revert optimistic update on error
      setTasks(previousTasks);
      setError(editError instanceof Error ? editError.message : 'Unable to update task');
    } finally {
      setSubmitting(false);
    }
  }

  async function archiveTask(task: TaskItem, archived: boolean) {
    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    setStatus('');

    try {
      const response = await fetch(`${API_BASE}/api/v1/tasks/${task.id}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(payload, 'Unable to archive task'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      const savedTask = isTaskResponse(payload) ? payload.task : isTaskItem(payload) ? payload : null;

      if (!savedTask) {
        setError('The server returned an unexpected task shape');
        return;
      }

      upsertTask(savedTask);
      setStatus(archived ? `Archived ${savedTask.title}` : `Unarchived ${savedTask.title}`);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive task');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTask(task: TaskItem) {
    if (!confirm(`Delete "${task.title}"?`)) {
      return;
    }

    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    setStatus('');

    // Optimistic update: remove task from state immediately
    const previousTasks = [...tasks];
    removeTask(task.id);

    try {
      const response = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        setTasks(previousTasks);
        setError(extractErrorMessage(payload, 'Unable to delete task'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      setStatus(`Deleted ${task.title}`);
    } catch (deleteError) {
      // Revert optimistic update on error
      setTasks(previousTasks);
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete task');
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(task: TaskItem) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDueDate(task.dueDate || '');
    setEditPriority(task.priority);
    setEditTags(task.tags || []);
  }

  function cancelEditing() {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditPriority('medium');
    setEditTags([]);
    setEditTagInput('');
  }

  function cycleTheme() {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  }

  async function toggleTaskCompletion(task: TaskItem) {
    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    setStatus('');

    try {
      const response = await fetch(`${API_BASE}/api/v1/tasks/${task.id}/completion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(payload, 'Unable to update task completion'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      const savedTask = isTaskResponse(payload) ? payload.task : isTaskItem(payload) ? payload : null;

      if (!savedTask) {
        setError('The server returned an unexpected task shape');
        return;
      }

      upsertTask(savedTask);
      setStatus(savedTask.completed ? `Completed ${savedTask.title}` : `Reopened ${savedTask.title}`);
    } catch (completionError) {
      setError(completionError instanceof Error ? completionError.message : 'Unable to update task completion');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setErrorDetails([]);
    setStatus('');
    setSubmitting(true);

    // Optimistic update: create temporary task
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: TaskItem = {
      id: tempId,
      title,
      completed,
      priority,
      tags,
      archived: false,
      ...(dueDate && { dueDate }),
    };

    const previousTasks = [...tasks];
    upsertTask(optimisticTask);

    try {
      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, completed, dueDate, priority, tags }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        setTasks(previousTasks);
        setError(extractErrorMessage(payload, 'Unable to create task'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      const savedTask = isTaskResponse(payload) ? payload.task : isTaskItem(payload) ? payload : null;

      if (!savedTask) {
        // Revert optimistic update on error
        setTasks(previousTasks);
        setError('The server returned an unexpected task shape');
        return;
      }

      // Replace optimistic task with server response
      upsertTask(savedTask);
      setTitle('Draft spec');
      setCompleted(false);
      setDueDate('');
      setPriority('medium');
      setTags([]);
      setTagInput('');
      setStatus(`Created ${savedTask.title}`);
    } catch (submitError) {
      // Revert optimistic update on error
      setTasks(previousTasks);
      setError(submitError instanceof Error ? submitError.message : 'Unable to create task');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main
        role="main"
        aria-label="Tasks loading"
        style={{
          minHeight: '100%',
          background: 'var(--color-background)',
          color: 'var(--color-foreground)',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main
        role="main"
        aria-label="Tasks sign in"
        style={{
          minHeight: '100%',
          background: 'var(--color-background)',
          color: 'var(--color-foreground)',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <article style={{ border: '1px solid var(--color-border)', borderRadius: 20, background: 'var(--color-card)', padding: 24, maxWidth: 400, width: '100%' }}>
          <h2 style={{ margin: 0, fontSize: 24, marginBottom: 8 }}>Sign in to Tasks</h2>
          <p style={{ margin: '0 0 24', color: 'var(--color-muted-foreground)' }}>
            Enter your credentials to access your tasks.
          </p>
          <form onSubmit={handleSignIn} style={{ display: 'grid', gap: 16 }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span>Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
                required
              />
            </label>
            <label style={{ display: 'grid', gap: 8 }}>
              <span>Password</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Password"
                required
              />
            </label>
            <Button type="submit">Sign in</Button>
            {authError ? (
              <div
                role="alert"
                style={{
                  borderRadius: 12,
                  border: '1px solid var(--color-destructive)',
                  background: 'var(--color-destructive)',
                  padding: 16,
                  color: 'var(--color-destructive-foreground)',
                }}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>{authError}</p>
              </div>
            ) : null}
          </form>
        </article>
      </main>
    );
  }

  return (
    <main role="main" aria-label="Tasks" style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Tasks</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            type="button"
            onClick={cycleTheme}
            className="bg-white/10 text-white"
            aria-label={`Toggle theme (current: ${theme})`}
            style={{ fontSize: 14, padding: '8px 12px' }}
          >
            {theme === 'system' ? (effectiveTheme === 'dark' ? '🌙 System' : '☀️ System') : theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </Button>
          <Button type="button" onClick={handleSignOut} className="bg-white/10 text-white" aria-label="Sign out">
            Sign out
          </Button>
        </div>
      </div>
      <p>Create a task, then toggle completion state without leaving the screen.</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 24 }}>
        <article style={{ border: '1px solid var(--color-border)', borderRadius: 20, background: 'var(--color-card)', padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Create task</h2>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Title</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Task title" />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span>Due Date</span>
              <Input 
                type="datetime-local" 
                value={dueDate} 
                onChange={(event) => setDueDate(event.target.value)} 
                aria-label="Task due date"
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span>Priority</span>
              <select 
                value={priority} 
                onChange={(event) => setPriority(event.target.value as 'low' | 'medium' | 'high')}
                aria-label="Task priority"
                style={{ padding: 8, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-accent)', color: 'var(--color-foreground)' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span>Tags</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input 
                  value={tagInput} 
                  onChange={(event) => setTagInput(event.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Type and press Enter to add tag"
                />
                <Button type="button" onClick={addTag} disabled={submitting} className="bg-white/10 text-white" aria-label="Add tag">
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 12,
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#93c5fd',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Remove tag ${tag}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#93c5fd',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 14,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input checked={completed} onChange={(event) => setCompleted(event.target.checked)} type="checkbox" aria-label="Mark task as completed" />
              <span>Completed</span>
            </label>

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add task'}
            </Button>
          </form>

          <div aria-live="polite" style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {status ? <p style={{ margin: 0, color: 'var(--color-success)' }}>{status}</p> : null}

            {error ? (
              <div
                role="alert"
                style={{
                  borderRadius: 12,
                  border: '1px solid var(--color-destructive)',
                  background: 'var(--color-destructive)',
                  padding: 16,
                  color: 'var(--color-destructive-foreground)',
                }}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
                {errorDetails.length > 0 ? (
                  <ul style={{ margin: '8px 0 0', paddingInlineStart: 20 }}>
                    {errorDetails.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>

        <article style={{ border: '1px solid var(--color-border)', borderRadius: 20, background: 'var(--color-card)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ margin: 0 }}>Saved tasks</h2>
            <Button type="button" onClick={() => void loadTasks()} className="bg-white/10 text-white" aria-label="Reload tasks">
              Reload
            </Button>
          </div>

          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <Input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tasks by title..."
              aria-label="Search tasks"
              style={{
                padding: 8,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-accent)',
                color: 'var(--color-foreground)',
              }}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['all', 'active', 'completed', 'archived'] as TaskFilter[]).map((filterOption) => (
                <button
                  key={filterOption}
                  type="button"
                  onClick={() => setFilter(filterOption)}
                  disabled={submitting}
                  aria-label={`Filter tasks by ${filterOption}`}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: filter === filterOption ? 'var(--color-primary)' : 'var(--color-accent)',
                    color: 'var(--color-foreground)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    textTransform: 'capitalize',
                  }}
                >
                  {filterOption}
                </button>
              ))}
            </div>

            {selectedTaskIds.size > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 12, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)' }}>
                <span style={{ color: 'white', fontSize: 14 }}>{selectedTaskIds.size} selected</span>
                <Button type="button" onClick={batchComplete} disabled={submitting} className="bg-green-500/20 text-green-300" aria-label="Complete all selected tasks">
                  Complete All
                </Button>
                <Button type="button" onClick={batchArchive} disabled={submitting} className="bg-white/10 text-white" aria-label="Archive all selected tasks">
                  Archive All
                </Button>
                <Button type="button" onClick={clearSelection} disabled={submitting} className="bg-white/10 text-white" aria-label="Clear selection">
                  Clear Selection
                </Button>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            {loading ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 16,
                      padding: 16,
                      display: 'grid',
                      gap: 12,
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                      <Skeleton height="20px" width="20px" variant="circular" />
                      <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                        <Skeleton height="20px" width="70%" />
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Skeleton height="14px" width="60px" />
                          <Skeleton height="14px" width="40px" />
                          <Skeleton height="14px" width="50px" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && getFilteredTasks().length === 0 ? <EmptyState message="No tasks in this view." /> : null}

            {getFilteredTasks().length > 100 ? (
              <VirtualizedTaskList
                tasks={getFilteredTasks()}
                editingTaskId={editingTaskId}
                editTitle={editTitle}
                editDueDate={editDueDate}
                editPriority={editPriority}
                editTags={editTags}
                editTagInput={editTagInput}
                selectedTaskIds={selectedTaskIds}
                submitting={submitting}
                onToggleTaskSelection={toggleTaskSelection}
                onEditTitleChange={setEditTitle}
                onEditDueDateChange={setEditDueDate}
                onEditPriorityChange={setEditPriority}
                onEditTagsChange={setEditTags}
                onEditTagInputChange={setEditTagInput}
                onAddEditTag={addEditTag}
                onRemoveEditTag={removeEditTag}
                onStartEditing={startEditing}
                onCancelEditing={cancelEditing}
                onSaveEdit={editTask}
                onToggleCompletion={toggleTaskCompletion}
                onArchive={archiveTask}
                onDelete={deleteTask}
              />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
                {getFilteredTasks().map((task) => (
                  <li
                    key={task.id}
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 16,
                      padding: 16,
                      display: 'grid',
                      gap: 12,
                      background: task.completed ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        disabled={submitting}
                        style={{ marginTop: 4 }}
                      />
                      <div style={{ flex: 1 }}>
                        <TaskRow
                          task={task}
                          editingTaskId={editingTaskId}
                          editTitle={editTitle}
                          editDueDate={editDueDate}
                          editPriority={editPriority}
                          editTags={editTags}
                          editTagInput={editTagInput}
                          onEditTitleChange={setEditTitle}
                          onEditDueDateChange={setEditDueDate}
                          onEditPriorityChange={setEditPriority}
                          onEditTagsChange={setEditTags}
                          onEditTagInputChange={setEditTagInput}
                          onAddEditTag={addEditTag}
                          onRemoveEditTag={removeEditTag}
                          onStartEditing={startEditing}
                          onCancelEditing={cancelEditing}
                          onSaveEdit={editTask}
                          onToggleCompletion={toggleTaskCompletion}
                          onArchive={archiveTask}
                          onDelete={deleteTask}
                          submitting={submitting}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
