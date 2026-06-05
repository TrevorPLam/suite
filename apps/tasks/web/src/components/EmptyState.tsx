interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.6)', fontStyle: 'italic' }}>
      {message}
    </p>
  );
}
