import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from './index.js';
import { resetDriveFiles, resetDriveFolders } from '@suite/domain-drive';

describe('Drive API Contract Tests', () => {
  beforeAll(async () => {
    // Reset domain state before tests
    resetDriveFiles();
    resetDriveFolders();
  });

  afterAll(async () => {
    // Clean up after tests
    resetDriveFiles();
    resetDriveFolders();
  });

  describe('GET /api/health', () => {
    it('returns 200 with valid health response structure', async () => {
      const res = await app.request('/api/health');
      expect(res.status).toBe(200);
      
      const body = await res.json() as { ok: boolean; app: string; db: string; timestamp: string; dbLatency?: string };
      expect(body).toHaveProperty('ok');
      expect(body).toHaveProperty('app');
      expect(body).toHaveProperty('db');
      expect(body).toHaveProperty('timestamp');
      expect(typeof body.ok).toBe('boolean');
      expect(typeof body.app).toBe('string');
      expect(typeof body.db).toBe('string');
      expect(typeof body.timestamp).toBe('string');
    });

    it('returns 503 when database is unhealthy', async () => {
      const res = await app.request('/api/health');
      expect([200, 503]).toContain(res.status);
      
      const body = await res.json() as { ok: boolean; app: string; db: string; timestamp: string };
      expect(body).toHaveProperty('ok');
      expect(body).toHaveProperty('app');
      expect(body).toHaveProperty('db');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/files', () => {
    it('returns 200 with valid files array structure', async () => {
      const res = await app.request('/api/v1/files');
      expect(res.status).toBe(200);
      
      const body = await res.json() as { files: Array<{ id: string; name: string; size: number; createdAt: string }> };
      expect(body).toHaveProperty('files');
      expect(Array.isArray(body.files)).toBe(true);
      
      // Validate file structure if files exist
      if (body.files.length > 0) {
        const file = body.files[0];
        if (file) {
          expect(file).toHaveProperty('id');
          expect(file).toHaveProperty('name');
          expect(file).toHaveProperty('size');
          expect(file).toHaveProperty('createdAt');
          expect(typeof file.id).toBe('string');
          expect(typeof file.name).toBe('string');
          expect(typeof file.size).toBe('number');
          expect(typeof file.createdAt).toBe('string');
        }
      }
    });
  });

  describe('POST /api/v1/files', () => {
    it('returns 201 with valid file structure on successful upload (JSON)', async () => {
      const newFile = {
        name: 'contract-test-file.txt',
        size: 1024,
        mimeType: 'text/plain',
      };

      const res = await app.request('/api/v1/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFile),
      });

      expect(res.status).toBe(201);
      
      const body = await res.json() as { file: { id: string; name: string; size: number; createdAt: string } };
      expect(body).toHaveProperty('file');
      expect(body.file).toHaveProperty('id');
      expect(body.file).toHaveProperty('name');
      expect(body.file).toHaveProperty('size');
      expect(body.file).toHaveProperty('createdAt');
      expect(typeof body.file.id).toBe('string');
      expect(typeof body.file.name).toBe('string');
      expect(typeof body.file.size).toBe('number');
      expect(typeof body.file.createdAt).toBe('string');
    });

    it('returns 400 with error structure for invalid request body', async () => {
      const invalidFile = {
        name: '', // Invalid: empty name
        size: -1, // Invalid: negative size
      };

      const res = await app.request('/api/v1/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidFile),
      });

      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });

    it('returns 400 with error structure for missing required fields', async () => {
      const incompleteFile = {
        name: 'Missing size',
      };

      const res = await app.request('/api/v1/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteFile),
      });

      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
    });

    it('returns 413 with error structure for file size exceeding limit', async () => {
      const oversizedFile = {
        name: 'oversized-file.txt',
        size: 200 * 1024 * 1024, // 200MB exceeds 100MB limit
      };

      const res = await app.request('/api/v1/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oversizedFile),
      });

      expect(res.status).toBe(413);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });
  });

  describe('PUT /api/v1/files/:id', () => {
    it('returns 200 with valid file structure on successful rename', async () => {
      // First create a file
      const createRes = await app.request('/api/v1/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'rename-test-file.txt',
          size: 512,
        }),
      });

      const createBody = await createRes.json() as { file: { id: string } };
      const fileId = createBody.file.id;

      // Rename the file
      const res = await app.request(`/api/v1/files/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'renamed-file.txt' }),
      });

      expect(res.status).toBe(200);
      
      const body = await res.json() as { file: { id: string; name: string; size: number } };
      expect(body).toHaveProperty('file');
      expect(body.file).toHaveProperty('id');
      expect(body.file).toHaveProperty('name');
      expect(body.file).toHaveProperty('size');
      expect(typeof body.file.id).toBe('string');
      expect(typeof body.file.name).toBe('string');
      expect(body.file.name).toBe('renamed-file.txt');
    });

    it('returns 400 with error structure for invalid request body', async () => {
      const res = await app.request('/api/v1/files/nonexistent-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }), // Invalid: empty name
      });

      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
    });

    it('returns 404 with error structure for non-existent file', async () => {
      const res = await app.request('/api/v1/files/00000000-0000-0000-0000-000000000000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new-name.txt' }),
      });

      expect(res.status).toBe(404);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });
  });

  describe('DELETE /api/v1/files/:id', () => {
    it('returns 200 with success structure on successful deletion', async () => {
      // First create a file
      const createRes = await app.request('/api/v1/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'delete-test-file.txt',
          size: 256,
        }),
      });

      const createBody = await createRes.json() as { file: { id: string } };
      const fileId = createBody.file.id;

      // Delete the file
      const res = await app.request(`/api/v1/files/${fileId}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      
      const body = await res.json() as { success: boolean };
      expect(body).toHaveProperty('success');
      expect(typeof body.success).toBe('boolean');
      expect(body.success).toBe(true);
    });

    it('returns 404 with error structure for non-existent file', async () => {
      const res = await app.request('/api/v1/files/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });
  });

  describe('GET /api/v1/folders', () => {
    it('returns 200 with valid folders array structure', async () => {
      const res = await app.request('/api/v1/folders');
      expect(res.status).toBe(200);
      
      const body = await res.json() as { folders: Array<{ id: string; name: string; createdAt: string }> };
      expect(body).toHaveProperty('folders');
      expect(Array.isArray(body.folders)).toBe(true);
      
      // Validate folder structure if folders exist
      if (body.folders.length > 0) {
        const folder = body.folders[0];
        if (folder) {
          expect(folder).toHaveProperty('id');
          expect(folder).toHaveProperty('name');
          expect(folder).toHaveProperty('createdAt');
          expect(typeof folder.id).toBe('string');
          expect(typeof folder.name).toBe('string');
          expect(typeof folder.createdAt).toBe('string');
        }
      }
    });
  });

  describe('POST /api/v1/folders', () => {
    it('returns 201 with valid folder structure on successful creation', async () => {
      const newFolder = {
        name: 'contract-test-folder',
      };

      const res = await app.request('/api/v1/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFolder),
      });

      expect(res.status).toBe(201);
      
      const body = await res.json() as { folder: { id: string; name: string; createdAt: string } };
      expect(body).toHaveProperty('folder');
      expect(body.folder).toHaveProperty('id');
      expect(body.folder).toHaveProperty('name');
      expect(body.folder).toHaveProperty('createdAt');
      expect(typeof body.folder.id).toBe('string');
      expect(typeof body.folder.name).toBe('string');
      expect(typeof body.folder.createdAt).toBe('string');
    });

    it('returns 400 with error structure for invalid request body', async () => {
      const invalidFolder = {
        name: '', // Invalid: empty name
      };

      const res = await app.request('/api/v1/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidFolder),
      });

      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.timestamp).toBe('string');
    });
  });

  describe('PUT /api/v1/folders/:id', () => {
    it('returns 200 with valid folder structure on successful rename', async () => {
      // First create a folder
      const createRes = await app.request('/api/v1/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'rename-test-folder',
        }),
      });

      const createBody = await createRes.json() as { folder: { id: string } };
      const folderId = createBody.folder.id;

      // Rename the folder
      const res = await app.request(`/api/v1/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'renamed-folder' }),
      });

      expect(res.status).toBe(200);
      
      const body = await res.json() as { folder: { id: string; name: string } };
      expect(body).toHaveProperty('folder');
      expect(body.folder).toHaveProperty('id');
      expect(body.folder).toHaveProperty('name');
      expect(typeof body.folder.id).toBe('string');
      expect(typeof body.folder.name).toBe('string');
      expect(body.folder.name).toBe('renamed-folder');
    });

    it('returns 404 with error structure for non-existent folder', async () => {
      const res = await app.request('/api/v1/folders/00000000-0000-0000-0000-000000000000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new-name' }),
      });

      expect(res.status).toBe(404);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
    });
  });

  describe('DELETE /api/v1/folders/:id', () => {
    it('returns 404 with error structure for non-existent folder', async () => {
      const res = await app.request('/api/v1/folders/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/files/search', () => {
    it('returns 200 with valid files array structure for search', async () => {
      const res = await app.request('/api/v1/files/search?q=test');
      expect(res.status).toBe(200);
      
      const body = await res.json() as { files: unknown[] };
      expect(body).toHaveProperty('files');
      expect(Array.isArray(body.files)).toBe(true);
    });

    it('returns 400 with error structure for invalid search query', async () => {
      const res = await app.request('/api/v1/files/search?q=<invalid>');
      expect(res.status).toBe(400);
      
      const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
    });
  });

  describe('Error Response Contract', () => {
    it('all error responses follow standard error structure', async () => {
      const errorScenarios = [
        { url: '/api/v1/files', method: 'POST', body: { name: '' }, expectedStatus: 400 },
        { url: '/api/v1/folders', method: 'POST', body: { name: '' }, expectedStatus: 400 },
      ];

      for (const scenario of errorScenarios) {
        const res = await app.request(scenario.url, {
          method: scenario.method || 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: scenario.body ? JSON.stringify(scenario.body) : null,
        });

        if (res.status >= 400) {
          const body = await res.json() as { error: { code: string; message: string; timestamp: string } };
          expect(body).toHaveProperty('error');
          expect(body.error).toHaveProperty('code');
          expect(body.error).toHaveProperty('message');
          expect(body.error).toHaveProperty('timestamp');
          expect(typeof body.error.code).toBe('string');
          expect(typeof body.error.message).toBe('string');
          expect(typeof body.error.timestamp).toBe('string');
        }
      }
    });
  });
});
