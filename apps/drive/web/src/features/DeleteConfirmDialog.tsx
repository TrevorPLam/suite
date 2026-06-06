import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@suite/ui';
import { type DriveFile } from '@suite/domain-drive';

interface DeleteConfirmDialogProps {
  open: boolean;
  file: DriveFile | null;
  onClose: () => void;
  onConfirm: () => void;
  deleteError: string;
}

export function DeleteConfirmDialog({
  open,
  file,
  onClose,
  onConfirm,
  deleteError,
}: DeleteConfirmDialogProps) {
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

  if (!open || !file) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
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
        <h2 id="delete-dialog-title" style={{ margin: 0, fontSize: 24 }}>
          Delete file
        </h2>
        <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
          Are you sure you want to delete {file.name}? This action cannot be undone.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <Button
            type="button"
            onClick={onClose}
            className="bg-white/10 text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-red-500/20 text-red-300"
          >
            Delete
          </Button>
        </div>

        {deleteError ? (
          <div
            role="alert"
            style={{
              borderRadius: 12,
              border: '1px solid rgba(248, 113, 113, 0.35)',
              background: 'rgba(127, 29, 29, 0.3)',
              padding: 16,
              color: '#fecaca',
              marginTop: 16,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>{deleteError}</p>
          </div>
        ) : null}
      </article>
    </div>
  );
}
