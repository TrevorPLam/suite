import { describe, it, expect, beforeEach } from 'vitest';
import app from './index.js';

describe('drive API - health', () => {
  it('should return health check', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, app: 'drive' });
  });
});

describe('drive API - list files', () => {
  beforeEach(() => {
    const files = (globalThis as any).__driveFiles;
    if (files) {
      files.length = 0;
    }
  });

  it('should list all files', async () => {
    const res = await app.request('/api/files');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('files');
    expect(Array.isArray(json.files)).toBe(true);
  });
});

describe('drive API - upload file', () => {
  beforeEach(() => {
    const files = (globalThis as any).__driveFiles;
    if (files) {
      files.length = 0;
    }
  });

  it('should upload a valid file', async () => {
    const res = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'document.pdf',
        size: 1024,
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('id');
    expect(json.name).toBe('document.pdf');
    expect(json.size).toBe(1024);
  });

  it('should reject invalid JSON', async () => {
    const res = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject missing name', async () => {
    const res = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        size: 1024,
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject missing size', async () => {
    const res = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'document.pdf',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject negative size', async () => {
    const res = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'document.pdf',
        size: -1,
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject non-integer size', async () => {
    const res = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'document.pdf',
        size: 1024.5,
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('drive API - rename file', () => {
  beforeEach(() => {
    const files = (globalThis as any).__driveFiles;
    if (files) {
      files.length = 0;
    }
  });

  it('should rename a file', async () => {
    const createRes = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'document.pdf',
        size: 1024,
      }),
    });

    const createJson = await createRes.json();
    const fileId = createJson.id;

    const res = await app.request(`/api/files/${fileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'renamed.pdf',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(fileId);
    expect(json.name).toBe('renamed.pdf');
  });

  it('should reject rename with missing id', async () => {
    const res = await app.request('/api/files/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'renamed.pdf',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should return 404 for non-existent file', async () => {
    const res = await app.request('/api/files/non-existent-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'renamed.pdf',
      }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject rename with missing name', async () => {
    const res = await app.request('/api/files/some-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('drive API - delete file', () => {
  beforeEach(() => {
    const files = (globalThis as any).__driveFiles;
    if (files) {
      files.length = 0;
    }
  });

  it('should delete a file', async () => {
    const createRes = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'document.pdf',
        size: 1024,
      }),
    });

    const createJson = await createRes.json();
    const fileId = createJson.id;

    const res = await app.request(`/api/files/${fileId}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('ok');
    expect(json.ok).toBe(true);
  });

  it('should reject delete with missing id', async () => {
    const res = await app.request('/api/files/', {
      method: 'DELETE',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should return 404 for non-existent file', async () => {
    const res = await app.request('/api/files/non-existent-id', {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});
