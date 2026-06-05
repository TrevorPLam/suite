import { useState, type FormEvent } from 'react';
import { Button } from '@suite/ui';

export function App() {
  const [name, setName] = useState('Design brief.pdf');
  const [size, setSize] = useState('1024');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResult('');

    const response = await fetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, size: Number(size) }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? 'Unable to upload file');
      return;
    }

    setResult(JSON.stringify(payload, null, 2));
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 720 }}>
      <h1>Drive</h1>
      <p>Upload a file record from the spec-driven API contract.</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Size</span>
          <input inputMode="numeric" value={size} onChange={(event) => setSize(event.target.value)} />
        </label>

        <Button type="submit">Upload file</Button>
      </form>

      {error ? <p style={{ color: 'crimson', marginTop: 16 }}>{error}</p> : null}
      {result ? <pre style={{ marginTop: 16, padding: 12, background: '#111827', color: '#f9fafb' }}>{result}</pre> : null}
    </main>
  );
}
