import { Button } from '@suite/ui';
import { Skeleton } from '../components/Skeleton';
import type { DriveFile, DriveFolder } from '@suite/domain-drive';

type DriveFileListProps = {
  files: DriveFile[];
  loading: boolean;
  error: string;
  errorDetails: string[];
  onRefresh: () => void;
  onRename: (file: DriveFile) => void;
  onDelete: (file: DriveFile) => void;
  onMoveFile?: (file: DriveFile, targetFolderId: string | undefined) => void;
  folders?: DriveFolder[];
  currentFolderId?: string | undefined;
};

function formatFileSize(size: number) {
  return `${size.toLocaleString()} bytes`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString();
}

export function DriveFileList({ files, loading, error, errorDetails, onRefresh, onRename, onDelete, onMoveFile, folders = [], currentFolderId: _currentFolderId }: DriveFileListProps) {
  return (
    <article style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, background: '#111111', padding: 24 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Browse files</h2>
            <p style={{ margin: '8px 0 0', color: 'rgba(249, 250, 251, 0.72)' }}>
              Uploaded files stay in the same in-memory domain list and appear newest-first.
            </p>
          </div>

          <Button type="button" onClick={onRefresh} className="bg-white/10 text-white">
            Refresh files
          </Button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <article
                key={i}
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
                    <Skeleton height={18} width="60%" />
                    <Skeleton height={14} width="40%" />
                    <div style={{ display: 'grid', gap: 2 }}>
                      <Skeleton height={12} width="80%" />
                      <Skeleton height={12} width="70%" />
                      <Skeleton height={12} width="50%" />
                    </div>
                  </div>
                  <Skeleton height={12} width={60} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Skeleton height={32} width={80} />
                  <Skeleton height={32} width={80} />
                  <Skeleton height={32} width={80} />
                </div>
              </article>
            ))}
          </div>
        ) : error ? (
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
              <h3 style={{ margin: 0, fontSize: 18, color: '#fecaca' }}>Unable to load files</h3>
              <p style={{ margin: 0, color: '#fecaca' }}>{error}</p>
            </div>

            {errorDetails.length > 0 ? (
              <ul style={{ margin: 0, paddingInlineStart: 20, color: '#fecaca' }}>
                {errorDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}

            <div>
              <Button type="button" onClick={onRefresh} className="bg-white/10 text-white">
                Try again
              </Button>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div
            role="status"
            style={{
              borderRadius: 16,
              border: '1px dashed rgba(255, 255, 255, 0.14)',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: 20,
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ display: 'grid', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>No files yet</h3>
              <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.72)' }}>
                Upload a file to see its metadata show up in the list immediately.
              </p>
            </div>

            <div>
              <Button type="button" onClick={onRefresh} className="bg-white/10 text-white">
                Reload files
              </Button>
            </div>
          </div>
        ) : (
          <div role="list" aria-label="Uploaded files" style={{ display: 'grid', gap: 12 }}>
            {files.map((file) => (
              <article
                key={file.id}
                role="listitem"
                aria-label={`File ${file.name}`}
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
                    <h3 style={{ margin: 0, fontSize: 18 }}>{file.name}</h3>
                    <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.68)', fontSize: 14 }}>{formatFileSize(file.size)}</p>
                    <div style={{ display: 'grid', gap: 2, fontSize: 12, color: 'rgba(249, 250, 251, 0.5)' }}>
                      <span>Created: {formatDate(file.createdAt)}</span>
                      <span>Modified: {formatDate(file.modifiedAt)}</span>
                      {(file as any).mimeType && <span>Type: {(file as any).mimeType}</span>}
                    </div>
                  </div>

                  <span style={{ color: 'rgba(249, 250, 251, 0.5)', fontSize: 12 }}>ID: {file.id}</span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    onClick={() => onRename(file)}
                    className="bg-white/10 text-white"
                    style={{ fontSize: 14, padding: '8px 12px' }}
                  >
                    Rename
                  </Button>
                  {onMoveFile && folders.length > 0 && (
                    <select
                      value={(file as any).folderId || ''}
                      onChange={(e) => onMoveFile(file, e.target.value || undefined)}
                      style={{
                        borderRadius: 8,
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        background: '#0a0a0a',
                        color: 'inherit',
                        padding: '8px 12px',
                        fontSize: 14,
                      }}
                    >
                      <option value="">Root</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    type="button"
                    onClick={() => onDelete(file)}
                    className="bg-red-500/20 text-red-300"
                    style={{ fontSize: 14, padding: '8px 12px' }}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
