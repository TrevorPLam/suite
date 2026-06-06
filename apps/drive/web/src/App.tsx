import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@suite/ui';
import { type DriveFile, type DriveFolder } from '@suite/domain-drive';
import { DriveFileList } from './features/DriveFileList';
import { FolderTree } from './features/FolderTree';
import { UploadDialog } from './features/UploadDialog';
import { RenameDialog } from './features/RenameDialog';
import { DeleteConfirmDialog } from './features/DeleteConfirmDialog';
import { useAuth } from './auth-provider';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function App() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [filesError, setFilesError] = useState('');
  const [filesErrorDetails, setFilesErrorDetails] = useState<string[]>([]);
  const [foldersError, setFoldersError] = useState('');
  const [status, setStatus] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadErrorDetails, setUploadErrorDetails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [renamingFile, setRenamingFile] = useState<DriveFile | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [deleting, setDeleting] = useState<DriveFile | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DriveFile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<DriveFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renamingFolderState, setRenamingFolderState] = useState(false);
  const [renameFolderError, setRenameFolderError] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<DriveFolder | null>(null);
  const [deleteFolderError, setDeleteFolderError] = useState('');

  const extractErrorMessage = useCallback((value: unknown, fallback: string) => {
    if (typeof value === 'object' && value !== null) {
      const candidate = value as Record<string, unknown>;

      if (typeof candidate.error === 'string' && candidate.error.trim().length > 0) {
        return candidate.error;
      }
    }

    return fallback;
  }, []);

  const extractErrorDetails = useCallback((value: unknown) => {
    if (typeof value !== 'object' || value === null) {
      return [];
    }

    const candidate = value as Record<string, unknown>;

    if (!Array.isArray(candidate.details)) {
      return [];
    }

    return candidate.details.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0);
  }, []);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    setFilesError('');
    setFilesErrorDetails([]);

    try {
      const url = currentFolderId ? `${API_BASE}/api/files?folderId=${currentFolderId}` : `${API_BASE}/api/files`;
      const response = await fetch(url);
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Unable to load files'));
      }

      if (typeof payload === 'object' && payload !== null) {
        const candidate = payload as Record<string, unknown>;

        if (Array.isArray(candidate.files)) {
          setFiles(
            candidate.files.filter((file): file is DriveFile => {
              if (typeof file !== 'object' || file === null) {
                return false;
              }

              const item = file as Record<string, unknown>;

              return typeof item.id === 'string'
                && typeof item.name === 'string'
                && typeof item.size === 'number'
                && typeof item.createdAt === 'string'
                && typeof item.modifiedAt === 'string';
            }),
          );
        } else {
          setFiles([]);
        }
      } else {
        setFiles([]);
      }

      return true;
    } catch (loadError) {
      setFilesError(loadError instanceof Error ? loadError.message : 'Unable to load files');
      return false;
    } finally {
      setLoadingFiles(false);
    }
  }, [extractErrorMessage, currentFolderId]);

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    setFoldersError('');

    try {
      const response = await fetch(`${API_BASE}/api/folders`);
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Unable to load folders'));
      }

      if (typeof payload === 'object' && payload !== null) {
        const candidate = payload as Record<string, unknown>;

        if (Array.isArray(candidate.folders)) {
          setFolders(
            candidate.folders.filter((folder): folder is DriveFolder => {
              if (typeof folder !== 'object' || folder === null) {
                return false;
              }

              const item = folder as Record<string, unknown>;

              return typeof item.id === 'string'
                && typeof item.name === 'string'
                && typeof item.createdAt === 'string';
            }),
          );
        } else {
          setFolders([]);
        }
      } else {
        setFolders([]);
      }

      return true;
    } catch (loadError) {
      setFoldersError(loadError instanceof Error ? loadError.message : 'Unable to load folders');
      return false;
    } finally {
      setLoadingFolders(false);
    }
  }, [extractErrorMessage]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim()) {
        setSearching(true);
        setSearchError('');
        try {
          const url = currentFolderId 
            ? `${API_BASE}/api/files/search?q=${encodeURIComponent(searchQuery)}&folderId=${currentFolderId}`
            : `${API_BASE}/api/files/search?q=${encodeURIComponent(searchQuery)}`;
          const response = await fetch(url);
          const payload: unknown = await response.json();

          if (!response.ok) {
            throw new Error(extractErrorMessage(payload, 'Unable to search files'));
          }

          if (typeof payload === 'object' && payload !== null) {
            const candidate = payload as Record<string, unknown>;

            if (Array.isArray(candidate.files)) {
              setSearchResults(
                candidate.files.filter((file): file is DriveFile => {
                  if (typeof file !== 'object' || file === null) {
                    return false;
                  }

                  const item = file as Record<string, unknown>;

                  return typeof item.id === 'string'
                    && typeof item.name === 'string'
                    && typeof item.size === 'number'
                    && typeof item.createdAt === 'string'
                    && typeof item.modifiedAt === 'string';
                }),
              );
            } else {
              setSearchResults([]);
            }
          } else {
            setSearchResults([]);
          }
        } catch (searchErrorCatch) {
          setSearchError(searchErrorCatch instanceof Error ? searchErrorCatch.message : 'Unable to search files');
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentFolderId, extractErrorMessage]);

  async function handleUploadSubmit(data: { name: string; size: number; mimeType?: string; folderId?: string }) {
    setUploadError('');
    setUploadErrorDetails([]);
    setStatus('');
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = { name: data.name, size: data.size };
      if (data.mimeType) {
        body.mimeType = data.mimeType;
      }
      if (data.folderId) {
        body.folderId = data.folderId;
      }

      const response = await fetch(`${API_BASE}/api/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setUploadError(extractErrorMessage(payload, 'Unable to upload file'));
        setUploadErrorDetails(extractErrorDetails(payload));
        return;
      }

      if (typeof payload === 'object' && payload !== null) {
        const candidate = payload as Record<string, unknown>;

        if (
          typeof candidate.id === 'string'
          && typeof candidate.name === 'string'
          && typeof candidate.size === 'number'
        ) {
          const savedFile: DriveFile = {
            id: candidate.id,
            name: candidate.name,
            size: candidate.size,
            createdAt: candidate.createdAt as string || new Date().toISOString(),
            modifiedAt: candidate.modifiedAt as string || new Date().toISOString(),
          };
          if (candidate.folderId !== undefined) {
            (savedFile as any).folderId = candidate.folderId;
          }
          if (candidate.mimeType !== undefined) {
            (savedFile as any).mimeType = candidate.mimeType;
          };

          setFiles((currentFiles) => [savedFile, ...currentFiles.filter((file) => file.id !== savedFile.id)]);
          setUploadDialogOpen(false);
          setStatus(`Uploaded ${savedFile.name}`);
          return;
        }
      }

      setUploadError('The server returned an unexpected file shape');
    } catch (submitError) {
      setUploadError(submitError instanceof Error ? submitError.message : 'Unable to upload file');
    } finally {
      setSubmitting(false);
    }
  }

  const handleRename = useCallback((file: DriveFile) => {
    setRenamingFile(file);
    setRenaming(false);
    setRenameError('');
  }, []);

  const handleRenameSubmit = useCallback(async (newName: string) => {
    if (!renamingFile) return;

    setRenaming(true);
    setRenameError('');

    try {
      const response = await fetch(`${API_BASE}/api/files/${renamingFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setRenameError(extractErrorMessage(payload, 'Unable to rename file'));
        return;
      }

      if (typeof payload === 'object' && payload !== null) {
        const candidate = payload as Record<string, unknown>;

        if (
          typeof candidate.id === 'string'
          && typeof candidate.name === 'string'
          && typeof candidate.size === 'number'
        ) {
          const updatedFile: DriveFile = {
            id: candidate.id,
            name: candidate.name,
            size: candidate.size,
            createdAt: candidate.createdAt as string || new Date().toISOString(),
            modifiedAt: candidate.modifiedAt as string || new Date().toISOString(),
          };
          if (candidate.folderId !== undefined) {
            (updatedFile as any).folderId = candidate.folderId;
          }
          if (candidate.mimeType !== undefined) {
            (updatedFile as any).mimeType = candidate.mimeType;
          };

          setFiles((currentFiles) =>
            currentFiles.map((file) => (file.id === updatedFile.id ? updatedFile : file)),
          );
          setRenamingFile(null);
          setStatus(`Renamed to ${updatedFile.name}`);
          return;
        }
      }

      setRenameError('The server returned an unexpected file shape');
    } catch (renameErrorCatch) {
      setRenameError(renameErrorCatch instanceof Error ? renameErrorCatch.message : 'Unable to rename file');
    } finally {
      setRenaming(false);
    }
  }, [renamingFile, extractErrorMessage]);

  const handleDelete = useCallback(async (file: DriveFile) => {
    setDeleting(file);
    setDeleteError('');

    try {
      const response = await fetch(`${API_BASE}/api/files/${file.id}`, {
        method: 'DELETE',
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setDeleteError(extractErrorMessage(payload, 'Unable to delete file'));
        return;
      }

      setFiles((currentFiles) => currentFiles.filter((f) => f.id !== file.id));
      setDeleting(null);
      setStatus(`Deleted ${file.name}`);
    } catch (deleteErrorCatch) {
      setDeleteError(deleteErrorCatch instanceof Error ? deleteErrorCatch.message : 'Unable to delete file');
    }
  }, [extractErrorMessage]);

  const handleFolderClick = useCallback((folderId: string | undefined) => {
    setCurrentFolderId(folderId);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const handleCreateFolder = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingFolder(true);
    setFolderError('');

    try {
      const body: Record<string, unknown> = { name: newFolderName.trim() };
      if (currentFolderId) {
        body.parentId = currentFolderId;
      }

      const response = await fetch(`${API_BASE}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setFolderError(extractErrorMessage(payload, 'Unable to create folder'));
        return;
      }

      if (typeof payload === 'object' && payload !== null) {
        const candidate = payload as Record<string, unknown>;

        if (typeof candidate.id === 'string' && typeof candidate.name === 'string') {
          const newFolder: DriveFolder = {
            id: candidate.id,
            name: candidate.name,
            createdAt: candidate.createdAt as string || new Date().toISOString(),
          };
          if (candidate.parentId !== undefined) {
            (newFolder as any).parentId = candidate.parentId;
          }
          setFolders((currentFolders) => [...currentFolders, newFolder]);
          setNewFolderName('');
          setCreatingFolder(false);
          setStatus(`Created folder ${newFolder.name}`);
          return;
        }
      }

      setFolderError('The server returned an unexpected folder shape');
    } catch (createError) {
      setFolderError(createError instanceof Error ? createError.message : 'Unable to create folder');
    } finally {
      setCreatingFolder(false);
    }
  }, [newFolderName, currentFolderId, extractErrorMessage]);

  const handleRenameFolder = useCallback((folder: DriveFolder) => {
    setRenamingFolder(folder);
    setRenameFolderName(folder.name);
    setRenameFolderError('');
  }, []);

  const handleRenameFolderSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renamingFolder) return;

    setRenamingFolderState(true);
    setRenameFolderError('');

    try {
      const response = await fetch(`${API_BASE}/api/folders/${renamingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameFolderName }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setRenameFolderError(extractErrorMessage(payload, 'Unable to rename folder'));
        return;
      }

      if (typeof payload === 'object' && payload !== null) {
        const candidate = payload as Record<string, unknown>;

        if (typeof candidate.id === 'string' && typeof candidate.name === 'string') {
          setFolders((currentFolders) =>
            currentFolders.map((folder) => (folder.id === candidate.id ? { ...folder, name: candidate.name as string } : folder)),
          );
          setRenamingFolder(null);
          setRenameFolderName('');
          setStatus(`Renamed folder to ${candidate.name}`);
          return;
        }
      }

      setRenameFolderError('The server returned an unexpected folder shape');
    } catch (renameErrorCatch) {
      setRenameFolderError(renameErrorCatch instanceof Error ? renameErrorCatch.message : 'Unable to rename folder');
    } finally {
      setRenamingFolderState(false);
    }
  }, [renamingFolder, renameFolderName, extractErrorMessage]);

  const handleDeleteFolder = useCallback(async (folder: DriveFolder) => {
    setDeletingFolder(folder);
    setDeleteFolderError('');

    try {
      const response = await fetch(`${API_BASE}/api/folders/${folder.id}`, {
        method: 'DELETE',
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setDeleteFolderError(extractErrorMessage(payload, 'Unable to delete folder'));
        return;
      }

      setFolders((currentFolders) => currentFolders.filter((f) => f.id !== folder.id));
      if (currentFolderId === folder.id) {
        setCurrentFolderId(undefined);
      }
      setDeletingFolder(null);
      setStatus(`Deleted folder ${folder.name}`);
    } catch (deleteErrorCatch) {
      setDeleteFolderError(deleteErrorCatch instanceof Error ? deleteErrorCatch.message : 'Unable to delete folder');
    }
  }, [currentFolderId, extractErrorMessage]);

  const handleMoveFile = useCallback(async (file: DriveFile, targetFolderId: string | undefined) => {
    try {
      const body: Record<string, unknown> = {};
      if (targetFolderId !== undefined) {
        body.folderId = targetFolderId;
      }

      const response = await fetch(`${API_BASE}/api/files/${file.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, 'Unable to move file'));
      }

      if (typeof payload === 'object' && payload !== null) {
        const candidate = payload as Record<string, unknown>;

        if (
          typeof candidate.id === 'string'
          && typeof candidate.name === 'string'
          && typeof candidate.size === 'number'
        ) {
          const updatedFile: DriveFile = {
            id: candidate.id,
            name: candidate.name,
            size: candidate.size,
            createdAt: candidate.createdAt as string || new Date().toISOString(),
            modifiedAt: candidate.modifiedAt as string || new Date().toISOString(),
          };
          if (candidate.folderId !== undefined) {
            (updatedFile as any).folderId = candidate.folderId;
          }
          if (candidate.mimeType !== undefined) {
            (updatedFile as any).mimeType = candidate.mimeType;
          }

          setFiles((currentFiles) =>
            currentFiles.filter((f) => f.id !== updatedFile.id),
          );
          setStatus(`Moved ${updatedFile.name}`);
          return;
        }
      }

      throw new Error('The server returned an unexpected file shape');
    } catch (moveError) {
      setStatus(moveError instanceof Error ? moveError.message : 'Unable to move file');
    }
  }, [extractErrorMessage]);

  const getBreadcrumbPath = useCallback(() => {
    if (!currentFolderId) return [];
    const path: DriveFolder[] = [];
    let current = folders.find((f) => f.id === currentFolderId);
    while (current) {
      path.unshift(current);
      const parentId = (current as any).parentId;
      current = parentId ? folders.find((f) => f.id === parentId) : undefined;
    }
    return path;
  }, [currentFolderId, folders]);

  const displayFiles = searchQuery.trim() ? searchResults : files;

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
          <h2 style={{ margin: 0, fontSize: 24, marginBottom: 8 }}>Sign in to Drive</h2>
          <p style={{ margin: '0 0 24', color: 'rgba(249, 250, 251, 0.72)' }}>
            Enter your credentials to access your files.
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
              Drive
            </p>
            <Button type="button" onClick={handleSignOut} className="bg-white/10 text-white">
              Sign out
            </Button>
          </div>
          <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.1 }}>Upload and browse file records</h1>
          <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.72)', maxWidth: 720 }}>
            Upload a simple file record, then immediately see it in the browsable file list backed by the shared in-memory domain store.
          </p>
        </header>

        <section
          style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: 24,
          }}
        >
          <article style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, background: '#111111', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>Folders</h2>
                <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
                  Navigate and manage your folder structure.
                </p>
              </div>
            </div>

            <FolderTree
              folders={folders}
              currentFolderId={currentFolderId}
              onFolderClick={handleFolderClick}
              onCreateFolder={() => setCreatingFolder(true)}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              loading={loadingFolders}
              error={foldersError}
            />

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 24 }}>
              <Button type="button" onClick={() => setUploadDialogOpen(true)}>
                Upload file
              </Button>

              <Button type="button" onClick={loadFiles} className="bg-white/10 text-white">
                Reload files
              </Button>
            </div>

            <div aria-live="polite" style={{ marginTop: 20, display: 'grid', gap: 12 }}>
              {status ? <p style={{ margin: 0, color: '#86efac' }}>{status}</p> : null}
            </div>
          </article>

          <article style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, background: '#111111', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>Files</h2>
                <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
                  {currentFolderId ? `Files in ${folders.find((f) => f.id === currentFolderId)?.name || 'folder'}` : 'All files'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  aria-label="Search files"
                  style={{
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    background: '#0a0a0a',
                    color: 'inherit',
                    padding: '8px 12px',
                    fontSize: 14,
                  }}
                />
                <Button type="button" onClick={loadFiles} className="bg-white/10 text-white" style={{ fontSize: 14, padding: '8px 12px' }}>
                  Refresh
                </Button>
              </div>
            </div>

            {getBreadcrumbPath().length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  onClick={() => handleFolderClick(undefined)}
                  className="bg-white/10 text-white"
                  style={{ fontSize: 14, padding: '6px 10px' }}
                >
                  Root
                </Button>
                {getBreadcrumbPath().map((folder, index) => (
                  <>
                    <span style={{ color: 'rgba(249, 250, 251, 0.5)' }}>/</span>
                    <Button
                      key={folder.id}
                      type="button"
                      onClick={() => handleFolderClick(folder.id)}
                      className={index === getBreadcrumbPath().length - 1 ? 'bg-white/20 text-white' : 'bg-white/10 text-white'}
                      style={{ fontSize: 14, padding: '6px 10px' }}
                    >
                      {folder.name}
                    </Button>
                  </>
                ))}
              </div>
            )}

            <DriveFileList
              files={displayFiles}
              loading={loadingFiles || searching}
              error={searchQuery.trim() ? searchError : filesError}
              errorDetails={filesErrorDetails}
              onRefresh={loadFiles}
              onRename={handleRename}
              onDelete={handleDelete}
              onMoveFile={handleMoveFile}
              folders={folders}
              currentFolderId={currentFolderId}
            />
          </article>
        </section>



        {creatingFolder && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-folder-dialog-title"
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
          >
            <article
              style={{
                borderRadius: 20,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: '#111111',
                padding: 24,
                maxWidth: 400,
                width: '100%',
              }}
            >
              <h2 id="create-folder-dialog-title" style={{ margin: 0, fontSize: 24 }}>
                New folder
              </h2>
              <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
                {currentFolderId ? `Create folder in ${folders.find((f) => f.id === currentFolderId)?.name || 'folder'}` : 'Create folder in root'}
              </p>

              <form onSubmit={handleCreateFolder} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
                <label style={{ display: 'grid', gap: 8 }}>
                  <span>Folder name</span>
                  <input
                    value={newFolderName}
                    onChange={(inputEvent) => setNewFolderName(inputEvent.target.value)}
                    aria-label="Folder name"
                    autoFocus
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: '#0a0a0a',
                      color: 'inherit',
                      padding: '12px 14px',
                    }}
                  />
                </label>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    onClick={() => { setCreatingFolder(false); setNewFolderName(''); setFolderError(''); }}
                    className="bg-white/10 text-white"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creatingFolder}>
                    {creatingFolder ? 'Creating…' : 'Create'}
                  </Button>
                </div>

                {folderError ? (
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
                    <p style={{ margin: 0, fontWeight: 600 }}>{folderError}</p>
                  </div>
                ) : null}
              </form>
            </article>
          </div>
        )}

        {renamingFolder && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-folder-dialog-title"
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
          >
            <article
              style={{
                borderRadius: 20,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: '#111111',
                padding: 24,
                maxWidth: 400,
                width: '100%',
              }}
            >
              <h2 id="rename-folder-dialog-title" style={{ margin: 0, fontSize: 24 }}>
                Rename folder
              </h2>
              <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
                Rename {renamingFolder.name}
              </p>

              <form onSubmit={handleRenameFolderSubmit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
                <label style={{ display: 'grid', gap: 8 }}>
                  <span>New name</span>
                  <input
                    value={renameFolderName}
                    onChange={(inputEvent) => setRenameFolderName(inputEvent.target.value)}
                    aria-label="New folder name"
                    autoFocus
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: '#0a0a0a',
                      color: 'inherit',
                      padding: '12px 14px',
                    }}
                  />
                </label>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    onClick={() => setRenamingFolder(null)}
                    className="bg-white/10 text-white"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={renamingFolderState}>
                    {renamingFolderState ? 'Renaming…' : 'Rename'}
                  </Button>
                </div>

                {renameFolderError ? (
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
                    <p style={{ margin: 0, fontWeight: 600 }}>{renameFolderError}</p>
                  </div>
                ) : null}
              </form>
            </article>
          </div>
        )}

        {deletingFolder && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-folder-dialog-title"
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
          >
            <article
              style={{
                borderRadius: 20,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: '#111111',
                padding: 24,
                maxWidth: 400,
                width: '100%',
              }}
            >
              <h2 id="delete-folder-dialog-title" style={{ margin: 0, fontSize: 24 }}>
                Delete folder
              </h2>
              <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
                Are you sure you want to delete {deletingFolder.name}? This action cannot be undone. The folder must be empty.
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <Button
                  type="button"
                  onClick={() => setDeletingFolder(null)}
                  className="bg-white/10 text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDeleteFolder(deletingFolder)}
                  className="bg-red-500/20 text-red-300"
                >
                  Delete
                </Button>
              </div>

              {deleteFolderError ? (
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
                  <p style={{ margin: 0, fontWeight: 600 }}>{deleteFolderError}</p>
                </div>
              ) : null}
            </article>
          </div>
        )}

        <UploadDialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          onSubmit={handleUploadSubmit}
          folders={folders}
          currentFolderId={currentFolderId}
          submitting={submitting}
          uploadError={uploadError}
          uploadErrorDetails={uploadErrorDetails}
        />
        <RenameDialog
          open={!!renamingFile}
          file={renamingFile}
          onClose={() => setRenamingFile(null)}
          onSubmit={handleRenameSubmit}
          renaming={renaming}
          renameError={renameError}
        />
        <DeleteConfirmDialog
          open={!!deleting}
          file={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleting && handleDelete(deleting)}
          deleteError={deleteError}
        />
      </div>
    </main>
  );
}
