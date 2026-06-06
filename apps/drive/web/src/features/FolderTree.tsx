import { Button } from '@suite/ui';
import type { DriveFolder } from '@suite/domain-drive';

type FolderTreeProps = {
  folders: DriveFolder[];
  currentFolderId: string | undefined;
  onFolderClick: (folderId: string | undefined) => void;
  onCreateFolder: () => void;
  onRenameFolder: (folder: DriveFolder) => void;
  onDeleteFolder: (folder: DriveFolder) => void;
  loading: boolean;
  error: string;
};

export function FolderTree({ folders, currentFolderId, onFolderClick, onCreateFolder, onRenameFolder, onDeleteFolder, loading, error }: FolderTreeProps) {
  // Build folder hierarchy
  const buildTree = (parentId?: string): DriveFolder[] => {
    return folders
      .filter((folder) => folder.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const rootFolders = buildTree();
  const _currentFolder = folders.find((f) => f.id === currentFolderId);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button
          type="button"
          onClick={() => onFolderClick(undefined)}
          className={!currentFolderId ? 'bg-white/20 text-white' : 'bg-white/10 text-white'}
          style={{ fontSize: 14, padding: '6px 10px', width: '100%' }}
        >
          Root
        </Button>
      </div>

      {loading ? (
        <p role="status" style={{ margin: 0, color: 'rgba(249, 250, 251, 0.72)', fontSize: 14 }}>
          Loading folders…
        </p>
      ) : error ? (
        <div
          role="alert"
          style={{
            borderRadius: 12,
            border: '1px solid rgba(248, 113, 113, 0.35)',
            background: 'rgba(127, 29, 29, 0.3)',
            padding: 12,
            color: '#fecaca',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : rootFolders.length === 0 ? (
        <p style={{ margin: 0, color: 'rgba(249, 250, 251, 0.5)', fontSize: 14 }}>
          No folders yet
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 4 }}>
          {rootFolders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              folders={folders}
              currentFolderId={currentFolderId}
              onFolderClick={onFolderClick}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              level={0}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        onClick={onCreateFolder}
        className="bg-white/10 text-white"
        style={{ fontSize: 14, padding: '8px 12px', marginTop: 8 }}
      >
        + New Folder
      </Button>
    </div>
  );
}

type FolderNodeProps = {
  folder: DriveFolder;
  folders: DriveFolder[];
  currentFolderId: string | undefined;
  onFolderClick: (folderId: string | undefined) => void;
  onRenameFolder: (folder: DriveFolder) => void;
  onDeleteFolder: (folder: DriveFolder) => void;
  level: number;
};

function FolderNode({ folder, folders, currentFolderId, onFolderClick, onRenameFolder, onDeleteFolder, level }: FolderNodeProps) {
  const children = folders.filter((f) => f.parentId === folder.id).sort((a, b) => a.name.localeCompare(b.name));
  const isCurrent = currentFolderId === folder.id;
  const hasChildren = children.length > 0;

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          paddingLeft: level * 16,
        }}
      >
        <Button
          type="button"
          onClick={() => onFolderClick(folder.id)}
          className={isCurrent ? 'bg-white/20 text-white' : 'bg-white/10 text-white'}
          style={{ fontSize: 14, padding: '6px 10px', flex: 1, textAlign: 'left' }}
        >
          {hasChildren ? '📁' : '📂'} {folder.name}
        </Button>
        <Button
          type="button"
          onClick={() => onRenameFolder(folder)}
          className="bg-white/10 text-white"
          style={{ fontSize: 12, padding: '4px 8px' }}
          aria-label={`Rename ${folder.name}`}
        >
          ✏️
        </Button>
        <Button
          type="button"
          onClick={() => onDeleteFolder(folder)}
          className="bg-red-500/20 text-red-300"
          style={{ fontSize: 12, padding: '4px 8px' }}
          aria-label={`Delete ${folder.name}`}
        >
          🗑️
        </Button>
      </div>

      {hasChildren && (
        <div style={{ display: 'grid', gap: 4 }}>
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              folders={folders}
              currentFolderId={currentFolderId}
              onFolderClick={onFolderClick}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
