import { Button } from '@suite/ui';

type ErrorStateProps = {
  title: string;
  message: string;
  details?: string[];
  onRetry?: () => void;
};

export function ErrorState({ title, message, details = [], onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        borderRadius: 16,
        border: '1px solid rgba(248, 113, 113, 0.35)',
        background: 'rgba(127, 29, 29, 0.3)',
        padding: 20,
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: '#fecaca' }}>{title}</h3>
        <p style={{ margin: 0, color: '#fecaca' }}>{message}</p>
      </div>

      {details.length > 0 ? (
        <ul style={{ margin: 0, paddingInlineStart: 20, color: '#fecaca' }}>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}

      {onRetry ? (
        <div>
          <Button type="button" onClick={onRetry} className="bg-white/10 text-white">
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
