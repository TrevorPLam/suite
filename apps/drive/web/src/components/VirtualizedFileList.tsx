import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';
import { Button } from '@suite/ui';
import type { DriveFile, DriveFolder } from '@suite/domain-drive';

type VirtualizedFileListProps = {
  files: DriveFile[];
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

const ITEM_HEIGHT = 140; // Approximate height of each file row

export function VirtualizedFileList({
  files,
  onRename,
  onDelete,
  onMoveFile,
  folders = [],
  currentFolderId: _currentFolderId,
}: VirtualizedFileListProps) {
  const Row = ({ index, style }: ListChildComponentProps) => {
    const file = files[index];
    if (!file) return null;

    return (
      <div style={style}>
        <article
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
                {file.mimeType && <span>Type: {file.mimeType}</span>}
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
                value={file.folderId || ''}
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
      </div>
    );
  };

  return (
    <div role="list" aria-label="Uploaded files" style={{ display: 'grid', gap: 12 }}>
      <List
        height={600}
        itemCount={files.length}
        itemSize={ITEM_HEIGHT}
        width="100%"
        style={{ listStyle: 'none', padding: 0, margin: 0 }}
      >
        {Row}
      </List>
    </div>
  );
}
