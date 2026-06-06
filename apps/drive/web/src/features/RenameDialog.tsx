import { useState, type FormEvent } from 'react';
import { Button } from '@suite/ui';
import { type DriveFile } from '@suite/domain-drive';

interface RenameDialogProps {
  open: boolean;
  file: DriveFile | null;
  onClose: () => void;
  onSubmit: (newName: string) => void;
  renaming: boolean;
  renameError: string;
}

export function RenameDialog({
  open,
  file,
  onClose,
  onSubmit,
  renaming,
  renameError,
}: RenameDialogProps) {
  const [renameName, setRenameName] = useState(file?.name || '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(renameName);
  }

  if (!open || !file) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-dialog-title"
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
        <h2 id="rename-dialog-title" style={{ margin: 0, fontSize: 24 }}>
          Rename file
        </h2>
        <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
          Rename {file.name}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span>New name</span>
            <input
              value={renameName}
              onChange={(inputEvent) => setRenameName(inputEvent.target.value)}
              aria-label="New file name"
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

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button
              type="button"
              onClick={onClose}
              className="bg-white/10 text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={renaming}>
              {renaming ? 'Renaming…' : 'Rename'}
            </Button>
          </div>

          {renameError ? (
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
              <p style={{ margin: 0, fontWeight: 600 }}>{renameError}</p>
            </div>
          ) : null}
        </form>
      </article>
    </div>
  );
}
