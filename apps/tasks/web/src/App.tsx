import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@suite/ui';
import { TaskRow } from './components/TaskRow';
import { EmptyState } from './components/EmptyState';

type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
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

export function App() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [title, setTitle] = useState('Draft spec');
  const [completed, setCompleted] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    void loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    setError('');
    setErrorDetails([]);

    try {
      const response = await fetch('/api/tasks');
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

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(payload, 'Unable to update task'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      const savedTask = isTaskResponse(payload) ? payload.task : isTaskItem(payload) ? payload : null;

      if (!savedTask) {
        setError('The server returned an unexpected task shape');
        return;
      }

      upsertTask(savedTask);
      setEditingTaskId(null);
      setEditTitle('');
      setStatus(`Updated ${savedTask.title}`);
    } catch (editError) {
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
      const response = await fetch(`/api/tasks/${task.id}/archive`, {
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

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(payload, 'Unable to delete task'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      removeTask(task.id);
      setStatus(`Deleted ${task.title}`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete task');
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(task: TaskItem) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
  }

  function cancelEditing() {
    setEditingTaskId(null);
    setEditTitle('');
  }

  async function toggleTaskCompletion(task: TaskItem) {
    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    setStatus('');

    try {
      const response = await fetch(`/api/tasks/${task.id}/completion`, {
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

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, completed }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(payload, 'Unable to create task'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      const savedTask = isTaskResponse(payload) ? payload.task : isTaskItem(payload) ? payload : null;

      if (!savedTask) {
        setError('The server returned an unexpected task shape');
        return;
      }

      upsertTask(savedTask);
      setTitle('Draft spec');
      setCompleted(false);
      setStatus(`Created ${savedTask.title}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 960 }}>
      <h1>Tasks</h1>
      <p>Create a task, then toggle completion state without leaving the screen.</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 24 }}>
        <article style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, background: '#111111', padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Create task</h2>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input checked={completed} onChange={(event) => setCompleted(event.target.checked)} type="checkbox" />
              <span>Completed</span>
            </label>

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add task'}
            </Button>
          </form>

          <div aria-live="polite" style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {status ? <p style={{ margin: 0, color: '#86efac' }}>{status}</p> : null}

            {error ? (
              <div
                role="alert"
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(248, 113, 113, 0.35)',
                  background: 'rgba(127, 29, 29, 0.3)',
                  padding: 16,
                  color: '#fecaca',
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

        <article style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, background: '#111111', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ margin: 0 }}>Saved tasks</h2>
            <Button type="button" onClick={() => void loadTasks()} className="bg-white/10 text-white">
              Reload
            </Button>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'active', 'completed', 'archived'] as TaskFilter[]).map((filterOption) => (
              <button
                key={filterOption}
                type="button"
                onClick={() => setFilter(filterOption)}
                disabled={submitting}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: filter === filterOption ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  textTransform: 'capitalize',
                }}
              >
                {filterOption}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            {loading ? <p>Loading tasks…</p> : null}

            {!loading && getFilteredTasks().length === 0 ? <EmptyState message="No tasks in this view." /> : null}

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
                  <TaskRow
                    task={task}
                    editingTaskId={editingTaskId}
                    editTitle={editTitle}
                    onEditTitleChange={setEditTitle}
                    onStartEditing={startEditing}
                    onCancelEditing={cancelEditing}
                    onSaveEdit={editTask}
                    onToggleCompletion={toggleTaskCompletion}
                    onArchive={archiveTask}
                    onDelete={deleteTask}
                    submitting={submitting}
                  />
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>
    </main>
  );
}
