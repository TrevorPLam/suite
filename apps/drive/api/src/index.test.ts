import { describe, it, expect, beforeEach } from 'vitest';
import { resetDriveFiles, resetDriveFolders } from '@suite/domain-drive';
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
    resetDriveFiles();
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
    resetDriveFiles();
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
    expect(json).toHaveProperty('createdAt');
    expect(json).toHaveProperty('modifiedAt');
  });

  it('should upload a file with folderId', async () => {
    const res = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'document.pdf',
        size: 1024,
        folderId: 'folder-123',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should upload a file with mimeType', async () => {
    const res = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'document.pdf',
        size: 1024,
        mimeType: 'application/pdf',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('id');
    expect(json.name).toBe('document.pdf');
    expect(json.mimeType).toBe('application/pdf');
  });

  it('should reject file exceeding size limit', async () => {
    const res = await app.request('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'large-file.bin',
        size: 101 * 1024 * 1024, // 101MB
      }),
    });

    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json).toHaveProperty('error');
    expect(json.error).toBe('File size exceeds limit');
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
    resetDriveFiles();
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
    expect(json).toHaveProperty('modifiedAt');
  });

  it('should reject rename with missing id', async () => {
    const res = await app.request('/api/files/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'renamed.pdf',
      }),
    });

    expect(res.status).toBe(404);
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
    resetDriveFiles();
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

    expect(res.status).toBe(404);
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

describe('drive API - list folders', () => {
  beforeEach(() => {
    resetDriveFolders();
  });

  it('should list all folders', async () => {
    const res = await app.request('/api/folders');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('folders');
    expect(Array.isArray(json.folders)).toBe(true);
  });

  it('should list folders by parentId', async () => {
    const res = await app.request('/api/folders?parentId=parent-123');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('folders');
    expect(Array.isArray(json.folders)).toBe(true);
  });
});

describe('drive API - create folder', () => {
  beforeEach(() => {
    resetDriveFolders();
  });

  it('should create a valid folder', async () => {
    const res = await app.request('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Documents',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('id');
    expect(json.name).toBe('Documents');
    expect(json).toHaveProperty('createdAt');
  });

  it('should create a folder with parentId', async () => {
    const res = await app.request('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Subfolder',
        parentId: 'parent-123',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject invalid JSON', async () => {
    const res = await app.request('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject missing name', async () => {
    const res = await app.request('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('drive API - rename folder', () => {
  beforeEach(() => {
    resetDriveFolders();
  });

  it('should rename a folder', async () => {
    const createRes = await app.request('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Documents',
      }),
    });

    const createJson = await createRes.json();
    const folderId = createJson.id;

    const res = await app.request(`/api/folders/${folderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Renamed',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(folderId);
    expect(json.name).toBe('Renamed');
  });

  it('should return 404 for non-existent folder', async () => {
    const res = await app.request('/api/folders/non-existent-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Renamed',
      }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject rename with missing name', async () => {
    const res = await app.request('/api/folders/some-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('drive API - delete folder', () => {
  beforeEach(() => {
    resetDriveFolders();
    resetDriveFiles();
  });

  it('should delete an empty folder', async () => {
    const createRes = await app.request('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Documents',
      }),
    });

    const createJson = await createRes.json();
    const folderId = createJson.id;

    const res = await app.request(`/api/folders/${folderId}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('ok');
    expect(json.ok).toBe(true);
  });

  it('should return 404 for non-existent folder', async () => {
    const res = await app.request('/api/folders/non-existent-id', {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('drive API - move file', () => {
  beforeEach(() => {
    resetDriveFiles();
    resetDriveFolders();
  });

  it('should move a file to a folder', async () => {
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

    const res = await app.request(`/api/files/${fileId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderId: 'folder-123',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should move a file to root', async () => {
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

    const res = await app.request(`/api/files/${fileId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(fileId);
  });

  it('should return 404 for non-existent file', async () => {
    const res = await app.request('/api/files/non-existent-id/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

describe('drive API - search files', () => {
  beforeEach(() => {
    resetDriveFiles();
  });

  it('should search files by query', async () => {
    const res = await app.request('/api/files/search?q=doc');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('files');
    expect(Array.isArray(json.files)).toBe(true);
  });

  it('should search files by query and folderId', async () => {
    const res = await app.request('/api/files/search?q=doc&folderId=folder-123');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('files');
    expect(Array.isArray(json.files)).toBe(true);
  });

  it('should reject missing query parameter', async () => {
    const res = await app.request('/api/files/search');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should reject empty query parameter', async () => {
    const res = await app.request('/api/files/search?q=');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});
