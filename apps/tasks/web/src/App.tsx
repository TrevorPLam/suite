import { useState, type FormEvent } from 'react';
import { Button } from '@suite/ui';

export function App() {
  const [title, setTitle] = useState('Draft spec');
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResult('');

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, completed }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? 'Unable to create task');
      return;
    }

    setResult(JSON.stringify(payload, null, 2));
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 720 }}>
      <h1>Tasks</h1>
      <p>Create your first task from the spec-driven API contract.</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input checked={completed} onChange={(event) => setCompleted(event.target.checked)} type="checkbox" />
          <span>Completed</span>
        </label>

        <Button type="submit">Add task</Button>
      </form>

      {error ? <p style={{ color: 'crimson', marginTop: 16 }}>{error}</p> : null}
      {result ? <pre style={{ marginTop: 16, padding: 12, background: '#111827', color: '#f9fafb' }}>{result}</pre> : null}
    </main>
  );
}
