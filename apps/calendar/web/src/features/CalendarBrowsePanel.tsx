import { Button } from '@suite/ui';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { EventRow } from '../components/EventRow';
import { Skeleton } from '../components/Skeleton';
import type { CalendarEvent, ViewMode } from './calendar-types';
import { getDaySections, getRangeLabel, getViewRange, getWeekSections } from './calendar-helpers';

type CalendarBrowsePanelProps = {
  events: CalendarEvent[];
  loading: boolean;
  error: string;
  errorDetails: string[];
  selectedDate: string;
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onSelectedDateChange: (selectedDate: string) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRefresh: () => void;
  onEdit: (event: CalendarEvent) => void;
};

function getDisplayedSections(events: CalendarEvent[], selectedDate: string, viewMode: ViewMode) {
  return viewMode === 'day' ? getDaySections(events, selectedDate) : getWeekSections(events, selectedDate);
}

export function CalendarBrowsePanel({
  events,
  loading,
  error,
  errorDetails,
  selectedDate,
  viewMode,
  onViewModeChange,
  onSelectedDateChange,
  onToday,
  onPrevious,
  onNext,
  onRefresh,
  onEdit,
}: CalendarBrowsePanelProps) {
  const sections = getDisplayedSections(events, selectedDate, viewMode);
  const range = getViewRange(selectedDate, viewMode);
  const rangeLabel = getRangeLabel(selectedDate, viewMode);
  const hasVisibleEvents = sections.some((section) => section.events.length > 0);

  return (
    <article style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, background: '#111111', padding: 24 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Browse calendar</h2>
            <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
              Switch between day and week views to inspect the selected range.
            </p>
          </div>

          <Button type="button" onClick={onRefresh} className="bg-white/10 text-white">
            Refresh
          </Button>
        </div>

        <div
          role="toolbar"
          aria-label="Calendar browsing controls"
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: 12,
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.03)',
          }}
        >
          <div role="group" aria-label="Calendar view mode" style={{ display: 'flex', gap: 8 }}>
            <Button
              type="button"
              onClick={() => onViewModeChange('day')}
              aria-pressed={viewMode === 'day'}
              className={viewMode === 'day' ? '' : 'bg-white/10 text-white'}
            >
              Day
            </Button>
            <Button
              type="button"
              onClick={() => onViewModeChange('week')}
              aria-pressed={viewMode === 'week'}
              className={viewMode === 'week' ? '' : 'bg-white/10 text-white'}
            >
              Week
            </Button>
          </div>

          <label style={{ display: 'grid', gap: 6, color: 'rgba(249, 250, 251, 0.88)' }}>
            <span>Selected date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onSelectedDateChange(event.target.value)}
              aria-label="Selected calendar date"
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.14)',
                background: '#0a0a0a',
                color: 'inherit',
                padding: '10px 12px',
              }}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button type="button" onClick={onPrevious} className="bg-white/10 text-white">
              Previous
            </Button>
            <Button type="button" onClick={onToday} className="bg-white/10 text-white">
              Today
            </Button>
            <Button type="button" onClick={onNext} className="bg-white/10 text-white">
              Next
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 12 }}>
            {viewMode} view
          </p>
          <h3 style={{ margin: 0, fontSize: 22 }}>{rangeLabel}</h3>
          <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.68)' }}>
            Showing events from {new Date(range.startAt).toISOString()} to {new Date(range.endAt).toISOString()}.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <Skeleton height={24} width="40%" />
              <Skeleton height={18} width="30%" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'grid', gap: 12, padding: 16, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, background: 'rgba(255, 255, 255, 0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <Skeleton height={18} width="60%" />
                  <Skeleton height={14} width={40} />
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <Skeleton height={16} width="100%" />
                  <Skeleton height={16} width="80%" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Unable to load calendar" message={error} details={errorDetails} onRetry={onRefresh} />
        ) : !hasVisibleEvents ? (
          <EmptyState
            title="No events in this range"
            description="The selected day or week does not contain any overlapping events."
            actionLabel="Jump to today"
            onAction={onToday}
          />
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {sections.map((section) => (
              <section key={section.date} style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{section.label}</h3>
                  <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.5)', fontSize: 12 }}>{section.events.length} events</p>
                </div>

                {section.events.length > 0 ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {section.events.map((event) => (
                      <EventRow
                        key={event.id}
                        event={event}
                        description={`${new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(event.startAt))} to ${new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(event.endAt))}`}
                        onEdit={onEdit}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No events on this day" description="This part of the selected range is clear." />
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
