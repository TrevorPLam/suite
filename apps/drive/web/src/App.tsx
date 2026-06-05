import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@suite/ui';
import { type DriveFile } from '@suite/domain-drive';
import { DriveFileList } from './features/DriveFileList';

export function App() {
  const [name, setName] = useState('Design brief.pdf');
  const [size, setSize] = useState('1024');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [filesError, setFilesError] = useState('');
  const [filesErrorDetails, setFilesErrorDetails] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadErrorDetails, setUploadErrorDetails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
      const response = await fetch('/api/files');
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
                && typeof item.size === 'number';
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
  }, [extractErrorMessage]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError('');
    setUploadErrorDetails([]);
    setStatus('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, size: Number(size) }),
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
          };

          setFiles((currentFiles) => [savedFile, ...currentFiles.filter((file) => file.id !== savedFile.id)]);
          setName('');
          setSize('0');
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
          <p style={{ margin: 0, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 12 }}>
            Drive
          </p>
          <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.1 }}>Upload and browse file records</h1>
          <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.72)', maxWidth: 720 }}>
            Upload a simple file record, then immediately see it in the browsable file list backed by the shared in-memory domain store.
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
                <h2 style={{ margin: 0, fontSize: 24 }}>Upload file</h2>
                <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
                  Save a file record with a name and size, then keep the list in sync without reloading the page.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
              <label style={{ display: 'grid', gap: 8 }}>
                <span>Name</span>
                <input
                  value={name}
                  onChange={(inputEvent) => setName(inputEvent.target.value)}
                  aria-label="File name"
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
                <span>Size</span>
                <input
                  inputMode="numeric"
                  value={size}
                  onChange={(inputEvent) => setSize(inputEvent.target.value)}
                  aria-label="File size in bytes"
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
                  {submitting ? 'Uploading…' : 'Upload file'}
                </Button>

                <Button type="button" onClick={loadFiles} className="bg-white/10 text-white">
                  Reload files
                </Button>
              </div>
            </form>

            <div aria-live="polite" style={{ marginTop: 20, display: 'grid', gap: 12 }}>
              {status ? <p style={{ margin: 0, color: '#86efac' }}>{status}</p> : null}

              {uploadError ? (
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
                  <p style={{ margin: 0, fontWeight: 600 }}>{uploadError}</p>
                  {uploadErrorDetails.length > 0 ? (
                    <ul style={{ margin: '8px 0 0', paddingInlineStart: 20 }}>
                      {uploadErrorDetails.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>

          <DriveFileList
            files={files}
            loading={loadingFiles}
            error={filesError}
            errorDetails={filesErrorDetails}
            onRefresh={loadFiles}
          />
        </section>
      </div>
    </main>
  );
}
