import { useState, type FormEvent } from 'react';
import { Button } from '@suite/ui';

export function App() {
  const [title, setTitle] = useState('Weekly planning');
  const [startAt, setStartAt] = useState('2026-06-05T09:00:00.000Z');
  const [endAt, setEndAt] = useState('2026-06-05T10:00:00.000Z');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResult('');

    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, startAt, endAt }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? 'Unable to create event');
      return;
    }

    setResult(JSON.stringify(payload, null, 2));
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 720 }}>
      <h1>Calendar</h1>
      <p>Create your first event from the spec-driven API contract.</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Start</span>
          <input value={startAt} onChange={(event) => setStartAt(event.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>End</span>
          <input value={endAt} onChange={(event) => setEndAt(event.target.value)} />
        </label>

        <Button type="submit">Create event</Button>
      </form>

      {error ? <p style={{ color: 'crimson', marginTop: 16 }}>{error}</p> : null}
      {result ? <pre style={{ marginTop: 16, padding: 12, background: '#111827', color: '#f9fafb' }}>{result}</pre> : null}
    </main>
  );
}
