import { Button } from '@suite/ui';

type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
};

interface TaskRowProps {
  task: TaskItem;
  editingTaskId: string | null;
  editTitle: string;
  editDueDate: string;
  editPriority: 'low' | 'medium' | 'high';
  editTags: string[];
  editTagInput: string;
  onEditTitleChange: (title: string) => void;
  onEditDueDateChange: (dueDate: string) => void;
  onEditPriorityChange: (priority: 'low' | 'medium' | 'high') => void;
  onEditTagsChange: (tags: string[]) => void;
  onEditTagInputChange: (tagInput: string) => void;
  onAddEditTag: () => void;
  onRemoveEditTag: (tag: string) => void;
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
  editDueDate,
  editPriority,
  editTags,
  editTagInput,
  onEditTitleChange,
  onEditDueDateChange,
  onEditPriorityChange,
  onEditTagsChange,
  onEditTagInputChange,
  onAddEditTag,
  onRemoveEditTag,
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
          aria-label="Edit title"
          style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.3)', color: 'white' }}
        />
        <input
          type="datetime-local"
          value={editDueDate}
          onChange={(e) => onEditDueDateChange(e.target.value)}
          aria-label="Edit due date"
          style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.3)', color: 'white' }}
        />
        <select
          value={editPriority}
          onChange={(e) => onEditPriorityChange(e.target.value as 'low' | 'medium' | 'high')}
          aria-label="Edit priority"
          style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.3)', color: 'white' }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={editTagInput}
            onChange={(e) => onEditTagInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddEditTag())}
            placeholder="Type and press Enter to add tag"
            style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.3)', color: 'white' }}
          />
          <Button type="button" onClick={onAddEditTag} disabled={submitting} className="bg-white/10 text-white">
            Add
          </Button>
        </div>
        {editTags.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {editTags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '4px 8px',
                  borderRadius: 12,
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#93c5fd',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onRemoveEditTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#93c5fd',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
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
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</p>
        <div style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(249, 250, 251, 0.72)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span>{task.completed ? 'Completed' : 'Incomplete'}</span>
          <span>·</span>
          <span style={{ 
            padding: '2px 6px', 
            borderRadius: 4, 
            background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : task.priority === 'medium' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
            color: task.priority === 'high' ? '#fca5a5' : task.priority === 'medium' ? '#fde047' : '#86efac'
          }}>
            {task.priority}
          </span>
          {task.dueDate && (
            <>
              <span>·</span>
              <span>Due: {new Date(task.dueDate).toLocaleString()}</span>
            </>
          )}
          {task.tags.length > 0 && (
            <>
              <span>·</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#93c5fd',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </>
          )}
          <span>·</span>
          <span style={{ opacity: 0.5 }}>{task.id}</span>
        </div>
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
