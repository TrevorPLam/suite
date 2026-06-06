import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { Button, Input } from '@suite/ui';
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!dialogRef.current) return [];
    return dialogRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
  }, []);

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement;
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open, onClose, getFocusableElements]);

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
      onClick={onClose}
    >
      <article
        ref={dialogRef}
        style={{
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: '#111111',
          padding: 24,
          maxWidth: 400,
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
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
            <Input
              value={renameName}
              onChange={(inputEvent) => setRenameName(inputEvent.target.value)}
              aria-label="New file name"
              autoFocus
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
