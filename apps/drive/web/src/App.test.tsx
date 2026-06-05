import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

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

describe('Drive App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders loading state then empty state', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse({ files: [] }),
    );

    render(<App />);

    expect(screen.getByText('Loading files from the server…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('No files yet')).toBeInTheDocument();
    });
  });

  it('uploads a new file and shows it in the list', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock
      .mockResolvedValueOnce(mockFetchResponse({ files: [] }))
      .mockResolvedValueOnce(
        mockFetchResponse({
          id: 'file-1',
          name: 'Design brief.pdf',
          size: 2048,
        }),
      );

    render(<App />);

    await waitFor(() => screen.getByText('No files yet'));

    const nameInput = screen.getByLabelText('File name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Design brief.pdf');

    const sizeInput = screen.getByLabelText('File size in bytes');
    await user.clear(sizeInput);
    await user.type(sizeInput, '2048');

    const submitButton = screen.getByRole('button', { name: /upload file/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Uploaded Design brief.pdf/i)).toBeInTheDocument();
    });
  });

  it('rename dialog has proper accessibility attributes', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({
        files: [{ id: 'file-1', name: 'Old name.pdf', size: 1024 }],
      }),
    );

    render(<App />);

    await waitFor(() => screen.getByText('Old name.pdf'));

    const renameButton = screen.getByRole('button', { name: /rename/i });
    await user.click(renameButton);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'rename-dialog-title');

    const title = screen.getByRole('heading', { name: /rename file/i });
    expect(title).toHaveAttribute('id', 'rename-dialog-title');

    expect(screen.getByLabelText('New file name')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('delete dialog has proper accessibility attributes', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock
      .mockResolvedValueOnce(
        mockFetchResponse({
          files: [{ id: 'file-1', name: 'Old name.pdf', size: 1024 }],
        }),
      )
      .mockResolvedValueOnce(mockFetchResponse({ deleted: true }));

    render(<App />);

    await waitFor(() => screen.getByText('Old name.pdf'));

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'delete-dialog-title');

    const title = within(dialog).getByRole('heading', { name: 'Delete file' });
    expect(title).toHaveAttribute('id', 'delete-dialog-title');

    const confirmDeleteButton = within(dialog).getByRole('button', { name: /delete$/i });
    await user.click(confirmDeleteButton);

    await waitFor(() => {
      expect(screen.getByText(/Deleted Old name.pdf/i)).toBeInTheDocument();
    });
  });

  it('shows upload validation errors', async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;

    fetchMock
      .mockResolvedValueOnce(mockFetchResponse({ files: [] }))
      .mockResolvedValueOnce(
        mockFetchError(400, {
          error: 'Name is required',
          details: ['Name must not be empty'],
        }),
      );

    render(<App />);

    await waitFor(() => screen.getByText('No files yet'));

    const nameInput = screen.getByLabelText('File name');
    await user.clear(nameInput);

    const submitButton = screen.getByRole('button', { name: /upload file/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
    });
  });
});
