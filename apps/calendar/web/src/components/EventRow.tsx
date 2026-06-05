import { Button } from '@suite/ui';
import type { CalendarEvent } from '../features/calendar-types';

type EventRowProps = {
  event: CalendarEvent;
  description: string;
  onEdit: (event: CalendarEvent) => void;
};

export function EventRow({ event, description, onEdit }: EventRowProps) {
  return (
    <article
      aria-label={`Event ${event.title}`}
      style={{
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#0a0a0a',
        padding: 16,
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{event.title}</h3>
          <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.68)', fontSize: 14 }}>{description}</p>
          <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.52)', fontSize: 12 }}>ID: {event.id}</p>
        </div>

        <Button type="button" onClick={() => onEdit(event)} className="bg-white/10 text-white">
          Edit
        </Button>
      </div>
    </article>
  );
}
