import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

// Mock @suite/auth dependencies
vi.mock('@suite/auth', () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
  },
  useSession: vi.fn(() => ({
    data: { user: { id: 'test-user', email: 'test@example.com' } },
    isPending: false,
  })),
}));

// Mock auth-provider to avoid AuthProvider context issues
vi.mock('./auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock @suite/ui to avoid ThemeProvider issues
vi.mock('@suite/ui', () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
  Input: (props: { [key: string]: unknown }) => <input {...props} />,
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), effectiveTheme: 'light' }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function mockFetchResponse(value: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(value),
  } as Response);
}

function mockFetchError(status: number, value: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(value),
  } as Response);
}

describe('Calendar App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.setSystemTime(new Date('2026-06-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('renders loading state then empty state', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse({ events: [] }),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('No events in this range')).toBeInTheDocument();
    });
  });

  it('creates a new event and shows a success status', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock
      .mockResolvedValueOnce(mockFetchResponse({ events: [] }))
      .mockResolvedValueOnce(
        mockFetchResponse({
          event: {
            id: 'evt-1',
            title: 'Team standup',
            startAt: '2026-06-05T09:00:00.000Z',
            endAt: '2026-06-05T10:00:00.000Z',
          },
        }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({
          events: [
            {
              id: 'evt-1',
              title: 'Team standup',
              startAt: '2026-06-05T09:00:00.000Z',
              endAt: '2026-06-05T10:00:00.000Z',
            },
          ],
        }),
      );

    render(<App />);

    await waitFor(() => screen.getByText('No events in this range'));

    const titleInput = screen.getByLabelText('Event title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Team standup');

    const submitButton = screen.getByRole('button', { name: /create event/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Created Team standup/i)).toBeInTheDocument();
    });
  });

  it('enters edit mode and updates an event', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({
        events: [
          {
            id: 'evt-1',
            title: 'Original title',
            startAt: '2026-06-05T09:00:00.000Z',
            endAt: '2026-06-05T10:00:00.000Z',
          },
        ],
      }),
    );

    render(<App />);

    await waitFor(() => screen.getByText('Original title'));

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit event', level: 2 })).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText('Event title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated title');

    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({
          event: {
            id: 'evt-1',
            title: 'Updated title',
            startAt: '2026-06-05T09:00:00.000Z',
            endAt: '2026-06-05T10:00:00.000Z',
          },
        }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({
          events: [
            {
              id: 'evt-1',
              title: 'Updated title',
              startAt: '2026-06-05T09:00:00.000Z',
              endAt: '2026-06-05T10:00:00.000Z',
            },
          ],
        }),
      );

    const updateButton = screen.getByRole('button', { name: /update event/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/Updated Updated title/i)).toBeInTheDocument();
    });
  });

  it('shows server validation errors', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock
      .mockResolvedValueOnce(mockFetchResponse({ events: [] }))
      .mockResolvedValueOnce(
        mockFetchError(400, {
          error: 'Title is required',
          details: ['Title must not be empty'],
        }),
      );

    render(<App />);

    await waitFor(() => screen.getByText('No events in this range'));

    const titleInput = screen.getByLabelText('Event title');
    await user.clear(titleInput);

    const submitButton = screen.getByRole('button', { name: /create event/i });
    await user.click(submitButton);

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts[0]).toHaveTextContent('Title is required');
    });
  });

  it('has accessible form labels and live region', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse({ events: [] }),
    );

    render(<App />);

    await waitFor(() => screen.getByText('No events in this range'));

    expect(screen.getByLabelText('Event title')).toBeInTheDocument();
    expect(screen.getByLabelText('Event start time')).toBeInTheDocument();
    expect(screen.getByLabelText('Event end time')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });
});
