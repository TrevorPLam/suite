import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@suite/ui';
import { CalendarBrowsePanel } from './features/CalendarBrowsePanel';
import {
  getTodayDateInputValue,
  getViewRange,
  shiftSelectedDate,
} from './features/calendar-helpers';
import type { CalendarEvent, EventFormState, ViewMode } from './features/calendar-types';
import { useAuth } from './auth-provider';

type CalendarEventsResponse = {
  events: CalendarEvent[];
};

type CalendarEventResponse = {
  event: CalendarEvent;
};

const defaultDate = getTodayDateInputValue();

const defaultFormState: EventFormState = {
  title: 'Weekly planning',
  startAt: `${defaultDate}T09:00:00.000Z`,
  endAt: `${defaultDate}T10:00:00.000Z`,
};

function isCalendarEvent(value: unknown): value is CalendarEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.startAt === 'string'
    && typeof candidate.endAt === 'string';
}

function isCalendarEventsResponse(value: unknown): value is CalendarEventsResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return Array.isArray(candidate.events) && candidate.events.every(isCalendarEvent);
}

function isCalendarEventResponse(value: unknown): value is CalendarEventResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isCalendarEvent(candidate.event);
}

function extractErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null) {
    const candidate = value as Record<string, unknown>;

    if (typeof candidate.error === 'string' && candidate.error.trim().length > 0) {
      return candidate.error;
    }
  }

  return fallback;
}

function extractErrorDetails(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }

  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.details)) {
    return [];
  }

  return candidate.details.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0);
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt) || left.title.localeCompare(right.title));
}

function makeDefaultFormState(selectedDate: string = defaultDate): EventFormState {
  return {
    title: 'Weekly planning',
    startAt: `${selectedDate}T09:00:00.000Z`,
    endAt: `${selectedDate}T10:00:00.000Z`,
  };
}

function eventOverlapsRange(event: CalendarEvent, range: { startAt: string; endAt: string }): boolean {
  return Date.parse(event.startAt) < Date.parse(range.endAt)
    && Date.parse(event.endAt) > Date.parse(range.startAt);
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export function App() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [title, setTitle] = useState(defaultFormState.title);
  const [startAt, setStartAt] = useState(defaultFormState.startAt);
  const [endAt, setEndAt] = useState(defaultFormState.endAt);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedRange = getViewRange(selectedDate, viewMode);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError('');
    try {
      await signIn(email, password);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign in failed');
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  useEffect(() => {
    void loadEvents();
  }, [selectedDate, viewMode]);

  async function loadEvents() {
    setLoading(true);
    setError('');
    setErrorDetails([]);

    try {
      const response = await fetch(`${API_BASE}/api/events?${new URLSearchParams(selectedRange).toString()}`);
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Unable to load events'));
      }

      if (isCalendarEventsResponse(payload)) {
        setEvents(sortEvents(payload.events));
      } else {
        setEvents([]);
      }

      return true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load events');
      return false;
    } finally {
      setLoading(false);
    }
  }

  function beginEditing(event: CalendarEvent) {
    setEditingEventId(event.id);
    setTitle(event.title);
    setStartAt(event.startAt);
    setEndAt(event.endAt);
    setStatus(`Editing ${event.title}`);
    setError('');
    setErrorDetails([]);
  }

  function resetForm() {
    const defaultState = makeDefaultFormState(selectedDate);

    setEditingEventId(null);
    setTitle(defaultState.title);
    setStartAt(defaultState.startAt);
    setEndAt(defaultState.endAt);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setErrorDetails([]);
    setStatus('');
    setSubmitting(true);

    const endpoint = editingEventId ? `${API_BASE}/api/events/${editingEventId}` : `${API_BASE}/api/events`;
    const method = editingEventId ? 'PUT' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, startAt, endAt }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(payload, editingEventId ? 'Unable to update event' : 'Unable to create event'));
        setErrorDetails(extractErrorDetails(payload));
        return;
      }

      const savedEvent = isCalendarEventResponse(payload)
        ? payload.event
        : isCalendarEvent(payload)
          ? payload
          : null;

      if (!savedEvent) {
        setError('The server returned an unexpected event shape');
        return;
      }

      setEvents((currentEvents) => {
        const nextEvents = currentEvents.filter((currentEvent) => currentEvent.id !== savedEvent.id);

        if (eventOverlapsRange(savedEvent, selectedRange)) {
          nextEvents.push(savedEvent);
        }

        return sortEvents(nextEvents);
      });

      resetForm();

      void loadEvents();

      setStatus(editingEventId ? `Updated ${savedEvent.title}` : `Created ${savedEvent.title}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save event');
    } finally {
      setSubmitting(false);
    }
  }

  function cancelEditing() {
    resetForm();
    setStatus('Editing cancelled');
    setError('');
    setErrorDetails([]);
  }

  function changeSelectedDate(nextDate: string) {
    setSelectedDate(nextDate);
  }

  function showToday() {
    setSelectedDate(getTodayDateInputValue());
  }

  function moveBackward() {
    setSelectedDate((currentDate) => shiftSelectedDate(currentDate, viewMode, -1));
  }

  function moveForward() {
    setSelectedDate((currentDate) => shiftSelectedDate(currentDate, viewMode, 1));
  }

  if (authLoading) {
    return (
      <main
        style={{
          minHeight: '100%',
          background: '#050507',
          color: '#f9fafb',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main
        style={{
          minHeight: '100%',
          background: '#050507',
          color: '#f9fafb',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <article style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, background: '#111111', padding: 24, maxWidth: 400, width: '100%' }}>
          <h2 style={{ margin: 0, fontSize: 24, marginBottom: 8 }}>Sign in to Calendar</h2>
          <p style={{ margin: '0 0 24', color: 'rgba(249, 250, 251, 0.72)' }}>
            Enter your credentials to access your calendar events.
          </p>
          <form onSubmit={handleSignIn} style={{ display: 'grid', gap: 16 }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  background: '#0a0a0a',
                  color: 'inherit',
                  padding: '12px 14px',
                }}
              />
            </label>
            <Button type="submit">Sign in</Button>
            {authError ? (
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
                <p style={{ margin: 0, fontWeight: 600 }}>{authError}</p>
              </div>
            ) : null}
          </form>
        </article>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100%',
        background: '#050507',
        color: '#f9fafb',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ margin: '0 auto', maxWidth: 1120 }}>
        <header style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 12 }}>
              Calendar
            </p>
            <Button type="button" onClick={handleSignOut} className="bg-white/10 text-white">
              Sign out
            </Button>
          </div>
          <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.1 }}>Browse, create, and edit events</h1>
          <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.72)', maxWidth: 720 }}>
            Switch between day and week views, inspect the current range, and keep create/edit feedback visible in the same app shell.
          </p>
        </header>

        <section
          style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          <article style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, background: '#111111', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>{editingEventId ? 'Edit event' : 'Create event'}</h2>
                <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
                  {editingEventId ? 'Update the selected event and save it back to the same ID.' : 'Create a new event while keeping the browse view available beside you.'}
                </p>
              </div>

              {editingEventId ? (
                <Button type="button" onClick={cancelEditing} className="bg-white/10 text-white">
                  Cancel edit
                </Button>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
              <label style={{ display: 'grid', gap: 8 }}>
                <span>Title</span>
                <input
                  value={title}
                  onChange={(inputEvent) => setTitle(inputEvent.target.value)}
                  aria-label="Event title"
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
                <span>Start</span>
                <input
                  value={startAt}
                  onChange={(inputEvent) => setStartAt(inputEvent.target.value)}
                  aria-label="Event start time"
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
                <span>End</span>
                <input
                  value={endAt}
                  onChange={(inputEvent) => setEndAt(inputEvent.target.value)}
                  aria-label="Event end time"
                  style={{
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    background: '#0a0a0a',
                    color: 'inherit',
                    padding: '12px 14px',
                  }}
                />
              </label>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : editingEventId ? 'Update event' : 'Create event'}
                </Button>

                <Button type="button" onClick={loadEvents} className="bg-white/10 text-white">
                  Reload events
                </Button>
              </div>
            </form>

            <div aria-live="polite" style={{ marginTop: 20, display: 'grid', gap: 12 }}>
              {status ? <p style={{ margin: 0, color: '#86efac' }}>{status}</p> : null}

              {error ? (
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
                  <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
                  {errorDetails.length > 0 ? (
                    <ul style={{ margin: '8px 0 0', paddingInlineStart: 20 }}>
                      {errorDetails.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>

          <CalendarBrowsePanel
            events={events}
            loading={loading}
            error={error}
            errorDetails={errorDetails}
            selectedDate={selectedDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onSelectedDateChange={changeSelectedDate}
            onToday={showToday}
            onPrevious={moveBackward}
            onNext={moveForward}
            onRefresh={loadEvents}
            onEdit={beginEditing}
          />
        </section>
      </div>
    </main>
  );
}
