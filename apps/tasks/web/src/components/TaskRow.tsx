import { Button } from '@suite/ui';

type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
};

interface TaskRowProps {
  task: TaskItem;
  editingTaskId: string | null;
  editTitle: string;
  onEditTitleChange: (title: string) => void;
  onStartEditing: (task: TaskItem) => void;
  onCancelEditing: () => void;
  onSaveEdit: (task: TaskItem) => void;
  onToggleCompletion: (task: TaskItem) => void;
  onArchive: (task: TaskItem, archived: boolean) => void;
  onDelete: (task: TaskItem) => void;
  submitting: boolean;
}

export function TaskRow({
  task,
  editingTaskId,
  editTitle,
  onEditTitleChange,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onToggleCompletion,
  onArchive,
  onDelete,
  submitting,
}: TaskRowProps) {
  if (editingTaskId === task.id) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSaveEdit(task);
        }}
        style={{ display: 'grid', gap: 8 }}
      >
        <input
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.3)', color: 'white' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="submit" disabled={submitting}>
            Save
          </Button>
          <Button type="button" onClick={onCancelEditing} disabled={submitting} className="bg-white/10 text-white">
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <p style={{ margin: 0, fontWeight: 600, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(249, 250, 251, 0.72)' }}>
          {task.completed ? 'Completed' : 'Incomplete'} · {task.id}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          type="button"
          onClick={() => onToggleCompletion(task)}
          disabled={submitting}
          className="bg-white/10 text-white"
        >
          {task.completed ? 'Mark incomplete' : 'Mark complete'}
        </Button>
        <Button
          type="button"
          onClick={() => onStartEditing(task)}
          disabled={submitting}
          className="bg-white/10 text-white"
        >
          Edit
        </Button>
        <Button
          type="button"
          onClick={() => onArchive(task, !task.archived)}
          disabled={submitting}
          className="bg-white/10 text-white"
        >
          {task.archived ? 'Unarchive' : 'Archive'}
        </Button>
        <Button
          type="button"
          onClick={() => onDelete(task)}
          disabled={submitting}
          className="bg-red-500/20 text-red-300"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
