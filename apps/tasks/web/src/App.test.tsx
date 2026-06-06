import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

vi.mock('./auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

describe('Tasks App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders loading state then empty state', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse({ tasks: [] }),
    );

    render(<App />);

    // Check for skeleton loading state
    expect(screen.getAllByRole('status', { name: /loading/i }).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('No tasks in this view.')).toBeInTheDocument();
    });
  });

  it('creates a new task and shows it in the list', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock
      .mockResolvedValueOnce(mockFetchResponse({ tasks: [] }))
      .mockResolvedValueOnce(
        mockFetchResponse({
          task: {
            id: 'task-1',
            title: 'Write tests',
            completed: false,
            archived: false,
            priority: 'medium',
            tags: [],
          },
        }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({
          tasks: [
            {
              id: 'task-1',
              title: 'Write tests',
              completed: false,
              archived: false,
              priority: 'medium',
              tags: [],
            },
          ],
        }),
      );

    render(<App />);

    await waitFor(() => screen.getByText('No tasks in this view.'));

    const titleInput = screen.getByLabelText(/title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Write tests');

    const submitButton = screen.getByRole('button', { name: /add task/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Write tests')).toBeInTheDocument();
    });

    // Accept 2 or 3 calls due to potential debounced search effect
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3);
    
    const postCall = fetchMock.mock.calls[1]!;
    expect(postCall[0]).toBe('/api/tasks');
    const postOptions = postCall[1] as RequestInit;
    expect(postOptions?.method).toBe('POST');
    const body = JSON.parse(postOptions?.body as string);
    expect(body.title).toBe('Write tests');
  });

  it('toggles task completion', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({
          tasks: [
            {
              id: 'task-1',
              title: 'Write tests',
              completed: false,
              archived: false,
              priority: 'medium',
              tags: [],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({
          task: {
            id: 'task-1',
            title: 'Write tests',
            completed: true,
            archived: false,
            priority: 'medium',
            tags: [],
          },
        }),
      );

    render(<App />);

    await waitFor(() => screen.getByText('Write tests'));

    const toggleButton = screen.getByRole('button', { name: /mark complete/i });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText(/Completed Write tests/i)).toBeInTheDocument();
    });
  });

  it('archives a task', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({
          tasks: [
            {
              id: 'task-1',
              title: 'Write tests',
              completed: false,
              archived: false,
              priority: 'medium',
              tags: [],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({
          task: {
            id: 'task-1',
            title: 'Write tests',
            completed: false,
            archived: true,
            priority: 'medium',
            tags: [],
          },
        }),
      );

    render(<App />);

    await waitFor(() => screen.getByText('Write tests'));

    const archiveButton = screen.getByRole('button', { name: 'Archive' });
    await user.click(archiveButton);

    await waitFor(() => {
      expect(screen.getByText(/Archived Write tests/i)).toBeInTheDocument();
    });
  });

  it('deletes a task after confirm', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({
          tasks: [
            {
              id: 'task-1',
              title: 'Write tests',
              completed: false,
              archived: false,
              priority: 'medium',
              tags: [],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(mockFetchResponse({ deleted: true }));

    render(<App />);

    await waitFor(() => screen.getByText('Write tests'));

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/Deleted Write tests/i)).toBeInTheDocument();
    });
  });

  it('shows server validation errors', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock
      .mockResolvedValueOnce(mockFetchResponse({ tasks: [] }))
      .mockResolvedValueOnce(
        mockFetchError(400, {
          error: 'Title is required',
          details: ['Title must not be empty'],
        }),
      );

    render(<App />);

    await waitFor(() => screen.getByText('No tasks in this view.'));

    const titleInput = screen.getByLabelText(/title/i);
    await user.clear(titleInput);

    const submitButton = screen.getByRole('button', { name: /add task/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
    });
  });


});
