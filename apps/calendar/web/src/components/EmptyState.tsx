import { Button } from '@suite/ui';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      role="status"
      style={{
        borderRadius: 16,
        border: '1px dashed rgba(255, 255, 255, 0.14)',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: 20,
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
        <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.72)' }}>{description}</p>
      </div>

      {actionLabel && onAction ? (
        <div>
          <Button type="button" onClick={onAction} className="bg-white/10 text-white">
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
