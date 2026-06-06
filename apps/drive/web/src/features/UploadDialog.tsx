import { useState, type FormEvent } from 'react';
import { Button } from '@suite/ui';
import { type DriveFolder } from '@suite/domain-drive';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; size: number; mimeType?: string; folderId?: string }) => void;
  folders: DriveFolder[];
  currentFolderId: string | undefined;
  submitting: boolean;
  uploadError: string;
  uploadErrorDetails: string[];
}

export function UploadDialog({
  open,
  onClose,
  onSubmit,
  folders,
  currentFolderId,
  submitting,
  uploadError,
  uploadErrorDetails,
}: UploadDialogProps) {
  const [name, setName] = useState('Design brief.pdf');
  const [size, setSize] = useState('1024');
  const [mimeType, setMimeType] = useState('application/pdf');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body: Record<string, unknown> = { name, size: Number(size) };
    if (mimeType.trim()) {
      body.mimeType = mimeType.trim();
    }
    if (currentFolderId) {
      body.folderId = currentFolderId;
    }
    onSubmit(body as { name: string; size: number; mimeType?: string; folderId?: string });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 1000,
      }}
    >
      <article
        style={{
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: '#111111',
          padding: 24,
          maxWidth: 400,
          width: '100%',
        }}
      >
        <h2 id="upload-dialog-title" style={{ margin: 0, fontSize: 24 }}>
          Upload file
        </h2>
        <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
          {currentFolderId ? `Upload to ${folders.find((f) => f.id === currentFolderId)?.name || 'folder'}` : 'Upload to root'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span>Name</span>
            <input
              value={name}
              onChange={(inputEvent) => setName(inputEvent.target.value)}
              aria-label="File name"
              autoFocus
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.14)',
                background: '#0a0a0a',
                color: 'inherit',
                padding: '12px 14px',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 8 }}>
            <span>Size</span>
            <input
              inputMode="numeric"
              value={size}
              onChange={(inputEvent) => setSize(inputEvent.target.value)}
              aria-label="File size in bytes"
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.14)',
                background: '#0a0a0a',
                color: 'inherit',
                padding: '12px 14px',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 8 }}>
            <span>MIME Type (optional)</span>
            <input
              value={mimeType}
              onChange={(inputEvent) => setMimeType(inputEvent.target.value)}
              aria-label="File MIME type"
              placeholder="application/pdf"
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.14)',
                background: '#0a0a0a',
                color: 'inherit',
                padding: '12px 14px',
              }}
            />
          </label>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button
              type="button"
              onClick={onClose}
              className="bg-white/10 text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Uploading…' : 'Upload file'}
            </Button>
          </div>

          {uploadError ? (
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
              <p style={{ margin: 0, fontWeight: 600 }}>{uploadError}</p>
              {uploadErrorDetails.length > 0 ? (
                <ul style={{ margin: '8px 0 0', paddingInlineStart: 20 }}>
                  {uploadErrorDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </form>
      </article>
    </div>
  );
}
